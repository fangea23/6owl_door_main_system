import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { 
  Shield, 
  UserPlus, 
  Users, 
  Save, 
  Search, 
  Loader2, 
  Mail, 
  Calendar,
  User,
  ChevronRight,
  Trash2 // ✅ 新增垃圾桶圖示
} from 'lucide-react';

// 環境變數
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

const ROLES = [
  { value: 'staff', label: '一般員工', color: 'bg-gray-100 text-gray-600' },
  { value: 'unit_manager', label: '單位主管', color: 'bg-blue-100 text-blue-700' },
  { value: 'accountant', label: '會計', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'audit_manager', label: '審核主管', color: 'bg-purple-100 text-purple-700' },
  { value: 'cashier', label: '出納', color: 'bg-orange-100 text-orange-700' },
  { value: 'boss', label: '放行主管', color: 'bg-pink-100 text-pink-700' },
  { value: 'admin', label: '系統管理員', color: 'bg-red-100 text-red-700' },
];

export default function AdminPanel() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState('list'); 
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'staff'
  });

  useEffect(() => {
    if (role && role !== 'admin' && role !== 'boss') {
      alert('您沒有權限存取此頁面');
      navigate('/systems/payment-approval/dashboard');
    }
  }, [role, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('載入失敗:', error);
      alert('無法載入使用者列表');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    if (!window.confirm('確定要修改此使用者的權限嗎？')) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      alert('權限更新成功！');
      fetchUsers(); 
    } catch (error) {
      alert('更新失敗: ' + error.message);
    }
  };

  // ✅ 新增：處理刪除使用者
  // ✅ 修改：加入 targetRole 參數
    const handleDeleteUser = async (userId, userName, targetRole) => {
    // 1. 防呆檢查：如果是 Admin，直接禁止刪除
    if (targetRole === 'admin') {
        alert('❌ 操作禁止！\n\n「系統管理員 (Admin)」帳號受到最高級別保護，無法刪除。\n若必須刪除，請先將其權限修改為其他角色。');
        return;
    }

    const confirmDelete = window.confirm(
        `⚠️ 警告！\n\n確定要刪除使用者「${userName}」嗎？\n此操作無法復原，該使用者將無法再登入。`
    );
    if (!confirmDelete) return;

    const doubleCheck = window.prompt(`請輸入 "DELETE" 以確認刪除 ${userName}：`);
    if (doubleCheck !== 'DELETE') return;

    setProcessing(true);
    try {
        const { error } = await supabase.rpc('delete_user_by_admin', { target_user_id: userId });
        if (error) throw error;
        alert(`✅ 使用者 ${userName} 已成功刪除。`);
        fetchUsers();
    } catch (error) {
        console.error('刪除失敗:', error);
        alert('刪除失敗: ' + error.message);
    } finally {
        setProcessing(false);
    }
    };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const tempSupabase = createClient(supabaseUrl, supabaseKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      });

      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: { data: { full_name: newUser.fullName } }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('無法建立使用者');

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([
          {
            id: authData.user.id,
            email: newUser.email,
            full_name: newUser.fullName,
            role: newUser.role,
            updated_at: new Date().toISOString()
          }
        ]);

      if (profileError) {
        console.error('Profile 寫入失敗:', profileError);
        alert(`帳號已建立，但 Profile 設定失敗: ${profileError.message}`);
      } else {
        alert('🎉 帳號建立成功！');
        setNewUser({ email: '', password: '', fullName: '', role: 'staff' });
        setActiveTab('list');
        fetchUsers(); 
      }

    } catch (error) {
      console.error(error);
      alert('建立失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(u => 
    (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (u.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="text-center text-emerald-600"><Loader2 className="animate-spin inline mr-2" size={32}/><p className="mt-2 text-sm font-medium">系統資料載入中...</p></div></div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      
      {/* 頂部導航區塊 */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* 標題 */}
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Shield className="text-emerald-700" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">系統管理後台</h1>
                <p className="text-xs text-gray-500">帳號權限與人員管理</p>
              </div>
            </div>

            {/* 切換按鈕 */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'list' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Users size={16} /> 列表
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'create' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <UserPlus size={16} /> 新增
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8">
        
        {activeTab === 'list' && (
          <div className="space-y-6">
            
            {/* 搜尋列 */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text" 
                placeholder="搜尋姓名或 Email..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>

            {/* ----------------- 💻 電腦版：傳統表格 (md:block) ----------------- */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                    <th className="p-5 font-semibold">使用者資訊</th>
                    <th className="p-5 font-semibold">目前角色</th>
                    <th className="p-5 font-semibold">加入時間</th>
                    <th className="p-5 font-semibold text-center">權限設定</th>
                    <th className="p-5 font-semibold text-center w-20">刪除</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u) => {
                    const roleInfo = ROLES.find(r => r.value === u.role) || { label: u.role, color: 'bg-gray-100 text-gray-600' };
                    const isSelf = user?.id === u.id;
                    const isAdmin = u.role === 'admin'; // ✅ 新增：判斷是否為管理員

                    return (
                      <tr key={u.id} className="hover:bg-emerald-50/30 transition-colors group">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">
                              {u.full_name?.[0] || <User size={20}/>}
                            </div>
                            <div>
                              <div className="font-bold text-gray-800 text-base flex items-center gap-2">
                                {u.full_name || '未設定姓名'}
                                {isSelf && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded">你自己</span>}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Mail size={12}/> {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="p-5 text-sm text-gray-500 font-mono">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-5 text-center">
                          <select 
                            value={u.role}
                            onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                            disabled={isSelf} // 不能改自己的權限，怕把自己鎖死
                            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {ROLES.map(r => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        </td>
                            <td className="p-5 text-center">
                                <button
                                // ✅ 修改：傳入 u.role
                                onClick={() => handleDeleteUser(u.id, u.full_name || u.email, u.role)}
                                // ✅ 修改：如果是自己 OR 是 Admin，都禁用按鈕
                                disabled={isSelf || processing || isAdmin}
                                className={`p-2 rounded-full transition-colors ${
                                    isSelf || isAdmin // ✅ 修改：樣式判斷
                                    ? 'text-gray-300 cursor-not-allowed bg-gray-50' 
                                    : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                                // ✅ 修改：提示文字
                                title={isSelf ? "無法刪除自己" : isAdmin ? "系統管理員無法被刪除" : "刪除帳號"}
                                >
                                <Trash2 size={18} />
                                </button>
                            </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ----------------- 📱 手機版：卡片視圖 (md:hidden) ----------------- */}
            <div className="md:hidden space-y-4">
              {filteredUsers.map((u) => {
                const roleInfo = ROLES.find(r => r.value === u.role) || { label: u.role, color: 'bg-gray-100 text-gray-600' };
                const isSelf = user?.id === u.id;
                const isAdmin = u.role === 'admin'; // ✅ 新增
                return (
                  <div key={u.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
                    {/* 卡片頭部 */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xl shadow-inner">
                          {u.full_name?.[0] || <User size={24}/>}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            {u.full_name || '未設定姓名'}
                            {isSelf && <span className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0.5 rounded">你自己</span>}
                          </h3>
                          <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${roleInfo.color}`}>
                            {roleInfo.label}
                          </span>
                        </div>
                      </div>
                      
                      {/* 手機版刪除按鈕 */}
                        {!isSelf && !isAdmin && (
                                <button
                                onClick={() => handleDeleteUser(u.id, u.full_name || u.email, u.role)}
                                disabled={processing}
                                className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                <Trash2 size={20} />
                                </button>
                            )}
                            
                            {/* ✅ 選用：如果是 Admin，顯示一個鎖頭圖示代替刪除鈕 */}
                            {isAdmin && !isSelf && (
                                <div className="p-2 text-gray-300" title="管理員帳號受保護">
                                <Shield size={20} />
                                </div>
                            )}
                            </div>

                    {/* 資訊欄位 */}
                    <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <Mail size={16} className="text-gray-400"/>
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400"/>
                        <span>加入時間：{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* 操作區 */}
                    <div className="pt-2 border-t border-gray-100">
                      <label className="text-xs font-bold text-gray-400 mb-1 block">變更權限</label>
                      <div className="relative">
                        <select 
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                          disabled={isSelf}
                          className="w-full appearance-none bg-white border border-gray-300 text-gray-700 py-2.5 px-3 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium shadow-sm disabled:bg-gray-100 disabled:text-gray-400"
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                          <ChevronRight className="rotate-90" size={16}/>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 無資料提示 */}
            {filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Users size={48} className="mb-2 opacity-20"/>
                <p>查無符合的使用者</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: 新增帳號 (維持不變) */}
        {activeTab === 'create' && (
          <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-200">
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                  <UserPlus size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">建立新使用者</h2>
                <p className="text-gray-500 mt-1">為新進員工建立系統登入帳號</p>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">電子信箱 (登入帳號)</label>
                  <input 
                    type="email" 
                    required
                    placeholder="user@example.com"
                    value={newUser.email}
                    onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">真實姓名</label>
                  <input 
                    type="text" 
                    required
                    placeholder="例如：王小明"
                    value={newUser.fullName}
                    onChange={e => setNewUser({...newUser, fullName: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">預設密碼</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      minLength={6}
                      placeholder="至少 6 位數"
                      value={newUser.password}
                      onChange={e => setNewUser({...newUser, password: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none font-mono tracking-wide"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                    <Shield size={12}/> 建議設定後請使用者自行修改密碼
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">權限角色</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLES.map(r => (
                      <label key={r.value} className={`
                        relative flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm
                        ${newUser.role === r.value 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-1 ring-emerald-500' 
                          : 'bg-white border-gray-200 hover:border-emerald-300 text-gray-600'}
                      `}>
                        <input 
                          type="radio" 
                          name="role" 
                          value={r.value}
                          checked={newUser.role === r.value}
                          onChange={e => setNewUser({...newUser, role: e.target.value})}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <span className="font-bold text-sm">{r.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={processing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-200 transition-all flex justify-center items-center gap-2 mt-4 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {processing ? <Loader2 className="animate-spin" size={20}/> : <UserPlus size={20}/>}
                  確認建立帳號
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}