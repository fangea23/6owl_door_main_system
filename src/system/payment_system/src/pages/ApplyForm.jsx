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
    Wallet,
    Ticket
} from 'lucide-react';

// ★ 設定：需要經過「單位主管」簽核的部門 (請依照你 DB 實際部門名稱修改)
const DEPT_NEEDS_UNIT_MANAGER = 'SALES'; 

// ★ 設定：視為「會計」角色的職稱關鍵字 (若申請人有這些字，會計關自動通過)
const ACCOUNTANT_KEYWORDS = ['accountant'];

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
    const [userInfo, setUserInfo] = useState({ name: '', department: '', role: '' });
    // [新增] 品牌與門店列表狀態
    const [brandList, setBrandList] = useState([]);
    const [storeList, setStoreList] = useState([]);

    // --- 載入狀態 ---
    const [fetchingBanks, setFetchingBanks] = useState(false);
    const [fetchingBranches, setFetchingBranches] = useState(false);
    // [新增] 品牌與門店載入狀態
    const [fetchingBrands, setFetchingBrands] = useState(false);
    const [fetchingStores, setFetchingStores] = useState(false);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [selectedFiles, setSelectedFiles] = useState([]);
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
        invoiceNumber: '', // [新增]
        
        hasVoucher: 'no',  // [新增]
        voucherNumber: '', // [新增]
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
    // 1. 新增一個 useEffect 來抓取員工詳細資料 (放在 fetchCreatorName 附近)
// 1. 修改抓取員工詳細資料的 useEffect
// 1. 修改抓取員工詳細資料的 useEffect
    useEffect(() => {
        const fetchUserInfo = async () => {
            if (user) {
                let finalName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
                let dept = '';
                let title = '';
                let role = ''; // [新增] 角色變數

                try {
                    // ✅ 修改：多抓取 'role' 欄位
                    const { data } = await supabase
                        .from('employees_with_details') 
                        .select('name, department_code, role') // <--- 這裡加上 role
                        .eq('user_id', user.id)
                        .single();
                    
                    if (data) {
                        finalName = data.name || finalName;
                        dept = data.department_code || ''; 
                        role = data.role || ''; // [新增] 存取 role
                    }
                } catch (err) {
                    console.error('Error fetching employee info:', err);
                }

                // ✅ 修改：存入 state (請記得去 useState 補上 role 初始值，或者直接在這裡存)
                setUserInfo({ name: finalName, department: dept, role: role });
            }
        };

        fetchUserInfo();
    }, [user]);


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

