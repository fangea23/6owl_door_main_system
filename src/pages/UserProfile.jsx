import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { supabase } from '../lib/supabase';
import UserProfileCard from '../components/UserProfile/UserProfileCard';

/**
 * 統一的用戶資料頁面
 * 所有系統共用此頁面
 */
export default function UserProfile() {
  const navigate = useNavigate();
  const { user, loading, refetch } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  // 開始編輯
  const handleStartEdit = () => {
    setFormData({
      full_name: user?.profile?.full_name || '',
      phone: user?.phone || '',
      mobile: user?.mobile || '',
    });
    setIsEditing(true);
  };

  // 取消編輯
  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormData({});
  };

  // 儲存變更
  const handleSave = async () => {
    try {
      setSaving(true);

      // 更新 profiles
      if (formData.full_name !== user?.profile?.full_name) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ full_name: formData.full_name })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // 如果有員工記錄，更新 employees
      if (user?.hasEmployeeRecord) {
        const { error: employeeError } = await supabase
          .from('employees')
          .update({
            phone: formData.phone || null,
            mobile: formData.mobile || null,
          })
          .eq('user_id', user.id);

        if (employeeError) throw employeeError;
      }

      alert('✅ 個人資料已更新');
      setIsEditing(false);
      refetch();
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('❌ 更新失敗: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition"
          >
            <ArrowLeft size={20} />
            <span>返回</span>
          </button>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-4xl mx-auto p-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">個人資料</h1>
          <p className="text-gray-600">查看和編輯您的個人資訊</p>
        </div>

        {!isEditing ? (
          /* 顯示模式 */
          <UserProfileCard user={user} onEdit={handleStartEdit} />
        ) : (
          /* 編輯模式 */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Edit2 size={20} />
                編輯個人資料
              </h2>
            </div>

            <div className="space-y-4">
              {/* 顯示名稱 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  顯示名稱 *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="您的名稱"
                />
                <p className="text-xs text-gray-500 mt-1">
                  此名稱將顯示在所有系統中
                </p>
              </div>

              {/* 聯絡電話 */}
              {user?.hasEmployeeRecord && (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      電話
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="02-1234-5678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      手機
                    </label>
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="0912-345-678"
                    />
                  </div>
                </>
              )}

              {/* 提示：其他資料需要 HR 更新 */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 如需更新部門、職位等組織資訊，請聯繫 HR 部門或系統管理員。
                </p>
              </div>
            </div>

            {/* 操作按鈕 */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !formData.full_name}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>儲存中...</span>
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    <span>儲存變更</span>
                  </>
                )}
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              >
                <X size={20} />
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
