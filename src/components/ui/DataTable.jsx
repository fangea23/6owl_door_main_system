import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

/**
 * 通用資料表格元件
 */
export default function DataTable({
  columns,
  data,
  loading = false,
  emptyIcon,
  emptyMessage = '沒有資料',
  onRowClick,
  pagination,
  className = ''
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">載入中...</span>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        {emptyIcon && <div className="mb-3 opacity-20">{emptyIcon}</div>}
        <p className="text-lg">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`p-4 font-semibold ${col.headerClassName || ''}`}
                  style={col.width ? { width: col.width } : {}}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, rowIdx) => (
              <tr
                key={row.id || rowIdx}
                className={`hover:bg-blue-50/30 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`p-4 ${col.cellClassName || ''}`}>
                    {col.render ? col.render(row) : row[col.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            顯示 {pagination.from}-{pagination.to} 筆，共 {pagination.total} 筆
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={pagination.onPrevious}
              disabled={pagination.page <= 1}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="px-3 py-1 text-sm text-gray-600">
              第 {pagination.page} / {pagination.totalPages} 頁
            </span>
            <button
              onClick={pagination.onNext}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
