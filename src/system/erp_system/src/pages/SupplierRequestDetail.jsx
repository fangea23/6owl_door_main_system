import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Clock, CheckCircle, XCircle, User, Calendar, Building2,
  Phone, Mail, MapPin, CreditCard, Banknote, FileText,
  Loader2, MessageSquare, Check, X
} from 'lucide-react';
import { useSupplierRequests } from '../hooks/useSupplierRequests';
import { usePermission } from '../../../../hooks/usePermission';

// 狀態配置
const STATUS_CONFIG = {
  pending_finance: { label: '待財務審核', color: 'amber', stage: 'finance' },
  pending_accounting: { label: '待會計審核', color: 'blue', stage: 'accounting' },
  pending_creator: { label: '待建檔人員', color: 'purple', stage: 'creator' },
  completed: { label: '已完成', color: 'green', stage: null },
  rejected: { label: '已退回', color: 'red', stage: null },
};

// 申請類型
const REQUEST_TYPE_LABELS = {
  new: '新增供應商',
  change: '變更資訊',
};

// 發票相關
const INVOICE_TYPE_LABELS = {
  with_goods: '貨附發票',
  monthly: '月底彙開發票',
};

const INVOICE_FORMAT_LABELS = {
  electronic: '電子發票',
  triplicate: '三聯式',
  duplicate_pos: '二聯式收銀機',
  triplicate_pos: '三聯式收銀機',
  exempt: '免用統一發票',
};

const TAX_TYPE_LABELS = {
  tax_included: '應稅內含',
  tax_excluded: '應稅外加',
  zero_rate: '零稅率',
  tax_exempt: '免稅',
};

const PAYMENT_DAYS_LABELS = {
  cod_5days: '貨到後5天工作日',
  monthly_30: '月結30天',
  monthly_45: '月結45天',
  monthly_60: '月結60天',
  other: '其他',
};

const PAYMENT_METHOD_LABELS = {
  wire: '電匯',
  other: '其他',
};

const BILLING_METHOD_LABELS = {
  mail: '郵寄',
  fax: '傳真',
  email: 'E-mail',
};

const SUPPLIER_CATEGORY_LABELS = {
  raw_material: '原料',
  supplies: '物料',
  packaging: '包材',
  equipment: '設備及維修',
  expense: '費用',
  other: '其它',
};

const ENTITY_TYPE_LABELS = {
  natural_person: '自然人',
  legal_entity: '法人',
};

