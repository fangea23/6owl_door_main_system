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
  AlertCircle
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
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [stores, setStores] = useState([]);
  const [expandedStore, setExpandedStore] = useState(null);
  const [storeDetails, setStoreDetails] = useState({});

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
        .select('id, name, employee_id')
        .in('id', employeeIds);

      const enriched = (data || []).map(item => ({
        ...item,
        employee: employees?.find(e => e.id === item.employee_id)
      }));

      setStoreDetails(prev => ({
        ...prev,
        [storeId]: enriched
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

  const handleApprove = async (storeId) => {
    if (!window.confirm('確定要核准此門市的出勤資料嗎？')) return;

    setProcessing(true);
    try {
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
          <p className="text-stone-500 mt-1 text-sm">審核各門市提交的月出勤資料</p>
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
                    <table className="w-full">
                      <thead>
                        <tr className="bg-stone-50 text-stone-500 text-xs border-b border-stone-100">
                          <th className="p-3 text-left">員工</th>
                          <th className="p-3 text-center">出勤/應勤</th>
                          <th className="p-3 text-center">正常時數</th>
                          <th className="p-3 text-center">加班(1.33)</th>
                          <th className="p-3 text-center">加班(1.66)</th>
                          <th className="p-3 text-center">假日(2.0)</th>
                          <th className="p-3 text-center">特休</th>
                          <th className="p-3 text-center">病假</th>
                          <th className="p-3 text-center">事假</th>
                          <th className="p-3 text-center">遲到</th>
                          <th className="p-3 text-center">曠職</th>
                          <th className="p-3 text-center">狀態</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {details.map((item) => (
                          <tr key={item.id} className="hover:bg-stone-50">
                            <td className="p-3">
                              <p className="font-medium text-stone-800">{item.employee?.name}</p>
                              <p className="text-xs text-stone-400">{item.employee?.employee_id}</p>
                            </td>
                            <td className="p-3 text-center text-sm">
                              {item.work_days}/{item.scheduled_days}
                            </td>
                            <td className="p-3 text-center text-sm font-mono">{item.regular_hours || '-'}</td>
                            <td className="p-3 text-center text-sm font-mono text-amber-600">{item.overtime_hours_133 || '-'}</td>
                            <td className="p-3 text-center text-sm font-mono text-amber-600">{item.overtime_hours_166 || '-'}</td>
                            <td className="p-3 text-center text-sm font-mono text-red-600">{item.overtime_hours_200 || '-'}</td>
                            <td className="p-3 text-center text-sm">{item.annual_leave_days || '-'}</td>
                            <td className="p-3 text-center text-sm">{item.sick_leave_days || '-'}</td>
                            <td className="p-3 text-center text-sm">{item.personal_leave_days || '-'}</td>
                            <td className="p-3 text-center text-sm">{item.late_count || '-'}</td>
                            <td className="p-3 text-center text-sm">{item.absent_count || '-'}</td>
                            <td className="p-3 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[item.status]?.color || 'bg-stone-100'}`}>
                                {STATUS_MAP[item.status]?.label || item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
