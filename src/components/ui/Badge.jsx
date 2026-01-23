import React from 'react';

/**
 * 通用標籤元件
 */
const variants = {
  // 狀態
  success: 'bg-green-100 text-green-700 border-green-200',
  warning: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  error: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border-gray-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  pink: 'bg-pink-100 text-pink-700 border-pink-200',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  teal: 'bg-teal-100 text-teal-700 border-teal-200',
};

const sizes = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export default function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = ''
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold rounded-full border
        ${variants[variant] || variants.neutral}
        ${sizes[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            variant === 'success' ? 'bg-green-500' :
            variant === 'warning' ? 'bg-yellow-500' :
            variant === 'error' ? 'bg-red-500' :
            variant === 'info' ? 'bg-blue-500' :
            'bg-gray-400'
          }`}
        />
      )}
      {children}
    </span>
  );
}

// 預設的狀態映射
export const statusBadgeMap = {
  // 員工狀態
  active: { label: '在職', variant: 'success' },
  on_leave: { label: '請假中', variant: 'warning' },
  resigned: { label: '已離職', variant: 'neutral' },
  terminated: { label: '已終止', variant: 'error' },

  // 門市類型
  direct: { label: '直營', variant: 'info' },
  franchise: { label: '加盟', variant: 'purple' },

  // 組織類型
  headquarters: { label: '總部', variant: 'indigo' },
  store: { label: '門市', variant: 'teal' },

  // 僱用類型
  fulltime: { label: '正職', variant: 'success' },
  parttime: { label: '計時', variant: 'warning' },
  contract: { label: '約聘', variant: 'orange' },
  intern: { label: '實習', variant: 'info' },
};

export function StatusBadge({ status, map = statusBadgeMap }) {
  const config = map[status] || { label: status, variant: 'neutral' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
