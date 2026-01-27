import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { usePermission } from '../../../../hooks/usePermission'; // RBAC 權限系統
import {
    ArrowLeft, CheckCircle, XCircle, Clock, Shield, Loader2,
    Building, FileText, CreditCard, Paperclip, MessageSquare,
    ThumbsUp, Printer, Edit2, ExternalLink, Download,
    Image as ImageIcon, Ticket, SkipForward,
    Save, X // ✅ [新增] 引入這兩個圖示
} from 'lucide-react';

const BASE_PATH = '/systems/payment-approval';

// --- 簽核流程配置 ---
const WORKFLOW_CONFIG = {
    'pending_unit_manager': { role: 'unit_manager', label: '單位主管', nextStatus: 'pending_accountant', nextStep: 2, fieldPrefix: 'sign_manager' },
    'pending_accountant': { role: 'accountant', label: '會計', nextStatus: 'pending_audit_manager', nextStep: 3, fieldPrefix: 'sign_accountant' },
    'pending_audit_manager': { role: 'audit_manager', label: '審核主管', nextStatus: 'pending_cashier', nextStep: 4, fieldPrefix: 'sign_audit' },
    'pending_cashier': { role: 'cashier', label: '出納', nextStatus: 'pending_boss', nextStep: 5, fieldPrefix: 'sign_cashier' },
    'pending_boss': { role: 'boss', label: '放行主管', nextStatus: 'completed', nextStep: 6, fieldPrefix: 'sign_boss' }
};

const STATUS_LABELS = {
    'draft': '草稿',
    'pending_unit_manager': '待單位主管簽核',
    'pending_accountant': '待會計審核',
    'pending_audit_manager': '待審核主管簽核',
    'pending_cashier': '待出納撥款',
    'pending_boss': '待放行主管決行',
    'completed': '已結案',
    'rejected': '已駁回',
    'revoked': '已撤銷'
};

// --- Helper Components ---