export default function SupplierRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getRequestDetail, approveRequest } = useSupplierRequests();

  const { hasPermission: canApproveFinance } = usePermission('erp.supplier.approve.finance');
  const { hasPermission: canApproveAccounting } = usePermission('erp.supplier.approve.accounting');
  const { hasPermission: canApproveCreator } = usePermission('erp.supplier.approve.creator');

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // 載入申請單
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        setLoading(true);
        const result = await getRequestDetail(id);
        if (result.success) {
          setRequest(result.data);
        } else {
          alert('載入失敗: ' + result.error);
        }
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchRequest();
  }, [id, getRequestDetail]);

  // 判斷是否可以簽核
  const canApprove = () => {
    if (!request) return false;
    const stage = STATUS_CONFIG[request.status]?.stage;
    if (!stage) return false;

    if (stage === 'finance' && canApproveFinance) return true;
    if (stage === 'accounting' && canApproveAccounting) return true;
    if (stage === 'creator' && canApproveCreator) return true;

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
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
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

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <button
        onClick={() => navigate('/systems/erp')}
        className="flex items-center gap-2 text-stone-600 hover:text-orange-600 transition"
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
              <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                request.request_type === 'new' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {REQUEST_TYPE_LABELS[request.request_type]}
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

          <div className={`px-4 py-2 rounded-xl bg-${statusConfig.color}-100 text-${statusConfig.color}-700 font-semibold flex items-center gap-2`}>
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

      {/* 適用品牌 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-3 flex items-center gap-2">
          <Building2 size={16} />
          適用品牌
        </h3>
        <div className="flex flex-wrap gap-2">
          {(request.brands || []).map((brand) => (
            <span
              key={brand.code}
              className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm"
            >
              {brand.name}
            </span>
          ))}
          {(!request.brands || request.brands.length === 0) && (
            <span className="text-stone-400 text-sm">未指定品牌</span>
          )}
        </div>
      </div>

      {/* 基本資訊 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <Building2 size={16} />
          供應商基本資訊
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-stone-500">公司名稱</span>
            <p className="font-medium text-stone-800">{request.company_name}</p>
          </div>
          <div>
            <span className="text-stone-500">統一編號</span>
            <p className="font-medium text-stone-800">{request.tax_id || '-'}</p>
          </div>
          <div>
            <span className="text-stone-500">資本額</span>
            <p className="font-medium text-stone-800">
              {request.capital ? Number(request.capital).toLocaleString() : '-'}
            </p>
          </div>
          <div>
            <span className="text-stone-500">負責人</span>
            <p className="font-medium text-stone-800">{request.responsible_person || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <span className="text-stone-500">主要營業項目</span>
            <p className="font-medium text-stone-800">{request.main_business || '-'}</p>
          </div>
        </div>
      </div>

      {/* 地址 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <MapPin size={16} />
          地址
        </h3>
        <div className="grid grid-cols-1 gap-3 text-sm">
          <div>
            <span className="text-stone-500">登記地址</span>
            <p className="font-medium text-stone-800">{request.registered_address || '-'}</p>
          </div>
          <div>
            <span className="text-stone-500">聯絡地址</span>
            <p className="font-medium text-stone-800">
              {request.contact_address_same ? '（同登記地址）' : request.contact_address || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 聯絡人資訊 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <User size={16} />
          聯絡人資訊
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-stone-50 rounded-lg">
            <h4 className="font-medium text-stone-700 mb-3">聯絡人（業務）</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-stone-500">姓名：</span>{request.contact_sales_name || '-'}</p>
              <p className="flex items-center gap-1">
                <Mail size={14} className="text-stone-400" />
                {request.contact_sales_email || '-'}
              </p>
              <p className="flex items-center gap-1">
                <Phone size={14} className="text-stone-400" />
                {request.contact_sales_mobile || '-'}
              </p>
            </div>
          </div>
          <div className="p-4 bg-stone-50 rounded-lg">
            <h4 className="font-medium text-stone-700 mb-3">聯絡人（會計）</h4>
            <div className="space-y-2 text-sm">
              <p><span className="text-stone-500">姓名：</span>{request.contact_accounting_name || '-'}</p>
              <p className="flex items-center gap-1">
                <Mail size={14} className="text-stone-400" />
                {request.contact_accounting_email || '-'}
              </p>
              <p className="flex items-center gap-1">
                <Phone size={14} className="text-stone-400" />
                {request.contact_accounting_phone || '-'}
              </p>
              <p><span className="text-stone-500">傳真：</span>{request.contact_accounting_fax || '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 發票與稅務 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <FileText size={16} />
          發票與稅務設定
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-stone-500">開立發票方式</span>
            <p className="font-medium text-stone-800">{INVOICE_TYPE_LABELS[request.invoice_type] || '-'}</p>
          </div>
          <div>
            <span className="text-stone-500">發票聯式</span>
            <p className="font-medium text-stone-800">{INVOICE_FORMAT_LABELS[request.invoice_format] || '-'}</p>
          </div>
          <div>
            <span className="text-stone-500">課稅別</span>
            <p className="font-medium text-stone-800">{TAX_TYPE_LABELS[request.tax_type] || '-'}</p>
          </div>
        </div>
      </div>

      {/* 付款條件 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <CreditCard size={16} />
          付款條件
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-stone-500">款項天數</span>
            <p className="font-medium text-stone-800">
              {PAYMENT_DAYS_LABELS[request.payment_days] || '-'}
              {request.payment_days === 'other' && request.payment_days_other && ` (${request.payment_days_other})`}
            </p>
          </div>
          <div>
            <span className="text-stone-500">收款方式</span>
            <p className="font-medium text-stone-800">
              {PAYMENT_METHOD_LABELS[request.payment_method] || '-'}
              {request.payment_method === 'other' && request.payment_method_other && ` (${request.payment_method_other})`}
            </p>
          </div>
          <div>
            <span className="text-stone-500">請款方式</span>
            <p className="font-medium text-stone-800">
              {(request.billing_method || []).map(m => BILLING_METHOD_LABELS[m]).join('、') || '-'}
            </p>
          </div>
        </div>
      </div>

      {/* 銀行資訊 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <Banknote size={16} />
          銀行匯款資訊
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-stone-500">銀行</span>
            <p className="font-medium text-stone-800">
              {request.bank_code ? `${request.bank_code} - ${request.bank_name}` : '-'}
            </p>
          </div>
          <div>
            <span className="text-stone-500">分行</span>
            <p className="font-medium text-stone-800">
              {request.branch_code ? `${request.branch_code} - ${request.branch_name}` : '-'}
            </p>
          </div>
          <div>
            <span className="text-stone-500">帳戶名稱</span>
            <p className="font-medium text-stone-800">{request.account_name || '-'}</p>
          </div>
          <div>
            <span className="text-stone-500">銀行帳號</span>
            <p className="font-medium text-stone-800 font-mono">{request.account_number || '-'}</p>
          </div>
        </div>
        {request.related_company_payment && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-700">
              ※ 由關聯企業代付：{request.related_company_name}
            </p>
          </div>
        )}
      </div>

      {/* 內部管理欄位 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <FileText size={16} />
          內部管理欄位
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-stone-500">供應商代號</span>
            <p className="font-medium text-stone-800">{request.supplier_code || '（待建檔人員填寫）'}</p>
          </div>
          <div>
            <span className="text-stone-500">客戶簡稱</span>
            <p className="font-medium text-stone-800">{request.supplier_short_name || '（待系統人員填寫）'}</p>
          </div>
          <div>
            <span className="text-stone-500">廠商分類</span>
            <p className="font-medium text-stone-800">{SUPPLIER_CATEGORY_LABELS[request.supplier_category] || '-'}</p>
          </div>
          <div>
            <span className="text-stone-500">分類</span>
            <p className="font-medium text-stone-800">{ENTITY_TYPE_LABELS[request.entity_type] || '（待會計填寫）'}</p>
          </div>
          <div>
            <span className="text-stone-500">電子發票匯出格式</span>
            <p className="font-medium text-stone-800">{request.einvoice_export_format || '（待會計填寫）'}</p>
          </div>
        </div>
      </div>

      {/* 簽核記錄 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4 flex items-center gap-2">
          <MessageSquare size={16} />
          簽核記錄
        </h3>

        {request.approvals?.length === 0 ? (
          <p className="text-stone-400 text-sm">尚無簽核記錄</p>
        ) : (
          <div className="space-y-3">
            {(request.approvals || []).map((approval) => (
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
                    （{approval.stage === 'finance' ? '財務' : approval.stage === 'accounting' ? '會計' : '建檔人員'}）
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
