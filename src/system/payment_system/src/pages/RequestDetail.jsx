import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// 付款系統的基礎路徑
const BASE_PATH = '/systems/payment-approval';
import { ArrowLeft, User, CheckCircle, XCircle, Clock, Shield, DollarSign, Loader2, Building, FileText, CreditCard, Paperclip, MessageSquare, ThumbsUp, Printer, Edit2, X, ExternalLink, Download, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../AuthContext';

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

// ✅ 修正: 統一列印字體大小
const InfoField = ({ label, value, subValue, highlight, className = "" }) => (
    <div className={`mb-4 print:mb-2 ${className}`}>
        {/* Label: 列印時統一 9pt */}
        <label className="block text-xs text-gray-500 uppercase tracking-wider print:text-black print:font-bold print:mb-0 print:text-[9pt]">
            {label}
        </label>

        {/* Value: 列印時統一 10pt (highlight 只加粗，不加大) */}
        <div className={`font-medium text-gray-900 ${highlight
                ? 'text-lg font-bold text-emerald-700 print:text-black print:font-bold' // 螢幕顯示大字，列印顯示標準黑字+粗體
                : ''
            } print:text-[10pt] print:leading-tight`}
        >
            {value}
        </div>

        {/* SubValue: 列印時統一 9pt */}
        {subValue && (
            <div className="text-xs text-gray-500 mt-0.5 print:text-[9pt] print:text-gray-600">
                {subValue}
            </div>
        )}
    </div>
);

// ✅ 修正: 統一標題列印大小為 12pt
const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100 text-emerald-800 font-bold print:mb-2 print:pb-1 print:text-black print:border-black print:text-[12pt]">
        <Icon size={18} className="print:hidden" />
        <h3>{title}</h3>
    </div>
);