const InfoField = ({ label, value, subValue, highlight, className = "" }) => (
    <div className={`mb-4 print:mb-2 ${className}`}>
        <label className="block text-xs text-stone-400 uppercase tracking-wider print:text-black print:font-bold print:mb-0 print:text-[9pt]">
            {label}
        </label>
        <div className={`font-medium text-gray-900 ${highlight
                ? 'text-lg font-bold text-emerald-700 print:text-black print:font-bold'
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
        <Icon size={18} className="text-red-600 print:hidden" />
        <h3>{title}</h3>
    </div>
);

export default function RequestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth();
    const [request, setRequest] = useState(null);
    const [paymentItems, setPaymentItems] = useState([]); // [新增] 多門店付款明細
    const [applicantHasAccountantPermission, setApplicantHasAccountantPermission] = useState(false); // 用來判斷申請人是否有會計權限
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const currentRole = role; // 保留用於顯示
    const [cashierFee, setCashierFee] = useState(0);
    const [previewFile, setPreviewFile] = useState(null);

    // RBAC 權限檢查
    const { hasPermission: canCreate } = usePermission('payment.create');
    const { hasPermission: canApproveManager } = usePermission('payment.approve.manager');
    const { hasPermission: canApproveAccountant } = usePermission('payment.approve.accountant');
    const { hasPermission: canApproveAudit } = usePermission('payment.approve.audit');
    const { hasPermission: canApproveCashier } = usePermission('payment.approve.cashier');
    const { hasPermission: canApproveBoss } = usePermission('payment.approve.boss');
    const { hasPermission: canReject } = usePermission('payment.reject');
    const { hasPermission: canCancel } = usePermission('payment.cancel');

    // 操作權限（細粒度）
    const { hasPermission: canManageFee } = usePermission('payment.fee.manage');
    const { hasPermission: canManageInvoice } = usePermission('payment.invoice.manage');
    const { hasPermission: canViewInvoice } = usePermission('payment.invoice.view');
    const { hasPermission: canEditExpectedDate } = usePermission('payment.expected_date.edit'); // [新增] 預期放款日編輯權限
    // ✅ [新增] 會計補登發票用的 State
    const [accountantInvoice, setAccountantInvoice] = useState({
        hasInvoice: 'no_yet',
        invoiceDate: '',
        invoiceNumber: ''
    });
    // ✅ [新增] 1. 控制發票編輯模式的 State
    const [isEditingInvoice, setIsEditingInvoice] = useState(false);
    const [invoiceData, setInvoiceData] = useState({
        has_invoice: 'no_yet',
        invoice_date: '',
        invoice_number: ''
    });

    // ✅ [新增] 預期放款日編輯相關 State
    const [isEditingExpectedDate, setIsEditingExpectedDate] = useState(false);
    const [expectedPaymentDate, setExpectedPaymentDate] = useState('');

    // ✅ [新增] 2. 當 request 載入時，同步發票資料和預期放款日到編輯狀態
    useEffect(() => {
        if (request) {
            setInvoiceData({
                has_invoice: request.has_invoice || 'no_yet',
                invoice_date: request.invoice_date || '',
                invoice_number: request.invoice_number || ''
            });
            setExpectedPaymentDate(request.expected_payment_date || '');
        }
    }, [request]);
    // ✅ [新增] 3. 獨立儲存發票資料的函式 (不影響簽核狀態)
const handleSaveInvoice = async () => {
    try {
        setProcessing(true);
        
        // 準備要更新的資料
        const updates = {
            has_invoice: invoiceData.has_invoice,
            // 如果狀態不是「已附」，清空日期與號碼
            invoice_date: invoiceData.has_invoice === 'yes' ? invoiceData.invoice_date : null,
            invoice_number: invoiceData.has_invoice === 'yes' ? invoiceData.invoice_number : null
        };

        const { error } = await supabase
            .from('payment_requests')
            .update(updates)
            .eq('id', id);

        if (error) throw error;

        // 更新本地顯示資料
        setRequest(prev => ({ ...prev, ...updates }));
        setIsEditingInvoice(false);
        alert('✅ 發票資料已更新！');
    } catch (err) {
        console.error(err);
        alert('更新失敗: ' + err.message);
    } finally {
        setProcessing(false);
    }
};

    // ✅ [新增] 儲存預期放款日的函式
    const handleSaveExpectedDate = async () => {
        try {
            setProcessing(true);

            const { error } = await supabase
                .from('payment_requests')
                .update({ expected_payment_date: expectedPaymentDate || null })
                .eq('id', id);

            if (error) throw error;

            // 更新本地顯示資料
            setRequest(prev => ({ ...prev, expected_payment_date: expectedPaymentDate || null }));
            setIsEditingExpectedDate(false);
            alert('✅ 預期放款日已更新！');
        } catch (err) {
            console.error(err);
            alert('更新失敗: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };
    useEffect(() => {
        fetchRequestDetail();
        
        // 即時監聽變更
        const subscription = supabase
            .channel('request-detail')
            .on('postgres_changes', { event: 'UPDATE', schema: 'payment_approval', table: 'payment_requests', filter: `id=eq.${id}` },
                (payload) => setRequest(prev => ({ ...prev, ...payload.new })))
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, [id]);

    const fetchRequestDetail = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('payment_requests').select('*').eq('id', id).single();
            if (error) throw error;

            // 資料正規化：確保 attachments 是陣列
            if (!Array.isArray(data.attachments)) {
                // 如果是舊資料 null 或 json string，轉為空陣列或嘗試解析
                if (typeof data.attachments === 'string') {
                    try { data.attachments = JSON.parse(data.attachments); } catch { data.attachments = []; }
                } else if (data.attachment_url) {
                    // 相容舊欄位
                    data.attachments = [{ name: '舊附件', url: data.attachment_url, type: 'unknown' }];
                } else {
                    data.attachments = [];
                }
            }

            // [新增] 如果是多門店付款，查詢明細
            if (data.is_multi_store) {
                const { data: itemsData, error: itemsError } = await supabase
                    .from('payment_request_items')
                    .select('*')
                    .eq('request_id', id)
                    .order('display_order', { ascending: true });

                if (itemsError) {
                    console.error('Failed to fetch payment items:', itemsError);
                } else {
                    setPaymentItems(itemsData || []);
                }
            } else {
                setPaymentItems([]);
            }

            // 檢查申請人是否有會計簽核權限 (用於判斷是否跳過會計關卡)
            if (data.applicant_id) {
                const { data: permData } = await supabase
                    .schema('rbac')
                    .rpc('user_has_permission', {
                        p_user_id: data.applicant_id,
                        p_permission_code: 'payment.approve.accountant'
                    });
                setApplicantHasAccountantPermission(permData || false);
            }

            setRequest(data);
            if (data.handling_fee) setCashierFee(data.handling_fee);
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

            let nextStatus = config.nextStatus;
            let nextStep = config.nextStep;
            
            // 建立更新 payload
            const updatePayload = {
                status: nextStatus,
                current_step: nextStep,
                [`${config.fieldPrefix}_at`]: new Date().toISOString(),
                [`${config.fieldPrefix}_url`]: 'BUTTON_APPROVED',
            };

            // 特殊邏輯：如果有手續費管理權限，記錄手續費（使用細粒度 RBAC 權限）
            if (canManageFee) {
                updatePayload.handling_fee = Number(cashierFee);
            }

            // ★★★ 特殊邏輯：如果下一個關卡是「會計」，但申請人有會計簽核權限 ★★★
            // 則自動跳過會計關卡，直接進入「審核主管」
            if (nextStatus === 'pending_accountant' && applicantHasAccountantPermission) {
                updatePayload.status = 'pending_audit_manager';
                updatePayload.current_step = 4; // 對應 audit_manager 的 step
                // 自動填寫會計的簽核欄位
                updatePayload.sign_accountant_at = new Date().toISOString();
                updatePayload.sign_accountant_url = 'AUTO_SKIPPED_SELF';

                alert('💡 檢測到申請人具有會計簽核權限，系統將自動跳過會計審核關卡。');
            }

            const { error: dbError } = await supabase.from('payment_requests').update(updatePayload).eq('id', id);
            if (dbError) throw dbError;

            // 更新本地狀態
            setRequest(prev => ({ ...prev, ...updatePayload }));
            
            if (updatePayload.sign_accountant_url === 'AUTO_SKIPPED_SELF') {
                 alert(`${config.label} 簽核成功！(已自動完成會計關卡)`);
            } else {
                 alert(`${config.label} 簽核成功！`);
            }
        } catch (err) {
            console.error(err);
            alert('簽核失敗: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        // 🔒 權限檢查
        if (!canReject) {
            alert("⚠️ 權限不足\n\n您沒有駁回付款申請的權限（payment.reject）。");
            return;
        }

        const reason = prompt("請輸入駁回原因：");
        if (!reason) return;
        setProcessing(true);
        try {
            const { error } = await supabase.from('payment_requests')
                .update({ status: 'rejected', current_step: 0, rejection_reason: reason }).eq('id', id);
            if (error) throw error;
            alert("案件已駁回。");
            // 這裡可以選擇不跳轉，讓使用者留在頁面看到狀態變更
            setRequest(prev => ({ ...prev, status: 'rejected', rejection_reason: reason }));
        } catch (err) {
            alert("駁回失敗: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleRevoke = async () => {
        // 🔒 檢查是否已經有任何簽核紀錄
        const hasAnySignature =
            request.sign_unit_manager_at ||
            request.sign_accountant_at ||
            request.sign_audit_manager_at ||
            request.sign_cashier_at ||
            request.sign_boss_at;

        if (hasAnySignature) {
            alert("⚠️ 此申請已進入簽核流程，不能直接取消。\n\n如需停止此申請，請聯絡有權限的主管進行駁回。");
            return;
        }

        if (!window.confirm("確定要撤銷此申請單嗎？")) return;
        setProcessing(true);
        try {
            const { error } = await supabase.from('payment_requests').update({ status: 'revoked', current_step: 0 }).eq('id', id);
            if (error) throw error;
            setRequest(prev => ({ ...prev, status: 'revoked', current_step: 0 }));
            alert("申請單已撤銷。");
        } catch (err) { alert("撤銷失敗: " + err.message); } finally { setProcessing(false); }
    };

    const handleEdit = () => {
        navigate(`${BASE_PATH}/apply`, { state: { requestData: request } });
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin inline mr-2" />載入中...</div>;
    if (!request) return <div className="p-10 text-center text-red-500">查無此單據</div>;

    const currentConfig = WORKFLOW_CONFIG[request.status];

    // 使用 RBAC 權限檢查是否可以審核當前狀態
    const canApprove = currentConfig && (
        (request.status === 'pending_unit_manager' && canApproveManager) ||
        (request.status === 'pending_accountant' && canApproveAccountant) ||
        (request.status === 'pending_audit_manager' && canApproveAudit) ||
        (request.status === 'pending_cashier' && canApproveCashier) ||
        (request.status === 'pending_boss' && canApproveBoss)
    );

    // 🔒 檢查是否已有任何簽核紀錄（已簽核的單子不能取消，只能駁回）
    const hasAnySignature =
        request.sign_unit_manager_at ||
        request.sign_accountant_at ||
        request.sign_audit_manager_at ||
        request.sign_cashier_at ||
        request.sign_boss_at;

    return (
        <div className="min-h-screen bg-stone-50 font-sans pb-20 print:bg-white print:pb-0">

            <style>{`
    @media print {
        @page { size: A4 portrait; margin: 10mm; }
        html, body { height: 100%; margin: 0 !important; padding: 0 !important; background: white; font-size: 10pt; -webkit-print-color-adjust: exact; }
        .no-print, nav, header, button, .sticky-header, .role-switcher { display: none !important; }
        .print-container { width: 100% !important; max-width: none !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
        .print-grid-4 { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 8px !important; }
        .print-col-span-2 { grid-column: span 2 !important; }
        .print-col-span-4 { grid-column: span 4 !important; }
        .print-section { margin-bottom: 1rem !important; }
        .print-full-width { width: 100% !important; max-width: 100% !important; }
        table.signature-table { width: 100%; border-collapse: collapse; margin-top: 15px; page-break-inside: avoid; }
        table.signature-table th, table.signature-table td { border: 1px solid #000; padding: 4px; text-align: center; font-size: 10pt !important; }
        table.signature-table td { height: 1.8cm; }
        table.signature-table th { background-color: #f3f4f6 !important; font-weight: bold; }
    }
    `}</style>

            {/* 上帝模式切換列 (列印時隱藏) */}
            <div className="no-print mb-2 text-xs text-stone-400 text-right">
                登入身分: {user?.email} ({STATUS_LABELS[currentRole] || currentRole})
            </div>

            <div className="max-w-5xl mx-auto p-4 sm:p-6 print-container">

                {/* 頁面標題列 */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button onClick={() => navigate(`${BASE_PATH}/dashboard`)} className="text-stone-400 hover:text-gray-800 flex items-center gap-1 no-print">
                        <ArrowLeft size={20} /> 返回列表
                    </button>

                    <div className="flex items-center gap-3">
                        <span className="text-stone-400 text-sm font-mono">#{String(request.id).padStart(5, '0')}</span>
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${request.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                request.status === 'rejected' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-white text-blue-700 border border-blue-200'
                            }`}>
                            {request.status === 'completed' ? <CheckCircle size={16} /> : request.status === 'rejected' ? <XCircle size={16} /> : <Clock size={16} />}
                            {STATUS_LABELS[request.status] || request.status}
                        </div>
                    </div>

                    <button onClick={handlePrint} className="no-print bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-gray-800 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold">
                        <Printer size={16} /> 列印 / PDF
                    </button>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden print-container">
                    <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:p-0">

                        {/* 左側：詳細資訊 */}
                        <div className="lg:col-span-2 space-y-8 print-full-width print:space-y-4">

                            {/* 一、基本資訊 */}
                            <section className="print-section">
                                <SectionHeader icon={FileText} title="一、基本付款資訊" />

                                {request.is_multi_store ? (
                                    /* 多門店付款顯示 */
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4 print-grid-4">
                                            <InfoField label="申請日期" value={request.apply_date} />
                                            <InfoField label="付款日期" value={request.payment_date} />
                                            {/* 預期放款日 */}
                                            <div className="col-span-2 print-col-span-2 relative">
                                                {canEditExpectedDate && !isEditingExpectedDate && (
                                                    <button
                                                        onClick={() => setIsEditingExpectedDate(true)}
                                                        className="absolute right-0 top-0 text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 no-print bg-blue-50 px-2 py-1 rounded transition-opacity"
                                                    >
                                                        <Edit2 size={12} /> 修改
                                                    </button>
                                                )}
                                                {isEditingExpectedDate ? (
                                                    <div className="bg-white border-2 border-blue-100 rounded-lg p-3 shadow-sm animate-in fade-in">
                                                        <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                                                            <span className="text-sm font-bold text-blue-800">修改預期放款日</span>
                                                            <button onClick={() => setIsEditingExpectedDate(false)} className="text-gray-400 hover:text-gray-600">
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                        <div className="mb-3">
                                                            <input
                                                                type="date"
                                                                value={expectedPaymentDate}
                                                                onChange={(e) => setExpectedPaymentDate(e.target.value)}
                                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                            />
                                                        </div>
                                                        <button
                                                            onClick={handleSaveExpectedDate}
                                                            disabled={processing}
                                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                                        >
                                                            {processing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                                            儲存
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <InfoField
                                                        label="預期放款日"
                                                        value={request.expected_payment_date || '未設定'}
                                                        className={request.expected_payment_date ? '' : 'text-stone-400'}
                                                    />
                                                )}
                                            </div>
                                        </div>

                                        {/* 多門店付款明細 */}
                                        <div className="mt-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <label className="text-xs text-stone-400 uppercase tracking-wider font-semibold">
                                                    付款明細 (共 {paymentItems.length} 筆)
                                                </label>
                                                <div className="text-lg font-bold text-emerald-700">
                                                    總金額: ${Math.round(Number(request.total_amount || 0)).toLocaleString('zh-TW')}
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                {paymentItems.map((item, index) => (
                                                    <div key={item.id} className="border-2 border-stone-200 rounded-lg p-4 bg-stone-50">
                                                        <div className="flex items-start justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-7 h-7 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-bold text-sm">
                                                                    {index + 1}
                                                                </div>
                                                                <div>
                                                                    <div className="font-medium text-stone-800">
                                                                        {item.brand_name} - {item.store_name}
                                                                    </div>
                                                                    <div className="text-xs text-stone-500">
                                                                        {item.tax_type === 'tax_included' ? '含稅' : '未稅'}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="text-lg font-bold text-stone-800">
                                                                ${Math.round(Number(item.amount)).toLocaleString('zh-TW')}
                                                            </div>
                                                        </div>
                                                        <div className="text-sm text-stone-600 bg-white rounded p-2 mt-2">
                                                            {item.content}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* 單門店付款顯示（原有邏輯） */
                                    <div className="grid grid-cols-2 gap-4 print-grid-4">
                                        <InfoField label="支付品牌" value={request.brand} />
                                        <InfoField label="支付門店" value={request.store} />
                                        <InfoField label="申請日期" value={request.apply_date} />
                                        <InfoField label="付款日期" value={request.payment_date} />
                                        {/* 預期放款日 */}
                                        <div className="col-span-2 print-col-span-2 relative">
                                            {canEditExpectedDate && !isEditingExpectedDate && (
                                                <button
                                                    onClick={() => setIsEditingExpectedDate(true)}
                                                    className="absolute right-0 top-0 text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 no-print bg-blue-50 px-2 py-1 rounded transition-opacity"
                                                >
                                                    <Edit2 size={12} /> 修改
                                                </button>
                                            )}
                                            {isEditingExpectedDate ? (
                                                <div className="bg-white border-2 border-blue-100 rounded-lg p-3 shadow-sm animate-in fade-in">
                                                    <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                                                        <span className="text-sm font-bold text-blue-800">修改預期放款日</span>
                                                        <button onClick={() => setIsEditingExpectedDate(false)} className="text-gray-400 hover:text-gray-600">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <div className="mb-3">
                                                        <input
                                                            type="date"
                                                            value={expectedPaymentDate}
                                                            onChange={(e) => setExpectedPaymentDate(e.target.value)}
                                                            className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleSaveExpectedDate}
                                                        disabled={processing}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        {processing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                                        儲存
                                                    </button>
                                                </div>
                                            ) : (
                                                <InfoField
                                                    label="預期放款日"
                                                    value={request.expected_payment_date || '未設定'}
                                                    className={request.expected_payment_date ? '' : 'text-stone-400'}
                                                />
                                            )}
                                        </div>
                                        <div className="col-span-2 print-col-span-2">
                                            <InfoField label="金額" value={`$${Math.round(Number(request.amount)).toLocaleString('zh-TW')}`} highlight />
                                        </div>
                                        <div className="col-span-2 print-col-span-4">
                                            <InfoField label="付款內容" value={request.content} />
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 二、付款方式 */}
                            <section className="print-section">
                                <SectionHeader icon={CreditCard} title="二、付款方式" />
                                <div className="grid grid-cols-2 gap-4 print-grid-4">
                                    <div className="print-col-span-2">
                                        <InfoField label="方式" value={request.payment_method === 'transfer' ? '網銀轉帳' : request.payment_method === 'cash' ? '現金' : '其他'} subValue={request.payment_method === 'other' ? request.payment_method_other : ''} />
                                    </div>
                                    <div className="print-col-span-2">
                                        <InfoField label="手續費" value={request.handling_fee > 0 ? `$${request.handling_fee}` : '0'} />
                                    </div>
                                </div>
                            </section>

                            {/* 三、銀行帳戶 (僅轉帳顯示) */}
                            {request.payment_method === 'transfer' && (
                                <section className="print-section">
                                    <SectionHeader icon={Building} title="三、銀行帳戶資料" />
                                    <div className="grid grid-cols-2 gap-4 bg-stone-50 p-4 rounded border border-gray-100 print:bg-white print:border-0 print:p-0 print-grid-4">
                                        <div className="col-span-2 print-col-span-2">
                                            <InfoField label="受款戶名" value={request.payee_name} highlight />
                                        </div>
                                        <div className="col-span-2 print-col-span-2">
                                            <InfoField label="帳號" value={request.account_number} />
                                        </div>
                                        <div className="print-col-span-2">
                                            <InfoField label="銀行" value={request.bank_name} subValue={request.bank_code} />
                                        </div>
                                        <div className="print-col-span-2">
                                            <InfoField label="分行" value={request.bank_branch} subValue={request.branch_code} />
                                        </div>
                                    </div>
                                </section>
                            )}

                            {/* 四、附件、發票與傳票 (主要修改區) */}
                            <section className="print-section">
                                <SectionHeader icon={Paperclip} title="四、附件、發票與傳票" />
                                <div className="grid grid-cols-2 gap-4 print-grid-4">
                                    
                                    {/* --- ✅ [修改] 發票資訊區塊 (支援會計補登) --- */}
                                    <div className="print-col-span-2 relative group">
                                        
                                        {/* 只有「具有發票管理權限」且「非編輯模式」時，顯示編輯按鈕 */}
                                        {canManageInvoice && !isEditingInvoice && (
                                            <button
                                                onClick={() => setIsEditingInvoice(true)}
                                                className="absolute right-0 top-0 text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1 no-print bg-blue-50 px-2 py-1 rounded transition-opacity"
                                            >
                                                <Edit2 size={12} /> 補登/修改
                                            </button>
                                        )}

                                        {isEditingInvoice ? (
                                            // --- 編輯模式介面 ---
                                            <div className="bg-white border-2 border-blue-100 rounded-lg p-3 shadow-sm animate-in fade-in space-y-3">
                                                <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-2">
                                                    <span className="text-sm font-bold text-blue-800">發票資訊補登</span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setIsEditingInvoice(false)} className="text-gray-400 hover:text-gray-600">
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* 1. 狀態選擇 */}
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-500 mb-1">發票狀態</label>
                                                    <select 
                                                        value={invoiceData.has_invoice}
                                                        onChange={(e) => setInvoiceData({ ...invoiceData, has_invoice: e.target.value })}
                                                        className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                    >
                                                        <option value="no_yet">未開 / 後補</option>
                                                        <option value="yes">已附發票</option>
                                                        <option value="none">免用發票</option>
                                                    </select>
                                                </div>

                                                {/* 2. 日期與號碼 (只有選「已附發票」才顯示) */}
                                                {invoiceData.has_invoice === 'yes' && (
                                                    <div className="grid grid-cols-2 gap-3 animate-in slide-in-from-top-2">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 mb-1">發票日期</label>
                                                            <input 
                                                                type="date"
                                                                value={invoiceData.invoice_date}
                                                                onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
                                                                className="w-full p-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-500 mb-1">發票號碼</label>
                                                            <input 
                                                                type="text"
                                                                placeholder="例: AB-12345678"
                                                                value={invoiceData.invoice_number}
                                                                onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
                                                                className="w-full p-2 text-sm border border-gray-300 rounded font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                {/* 3. 儲存按鈕 */}
                                                <div className="pt-2">
                                                    <button 
                                                        onClick={handleSaveInvoice}
                                                        disabled={processing}
                                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        {processing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                                        儲存變更
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            // --- 原本的顯示模式 ---
                                            <InfoField 
                                                label="發票狀態" 
                                                value={request.has_invoice === 'yes' ? '已附發票' : request.has_invoice === 'no_yet' ? '未開/後補' : '免用發票'} 
                                                subValue={request.has_invoice === 'yes' ? 
                                                    `日期: ${request.invoice_date} | 號碼: ${request.invoice_number || '--'}` : ''
                                                } 
                                            />
                                        )}
                                    </div>

                                    {/* 傳票資訊 (新增) */}
                                    <div className="print-col-span-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Ticket size={14} className="text-stone-400 print:hidden"/>
                                            <label className="block text-xs text-stone-400 uppercase tracking-wider print:text-black print:font-bold">傳票編號</label>
                                        </div>
                                        <div className="font-mono font-medium text-gray-900 print:text-[10pt]">
                                            {request.has_voucher ? request.voucher_number : '無傳票'}
                                        </div>
                                    </div>

                                    {/* 附件列表 (修改為多檔顯示) */}
                                    <div className="col-span-2 print-col-span-4 mt-2">
                                        <label className="block text-xs font-bold text-stone-400 uppercase mb-2 print:text-[9pt] print:text-black">附件檔案</label>
                                        
                                        {request.has_attachment && request.attachments && request.attachments.length > 0 ? (
                                            <div className="space-y-2 no-print">
                                                {request.attachments.map((file, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-stone-50 border border-stone-100 rounded hover:bg-stone-100 transition-colors">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <Paperclip size={14} className="text-stone-400 flex-shrink-0"/>
                                                            <span className="text-sm text-stone-700 truncate" title={file.name}>{file.name}</span>
                                                        </div>
                                                        <div className="flex gap-2 flex-shrink-0">
                                                            <button 
                                                                onClick={() => setPreviewFile(file)}
                                                                className="text-xs bg-white border border-stone-200 px-2 py-1 rounded text-stone-600 hover:text-red-600"
                                                            >
                                                                預覽
                                                            </button>
                                                            <a href={file.url} download className="text-xs bg-white border border-stone-200 px-2 py-1 rounded text-stone-600 hover:text-blue-600">
                                                                下載
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-stone-400 text-sm print:text-[10pt]">無附件</div>
                                        )}
                                        
                                        {/* 列印時顯示簡單文字 */}
                                        <div className="hidden print:block text-sm">
                                            {request.has_attachment ? `共 ${request.attachments?.length || 0} 個附件 (請至系統查看)` : '無附件'}
                                        </div>
                                        {request.attachment_desc && <div className="text-xs text-stone-400 mt-2">備註: {request.attachment_desc}</div>}
                                    </div>
                                </div>
                            </section>

                            {/* 五、備註 */}
                            {request.remarks && (
                                <section className="print-section">
                                    <SectionHeader icon={MessageSquare} title="五、備註" />
                                    <div className="text-stone-700 bg-amber-50 p-3 rounded text-sm border border-amber-100 print:bg-white print:border-0 print:p-0 print:text-[10pt]">
                                        {request.remarks}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* 右側：簽核操作區 */}
                        <div className="lg:col-span-1 no-print">
                            <div className="sticky top-24 space-y-6">

                                <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Shield size={18} className="text-red-600" /> 簽核進度</h3>
                                    <div className="space-y-4">
                                        {[
                                            { key: 'sign_manager', label: '單位主管', roleCode: 'unit_manager' },
                                            { key: 'sign_accountant', label: '會計', roleCode: 'accountant' },
                                            { key: 'sign_audit', label: '審核主管', roleCode: 'audit_manager' },
                                            { key: 'sign_cashier', label: '出納', roleCode: 'cashier' },
                                            { key: 'sign_boss', label: '放行主管', roleCode: 'boss' },
                                        ].map((step, idx) => {
                                            const url = request[`${step.key}_url`];
                                            const time = request[`${step.key}_at`];
                                            
                                            // 判斷是否為「目前關卡」
                                            const isCurrent = currentConfig?.role === step.roleCode && request.status !== 'rejected' && request.status !== 'completed';
                                            
                                            // 判斷是否「被跳過」 (例如：單位的單跳過主管，或會計自送單)
                                            // 邏輯：如果這個關卡沒有時間，但目前步驟(current_step)已經超過這個關卡的順序
                                            const stepIndex = idx + 2; // 因為 pending_unit_manager 是 step 1 (假設)
                                            // 簡單判斷：如果狀態是 pending_audit (step 4)，那 unit_manager (step ?) 如果沒值就是 skipped
                                            // 這裡用更簡單的視覺判斷：沒時間 && 狀態不在此處 && 狀態不是 draft/rejected
                                            
                                            const isSkipped = !time && !isCurrent && request.current_step > (idx + 1) && request.status !== 'draft' && request.status !== 'rejected';
                                            const isAutoSkipped = url === 'AUTO_SKIPPED' || url === 'AUTO_SKIPPED_SELF';

                                            return (
                                                <div key={step.key} className={`relative pl-6 pb-4 border-l-2 ${url ? 'border-red-500' : 'border-stone-200'} last:border-0`}>
                                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${url ? 'bg-red-500 border-red-500' : isCurrent ? 'bg-amber-500 border-blue-500 animate-pulse' : 'bg-white border-gray-300'}`}></div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className={`text-sm font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-700'} ${isSkipped ? 'text-gray-400 line-through' : ''}`}>
                                                                {step.label}
                                                            </div>
                                                            {time && <div className="text-[10px] text-stone-400">{new Date(time).toLocaleString()}</div>}
                                                            {isSkipped && <div className="text-[10px] text-stone-400">無需簽核 / 已跳過</div>}
                                                            {isAutoSkipped && <div className="text-[10px] text-emerald-600 font-bold">自動完成 (同申請人)</div>}
                                                        </div>
                                                        {url && !isAutoSkipped && <CheckCircle size={16} className="text-red-500" />}
                                                        {isAutoSkipped && <SkipForward size={16} className="text-emerald-500" />}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {/* 簽核按鈕區 */}
                                {request.status === 'rejected' ? (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                        <h4 className="text-red-800 font-bold mb-1">案件已駁回</h4>
                                        <p className="text-red-600 text-sm mb-3">{request.rejection_reason}</p>
                                        {/* 只有申請人本人可以修改被駁回的申請 */}
                                        {request.applicant_id === user?.id && canCreate && (
                                            <button onClick={handleEdit} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center justify-center gap-2">
                                                <Edit2 size={16} /> 修改並重新送出
                                            </button>
                                        )}
                                    </div>
                                ) : request.status === 'revoked' ? (
                                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                                        <h4 className="text-gray-600 font-bold mb-1">案件已撤銷</h4>
                                        {/* 只有申請人本人可以恢復被撤銷的申請 */}
                                        {request.applicant_id === user?.id && canCreate && (
                                            <button onClick={handleEdit} className="mt-3 w-full py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-bold flex items-center justify-center gap-2">
                                                <Edit2 size={16} /> 恢復並重新送出
                                            </button>
                                        )}
                                    </div>
                                ) : request.status === 'completed' ? (
                                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                        <h4 className="text-green-800 font-bold">已結案</h4>
                                        <p className="text-green-600 text-sm">款項已撥付</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* 只有申請人本人可以撤銷申請 (且申請尚未被簽核過) */}
                                        {request.applicant_id === user?.id && canCancel && !hasAnySignature && (
                                            <div className="p-4 bg-white border border-stone-200 rounded-lg shadow-sm">
                                                <h4 className="font-bold text-gray-700 mb-2">管理申請</h4>
                                                <button onClick={handleRevoke} className="w-full py-2.5 px-4 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                    <XCircle size={18} /> 撤銷此申請
                                                </button>
                                                <p className="text-xs text-gray-500 mt-2">💡 提示：申請一旦進入簽核流程後即無法撤銷</p>
                                            </div>
                                        )}

                                        {/* 如果已有簽核紀錄，顯示提示 */}
                                        {request.applicant_id === user?.id && hasAnySignature && request.status !== 'rejected' && request.status !== 'revoked' && (
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                                                <h4 className="font-bold text-amber-800 mb-1 flex items-center gap-2">
                                                    <Shield size={16} /> 申請已進入簽核流程
                                                </h4>
                                                <p className="text-amber-700 text-sm">此申請已有主管簽核紀錄，無法直接撤銷。如需停止申請，請聯絡有權限的主管進行駁回。</p>
                                            </div>
                                        )}

                                        {!currentConfig ? (
                                            <div className="p-4 bg-orange-50 border border-orange-200 text-orange-700 rounded text-sm">⚠️ 狀態異常：{request.status}</div>
                                        ) : canApprove ? (
                                            <div className="bg-white border-2 border-red-100 rounded-xl p-5 shadow-xl shadow-red-500/5 animate-fade-in">
                                                <div className="mb-4 text-center">
                                                    <div className="text-red-800 font-bold text-lg">等待您的簽核</div>
                                                    <div className="text-sm text-red-600">({currentConfig.label})</div>
                                                </div>

                                        {/* --- ✅ [新增] 發票補登區（使用細粒度 RBAC 權限）--- */}
                                        {canManageInvoice && (
                                            <div className="mb-4 bg-orange-50 p-4 rounded-lg border border-orange-200 text-left">
                                                <div className="flex items-center gap-2 mb-3 text-orange-800 font-bold border-b border-orange-200 pb-2">
                                                    <FileText size={18} />
                                                    發票資訊補登/確認
                                                </div>
                                                
                                                {/* 1. 發票狀態切換 */}
                                                <div className="mb-3">
                                                    <label className="block text-xs font-bold text-stone-500 mb-1">發票狀態</label>
                                                    <div className="flex gap-2">
                                                        {/* 這裡使用簡單的 Radio Button 或 Select */}
                                                        <select 
                                                            value={accountantInvoice.hasInvoice}
                                                            onChange={(e) => setAccountantInvoice({...accountantInvoice, hasInvoice: e.target.value})}
                                                            className="w-full p-2 rounded border border-stone-300 text-sm"
                                                        >
                                                            <option value="no_yet">未開 / 後補</option>
                                                            <option value="yes">已附發票 (補登)</option>
                                                            <option value="none">免用發票</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                {/* 2. 當狀態選為「已附發票」時，顯示日期與號碼輸入框 */}
                                                {accountantInvoice.hasInvoice === 'yes' && (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1">
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-500 mb-1">發票日期</label>
                                                            <input 
                                                                type="date" 
                                                                value={accountantInvoice.invoiceDate}
                                                                onChange={(e) => setAccountantInvoice({...accountantInvoice, invoiceDate: e.target.value})}
                                                                className="w-full p-2 rounded border border-stone-300 text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-500 mb-1">發票號碼</label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="例：AB-12345678"
                                                                value={accountantInvoice.invoiceNumber}
                                                                onChange={(e) => setAccountantInvoice({...accountantInvoice, invoiceNumber: e.target.value})}
                                                                className="w-full p-2 rounded border border-stone-300 text-sm font-mono"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                                {canManageFee && (
                                                    <div className="mb-4 bg-white p-3 rounded border border-stone-200">
                                                        <label className="block text-sm font-bold text-gray-700 mb-1">實際手續費 (TWD)</label>
                                                        <input type="number" value={cashierFee} onChange={(e) => setCashierFee(e.target.value)} className="w-full border-gray-300 border rounded p-2 text-right font-mono font-bold text-lg focus:ring-red-500 focus:border-red-500" placeholder="0" />
                                                    </div>
                                                )}
                                                <button onClick={handleApprove} disabled={processing} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg hover:bg-emerald-700 font-bold flex items-center justify-center gap-2 shadow-md mb-3">
                                                    {processing ? <Loader2 className="animate-spin" /> : <ThumbsUp size={18} />} 確認核准 / 下一步
                                                </button>
                                                {/* 🔒 駁回按鈕：需要同時有審核權限和駁回權限 */}
                                                {canReject && (
                                                    <button onClick={handleReject} className="w-full py-2 text-red-500 hover:bg-red-50 border border-red-200 rounded text-sm font-medium">駁回此案件</button>
                                                )}
                                            </div>
                                        ) : (
                                            /* 非申請人且無審核權限：顯示等待提示 */
                                            request.applicant_id !== user?.id && (
                                                <div className="p-4 bg-stone-50 border border-stone-200 text-stone-400 rounded text-center text-sm flex flex-col items-center">
                                                    <Loader2 className="animate-spin mb-1" size={16} /> 等待 <span className="font-bold">{currentConfig.label}</span> 簽核...
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 列印專用簽核表格 */}
                        <div className="hidden print:block print-full-width mt-4">
                            <div className="text-[12pt] font-bold mb-1 border-t border-black pt-2">四、簽核紀錄</div>
                            <table className="signature-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '15%' }}>經辦/申請</th>
                                        <th style={{ width: '17%' }}>單位主管</th>
                                        <th style={{ width: '17%' }}>會計</th>
                                        <th style={{ width: '17%' }}>審核主管</th>
                                        <th style={{ width: '17%' }}>出納</th>
                                        <th style={{ width: '17%' }}>放行主管</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>
                                            <div className="flex flex-col items-center justify-center h-full">
                                                <div className="text-[10pt] mb-1 font-medium">{request.creator_name || '申請人'}</div>
                                                <div className="text-[9pt]">{new Date(request.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </td>
                                        {['sign_manager', 'sign_accountant', 'sign_audit', 'sign_cashier', 'sign_boss'].map(key => {
                                            // 處理自動跳過或無此關卡的情況
                                            const time = request[`${key}_at`];
                                            const url = request[`${key}_url`];
                                            const isAutoSkipped = url === 'AUTO_SKIPPED' || url === 'AUTO_SKIPPED_SELF';

                                            return (
                                                <td key={key}>
                                                    {time ? (
                                                        <div className="flex flex-col items-center justify-center h-full">
                                                            <div className={`font-bold text-sm border-2 border-double px-2 py-0.5 rounded mb-1 ${isAutoSkipped ? 'border-gray-400 text-gray-500' : 'border-black text-black'}`}>
                                                                {isAutoSkipped ? '自動完成' : key === 'sign_cashier' ? '已撥款' : '已核准'}
                                                            </div>
                                                            <div className="text-[9pt]">{new Date(time).toLocaleDateString()}</div>
                                                            <div className="text-[8pt] text-gray-600">{new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        </div>
                                                    ) : (
                                                        request.status === 'rejected' ? <span className="text-xs text-stone-400">--</span> : <span className="text-xs text-stone-300"></span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                            <div className="flex justify-between text-[9pt] mt-1 text-stone-400">
                                <span>系統產生文件 | 六扇門財務系統</span>
                                <span>Page 1 of 1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 附件預覽模態框 */}
            {previewFile && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setPreviewFile(null)}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Paperclip className="text-red-600" size={20} />
                                <h3 className="font-bold text-gray-800">附件預覽</h3>
                                <span className="text-sm text-stone-500 truncate max-w-[200px]">{previewFile.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewFile.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="在新分頁開啟"
                                >
                                    <ExternalLink size={20} />
                                </a>
                                <a
                                    href={previewFile.url}
                                    download
                                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="下載附件"
                                >
                                    <Download size={20} />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setPreviewFile(null)}
                                    className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="關閉"
                                >
                                    <XCircle size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)] bg-gray-100 flex items-center justify-center">
                            {previewFile.url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                                <img
                                    src={previewFile.url}
                                    alt="附件圖片"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                                />
                            ) : previewFile.url.match(/\.pdf$/i) ? (
                                <iframe
                                    src={previewFile.url}
                                    title="PDF 附件"
                                    className="w-full h-[70vh] rounded-lg shadow-lg bg-white"
                                />
                            ) : (
                                <div className="text-center py-12">
                                    <FileText size={64} className="mx-auto text-stone-400 mb-4" />
                                    <p className="text-gray-600 mb-4">此檔案類型無法直接預覽</p>
                                    <div className="flex gap-3 justify-center">
                                        <a
                                            href={previewFile.url}
                                            download
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                                        >
                                            <Download size={16} /> 下載檔案
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}