import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'; 
import { useNavigate, useLocation } from 'react-router-dom';

// 付款系統的基礎路徑
const BASE_PATH = '/systems/payment-approval';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../AuthContext'; 
import SearchableSelect from '../components/SearchableSelect'; 
import {
    Save,
    CheckCircle,
    FileText,
    Building,
    CreditCard,
    User,
    Paperclip,
    MessageSquare,
    ShieldCheck,
    AlertCircle,
    UploadCloud,
    Loader2,
    Camera,
    X,
    Image as ImageIcon,
    ChevronLeft,
    RotateCcw,
    Wallet
} from 'lucide-react';

const SectionTitle = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200 text-stone-700 font-bold text-lg">
        <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
           <Icon size={20} />
        </div>
        <h3>{title}</h3>
    </div>
);

export default function ApplyForm() {
    const navigate = useNavigate(); 
    const location = useLocation();
    const sigCanvas = useRef({});
    const { user } = useAuth();
    
    // 用來重置簽名的函式
    const clearSignature = () => {
        sigCanvas.current.clear();
    };
    const [loading, setLoading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [editId, setEditId] = useState(null);
    // --- 資料列表狀態 ---
    const [bankList, setBankList] = useState([]);
    const [branchList, setBranchList] = useState([]);

    // [新增] 品牌與門店列表狀態
    const [brandList, setBrandList] = useState([]);
    const [storeList, setStoreList] = useState([]);

    // --- 載入狀態 ---
    const [fetchingBanks, setFetchingBanks] = useState(false);
    const [fetchingBranches, setFetchingBranches] = useState(false);
    // [新增] 品牌與門店載入狀態
    const [fetchingBrands, setFetchingBrands] = useState(false);
    const [fetchingStores, setFetchingStores] = useState(false);

    const [formData, setFormData] = useState({
        brand: '',       // 存品牌名稱 (給 DB 寫入用)
        brandId: '',     // [新增] 存品牌 ID (給前端關聯查詢用)
        store: '',       // 存門店名稱
        paymentDate: '',
        payeeName: '',
        content: '',
        taxType: 'tax_included',
        amount: '',
        paymentMethod: 'transfer',
        paymentMethodOther: '',
        handlingFee: 0,
        bankName: '',
        bankCode: '',
        bankBranch: '',
        accountNumber: '',
        branchCode: '',
        attachment: null,
        attachmentDesc: '',
        hasInvoice: 'none',
        invoiceDate: '',
        remarks: '',
        creatorName: '',
        applyDate: new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Taipei',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(new Date())
    });

    // ==========================================
    // 1. 資料載入區 (Banks & Brands)
    // ==========================================
    
    // --- 修改：初始載入填單人名稱 (優先抓取 employees 資料表) ---
    useEffect(() => {
        const fetchCreatorName = async () => {
            if (user && !editId) { // 只有在「新增模式」時自動帶入，編輯模式保留原記錄
                // 預設先拿 Auth 的資料
                let finalName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';

                try {
                    // 嘗試去 employees 表格撈取對應的姓名
                    const { data, error } = await supabase
                        .from('employees')
                        .select('name')
                        .eq('user_id', user.id)
                        .single();
                    
                    if (data?.name) {
                        finalName = data.name;
                    }
                } catch (err) {
                    console.error('Error fetching employee name:', err);
                }

                setFormData(prev => ({
                    ...prev,
                    creatorName: finalName,
                }));
            }
        };

        fetchCreatorName();
    }, [user, editId]);
    // -----------------------------------------------------------

    // --- 1-1. 初始載入：抓取銀行清單 ---
    useEffect(() => {
        const fetchBanks = async () => {
            setFetchingBanks(true);
            try {
                const { data, error } = await supabase
                    .from('banks')
                    .select('bank_code, bank_name')
                    .order('bank_code', { ascending: true });
                if (error) throw error;
                if (data) setBankList(data);
            } catch (err) {
                console.error('抓取銀行列表失敗:', err);
            } finally {
                setFetchingBanks(false);
            }
        };
        fetchBanks();
    }, []);

    // --- 1-2. [新增] 初始載入：從 Supabase 抓取品牌清單 (Brands) ---
    useEffect(() => {
        const fetchBrands = async () => {
            setFetchingBrands(true);
            try {
                // 從 brands 資料表抓取 id 與 name
                const { data, error } = await supabase
                    .from('brands')
                    .select('id, name')
                    .order('id', { ascending: true }); // 或依 name 排序

                if (error) throw error;
                if (data) setBrandList(data);
            } catch (err) {
                console.error('抓取品牌列表失敗:', err);
                setErrorMsg('無法載入品牌列表，請檢查網路或資料庫連線');
            } finally {
                setFetchingBrands(false);
            }
        };
        fetchBrands();
    }, []);

    // ==========================================
    // 2. 連動查詢區 (Branches & Stores)
    // ==========================================

    // --- 2-1. 當銀行改變時：抓取分行 ---
    useEffect(() => {
        const fetchBranches = async () => {
            if (!formData.bankCode) {
                setBranchList([]);
                return;
            }
            setFetchingBranches(true);
            try {
                const searchBankCode = String(formData.bankCode);
                const { data, error } = await supabase
                    .from('branches')
                    .select('branch_name, branch_code')
                    .eq('bank_code', searchBankCode)
                    .order('branch_code', { ascending: true });

                if (error) throw error;
                setBranchList(data && data.length > 0 ? data : []);
            } catch (err) {
                console.error('查詢分行失敗:', err);
                setBranchList([]);
            } finally {
                setFetchingBranches(false);
            }
        };
        fetchBranches();
    }, [formData.bankCode]);

    // --- 2-2. [新增] 當品牌改變 (brandId) 時：從 Supabase 抓取門店 (Stores) ---
    useEffect(() => {
        const fetchStores = async () => {
            // 如果沒有選品牌 ID，清空門店列表
            if (!formData.brandId) {
                setStoreList([]);
                return;
            }

            setFetchingStores(true);
            try {
                // 根據 brand_id 篩選 stores
                const { data, error } = await supabase
                    .from('stores')
                    .select('id, name')
                    .eq('brand_id', formData.brandId)
                    .eq('is_active', true) // 只撈取啟用中的店點 (可選)
                    .order('name', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    setStoreList(data);
                } else {
                    setStoreList([]);
                    console.log(`品牌 ID ${formData.brandId} 查無門店資料`);
                }
            } catch (err) {
                console.error('查詢門店失敗:', err);
                setStoreList([]);
            } finally {
                setFetchingStores(false);
            }
        };

        fetchStores();
    }, [formData.brandId]);
    useEffect(() => {
        if (location.state && location.state.requestData) {
            const old = location.state.requestData;
            setEditId(old.id);

            // 將舊資料填回表單
            setFormData(prev => ({
                ...prev,
                brand: old.brand,
                store: old.store,
                paymentDate: old.payment_date,
                payeeName: old.payee_name,
                content: old.content,
                taxType: old.tax_type,
                amount: old.amount,
                paymentMethod: old.payment_method,
                paymentMethodOther: old.payment_method_other || '',
                handlingFee: old.handling_fee || 0,
                bankName: old.bank_name || '',
                bankCode: old.bank_code || '',
                bankBranch: old.bank_branch || '',
                accountNumber: old.account_number || '',
                branchCode: old.branch_code || '',
                attachmentUrl: old.attachment_url, // ✅ 保留舊連結
                attachmentDesc: old.attachment_desc || '',
                hasInvoice: old.has_invoice,
                invoiceDate: old.invoice_date || '',
                remarks: old.remarks || '',
                creatorName: old.creator_name,
                applyDate: old.apply_date
            }));
        }
    }, [location.state]);

    // ✅ 4. 新增：編輯模式下自動對應 Brand ID (放在上面的 useEffect 後)
    useEffect(() => {
        if (editId && brandList.length > 0 && formData.brand && !formData.brandId) {
            const found = brandList.find(b => b.name === formData.brand);
            if (found) setFormData(prev => ({ ...prev, brandId: found.id }));
        }
    }, [brandList, editId, formData.brand]);

    // ==========================================
    // 3. 事件處理區
    // ==========================================

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // [修改] 處理品牌變更
    // UI 上 <select> 的 value 綁定的是 brandId (為了查詢)，
    // 但我們同時要存 brand name (為了寫入申請單 DB)
    const handleBrandChange = (e) => {
        const selectedBrandId = e.target.value;

        // 從 brandList 找出對應的品牌物件，取得名稱
        const selectedBrandObj = brandList.find(b => String(b.id) === selectedBrandId);
        const selectedBrandName = selectedBrandObj ? selectedBrandObj.name : '';

        setFormData(prev => ({
            ...prev,
            brandId: selectedBrandId, // 存 ID 用來撈門店
            brand: selectedBrandName, // 存名稱用來顯示與提交
            store: ''                 // 品牌換了，門店要重置
        }));
    };
    // --- 檔案處理邏輯 ---

    // 1. 處理檔案選取 (共用邏輯)
    const processFile = (file) => {
        if (!file) return;

        // 檢查大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert('檔案大小超過 5MB 限制');
            return;
        }

        // 存入 State
        setFormData(prev => ({ ...prev, attachment: file }));
    };

    // 2. 傳統 input onChange
    const handleFileChange = (e) => {
        processFile(e.target.files[0]);
    };

    // 3. 拖曳相關事件
    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        processFile(file);
    };

    // 4. 移除檔案
    const removeFile = () => {
        setFormData(prev => ({ ...prev, attachment: null }));
        // 清空 input 讓同個檔案可以再選一次 (非必要但體驗較好)
        const fileInput = document.getElementById('file-upload');
        if (fileInput) fileInput.value = '';
    };


    const handleBankChange = (e) => {
        const selectedBankCode = e.target.value;
        const selectedBank = bankList.find(b => b.bank_code === selectedBankCode);
        const name = selectedBank ? selectedBank.bank_name : '';

        setFormData(prev => ({
            ...prev,
            bankName: name,
            bankCode: selectedBankCode,
            bankBranch: '',
            branchCode: ''
        }));
    };

    const handleBranchSelect = (e) => {
        const selectedBranchName = e.target.value;
        const target = branchList.find(b => b.branch_name === selectedBranchName);

        setFormData(prev => ({
            ...prev,
            bankBranch: selectedBranchName,
            branchCode: target ? target.branch_code : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // ✅ 5. 安全檢查：如果沒有 user (可能登出或過期)，阻止送出
        if (!user) {
            alert('您的登入時效已過，請重新登入後再試。');
            navigate('/login');
            return;
        }
        setLoading(true);
        setErrorMsg('');
        setSuccessMsg('');

        try {
            // 1. 處理簽名 (針對現金付款)
            let signatureUrl = null;
            if (formData.paymentMethod === 'cash') {
                // 如果簽名板有內容 (使用者有簽名)
                if (!sigCanvas.current.isEmpty()) {
                    const sigDataUrl = sigCanvas.current.toDataURL('image/png');
                    const sigBlob = await (await fetch(sigDataUrl)).blob();
                    const sigFileName = `sig_${Date.now()}_${Math.random().toString(36).substring(2)}.png`;

                    const { error: sigErr } = await supabase.storage
                        .from('attachments')
                        .upload(sigFileName, sigBlob);

                    if (sigErr) throw sigErr;

                    const { data: sigData } = supabase.storage
                        .from('attachments')
                        .getPublicUrl(sigFileName);

                    signatureUrl = sigData.publicUrl;
                } else if (!editId) {
                    // 如果是「新增模式」且「未簽名」，則阻擋提交
                    alert('⚠️ 選擇現金付款，請務必在下方簽名！');
                    setLoading(false);
                    return;
                }
                // 注意：如果是「編輯模式」且「未重簽」，則 signatureUrl 為 null，
                // 後續 payload 邏輯會自動不更新 signature_url 欄位，從而保留舊簽名。
            }

            // 2. 處理附件上傳
            // 預設使用舊有的連結 (如果是編輯模式)
            let finalAttachmentUrl = formData.attachmentUrl;

            if (formData.attachment) {
                // 如果使用者選了新檔案 -> 上傳並覆蓋連結
                const file = formData.attachment;
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('attachments')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('attachments')
                    .getPublicUrl(fileName);

                finalAttachmentUrl = data.publicUrl;
            }

            const isTransfer = formData.paymentMethod === 'transfer';

            // 3. 準備寫入資料庫的物件
            const dbPayload = {
                applicant_id: user.id,
                brand: formData.brand,
                store: formData.store,
                payment_date: formData.paymentDate,
                payee_name: formData.paymentMethod === 'transfer' ? formData.payeeName : '',
                content: formData.content,
                tax_type: formData.taxType,
                amount: Number(formData.amount),
                payment_method: formData.paymentMethod,
                payment_method_other: formData.paymentMethodOther,
                handling_fee: 0, // 申請/重送時，手續費歸零，由出納後續填寫

                // 銀行資料清理邏輯 (若是現金，清空銀行欄位)
                bank_name: isTransfer ? formData.bankName : '',
                bank_code: isTransfer ? formData.bankCode : '',
                bank_branch: isTransfer ? formData.bankBranch : '',
                account_number: isTransfer ? formData.accountNumber : '',
                branch_code: isTransfer ? formData.branchCode : '',

                has_attachment: !!finalAttachmentUrl,
                attachment_url: finalAttachmentUrl,
                attachment_desc: formData.attachmentDesc,

                // 動態加入 signature_url：只有當有新簽名時才更新，否則不傳此欄位(保留舊值)
                ...(signatureUrl ? { signature_url: signatureUrl } : {}),

                has_invoice: formData.hasInvoice,
                invoice_date: formData.invoiceDate ? formData.invoiceDate : null,
                remarks: formData.remarks,
                creator_name: formData.creatorName,

                // ✅ 核心修改：無論是新增或修改，狀態都重置為第一關
                status: 'pending_unit_manager',
                rejection_reason: null, // 清空駁回原因

                // ✅ 核心修改：如果是修改重送，必須清空所有之前的簽核紀錄與時間
                sign_manager_at: null, sign_manager_url: null,
                sign_accountant_at: null, sign_accountant_url: null,
                sign_audit_at: null, sign_audit_url: null,
                sign_cashier_at: null, sign_cashier_url: null,
                sign_boss_at: null, sign_boss_url: null,
                current_step: 1
            };

            if (editId) {
                // --- [編輯模式] Update ---
                const { error } = await supabase
                    .from('payment_requests')
                    .update(dbPayload)
                    .eq('id', editId);

                if (error) throw error;
                alert('✅ 案件已重新提交！簽核流程將重新開始。');
            } else {
                // --- [新增模式] Insert ---
                // 新增模式需要補上 apply_date (編輯時通常不改申請日，或視需求更新)
                // 這裡選擇沿用表單上的日期 (預設是今天)
                dbPayload.apply_date = formData.applyDate;

                const { error } = await supabase
                    .from('payment_requests')
                    .insert([dbPayload]);

                if (error) throw error;
                alert('✅ 提交成功！');
            }

            // 成功後導回總覽
            navigate(`${BASE_PATH}/dashboard`);

        } catch (error) {
            console.error("Error:", error);
            setErrorMsg(`提交失敗：${error.message || '未知錯誤'}`);
        } finally {
            setLoading(false);
        }
    };

        return (
            <div className="min-h-screen bg-stone-50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-stone-200">

            <div className="bg-white px-4 py-4 sm:px-6 sm:py-5 border-b border-stone-100 flex justify-between items-center relative">
                <button onClick={() => navigate(`${BASE_PATH}/dashboard`)} className="mr-3 p-2 hover:bg-stone-50 text-stone-500 rounded-full transition-colors md:hidden">
                    <ChevronLeft size={24} />
                </button>
                <div className="flex-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-800 flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                            <Wallet size={24} />
                        </div>
                        {editId ? '編輯 / 重送付款單' : '付款單申請'}
                    </h1>
                    <p className="text-stone-400 text-xs sm:text-sm mt-1 ml-1">
                        {editId ? `Editing Request #${editId}` : 'Create New Payment Request'}
                    </p>
                </div>
            </div>

                {successMsg && (
                    <div className="bg-red-50 border-l-4 border-green-500 text-green-700 p-4 m-6 rounded shadow-sm flex items-center whitespace-pre-line">
                        <CheckCircle className="mr-2" />
                        <p>{successMsg}</p>
                    </div>
                )}
                {errorMsg && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 m-6 rounded shadow-sm flex items-center">
                        <AlertCircle className="mr-2" />
                        <p>{errorMsg}</p>
                    </div>
                )}
                {editId && (
                    <div className="bg-blue-50 border-b border-blue-200 text-blue-800 px-6 py-3 flex items-center gap-2 text-sm font-bold">
                        <RotateCcw size={16} /> 您正在修改舊案件 (單號 #{editId})，送出後將重新開始簽核流程。
                    </div>
                )}
                <form onSubmit={handleSubmit} className="p-3 md:p-8 space-y-6 md:space-y-8">

                    {/* 一、基本付款資訊 */}
                    <section className="bg-stone-50/50 p-4 rounded-lg border border-stone-200/60">
                        <SectionTitle icon={FileText} title="一、基本付款資訊" />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                            {/* 1. 支付品牌 */}
                            <div className="col-span-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                                    <span>支付品牌 <span className="text-red-500">*</span></span>
                                    {fetchingBrands && <span className="text-red-500 flex items-center text-xs"><Loader2 className="animate-spin h-3 w-3 mr-1" />載入中...</span>}
                                </label>
                                <select
                                    name="brandId"
                                    value={formData.brandId}
                                    onChange={handleBrandChange}
                                    required
                                    className="w-full rounded-md border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                                >
                                    <option value="">請選擇品牌</option>
                                    {brandList.map(brand => (
                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 2. 支付門店 (可搜尋) */}
                            <div className="col-span-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                                    <span>支付門店 <span className="text-red-500">*</span></span>
                                    {fetchingStores && <span className="text-red-500 flex items-center text-xs"><Loader2 className="animate-spin h-3 w-3 mr-1" />查詢中...</span>}
                                </label>
                                <SearchableSelect
                                    options={storeList.map(store => ({
                                        value: store.name,
                                        label: store.name
                                    }))}
                                    value={formData.store}
                                    onChange={(value) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            store: value
                                        }));
                                    }}
                                    placeholder={!formData.brandId ? '請先選擇品牌' : '請選擇或搜尋門店'}
                                    disabled={!formData.brandId}
                                    loading={fetchingStores}
                                    loadingText="查詢門店資料中..."
                                    required
                                    emptyText="無門店資料"
                                />
                            </div>

                            {/* 3. 付款日期 */}
                            <div className="col-span-1 flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    付款日期 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="paymentDate"
                                    value={formData.paymentDate}
                                    onChange={handleChange}
                                    required
                                    className="w-full rounded-md border-stone-200 p-2.5 border bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                                />
                            </div>

                            {/* ❌ Task 6: 移除這裡的「受款戶名」輸入框，移到下方第三區塊 */}

                            {/* 5. 付款內容說明 (跨兩欄) */}
                            <div className="col-span-1 md:col-span-2 flex flex-col">
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    付款內容及說明 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="content"
                                    value={formData.content}
                                    onChange={handleChange}
                                    rows={3}
                                    placeholder="例如：11月租金、RFY-2011 車貸..."
                                    required
                                    className="w-full rounded-md border-stone-200 p-2.5 border bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                                />
                            </div>

{/* 6. 金額與稅別 */}
                            {/* 🔴 外層容器：完全無框設計，只用底線區隔 */}
                            <div className="col-span-1 md:col-span-2 bg-transparent py-4"> 
                                <div className="flex flex-col md:flex-row gap-6 md:items-center">
                                    
                                    {/* 選項區 */}
                                    <div className="flex gap-6 shrink-0">
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="radio"
                                                name="taxType"
                                                value="tax_included"
                                                checked={formData.taxType === 'tax_included'}
                                                onChange={handleChange}
                                                className="w-5 h-5 text-red-600 focus:ring-red-500 border-stone-300"
                                            />
                                            <span className="text-base font-medium text-stone-700 group-hover:text-red-600 transition-colors">含稅</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer group">
                                            <input
                                                type="radio"
                                                name="taxType"
                                                value="tax_excluded"
                                                checked={formData.taxType === 'tax_excluded'}
                                                onChange={handleChange}
                                                className="w-5 h-5 text-red-600 focus:ring-red-500 border-stone-300"
                                            />
                                            <span className="text-base font-medium text-stone-700 group-hover:text-red-600 transition-colors">未稅</span>
                                        </label>
                                    </div>

                                    {/* 金額輸入區 */}
                                    <div className="flex-1 w-full relative mt-2 md:mt-0">
                                        <label className="absolute -top-2.5 left-0 text-xs text-stone-400 font-bold bg-white px-1">
                                            付款金額 (TWD)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-0 bottom-2 text-2xl font-bold text-stone-300 pl-1">$</span>
                                            <input
                                                type="number"
                                                name="amount"
                                                value={formData.amount}
                                                onChange={handleChange}
                                                placeholder="0"
                                                required
                                                // 🔴 關鍵修改：
                                                // 1. border-0 border-b-2: 確保只有下邊框
                                                // 2. focus:ring-0: 移除點擊時的藍色光暈
                                                // 3. outline-none: 移除預設外框
                                                className="w-full pl-8 pr-2 py-1 text-3xl font-bold text-stone-800 border-0 border-b-2 border-stone-200 focus:border-red-600 focus:ring-0 outline-none bg-transparent placeholder-stone-200 transition-colors font-mono shadow-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </section>

                    {/* 二、付款方式 */}
                    <section className="bg-stone-50/50 p-4 rounded-lg border border-stone-200/60">
                        <SectionTitle icon={CreditCard} title="二、付款方式" />
                        <div className="space-y-4">
                            <div className="flex flex-wrap gap-6">
                                {['transfer', 'cash', 'other'].map((method) => (
                                    <label key={method} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="paymentMethod"
                                            value={method}
                                            checked={formData.paymentMethod === method}
                                            onChange={handleChange}
                                            className="text-red-500 focus:ring-red-500"
                                        />
                                        <span className="text-sm font-medium">
                                            {method === 'transfer' ? '網銀轉帳' : method === 'cash' ? '現金' : '其他'}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            {formData.paymentMethod === 'other' && (
                                <input
                                    type="text"
                                    name="paymentMethodOther"
                                    value={formData.paymentMethodOther}
                                    onChange={handleChange}
                                    required
                                    placeholder="請說明付款方式"
                                    className="w-full md:w-1/2 rounded-md border-stone-200 p-2 border text-sm"
                                />
                            )}

                            {/* ❌ Task 4: 移除「手續費」輸入框 (這裡不再顯示) */}

                            {/* ✅ 新增：現金簽名區塊 */}
                            {formData.paymentMethod === 'cash' && (
                                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg animate-in fade-in zoom-in duration-300">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-bold text-orange-800 flex items-center gap-1">
                                            <span className="text-red-500">*</span> 請在此簽名確認 (現金簽收)
                                        </label>
                                        <button
                                            type="button"
                                            onClick={clearSignature}
                                            className="text-xs text-gray-500 underline hover:text-red-600"
                                        >
                                            清除重簽
                                        </button>
                                    </div>

                                    {/* 簽名板容器 */}
                                    <div className="border-2 border-orange-200 border-dashed rounded-md bg-white overflow-hidden touch-none">
                                        <SignatureCanvas
                                            ref={sigCanvas}
                                            penColor="black"
                                            canvasProps={{
                                                className: 'w-full h-40', // Tailwind class 控制寬高
                                                style: { width: '100%', height: '160px' } // 確保 RWD 寬度正確
                                            }}
                                        />
                                    </div>
                                    <p className="text-xs text-orange-600 mt-1">請用手指或滑鼠在框內簽名</p>
                                </div>
                            )}

                        </div>
                    </section>

                    {/* ✅ Task 6: 三、受款與銀行資料 (合併顯示受款戶名) */}
                    {/* ✅ 修改：只有在「網銀轉帳」時，才顯示整個第三區塊 (包含受款戶名與銀行資料) */}
                    {formData.paymentMethod === 'transfer' && (
                        <section className="bg-stone-50/50 p-4 rounded-lg border border-stone-200/60 animate-in slide-in-from-top-5 duration-300">
                            <SectionTitle icon={Building} title="三、受款銀行資料" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                                {/* 1. 受款戶名 */}
                                <div className="col-span-1 md:col-span-2 flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        受款戶名 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="payeeName"
                                        value={formData.payeeName}
                                        onChange={handleChange}
                                        placeholder="請輸入完整戶名"
                                        required
                                        className="w-full rounded-md border-stone-200 p-2.5 border bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                                    />
                                </div>

                                {/* 2. 受款銀行 (可搜尋) */}
                                <div className="col-span-1 flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                                        <span>受款銀行 <span className="text-red-500">*</span></span>
                                        {fetchingBanks && <span className="text-red-500 flex items-center text-xs"><Loader2 className="animate-spin h-3 w-3 mr-1" />載入中...</span>}
                                    </label>
                                    <SearchableSelect
                                        options={bankList.map(bank => ({
                                            value: bank.bank_code,
                                            label: bank.bank_name,
                                            subLabel: bank.bank_code
                                        }))}
                                        value={formData.bankCode}
                                        onChange={(value) => {
                                            const selectedBank = bankList.find(b => b.bank_code === value);
                                            setFormData(prev => ({
                                                ...prev,
                                                bankName: selectedBank ? selectedBank.bank_name : '',
                                                bankCode: value,
                                                bankBranch: '',
                                                branchCode: ''
                                            }));
                                        }}
                                        placeholder="請選擇或搜尋銀行"
                                        loading={fetchingBanks}
                                        loadingText="載入銀行資料中..."
                                        required
                                        emptyText="無銀行資料"
                                    />
                                </div>

                                {/* 3. 受款分行 (可搜尋) */}
                                <div className="col-span-1 flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                                        <span>受款分行</span>
                                        {fetchingBranches && <span className="text-red-500 flex items-center text-xs"><Loader2 className="animate-spin h-3 w-3 mr-1" />查詢中...</span>}
                                    </label>

                                    {branchList.length > 0 ? (
                                        <SearchableSelect
                                            options={branchList.map(branch => ({
                                                value: branch.branch_name,
                                                label: branch.branch_name,
                                                subLabel: branch.branch_code || ''
                                            }))}
                                            value={formData.bankBranch}
                                            onChange={(value) => {
                                                const target = branchList.find(b => b.branch_name === value);
                                                setFormData(prev => ({
                                                    ...prev,
                                                    bankBranch: value,
                                                    branchCode: target ? target.branch_code : ''
                                                }));
                                            }}
                                            placeholder="請選擇或搜尋分行"
                                            loading={fetchingBranches}
                                            loadingText="查詢分行資料中..."
                                            emptyText="無分行資料"
                                            allowManualInput={true}
                                            manualInputPlaceholder="請手動輸入分行名稱"
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            name="bankBranch"
                                            value={formData.bankBranch}
                                            onChange={handleChange}
                                            placeholder={!formData.bankCode ? "請先選擇銀行" : fetchingBranches ? "載入分行資料中..." : "查無分行資料，請手動輸入"}
                                            disabled={!formData.bankCode}
                                            className="w-full rounded-md border-stone-200 p-3 border disabled:bg-gray-100 disabled:text-gray-400 focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                                        />
                                    )}
                                </div>

                                {/* 4. 受款帳號 */}
                                <div className="col-span-1 md:col-span-1 flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        受款帳號 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        name="accountNumber"
                                        value={formData.accountNumber}
                                        onChange={handleChange}
                                        placeholder="請輸入帳號"
                                        required
                                        className="w-full rounded-md border-stone-200 p-3 border font-mono tracking-wide focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                                    />
                                </div>

                                {/* 5. 分行代碼 */}
                                <div className="col-span-1 md:col-span-1 flex flex-col">
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                        分行代碼 (選填)
                                    </label>
                                    <input
                                        type="text"
                                        name="branchCode"
                                        value={formData.branchCode}
                                        onChange={handleChange}
                                        placeholder="系統會自動帶入 (若有)"
                                        className="w-full rounded-md border-stone-200 p-3 border bg-gray-100 text-gray-500 cursor-not-allowed outline-none shadow-sm"
                                        readOnly
                                    />
                                </div>

                            </div>
                        </section>
                    )}

                    {/* 四、附件與發票 */}
                    <section className="bg-stone-50/50 p-4 rounded-lg border border-stone-200/60">
                        <SectionTitle icon={Paperclip} title="四、附件與發票" />

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-700">
                                相關附件 (支援圖片、PDF，最大 5MB)
                            </label>

                            {/* 檔案上傳區 (這裡保持原樣) */}
                            {!formData.attachment ? (
                                <div
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    className={`
                    border-2 border-dashed rounded-lg p-6 text-center transition-colors
                    ${isDragging ? 'border-red-500 bg-red-50' : 'border-stone-200 hover:border-red-400 bg-white'}
                  `}
                                >
                                    <div className="flex flex-col items-center gap-2">
                                        <UploadCloud className={`h-10 w-10 ${isDragging ? 'text-red-500' : 'text-gray-400'}`} />

                                        <div className="text-sm text-gray-600">
                                            <span className="font-semibold text-red-500">點擊上傳</span> 或將檔案拖曳至此
                                        </div>

                                        <input
                                            id="file-upload"
                                            name="file-upload"
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileChange}
                                            accept="image/*,application/pdf"
                                        />

                                        <div className="flex gap-3 mt-2">
                                            <label
                                                htmlFor="file-upload"
                                                className="cursor-pointer bg-white border border-stone-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-stone-50/50 flex items-center gap-2 shadow-sm"
                                            >
                                                <FileText size={16} /> 瀏覽檔案
                                            </label>

                                            <label
                                                htmlFor="camera-upload"
                                                className="cursor-pointer bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-2 shadow-sm"
                                            >
                                                <Camera size={16} /> 拍照上傳
                                            </label>
                                            <input
                                                id="camera-upload"
                                                type="file"
                                                className="hidden"
                                                accept="image/*"
                                                capture="environment"
                                                onChange={handleFileChange}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white border border-stone-200 rounded-lg p-3 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <div className="bg-red-100 p-2 rounded">
                                            {formData.attachment.type.startsWith('image/') ? (
                                                <ImageIcon className="text-red-500" size={24} />
                                            ) : (
                                                <FileText className="text-red-500" size={24} />
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-800 truncate">
                                                {formData.attachment.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {(formData.attachment.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={removeFile}
                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            )}

                            <input
                                type="text"
                                name="attachmentDesc"
                                value={formData.attachmentDesc}
                                onChange={handleChange}
                                placeholder="附件備註說明 (選填)"
                                className="w-full rounded-md border-stone-200 p-2 border text-sm"
                            />

                            {/* ✅ [補回來的] 發票狀態與日期 */}
                            <div className="border-t border-gray-200 pt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">發票狀態</label>
                                <div className="flex flex-wrap gap-4">
                                    {['yes', 'no_yet', 'none'].map(val => (
                                        <label key={val} className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded border border-gray-200 hover:border-red-300">
                                            <input
                                                type="radio"
                                                name="hasInvoice"
                                                value={val}
                                                checked={formData.hasInvoice === val}
                                                onChange={handleChange}
                                                className="text-red-500 focus:ring-red-500"
                                            />
                                            <span className="text-sm">
                                                {val === 'yes' ? '已附發票' : val === 'no_yet' ? '未開/後補' : '免用發票'}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                                {/* 選擇已附發票時顯示日期 */}
                                {formData.hasInvoice === 'yes' && (
                                    <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-xs text-gray-500 block mb-1">
                                            發票日期 <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="date"
                                            name="invoiceDate"
                                            value={formData.invoiceDate}
                                            onChange={handleChange}
                                            required // 建議設為必填
                                            className="block w-full md:w-auto rounded-md border-stone-200 p-2 border"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>
                    {/* 五、備註 */}
                    <section className="bg-stone-50/50 p-4 rounded-lg border border-stone-200/60">
                        <SectionTitle icon={MessageSquare} title="五、備註" />
                        <textarea
                            name="remarks"
                            value={formData.remarks}
                            onChange={handleChange}
                            rows={3}
                            placeholder="其他說明事項..."
                            className="w-full rounded-md border-stone-200 shadow-sm focus:border-red-500 focus:ring-red-500 p-2 border"
                        />
                    </section>

                    {/* 七、製單資訊 */}
                    <section className="bg-red-50/50 p-6 rounded-xl border border-red-100">
                        <SectionTitle icon={User} title="製單資訊" />
                        <div className="flex gap-6">
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase">填單人</label>
                                <input
                                    type="text"
                                    name="creatorName"
                                    value={formData.creatorName}
                                    onChange={handleChange}
                                    required
                                    readOnly
                                    className="mt-1 block w-full bg-transparent border-b border-gray-400 focus:border-red-600 outline-none pb-1"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-gray-500 uppercase">申請日期 (自動帶入)</label>
                                <input
                                    type="date"
                                    name="applyDate"
                                    value={formData.applyDate}
                                    readOnly
                                    className="mt-1 block w-full bg-gray-100 text-gray-500 cursor-not-allowed border-b border-stone-200 pb-1 px-2 rounded-t"
                                />
                            </div>
                        </div>
                    </section>

                    {/* 六、簽核流程 (視覺展示) */}
                    <section className="border-t-2 border-dashed border-stone-200 pt-6 mt-6">
                        <SectionTitle icon={ShieldCheck} title="六、簽核流程" />

                        {/* ✅ 新增外層 div：overflow-x-auto (允許左右滑動) */}
                        <div className="overflow-x-auto pb-2">
                            {/* ✅ 修改內層 div：設定 min-w (最小寬度) 確保不會被擠壓 */}
                            <div className="flex md:grid md:grid-cols-5 gap-2 text-center min-w-[600px] md:min-w-0">
                                {['單位主管', '會計', '審核主管', '出納', '放行主管'].map((role, idx) => (
                                    <div key={idx} className="border-2 border-gray-200 rounded p-4 flex flex-col items-center justify-center h-24 bg-stone-50/50 text-gray-400 flex-1">
                                        <span className="text-xs font-bold mb-2 whitespace-nowrap">{role}</span>
                                        <div className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center text-xs bg-white">
                                            待簽
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <div className="flex justify-end pt-6 border-t border-gray-200">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-red-600 text-white px-8 py-3.5 rounded-xl hover:bg-red-700 focus:ring-4 focus:ring-red-200 ..."
                            >
                            {loading ? <><Loader2 className="animate-spin" size={20} /> 處理中...</> :
                                editId ? <><RotateCcw size={20} /> 確認修改並重送</> :
                                    <><Save size={20} /> 提交付款單</>}
                        </button>
                    </div>

                </form>
            </div>
            <div className="text-center text-gray-400 text-sm mt-8">
                &copy; 2025 Company Finance System. Powered by Supabase.
            </div>
        </div>
    );
}