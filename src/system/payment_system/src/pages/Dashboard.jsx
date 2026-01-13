import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// 付款系統的基礎路徑
const BASE_PATH = '/systems/payment-approval';
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
  FileCheck, 
  FileX,
  Check, 
  XCircle // ✅ 新增圖示
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import InstallPrompt from '../components/InstallPrompt';
import { useAuth } from '../AuthContext';
// --- 狀態與文字對照表 ---
const STATUS_MAP = {
  'draft':                 { label: '草稿', color: 'bg-gray-100 text-gray-600', step: 0 },
  'pending_unit_manager':  { label: '待單位主管簽核', color: 'bg-blue-100 text-blue-700', step: 1 },
  'pending_accountant':    { label: '待會計審核', color: 'bg-indigo-100 text-indigo-700', step: 2 },
  'pending_audit_manager': { label: '待審核主管簽核', color: 'bg-purple-100 text-purple-700', step: 3 },
  'pending_cashier':       { label: '待出納撥款', color: 'bg-orange-100 text-orange-700', step: 4 },
  'pending_boss':          { label: '待放行主管決行', color: 'bg-pink-100 text-pink-700', step: 5 },
  'completed':             { label: '已結案', color: 'bg-green-100 text-green-700', step: 6 },
  'rejected':              { label: '已駁回', color: 'bg-red-100 text-red-700', step: 0 },
  'revoked':               { label: '已撤銷', color: 'bg-gray-200 text-gray-500 line-through', step: 0 },
};

// --- 角色責任表 ---
const ROLE_RESPONSIBILITY = {
  'staff':         [],
  'unit_manager':  ['pending_unit_manager'],
  'accountant':    ['pending_accountant'],
  'audit_manager': ['pending_audit_manager'],
  'cashier':       ['pending_cashier'],
  'boss':          ['pending_boss']
};

export default function Dashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, role } = useAuth();
  const currentRole = role || 'staff'; // 定義 currentRole：如果還沒抓到角色，預設為 staff
  // --- 模擬角色與視圖狀態 ---
  const [viewMode, setViewMode] = useState('all');
  useEffect(() => {
    if (currentRole !== 'staff') {
      setViewMode('todo');
    } else {
      setViewMode('all');
    }
  }, [currentRole]);
  // ✅ Task 1: 批量操作 State
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