// --- 1-2. 初始載入：抓取品牌清單 (Brands) ---
    useEffect(() => {
        const fetchBrands = async () => {
            setFetchingBrands(true);
            try {
                // ✅ 修改：多抓取 brand_id (如果沒有專屬代碼欄位，通常就是 id)
                // 這裡假設你的 brands table 有 id 欄位
                const { data, error } = await supabase
                    .from('brands')
                    .select('id, name') // 如果你有專門的 'code' 欄位，請改成 'id, name, code'
                    .order('id', { ascending: true });

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
// --- 2-2. 當品牌改變時：抓取門店 (Stores) ---
    useEffect(() => {
        const fetchStores = async () => {
            if (!formData.brandId) {
                setStoreList([]);
                return;
            }

            setFetchingStores(true);
            try {
                // ✅ 修改：多抓取 code 欄位
                const { data, error } = await supabase
                    .from('stores')
                    .select('id, name, code') // 這裡加上 code
                    .eq('brand_id', formData.brandId)
                    .eq('is_active', true)
                    .order('code', { ascending: true }); // 建議改用 code 排序比較直覺

                if (error) throw error;
                if (data) setStoreList(data || []);
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
            let oldAttachments = [];
            if (Array.isArray(old.attachments)) {
                oldAttachments = old.attachments;
            } else if (typeof old.attachments === 'string' && old.attachments) {
                oldAttachments = [{ url: old.attachments, name: '舊附件', type: 'old' }];
            }
            setExistingAttachments(oldAttachments);
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
                hasInvoice: old.has_invoice,
                invoiceDate: old.invoice_date || '',
                invoiceNumber: old.invoice_number || '',
                hasVoucher: old.has_voucher ? 'yes' : 'no',
                voucherNumber: old.voucher_number || '',
                attachmentDesc: old.attachment_desc || '',
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

    // 2. 傳統 input onChange
// 1. 多檔選擇
    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        // 過濾 5MB
        const validFiles = files.filter(file => {
             if (file.size > 5 * 1024 * 1024) {
                 alert(`檔案 ${file.name} 超過 5MB，已略過。`);
                 return false;
             }
             return true;
        });
        setSelectedFiles(prev => [...prev, ...validFiles]);
        e.target.value = ''; // 清空 input 讓同檔名可再選
    };

    // 2. 移除新選擇的檔案
    const removeSelectedFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    // 3. 移除舊有的附件
    const removeExistingAttachment = (index) => {
        setExistingAttachments(prev => prev.filter((_, i) => i !== index));
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
        
        // 取得拖曳的所有檔案
        const files = Array.from(e.dataTransfer.files);
        
        // 過濾檔案大小
        const validFiles = files.filter(file => {
            if (file.size > 5 * 1024 * 1024) {
                alert(`檔案 ${file.name} 超過 5MB，已略過。`);
                return false;
            }
            return true;
        });

        // 加入 selectedFiles 陣列
        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
        }
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

            let finalAttachments = [...existingAttachments]; // 先放舊的

    if (selectedFiles.length > 0) {
        // 使用 Promise.all 平行上傳
        const uploadPromises = selectedFiles.map(async (file) => {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
            const { error } = await supabase.storage.from('attachments').upload(fileName, file);
            if (error) throw error;
            const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
            
            return { url: data.publicUrl, name: file.name, type: file.type };
        });
        const newUploadedAttachments = await Promise.all(uploadPromises);
        finalAttachments = [...finalAttachments, ...newUploadedAttachments];
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

                has_attachment: finalAttachments.length > 0,
                attachments: finalAttachments,
                attachment_desc: formData.attachmentDesc,

                // 動態加入 signature_url：只有當有新簽名時才更新，否則不傳此欄位(保留舊值)
                ...(signatureUrl ? { signature_url: signatureUrl } : {}),

                has_invoice: formData.hasInvoice,
                invoice_date: formData.invoiceDate ? formData.invoiceDate : null,
                remarks: formData.remarks,
                creator_name: formData.creatorName,
invoice_number: formData.invoiceNumber,
        has_voucher: formData.hasVoucher === 'yes',
        voucher_number: formData.hasVoucher === 'yes' ? formData.voucherNumber : null,
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
            const needsUnitManager = userInfo.department === DEPT_NEEDS_UNIT_MANAGER;
            
            // 設定初始狀態
            let initialStatus = needsUnitManager ? 'pending_unit_manager' : 'pending_accountant';
            let currentStep = needsUnitManager ? 1 : 2;

            // ✅ 修正：轉小寫比對，避免大小寫問題
            const isAccountant = ACCOUNTANT_KEYWORDS.some(k => 
                userInfo.role?.toLowerCase().includes(k.toLowerCase())
            );

            // ✅ 邏輯：只有在「下一關是會計」且「我是會計」時才跳過
            // 如果下一關是單位主管(initialStatus === 'pending_unit_manager')，則不跳過，必須先給主管簽
            if (initialStatus === 'pending_accountant' && isAccountant) {
                dbPayload.sign_accountant_at = new Date().toISOString(); 
                initialStatus = 'pending_audit_manager'; 
                currentStep = 3;
            }

            dbPayload.status = initialStatus;
            dbPayload.current_step = currentStep;
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
                                        // ✅ 修改：顯示 "ID (補0) - 名稱" 
                                        // 如果你的 brands table 有專門的 code 欄位，請把 String(brand.id) 換成 brand.code
                                        <option key={brand.id} value={brand.id}>
                                            {String(brand.id).padStart(2, '0')} - {brand.name}
                                        </option>
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
                                    // ✅ 修改：在 options mapping 中加入 subLabel
                                    options={storeList.map(store => ({
                                        value: store.name,
                                        label: store.name,
                                        subLabel: store.code // 這裡把 code 帶入
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
                    {/* 四、附件、發票與傳票 */}
<section className="bg-stone-50/50 p-4 rounded-lg border border-stone-200/60">
    <SectionTitle icon={Paperclip} title="四、附件、發票與傳票" />

    <div className="space-y-6">
        {/* --- 4-1. 附件上傳區 (支援多檔 + 拍照) --- */}
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
                相關附件 (支援圖片、PDF，單檔最大 5MB)
            </label>

            {/* 上傳觸發區塊 */}
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
                        <span className="font-semibold text-red-500">點擊下方按鈕</span> 或將檔案拖曳至此
                    </div>

                    {/* 隱藏的 input: 一般檔案選取 (支援多選) */}
                    <input
                        id="file-upload"
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*,application/pdf"
                    />

                    {/* 隱藏的 input: 相機拍照 (手機專用) */}
                    <input
                        id="camera-upload"
                        type="file"
                        className="hidden"
                        accept="image/*"
                        capture="environment" // 呼叫後鏡頭
                        onChange={handleFileChange}
                    />

                    {/* 按鈕群組 */}
                    <div className="flex gap-3 mt-2">
                        {/* 按鈕 1: 瀏覽檔案 */}
                        <label
                            htmlFor="file-upload"
                            className="cursor-pointer bg-white border border-stone-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-stone-50/50 flex items-center gap-2 shadow-sm transition-all"
                        >
                            <FileText size={16} /> 瀏覽檔案
                        </label>

                        {/* 按鈕 2: 拍照上傳 (恢復此按鈕) */}
                        <label
                            htmlFor="camera-upload"
                            className="cursor-pointer bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 flex items-center gap-2 shadow-sm transition-all"
                        >
                            <Camera size={16} /> 拍照上傳
                        </label>
                    </div>
                </div>
            </div>

            {/* 檔案列表顯示區 */}
            <div className="mt-4 space-y-2">
                {/* A. 舊有檔案 (來自 DB) - 藍色樣式 */}
                {existingAttachments.map((file, idx) => (
                    <div key={`old-${idx}`} className="bg-blue-50 border border-blue-100 rounded p-2 flex justify-between items-center animate-in fade-in">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-blue-200 p-1.5 rounded text-blue-700">
                                <FileText size={16} />
                            </div>
                            <div className="min-w-0">
                                <a href={file.url} target="_blank" rel="noreferrer" className="block text-sm text-blue-700 hover:underline truncate">
                                    {file.name || `附件 ${idx + 1}`}
                                </a>
                                <span className="text-xs text-blue-400">已儲存</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeExistingAttachment(idx)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ))}

                {/* B. 新選檔案 (準備上傳) - 綠色樣式 */}
                {selectedFiles.map((file, idx) => (
                    <div key={`new-${idx}`} className="bg-green-50 border border-green-100 rounded p-2 flex justify-between items-center animate-in fade-in">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="bg-green-200 p-1.5 rounded text-green-700">
                                {file.type.startsWith('image/') ? <ImageIcon size={16} /> : <FileText size={16} />}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                                <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB (準備上傳)</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => removeSelectedFile(idx)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                ))}
            </div>

            <input
                type="text"
                name="attachmentDesc"
                value={formData.attachmentDesc}
                onChange={handleChange}
                placeholder="附件備註說明 (選填)"
                className="mt-3 w-full rounded-md border-stone-200 p-2 border text-sm focus:ring-red-500 focus:border-red-500"
            />
        </div>

        <hr className="border-gray-200" />

        {/* --- 4-2. 發票區塊 (新增號碼欄位) --- */}
        <div>
            <div className="flex flex-col md:flex-row gap-4">
                {/* 發票狀態選擇 */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">發票狀態</label>
                    <div className="flex flex-wrap gap-2">
                        {['yes', 'no_yet', 'none'].map(val => (
                            <label key={val} className={`
                                flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md border transition-colors
                                ${formData.hasInvoice === val ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-stone-200 hover:bg-stone-50'}
                            `}>
                                <input
                                    type="radio"
                                    name="hasInvoice"
                                    value={val}
                                    checked={formData.hasInvoice === val}
                                    onChange={handleChange}
                                    className="text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm font-medium">
                                    {val === 'yes' ? '已附發票' : val === 'no_yet' ? '未開/後補' : '免用發票'}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* 當選擇「已附發票」時顯示輸入框 */}
                {formData.hasInvoice === 'yes' && (
                    <div className="contents md:flex md:gap-4 flex-1">
                        <div className="flex-1 animate-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                發票日期 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="invoiceDate"
                                value={formData.invoiceDate}
                                onChange={handleChange}
                                required
                                className="w-full rounded-md border-stone-200 p-2 border focus:ring-red-500 focus:border-red-500"
                            />
                        </div>
                        <div className="flex-1 animate-in slide-in-from-top-2 duration-200 delay-75">
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                發票號碼
                            </label>
                            <input
                                type="text"
                                name="invoiceNumber"
                                value={formData.invoiceNumber}
                                onChange={handleChange}
                                placeholder="例: AB-12345678"
                                className="w-full rounded-md border-stone-200 p-2 border focus:ring-red-500 focus:border-red-500"
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>

        <hr className="border-gray-200" />

        {/* --- 4-3. 傳票區塊 (新增功能) --- */}
        <div>
            <div className="flex items-center gap-2 mb-3 text-stone-700 font-bold">
                <div className="p-1 bg-orange-100 text-orange-600 rounded">
                    <Ticket size={16} />
                </div>
                <h4>傳票資訊</h4>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center bg-orange-50/30 p-3 rounded-lg border border-orange-100">
                <div className="flex gap-6 items-center">
                    <span className="text-sm font-medium text-gray-700">是否有傳票?</span>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="hasVoucher"
                                value="yes"
                                checked={formData.hasVoucher === 'yes'}
                                onChange={handleChange}
                                className="text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-sm">有</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="hasVoucher"
                                value="no"
                                checked={formData.hasVoucher === 'no'}
                                onChange={handleChange}
                                className="text-orange-600 focus:ring-orange-500"
                            />
                            <span className="text-sm">無</span>
                        </label>
                    </div>
                </div>

                {formData.hasVoucher === 'yes' && (
                    <div className="flex-1 w-full animate-in fade-in slide-in-from-left-2 duration-200">
                        <input
                            type="text"
                            name="voucherNumber"
                            value={formData.voucherNumber}
                            onChange={handleChange}
                            placeholder="請輸入傳票編號..."
                            className="w-full rounded-md border-orange-200 p-2 border bg-white focus:ring-orange-500 focus:border-orange-500 transition-colors"
                        />
                    </div>
                )}
            </div>
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