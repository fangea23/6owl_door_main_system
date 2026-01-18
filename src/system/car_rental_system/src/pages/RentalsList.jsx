import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Key, CheckCircle, Clock, 
  Car, Calendar, User, ChevronDown 
} from 'lucide-react';
import { useRentals } from '../hooks/useRentals';
import toast from 'react-hot-toast';

export const RentalsList = () => {
  const { rentals, loading, pickupVehicle, returnVehicle, fetchRentals } = useRentals(null);
  const [filter, setFilter] = useState('active'); // active, all, confirmed, in_progress, completed
  const [searchTerm, setSearchTerm] = useState('');

  // 狀態過濾器選項
  const tabs = [
    { id: 'active', label: '進行中任務' }, // 包含 confirmed (待取) + in_progress (借出)
    { id: 'confirmed', label: '待取車' },
    { id: 'in_progress', label: '使用中' },
    { id: 'completed', label: '歷史記錄' },
    { id: 'all', label: '全部' },
  ];

  // 處理搜尋與過濾
  const filteredRentals = rentals.filter(r => {
    // 1. 狀態篩選
    let statusMatch = true;
    if (filter === 'active') {
      statusMatch = ['confirmed', 'in_progress'].includes(r.status);
    } else if (filter !== 'all') {
      statusMatch = r.status === filter;
    }

    // 2. 關鍵字搜尋 (車號 或 申請人)
    const searchMatch = 
      r.vehicle?.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.renter?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && searchMatch;
  });

  // 處理取車
  const handlePickup = async (rental) => {
    if (window.confirm(`確認將鑰匙交給 ${rental.renter?.name} 嗎？\n車號：${rental.vehicle?.plate_number}`)) {
      const result = await pickupVehicle(rental.id);
      if (result.success) toast.success('取車成功');
      else toast.error(result.error);
    }
  };

  // 處理還車
  const handleReturn = async (rental) => {
    if (window.confirm(`確認 ${rental.renter?.name} 已歸還車輛？`)) {
      const result = await returnVehicle(rental.id);
      if (result.success) toast.success('還車成功');
      else toast.error(result.error);
    }
  };

  // 狀態標籤樣式
  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
      in_progress: 'bg-amber-100 text-amber-800 border-amber-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    const labels = {
      confirmed: '待取車',
      in_progress: '使用中',
      completed: '已還車',
      cancelled: '已取消',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.cancelled}`}>
        {labels[status] || status}
      </span>
    );
  };

  if (loading) return <div className="p-8 text-center text-gray-500">載入中...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      
      {/* 標題區 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">租借記錄管理</h1>
          <p className="text-gray-500 mt-1">管理車輛的出借、歸還與歷史記錄</p>
        </div>
      </div>

      {/* 控制列 (搜尋 + Tab) */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                filter === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋車號或申請人..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          />
        </div>
      </div>

      {/* 列表內容 */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">車輛資訊</th>
                <th className="px-6 py-4 font-semibold">借用人</th>
                <th className="px-6 py-4 font-semibold">行程時間</th>
                <th className="px-6 py-4 font-semibold text-center">狀態</th>
                <th className="px-6 py-4 font-semibold text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredRentals.length > 0 ? (
                filteredRentals.map((rental) => (
                  <tr key={rental.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                          <Car className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{rental.vehicle?.plate_number}</p>
                          <p className="text-xs text-gray-500">{rental.vehicle?.brand} {rental.vehicle?.model}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{rental.renter?.name || '未知'}</span>
                      </div>
                      <div className="text-xs text-gray-400 pl-6">
                        {rental.renter?.department?.name}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-green-50 text-green-700 px-1.5 rounded">起</span>
                          {new Date(rental.start_date).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-red-50 text-red-700 px-1.5 rounded">迄</span>
                          {new Date(rental.end_date).toLocaleString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {getStatusBadge(rental.status)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {rental.status === 'confirmed' && (
                        <button
                          onClick={() => handlePickup(rental)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          <Key className="w-3.5 h-3.5" />
                          確認取車
                        </button>
                      )}
                      
                      {rental.status === 'in_progress' && (
                        <button
                          onClick={() => handleReturn(rental)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          確認還車
                        </button>
                      )}

                      {rental.status === 'completed' && (
                        <span className="text-xs text-gray-400">已結案</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-400">
                    沒有符合條件的記錄
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};