// --- Supabase 資料載入 & Realtime ---
  useEffect(() => {
    // 只有當 user 存在時才去抓資料
    if (user) {
      fetchRequests();
    }

    const subscription = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_requests' }, 
        () => { if(user) fetchRequests(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [user]); // 依賴 user
    const fetchRequests = async () => {
        setLoading(true);
        try {
        let query = supabase
            .from('payment_requests')
            .select('*');

        // ✅ 動態排序策略
        if (viewMode === 'todo') {
            // 待辦事項：舊的在上面 (急件先處理)，避免積壓
            // 也可以考慮用 apply_date，看你們習慣以「送單時間」還是「期望付款日」為準
            query = query.order('created_at', { ascending: true }); 
        } else {
            // 所有歷史：新的在上面 (查看最新進度)
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;
        
        if (error) throw error;
        setRequests(data || []);
        } catch (error) {
        console.error('Error:', error);
        } finally {
        setLoading(false);
        }
    };

    // ✅ 重要：當 viewMode 改變時，要重新抓取資料以套用新排序
    useEffect(() => {
        if (user) {
        fetchRequests();
        }
    }, [user, viewMode]); // 加入 viewMode 到依賴陣列

  // --- 切換紙本入庫狀態 ---
  const togglePaperStatus = async (id, currentStatus) => {
    // ✅ Task 2: 權限檢查 - 只有會計可以操作
    if (currentRole !== 'accountant') {
        alert('只有「會計」角色可以執行紙本入庫作業');
        return;
    }

    // 樂觀更新 (Optimistic UI)
    setRequests(prev => prev.map(req => 
      req.id === id ? { ...req, is_paper_received: !currentStatus } : req
    ));

    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({ is_paper_received: !currentStatus })
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('更新失敗:', error);
      alert('更新失敗，請檢查網路');
      // 失敗的話要把狀態改回來
      setRequests(prev => prev.map(req => 
        req.id === id ? { ...req, is_paper_received: currentStatus } : req
      ));
    }
  };

  // --- 資料篩選邏輯 ---
  const filteredRequests = requests.filter(req => {
    if (viewMode === 'all') return true;
    const myResponsibilities = ROLE_RESPONSIBILITY[currentRole] || [];
    return myResponsibilities.includes(req.status);
  });

  const todoCount = requests.filter(req => {
    const myResponsibilities = ROLE_RESPONSIBILITY[currentRole] || [];
    return myResponsibilities.includes(req.status);
  }).length;

  // ✅ Task 1: 批量選取邏輯
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

  // ✅ Task 1: 批量核准 API
  const handleBatchApprove = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`確定要一次核准選取的 ${selectedIds.size} 筆單據嗎？`)) return;
    
    setBatchProcessing(true);
    
    const NEXT_STEP_MAP = {
      'pending_unit_manager': { status: 'pending_accountant', step: 2, key: 'sign_manager' },
      'pending_accountant':   { status: 'pending_audit_manager', step: 3, key: 'sign_accountant' },
      'pending_audit_manager':{ status: 'pending_cashier', step: 4, key: 'sign_audit' },
      'pending_cashier':      { status: 'pending_boss', step: 5, key: 'sign_cashier' }, 
      'pending_boss':         { status: 'completed', step: 6, key: 'sign_boss' }
    };

    try {
      const updates = Array.from(selectedIds).map(async (id) => {
        const req = requests.find(r => r.id === id);
        const config = NEXT_STEP_MAP[req.status];
        if (!config) return; 
        
        await supabase.from('payment_requests').update({
            status: config.status,
            current_step: config.step,
            [`${config.key}_at`]: new Date().toISOString(),
            [`${config.key}_url`]: 'BATCH_APPROVED'
        }).eq('id', id);
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

  // ✅ Task 1 (補完): 批量駁回 API
  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    
    const reason = prompt(`⚠️ 您即將駁回選取的 ${selectedIds.size} 筆單據。\n\n請輸入駁回原因 (將套用至所有選取案件)：`);
    if (reason === null) return; // 按取消
    if (!reason.trim()) { alert('請輸入駁回原因！'); return; }

    setBatchProcessing(true);

    try {
      const updates = Array.from(selectedIds).map(async (id) => {
        await supabase.from('payment_requests').update({
            status: 'rejected',
            current_step: 0,
            rejection_reason: reason
        }).eq('id', id);
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

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-20">

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        
        {/* ================= Header (標題與新增按鈕) ================= */}
<div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-2">
              <Wallet className="text-emerald-700 h-6 w-6 md:h-8 md:w-8"/> 付款單總覽
            </h1>
            <p className="text-gray-500 mt-1 ml-1 text-sm md:text-base">
              {/* 顯示真實的登入資訊 */}
              嗨，<span className="font-bold text-gray-800">{user?.user_metadata?.full_name || user?.email}</span>
              <span className="mx-2">|</span>
              目前身分：
              <span className="font-bold text-emerald-600">
                {currentRole === 'staff' ? '一般員工 (Staff)' : 
                 currentRole === 'unit_manager' ? '單位主管 (Manager)' :
                 currentRole === 'accountant' ? '會計 (Accountant)' :
                 currentRole === 'audit_manager' ? '審核主管 (Audit)' :
                 currentRole === 'cashier' ? '出納 (Cashier)' : 
                 currentRole === 'boss' ? '放行主管 (Boss)' : '管理員 (Admin)'}
              </span>
            </p>
          </div>
{/* 只有員工才需要看到「新增申請」按鈕 (主管主要是來簽核的) */}
          {/* 當然如果您希望主管也能申請款項，這個條件可以拿掉 */}
          <Link
            to={`${BASE_PATH}/apply`}
            className="w-full md:w-auto bg-emerald-600 text-white px-5 py-2.5 rounded-lg hover:bg-emerald-700 font-medium shadow-md transition-all flex items-center justify-center gap-2"
          >
            <FileText size={18} />
            新增申請
          </Link>
        </div>

        {/* ✅ Task 1: 批量操作工具列 (只有在待辦模式 + 有選取時顯示) */}
        {selectedIds.size > 0 && viewMode === 'todo' && (
          <div className="sticky top-[130px] z-20 bg-emerald-50 border border-emerald-200 p-3 rounded-lg mb-4 flex justify-between items-center animate-in slide-in-from-top-2 shadow-md">
            <span className="font-bold text-emerald-800 flex items-center gap-2">
                <CheckSquare className="text-emerald-600"/> 已選取 {selectedIds.size} 筆
            </span>
            <div className="flex gap-2">
               {/* 🔴 批量駁回按鈕 */}
               <button 
                 onClick={handleBatchReject} 
                 disabled={batchProcessing} 
                 className="bg-white text-red-600 border border-red-200 px-4 py-1.5 rounded shadow-sm hover:bg-red-50 text-sm font-bold flex items-center gap-1 disabled:opacity-50"
               >
                 {batchProcessing ? <Loader2 className="animate-spin" size={16}/> : <XCircle size={16}/>} 
                 批量駁回
               </button>

               {/* 🟢 批量核准按鈕 */}
               <button 
                 onClick={handleBatchApprove} 
                 disabled={batchProcessing} 
                 className="bg-emerald-600 text-white px-4 py-1.5 rounded shadow hover:bg-emerald-700 text-sm font-bold flex items-center gap-1 disabled:opacity-50"
               >
                 {batchProcessing ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} 
                 批量核准通過
               </button>
            </div>
          </div>
        )}

        {/* ================= Tabs (分頁籤) ================= */}
        <div className="flex gap-4 border-b border-gray-200 mb-6 overflow-x-auto">
          <button
            onClick={() => { setViewMode('todo'); setSelectedIds(new Set()); }}
            className={`pb-3 px-1 text-sm font-medium transition-all flex items-center gap-2 relative whitespace-nowrap ${
              viewMode === 'todo' 
                ? 'text-emerald-600 border-b-2 border-emerald-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CheckSquare size={18} />
            待我簽核 / 處理
            {todoCount > 0 && (
              <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {todoCount}
              </span>
            )}
          </button>

          <button
            onClick={() => { setViewMode('all'); setSelectedIds(new Set()); }}
            className={`pb-3 px-1 text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              viewMode === 'all' 
                ? 'text-emerald-600 border-b-2 border-emerald-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ListFilter size={18} />
            所有歷史單據
          </button>
        </div>

        {/* ================= 列表區域 (卡片 vs 表格) ================= */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500 flex flex-col items-center min-h-[400px]">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p>資料載入中...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-400 flex flex-col items-center min-h-[400px]">
            <div className="bg-gray-100 p-4 rounded-full mb-3">
               {viewMode === 'todo' ? <CheckSquare size={32} className="text-gray-300"/> : <ListFilter size={32} className="text-gray-300"/>}
            </div>
            <p>{viewMode === 'todo' ? '目前沒有需要您簽核的單據，去喝杯咖啡吧！' : '尚無任何付款紀錄'}</p>
          </div>
        ) : (
          <>
            {/* -------------------------------------------------------- */}
            {/* 📱 手機版視圖 (Mobile Cards) */}
            {/* -------------------------------------------------------- */}
            <div className="block md:hidden space-y-4">
              {filteredRequests.map((req) => {
                const status = STATUS_MAP[req.status] || { label: req.status, color: 'bg-gray-100', step: 0 };
                
                return (
                  <div key={req.id} className="flex gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    {/* ✅ Task 1: 手機版勾選框 (只在待辦模式顯示) */}
                    {viewMode === 'todo' && (
                        <div className="flex items-center">
                            <input 
                                type="checkbox" 
                                checked={selectedIds.has(req.id)}
                                onChange={() => handleSelect(req.id)}
                                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                        </div>
                    )}
                    
                    <Link to={`${BASE_PATH}/request/${req.id}`} className="flex-1 block">
                        {/* 卡片頂部：單號與狀態 */}
                        <div className="flex justify-between items-start mb-3">
                        <div>
                            <span className="text-xs font-mono text-gray-400 block">#{String(req.id).padStart(4, '0')}</span>
                            <span className="text-xs text-gray-400 mt-0.5 block">{req.apply_date}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${status.color}`}>
                            {status.label}
                        </span>
                        </div>
                        
                        {/* 卡片中間：主要資訊 */}
                        <div className="mb-4">
                        <h3 className="font-bold text-gray-800 text-lg mb-1 truncate">
                            {req.payee_name}
                        </h3>
                        <div className="text-sm text-gray-600 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                            <Building size={14} className="text-gray-400 shrink-0" />
                            <span className="truncate">{req.brand} - {req.store}</span>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                            <FileText size={14} className="text-gray-400 shrink-0" />
                            <span className="truncate text-gray-500">{req.content || '無說明'}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-1 pl-5">
                                申請人: {req.creator_name}
                            </div>
                        </div>
                        </div>

                        {/* 卡片底部：金額與按鈕 */}
                        <div className="flex justify-between items-end border-t border-gray-100 pt-3">
                        <div>
                            <p className="text-xs text-gray-400 mb-0.5">付款金額</p>
                            <p className="text-xl font-bold text-emerald-700 font-mono">
                            ${Number(req.amount).toLocaleString()}
                            </p>
                        </div>

                        {/* 紙本入庫按鈕 */}
                        <button
                            onClick={(e) => {
                                e.preventDefault(); 
                                togglePaperStatus(req.id, req.is_paper_received);
                            }}
                            // ✅ Task 2: 非會計禁用樣式
                            disabled={currentRole !== 'accountant'}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            req.is_paper_received 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-gray-50 text-gray-400 border-gray-200'
                            } ${currentRole !== 'accountant' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                        >
                            {req.is_paper_received ? <FileCheck size={14} /> : <FileX size={14} />}
                            {req.is_paper_received ? '紙本已收' : '未收紙本'}
                        </button>

                        <div className="bg-emerald-50 p-2 rounded-full text-emerald-600">
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
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-600 text-sm uppercase tracking-wider border-b border-gray-200">
                    {/* ✅ Task 1: 全選 Checkbox (只在待辦模式顯示) */}
                    {viewMode === 'todo' && (
                        <th className="p-4 w-10 text-center">
                            <input 
                                type="checkbox" 
                                onChange={handleSelectAll} 
                                checked={selectedIds.size > 0 && selectedIds.size === filteredRequests.length}
                                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                        </th>
                    )}
                    <th className="p-4 font-semibold w-24">單號</th>
                    <th className="p-4 font-semibold w-32">申請日期</th>
                    <th className="p-4 font-semibold w-48">申請資訊</th>
                    <th className="p-4 font-semibold">受款 / 說明</th>
                    <th className="p-4 font-semibold text-right w-32">金額</th>
                    <th className="p-4 font-semibold text-center w-24">紙本入庫</th>
                    <th className="p-4 font-semibold text-center w-32">狀態</th>
                    <th className="p-4 font-semibold text-center w-20">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRequests.map((req) => {
                    const statusInfo = STATUS_MAP[req.status] || { label: req.status, color: 'bg-gray-100', step: 0 };
                    
                    return (
                      <tr key={req.id} className="hover:bg-emerald-50/30 transition-colors group">
                        {/* ✅ Task 1: 單選 Checkbox (只在待辦模式顯示) */}
                        {viewMode === 'todo' && (
                            <td className="p-4 text-center">
                                <input 
                                    type="checkbox" 
                                    checked={selectedIds.has(req.id)}
                                    onChange={() => handleSelect(req.id)}
                                    className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                            </td>
                        )}
                        <td className="p-4">
                          <span className="font-mono font-bold text-gray-400">#{String(req.id).padStart(4, '0')}</span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">
                          {req.apply_date}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-800 text-sm">{req.brand}</div>
                          <div className="text-xs text-gray-500">{req.store}</div>
                        <div className="text-xs text-gray-400 mt-0.5">
                            申請人: {req.creator_name}
                        </div>
                        </td>
                        <td className="p-4">
                           <div className="font-medium text-gray-900 truncate max-w-[200px]" title={req.payee_name}>
                             {req.payee_name}
                           </div>
                           <div className="text-sm text-gray-500 truncate max-w-[200px]" title={req.content}>
                             {req.content}
                           </div>
                        </td>
                        <td className="p-4 text-right">
                        <span className="font-mono font-bold text-gray-700">
                            ${Number(req.amount).toLocaleString()}
                        </span>
                        </td>

                        <td className="p-4 text-center">
                        <button
                            onClick={() => togglePaperStatus(req.id, req.is_paper_received)}
                            // ✅ Task 2: 只有會計能點擊
                            disabled={currentRole !== 'accountant'}
                            title={currentRole !== 'accountant' ? "只有會計可操作" : req.is_paper_received ? "點擊取消入庫" : "點擊確認入庫"}
                            className={`p-2 rounded-full transition-colors ${
                            req.is_paper_received 
                                ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                                : 'text-gray-300 hover:text-gray-500 hover:bg-gray-100'
                            } ${currentRole !== 'accountant' ? 'opacity-50 cursor-not-allowed hover:bg-transparent' : ''}`}
                        >
                            {req.is_paper_received ? <FileCheck size={20} /> : <FileX size={20} />}
                        </button>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {/* 進度條 */}
                          {statusInfo.step > 0 && statusInfo.step < 6 && (
                            <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5 max-w-[80px] mx-auto opacity-50 group-hover:opacity-100 transition-opacity">
                              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(statusInfo.step / 5) * 100}%` }}></div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Link 
                            to={`/request/${req.id}`} 
                            className={`p-2 rounded-full inline-flex transition-colors shadow-sm ${
                              viewMode === 'todo' 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                : 'text-emerald-600 hover:bg-emerald-50'
                            }`}
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
        <div className="mt-4 text-center text-xs text-gray-400">
          總計 {filteredRequests.length} 筆資料
        </div>
      </div>
      <InstallPrompt />
    </div>
  );
}