import React from 'react';
import { Mail, Phone, Briefcase, Building2, User as UserIcon, Shield, Calendar } from 'lucide-react';
import UserAvatar from './UserAvatar';

/**
 * 統一的用戶資料卡片組件
 * 顯示用戶的完整資訊
 */
export default function UserProfileCard({ user, onEdit }) {
  if (!user) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 text-center">
        <UserIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 mb-3" />
        <p className="text-sm sm:text-base text-gray-500">無法載入用戶資訊</p>
      </div>
    );
  }

  const roleLabels = {
    user: '一般使用者',
    staff: '員工',
    manager: '主管',
    hr: '人資',
    admin: '系統管理員',
  };

  const roleColors = {
    user: 'bg-gray-100 text-gray-700',
    staff: 'bg-blue-100 text-blue-700',
    manager: 'bg-purple-100 text-purple-700',
    hr: 'bg-green-100 text-green-700',
    admin: 'bg-red-100 text-red-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 頂部裝飾 - 手機版優化 */}
      <div className="h-24 sm:h-32 bg-gradient-to-br from-blue-500 to-purple-600" />

      {/* 用戶資訊區 - 手機版優化 */}
      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        {/* 頭像 - 手機版優化 */}
        <div className="relative -mt-12 sm:-mt-16 mb-3 sm:mb-4">
          <UserAvatar
            avatarUrl={user.avatarUrl}
            displayName={user.displayName}
            size="xlarge"
            className="border-4 border-white shadow-lg"
          />
        </div>

        {/* 姓名和角色 - 手機版優化 */}
        <div className="mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
            {user.displayName}
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${roleColors[user.role] || roleColors.user}`}>
              <Shield size={12} className="sm:w-[14px] sm:h-[14px]" />
              {roleLabels[user.role] || user.role}
            </span>
            {user.employeeId && (
              <span className="text-xs sm:text-sm text-gray-500 font-mono">
                ID: {user.employeeId}
              </span>
            )}
          </div>
        </div>

        {/* 資訊網格 - 手機版優化 */}
        <div className="space-y-2.5 sm:space-y-3">
          {/* Email */}
          <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
            <Mail className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-gray-500 mb-1">電子郵件</div>
              <div className="text-xs sm:text-sm text-gray-800 font-medium break-all">
                {user.email}
              </div>
            </div>
          </div>

          {/* 部門和職位 */}
          {user.hasEmployeeRecord && (
            <>
              {user.department && (
                <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                  <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">部門</div>
                    <div className="text-xs sm:text-sm text-gray-800 font-medium">
                      {user.department}
                      {user.departmentCode && (
                        <span className="ml-2 text-xs text-gray-500 font-mono">
                          ({user.departmentCode})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {user.position && (
                <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                  <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">職位</div>
                    <div className="text-xs sm:text-sm text-gray-800 font-medium">
                      {user.position}
                    </div>
                  </div>
                </div>
              )}

              {/* 聯絡方式 */}
              {(user.phone || user.mobile) && (
                <div className="flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-gray-500 mb-1">聯絡電話</div>
                    <div className="text-xs sm:text-sm text-gray-800 font-medium space-y-1">
                      {user.phone && <div>電話: {user.phone}</div>}
                      {user.mobile && <div>手機: {user.mobile}</div>}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 如果沒有員工記錄，顯示提示 */}
          {!user.hasEmployeeRecord && (
            <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2.5 sm:gap-3">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs sm:text-sm font-semibold text-yellow-800 mb-1">
                    尚未建立員工記錄
                  </div>
                  <div className="text-xs text-yellow-700 leading-relaxed">
                    您的帳號尚未關聯到員工資料。請聯繫 HR 部門設定完整的員工資訊。
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 編輯按鈕 - 手機版優化 */}
        {onEdit && (
          <button
            onClick={onEdit}
            className="w-full mt-5 sm:mt-6 px-4 py-2.5 sm:py-3 text-sm sm:text-base bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-lg transition-colors touch-manipulation"
          >
            編輯個人資料
          </button>
        )}
      </div>
    </div>
  );
}
