import React from 'react';
import { Car, Calendar, MapPin, CheckCircle, Clock } from 'lucide-react';
import { useRentals } from '../hooks/useRentals';
import { useCurrentEmployee } from '../hooks/useCurrentEmployee'; // 👈 引入這個

export const MyRentals = () => {
  // 1. 取得當前員工資料
  const { employee, loading: employeeLoading } = useCurrentEmployee();
  
  // 2. 將員工 ID 傳給 useRentals (如果還沒載入完成，傳 null)
  const { rentals, loading: rentalsLoading } = useRentals(employee?.id); 

  const loading = employeeLoading || rentalsLoading;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };
  const getStatusInfo = (status) => {
    const statusMap = {
      confirmed: { label: '已確認', color: 'blue', icon: CheckCircle },
      in_progress: { label: '使用中', color: 'green', icon: Clock },
      completed: { label: '已完成', color: 'gray', icon: CheckCircle },
      cancelled: { label: '已取消', color: 'red', icon: Clock },
    };
    return statusMap[status] || statusMap.confirmed;
  };

  const activeRentals = rentals.filter(r => ['confirmed', 'in_progress'].includes(r.status));
  const pastRentals = rentals.filter(r => ['completed', 'cancelled'].includes(r.status));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  const RentalCard = ({ rental, isActive = false }) => {
    const statusInfo = getStatusInfo(rental.status);
    const StatusIcon = statusInfo.icon;

    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200',
      red: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-50 rounded-lg">
                <Car className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {rental.vehicle?.plate_number || '車輛資訊未提供'}
                </h3>
                <p className="text-sm text-gray-500">
                  {rental.vehicle?.brand} {rental.vehicle?.model}
                </p>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 border ${
                colors[statusInfo.color]
              }`}
            >
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">租借期間：</span>
              <span className="font-medium">
                {formatDate(rental.start_date)} - {formatDate(rental.end_date)}
              </span>
            </div>

            {rental.request?.destination && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">目的地：</span>
                <span className="font-medium">{rental.request.destination}</span>
              </div>
            )}

            {rental.request?.purpose && (
              <div className="text-sm">
                <span className="text-gray-600">用車目的：</span>
                <span className="font-medium">{rental.request.purpose}</span>
              </div>
            )}

            {rental.actual_start_time && (
              <div className="text-sm">
                <span className="text-gray-600">實際取車：</span>
                <span className="font-medium">{formatDateTime(rental.actual_start_time)}</span>
              </div>
            )}

            {rental.actual_end_time && (
              <div className="text-sm">
                <span className="text-gray-600">實際還車：</span>
                <span className="font-medium">{formatDateTime(rental.actual_end_time)}</span>
              </div>
            )}

            {rental.start_mileage && rental.end_mileage && (
              <div className="text-sm">
                <span className="text-gray-600">里程：</span>
                <span className="font-medium">
                  {rental.start_mileage} → {rental.end_mileage} ({rental.total_mileage} km)
                </span>
              </div>
            )}
          </div>

          {isActive && rental.status === 'confirmed' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                <Clock className="w-4 h-4 inline mr-1" />
                請於取車時間前往指定地點領取車輛
              </div>
            </div>
          )}

          {isActive && rental.status === 'in_progress' && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                正在使用中，請注意還車時間
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">我的租借</h1>
        <p className="text-gray-600 mt-1">查看您的租車記錄</p>
      </div>

      {/* Active Rentals */}
      {activeRentals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">進行中的租借</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeRentals.map(rental => (
              <RentalCard key={rental.id} rental={rental} isActive={true} />
            ))}
          </div>
        </div>
      )}

      {/* Past Rentals */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">歷史記錄</h2>
        {pastRentals.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {pastRentals.map(rental => (
              <RentalCard key={rental.id} rental={rental} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">沒有歷史記錄</h3>
            <p className="text-gray-600">您還沒有完成的租車記錄</p>
          </div>
        )}
      </div>

      {activeRentals.length === 0 && pastRentals.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">沒有租借記錄</h3>
          <p className="text-gray-600 mb-4">您還沒有任何租車記錄</p>
        </div>
      )}
    </div>
  );
};
