import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { usePermission } from '../../../../hooks/usePermission';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Loader2,
  Building,
  FileText,
  CreditCard,
  MessageSquare,
  Printer,
  User,
  Receipt,
  DollarSign,
  Calendar,
  Banknote,
  AlertCircle,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';

const BASE_PATH = '/systems/expense-reimbursement';

// --- 狀態與文字對照表 ---
const STATUS_LABELS = {
  'draft': '草稿',
  'pending_ceo': '待總經理簽核',
  'pending_boss': '待放行主管簽核',
  'pending_audit_manager': '待審核主管簽核',
  'approved': '已核准',
  'rejected': '已駁回',
  'cancelled': '已取消'
};

// --- 簽核流程配置 ---
const WORKFLOW_CONFIG = {
  'pending_ceo': {
    label: '總經理',
    nextStatus: 'pending_audit_manager',
    permission: 'expense.approve.ceo'
  },
  'pending_boss': {
    label: '放行主管',
    nextStatus: 'pending_audit_manager',
    permission: 'expense.approve.boss'
  },
  'pending_audit_manager': {
    label: '審核主管',
    nextStatus: 'approved',
    permission: 'expense.approve.audit_manager'
  }
};

// --- Helper Components ---

const InfoField = ({ label, value, subValue, highlight, className = "" }) => (
  <div className={`mb-4 print:mb-2 ${className}`}>
    <label className="block text-xs text-stone-400 uppercase tracking-wider print:text-black print:font-bold print:mb-0 print:text-[9pt]">
      {label}
    </label>
    <div className={`font-medium text-gray-900 ${highlight
        ? 'text-lg font-bold text-amber-700 print:text-black print:font-bold'
        : ''
      } print:text-[10pt] print:leading-tight`}
    >
      {value || '--'}
    </div>
    {subValue && (
      <div className="text-xs text-stone-400 mt-0.5 print:text-[9pt] print:text-gray-600">
        {subValue}
      </div>
    )}
  </div>
);

