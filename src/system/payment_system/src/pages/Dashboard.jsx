import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  XCircle 
} from 'lucide-react';
import { supabase } from '../supabaseClient'; 
import InstallPrompt from '../components/InstallPrompt';
import { useAuth } from '../../../../contexts/AuthContext'; // 修正引用路徑以配合您的檔案結構

// 付款系統的基礎路徑
const BASE_PATH = '/systems/payment-approval';

// --- 狀態與文字對照表 (優化為柔和色調，符合 Portal 風格) ---
const STATUS_MAP = {
  'draft':                 { label: '草稿', color: 'bg-stone-100 text-stone-600 border-stone-200', step: 0 },
  'pending_unit_manager':  { label: '待主管簽核', color: 'bg-blue-50 text-blue-700 border-blue-100', step: 1 },
  'pending_accountant':    { label: '待會計審核', color: 'bg-indigo-50 text-indigo-700 border-indigo-100', step: 2 },
  'pending_audit_manager': { label: '待審核主管', color: 'bg-purple-50 text-purple-700 border-purple-100', step: 3 },
  'pending_cashier':       { label: '待出納撥款', color: 'bg-amber-50 text-amber-700 border-amber-100', step: 4 },
  'pending_boss':          { label: '待放行決行', color: 'bg-rose-50 text-rose-700 border-rose-100', step: 5 },
  'completed':             { label: '已結案', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', step: 6 },
  'rejected':              { label: '已駁回', color: 'bg-red-50 text-red-700 border-red-100', step: 0 },
  'revoked':               { label: '已撤銷', color: 'bg-stone-100 text-stone-400 line-through border-stone-200', step: 0 },
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
  const currentRole = role || 'staff'; 

  // --- 1. 新增：員工姓名狀態與抓取邏輯 ---
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

  // 定義顯示名稱變數
  const displayName = employeeName || user?.user_metadata?.full_name || user?.email;
  // -------------------------------------

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
    if (user) {
      fetchRequests();
    }

    const subscription = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'payment_approval', table: 'payment_requests' }, 
        () => { if(user) fetchRequests(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(subscription); };
  }, [user]); 

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query;

      // 會計角色：使用品牌篩選邏輯
      if (currentRole === 'accountant' && viewMode === 'todo') {
        // 使用視圖查詢會計負責品牌的待簽核案件
        query = supabase
          .from('accountant_pending_requests')
          .select('*')
          .eq('accountant_id', user.id);

        // 待辦事項：舊的在上面 (急件先處理)
        query = query.order('created_at', { ascending: true });
      } else {
        // 其他角色或查看所有歷史：使用原有邏輯
        query = supabase.from('payment_requests').select('*');

        // 動態排序策略
        if (viewMode === 'todo') {
          // 待辦事項：舊的在上面 (急件先處理)
          query = query.order('created_at', { ascending: true });
        } else {
          // 所有歷史：新的在上面 (查看最新進度)
          query = query.order('created_at', { ascending: false });
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error:', error);
      // 如果視圖查詢失敗（例如視圖不存在），回退到普通查詢
      if (error.message?.includes('accountant_pending_requests')) {
        console.warn('視圖 accountant_pending_requests 不存在，使用標準查詢');
        try {
          const { data, error: fallbackError } = await supabase
            .from('payment_requests')
            .select('*')
            .order('created_at', { ascending: viewMode === 'todo' });
          if (fallbackError) throw fallbackError;
          setRequests(data || []);
        } catch (fallbackErr) {
          console.error('Fallback query error:', fallbackErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // 當 viewMode 改變時重新抓取
  useEffect(() => {
    if (user) fetchRequests();
  }, [user, viewMode]);

  // --- 切換紙本入庫狀態 ---
  const togglePaperStatus = async (id, currentStatus) => {
    // ✅ Task 2: 權限檢查
    if (currentRole !== 'accountant') {
        alert('只有「會計」角色可以執行紙本入庫作業');
        return;
    }

    // 樂觀更新
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

  // ✅ Task 1: 批量駁回 API
  const handleBatchReject = async () => {
    if (selectedIds.size === 0) return;
    
    const reason = prompt(`⚠️ 您即將駁回選取的 ${selectedIds.size} 筆單據。\n\n請輸入駁回原因 (將套用至所有選取案件)：`);
    if (!reason?.trim()) return;

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
    <div className="pb-20">
      
      {/* ================= 標題區塊 ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-800 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl text-red-600">
               <Wallet className="h-6 w-6 md:h-8 md:w-8"/>
            </div>
            付款單總覽
          </h1>
          <p className="text-stone-500 mt-2 ml-1 text-sm md:text-base flex items-center gap-2">
            <span className="font-bold text-stone-700">{displayName}</span>
             <span className="text-stone-300">|</span>
             <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200">
               {currentRole}
             </span>
          </p>
        </div>

        {/* 新增申請按鈕 - 修改為紅色系 */}
        <Link
          to={`${BASE_PATH}/apply`}
          className="w-full md:w-auto bg-red-600 text-white px-6 py-2.5 rounded-xl hover:bg-red-700 font-medium shadow-md shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <FileText size={18} />
          新增申請
        </Link>
      </div>

      {/* ✅ Task 1: 批量操作工具列 (只有在待辦模式 + 有選取時顯示) */}
      {selectedIds.size > 0 && viewMode === 'todo' && (
        <div className="sticky top-20 z-30 bg-white border border-red-100 p-3 rounded-xl mb-6 flex justify-between items-center animate-in slide-in-from-top-2 shadow-lg shadow-red-500/5">
          <span className="font-bold text-stone-700 flex items-center gap-2 px-2">
              <CheckSquare className="text-red-500"/> 已選取 {selectedIds.size} 筆
          </span>
          <div className="flex gap-2">
             {/* 🔴 批量駁回按鈕 */}
             <button 
               onClick={handleBatchReject} 
               disabled={batchProcessing} 
               className="bg-white text-stone-600 border border-stone-200 px-4 py-2 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
             >
               {batchProcessing ? <Loader2 className="animate-spin" size={16}/> : <XCircle size={16}/>} 
               批量駁回
             </button>

             {/* 🟢 批量核准按鈕 */}
             <button 
               onClick={handleBatchApprove} 
               disabled={batchProcessing} 
               className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-md shadow-red-500/20 hover:bg-red-700 text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
             >
               {batchProcessing ? <Loader2 className="animate-spin" size={16}/> : <Check size={16}/>} 
               批量核准
             </button>
          </div>
        </div>
      )}

      {/* ================= Tabs (分頁籤) ================= */}
      <div className="flex gap-6 border-b border-stone-200 mb-6 overflow-x-auto">
        <button
          onClick={() => { setViewMode('todo'); setSelectedIds(new Set()); }}
          className={`pb-3 px-1 text-sm font-bold transition-all flex items-center gap-2 relative whitespace-nowrap ${
            viewMode === 'todo' 
              ? 'text-red-600 border-b-2 border-red-600' 
              : 'text-stone-400 hover:text-stone-600'
          }`}
        >
          <CheckSquare size={18} />
          待我簽核
          {todoCount > 0 && (
            <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-sm">
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

      {/* ================= 列表區域 (卡片 vs 表格) ================= */}
      {loading ? (
        <div className="bg-white/50 backdrop-blur rounded-2xl border border-stone-200 p-12 text-center text-stone-400 flex flex-col items-center min-h-[400px] justify-center">
          <Loader2 className="animate-spin mb-3 text-red-500" size={32} />
          <p>資料載入中...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="bg-white/50 backdrop-blur rounded-2xl border border-stone-200 dashed p-12 text-center text-stone-400 flex flex-col items-center min-h-[400px] justify-center">
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
              
              return (
                <div key={req.id} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm relative overflow-hidden group">
                  {/* ✅ 手機版勾選框 */}
                  {viewMode === 'todo' && (
                      <div className="absolute top-4 left-4 z-10">
                          <input 
                              type="checkbox" 
                              checked={selectedIds.has(req.id)}
                              onChange={() => handleSelect(req.id)}
                              className="w-5 h-5 rounded border-stone-300 text-red-600 focus:ring-red-500"
                          />
                      </div>
                  )}
                  
                  <Link to={`${BASE_PATH}/request/${req.id}`} className={`block ${viewMode === 'todo' ? 'pl-8' : ''}`}>
                      {/* 卡片頂部 */}
                      <div className="flex justify-between items-start mb-3">
                        <div>
                            <span className="text-xs font-mono text-stone-400 block">#{String(req.id).padStart(4, '0')}</span>
                            <span className="text-xs text-stone-400 mt-0.5 block">{req.apply_date}</span>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                            {status.label}
                        </span>
                      </div>
                      
                      {/* 卡片中間 */}
                      <div className="mb-4">
                        <h3 className="font-bold text-stone-800 text-lg mb-1 truncate">
                            {req.payee_name}
                        </h3>
                        <div className="text-sm text-stone-600 flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <Building size={14} className="text-stone-400 shrink-0" />
                              <span className="truncate">{req.brand} - {req.store}</span>
                            </div>
                            <div className="flex items-center gap-1.5 overflow-hidden">
                              <FileText size={14} className="text-stone-400 shrink-0" />
                              <span className="truncate text-stone-500">{req.content || '無說明'}</span>
                            </div>
                        </div>
                      </div>

                      {/* 卡片底部 */}
                      <div className="flex justify-between items-end border-t border-stone-100 pt-3">
                        <div>
                            <p className="text-xs text-stone-400 mb-0.5">付款金額</p>
                            <p className="text-xl font-bold text-stone-700 font-mono">
                              ${Number(req.amount).toLocaleString()}
                            </p>
                        </div>

                        {/* 紙本按鈕 */}
                        <button
                            onClick={(e) => {
                                e.preventDefault(); 
                                togglePaperStatus(req.id, req.is_paper_received);
                            }}
                            disabled={currentRole !== 'accountant'}
                            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                            req.is_paper_received 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : 'bg-stone-50 text-stone-400 border-stone-200'
                            } ${currentRole !== 'accountant' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-stone-100'}`}
                        >
                            {req.is_paper_received ? <FileCheck size={14} /> : <FileX size={14} />}
                            {req.is_paper_received ? '紙本已收' : '未收紙本'}
                        </button>

                        <div className="text-stone-300 group-hover:text-red-500 transition-colors">
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
                  {/* ✅ 全選 Checkbox */}
                  {viewMode === 'todo' && (
                      <th className="p-4 w-10 text-center">
                          <input 
                              type="checkbox" 
                              onChange={handleSelectAll} 
                              checked={selectedIds.size > 0 && selectedIds.size === filteredRequests.length}
                              className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
                          />
                      </th>
                  )}
                  <th className="p-4 w-24">單號</th>
                  <th className="p-4 w-32">申請日期</th>
                  <th className="p-4 w-48">申請資訊</th>
                  <th className="p-4">受款 / 說明</th>
                  <th className="p-4 text-right w-32">金額</th>
                  <th className="p-4 text-center w-24">紙本</th>
                  <th className="p-4 text-center w-32">狀態</th>
                  <th className="p-4 text-center w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredRequests.map((req) => {
                  const statusInfo = STATUS_MAP[req.status] || STATUS_MAP['draft'];
                  
                  return (
                    <tr key={req.id} className="hover:bg-stone-50 transition-colors group">
                      {/* ✅ 單選 Checkbox */}
                      {viewMode === 'todo' && (
                          <td className="p-4 text-center">
                              <input 
                                  type="checkbox" 
                                  checked={selectedIds.has(req.id)}
                                  onChange={() => handleSelect(req.id)}
                                  className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
                              />
                          </td>
                      )}
                      <td className="p-4">
                        <span className="font-mono font-bold text-stone-400">#{String(req.id).padStart(4, '0')}</span>
                      </td>
                      <td className="p-4 text-sm text-stone-600">
                        {req.apply_date}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-stone-700 text-sm">{req.brand}</div>
                        <div className="text-xs text-stone-500">{req.store}</div>
                        <div className="text-xs text-stone-400 mt-0.5">
                            申請人: {req.creator_name}
                        </div>
                      </td>
                      <td className="p-4">
                         <div className="font-medium text-stone-900 truncate max-w-[200px]" title={req.payee_name}>
                           {req.payee_name}
                         </div>
                         <div className="text-sm text-stone-500 truncate max-w-[200px]" title={req.content}>
                           {req.content}
                         </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="font-mono font-bold text-stone-700">
                          ${Number(req.amount).toLocaleString()}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <button
                            onClick={() => togglePaperStatus(req.id, req.is_paper_received)}
                            disabled={currentRole !== 'accountant'}
                            title={currentRole !== 'accountant' ? "只有會計可操作" : req.is_paper_received ? "點擊取消入庫" : "點擊確認入庫"}
                            className={`p-1.5 rounded-lg transition-colors ${
                            req.is_paper_received 
                                ? 'text-blue-600 bg-blue-50' 
                                : 'text-stone-300'
                            } ${currentRole === 'accountant' ? 'hover:bg-stone-100' : ''}`}
                        >
                            {req.is_paper_received ? <FileCheck size={18} /> : <FileX size={18} />}
                        </button>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {/* 進度條 */}
                        {statusInfo.step > 0 && statusInfo.step < 6 && (
                          <div className="mt-1 w-full bg-stone-200 rounded-full h-1 max-w-[80px] mx-auto opacity-50 group-hover:opacity-100 transition-opacity">
                            <div className="bg-red-400 h-1 rounded-full" style={{ width: `${(statusInfo.step / 5) * 100}%` }}></div>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <Link 
                          to={`${BASE_PATH}/request/${req.id}`} 
                          className="text-stone-300 hover:text-red-600 transition-colors p-2"
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
      <InstallPrompt />
    </div>
  );
}