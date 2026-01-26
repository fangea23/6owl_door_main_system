import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useProfiles } from '../../../hooks/management/useProfiles';
import { supabase } from '../../../lib/supabase';
import {
  UserPlus, Search, Loader2, Mail, Calendar, User, ChevronRight, Trash2, Shield, Save, BadgeCheck, Users
} from 'lucide-react';

// 角色顏色映射
const ROLE_COLORS = {
  super_admin: 'bg-red-100 text-red-700',
  ceo: 'bg-red-100 text-red-700',
  boss: 'bg-pink-100 text-pink-700',
  director: 'bg-purple-100 text-purple-700',
  hq_fin_manager: 'bg-indigo-100 text-indigo-700',
  hq_hr_manager: 'bg-green-100 text-green-700',
  hq_ops_manager: 'bg-blue-100 text-blue-700',
  area_supervisor: 'bg-blue-100 text-blue-700',
  hq_accountant: 'bg-indigo-100 text-indigo-700',
  hq_auditor: 'bg-purple-100 text-purple-700',
  hq_cashier: 'bg-orange-100 text-orange-700',
  hq_hr_specialist: 'bg-green-100 text-green-700',
  hq_it_admin: 'bg-cyan-100 text-cyan-700',
  hq_purchaser: 'bg-amber-100 text-amber-700',
  hq_trainer: 'bg-teal-100 text-teal-700',
  store_manager: 'bg-blue-100 text-blue-700',
  car_admin: 'bg-gray-100 text-gray-700',
  assistant_manager: 'bg-sky-100 text-sky-700',
  hq_staff: 'bg-gray-100 text-gray-600',
  meeting_admin: 'bg-gray-100 text-gray-700',
  store_staff: 'bg-gray-100 text-gray-600',
  store_parttime: 'bg-gray-100 text-gray-500',
  user: 'bg-gray-100 text-gray-500',
};

