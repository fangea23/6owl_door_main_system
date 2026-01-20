import React from 'react';
import { Bell, CheckCheck, Trash2, X, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { zhTW } from 'date-fns/locale';

// 通知類型圖標和顏色
const notificationConfig = {
  approval: {
    icon: CheckCircle,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200'
  },
  system: {
    icon: Info,
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-600',
    borderColor: 'border-gray-200'
  },
  alert: {
    icon: AlertCircle,
    bgColor: 'bg-amber-50',
    iconColor: 'text-amber-600',
    borderColor: 'border-amber-200'
  }
};

function NotificationItem({ notification, onMarkAsRead, onDelete }) {
  const config = notificationConfig[notification.type] || notificationConfig.system;
  const Icon = config.icon;

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
    locale: zhTW
  });

  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        notification.is_read
          ? 'bg-white border-stone-100'
          : `${config.bgColor} ${config.borderColor}`
      } hover:shadow-sm group`}
    >
      <div className="flex items-start gap-3">
        {/* 圖標 */}
        <div className={`p-2 rounded-lg ${config.bgColor} ${config.iconColor} flex-shrink-0`}>
          <Icon size={18} />
        </div>

        {/* 內容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-medium ${notification.is_read ? 'text-stone-700' : 'text-stone-900'}`}>
              {notification.title}
            </h4>
            {!notification.is_read && (
              <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1.5"></span>
            )}
          </div>

          {notification.message && (
            <p className="text-xs text-stone-500 mt-1 line-clamp-2">
              {notification.message}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-stone-400">
              {timeAgo}
            </span>

            {/* 操作按鈕 */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.is_read && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  title="標記為已讀"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              <button
                onClick={() => onDelete(notification.id)}
                className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                title="刪除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationPanel({ isOpen, onClose }) {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll
  } = useNotifications();

  if (!isOpen) return null;

  return (
    <>
      {/* 背景遮罩 (手機版) */}
      <div
        className="fixed inset-0 bg-black/20 z-40 md:hidden"
        onClick={onClose}
      />

      {/* 通知面板 */}
      <div className="absolute right-0 mt-2 w-full sm:w-96 bg-white rounded-xl shadow-xl border border-stone-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 頭部 */}
        <div className="sticky top-0 bg-white border-b border-stone-100 px-4 py-3 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-stone-600" />
              <h3 className="font-bold text-stone-800">通知中心</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                  {unreadCount} 則未讀
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-1 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* 操作按鈕 */}
          {notifications.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  全部標為已讀
                </button>
              )}
              <button
                onClick={() => {
                  if (window.confirm('確定要清除所有通知嗎？')) {
                    clearAll();
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                清除全部
              </button>
            </div>
          )}
        </div>

        {/* 通知列表 */}
        <div className="max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-3">
                <Bell size={28} className="text-stone-400" />
              </div>
              <p className="text-sm font-medium text-stone-600 mb-1">暫無通知</p>
              <p className="text-xs text-stone-400 text-center">
                所有通知都會在這裡顯示
              </p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onDelete={deleteNotification}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
