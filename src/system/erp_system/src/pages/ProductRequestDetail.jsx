import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle, XCircle, User, Calendar, Building2,
  Package, Loader2, MessageSquare, Check, X
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useProductRequests } from '../hooks/useProductRequests';
import { usePermission } from '../../../../hooks/usePermission';

// 狀態配置
const STATUS_CONFIG = {
  pending_purchasing: { label: '待採購單位', color: 'amber', stage: 'purchasing' },
  pending_dept_manager: { label: '待部門主管', color: 'blue', stage: 'dept_manager' },
  pending_review: { label: '待審核', color: 'purple', stage: 'review' },
  pending_create: { label: '待品號建立', color: 'indigo', stage: 'create' },
  completed: { label: '已完成', color: 'green', stage: null },
  rejected: { label: '已退回', color: 'red', stage: null },
};

// 申請類型
const REQUEST_TYPE_CONFIG = {
  new: { label: '新增', color: 'green' },
  change: { label: '變更', color: 'amber' },
  disable: { label: '停用', color: 'red' },
};

// 公司別
const COMPANY_NAMES = {
  '6owl': '六扇門',
  dafu: '大福',
  daka: '大咖',
  haoka: '好咖',
  yuteng: '昱騰',
  lianju: '聯聚',
};

export default function ProductRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { approveRequest } = useProductRequests();

  const { hasPermission: canApprovePurchasing } = usePermission('erp.product_request.approve.purchasing');
  const { hasPermission: canApproveDeptManager } = usePermission('erp.product_request.approve.dept_manager');
  const { hasPermission: canApproveReview } = usePermission('erp.product_request.approve.review');
  const { hasPermission: canApproveCreate } = usePermission('erp.product_request.approve.create');

  const [request, setRequest] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // 載入申請單
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);

        // 取得申請單
        const { data: reqData, error: reqError } = await supabase
          .from('erp_product_requests')
          .select(`
            *,
            items:erp_product_request_items(*),
            applicant:employees!erp_product_requests_applicant_id_fkey(
              id, employee_id, name
            )
          `)
          .eq('id', id)
          .single();

        if (reqError) throw reqError;
        setRequest(reqData);

        // 取得簽核記錄
        const { data: approvalData } = await supabase
          .from('erp_product_request_approvals')
          .select(`
            *,
            approver:employees!erp_product_request_approvals_approver_id_fkey(
              id, employee_id, name
            )
          `)
          .eq('request_id', id)
          .order('created_at');

        setApprovals(approvalData || []);
      } catch (err) {
        console.error('Error fetching request:', err);
        alert('載入失敗: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRequest();
  }, [id]);

  // 判斷是否可以簽核
  const canApprove = () => {
    if (!request) return false;
    const stage = STATUS_CONFIG[request.status]?.stage;
    if (!stage) return false;

    if (stage === 'purchasing' && canApprovePurchasing) return true;
    if (stage === 'dept_manager' && canApproveDeptManager) return true;
    if (stage === 'review' && canApproveReview) return true;
    if (stage === 'create' && canApproveCreate) return true;

    return false;
  };

  // 核准
  const handleApprove = async () => {
    if (!canApprove()) return;
    if (!confirm('確定要核准此申請單嗎？')) return;

    setProcessing(true);
    try {
      const stage = STATUS_CONFIG[request.status]?.stage;
      const result = await approveRequest(request.id, stage, 'approve');

      if (result.success) {
        alert('核准成功！');
        navigate('/systems/erp');
      } else {
        alert('核准失敗: ' + result.error);
      }
    } finally {
      setProcessing(false);
    }
  };

  // 退回
  const handleReject = async () => {
    if (!rejectReason.trim()) {
      alert('請填寫退回原因');
      return;
    }

    setProcessing(true);
    try {
      const stage = STATUS_CONFIG[request.status]?.stage;
      const result = await approveRequest(request.id, stage, 'reject', rejectReason);

      if (result.success) {
        alert('已退回申請單');
        navigate('/systems/erp');
      } else {
        alert('退回失敗: ' + result.error);
      }
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-stone-500">找不到此申請單</p>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[request.status] || {};
  const typeConfig = REQUEST_TYPE_CONFIG[request.request_type] || {};

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <button
        onClick={() => navigate('/systems/erp')}
        className="flex items-center gap-2 text-stone-600 hover:text-red-600 transition"
      >
        <ArrowLeft size={20} />
        返回列表
      </button>

      {/* 標題區 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-stone-800">
                {request.request_number}
              </h1>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}
              >
                {typeConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-stone-500">
              <span className="flex items-center gap-1">
                <User size={14} />
                {request.applicant?.name || '未知'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar size={14} />
                {new Date(request.request_date).toLocaleDateString('zh-TW')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-xl bg-${statusConfig.color}-100 text-${statusConfig.color}-700 font-semibold flex items-center gap-2`}
            >
              {request.status === 'completed' ? (
                <CheckCircle size={18} />
              ) : request.status === 'rejected' ? (
                <XCircle size={18} />
              ) : (
                <Clock size={18} />
              )}
              {statusConfig.label}
            </div>
          </div>
        </div>
      </div>

      {/* 公司別 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
          <Building2 size={16} />
          公司別
        </h3>
        <div className="flex flex-wrap gap-2">
          {(request.companies || []).map((code) => (
            <span
              key={code}
              className="px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-sm"
            >
              {COMPANY_NAMES[code] || code}
            </span>
          ))}
        </div>
      </div>

      {/* 品項明細 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-stone-200">
          <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
            <Package size={16} />
            品項明細 ({request.items?.length || 0} 項)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">
                  品號
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">
                  品名
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">
                  規格
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">
                  採購單位
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600">
                  廠商
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {(request.items || []).map((item, index) => (
                <tr key={item.id || index} className="hover:bg-stone-50">
                  <td className="px-4 py-3 text-sm font-mono text-stone-700">
                    {item.product_code || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-800 font-medium">
                    {item.product_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {item.specification || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {item.unit || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-600">
                    {item.supplier_name || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 簽核記錄 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <MessageSquare size={16} />
          簽核記錄
        </h3>

        {approvals.length === 0 ? (
          <p className="text-stone-400 text-sm">尚無簽核記錄</p>
        ) : (
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className={`p-3 rounded-lg ${
                  approval.action === 'approve' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {approval.action === 'approve' ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <XCircle size={16} className="text-red-600" />
                  )}
                  <span className="font-semibold text-stone-800">
                    {approval.approver?.name || '未知'}
                  </span>
                  <span className="text-sm text-stone-500">
                    {approval.action === 'approve' ? '核准' : '退回'}
                  </span>
                  <span className="text-xs text-stone-400 ml-auto">
                    {new Date(approval.created_at).toLocaleString('zh-TW')}
                  </span>
                </div>
                {approval.comments && (
                  <p className="mt-2 text-sm text-stone-600 pl-6">
                    {approval.comments}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 退回原因 */}
        {request.status === 'rejected' && request.rejection_reason && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-semibold text-red-700">退回原因</p>
            <p className="text-sm text-red-600 mt-1">{request.rejection_reason}</p>
          </div>
        )}
      </div>

      {/* 簽核按鈕 */}
      {canApprove() && (
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
              className="px-6 py-2.5 border border-red-300 text-red-600 rounded-xl hover:bg-red-50 transition flex items-center gap-2"
            >
              <X size={18} />
              退回
            </button>
            <button
              onClick={handleApprove}
              disabled={processing}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={18} />
              {processing ? '處理中...' : '核准'}
            </button>
          </div>
        </div>
      )}

      {/* 退回 Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-bold text-stone-800 mb-4">退回申請單</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="請填寫退回原因..."
              rows={4}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition"
              >
                取消
              </button>
              <button
                onClick={handleReject}
                disabled={processing}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
              >
                {processing ? '處理中...' : '確定退回'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