export default function ProfilesManagement() {
  const { user: currentUser } = useAuth();
  const {
    profiles,
    loading,
    createProfile,
    updateProfileRole,
    deleteProfile,
  } = useProfiles();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [roles, setRoles] = useState([]); // 從資料庫讀取的角色列表

  // 建立模式：'email' | 'employee'
  const [createMode, setCreateMode] = useState('employee');

  const [newUser, setNewUser] = useState({
    email: '',
    employee_id: '', // 員工編號
    password: '',
    full_name: '',
    role: 'user'
  });

  // 從資料庫載入有效角色
  useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .schema('rbac')
        .from('roles')
        .select('code, name, level, scope_type, org_type')
        .is('deleted_at', null)
        .order('level', { ascending: false });

      if (!error && data) {
        setRoles(data);
      }
    };
    fetchRoles();
  }, []);

  // 搜尋過濾
  const filteredProfiles = profiles.filter(profile =>
    (profile.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (profile.email?.toLowerCase().includes(searchTerm.toLowerCase()) || '')
  );

  // 處理創建用戶
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // 根據模式準備資料
      const userData = {
        password: newUser.password,
        full_name: newUser.full_name,
        role: newUser.role,
      };

      if (createMode === 'employee') {
        userData.employee_id = newUser.employee_id;
      } else {
        userData.email = newUser.email;
      }

      const result = await createProfile(userData);

      if (result.success) {
        const loginInfo = createMode === 'employee'
          ? `登入帳號：${newUser.employee_id}`
          : `登入帳號：${newUser.email}`;
        alert(`✅ 帳號建立成功！\n\n${loginInfo}\n預設密碼：${newUser.password}\n\n請告知使用者登入後修改密碼。`);
        setNewUser({ email: '', employee_id: '', password: '', full_name: '', role: 'user' });
        setShowCreateForm(false);
      } else {
        alert('❌ 建立失敗: ' + result.error);
      }
    } catch (error) {
      alert('❌ 建立失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // 處理更新角色
  const handleUpdateRole = async (userId, newRole) => {
    if (!window.confirm('確定要修改此使用者的權限嗎？')) return;

    setProcessing(true);
    try {
      const result = await updateProfileRole(userId, newRole);

      if (result.success) {
        alert('✅ 權限更新成功！');
      } else {
        alert('❌ 更新失敗: ' + result.error);
      }
    } catch (error) {
      alert('❌ 更新失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // 處理刪除用戶
  const handleDeleteUser = async (userId, userName, targetRole) => {
    // 防呆檢查：如果是超級管理員，直接禁止刪除
    if (targetRole === 'super_admin') {
      alert('❌ 操作禁止！\n\n「超級管理員」帳號受到最高級別保護，無法刪除。\n若必須刪除，請先將其權限修改為其他角色。');
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
      const result = await deleteProfile(userId);

      if (result.success) {
        alert(`✅ 使用者 ${userName} 已成功刪除。`);
      } else {
        alert('❌ 刪除失敗: ' + result.error);
      }
    } catch (error) {
      alert('❌ 刪除失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">載入中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 操作列 */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        {/* 搜尋 */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋姓名或 Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        {/* 新增按鈕 */}
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <UserPlus size={20} />
          {showCreateForm ? '取消' : '新增帳號'}
        </button>
      </div>

      {/* 新增表單 */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <UserPlus size={20} />
            建立新使用者帳號
          </h3>

          <form onSubmit={handleCreateUser} className="space-y-4">
            {/* 建立模式切換 */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-2">
              <button
                type="button"
                onClick={() => setCreateMode('employee')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  createMode === 'employee'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <BadgeCheck size={16} />
                員工編號（門市推薦）
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('email')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  createMode === 'email'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Mail size={16} />
                電子郵件
              </button>
            </div>

            {/* 提示訊息 */}
            {createMode === 'employee' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
                <strong>員工編號模式：</strong>適合門市員工，不需要真實 Email。使用者登入時輸入員工編號和密碼即可。
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 員工編號輸入（員工編號模式） */}
              {createMode === 'employee' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    員工編號 (登入帳號) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="例如：A001、S0123"
                    value={newUser.employee_id}
                    onChange={e => setNewUser({ ...newUser, employee_id: e.target.value.toUpperCase() })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                  />
                  <p className="text-xs text-gray-500 mt-1">員工登入時使用此編號</p>
                </div>
              )}

              {/* Email 輸入（Email 模式） */}
              {createMode === 'email' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    電子信箱 (登入帳號) *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="user@example.com"
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  真實姓名 *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：王小明"
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  預設密碼 *
                </label>
                <input
                  type="text"
                  required
                  minLength={6}
                  placeholder="至少 6 位數"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">建議設定後請使用者自行修改密碼</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  權限角色 *
                </label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {roles.map(r => (
                    <option key={r.code} value={r.code}>
                      {r.name} (Lv.{r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={processing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                確認建立
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 用戶列表 - 桌面版 */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
              <th className="p-5 font-semibold">使用者資訊</th>
              <th className="p-5 font-semibold">目前角色</th>
              <th className="p-5 font-semibold">加入時間</th>
              <th className="p-5 font-semibold text-center">權限設定</th>
              <th className="p-5 font-semibold text-center w-20">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredProfiles.map((profile) => {
              const roleInfo = roles.find(r => r.code === profile.role);
              const roleLabel = roleInfo?.name || profile.role || '未設定';
              const roleColor = ROLE_COLORS[profile.role] || 'bg-gray-100 text-gray-600';
              const isSelf = currentUser?.id === profile.id;
              const isAdmin = profile.role === 'super_admin';

              return (
                <tr key={profile.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                        {profile.full_name?.[0] || <User size={20} />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-800 flex items-center gap-2">
                          {profile.full_name || '未設定姓名'}
                          {isSelf && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">你自己</span>}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          {profile.email?.endsWith('@6owldoor.internal') ? (
                            <>
                              <BadgeCheck size={12} className="text-green-600" />
                              <span className="text-green-700 font-medium">
                                {profile.email.replace('@6owldoor.internal', '').toUpperCase()}
                              </span>
                              <span className="text-gray-400 text-xs ml-1">(員工編號)</span>
                            </>
                          ) : (
                            <>
                              <Mail size={12} /> {profile.email}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </td>
                  <td className="p-5 text-sm text-gray-500">
                    {new Date(profile.created_at).toLocaleDateString('zh-TW')}
                  </td>
                  <td className="p-5 text-center">
                    <select
                      value={profile.role || ''}
                      onChange={(e) => handleUpdateRole(profile.id, e.target.value)}
                      disabled={isSelf || processing}
                      className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">-- 請選擇 --</option>
                      {roles.map(r => (
                        <option key={r.code} value={r.code}>
                          {r.name} (Lv.{r.level})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-5 text-center">
                    <button
                      onClick={() => handleDeleteUser(profile.id, profile.full_name || profile.email, profile.role)}
                      disabled={isSelf || processing || isAdmin}
                      className={`p-2 rounded-full transition-colors ${isSelf || isAdmin
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                        }`}
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

      {/* 用戶列表 - 手機版 */}
      <div className="md:hidden space-y-4">
        {filteredProfiles.map((profile) => {
          const roleInfo = roles.find(r => r.code === profile.role);
          const roleLabel = roleInfo?.name || profile.role || '未設定';
          const roleColor = ROLE_COLORS[profile.role] || 'bg-gray-100 text-gray-600';
          const isSelf = currentUser?.id === profile.id;
          const isAdmin = profile.role === 'super_admin';

          return (
            <div key={profile.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                    {profile.full_name?.[0] || <User size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                      {profile.full_name || '未設定姓名'}
                      {isSelf && <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded">你自己</span>}
                    </h3>
                    <span className={`inline-flex mt-1 px-2 py-0.5 rounded text-xs font-bold ${roleColor}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>

                {!isSelf && !isAdmin && (
                  <button
                    onClick={() => handleDeleteUser(profile.id, profile.full_name || profile.email, profile.role)}
                    disabled={processing}
                    className="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={20} />
                  </button>
                )}

                {isAdmin && !isSelf && (
                  <div className="p-2 text-gray-300" title="超級管理員帳號受保護">
                    <Shield size={20} />
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 mb-3">
                <div className="flex items-center gap-2">
                  {profile.email?.endsWith('@6owldoor.internal') ? (
                    <>
                      <BadgeCheck size={16} className="text-green-600" />
                      <span className="text-green-700 font-medium">
                        {profile.email.replace('@6owldoor.internal', '').toUpperCase()}
                      </span>
                      <span className="text-gray-400 text-xs">(員工編號)</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} className="text-gray-400" />
                      <span className="truncate">{profile.email}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-gray-400" />
                  <span>加入時間：{new Date(profile.created_at).toLocaleDateString('zh-TW')}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-500 mb-1 block">變更權限</label>
                <select
                  value={profile.role || ''}
                  onChange={(e) => handleUpdateRole(profile.id, e.target.value)}
                  disabled={isSelf || processing}
                  className="w-full bg-white border border-gray-300 text-gray-700 py-2.5 px-3 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium disabled:bg-gray-100"
                >
                  <option value="">-- 請選擇 --</option>
                  {roles.map(r => (
                    <option key={r.code} value={r.code}>
                      {r.name} (Lv.{r.level})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* 無資料提示 */}
      {filteredProfiles.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Users size={64} className="mb-3 opacity-20" />
          <p className="text-lg">查無符合的使用者</p>
        </div>
      )}

      {/* 統計資訊 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm text-gray-600">
        <p>共 <span className="font-bold text-blue-600">{filteredProfiles.length}</span> 個帳號</p>
      </div>
    </div>
  );
}
