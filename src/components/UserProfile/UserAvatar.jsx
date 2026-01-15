import React from 'react';
import { User } from 'lucide-react';

/**
 * 統一的用戶頭像組件
 * 根據頭像 URL 或名稱首字母顯示
 */
export default function UserAvatar({
  avatarUrl,
  displayName,
  size = 'default',
  className = ''
}) {
  const sizeClasses = {
    small: 'w-8 h-8 text-sm',
    default: 'w-10 h-10 text-base',
    large: 'w-12 h-12 text-lg',
    xlarge: 'w-16 h-16 text-2xl',
  };

  const sizeClass = sizeClasses[size] || sizeClasses.default;
  const initial = displayName?.[0]?.toUpperCase() || '?';

  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white shadow-sm ${className}`}
      style={{
        background: avatarUrl
          ? `url(${avatarUrl}) center/cover`
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      {!avatarUrl && (
        displayName ? initial : <User size={size === 'small' ? 16 : 20} />
      )}
    </div>
  );
}
