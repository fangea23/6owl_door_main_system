import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Car, AlertCircle } from 'lucide-react';
import { useRentalRequests } from '../hooks/useRentalRequests';
import { useVehicles } from '../hooks/useVehicles';
import { useCurrentEmployee } from '../hooks/useCurrentEmployee';
import toast from 'react-hot-toast';

export const RequestForm = () => {
  const navigate = useNavigate();
  const { createRequest } = useRentalRequests();
  const { fetchAvailableVehicles, vehicles } = useVehicles();
  const { employee, loading: employeeLoading, error: employeeError } = useCurrentEmployee();

  const [formData, setFormData] = useState({
    vehicle_id: '',
    preferred_vehicle_type: 'sedan',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    purpose: '',
    destination: '',
    estimated_mileage: '',
  });

  const vehicleTypes = [
    { value: '', label: '不指定' },
    { value: 'sedan', label: '轎車' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: '廂型車' },
    { value: 'truck', label: '貨車' },
  ];

  // 當日期改變時，重新獲取可用車輛
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      fetchAvailableVehicles(formData.start_date, formData.end_date);
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 驗證日期
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('結束日期不能早於開始日期');
      return;
    }

    // 檢查員工資訊
    if (!employee) {
      toast.error('無法獲取員工資訊，請重新登入');
      return;
    }

    // 準備提交數據
    const submitData = {
      ...formData,
      requester_id: employee.id, // 使用員工 ID（從 public.employees 表）
      vehicle_id: formData.vehicle_id || null,
      estimated_mileage: formData.estimated_mileage ? parseInt(formData.estimated_mileage) : null,
    };

    const result = await createRequest(submitData);

    if (result.success) {
      toast.success('申請已提交，等待審核');
      navigate('/systems/car-rental/my-rentals');
    } else {
      toast.error(result.error || '提交失敗');
    }
  };

  // 載入中
  if (employeeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">載入員工資訊...</p>
        </div>
      </div>
    );
  }

  // 錯誤或沒有員工資料
  if (employeeError || !employee) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          返回
        </button>
        <div className="bg-white rounded-lg border border-red-200 p-8">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="w-8 h-8" />
            <h2 className="text-2xl font-bold">無法載入員工資訊</h2>
          </div>
          <p className="text-gray-700 mb-4">
            {employeeError || '您的帳號尚未關聯員工資料，請聯繫 HR 部門設定。'}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            需要在 <code className="bg-gray-100 px-2 py-1 rounded">public.employees</code> 表中設定您的員工記錄，
            並將 <code className="bg-gray-100 px-2 py-1 rounded">user_id</code> 欄位關聯到您的登入帳號。
          </p>
          <button
            onClick={() => navigate('/systems/car-rental/dashboard')}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700"
          >
            返回儀表板
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        返回
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">租車申請</h1>
          <p className="text-gray-600 mt-2">請填寫以下資訊以提交租車申請</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 申請人資訊顯示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm font-medium text-blue-900 mb-2">申請人資訊</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-blue-700">姓名：</span>
                <span className="text-blue-900 font-medium">{employee.name}</span>
              </div>
              <div>
                <span className="text-blue-700">員工編號：</span>
                <span className="text-blue-900 font-medium">{employee.employee_id}</span>
              </div>
              <div>
                <span className="text-blue-700">部門：</span>
                <span className="text-blue-900 font-medium">
                  {employee.department?.name || '未設定'}
                </span>
              </div>
              <div>
                <span className="text-blue-700">職位：</span>
                <span className="text-blue-900 font-medium">{employee.position || '未設定'}</span>
              </div>
            </div>
          </div>

          {/* 用車時間 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              用車時間
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始日期 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  結束日期 *
                </label>
                <input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  開始時間
                </label>
                <input
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  結束時間
                </label>
                <input
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 車輛選擇 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Car className="w-5 h-5" />
              車輛需求
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  偏好車型
                </label>
                <select
                  value={formData.preferred_vehicle_type}
                  onChange={(e) => setFormData({...formData, preferred_vehicle_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  指定車輛（選填）
                </label>
                <select
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                  disabled={!formData.start_date || !formData.end_date}
                >
                  <option value="">不指定</option>
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
                </select>
                {(!formData.start_date || !formData.end_date) && (
                  <p className="text-xs text-gray-500 mt-1">請先選擇用車日期</p>
                )}
              </div>
            </div>
          </div>

          {/* 用車資訊 */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">用車資訊</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  用車目的 *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                  placeholder="例如：客戶拜訪、公務出差、貨物運送等"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  目的地
                </label>
                <input
                  type="text"
                  value={formData.destination}
                  onChange={(e) => setFormData({...formData, destination: e.target.value})}
                  placeholder="例如：台北市信義區..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  預估里程 (km)
                </label>
                <input
                  type="number"
                  value={formData.estimated_mileage}
                  onChange={(e) => setFormData({...formData, estimated_mileage: e.target.value})}
                  placeholder="預估行駛公里數"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* 提交按鈕 */}
          <div className="flex gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium"
            >
              提交申請
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
