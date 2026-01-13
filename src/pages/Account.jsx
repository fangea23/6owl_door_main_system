import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header'; // 確保引用新的 Header

export default function Account() {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // ... (省略中間的 form state 與 handler 邏輯，與原檔案相同，無需變動) ...
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    department: user?.department || '',
    position: user?.position || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: '', text: '' });
    const result = await updateProfile(profileForm);
    if (result.success) {
      setMessage({ type: 'success', text: '個人資料已更新' });
      setIsEditing(false);
    } else {
      setMessage({ type: 'error', text: result.error });
    }
    setIsSaving(false);
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: '新密碼與確認密碼不符' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: '密碼長度至少需要 6 個字元' });
      return;
    }
    setIsSaving(true);
    const result = await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
    if (result.success) {
      setMessage({ type: 'success', text: '密碼已成功變更' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setMessage({ type: 'error', text: result.error });
    }
    setIsSaving(false);
  };

  const tabs = [
    { id: 'profile', name: '個人資料', icon: '👤' },
    { id: 'security', name: '安全設定', icon: '🔒' },
    { id: 'notifications', name: '通知設定', icon: '🔔' },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 重用共用的 Header，保持一致性 */}
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* 用戶資訊卡片 - 極致質感升級 */}
        <div className="relative overflow-hidden bg-gradient-to-r from-red-900 via-red-800 to-rose-900 rounded-3xl p-8 mb-10 text-white shadow-2xl shadow-red-900/20 group">
          {/* 背景紋理 */}
          <div className="absolute inset-0 bg-pattern-hex opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          
          {/* 裝飾性光暈 */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-20 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-white/20 to-white/5 backdrop-blur-md rounded-full flex items-center justify-center text-4xl border border-white/20 shadow-inner">
                {user?.name?.charAt(0) || '👤'}
              </div>
              <div className="absolute bottom-0 right-0 w-6 h-6 bg-green-500 border-4 border-red-900 rounded-full"></div>
            </div>
            
            <div className="text-center sm:text-left flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                <h2 className="text-3xl font-bold tracking-tight">{user?.name}</h2>
                <span className="inline-block px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30 rounded backdrop-blur-sm">
                  {user?.role === 'admin' ? 'ADMINISTRATOR' : 'EMPLOYEE'}
                </span>
              </div>
              <p className="text-red-100 text-lg mb-4">{user?.department} · {user?.position}</p>
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 text-sm text-red-200/80">
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                  <span>員工編號：{user?.employeeId || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  <span>{user?.email}</span>
                </div>
              </div>
            </div>

            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl backdrop-blur-sm transition-colors text-sm font-medium">
              更換頭像
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* 側邊選單 - 樣式優化 */}
          <div className="md:w-64 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden sticky top-24">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMessage({ type: '', text: '' });
                  }}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all relative ${
                    activeTab === tab.id
                      ? 'bg-red-50 text-red-700 font-bold'
                      : 'text-stone-600 hover:bg-stone-50 font-medium'
                  }`}
                >
                  {/* 左側指示條 */}
                  {activeTab === tab.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-600"></div>
                  )}
                  <span className={`text-xl ${activeTab === tab.id ? 'scale-110' : ''} transition-transform`}>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 內容區 */}
          <div className="flex-1">
            {message.text && (
              <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
                message.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <span className="text-xl">{message.type === 'success' ? '✅' : '⚠️'}</span>
                {message.text}
              </div>
            )}

            {/* 內容容器 */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 p-8">
              
              {/* 個人資料 */}
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

                  <form onSubmit={handleProfileSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-stone-700">姓名</label>
                        <input
                          type="text"
                          name="name"
                          value={profileForm.name}
                          onChange={handleProfileChange}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-800 disabled:bg-stone-100 disabled:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-stone-700">電話</label>
                        <input
                          type="tel"
                          name="phone"
                          value={profileForm.phone}
                          onChange={handleProfileChange}
                          disabled={!isEditing}
                          className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 text-stone-800 disabled:bg-stone-100 disabled:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-stone-700">部門</label>
                        <div className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-between">
                          <span>{profileForm.department}</span>
                          <span className="text-xs text-stone-400">鎖定</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-stone-700">職位</label>
                        <div className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-100 text-stone-500 flex items-center justify-between">
                          <span>{profileForm.position}</span>
                          <span className="text-xs text-stone-400">鎖定</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-stone-700">電子郵件</label>
                      <div className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-100 text-stone-500 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                        <span>{user?.email}</span>
                      </div>
                    </div>

                    {isEditing && (
                      <div className="flex gap-4 pt-6 border-t border-stone-100">
                        <button
                          type="submit"
                          disabled={isSaving}
                          className="px-6 py-2.5 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white font-medium rounded-xl shadow-lg shadow-red-500/30 transition-all disabled:opacity-50"
                        >
                          {isSaving ? '儲存中...' : '儲存變更'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-6 py-2.5 border border-stone-200 text-stone-600 font-medium rounded-xl hover:bg-stone-50 transition-colors"
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </form>
                </>
              )}

              {/* 安全設定 */}
              {activeTab === 'security' && (
                <>
                  <div className="mb-8 pb-4 border-b border-stone-100">
                    <h3 className="text-xl font-bold text-stone-800">登入與安全</h3>
                    <p className="text-sm text-stone-500 mt-1">定期更換密碼以保護您的帳戶安全</p>
                  </div>

                  <form onSubmit={handlePasswordSubmit} className="space-y-5 max-w-lg">
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-stone-700">目前密碼</label>
                      <input
                        type="password"
                        name="currentPassword"
                        value={passwordForm.currentPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-stone-700">新密碼</label>
                      <input
                        type="password"
                        name="newPassword"
                        value={passwordForm.newPassword}
                        onChange={handlePasswordChange}
                        required
                        minLength={6}
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-stone-700">確認新密碼</label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={passwordForm.confirmPassword}
                        onChange={handlePasswordChange}
                        required
                        className="w-full px-4 py-2.5 border border-stone-200 rounded-xl bg-stone-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                      />
                    </div>
                    <div className="pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white font-medium rounded-xl shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
                      >
                        {isSaving ? '更新中...' : '更新密碼'}
                      </button>
                    </div>
                  </form>
                </>
              )}
              
              {/* Notifications - 樣式統一 (略，套用相同邏輯) */}
              {activeTab === 'notifications' && (
                 <div className="space-y-4">
                   <div className="mb-6">
                    <h3 className="text-xl font-bold text-stone-800">通知偏好</h3>
                    <p className="text-sm text-stone-500 mt-1">控制您接收通知的方式</p>
                   </div>
                   {/* ... (內容與原檔類似，但 Checkbox 改為紅色系) ... */}
                   {[
                    { id: 'email_approval', name: '簽核通知', desc: '當有待簽核項目時發送郵件通知' },
                    { id: 'email_system', name: '系統公告', desc: '接收系統維護與更新通知' },
                    { id: 'browser_push', name: '瀏覽器推播', desc: '允許瀏覽器顯示桌面通知' },
                   ].map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-xl hover:border-stone-300 transition-colors">
                      <div>
                        <p className="font-bold text-stone-800">{item.name}</p>
                        <p className="text-sm text-stone-500">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
                      </label>
                    </div>
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