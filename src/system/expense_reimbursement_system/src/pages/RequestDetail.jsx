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
  ThumbsDown,
  Edit2,
  SkipForward,
  Paperclip,
  Image as ImageIcon,
  ExternalLink,
  Download  // [新增] 匯出圖示
} from 'lucide-react';
import ExportModal from '../components/ExportModal'; // [新增] 匯出 Modal

const BASE_PATH = '/systems/expense-reimbursement';

// --- 狀態與文字對照表 ---
const STATUS_LABELS = {
  'draft': '草稿',
  'pending_ceo': '待總經理簽核',
  'pending_boss_preliminary': '待放行主管初審',
  'pending_audit_manager': '待審核主管簽核',
  'pending_cashier': '待出納簽核',
  'pending_boss': '待放行主管決行',
  'approved': '已核准',
  'rejected': '已駁回',
  'cancelled': '已取消'
};

// --- 簽核流程配置 ---
// 新流程：
// 高金額 (≥30000): pending_ceo → pending_audit_manager → pending_cashier → pending_boss → approved
// 低金額 (<30000): pending_boss_preliminary（確認內容）→ pending_audit_manager → pending_cashier → pending_boss（確認出帳）→ approved
const WORKFLOW_CONFIG = {
  'pending_ceo': {
    label: '總經理',
    nextStatus: 'pending_audit_manager',
    permission: 'expense.approve.ceo'
  },
  'pending_boss_preliminary': {
    label: '放行主管（確認內容）',
    nextStatus: 'pending_audit_manager',
    permission: 'expense.approve.boss_preliminary'
  },
  'pending_audit_manager': {
    label: '審核主管',
    nextStatus: 'pending_cashier',
    permission: 'expense.approve.audit_manager'
  },
  'pending_cashier': {
    label: '出納',
    nextStatus: 'pending_boss',
    permission: 'expense.approve.cashier'
  },
  'pending_boss': {
    label: '放行主管（確認出帳）',
    nextStatus: 'approved',
    permission: 'expense.approve.boss'
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
  const { hasPermission: canApproveBossPreliminary } = usePermission('expense.approve.boss_preliminary');
  const { hasPermission: canApproveAudit } = usePermission('expense.approve.audit_manager');
  const { hasPermission: canApproveCashier } = usePermission('expense.approve.cashier');
  const { hasPermission: canApproveBoss } = usePermission('expense.approve.boss');
  const { hasPermission: canEdit } = usePermission('expense.edit.own');
  const { hasPermission: canDelete } = usePermission('expense.delete.own');
  const { hasPermission: canCancel } = usePermission('expense.cancel');
  const { hasPermission: canPrint } = usePermission('expense.print');
  const { hasPermission: canCreate } = usePermission('expense.create');
  const { hasPermission: canExport } = usePermission('expense.export'); // [新增] 匯出權限

  // [新增] 匯出 Modal State
  const [showExportModal, setShowExportModal] = useState(false);

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

  // 駁回後編輯
  const handleEdit = () => {
    navigate(`${BASE_PATH}/apply/${id}`);
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
    (request.status === 'pending_boss_preliminary' && canApproveBossPreliminary) ||
    (request.status === 'pending_audit_manager' && canApproveAudit) ||
    (request.status === 'pending_cashier' && canApproveCashier) ||
    (request.status === 'pending_boss' && canApproveBoss)
  );

  // 是否為申請人本人
  const isOwner = request.applicant_id === user?.id;

  // 是否可以編輯（草稿狀態 + 本人 + 有編輯權限）
  const canEditRequest = request.status === 'draft' && isOwner && canEdit;

  // 是否可以取消（草稿狀態 + 本人）
  const canCancelRequest = request.status === 'draft' && isOwner;

  // 是否可以重新編輯駁回的申請（駁回 + 本人 + 有建立權限）
  const canEditRejected = request.status === 'rejected' && isOwner && canCreate;

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

          <div className="flex items-center gap-2">
            {/* 匯出媒體檔按鈕 (需要 expense.export 權限) */}
            {canExport && (
              <button
                onClick={() => setShowExportModal(true)}
                className="no-print bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold shadow-sm"
              >
                <Download size={16} /> 匯出媒體檔
              </button>
            )}
            {canPrint && (
              <button
                onClick={handlePrint}
                className="no-print bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-gray-800 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold"
              >
                <Printer size={16} /> 列印 / PDF
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden print-container">
          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:p-0">

            {/* 左側：詳細資訊 */}
            <div className="lg:col-span-2 space-y-8 print-full-width print:space-y-4">

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

            </section>

            {/* 四、撥款資訊 */}
            <section className="print-section">
              <SectionHeader icon={CreditCard} title="四、撥款資訊" />
              <div className="grid grid-cols-2 gap-4 print-grid-4">
                <InfoField
                  label="撥款方式"
                  value="匯款（次月12日）"
                />
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
              </div>
            </section>

            {/* 五、附件 */}
            {request.has_attachment && request.attachments && request.attachments.length > 0 && (
              <section className="print-section">
                <SectionHeader icon={Paperclip} title="五、附件" />
                <div className="space-y-3">
                  {/* 附件說明 */}
                  {request.attachment_desc && (
                    <div className="text-sm text-stone-600 bg-stone-50 rounded-lg px-4 py-2">
                      📝 {request.attachment_desc}
                    </div>
                  )}

                  {/* 附件列表 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {request.attachments.map((attachment, idx) => {
                      const isImage = attachment.type?.startsWith('image/');
                      return (
                        <a
                          key={idx}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 hover:bg-blue-100 hover:border-blue-200 transition-colors group"
                        >
                          <div className="bg-blue-200 p-2 rounded-lg text-blue-700 group-hover:bg-blue-300">
                            {isImage ? <ImageIcon size={20} /> : <FileText size={20} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-blue-800 truncate">
                              {attachment.name || `附件 ${idx + 1}`}
                            </p>
                            <p className="text-xs text-blue-500">
                              {isImage ? '圖片' : 'PDF 文件'}
                            </p>
                          </div>
                          <ExternalLink size={16} className="text-blue-400 group-hover:text-blue-600" />
                        </a>
                      );
                    })}
                  </div>
                </div>
              </section>
            )}

            </div>

            {/* 右側：簽核操作區 */}
            <div className="lg:col-span-1 no-print">
              <div className="sticky top-24 space-y-6">

                {/* 簽核進度 */}
                <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-amber-600" /> 簽核進度
                  </h3>
                  <div className="space-y-4">
                    {(() => {
                      // 判斷流程類型：
                      // 高金額 (≥30000): CEO → 審核主管 → 出納 → 放行主管決行
                      // 低金額 (<30000): 放行主管初審（確認內容）→ 審核主管 → 出納 → 放行主管決行（確認出帳）
                      const isHighAmount = parseFloat(request.total_amount) >= 30000;
                      const steps = isHighAmount
                        ? [
                            { key: 'ceo', label: '總經理', statusKey: 'pending_ceo' },
                            { key: 'audit_manager', label: '審核主管', statusKey: 'pending_audit_manager' },
                            { key: 'cashier', label: '出納', statusKey: 'pending_cashier' },
                            { key: 'boss', label: '放行主管（決行）', statusKey: 'pending_boss' }
                          ]
                        : [
                            { key: 'boss_preliminary', label: '放行主管（確認內容）', statusKey: 'pending_boss_preliminary' },
                            { key: 'audit_manager', label: '審核主管', statusKey: 'pending_audit_manager' },
                            { key: 'cashier', label: '出納', statusKey: 'pending_cashier' },
                            { key: 'boss', label: '放行主管（確認出帳）', statusKey: 'pending_boss' }
                          ];

                      return steps.map((step, idx) => {
                        // 從 approvals 找該關卡的簽核紀錄
                        const approval = approvals.find(a => a.approval_type === step.key);
                        const isCompleted = approval?.status === 'approved';
                        const isRejected = approval?.status === 'rejected';
                        const isCurrent = request.status === step.statusKey && !isRejected;

                        return (
                          <div
                            key={step.key}
                            className={`relative pl-6 pb-4 border-l-2 ${
                              isCompleted ? 'border-amber-500' :
                              isRejected ? 'border-red-500' :
                              'border-stone-200'
                            } last:border-0`}
                          >
                            <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${
                              isCompleted ? 'bg-amber-500 border-amber-500' :
                              isRejected ? 'bg-red-500 border-red-500' :
                              isCurrent ? 'bg-amber-500 border-amber-500 animate-pulse' :
                              'bg-white border-gray-300'
                            }`}></div>
                            <div className="flex justify-between items-start">
                              <div>
                                <div className={`text-sm font-bold ${
                                  isCurrent ? 'text-amber-600' :
                                  isRejected ? 'text-red-600' :
                                  'text-gray-700'
                                }`}>
                                  {step.label}
                                </div>
                                {approval?.approved_at && (
                                  <div className="text-[10px] text-stone-400">
                                    {new Date(approval.approved_at).toLocaleString()}
                                  </div>
                                )}
                                {approval?.approver?.name && (
                                  <div className="text-[10px] text-stone-500">
                                    {approval.approver.name}
                                  </div>
                                )}
                              </div>
                              {isCompleted && <CheckCircle size={16} className="text-amber-500" />}
                              {isRejected && <XCircle size={16} className="text-red-500" />}
                            </div>
                          </div>
                        );
                      });
                    })()}

                    {/* 完成狀態 */}
                    {request.status === 'approved' && (
                      <div className="relative pl-6 pb-0">
                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-500"></div>
                        <div className="text-sm font-bold text-emerald-600">已核准完成</div>
                        {request.completed_at && (
                          <div className="text-[10px] text-stone-400">
                            {new Date(request.completed_at).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 簽核按鈕區 */}
                {request.status === 'rejected' ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                    <h4 className="text-red-800 font-bold mb-1">案件已駁回</h4>
                    {approvals.find(a => a.status === 'rejected') && (
                      <p className="text-red-600 text-sm mb-3">
                        {approvals.find(a => a.status === 'rejected')?.comment}
                      </p>
                    )}
                    {canEditRejected && (
                      <button
                        onClick={handleEdit}
                        className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <Edit2 size={16} /> 修改並重新送出
                      </button>
                    )}
                  </div>
                ) : request.status === 'cancelled' ? (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                    <h4 className="text-gray-600 font-bold mb-1">案件已取消</h4>
                  </div>
                ) : request.status === 'approved' ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <h4 className="text-green-800 font-bold">已核准</h4>
                    <p className="text-green-600 text-sm">申請已完成簽核流程</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 草稿操作 */}
                    {canEditRequest && (
                      <div className="p-4 bg-white border border-stone-200 rounded-lg shadow-sm">
                        <h4 className="font-bold text-gray-700 mb-2">草稿操作</h4>
                        <button
                          onClick={() => navigate(`${BASE_PATH}/apply/${id}`)}
                          className="w-full py-2.5 px-4 bg-amber-600 text-white hover:bg-amber-700 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm mb-2"
                        >
                          <Edit2 size={18} /> 繼續編輯
                        </button>
                        {canCancelRequest && (
                          <button
                            onClick={handleCancel}
                            disabled={processing}
                            className="w-full py-2 px-4 bg-white border border-stone-300 text-stone-600 hover:bg-stone-50 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            {processing ? <Loader2 className="animate-spin" size={16} /> : <XCircle size={16} />}
                            取消申請
                          </button>
                        )}
                      </div>
                    )}

                    {/* 簽核操作 */}
                    {canApprove ? (
                      <div className="bg-white border-2 border-amber-100 rounded-xl p-5 shadow-xl shadow-amber-500/5">
                        <div className="mb-4 text-center">
                          <div className="text-amber-800 font-bold text-lg">等待您的簽核</div>
                          <div className="text-sm text-amber-600">({currentConfig?.label})</div>
                        </div>
                        <button
                          onClick={handleApprove}
                          disabled={processing}
                          className="w-full py-3 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-lg hover:from-amber-600 hover:to-red-600 font-bold flex items-center justify-center gap-2 shadow-md mb-3"
                        >
                          {processing ? <Loader2 className="animate-spin" size={18} /> : <ThumbsUp size={18} />}
                          確認核准
                        </button>
                        <button
                          onClick={handleReject}
                          disabled={processing}
                          className="w-full py-2 text-red-500 hover:bg-red-50 border border-red-200 rounded text-sm font-medium"
                        >
                          駁回此案件
                        </button>
                      </div>
                    ) : !canEditRequest && currentConfig && (
                      <div className="p-4 bg-stone-50 border border-stone-200 text-stone-400 rounded text-center text-sm flex flex-col items-center">
                        <Loader2 className="animate-spin mb-1" size={16} />
                        等待 <span className="font-bold">{currentConfig.label}</span> 簽核...
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 列印專用簽核表格 */}
            <div className="hidden print:block print-full-width mt-4 lg:col-span-3">
              <div className="text-[12pt] font-bold mb-1 border-t border-black pt-2">簽核紀錄</div>
              <table className="w-full border-collapse border border-black">
                <thead>
                  <tr>
                    <th className="border border-black p-2 text-[10pt] bg-gray-100">關卡</th>
                    <th className="border border-black p-2 text-[10pt] bg-gray-100">簽核人</th>
                    <th className="border border-black p-2 text-[10pt] bg-gray-100">狀態</th>
                    <th className="border border-black p-2 text-[10pt] bg-gray-100">時間</th>
                    <th className="border border-black p-2 text-[10pt] bg-gray-100">意見</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((approval) => (
                    <tr key={approval.id}>
                      <td className="border border-black p-2 text-[10pt] text-center">
                        {approval.approval_type === 'ceo' ? '總經理' :
                         approval.approval_type === 'boss_preliminary' ? '放行主管（確認內容）' :
                         approval.approval_type === 'audit_manager' ? '審核主管' :
                         approval.approval_type === 'cashier' ? '出納' :
                         approval.approval_type === 'boss' ? '放行主管（確認出帳）' :
                         approval.approval_type}
                      </td>
                      <td className="border border-black p-2 text-[10pt] text-center">
                        {approval.approver?.name || '--'}
                      </td>
                      <td className="border border-black p-2 text-[10pt] text-center">
                        {approval.status === 'approved' ? '已核准' : '已駁回'}
                      </td>
                      <td className="border border-black p-2 text-[10pt] text-center">
                        {approval.approved_at ? new Date(approval.approved_at).toLocaleString() : '--'}
                      </td>
                      <td className="border border-black p-2 text-[10pt]">
                        {approval.comment || '--'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>

      {/* 匯出媒體檔 Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        requests={request ? [{
          ...request,
          applicant_name: request.applicant?.name,
          bank_code: request.bank_code,
          branch_code: request.branch_code,
          account_number: request.account_number,
          payee_name: request.applicant?.name
        }] : []}
        systemType="expense"
      />
    </div>
  );
}