const SectionHeader = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200 text-stone-700 font-bold print:mb-2 print:pb-1 print:text-black print:border-black print:text-[12pt]">
    <Icon size={18} className="text-amber-600 print:hidden" />
    <h3>{title}</h3>
  </div>
);

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState(null);
  const [items, setItems] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // RBAC 權限檢查
  const { hasPermission: canApproveCEO } = usePermission('expense.approve.ceo');
  const { hasPermission: canApproveBoss } = usePermission('expense.approve.boss');
  const { hasPermission: canApproveAudit } = usePermission('expense.approve.audit_manager');
  const { hasPermission: canEdit } = usePermission('expense.edit.own');
  const { hasPermission: canDelete } = usePermission('expense.delete.own');
  const { hasPermission: canCancel } = usePermission('expense.cancel');

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

  useEffect(() => {
    fetchRequestDetail();

    // Realtime subscription
    const subscription = supabase
      .channel('expense-request-detail')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'expense_reimbursement_requests',
        filter: `id=eq.${id}`
      }, (payload) => setRequest(prev => ({ ...prev, ...payload.new })))
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [id]);

  const fetchRequestDetail = async () => {
    try {
      setLoading(true);

      // 載入主申請資料
      const { data: requestData, error: requestError } = await supabase
        .from('expense_reimbursement_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (requestError) throw requestError;

      // 載入申請人資訊
      let applicantData = null;
      if (requestData.applicant_id) {
        const { data } = await supabase
          .from('employees')
          .select('user_id, name, employee_id')
          .eq('user_id', requestData.applicant_id)
          .single();
        applicantData = data;
      }

      // 載入部門資訊
      let departmentData = null;
      if (requestData.department_id) {
        const { data } = await supabase
          .from('departments')
          .select('id, name')
          .eq('id', requestData.department_id)
          .single();
        departmentData = data;
      }

      // 載入明細
      const { data: itemsData, error: itemsError } = await supabase
        .from('expense_reimbursement_items')
        .select('*')
        .eq('request_id', id)
        .order('line_number', { ascending: true });

      if (itemsError) throw itemsError;

      // 載入簽核紀錄
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('expense_approvals')
        .select('*')
        .eq('request_id', id)
        .order('approval_order', { ascending: true });

      if (approvalsError) throw approvalsError;

      // 如果有簽核紀錄，載入簽核人資訊
      let enrichedApprovals = approvalsData || [];
      if (approvalsData && approvalsData.length > 0) {
        const approverIds = [...new Set(approvalsData.map(a => a.approver_id))];
        const { data: approversData } = await supabase
          .from('employees')
          .select('user_id, name')
          .in('user_id', approverIds);

        enrichedApprovals = approvalsData.map(approval => ({
          ...approval,
          approver: approversData?.find(e => e.user_id === approval.approver_id) || null,
        }));
      }

      setRequest({
        ...requestData,
        applicant: applicantData,
        department: departmentData,
      });
      setItems(itemsData || []);
      setApprovals(enrichedApprovals);
    } catch (err) {
      console.error(err);
      alert('載入失敗: ' + err.message);
      navigate(`${BASE_PATH}/dashboard`);
    } finally {
      setLoading(false);
    }
  };

  // --- 簽核邏輯 ---
  const handleApprove = async () => {
    setProcessing(true);
    try {
      const config = WORKFLOW_CONFIG[request.status];
      if (!config) throw new Error("無效的簽核狀態");

      // 🔒 防止重複簽核：檢查當前用戶是否已經簽核過這個申請
      const existingApproval = approvals.find(
        approval => approval.approver_id === user.id && approval.status === 'approved'
      );

      if (existingApproval) {
        alert('⚠️ 您已經簽核過此申請，不能重複簽核。');
        setProcessing(false);
        return;
      }

      const comment = prompt(`${config.label}簽核\n\n請輸入簽核意見（選填）：`);
      if (comment === null) {
        setProcessing(false);
        return; // 使用者取消
      }

      // 記錄簽核（先記錄，確保有簽核紀錄）
      const { error: approvalError } = await supabase
        .from('expense_approvals')
        .insert({
          request_id: id,
          approver_id: user.id,
          approval_type: request.status.replace('pending_', ''),
          approval_order: approvals.length + 1,
          status: 'approved',
          comment: comment || null,
          approved_at: new Date().toISOString()
        });

      if (approvalError) throw approvalError;

      // 更新申請狀態
      const updatePayload = {
        status: config.nextStatus,
        current_approver_id: null
      };

      // 如果已完成所有簽核，設定 completed_at
      if (config.nextStatus === 'approved') {
        updatePayload.completed_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from('expense_reimbursement_requests')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) throw updateError;

      alert(`✅ ${config.label}簽核成功！`);
      await fetchRequestDetail(); // 重新載入資料
    } catch (err) {
      console.error(err);
      alert('簽核失敗: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    // 🔒 防止重複簽核：檢查當前用戶是否已經簽核過這個申請
    const existingApproval = approvals.find(
      approval => approval.approver_id === user.id
    );

    if (existingApproval) {
      alert('⚠️ 您已經處理過此申請，不能重複簽核。');
      return;
    }

    const reason = prompt("請輸入駁回原因：");
    if (!reason?.trim()) return;

    setProcessing(true);
    try {
      const config = WORKFLOW_CONFIG[request.status];

      // 記錄駁回
      const { error: approvalError } = await supabase
        .from('expense_approvals')
        .insert({
          request_id: id,
          approver_id: user.id,
          approval_type: request.status.replace('pending_', ''),
          approval_order: approvals.length + 1,
          status: 'rejected',
          comment: reason,
          approved_at: new Date().toISOString()
        });

      if (approvalError) throw approvalError;

      // 更新申請狀態為駁回
      const { error: updateError } = await supabase
        .from('expense_reimbursement_requests')
        .update({
          status: 'rejected',
          current_approver_id: null,
          completed_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      alert("✅ 申請已駁回。");
      await fetchRequestDetail();
    } catch (err) {
      console.error(err);
      alert("駁回失敗: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm("確定要取消此申請單嗎？")) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('expense_reimbursement_requests')
        .update({
          status: 'cancelled',
          deleted_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      alert("✅ 申請單已取消。");
      await fetchRequestDetail();
    } catch (err) {
      console.error(err);
      alert("取消失敗: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-10 text-center">
        <Loader2 className="animate-spin inline mr-2" />載入中...
      </div>
    );
  }

  if (!request) {
    return (
      <div className="p-10 text-center text-red-500">查無此單據</div>
    );
  }

  const currentConfig = WORKFLOW_CONFIG[request.status];

  // 檢查是否可以審核當前狀態
  const canApprove = currentConfig && (
    (request.status === 'pending_ceo' && canApproveCEO) ||
    (request.status === 'pending_boss' && canApproveBoss) ||
    (request.status === 'pending_audit_manager' && canApproveAudit)
  );

  // 是否為申請人本人
  const isOwner = request.applicant_id === user?.id;

  // 是否可以編輯（草稿狀態 + 本人 + 有編輯權限）
  const canEditRequest = request.status === 'draft' && isOwner && canEdit;

  // 是否可以取消（草稿狀態 + 本人）
  const canCancelRequest = request.status === 'draft' && isOwner;

  // 解析品牌總計
  const brandTotals = request.brand_totals ? JSON.parse(request.brand_totals) : {};

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-20 print:bg-white print:pb-0">

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          html, body { height: 100%; margin: 0 !important; padding: 0 !important; background: white; font-size: 10pt; -webkit-print-color-adjust: exact; }
          .no-print, nav, header, button, .sticky-header { display: none !important; }
          .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
          .print-grid-2 { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .print-grid-4 { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
          .print-col-span-2 { grid-column: span 2 !important; }
          .print-section { margin-bottom: 1rem !important; page-break-inside: avoid; }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* 上方資訊列 */}
      <div className="no-print mb-2 text-xs text-stone-400 text-right">
        登入身分: {displayName} ({user?.email})
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 print-container">

        {/* 頁面標題列 */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => navigate(`${BASE_PATH}/dashboard`)}
            className="text-stone-400 hover:text-gray-800 flex items-center gap-1 no-print"
          >
            <ArrowLeft size={20} /> 返回列表
          </button>

          <div className="flex items-center gap-3">
            <span className="text-stone-400 text-sm font-mono">{request.request_number}</span>
            <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${
              request.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
              request.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' :
              request.status === 'cancelled' ? 'bg-stone-100 text-stone-400 border border-stone-200' :
              'bg-amber-50 text-amber-700 border border-amber-200'
            }`}>
              {request.status === 'approved' ? <CheckCircle size={16} /> :
               request.status === 'rejected' ? <XCircle size={16} /> :
               <Clock size={16} />}
              {STATUS_LABELS[request.status] || request.status}
            </div>
          </div>

          <button
            onClick={handlePrint}
            className="no-print bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-gray-800 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold"
          >
            <Printer size={16} /> 列印 / PDF
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden print-container">
          <div className="p-6 md:p-8 space-y-8 print:block print:p-0 print:space-y-4">

            {/* 一、基本資訊 */}
            <section className="print-section">
              <SectionHeader icon={User} title="一、申請人資訊" />
              <div className="grid grid-cols-2 gap-4 print-grid-4">
                <InfoField label="申請人" value={request.applicant?.name} subValue={request.applicant?.employee_id} />
                <InfoField label="申請部門" value={request.department?.name} />
                <InfoField label="申請日期" value={request.application_date} />
                <InfoField label="送出日期" value={request.submitted_at ? new Date(request.submitted_at).toLocaleDateString() : '--'} />
              </div>
            </section>

            {/* 二、費用明細 */}
            <section className="print-section">
              <SectionHeader icon={FileText} title="二、費用明細" />
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-stone-300">
                  <thead>
                    <tr className="bg-stone-50">
                      <th className="border border-stone-300 px-2 py-2 text-xs text-left w-8">#</th>
                      <th className="border border-stone-300 px-3 py-2 text-xs text-left">品項</th>
                      <th className="border border-stone-300 px-3 py-2 text-xs text-left">內容</th>
                      <th className="border border-stone-300 px-3 py-2 text-xs text-right w-24">金額</th>
                      <th className="border border-stone-300 px-2 py-2 text-xs text-center w-16">收據</th>
                      <th className="border border-stone-300 px-3 py-2 text-xs text-center w-24">費用歸屬</th>
                      <th className="border border-stone-300 px-3 py-2 text-xs text-left">用途說明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-stone-50">
                        <td className="border border-stone-300 px-2 py-2 text-xs text-center">{item.line_number}</td>
                        <td className="border border-stone-300 px-3 py-2 text-sm">{item.category || '--'}</td>
                        <td className="border border-stone-300 px-3 py-2 text-sm">{item.description || '--'}</td>
                        <td className="border border-stone-300 px-3 py-2 text-sm text-right font-mono">
                          ${parseFloat(item.amount).toLocaleString()}
                        </td>
                        <td className="border border-stone-300 px-2 py-2 text-sm text-center">{item.receipt_count}</td>
                        <td className="border border-stone-300 px-3 py-2 text-xs text-center">
                          <span className={`px-2 py-0.5 rounded ${
                            item.cost_allocation === '六扇門' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                          }`}>
                            {item.cost_allocation}
                          </span>
                        </td>
                        <td className="border border-stone-300 px-3 py-2 text-sm text-stone-600">{item.usage_note || '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* 三、結算資訊 */}
            <section className="print-section">
              <SectionHeader icon={Receipt} title="三、結算資訊" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="text-xs text-blue-600 mb-1">六扇門</div>
                  <div className="text-xl font-bold text-blue-700">
                    NT$ {(brandTotals['六扇門'] || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="text-xs text-green-600 mb-1">粥大福</div>
                  <div className="text-xl font-bold text-green-700">
                    NT$ {(brandTotals['粥大福'] || 0).toLocaleString()}
                  </div>
                </div>
                <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-300">
                  <div className="text-xs text-amber-700 mb-1">總金額</div>
                  <div className="text-2xl font-bold text-amber-600">
                    NT$ {parseFloat(request.total_amount).toLocaleString()}
                  </div>
                  <div className="text-xs text-amber-600 mt-1">
                    收據 {request.total_receipt_count} 張
                  </div>
                </div>
              </div>

              {/* 簽核流程說明 */}
              <div className={`mt-4 p-3 rounded-lg border ${
                parseFloat(request.total_amount) >= 30000
                  ? 'bg-purple-50 border-purple-200'
                  : 'bg-blue-50 border-blue-200'
              }`}>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className={`w-4 h-4 ${
                    parseFloat(request.total_amount) >= 30000 ? 'text-purple-600' : 'text-blue-600'
                  }`} />
                  <span className={`font-medium ${
                    parseFloat(request.total_amount) >= 30000 ? 'text-purple-800' : 'text-blue-800'
                  }`}>
                    簽核流程：
                    {parseFloat(request.total_amount) >= 30000
                      ? '總經理 → 審核主管'
                      : '放行主管 → 審核主管'}
                  </span>
                </div>
              </div>
            </section>

            {/* 四、撥款資訊 */}
            <section className="print-section">
              <SectionHeader icon={CreditCard} title="四、撥款資訊" />
              <div className="grid grid-cols-2 gap-4 print-grid-4">
                <InfoField
                  label="撥款方式"
                  value={request.payment_method === 'cash' ? '領現' : '匯款（次月12日）'}
                />
                {request.payment_method === 'transfer' && (
                  <>
                    <div className="col-span-2 print-col-span-4">
                      <div className="bg-stone-50 rounded-lg p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-4 print-grid-4">
                          <InfoField label="銀行名稱" value={request.bank_name} subValue={request.bank_code} />
                          <InfoField label="分行名稱" value={request.branch_name} subValue={request.branch_code} />
                          <div className="col-span-2 print-col-span-4">
                            <InfoField label="帳號" value={request.account_number} highlight />
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </section>

            {/* 五、簽核紀錄 */}
            {approvals.length > 0 && (
              <section className="print-section">
                <SectionHeader icon={MessageSquare} title="五、簽核紀錄" />
                <div className="space-y-3">
                  {approvals.map((approval, index) => (
                    <div
                      key={approval.id}
                      className={`border rounded-lg p-4 ${
                        approval.status === 'approved'
                          ? 'bg-green-50 border-green-200'
                          : approval.status === 'rejected'
                          ? 'bg-red-50 border-red-200'
                          : 'bg-stone-50 border-stone-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            approval.status === 'approved' ? 'bg-green-500 text-white' :
                            approval.status === 'rejected' ? 'bg-red-500 text-white' :
                            'bg-stone-300 text-white'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-semibold text-stone-800">
                            {approval.approval_type === 'ceo' ? '總經理' :
                             approval.approval_type === 'boss' ? '放行主管' :
                             approval.approval_type === 'audit_manager' ? '審核主管' :
                             approval.approval_type}
                          </span>
                          <span className="text-sm text-stone-600">- {approval.approver?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {approval.status === 'approved' ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle size={12} /> 已核准
                            </span>
                          ) : approval.status === 'rejected' ? (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full flex items-center gap-1">
                              <XCircle size={12} /> 已駁回
                            </span>
                          ) : (
                            <span className="text-xs bg-stone-100 text-stone-600 px-2 py-1 rounded-full flex items-center gap-1">
                              <Clock size={12} /> 待簽核
                            </span>
                          )}
                          <span className="text-xs text-stone-400">
                            {approval.approved_at ? new Date(approval.approved_at).toLocaleString() : '--'}
                          </span>
                        </div>
                      </div>
                      {approval.comment && (
                        <div className="mt-2 text-sm text-stone-600 bg-white rounded p-2">
                          {approval.comment}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* 駁回原因顯示 */}
            {request.status === 'rejected' && approvals.find(a => a.status === 'rejected') && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 no-print">
                <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                  <XCircle size={18} />
                  駁回原因
                </div>
                <div className="text-sm text-red-600">
                  {approvals.find(a => a.status === 'rejected')?.comment}
                </div>
              </div>
            )}

            {/* 操作按鈕區 */}
            {canApprove && (
              <div className="flex gap-3 pt-6 border-t border-stone-200 no-print">
                <button
                  onClick={handleReject}
                  disabled={processing}
                  className="flex-1 bg-white border-2 border-red-300 text-red-600 hover:bg-red-50 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin" size={20} /> : <ThumbsDown size={20} />}
                  駁回
                </button>
                <button
                  onClick={handleApprove}
                  disabled={processing}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-red-500 text-white hover:from-amber-600 hover:to-red-600 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin" size={20} /> : <ThumbsUp size={20} />}
                  核准
                </button>
              </div>
            )}

            {/* 草稿狀態的操作按鈕 */}
            {canEditRequest && (
              <div className="flex gap-3 pt-6 border-t border-stone-200 no-print">
                <button
                  onClick={() => navigate(`${BASE_PATH}/apply/${id}`)}
                  className="flex-1 bg-amber-600 text-white hover:bg-amber-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  繼續編輯
                </button>
              </div>
            )}

            {canCancelRequest && (
              <div className="flex gap-3 no-print">
                <button
                  onClick={handleCancel}
                  disabled={processing}
                  className="flex-1 bg-white border border-stone-300 text-stone-600 hover:bg-stone-50 px-6 py-2 rounded-lg font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {processing ? <Loader2 className="animate-spin" size={18} /> : <XCircle size={18} />}
                  取消申請
                </button>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
