import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Building,
  ChevronDown,
  Eye,
  Calendar,
  Users,
  AlertCircle,
  Save,
  Edit3
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import { usePermission } from '../../../../../hooks/usePermission';

// 狀態對照
const STATUS_MAP = {
  'draft': { label: '草稿', color: 'bg-stone-100 text-stone-600' },
  'submitted': { label: '待審核', color: 'bg-amber-100 text-amber-700' },
  'approved': { label: '已核准', color: 'bg-emerald-100 text-emerald-700' },
  'rejected': { label: '已退回', color: 'bg-red-100 text-red-700' },
};

export default function AttendanceReview() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [stores, setStores] = useState([]);
  const [expandedStore, setExpandedStore] = useState(null);
  const [storeDetails, setStoreDetails] = useState({});
  const [editingData, setEditingData] = useState({}); // 用於追蹤正在編輯的資料
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'hq_fields'

  const { hasPermission: canApprove, loading: permLoading } = usePermission('payroll.attendance.approve');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchAttendanceSummary();
    }
  }, [selectedPeriodId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 取得所有薪資週期
      const { data: periodData } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(12);

      setPeriods(periodData || []);

      // 設定預設為最新週期
      if (periodData && periodData.length > 0) {
        setCurrentPeriod(periodData[0]);
        setSelectedPeriodId(periodData[0].id);
      }

      // 取得門市
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code');

      setStores(storeData || []);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      // 取得該週期所有門市的出勤統計
      const { data } = await supabase
        .from('monthly_attendance_summary')
        .select('store_id, status')
        .eq('period_id', selectedPeriodId);

      // 按門市分組統計
      const summaryByStore = {};
      (data || []).forEach(item => {
        if (!summaryByStore[item.store_id]) {
          summaryByStore[item.store_id] = {
            store_id: item.store_id,
            total: 0,
            draft: 0,
            submitted: 0,
            approved: 0,
            rejected: 0
          };
        }
        summaryByStore[item.store_id].total++;
        summaryByStore[item.store_id][item.status]++;
      });

      setAttendanceSummary(Object.values(summaryByStore));

    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchStoreDetails = async (storeId) => {
    try {
      const { data } = await supabase
        .from('monthly_attendance_summary')
        .select('*')
        .eq('period_id', selectedPeriodId)
        .eq('store_id', storeId);

      // 取得員工資訊
      const employeeIds = data?.map(d => d.employee_id) || [];
      const { data: employees } = await supabase
        .from('employees')
        .select('id, name, employee_id, employment_type_new')
        .in('id', employeeIds);

      const enriched = (data || []).map(item => ({
        ...item,
        employee: employees?.find(e => e.id === item.employee_id)
      }));

      setStoreDetails(prev => ({
        ...prev,
        [storeId]: enriched
      }));

      // 初始化編輯資料（總部填寫欄位）
      const editData = {};
      enriched.forEach(item => {
        editData[item.id] = {
          advance_payment: item.advance_payment || 0,
          other_deduction_10th: item.other_deduction_10th || 0,
          health_insurance_dependents: item.health_insurance_dependents || 0,
          labor_insurance_retroactive: item.labor_insurance_retroactive || 0,
          health_insurance_retroactive: item.health_insurance_retroactive || 0,
        };
      });
      setEditingData(prev => ({
        ...prev,
        [storeId]: editData
      }));

    } catch (error) {
      console.error('Error fetching store details:', error);
    }
  };

  const handleExpand = (storeId) => {
    if (expandedStore === storeId) {
      setExpandedStore(null);
    } else {
      setExpandedStore(storeId);
      if (!storeDetails[storeId]) {
        fetchStoreDetails(storeId);
      }
    }
  };

  const handleFieldChange = (storeId, itemId, field, value) => {
    setEditingData(prev => ({
      ...prev,
      [storeId]: {
        ...prev[storeId],
        [itemId]: {
          ...prev[storeId]?.[itemId],
          [field]: parseFloat(value) || 0
        }
      }
    }));
  };

  const handleSaveHQFields = async (storeId) => {
    setSaving(true);
    try {
      const storeEditData = editingData[storeId];
      if (!storeEditData) return;

      for (const [itemId, fields] of Object.entries(storeEditData)) {
        await supabase
          .from('monthly_attendance_summary')
          .update({
            advance_payment: fields.advance_payment || 0,
            other_deduction_10th: fields.other_deduction_10th || 0,
            health_insurance_dependents: fields.health_insurance_dependents || 0,
            labor_insurance_retroactive: fields.labor_insurance_retroactive || 0,
            health_insurance_retroactive: fields.health_insurance_retroactive || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemId);
      }

      alert('儲存成功！');
      fetchStoreDetails(storeId);
    } catch (error) {
      console.error('Error saving:', error);
      alert('儲存失敗：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async (storeId) => {
    if (!window.confirm('確定要核准此門市的出勤資料嗎？')) return;

    setProcessing(true);
    try {
      // 先儲存總部欄位
      await handleSaveHQFields(storeId);

      const { error } = await supabase
        .from('monthly_attendance_summary')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id
        })
        .eq('period_id', selectedPeriodId)
        .eq('store_id', storeId)
        .eq('status', 'submitted');

      if (error) throw error;

      alert('核准成功！');
      fetchAttendanceSummary();
      fetchStoreDetails(storeId);
    } catch (error) {
      console.error('Error approving:', error);
      alert('核准失敗：' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (storeId) => {
    const reason = prompt('請輸入退回原因：');
    if (!reason?.trim()) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('monthly_attendance_summary')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          review_notes: reason
        })
        .eq('period_id', selectedPeriodId)
        .eq('store_id', storeId)
        .eq('status', 'submitted');

      if (error) throw error;

      alert('已退回！');
      fetchAttendanceSummary();
      fetchStoreDetails(storeId);
    } catch (error) {
      console.error('Error rejecting:', error);
      alert('退回失敗：' + error.message);
    } finally {
      setProcessing(false);
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

  if (!canApprove) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
          <h2 className="text-xl font-bold text-stone-800 mb-2">無權限</h2>
          <p className="text-stone-500">您沒有出勤審核權限</p>
        </div>
      </div>
    );
  }

  // 統計
  const totalSubmitted = attendanceSummary.reduce((sum, s) => sum + s.submitted, 0);
  const totalApproved = attendanceSummary.reduce((sum, s) => sum + s.approved, 0);

  // 渲染詳情表格 - 出勤總覽
  const renderOverviewTable = (details, storeId) => (
    <table className="w-full">
      <thead>
        <tr className="bg-stone-50 text-stone-500 text-xs border-b border-stone-100">
          <th className="p-3 text-left sticky left-0 bg-stone-50 z-10 min-w-[120px]">員工</th>
          <th className="p-3 text-center min-w-[70px]" title="在職天數">
            <div>在職天數</div>
            <div className="text-[10px] font-normal text-stone-400">(天)</div>
          </th>
          <th className="p-3 text-center bg-blue-50 text-blue-700 min-w-[70px]" title="正常工時">
            <div>正常時數</div>
            <div className="text-[10px] font-normal text-blue-500">(hr)</div>
          </th>
          <th className="p-3 text-center bg-amber-50 text-amber-700 min-w-[80px]" title="加班前2小時">
            <div>加班前2小</div>
            <div className="text-[10px] font-normal text-amber-500">(hr)</div>
          </th>
          <th className="p-3 text-center bg-amber-50 text-amber-700 min-w-[80px]" title="加班2小時後">
            <div>加班2小後</div>
            <div className="text-[10px] font-normal text-amber-500">(hr)</div>
          </th>
          <th className="p-3 text-center bg-red-50 text-red-700 min-w-[70px]" title="國定假日工時">
            <div>國假時數</div>
            <div className="text-[10px] font-normal text-red-500">(hr)</div>
          </th>
          <th className="p-3 text-center bg-pink-50 text-pink-700 min-w-[70px]" title="生日獎金">
            <div>生日獎金</div>
            <div className="text-[10px] font-normal text-pink-500">(元)</div>
          </th>
          <th className="p-3 text-center min-w-[70px]" title="特休天數">
            <div>特休天數</div>
            <div className="text-[10px] font-normal text-stone-400">(天)</div>
          </th>
          <th className="p-3 text-center min-w-[60px]" title="病假時數">
            <div>病假</div>
            <div className="text-[10px] font-normal text-stone-400">(hr)</div>
          </th>
          <th className="p-3 text-center min-w-[60px]" title="事假時數">
            <div>事假</div>
            <div className="text-[10px] font-normal text-stone-400">(hr)</div>
          </th>
          <th className="p-3 text-center min-w-[70px]">狀態</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-stone-100">
        {details.map((item) => (
          <tr key={item.id} className="hover:bg-stone-50">
            <td className="p-3 sticky left-0 bg-white z-10">
              <p className="font-medium text-stone-800">{item.employee?.name}</p>
              <p className="text-xs text-stone-400">
                {item.employee?.employee_id} | {item.employee?.employment_type_new === 'parttime' ? '計時' : '正職'}
              </p>
            </td>
            <td className="p-3 text-center text-sm">
              <span className="mx-auto block">{item.work_days_in_month || '-'}</span>
            </td>
            <td className="p-3 text-center text-sm font-mono bg-blue-50/30">
              <span className="mx-auto block">{item.regular_hours || '-'}</span>
            </td>
            <td className="p-3 text-center text-sm font-mono text-amber-600 bg-amber-50/30">
              <span className="mx-auto block">{item.overtime_hours_134 || '-'}</span>
            </td>
            <td className="p-3 text-center text-sm font-mono text-amber-600 bg-amber-50/30">
              <span className="mx-auto block">{item.overtime_hours_167 || '-'}</span>
            </td>
            <td className="p-3 text-center text-sm font-mono text-red-600 bg-red-50/30">
              <span className="mx-auto block">{item.holiday_hours || '-'}</span>
            </td>
            <td className="p-3 text-center text-sm font-mono text-pink-600 bg-pink-50/30">
              <span className="mx-auto block">{item.birthday_bonus || '-'}</span>
            </td>
            <td className="p-3 text-center text-sm">
              <span className="mx-auto block">{item.annual_leave_days || '-'}</span>
            </td>
            <td className="p-3 text-center text-sm">
              <span className="mx-auto block">{item.sick_leave_hours || '-'}</span>
            </td>
            <td className="p-3 text-center text-sm">
              <span className="mx-auto block">{item.personal_leave_hours || '-'}</span>
            </td>
            <td className="p-3 text-center">
              <span className={`text-xs px-2 py-0.5 rounded-full mx-auto ${STATUS_MAP[item.status]?.color || 'bg-stone-100'}`}>
                {STATUS_MAP[item.status]?.label || item.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // 渲染詳情表格 - 總部填寫欄位
  const renderHQFieldsTable = (details, storeId) => {
    const storeEditData = editingData[storeId] || {};
    const isSubmitted = details.some(d => d.status === 'submitted');

    return (
      <div>
        <div className="bg-orange-50 border-b border-orange-100 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Edit3 size={16} className="text-orange-600" />
            <span className="font-bold text-orange-800">總部填寫欄位</span>
            <span className="text-xs text-orange-600">（預支、其他扣款、健保眷屬、勞健保追朔由總部人資填寫）</span>
          </div>
          {isSubmitted && (
            <button
              onClick={() => handleSaveHQFields(storeId)}
              disabled={saving}
              className="px-3 py-1.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors flex items-center gap-1"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              儲存
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs border-b border-stone-100">
                <th className="p-3 text-left sticky left-0 bg-stone-50 z-10 min-w-[120px]">員工</th>
                <th className="p-3 text-center bg-rose-50 text-rose-700 min-w-[80px]" title="預支薪資">
                  <div>預支</div>
                  <div className="text-[10px] font-normal text-rose-500">(元)</div>
                </th>
                <th className="p-3 text-center bg-rose-50 text-rose-700 min-w-[80px]" title="其他扣款">
                  <div>其他扣款</div>
                  <div className="text-[10px] font-normal text-rose-500">(元)</div>
                </th>
                <th className="p-3 text-center bg-cyan-50 text-cyan-700 min-w-[80px]" title="健保眷屬加保金額">
                  <div>健保眷屬</div>
                  <div className="text-[10px] font-normal text-cyan-500">(元)</div>
                </th>
                <th className="p-3 text-center bg-orange-50 text-orange-700 min-w-[80px]" title="勞保追朔補扣">
                  <div>勞保追朔</div>
                  <div className="text-[10px] font-normal text-orange-500">(元)</div>
                </th>
                <th className="p-3 text-center bg-orange-50 text-orange-700 min-w-[80px]" title="健保追朔補扣">
                  <div>健保追朔</div>
                  <div className="text-[10px] font-normal text-orange-500">(元)</div>
                </th>
                <th className="p-3 text-center min-w-[70px]">狀態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {details.map((item) => {
                const itemEdit = storeEditData[item.id] || {};
                const canEdit = item.status === 'submitted';

                return (
                  <tr key={item.id} className="hover:bg-stone-50">
                    <td className="p-3 sticky left-0 bg-white z-10">
                      <p className="font-medium text-stone-800">{item.employee?.name}</p>
                      <p className="text-xs text-stone-400">
                        {item.employee?.employee_id} | {item.employee?.employment_type_new === 'parttime' ? '計時' : '正職'}
                      </p>
                    </td>
                    <td className="p-3 text-center bg-rose-50/30">
                      {canEdit ? (
                        <input
                          type="number"
                          value={itemEdit.advance_payment || ''}
                          onChange={(e) => handleFieldChange(storeId, item.id, 'advance_payment', e.target.value)}
                          className="w-20 px-2 py-1 border border-rose-200 rounded text-center text-sm mx-auto block"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm font-mono mx-auto block">{item.advance_payment || '-'}</span>
                      )}
                    </td>
                    <td className="p-3 text-center bg-rose-50/30">
                      {canEdit ? (
                        <input
                          type="number"
                          value={itemEdit.other_deduction_10th || ''}
                          onChange={(e) => handleFieldChange(storeId, item.id, 'other_deduction_10th', e.target.value)}
                          className="w-20 px-2 py-1 border border-rose-200 rounded text-center text-sm mx-auto block"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm font-mono mx-auto block">{item.other_deduction_10th || '-'}</span>
                      )}
                    </td>
                    <td className="p-3 text-center bg-cyan-50/30">
                      {canEdit ? (
                        <input
                          type="number"
                          value={itemEdit.health_insurance_dependents || ''}
                          onChange={(e) => handleFieldChange(storeId, item.id, 'health_insurance_dependents', e.target.value)}
                          className="w-20 px-2 py-1 border border-cyan-200 rounded text-center text-sm mx-auto block"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm font-mono mx-auto block">{item.health_insurance_dependents || '-'}</span>
                      )}
                    </td>
                    <td className="p-3 text-center bg-orange-50/30">
                      {canEdit ? (
                        <input
                          type="number"
                          value={itemEdit.labor_insurance_retroactive || ''}
                          onChange={(e) => handleFieldChange(storeId, item.id, 'labor_insurance_retroactive', e.target.value)}
                          className="w-20 px-2 py-1 border border-orange-200 rounded text-center text-sm mx-auto block"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm font-mono mx-auto block">{item.labor_insurance_retroactive || '-'}</span>
                      )}
                    </td>
                    <td className="p-3 text-center bg-orange-50/30">
                      {canEdit ? (
                        <input
                          type="number"
                          value={itemEdit.health_insurance_retroactive || ''}
                          onChange={(e) => handleFieldChange(storeId, item.id, 'health_insurance_retroactive', e.target.value)}
                          className="w-20 px-2 py-1 border border-orange-200 rounded text-center text-sm mx-auto block"
                          min="0"
                        />
                      ) : (
                        <span className="text-sm font-mono mx-auto block">{item.health_insurance_retroactive || '-'}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full mx-auto ${STATUS_MAP[item.status]?.color || 'bg-stone-100'}`}>
                        {STATUS_MAP[item.status]?.label || item.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="pb-20">
      {/* 標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            出勤資料審核
          </h1>
          <p className="text-stone-500 mt-1 text-sm">審核各門市提交的月出勤資料，並填寫總部欄位</p>
        </div>

        {/* 週期選擇 */}
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="pl-10 pr-10 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
          >
            {periods.map(p => (
              <option key={p.id} value={p.id}>{p.period_name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">待審核</p>
          <p className="text-2xl font-bold text-amber-600">{totalSubmitted}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">已核准</p>
          <p className="text-2xl font-bold text-emerald-600">{totalApproved}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">已提交門市</p>
          <p className="text-2xl font-bold text-blue-600">{attendanceSummary.filter(s => s.submitted > 0 || s.approved > 0).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">總門市數</p>
          <p className="text-2xl font-bold text-stone-600">{stores.length}</p>
        </div>
      </div>

      {/* 門市列表 */}
      <div className="space-y-4">
        {attendanceSummary.filter(s => s.total > 0).map((summary) => {
          const store = stores.find(st => st.id === summary.store_id);
          const isExpanded = expandedStore === summary.store_id;
          const details = storeDetails[summary.store_id] || [];

          return (
            <div key={summary.store_id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
              {/* 門市標題行 */}
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-stone-50 transition-colors"
                onClick={() => handleExpand(summary.store_id)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-stone-100 rounded-lg">
                    <Building size={20} className="text-stone-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-800">{store?.code} - {store?.name}</p>
                    <div className="flex gap-2 mt-1">
                      {summary.submitted > 0 && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                          待審核 {summary.submitted}
                        </span>
                      )}
                      {summary.approved > 0 && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                          已核准 {summary.approved}
                        </span>
                      )}
                      {summary.draft > 0 && (
                        <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">
                          草稿 {summary.draft}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* 審核按鈕 */}
                  {summary.submitted > 0 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleReject(summary.store_id); }}
                        disabled={processing}
                        className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
                      >
                        <XCircle size={16} className="inline mr-1" />
                        退回
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApprove(summary.store_id); }}
                        disabled={processing}
                        className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
                      >
                        <CheckCircle2 size={16} className="inline mr-1" />
                        核准
                      </button>
                    </>
                  )}
                  <ChevronDown
                    size={20}
                    className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* 展開詳情 */}
              {isExpanded && (
                <div className="border-t border-stone-200">
                  {details.length === 0 ? (
                    <div className="p-8 text-center text-stone-400">
                      <Loader2 className="animate-spin mx-auto mb-2" size={24} />
                      載入中...
                    </div>
                  ) : (
                    <>
                      {/* Tab 切換 */}
                      <div className="flex border-b border-stone-200">
                        <button
                          onClick={() => setActiveTab('overview')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === 'overview'
                              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                              : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <Eye size={14} className="inline mr-1" />
                          出勤總覽
                        </button>
                        <button
                          onClick={() => setActiveTab('hq_fields')}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${
                            activeTab === 'hq_fields'
                              ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50'
                              : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          <Edit3 size={14} className="inline mr-1" />
                          總部欄位
                        </button>
                      </div>

                      {/* 表格內容 */}
                      <div className="overflow-x-auto">
                        {activeTab === 'overview'
                          ? renderOverviewTable(details, summary.store_id)
                          : renderHQFieldsTable(details, summary.store_id)
                        }
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {attendanceSummary.filter(s => s.total > 0).length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center">
            <Users className="mx-auto text-stone-300 mb-3" size={48} />
            <p className="text-stone-500">本週期尚無出勤資料</p>
          </div>
        )}
      </div>
    </div>
  );
}
