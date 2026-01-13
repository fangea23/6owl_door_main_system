import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Account() {
  const { user, updateProfile, changePassword } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

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
    <div className="min-h-screen bg-stone-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-stone-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link to="/" className="flex items-center gap-2 text-stone-500 hover:text-stone-700 dark:text-slate-400 dark:hover:text-slate-200">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>返回首頁</span>
              </Link>
            </div>
            <h1 className="text-lg font-semibold text-stone-800 dark:text-white">帳戶設定</h1>
            <div className="w-24" /> {/* Spacer */}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 用戶資訊卡片 - 改為紅色漸層 */}
        <div className="bg-gradient-to-br from-red-800 via-red-700 to-rose-600 rounded-2xl p-6 mb-8 text-white shadow-xl shadow-red-900/20">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-3xl border border-white/20">
              {user?.name?.charAt(0) || '👤'}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-red-100">{user?.department} · {user?.position}</p>
              <p className="text-red-200/80 text-sm mt-1">員工編號：{user?.employeeId}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* 側邊選單 */}
          <div className="md:w-56 flex-shrink-0">
            <nav className="bg-white dark:bg-slate-800 rounded-xl shadow-sm overflow-hidden border border-stone-100 dark:border-stone-700">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setMessage({ type: '', text: '' });
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                    activeTab === tab.id
                      // 改為紅色選中狀態
                      ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-l-4 border-red-600'
                      : 'text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-slate-700/50 border-l-4 border-transparent'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span className="font-medium">{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* 內容區 */}
          <div className="flex-1">
            {/* 訊息提示 */}
            {message.text && (
              <div className={`mb-4 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                  : 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
              }`}>
                {message.text}
              </div>
            )}

            {/* 個人資料 */}
            {activeTab === 'profile' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-stone-100 dark:border-stone-700">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-stone-800 dark:text-white">個人資料</h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      // 改為紅色連結
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      編輯
                    </button>
                  )}
                </div>

                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1">
                        姓名
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-stone-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-stone-800 dark:text-white disabled:bg-stone-50 dark:disabled:bg-slate-600 disabled:cursor-not-allowed focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1">
                        電話
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        disabled={!isEditing}
                        className="w-full px-4 py-2 border border-stone-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-stone-800 dark:text-white disabled:bg-stone-50 dark:disabled:bg-slate-600 disabled:cursor-not-allowed focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1">
                        部門
                      </label>
                      <input
                        type="text"
                        name="department"
                        value={profileForm.department}
                        disabled
                        className="w-full px-4 py-2 border border-stone-200 dark:border-slate-600 rounded-lg bg-stone-50 dark:bg-slate-600 text-stone-500 dark:text-slate-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-stone-400 mt-1">如需變更請聯繫人資部門</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1">
                        職位
                      </label>
                      <input
                        type="text"
                        name="position"
                        value={profileForm.position}
                        disabled
                        className="w-full px-4 py-2 border border-stone-200 dark:border-slate-600 rounded-lg bg-stone-50 dark:bg-slate-600 text-stone-500 dark:text-slate-400 cursor-not-allowed"
                      />
                      <p className="text-xs text-stone-400 mt-1">如需變更請聯繫人資部門</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1">
                      電子郵件
                    </label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="w-full px-4 py-2 border border-stone-200 dark:border-slate-600 rounded-lg bg-stone-50 dark:bg-slate-600 text-stone-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>

                  {isEditing && (
                    <div className="flex gap-3 pt-4">
                      <button
                        type="submit"
                        disabled={isSaving}
                        // 改為紅色按鈕
                        className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isSaving ? '儲存中...' : '儲存變更'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setProfileForm({
                            name: user?.name || '',
                            phone: user?.phone || '',
                            department: user?.department || '',
                            position: user?.position || '',
                          });
                        }}
                        className="px-6 py-2 border border-stone-200 dark:border-slate-600 text-stone-600 dark:text-slate-300 font-medium rounded-lg hover:bg-stone-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </form>
              </div>
            )}

            {/* 安全設定 */}
            {activeTab === 'security' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-stone-100 dark:border-stone-700">
                <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-6">變更密碼</h3>

                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1">
                      目前密碼
                    </label>
                    <input
                      type="password"
                      name="currentPassword"
                      value={passwordForm.currentPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-4 py-2 border border-stone-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1">
                      新密碼
                    </label>
                    <input
                      type="password"
                      name="newPassword"
                      value={passwordForm.newPassword}
                      onChange={handlePasswordChange}
                      required
                      minLength={6}
                      className="w-full px-4 py-2 border border-stone-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-stone-700 dark:text-slate-300 mb-1">
                      確認新密碼
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={passwordForm.confirmPassword}
                      onChange={handlePasswordChange}
                      required
                      className="w-full px-4 py-2 border border-stone-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-stone-800 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSaving}
                    // 改為紅色按鈕
                    className="px-6 py-2 bg-red-700 hover:bg-red-800 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isSaving ? '更新中...' : '更新密碼'}
                  </button>
                </form>

                <hr className="my-8 border-stone-200 dark:border-slate-700" />

                <div>
                  <h4 className="font-medium text-stone-800 dark:text-white mb-4">登入裝置</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-stone-50 dark:bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">💻</span>
                        <div>
                          <p className="font-medium text-stone-800 dark:text-white">目前裝置</p>
                          <p className="text-sm text-stone-500 dark:text-slate-400">Chrome · Windows</p>
                        </div>
                      </div>
                      <span className="text-xs text-emerald-600 font-medium">使用中</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 通知設定 */}
            {activeTab === 'notifications' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 border border-stone-100 dark:border-stone-700">
                <h3 className="text-lg font-semibold text-stone-800 dark:text-white mb-6">通知設定</h3>

                <div className="space-y-4">
                  {[
                    { id: 'email_approval', name: '簽核通知', desc: '當有待簽核項目時發送郵件通知' },
                    { id: 'email_system', name: '系統公告', desc: '接收系統維護與更新通知' },
                    { id: 'browser_push', name: '瀏覽器推播', desc: '允許瀏覽器顯示桌面通知' },
                  ].map(item => (
                    <div key={item.id} className="flex items-center justify-between p-4 bg-stone-50 dark:bg-slate-700/50 rounded-lg">
                      <div>
                        <p className="font-medium text-stone-800 dark:text-white">{item.name}</p>
                        <p className="text-sm text-stone-500 dark:text-slate-400">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" defaultChecked className="sr-only peer" />
                        {/* 改為紅色開關 (peer-checked:bg-red-600) */}
                        <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}