export default function RequestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, role } = useAuth()
    const [request, setRequest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const currentRole = role;
    const [cashierFee, setCashierFee] = useState(0);
    const [showAttachmentModal, setShowAttachmentModal] = useState(false);

    useEffect(() => {
        fetchRequestDetail();
        const subscription = supabase
            .channel('request-detail')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'payment_requests', filter: `id=eq.${id}` },
                (payload) => setRequest(payload.new))
            .subscribe();
        return () => { supabase.removeChannel(subscription); };
    }, [id]);

    const fetchRequestDetail = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase.from('payment_requests').select('*').eq('id', id).single();
            if (error) throw error;
            setRequest(data);
            if (data.handling_fee) setCashierFee(data.handling_fee);
        } catch (err) {
            alert('載入失敗: ' + err.message);
            navigate('/systems/payment-approval/dashboard');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            const config = WORKFLOW_CONFIG[request.status];
            if (!config) throw new Error("無效的簽核狀態");

            const updatePayload = {
                status: config.nextStatus,
                current_step: config.nextStep,
                [`${config.fieldPrefix}_at`]: new Date().toISOString(),
                [`${config.fieldPrefix}_url`]: 'BUTTON_APPROVED',
            };

            if (currentRole === 'cashier') {
                updatePayload.handling_fee = Number(cashierFee);
            }

            const { error: dbError } = await supabase.from('payment_requests').update(updatePayload).eq('id', id);
            if (dbError) throw dbError;

            setRequest(prev => ({ ...prev, ...updatePayload }));
            alert(`${config.label} 簽核成功！`);
        } catch (err) {
            console.error(err);
            alert('簽核失敗: ' + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        const reason = prompt("請輸入駁回原因：");
        if (!reason) return;
        setProcessing(true);
        try {
            const { error } = await supabase.from('payment_requests')
                .update({ status: 'rejected', current_step: 0, rejection_reason: reason }).eq('id', id);
            if (error) throw error;
            alert("案件已駁回。");
        } catch (err) {
            alert("駁回失敗: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleRevoke = async () => {
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
    const canApprove = currentConfig && currentRole === currentConfig.role;


    return (
        <div className="min-h-screen bg-gray-100 font-sans pb-20 print:bg-white print:pb-0 print:h-auto print:overflow-visible">

            <style>{`
    @media print {
        @page { 
          size: A4 portrait; 
          margin: 10mm; /* 稍微增加邊距讓版面不要太擠 */
        }
        
        html, body {
            height: 100%;
            margin: 0 !important;
            padding: 0 !important;
            background: white;
            font-size: 10pt; /* 全域字體設為 10pt */
            -webkit-print-color-adjust: exact;
        }

        .no-print, nav, header, button, .sticky-header, .role-switcher { 
            display: none !important; 
        }

        .print-container {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
        }

        .print-grid-4 { 
            display: grid !important; 
            grid-template-columns: repeat(4, 1fr) !important; 
            gap: 8px !important; 
        }
        
        .print-col-span-2 { grid-column: span 2 !important; }
        .print-col-span-4 { grid-column: span 4 !important; }

        .print-section { margin-bottom: 1rem !important; }
        .print-full-width { width: 100% !important; max-width: 100% !important; }

        /* 表格樣式優化 */
        table.signature-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            page-break-inside: avoid;
        }
        table.signature-table th, table.signature-table td {
            border: 1px solid #000;
            padding: 4px;
            text-align: center;
            font-size: 10pt !important; /* 強制表格字體 */
        }
        table.signature-table td { 
            height: 1.8cm; 
        }
        table.signature-table th {
            background-color: #f3f4f6 !important;
            font-weight: bold;
        }
        
        * { overflow: visible !important; }
      }
    `}</style>

            {/* 上帝模式切換列 (列印時隱藏) */}
            <div className="no-print mb-2 text-xs text-gray-400 text-right">
                登入身分: {user?.email} ({STATUS_LABELS[currentRole] || currentRole})
            </div>

            <div className="max-w-5xl mx-auto p-4 sm:p-6 print-container">

                {/* 頁面標題列 */}
                <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button onClick={() => navigate(`${BASE_PATH}/dashboard`)} className="text-gray-500 hover:text-gray-800 flex items-center gap-1 no-print">
                        <ArrowLeft size={20} /> 返回列表
                    </button>

                    <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-sm font-mono">#{String(request.id)}</span>
                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 ${request.status === 'completed' ? 'bg-green-100 text-green-700' :
                                request.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                            {request.status === 'completed' ? <CheckCircle size={16} /> : request.status === 'rejected' ? <XCircle size={16} /> : <Clock size={16} />}
                            {STATUS_LABELS[request.status] || request.status}
                        </div>
                    </div>

                    <button onClick={handlePrint} className="no-print bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded flex items-center gap-2 text-sm font-bold">
                        <Printer size={16} /> 列印 / PDF
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print-container">

                    {/* 主要內容 Grid */}
                    <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 print:block print:p-0">

                        {/* 左側：詳細資訊 (列印時佔滿) */}
                        <div className="lg:col-span-2 space-y-8 print-full-width print:space-y-4">

                            {/* 1. 基本資訊 */}
                            <section className="print-section">
                                <SectionHeader icon={FileText} title="一、基本付款資訊" />
                                <div className="grid grid-cols-2 gap-4 print-grid-4">

                                    <InfoField label="支付品牌" value={request.brand} />
                                    <InfoField label="支付門店" value={request.store} />
                                    <InfoField label="申請日期" value={request.apply_date} />
                                    <InfoField label="付款日期" value={request.payment_date} />

                                    <div className="col-span-2 print-col-span-2">
                                        <InfoField label="金額" value={request.amount} highlight />
                                    </div>

                                    <div className="col-span-2 print-col-span-4">
                                        <InfoField label="付款內容" value={request.content} />
                                    </div>
                                </div>
                            </section>

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

                            {request.payment_method === 'transfer' && (
                                <section className="print-section">
                                    <SectionHeader icon={Building} title="三、銀行帳戶資料" />
                                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded border border-gray-100 print:bg-white print:border-0 print:p-0 print-grid-4">

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

                            <section className="print-section">
                                <SectionHeader icon={Paperclip} title="四、附件與發票" />
                                <div className="grid grid-cols-2 gap-4 print-grid-4">
                                    <div className="print-col-span-2">
                                        <InfoField
                                            label="發票狀態"
                                            value={request.has_invoice === 'yes' ? '已附發票' : request.has_invoice === 'no_yet' ? '未開/後補' : '免用發票'}
                                            subValue={request.invoice_date ? `發票日期: ${request.invoice_date}` : ''}
                                        />
                                    </div>
                                    <div className="col-span-1 print-col-span-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 print:text-[9pt] print:text-black">附件檔案</label>
                                        {request.has_attachment && request.attachment_url ? (
                                            <div className="space-y-2 no-print">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowAttachmentModal(true)}
                                                    className="text-emerald-600 hover:text-emerald-700 underline text-sm cursor-pointer flex items-center gap-1 transition-colors"
                                                >
                                                    <Paperclip size={14} /> 檢視附件
                                                </button>
                                                <div className="flex gap-2">
                                                    <a
                                                        href={request.attachment_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1"
                                                    >
                                                        <ExternalLink size={12} /> 新分頁開啟
                                                    </a>
                                                    <a
                                                        href={request.attachment_url}
                                                        download
                                                        className="text-xs text-gray-500 hover:text-gray-600 flex items-center gap-1"
                                                    >
                                                        <Download size={12} /> 下載
                                                    </a>
                                                </div>
                                            </div>
                                        ) : <div className="text-gray-400 text-sm print:text-[10pt]">無附件</div>}
                                        {request.has_attachment && <div className="hidden print:block text-sm text-black print:text-[10pt]">[附件已上傳: {request.attachment_desc || '無備註'}]</div>}
                                        {request.attachment_desc && <div className="text-xs text-gray-400 mt-1 no-print">{request.attachment_desc}</div>}
                                    </div>
                                </div>
                            </section>

                            {request.remarks && (
                                <section className="print-section">
                                    <SectionHeader icon={MessageSquare} title="五、備註" />
                                    <div className="text-gray-700 bg-yellow-50 p-3 rounded text-sm border border-yellow-100 print:bg-white print:border-0 print:p-0 print:text-[10pt]">
                                        {request.remarks}
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* 右側：簽核操作區 */}
                        <div className="lg:col-span-1 no-print">
                            <div className="sticky top-24 space-y-6">

                                <div className="bg-white border-2 border-gray-100 rounded-xl p-4 shadow-sm">
                                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2"><Shield size={18} className="text-emerald-600" /> 簽核進度</h3>
                                    <div className="space-y-4">
                                        {[
                                            { key: 'sign_manager', label: '單位主管', roleCode: 'unit_manager' },
                                            { key: 'sign_accountant', label: '會計', roleCode: 'accountant' },
                                            { key: 'sign_audit', label: '審核主管', roleCode: 'audit_manager' },
                                            { key: 'sign_cashier', label: '出納', roleCode: 'cashier' },
                                            { key: 'sign_boss', label: '放行主管', roleCode: 'boss' },
                                        ].map((step) => {
                                            const url = request[`${step.key}_url`];
                                            const time = request[`${step.key}_at`];
                                            const isCurrent = currentConfig?.role === step.roleCode && request.status !== 'rejected' && request.status !== 'completed';

                                            return (
                                                <div key={step.key} className={`relative pl-6 pb-4 border-l-2 ${url ? 'border-emerald-500' : 'border-gray-200'} last:border-0`}>
                                                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${url ? 'bg-emerald-500 border-emerald-500' : isCurrent ? 'bg-blue-500 border-blue-500 animate-pulse' : 'bg-white border-gray-300'}`}></div>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className={`text-sm font-bold ${isCurrent ? 'text-blue-600' : 'text-gray-700'}`}>{step.label}</div>
                                                            {time && <div className="text-[10px] text-gray-400">{new Date(time).toLocaleString()}</div>}
                                                        </div>
                                                        {url && <CheckCircle size={16} className="text-emerald-500" />}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>

                                {request.status === 'rejected' ? (
                                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                        <h4 className="text-red-800 font-bold mb-1">案件已駁回</h4>
                                        <p className="text-red-600 text-sm mb-3">{request.rejection_reason}</p>

                                        {currentRole === 'staff' && (
                                            <button onClick={handleEdit} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center justify-center gap-2">
                                                <Edit2 size={16} /> 修改並重新送出
                                            </button>
                                        )}
                                    </div>
                                ) : request.status === 'revoked' ? (
                                    <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                                        <h4 className="text-gray-600 font-bold mb-1">案件已撤銷</h4>

                                        {currentRole === 'staff' && (
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
                                        {currentRole === 'staff' && (
                                            <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                                                <h4 className="font-bold text-gray-700 mb-2">管理申請</h4>
                                                <button onClick={handleRevoke} className="w-full py-2.5 px-4 bg-red-600 text-white hover:bg-red-700 rounded-md text-sm font-bold transition-colors flex items-center justify-center gap-2 shadow-sm">
                                                    <XCircle size={18} /> 撤銷此申請
                                                </button>
                                            </div>
                                        )}

                                        {!currentConfig ? (
                                            <div className="p-4 bg-orange-50 border border-orange-200 text-orange-700 rounded text-sm">⚠️ 狀態異常：{request.status}</div>
                                        ) : canApprove ? (
                                            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 animate-fade-in shadow-lg">
                                                <div className="mb-4 text-center">
                                                    <div className="text-emerald-800 font-bold text-lg">等待您的簽核</div>
                                                    <div className="text-sm text-emerald-600">({currentConfig.label})</div>
                                                </div>
                                                {currentRole === 'cashier' && (
                                                    <div className="mb-4 bg-white p-3 rounded border border-emerald-200">
                                                        <label className="block text-sm font-bold text-gray-700 mb-1">實際手續費 (TWD)</label>
                                                        <input type="number" value={cashierFee} onChange={(e) => setCashierFee(e.target.value)} className="w-full border-gray-300 border rounded p-2 text-right font-mono font-bold text-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="0" />
                                                    </div>
                                                )}
                                                <button onClick={handleApprove} disabled={processing} className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-bold flex items-center justify-center gap-2 shadow-md mb-3">
                                                    {processing ? <Loader2 className="animate-spin" /> : <ThumbsUp size={18} />} 確認核准 / 下一步
                                                </button>
                                                <button onClick={handleReject} className="w-full py-2 text-red-500 hover:bg-red-50 border border-red-200 rounded text-sm font-medium">駁回此案件</button>
                                            </div>
                                        ) : (
                                            currentRole !== 'staff' && (
                                                <div className="p-4 bg-gray-50 border border-gray-200 text-gray-500 rounded text-center text-sm flex flex-col items-center">
                                                    <Loader2 className="animate-spin mb-1" size={16} /> 等待 <span className="font-bold">{currentConfig.label}</span> 簽核...
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ✅ Task 5: 列印專用的簽核表格 */}
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
                                        {['sign_manager', 'sign_accountant', 'sign_audit', 'sign_cashier', 'sign_boss'].map(key => (
                                            <td key={key}>
                                                {request[`${key}_at`] ? (
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <div className="font-bold text-black text-sm border-2 border-double border-black px-2 py-0.5 rounded mb-1">
                                                            {key === 'sign_cashier' ? '已撥款' : '已核准'}
                                                        </div>
                                                        <div className="text-[9pt]">{new Date(request[`${key}_at`]).toLocaleDateString()}</div>
                                                        <div className="text-[8pt] text-gray-600">{new Date(request[`${key}_at`]).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                ) : (
                                                    request.status === 'rejected' ? <span className="text-xs text-gray-400">--</span> : ''
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                            <div className="flex justify-between text-[9pt] mt-1 text-gray-500">
                                <span>系統產生文件 | 六扇門財務系統</span>
                                <span>Page 1 of 1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 附件預覽模態框 */}
            {showAttachmentModal && request.attachment_url && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
                    onClick={() => setShowAttachmentModal(false)}
                >
                    <div
                        className="relative bg-white rounded-xl shadow-2xl max-w-4xl max-h-[90vh] w-full overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 模態框標題列 */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center gap-2">
                                <Paperclip className="text-emerald-600" size={20} />
                                <h3 className="font-bold text-gray-800">附件預覽</h3>
                                {request.attachment_desc && (
                                    <span className="text-sm text-gray-500">- {request.attachment_desc}</span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <a
                                    href={request.attachment_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="在新分頁開啟"
                                >
                                    <ExternalLink size={20} />
                                </a>
                                <a
                                    href={request.attachment_url}
                                    download
                                    className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                    title="下載附件"
                                >
                                    <Download size={20} />
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setShowAttachmentModal(false)}
                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="關閉"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* 附件內容 */}
                        <div className="p-4 overflow-auto max-h-[calc(90vh-80px)] bg-gray-100 flex items-center justify-center">
                            {request.attachment_url.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i) ? (
                                // 圖片預覽
                                <img
                                    src={request.attachment_url}
                                    alt="附件圖片"
                                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                                />
                            ) : request.attachment_url.match(/\.pdf$/i) ? (
                                // PDF 預覽
                                <iframe
                                    src={request.attachment_url}
                                    title="PDF 附件"
                                    className="w-full h-[70vh] rounded-lg shadow-lg bg-white"
                                />
                            ) : (
                                // 其他檔案類型
                                <div className="text-center py-12">
                                    <FileText size={64} className="mx-auto text-gray-400 mb-4" />
                                    <p className="text-gray-600 mb-4">此檔案類型無法直接預覽</p>
                                    <div className="flex gap-3 justify-center">
                                        <a
                                            href={request.attachment_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                                        >
                                            <ExternalLink size={16} /> 在新分頁開啟
                                        </a>
                                        <a
                                            href={request.attachment_url}
                                            download
                                            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 transition-colors"
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