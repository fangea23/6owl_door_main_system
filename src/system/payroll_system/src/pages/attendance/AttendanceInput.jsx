import React, { useEffect, useState } from 'react';
import {
  Clock,
  Save,
  Loader2,
  Send,
  ChevronDown,
  AlertCircle,
  Calendar,
  Users
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import { usePermission } from '../../../../../hooks/usePermission';

export default function AttendanceInput() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [myStoreCode, setMyStoreCode] = useState(null);

  const { hasPermission: canInput, loading: permLoading } = usePermission('payroll.attendance.input');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // 取得當前用戶的門市
      const { data: empData } = await supabase
        .from('employees')
        .select('store_code')
        .eq('user_id', user.id)
        .single();

      const storeCode = empData?.store_code;
      setMyStoreCode(storeCode);

      if (!storeCode) {
        setLoading(false);
        return;
      }

      // 取得當前薪資週期
      const { data: periodData } = await supabase
        .from('payroll_periods')
        .select('*')
        .in('status', ['open', 'draft'])
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1)
        .single();

      setCurrentPeriod(periodData);

      if (!periodData) {
        setLoading(false);
        return;
      }

      // 取得門市員工
      const { data: storeEmployees } = await supabase
        .from('employees')
        .select('id, name, employee_id, position, employment_type_new')
        .eq('store_code', storeCode)
        .eq('status', 'active')
        .order('employee_id');

      setEmployees(storeEmployees || []);

      // 取得現有的出勤資料
      const { data: existingAttendance } = await supabase
        .from('monthly_attendance_summary')
        .select('*')
        .eq('period_id', periodData.id)
        .eq('store_id', parseInt(storeCode));

      // 轉換為 Map
      const attendanceMap = {};
      (storeEmployees || []).forEach(emp => {
        const existing = existingAttendance?.find(a => a.employee_id === emp.id);
        attendanceMap[emp.id] = existing || {
          employee_id: emp.id,
          work_days: 0,
          scheduled_days: 0,
          regular_hours: 0,
          overtime_hours_133: 0,
          overtime_hours_166: 0,
          overtime_hours_200: 0,
          annual_leave_days: 0,
          sick_leave_days: 0,
          personal_leave_days: 0,
          late_count: 0,
          absent_count: 0,
          status: 'draft'
        };
      });

      setAttendanceData(attendanceMap);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (employeeId, field, value) => {
    setAttendanceData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: parseFloat(value) || 0
      }
    }));
  };

  const handleSave = async () => {
    if (!currentPeriod || !myStoreCode) return;

    setSaving(true);
    try {
      for (const emp of employees) {
        const data = attendanceData[emp.id];
        if (!data) continue;

        const upsertData = {
          period_id: currentPeriod.id,
          employee_id: emp.id,
          store_id: parseInt(myStoreCode),
          work_days: data.work_days || 0,
          scheduled_days: data.scheduled_days || 0,
          regular_hours: data.regular_hours || 0,
          overtime_hours_133: data.overtime_hours_133 || 0,
          overtime_hours_166: data.overtime_hours_166 || 0,
          overtime_hours_200: data.overtime_hours_200 || 0,
          annual_leave_days: data.annual_leave_days || 0,
          sick_leave_days: data.sick_leave_days || 0,
          personal_leave_days: data.personal_leave_days || 0,
          late_count: data.late_count || 0,
          absent_count: data.absent_count || 0,
          status: 'draft',
          updated_at: new Date().toISOString()
        };

        if (data.id) {
          // 更新
          await supabase
            .from('monthly_attendance_summary')
            .update(upsertData)
            .eq('id', data.id);
        } else {
          // 新增
          await supabase
            .from('monthly_attendance_summary')
            .insert(upsertData);
        }
      }

      alert('儲存成功！');
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('儲存失敗：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!window.confirm('確定要送出審核嗎？送出後將無法修改。')) return;

    setSaving(true);
    try {
      // 先儲存
      await handleSave();

      // 更新狀態為已提交
      const { error } = await supabase
        .from('monthly_attendance_summary')
        .update({
          status: 'submitted',
          submitted_at: new Date().toISOString(),
          submitted_by: user.id
        })
        .eq('period_id', currentPeriod.id)
        .eq('store_id', parseInt(myStoreCode));

      if (error) throw error;

      alert('已送出審核！');
      fetchData();
    } catch (error) {
      console.error('Error submitting:', error);
      alert('送出失敗：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || permLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin mb-3 text-red-500" size={32} />
        <p className="text-stone-400">載入中...</p>
      </div>
    );
  }

  if (!canInput) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-stone-800 mb-2">無權限</h2>
          <p className="text-stone-500">您沒有出勤輸入權限</p>
        </div>
      </div>
    );
  }

  if (!myStoreCode) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-stone-800 mb-2">無法識別門市</h2>
          <p className="text-stone-500">您的帳號未關聯到任何門市</p>
        </div>
      </div>
    );
  }

  if (!currentPeriod) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <Calendar className="mx-auto text-stone-400 mb-4" size={48} />
          <h2 className="text-xl font-bold text-stone-800 mb-2">無開放的薪資週期</h2>
          <p className="text-stone-500">目前沒有可輸入的薪資週期</p>
        </div>
      </div>
    );
  }

  const isSubmitted = Object.values(attendanceData).some(a => a.status === 'submitted' || a.status === 'approved');

  return (
    <div className="pb-20">
      {/* 標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl text-blue-600">
              <Clock className="h-6 w-6" />
            </div>
            出勤資料輸入
          </h1>
          <p className="text-stone-500 mt-1 text-sm">
            門市 {myStoreCode} | {currentPeriod.period_name}
          </p>
        </div>

        {!isSubmitted && (
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2.5 bg-white border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 font-medium transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              暫存
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-xl hover:from-red-600 hover:to-amber-600 font-medium shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              送出審核
            </button>
          </div>
        )}
      </div>

      {/* 已提交提示 */}
      {isSubmitted && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 text-emerald-700">
            <AlertCircle size={18} />
            <span className="font-medium">本月出勤資料已送出審核，無法修改</span>
          </div>
        </div>
      )}

      {/* 週期資訊 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-6 text-sm">
          <div>
            <span className="text-blue-600">薪資週期：</span>
            <span className="font-bold text-blue-800">{currentPeriod.start_date} ~ {currentPeriod.end_date}</span>
          </div>
          <div>
            <span className="text-blue-600">出勤截止：</span>
            <span className="font-bold text-amber-600">{currentPeriod.attendance_deadline}</span>
          </div>
        </div>
      </div>

      {/* 出勤表格 */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                <th className="p-3 text-left sticky left-0 bg-stone-50 z-10">員工</th>
                <th className="p-3 text-center" title="應出勤天數">應出勤</th>
                <th className="p-3 text-center" title="實際出勤天數">實際出勤</th>
                <th className="p-3 text-center bg-blue-50 text-blue-700" title="正常工時">正常時數</th>
                <th className="p-3 text-center bg-amber-50 text-amber-700" title="加班 ×1.33">加班(1.33)</th>
                <th className="p-3 text-center bg-amber-50 text-amber-700" title="加班 ×1.66">加班(1.66)</th>
                <th className="p-3 text-center bg-red-50 text-red-700" title="假日加班 ×2">假日(2.0)</th>
                <th className="p-3 text-center" title="特休天數">特休</th>
                <th className="p-3 text-center" title="病假天數">病假</th>
                <th className="p-3 text-center" title="事假天數">事假</th>
                <th className="p-3 text-center" title="遲到次數">遲到</th>
                <th className="p-3 text-center" title="曠職天數">曠職</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {employees.map((emp) => {
                const data = attendanceData[emp.id] || {};
                const disabled = isSubmitted;

                return (
                  <tr key={emp.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3 sticky left-0 bg-white z-10">
                      <div>
                        <p className="font-bold text-stone-800">{emp.name}</p>
                        <p className="text-xs text-stone-400">
                          {emp.employee_id} | {emp.employment_type_new === 'parttime' ? '計時' : '正職'}
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={data.scheduled_days || ''}
                        onChange={(e) => handleChange(emp.id, 'scheduled_days', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        max="31"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={data.work_days || ''}
                        onChange={(e) => handleChange(emp.id, 'work_days', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        max="31"
                      />
                    </td>
                    <td className="p-3 bg-blue-50/50">
                      <input
                        type="number"
                        value={data.regular_hours || ''}
                        onChange={(e) => handleChange(emp.id, 'regular_hours', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-blue-200 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        step="0.5"
                      />
                    </td>
                    <td className="p-3 bg-amber-50/50">
                      <input
                        type="number"
                        value={data.overtime_hours_133 || ''}
                        onChange={(e) => handleChange(emp.id, 'overtime_hours_133', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-amber-200 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        step="0.5"
                      />
                    </td>
                    <td className="p-3 bg-amber-50/50">
                      <input
                        type="number"
                        value={data.overtime_hours_166 || ''}
                        onChange={(e) => handleChange(emp.id, 'overtime_hours_166', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-amber-200 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        step="0.5"
                      />
                    </td>
                    <td className="p-3 bg-red-50/50">
                      <input
                        type="number"
                        value={data.overtime_hours_200 || ''}
                        onChange={(e) => handleChange(emp.id, 'overtime_hours_200', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-red-200 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        step="0.5"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={data.annual_leave_days || ''}
                        onChange={(e) => handleChange(emp.id, 'annual_leave_days', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        step="0.5"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={data.sick_leave_days || ''}
                        onChange={(e) => handleChange(emp.id, 'sick_leave_days', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        step="0.5"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={data.personal_leave_days || ''}
                        onChange={(e) => handleChange(emp.id, 'personal_leave_days', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                        step="0.5"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={data.late_count || ''}
                        onChange={(e) => handleChange(emp.id, 'late_count', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={data.absent_count || ''}
                        onChange={(e) => handleChange(emp.id, 'absent_count', e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100"
                        min="0"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
        <Users size={14} />
        共 {employees.length} 位員工
      </div>
    </div>
  );
}
