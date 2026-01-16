import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { supabase } from '../lib/supabase';
import Header from '../components/Header';
import { 
  User, 
  Shield, 
  Bell, 
  Camera, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  AlertTriangle,
  Phone,
  Smartphone,
  Users,
  Calendar
} from 'lucide-react';

// ------------------------------------------------------------------
// 1. 可重用的密碼輸入組件
// ------------------------------------------------------------------
const PasswordInput = ({ name, value, onChange, placeholder, required = true, minLength }) => {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all pr-10 text-stone-800"
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors p-1"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default function Account() {
  const { changePassword } = useAuth();
  const { user, loading, refetch } = useCurrentUser();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // 表單狀態
  const [profileForm, setProfileForm] = useState({
    name: '',           
    phone: '',          
    mobile: '',        
    department: '',     
    position: '',       
    employeeId: '',     
    hireDate: '',       
    supervisor: '',     
    emergencyName: '',  
    emergencyPhone: '', 
    emergencyRel: '',   
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // 初始化資料
  useEffect(() => {
    if (user && !loading) {
      setProfileForm({
        name: user.profile?.full_name || user.displayName || '',
        phone: user.employee?.phone || '',
        mobile: user.employee?.mobile || '',
        department: user.department || '未分配',
        position: user.position || 'N/A',
        employeeId: user.employeeId || 'N/A',
        hireDate: user.employee?.hire_date || '',
        supervisor: user.supervisor || '無',
        emergencyName: user.employee?.emergency_contact_name || '',
        emergencyPhone: user.employee?.emergency_contact_phone || '',
        emergencyRel: user.employee?.emergency_contact_relationship || '',
      });
    }
  }, [user, loading]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  // Submit: 更新個人資料
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    
    try {
      const updates = [];
      const profileUpdate = supabase
        .from('profiles')
        .update({ full_name: profileForm.name })
        .eq('id', user.id);
      updates.push(profileUpdate);

      if (user.hasEmployeeRecord) {
        const employeeUpdate = supabase
          .from('employees')
          .update({
            phone: profileForm.phone || null,
            mobile: profileForm.mobile || null,
            emergency_contact_name: profileForm.emergencyName || null,
            emergency_contact_phone: profileForm.emergencyPhone || null,
            emergency_contact_relationship: profileForm.emergencyRel || null,
          })
          .eq('user_id', user.id);
        updates.push(employeeUpdate);
      }

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error).map(r => r.error.message);
      
      if (errors.length > 0) throw new Error(errors.join(', '));

      setMessage({ type: 'success', text: '個人資料已更新成功' });
      setIsEditing(false);
      refetch(); 
      
    } catch (error) {
      console.error('Update error:', error);
      setMessage({ type: 'error', text: '更新失敗: ' + error.message });
    } finally {
      setIsSaving(false);
    }
  };

  // Submit: 變更密碼 (🔥 已修正卡住問題 + 新增檢查)
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    // 1. 檢查兩次新密碼是否相同
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '新密碼與確認密碼不符' });
      return;
    }
    // 2. 檢查長度
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: '密碼長度至少需要 6 個字元' });
      return;
    }
    // 3. ✅ 新增：檢查新密碼是否與舊密碼相同
    if (passwordForm.newPassword === passwordForm.currentPassword) {
      setMessage({ type: 'error', text: '新密碼不能與舊密碼相同' });
      return;
    }

    setIsSaving(true); // 開啟 Loading

    try {
      // 呼叫 AuthContext 的變更密碼函式
      const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      
      console.log('Password change result:', result); // Debug log

      if (result && result.success) {
        setMessage({ type: 'success', text: '密碼已成功變更' });
        // 清空表單
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        // 如果 result 為 undefined 或 success 為 false
        setMessage({ type: 'error', text: result?.error || '變更失敗，請稍後再試' });
      }
    } catch (err) {
      console.error('Unexpected error changing password:', err);
      setMessage({ type: 'error', text: '系統發生錯誤，請聯絡管理員' });
    } finally {
      // 🔥 無論成功或失敗，這裡一定會執行，確保按鈕恢復
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', name: '個人資料', icon: <User size={20} /> },
    { id: 'security', name: '安全設定', icon: <Shield size={20} /> },
    { id: 'notifications', name: '通知設定', icon: <Bell size={20} /> },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* 用戶資訊卡片 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-red-900 via-red-800 to-rose-900 rounded-3xl p-6 sm:p-8 mb-8 sm:mb-10 text-white shadow-2xl shadow-red-900/20 group">
          <div className="absolute inset-0 bg-pattern-hex opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          
          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group/avatar cursor-pointer">
              <div className="w-24 h-24 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-4xl border border-white/20 shadow-inner overflow-hidden">
                {user?.displayName?.charAt(0) || '👤'}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                <Camera className="w-8 h-8 text-white/90" />
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-4 border-red-900 rounded-full"></div>
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1 justify-center sm:justify-start">
                <h2 className="text-3xl font-bold tracking-tight">{user?.displayName || '載入中...'}</h2>
                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded backdrop-blur-sm">
                  {user?.role === 'admin' ? 'ADMINISTRATOR' : 'EMPLOYEE'}
                </span>
              </div>
              <p className="text-red-100 text-lg mb-4">{user?.department || '部門未定'} · {user?.position || '職位未定'}</p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-red-200/80">
                <div className="flex items-center gap-1.5">
                  <span className="opacity-70">員工編號：</span>
                  <span className="font-mono">{user?.employeeId || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                   <span>{user?.email}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          
          {/* 側邊選單 */}
          <div className="md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden sticky top-24">
              <div className="flex md:flex-col overflow-x-auto md:overflow-visible no-scrollbar">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMessage({ type: '', text: '' });
                    }}
                    className={`
                      flex-shrink-0 w-full flex items-center gap-3 px-5 py-4 text-left transition-all relative whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'bg-red-50 text-red-700 font-bold'
                        : 'text-stone-600 hover:bg-stone-50 font-medium'
                      }
                      border-b-2 md:border-b-0 md:border-l-4 border-transparent
                      ${activeTab === tab.id ? 'border-red-600' : ''}
                    `}
                  >
                    <span className={`transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : ''}`}>
                      {tab.icon}
                    </span>
                    <span>{tab.name}</span>
                  </button>
                ))}
              </div>
            </nav>
          </div>

          {/* 內容區 */}
          <div className="flex-1">
            {message.text && (
              <div className={`mb-6 p-4 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <span className="mt-0.5">
                  {message.type === 'success' ? <Check size={20} /> : <AlertTriangle size={20} />}
                </span>
                <span className="font-medium">{message.text}</span>
              </div>
            )}

            <div key={activeTab} className="bg-white rounded-2xl shadow-sm border border-stone-100 p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both">
              
              {/* ==================== 個人資料 Tab ==================== */}
              {activeTab === 'profile' && (
                <>
                  <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                    <div>
                      <h3 className="text-xl font-bold text-stone-800">基本資料</h3>
                      <p className="text-sm text-stone-500 mt-1">管理您的個人資訊與聯絡方式</p>
                    </div>
                    {!isEditing && (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-sm text-red-600 hover:text-red-700 font-medium px-4 py-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        編輯資料
                      </button>
                    )}
                  </div>

                  <form onSubmit={handleProfileSubmit} className="space-y-8">
                    {/* ... (表單內容維持不變) ... */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">聯絡資訊</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">顯示名稱</label>
                          <input
                            type="text"
                            name="name"
                            value={profileForm.name}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-800 disabled:bg-stone-50 disabled:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700 flex items-center gap-1">
                            <Smartphone size={14} /> 行動電話
                          </label>
                          <input
                            type="tel"
                            name="mobile"
                            value={profileForm.mobile}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            placeholder="09xx-xxx-xxx"
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-800 disabled:bg-stone-50 disabled:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700 flex items-center gap-1">
                            <Phone size={14} /> 聯絡市話
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={profileForm.phone}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            placeholder="02-xxxx-xxxx"
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-800 disabled:bg-stone-50 disabled:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">電子郵件</label>
                          <div className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-100/50 text-stone-500 flex items-center gap-2 cursor-not-allowed">
                            <span>{user?.email}</span>
                            <Lock size={14} className="ml-auto text-stone-300" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-stone-100">
                      <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3">緊急聯絡人</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">姓名</label>
                          <input
                            type="text"
                            name="emergencyName"
                            value={profileForm.emergencyName}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-800 disabled:bg-stone-50 disabled:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">關係</label>
                          <input
                            type="text"
                            name="emergencyRel"
                            value={profileForm.emergencyRel}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            placeholder="例如：父子、配偶"
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-800 disabled:bg-stone-50 disabled:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">聯絡電話</label>
                          <input
                            type="tel"
                            name="emergencyPhone"
                            value={profileForm.emergencyPhone}
                            onChange={handleProfileChange}
                            disabled={!isEditing}
                            className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-800 disabled:bg-stone-50 disabled:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-stone-100">
                       <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                         公司資料 <span className="text-xs font-normal text-stone-400 normal-case">(如需修改請聯繫 HR)</span>
                       </h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">部門</label>
                          <div className="group relative w-full px-4 py-2.5 border border-stone-200/80 bg-stone-100/50 rounded-xl text-stone-500 flex items-center justify-between cursor-help">
                            <span>{profileForm.department}</span>
                            <Lock size={14} className="text-stone-400" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">職位</label>
                          <div className="group relative w-full px-4 py-2.5 border border-stone-200/80 bg-stone-100/50 rounded-xl text-stone-500 flex items-center justify-between cursor-help">
                            <span>{profileForm.position}</span>
                            <Lock size={14} className="text-stone-400" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">直屬主管</label>
                          <div className="group relative w-full px-4 py-2.5 border border-stone-200/80 bg-stone-100/50 rounded-xl text-stone-500 flex items-center justify-between cursor-help">
                            <div className="flex items-center gap-2">
                               <Users size={14} />
                               <span>{profileForm.supervisor || '無'}</span>
                            </div>
                            <Lock size={14} className="text-stone-400" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-semibold text-stone-700">到職日期</label>
                          <div className="group relative w-full px-4 py-2.5 border border-stone-200/80 bg-stone-100/50 rounded-xl text-stone-500 flex items-center justify-between cursor-help">
                            <div className="flex items-center gap-2">
                               <Calendar size={14} />
                               <span>{profileForm.hireDate || 'N/A'}</span>
                            </div>
                            <Lock size={14} className="text-stone-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex gap-4 pt-6 border-t border-stone-100 animate-in fade-in slide-in-from-top-2">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-6 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white font-medium rounded-xl shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0"
                        >
                          {isSaving ? '儲存中...' : '儲存變更'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditing(false);
                            if (user) {
                                setProfileForm(prev => ({
                                    ...prev,
                                    name: user.displayName,
                                    mobile: user.employee?.mobile || '',
                                    phone: user.employee?.phone || '',
                                    emergencyName: user.employee?.emergency_contact_name || '',
                                    emergencyPhone: user.employee?.emergency_contact_phone || '',
                                    emergencyRel: user.employee?.emergency_contact_relationship || '',
                                }));
                            }
                          }}
                          className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium rounded-xl hover:bg-stone-50 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </form>
                </>
              )}

              {/* ==================== 安全設定 Tab ==================== */}
              {activeTab === 'security' && (
                <>
                  <div className="mb-8 pb-4 border-b border-stone-100">
                    <h3 className="text-xl font-bold text-stone-800">登入與安全</h3>
                    <p className="text-sm text-stone-500 mt-1">定期更換密碼以保護您的帳戶安全</p>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-lg">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-stone-700">目前密碼</label>
                      <PasswordInput
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="請輸入目前密碼"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-stone-700">新密碼</label>
                      <PasswordInput
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="最少 6 個字元"
                        minLength={6}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-stone-700">確認新密碼</label>
                      <PasswordInput
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="再次輸入新密碼"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50 transform hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {isSaving ? '更新中...' : '更新密碼'}
                      </button>
                    </div>
                  </form>
                </>
              )}
              
              {/* ==================== 通知設定 Tab ==================== */}
              {activeTab === 'notifications' && (
                 <div className="space-y-4">
                   <div className="mb-6">
                    <h3 className="text-xl font-bold text-stone-800">通知偏好</h3>
                    <p className="text-sm text-stone-500 mt-1">控制您接收通知的方式</p>
                   </div>
                   {[
                    { id: 'email_approval', name: '簽核通知', desc: '當有待簽核項目時發送郵件通知' },
                    { id: 'email_system', name: '系統公告', desc: '接收系統維護與更新通知' },
                    { id: 'browser_push', name: '瀏覽器推播', desc: '允許瀏覽器顯示桌面通知' },
                   ].map(item => (
                    <label 
                      key={item.id} 
                      className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl hover:border-red-200 hover:bg-red-50/30 transition-all cursor-pointer group"
                    >
                      <div>
                        <p className="font-bold text-stone-800 group-hover:text-red-900 transition-colors">{item.name}</p>
                        <p className="text-sm text-stone-500">{item.desc}</p>
                      </div>
                      <div className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
                      </div>
                    </label>
                  ))}
                 </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}