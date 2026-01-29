import React, { useEffect, useState } from 'react';
import {
  Clock,
  Save,
  Loader2,
  Send,
  ChevronDown,
  AlertCircle,
  Calendar,
  Users,
  ChevronRight
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
  const [myStoreId, setMyStoreId] = useState(null);
  const [myStoreCode, setMyStoreCode] = useState(null);
  const [activeSection, setActiveSection] = useState('10th'); // '10th' or '12th'

  const { hasPermission: canInput, loading: permLoading } = usePermission('payroll.attendance.input');

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // 取得當前用戶的門市 (同時取得 store_id 和 store_code)
      const { data: empData } = await supabase
        .from('employees')
        .select('store_id, store_code')
        .eq('user_id', user.id)
        .single();

      const storeId = empData?.store_id;
      const storeCode = empData?.store_code;
      setMyStoreId(storeId);
      setMyStoreCode(storeCode);

      if (!storeId) {
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

      // 取得門市員工 (使用 store_id)
      // 過濾掉已刪除的員工 (deleted_at 為 null 表示未刪除)
      const { data: storeEmployees } = await supabase
        .from('employees')
        .select('id, name, employee_id, position, employment_type_new')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('employee_id');

      setEmployees(storeEmployees || []);

      // 取得現有的出勤資料 (使用 store_id)
      const { data: existingAttendance } = await supabase
        .from('monthly_attendance_summary')
        .select('*')
        .eq('period_id', periodData.id)
        .eq('store_id', storeId);

      // 轉換為 Map
      const attendanceMap = {};
      (storeEmployees || []).forEach(emp => {
        const existing = existingAttendance?.find(a => a.employee_id === emp.id);
        attendanceMap[emp.id] = existing || {
          employee_id: emp.id,
          // 基本出勤
          work_days_in_month: 30,  // 在職天數
          // 10日發薪 - 加項
          regular_hours: 0,
          overtime_hours_134: 0,  // 加班前2小時 (×1.34)
          overtime_hours_167: 0,  // 加班2小時後 (×1.67)
          holiday_hours: 0,       // 國假時數
          birthday_bonus: 0,      // 生日獎金
          // 12日發薪
          overtime_12th_hours: 0,      // 12日計時超額時數
          overtime_12th_hours_134: 0,  // 12日加班前2hr
          overtime_12th_hours_167: 0,  // 12日加班2hr後
          other_bonus_12th: 0,         // 12日其他加項
          other_deduction_12th: 0,     // 12日其他扣項
          // 請假
          annual_leave_days: 0,
          annual_leave_used_hours: 0,  // 特休已休時數
          annual_leave_pay_hours: 0,   // 特休代金時數
          sick_leave_hours: 0,         // 病假時數
          personal_leave_hours: 0,     // 事假時數
          paid_leave_hours: 0,         // 公婚喪產假時數
          typhoon_leave_hours: 0,      // 颱風假時數
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
    if (!currentPeriod || !myStoreId) return;

    setSaving(true);
    try {
      for (const emp of employees) {
        const data = attendanceData[emp.id];
        if (!data) continue;

        const upsertData = {
          period_id: currentPeriod.id,
          employee_id: emp.id,
          store_id: myStoreId,
          // 基本出勤
          work_days_in_month: data.work_days_in_month || 30,
          // 10日發薪 - 加項
          regular_hours: data.regular_hours || 0,
          overtime_hours_134: data.overtime_hours_134 || 0,
          overtime_hours_167: data.overtime_hours_167 || 0,
          holiday_hours: data.holiday_hours || 0,
          birthday_bonus: data.birthday_bonus || 0,
          // 12日發薪
          overtime_12th_hours: data.overtime_12th_hours || 0,
          overtime_12th_hours_134: data.overtime_12th_hours_134 || 0,
          overtime_12th_hours_167: data.overtime_12th_hours_167 || 0,
          other_bonus_12th: data.other_bonus_12th || 0,
          other_deduction_12th: data.other_deduction_12th || 0,
          // 請假
          annual_leave_days: data.annual_leave_days || 0,
          annual_leave_used_hours: data.annual_leave_used_hours || 0,
          annual_leave_pay_hours: data.annual_leave_pay_hours || 0,
          sick_leave_hours: data.sick_leave_hours || 0,
          personal_leave_hours: data.personal_leave_hours || 0,
          paid_leave_hours: data.paid_leave_hours || 0,
          typhoon_leave_hours: data.typhoon_leave_hours || 0,
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
        .eq('store_id', myStoreId);

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

  if (!myStoreId) {
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

      {/* 切換 Tab - 10日/12日發薪 */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveSection('10th')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === '10th'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          10日發薪
        </button>
        <button
          onClick={() => setActiveSection('12th')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === '12th'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          12日發薪
        </button>
        <button
          onClick={() => setActiveSection('leave')}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'leave'
              ? 'bg-emerald-600 text-white shadow-lg'
              : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          請假
        </button>
      </div>

      {/* 10日發薪項目表格 */}
      {activeSection === '10th' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-100">
            <h2 className="font-bold text-blue-800">10日發薪 - 出勤時數</h2>
            <p className="text-xs text-blue-600 mt-1">本薪、加班費（×1.34、×1.67）、國假加班費</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs font-bold tracking-wider border-b border-stone-200">
                  <th className="p-3 text-left sticky left-0 bg-stone-50 z-10 min-w-[120px]">員工</th>
                  <th className="p-3 text-center min-w-[80px]" title="在職天數">
                    <div>在職天數</div>
                    <div className="text-[10px] font-normal text-stone-400">(天)</div>
                  </th>
                  <th className="p-3 text-center bg-blue-50 text-blue-700 min-w-[80px]" title="正常工時">
                    <div>正常時數</div>
                    <div className="text-[10px] font-normal text-blue-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-amber-50 text-amber-700 min-w-[80px]" title="加班前2小時 ×1.34">
                    <div>加班前2小</div>
                    <div className="text-[10px] font-normal text-amber-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-amber-50 text-amber-700 min-w-[80px]" title="加班2小時後 ×1.67">
                    <div>加班2小後</div>
                    <div className="text-[10px] font-normal text-amber-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-red-50 text-red-700 min-w-[80px]" title="國定假日工作時數">
                    <div>國假時數</div>
                    <div className="text-[10px] font-normal text-red-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-pink-50 text-pink-700 min-w-[90px]" title="生日獎金">
                    <div>生日獎金</div>
                    <div className="text-[10px] font-normal text-pink-500">(元)</div>
                  </th>
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
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={data.work_days_in_month || ''}
                          onChange={(e) => handleChange(emp.id, 'work_days_in_month', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          max="31"
                        />
                      </td>
                      <td className="p-3 bg-blue-50/50 text-center">
                        <input
                          type="number"
                          value={data.regular_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'regular_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-blue-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-amber-50/50 text-center">
                        <input
                          type="number"
                          value={data.overtime_hours_134 || ''}
                          onChange={(e) => handleChange(emp.id, 'overtime_hours_134', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-amber-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-amber-50/50 text-center">
                        <input
                          type="number"
                          value={data.overtime_hours_167 || ''}
                          onChange={(e) => handleChange(emp.id, 'overtime_hours_167', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-amber-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-red-50/50 text-center">
                        <input
                          type="number"
                          value={data.holiday_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'holiday_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-red-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-pink-50/50 text-center">
                        <input
                          type="number"
                          value={data.birthday_bonus || ''}
                          onChange={(e) => handleChange(emp.id, 'birthday_bonus', e.target.value)}
                          disabled={disabled}
                          className="w-20 px-2 py-1 border border-pink-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
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
      )}

      {/* 12日發薪項目表格 */}
      {activeSection === '12th' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
            <h2 className="font-bold text-purple-800">12日發薪 - 時數</h2>
            <p className="text-xs text-purple-600 mt-1">計時超額津貼、12日加班費（×1.34、×1.67）</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs font-bold tracking-wider border-b border-stone-200">
                  <th className="p-3 text-left sticky left-0 bg-stone-50 z-10 min-w-[120px]">員工</th>
                  <th className="p-3 text-center bg-purple-50 text-purple-700 min-w-[80px]" title="12日計時超額時數">
                    <div>超額時數</div>
                    <div className="text-[10px] font-normal text-purple-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-purple-50 text-purple-700 min-w-[80px]" title="12日加班前2小時 ×1.34">
                    <div>加班前2小</div>
                    <div className="text-[10px] font-normal text-purple-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-purple-50 text-purple-700 min-w-[80px]" title="12日加班2小時後 ×1.67">
                    <div>加班2小後</div>
                    <div className="text-[10px] font-normal text-purple-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-emerald-50 text-emerald-700 min-w-[90px]" title="12日其他加項">
                    <div>其他加項</div>
                    <div className="text-[10px] font-normal text-emerald-500">(元)</div>
                  </th>
                  <th className="p-3 text-center bg-rose-50 text-rose-700 min-w-[90px]" title="12日其他扣項">
                    <div>其他扣項</div>
                    <div className="text-[10px] font-normal text-rose-500">(元)</div>
                  </th>
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
                      <td className="p-3 bg-purple-50/50 text-center">
                        <input
                          type="number"
                          value={data.overtime_12th_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'overtime_12th_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-purple-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-purple-50/50 text-center">
                        <input
                          type="number"
                          value={data.overtime_12th_hours_134 || ''}
                          onChange={(e) => handleChange(emp.id, 'overtime_12th_hours_134', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-purple-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-purple-50/50 text-center">
                        <input
                          type="number"
                          value={data.overtime_12th_hours_167 || ''}
                          onChange={(e) => handleChange(emp.id, 'overtime_12th_hours_167', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-purple-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-emerald-50/50 text-center">
                        <input
                          type="number"
                          value={data.other_bonus_12th || ''}
                          onChange={(e) => handleChange(emp.id, 'other_bonus_12th', e.target.value)}
                          disabled={disabled}
                          className="w-20 px-2 py-1 border border-emerald-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                        />
                      </td>
                      <td className="p-3 bg-rose-50/50 text-center">
                        <input
                          type="number"
                          value={data.other_deduction_12th || ''}
                          onChange={(e) => handleChange(emp.id, 'other_deduction_12th', e.target.value)}
                          disabled={disabled}
                          className="w-20 px-2 py-1 border border-rose-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
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
      )}

      {/* 請假與扣款表格 */}
      {activeSection === 'leave' && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100">
            <h2 className="font-bold text-emerald-800">請假與扣款項目</h2>
            <p className="text-xs text-emerald-600 mt-1">特休、病假、事假、公婚喪產假、颱風假</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="bg-stone-50 text-stone-500 text-xs font-bold tracking-wider border-b border-stone-200">
                  <th className="p-3 text-left sticky left-0 bg-stone-50 z-10 min-w-[120px]">員工</th>
                  <th className="p-3 text-center min-w-[80px]" title="特休天數">
                    <div>特休天數</div>
                    <div className="text-[10px] font-normal text-stone-400">(天)</div>
                  </th>
                  <th className="p-3 text-center bg-green-50 text-green-700 min-w-[80px]" title="特休已休時數（計時人員）">
                    <div>已休時數</div>
                    <div className="text-[10px] font-normal text-green-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-green-50 text-green-700 min-w-[80px]" title="特休代金時數">
                    <div>代金時數</div>
                    <div className="text-[10px] font-normal text-green-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-amber-50 text-amber-700 min-w-[80px]" title="病假時數（扣半薪）">
                    <div>病假</div>
                    <div className="text-[10px] font-normal text-amber-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-red-50 text-red-700 min-w-[80px]" title="事假時數（扣全薪）">
                    <div>事假</div>
                    <div className="text-[10px] font-normal text-red-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-blue-50 text-blue-700 min-w-[80px]" title="公婚喪產假時數（計時加給）">
                    <div>公婚喪產假</div>
                    <div className="text-[10px] font-normal text-blue-500">(hr)</div>
                  </th>
                  <th className="p-3 text-center bg-purple-50 text-purple-700 min-w-[80px]" title="颱風假時數（扣全薪）">
                    <div>颱風假</div>
                    <div className="text-[10px] font-normal text-purple-500">(hr)</div>
                  </th>
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
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={data.annual_leave_days || ''}
                          onChange={(e) => handleChange(emp.id, 'annual_leave_days', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-stone-300 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-green-50/50 text-center">
                        <input
                          type="number"
                          value={data.annual_leave_used_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'annual_leave_used_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-green-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-green-50/50 text-center">
                        <input
                          type="number"
                          value={data.annual_leave_pay_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'annual_leave_pay_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-green-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-amber-50/50 text-center">
                        <input
                          type="number"
                          value={data.sick_leave_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'sick_leave_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-amber-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-red-50/50 text-center">
                        <input
                          type="number"
                          value={data.personal_leave_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'personal_leave_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-red-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-blue-50/50 text-center">
                        <input
                          type="number"
                          value={data.paid_leave_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'paid_leave_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-blue-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                      <td className="p-3 bg-purple-50/50 text-center">
                        <input
                          type="number"
                          value={data.typhoon_leave_hours || ''}
                          onChange={(e) => handleChange(emp.id, 'typhoon_leave_hours', e.target.value)}
                          disabled={disabled}
                          className="w-16 px-2 py-1 border border-purple-200 rounded text-center text-sm disabled:bg-stone-100 mx-auto block"
                          min="0"
                          step="0.5"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-4 text-center text-xs text-stone-400 flex items-center justify-center gap-2">
        <Users size={14} />
        共 {employees.length} 位員工
      </div>
    </div>
  );
}
