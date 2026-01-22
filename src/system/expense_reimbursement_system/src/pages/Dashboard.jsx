import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowRight,
  Loader2,
  Wallet,
  Shield,
  ListFilter,
  CheckSquare,
  Building,
  ChevronRight,
  Calendar,
  Receipt,
  DollarSign,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { usePermission, PermissionGuard } from '../../../../hooks/usePermission';

// 員工代墊款系統的基礎路徑
const BASE_PATH = '/systems/expense-reimbursement';

// --- 狀態與文字對照表 ---
const STATUS_MAP = {
  'draft':                  { label: '草稿', color: 'bg-stone-100 text-stone-600 border-stone-200', step: 0 },
  'pending_ceo':            { label: '待總經理簽核', color: 'bg-purple-50 text-purple-700 border-purple-100', step: 1 },
  'pending_boss':           { label: '待放行主管簽核', color: 'bg-blue-50 text-blue-700 border-blue-100', step: 1 },
  'pending_audit_manager':  { label: '待審核主管簽核', color: 'bg-amber-50 text-amber-700 border-amber-100', step: 2 },
  'approved':               { label: '已核准', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', step: 3 },
  'rejected':               { label: '已駁回', color: 'bg-red-50 text-red-700 border-red-100', step: 0 },
  'cancelled':              { label: '已取消', color: 'bg-stone-100 text-stone-400 border-stone-200', step: 0 },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // RBAC 權限檢查
  const { hasPermission: canCreate } = usePermission('expense.create');
  const { hasPermission: canViewAll } = usePermission('expense.view.all');
  const { hasPermission: canViewOwn } = usePermission('expense.view.own');
  const { hasPermission: canApproveCEO } = usePermission('expense.approve.ceo');
  const { hasPermission: canApproveBoss } = usePermission('expense.approve.boss');
  const { hasPermission: canApproveAudit } = usePermission('expense.approve.audit_manager');
  const { hasPermission: canPrint } = usePermission('expense.print');
  const { hasPermission: canExport } = usePermission('expense.export');

  // 員工姓名
  const [employeeName, setEmployeeName] = useState('');

  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('employees')
          .select('name')
          .eq('user_id', user.id)
          .single();

        if (data?.name) {
          setEmployeeName(data.name);
        }
      } catch (err) {
        console.error('Error fetching name:', err);
      }
    };
    fetchEmployeeName();
  }, [user]);

  const displayName = employeeName || user?.user_metadata?.full_name || user?.email;

  // 批量操作 State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  // 檢查用戶是否有任何審核權限
  const hasAnyApprovalPermission = canApproveCEO || canApproveBoss || canApproveAudit;

  // 視圖模式 - 初始設為 null，等權限載入完成後再決定
  const [viewMode, setViewMode] = useState(null);
  const [viewModeInitialized, setViewModeInitialized] = useState(false);

  // 等權限載入完成後，設定初始視圖模式（只執行一次）
  useEffect(() => {
    // 等待權限檢查完成（假設權限 hook 會在載入完成後返回穩定值）
    // 使用 setTimeout 確保權限已經載入
    const timer = setTimeout(() => {
      if (!viewModeInitialized) {
        setViewMode(hasAnyApprovalPermission ? 'todo' : 'all');
        setViewModeInitialized(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [hasAnyApprovalPermission, viewModeInitialized]);

  // 載入資料 - 只在 viewMode 初始化完成後才執行
  useEffect(() => {
    if (user && viewMode) {
      fetchRequests();
    }

    // Realtime subscription
    const subscription = supabase
      .channel('expense-dashboard-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'expense_reimbursement_requests'
      }, () => {
        if(user && viewMode) fetchRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [user, viewMode]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('expense_reimbursement_requests')
        .select('*')
        .is('deleted_at', null);

      // 權限過濾
      if (canViewOwn && !canViewAll) {
        query = query.eq('applicant_id', user.id);
      }

      // 排序
      if (viewMode === 'todo') {
        // 待辦事項：舊的在上面 (急件先處理)
        query = query.order('created_at', { ascending: true });
      } else {
        // 所有歷史：新的在上面 (查看最新進度)
        query = query.order('created_at', { ascending: false });
      }

      const { data: requestsData, error } = await query;
      if (error) throw error;

      // 如果有資料，批次獲取申請人和部門資訊
      if (requestsData && requestsData.length > 0) {
        const userIds = [...new Set(requestsData.map(r => r.applicant_id))];
        const deptIds = [...new Set(requestsData.map(r => r.department_id).filter(Boolean))];

        // 獲取員工資訊
        const { data: employeesData } = await supabase
          .from('employees')
          .select('user_id, name, employee_id')
          .in('user_id', userIds);

        // 獲取部門資訊
        const { data: departmentsData } = await supabase
          .from('departments')
          .select('id, name')
          .in('id', deptIds);

        // 組合資料
        const enrichedRequests = requestsData.map(request => ({
          ...request,
          applicant: employeesData?.find(e => e.user_id === request.applicant_id) || null,
          department: departmentsData?.find(d => d.id === request.department_id) || null,
        }));

        setRequests(enrichedRequests);
      } else {
        setRequests([]);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // 資料篩選邏輯
  const filteredRequests = requests.filter(req => {
    if (viewMode === 'all') return true;

    // 根據權限決定哪些狀態是我負責的
    const myResponsibilities = [];
    if (canApproveCEO) myResponsibilities.push('pending_ceo');
    if (canApproveBoss) myResponsibilities.push('pending_boss');
    if (canApproveAudit) myResponsibilities.push('pending_audit_manager');

    return myResponsibilities.includes(req.status);
  });

  const todoCount = requests.filter(req => {
    const myResponsibilities = [];
    if (canApproveCEO) myResponsibilities.push('pending_ceo');
    if (canApproveBoss) myResponsibilities.push('pending_boss');
    if (canApproveAudit) myResponsibilities.push('pending_audit_manager');
    return myResponsibilities.includes(req.status);
  }).length;

  // 批量選取邏輯
  const handleSelect = (id) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredRequests.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRequests.map(r => r.id)));
    }
  };

  // 批量核准
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;

    const selectedRequests = requests.filter(r => selectedIds.has(r.id));
    const statuses = [...new Set(selectedRequests.map(r => r.status))];

    // 檢查是否所有選取的單據狀態一致
    if (statuses.length > 1) {
      alert('⚠️ 批量操作失敗\n\n選取的單據處於不同審核階段，無法一次核准。\n請分別選取相同狀態的單據進行批量操作。');
      return;
    }

    const currentStatus = statuses[0];

    // 根據狀態檢查對應權限
    const statusPermissionMap = {
      'pending_ceo': { hasPermission: canApproveCEO, name: '總經理', nextStatus: 'pending_audit_manager' },
      'pending_boss': { hasPermission: canApproveBoss, name: '放行主管', nextStatus: 'pending_audit_manager' },
      'pending_audit_manager': { hasPermission: canApproveAudit, name: '審核主管', nextStatus: 'approved' },
    };

    const permissionCheck = statusPermissionMap[currentStatus];

    if (!permissionCheck) {
      alert('⚠️ 無法批量核准\n\n選取的單據狀態無法進行批量核准操作。');
      return;
    }

    if (!permissionCheck.hasPermission) {
      alert(`⚠️ 權限不足\n\n您沒有「${permissionCheck.name}」簽核權限，無法批量核准這些單據。`);
      return;
    }

    if (!window.confirm(`確定要一次核准選取的 ${selectedIds.size} 筆單據嗎？`)) return;

    setBatchProcessing(true);

    try {
      const updates = Array.from(selectedIds).map(async (id) => {
        // 更新申請狀態
        const { error: updateError } = await supabase
          .from('expense_reimbursement_requests')
          .update({ status: permissionCheck.nextStatus })
          .eq('id', id);

        if (updateError) throw updateError;

        // 插入簽核紀錄
        const approvalType = currentStatus === 'pending_ceo' ? 'ceo' :
                            currentStatus === 'pending_boss' ? 'boss' : 'audit_manager';

        const { error: approvalError } = await supabase
          .from('expense_approvals')
          .insert({
            request_id: id,
            approver_id: user.id,
            approval_type: approvalType,
            status: 'approved',
            approved_at: new Date().toISOString(),
            comment: '批量核准'
          });

        if (approvalError) throw approvalError;
      });

      await Promise.all(updates);
      alert('✅ 批量簽核完成！');
      setSelectedIds(new Set());
      fetchRequests();
    } catch (e) {
      console.error(e);
      alert('部分更新失敗，請重試');
    } finally {
      setBatchProcessing(false);
    }
  };

  // 批量駁回
  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;

    const selectedRequests = requests.filter(r => selectedIds.has(r.id));
    const statuses = [...new Set(selectedRequests.map(r => r.status))];

    // 檢查是否所有選取的單據狀態一致
    if (statuses.length > 1) {
      alert('⚠️ 批量操作失敗\n\n選取的單據處於不同審核階段，無法一次駁回。');
      return;
    }

    const currentStatus = statuses[0];

    // 根據狀態檢查對應權限
    const statusPermissionMap = {
      'pending_ceo': { hasPermission: canApproveCEO, name: '總經理' },
      'pending_boss': { hasPermission: canApproveBoss, name: '放行主管' },
      'pending_audit_manager': { hasPermission: canApproveAudit, name: '審核主管' },
    };

    const permissionCheck = statusPermissionMap[currentStatus];

    if (!permissionCheck) {
      alert('⚠️ 無法批量駁回\n\n選取的單據狀態無法進行批量駁回操作。');
      return;
    }

    if (!permissionCheck.hasPermission) {
      alert(`⚠️ 權限不足\n\n您沒有「${permissionCheck.name}」簽核權限，無法批量駁回這些單據。`);
      return;
    }

    const reason = prompt(`⚠️ 您即將駁回選取的 ${selectedIds.size} 筆單據。\n\n請輸入駁回原因（將套用至所有選取案件）：`);
    if (!reason?.trim()) return;

    setBatchProcessing(true);

    try {
      const updates = Array.from(selectedIds).map(async (id) => {
        // 更新申請狀態
        const { error: updateError } = await supabase
          .from('expense_reimbursement_requests')
          .update({ status: 'rejected' })
          .eq('id', id);

        if (updateError) throw updateError;

        // 插入駁回紀錄
        const approvalType = currentStatus === 'pending_ceo' ? 'ceo' :
                            currentStatus === 'pending_boss' ? 'boss' : 'audit_manager';

        const { error: approvalError } = await supabase
          .from('expense_approvals')
          .insert({
            request_id: id,
            approver_id: user.id,
            approval_type: approvalType,
            status: 'rejected',
            approved_at: new Date().toISOString(),
            comment: reason
          });

        if (approvalError) throw approvalError;
      });

      await Promise.all(updates);
      alert('✅ 批量駁回完成！');
      setSelectedIds(new Set());
      fetchRequests();
    } catch (e) {
      console.error(e);
      alert('處理失敗，請稍後再試');
    } finally {
      setBatchProcessing(false);
    }
  };

  // 權限檢查
  if (!canViewAll && !canViewOwn) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-center mb-2">無查看權限</h2>
          <p className="text-gray-600 text-center mb-4">
            您沒有查看代墊款申請的權限。
          </p>
          <p className="text-sm text-gray-500 text-center">
            需要以下任一權限：
            <br />• expense.view.all（查看所有申請）
            <br />• expense.view.own（查看自己的申請）
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">

      {/* ================= 標題區塊 ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-amber-100 to-red-100 rounded-xl text-amber-600">
               <Wallet className="h-6 w-6 md:h-8 md:w-8"/>
            </div>
            員工代墊款總覽
          </h1>
          <p className="text-stone-500 mt-2 ml-1 text-sm md:text-base flex items-center gap-2">
            <span className="font-bold text-stone-700">{displayName}</span>
             <span className="text-stone-300">|</span>
             <span className="text-stone-500">Employee Reimbursement</span>
          </p>
        </div>

        {/* 新增申請按鈕 */}
        <PermissionGuard permission="expense.create">
          <Link
            to={`${BASE_PATH}/apply`}
            className="w-full md:w-auto bg-gradient-to-r from-amber-500 to-red-500 text-white px-6 py-2.5 rounded-xl hover:from-amber-600 hover:to-red-600 font-medium shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            新增申請
          </Link>
        </PermissionGuard>
      </div>

      {/* ================= Tabs (分頁籤) ================= */}
      {viewMode && (
        <div className="flex gap-6 border-b border-stone-200 mb-6 overflow-x-auto">
          <button
            onClick={() => { setViewMode('todo'); setSelectedIds(new Set()); }}
            className={`pb-3 px-1 text-sm font-bold transition-all flex items-center gap-2 relative whitespace-nowrap ${
              viewMode === 'todo'
                ? 'text-amber-600 border-b-2 border-amber-600'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <CheckSquare size={18} />
            待我簽核
            {todoCount > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
                {todoCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setViewMode('all'); setSelectedIds(new Set()); }}
            className={`pb-3 px-1 text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              viewMode === 'all'
                ? 'text-stone-800 border-b-2 border-stone-800'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <ListFilter size={18} />
            歷史紀錄
          </button>
        </div>
      )}

      {/* 批量操作工具列 */}
      {selectedIds.size > 0 && viewMode === 'todo' && (
        <div className="sticky top-20 z-30 bg-white border border-amber-100 p-3 rounded-xl mb-6 flex justify-between items-center animate-in slide-in-from-top-2 shadow-lg shadow-amber-500/5">
          <span className="font-bold text-stone-700 flex items-center gap-2 px-2">
            <CheckSquare className="text-amber-500" /> 已選取 {selectedIds.size} 筆
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBatchReject}
              disabled={batchProcessing}
              className="bg-white text-stone-600 border border-stone-200 px-4 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {batchProcessing ? <Loader2 className="animate-spin" size={16} /> : <ThumbsDown size={16} />}
              批量駁回
            </button>
            <button
              onClick={handleBatchApprove}
              disabled={batchProcessing}
              className="bg-gradient-to-r from-amber-500 to-red-500 text-white px-4 py-2 rounded-lg shadow-md shadow-amber-500/20 hover:from-amber-600 hover:to-red-600 text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
            >
              {batchProcessing ? <Loader2 className="animate-spin" size={16} /> : <ThumbsUp size={16} />}
              批量核准
            </button>
          </div>
        </div>
      )}

      {/* ================= 列表區域 ================= */}
      {(loading || !viewMode) ? (
        <div className="bg-white/50 backdrop-blur rounded-2xl border border-stone-200 p-12 text-center text-stone-400 flex flex-col items-center min-h-[400px] justify-center">
          <Loader2 className="animate-spin mb-3 text-amber-500" size={32} />
          <p>資料載入中...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white/50 backdrop-blur rounded-2xl border border-stone-200 p-12 text-center text-stone-400 flex flex-col items-center min-h-[400px] justify-center">
          <div className="bg-stone-100 p-4 rounded-full mb-3 text-stone-300">
             {viewMode === 'todo' ? <CheckSquare size={32}/> : <ListFilter size={32}/>}
          </div>
          <p>{viewMode === 'todo' ? '目前沒有待辦事項，去喝杯咖啡吧！' : '尚無資料'}</p>
        </div>
      ) : (
        <>
          {/* -------------------------------------------------------- */}
          {/* 📱 手機版視圖 (Mobile Cards) */}
          {/* -------------------------------------------------------- */}
          <div className="block md:hidden space-y-4">
            {filteredRequests.map((req) => {
              const status = STATUS_MAP[req.status] || STATUS_MAP['draft'];
              const brandTotals = req.brand_totals ? JSON.parse(req.brand_totals) : {};

              return (
                <div key={req.id} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                  {/* 手機版勾選框 */}
                  {viewMode === 'todo' && (
                    <div className="absolute top-4 left-4 z-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(req.id)}
                        onChange={() => handleSelect(req.id)}
                        className="w-5 h-5 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                  )}
                  <Link to={`${BASE_PATH}/request/${req.id}`} className={`block ${viewMode === 'todo' ? 'pl-8' : ''}`}>
                      {/* 卡片頂部 */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                            <span className="text-xs font-mono text-stone-400 block">{req.request_number}</span>
                            <span className="text-xs text-stone-400 mt-0.5 block">{req.application_date}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                            {status.label}
                        </span>
                      </div>

                      {/* 卡片中間 */}
                      <div className="mb-4">
                        <h3 className="font-bold text-stone-800 text-lg mb-1 flex items-center gap-2">
                            <User size={16} className="text-stone-400" />
                            {req.applicant?.name}
                        </h3>
                        <div className="text-sm text-stone-600 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <Building size={14} className="text-stone-400 shrink-0" />
                              <span className="truncate">{req.department?.name || '未指定部門'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <Receipt size={14} className="text-stone-400 shrink-0" />
                              <span className="truncate text-stone-500">{req.total_receipt_count} 張收據</span>
                            </div>
                        </div>
                      </div>

                      {/* 品牌分別金額 */}
                      {Object.keys(brandTotals).length > 0 && (
                        <div className="mb-3 flex gap-2 flex-wrap">
                          {brandTotals['六扇門'] > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-200">
                              六扇門: ${brandTotals['六扇門'].toLocaleString()}
                            </span>
                          )}
                          {brandTotals['粥大福'] > 0 && (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded-full border border-green-200">
                              粥大福: ${brandTotals['粥大福'].toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      {/* 卡片底部 */}
                      <div className="flex justify-between items-end border-t border-stone-100 pt-3">
                        <div>
                            <p className="text-xs text-stone-400 mb-0.5">總金額</p>
                            <p className="text-xl font-bold text-amber-600 font-mono">
                              ${parseFloat(req.total_amount || 0).toLocaleString()}
                            </p>
                        </div>

                        <div className="text-stone-300 group-hover:text-amber-500 transition-colors">
                            <ChevronRight size={20} />
                        </div>
                      </div>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* -------------------------------------------------------- */}
          {/* 💻 電腦版視圖 (Desktop Table) */}
          {/* -------------------------------------------------------- */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                  {/* 全選 Checkbox */}
                  {viewMode === 'todo' && (
                    <th className="p-4 w-10 text-center">
                      <input
                        type="checkbox"
                        onChange={handleSelectAll}
                        checked={selectedIds.size > 0 && selectedIds.size === filteredRequests.length}
                        className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                      />
                    </th>
                  )}
                  <th className="p-4 w-36">申請單號</th>
                  <th className="p-4 w-28">申請日期</th>
                  <th className="p-4 w-28">申請人</th>
                  <th className="p-4 w-32">部門</th>
                  <th className="p-4 w-44">品牌分別</th>
                  <th className="p-4 text-right w-32">總金額</th>
                  <th className="p-4 text-center w-24">收據</th>
                  <th className="p-4 text-center w-32">狀態</th>
                  <th className="p-4 text-center w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRequests.map((req) => {
                  const statusInfo = STATUS_MAP[req.status] || STATUS_MAP['draft'];
                  const brandTotals = req.brand_totals ? JSON.parse(req.brand_totals) : {};

                  return (
                    <tr key={req.id} className="hover:bg-stone-50 transition-colors group">
                      {/* 單選 Checkbox */}
                      {viewMode === 'todo' && (
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(req.id)}
                            onChange={() => handleSelect(req.id)}
                            className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                          />
                        </td>
                      )}
                      <td className="p-4">
                        <span className="font-mono font-bold text-stone-600 text-sm">{req.request_number}</span>
                      </td>
                      <td className="p-4 text-sm text-stone-600">
                        {req.application_date}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-stone-700 text-sm">{req.applicant?.name}</div>
                        <div className="text-xs text-stone-400">{req.applicant?.employee_id}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-stone-600">{req.department?.name || '未指定'}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1 flex-wrap">
                          {brandTotals['六扇門'] > 0 && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                              六: ${brandTotals['六扇門'].toLocaleString()}
                            </span>
                          )}
                          {brandTotals['粥大福'] > 0 && (
                            <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-200">
                              粥: ${brandTotals['粥大福'].toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono font-bold text-amber-600">
                          ${parseFloat(req.total_amount || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm text-stone-600">{req.total_receipt_count} 張</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {/* 進度條 */}
                        {statusInfo.step > 0 && statusInfo.step < 3 && (
                          <div className="mt-1 w-full bg-stone-200 rounded-full h-1 max-w-[80px] mx-auto opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className="bg-amber-400 h-1 rounded-full" style={{ width: `${(statusInfo.step / 3) * 100}%` }}></div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Link
                          to={`${BASE_PATH}/request/${req.id}`}
                          className="text-stone-300 hover:text-amber-600 transition-colors p-2"
                          title="查看詳情"
                        >
                          <ArrowRight size={20} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="mt-6 text-center text-xs text-stone-400 font-medium">
        總計 {filteredRequests.length} 筆資料
      </div>
    </div>
  );
}
