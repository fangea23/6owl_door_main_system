import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Car, AlertCircle, Shield, Loader2 } from 'lucide-react';
import { useRentalRequests } from '../hooks/useRentalRequests';
import { useVehicles } from '../hooks/useVehicles';
import { useCurrentEmployee } from '../hooks/useCurrentEmployee';
import { usePermission } from '../../../../hooks/usePermission';
import toast from 'react-hot-toast';

export const RequestForm = () => {
  const navigate = useNavigate();
  const { createRequest } = useRentalRequests();
  const { fetchAvailableVehicles, vehicles } = useVehicles();
  const { employee, loading: employeeLoading, error: employeeError } = useCurrentEmployee();

  // RBAC 權限檢查
  const { hasPermission: canCreate, loading: permissionLoading } = usePermission('car.request.create');

  const [formData, setFormData] = useState({
    vehicle_id: '',
    vehicle_type_filter: '', // 用於前端篩選顯示的車型
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    purpose: '',
    destination: '',
    estimated_mileage: '',
  });

  const vehicleTypes = [
    { value: '', label: '全部車型' },
    { value: 'sedan', label: '轎車' },
    { value: 'suv', label: 'SUV' },
    { value: 'van', label: '廂型車' },
    { value: 'truck', label: '貨車' },
  ];

  // 當日期改變時，重新獲取可用車輛
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      fetchAvailableVehicles(formData.start_date, formData.end_date);
      // 日期改變可能導致原本選的車不可用，因此清空已選車輛
      setFormData(prev => ({ ...prev, vehicle_id: '' }));
    }
  }, [formData.start_date, formData.end_date]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1. 驗證日期順序
    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('結束日期不能早於開始日期');
      return;
    }

    // 2. 驗證是否已選車
    if (!formData.vehicle_id) {
      toast.error('請選擇一輛車');
      return;
    }

    // 3. 驗證員工身分
    if (!employee) {
      toast.error('無法獲取員工資訊，請重新登入');
      return;
    }

    // 準備提交數據
    const submitData = {
      ...formData,
      requester_id: employee.id,
      vehicle_id: formData.vehicle_id,
      estimated_mileage: formData.estimated_mileage ? parseInt(formData.estimated_mileage) : null,
    };
    
    // 移除前端篩選用的欄位，不傳給後端
    delete submitData.vehicle_type_filter;

    const result = await createRequest(submitData);

    if (result.success) {
      toast.success('申請已提交，等待審核');
      navigate('/systems/car-rental/my-rentals');
    } else {
      toast.error(result.error || '提交失敗');
    }
  };

  // 權限載入狀態處理
  if (permissionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-rose-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">檢查權限中...</p>
        </div>
      </div>
    );
  }

  // 無權限處理
  if (!canCreate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">無建立權限</h2>
          <p className="text-gray-600 mb-6">您沒有建立租車申請的權限</p>
          <p className="text-sm text-gray-400 mb-6">請聯絡系統管理員申請 car.request.create 權限</p>
          <button
            onClick={() => navigate('/systems/car-rental/my-rentals')}
            className="w-full bg-rose-600 text-white px-6 py-2.5 rounded-xl hover:bg-rose-700 font-medium shadow-md transition-all"
          >
            返回我的租借
          </button>
        </div>
      </div>
    );
  }

  // 載入狀態處理
  if (employeeLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600 mx-auto"></div>
          <p className="mt-4 text-stone-600">載入員工資訊...</p>
        </div>
      </div>
    );
  }

  // 錯誤處理
  if (employeeError || !employee) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-700 mb-2">無法載入員工資訊</h2>
          <p className="text-stone-600 mb-4">請確認您的帳號已關聯員工資料，或聯繫系統管理員。</p>
          <button onClick={() => navigate(-1)} className="text-stone-500 hover:text-stone-800 underline">返回上一頁</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-stone-600 hover:text-stone-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        返回
      </button>

      <div className="bg-white rounded-xl border border-stone-200 p-8 shadow-sm">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900">租車申請</h1>
          <p className="text-stone-500 mt-2">請選擇車輛並填寫用途以提交申請</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. 申請人資訊 (唯讀區塊) */}
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <p className="text-sm font-bold text-stone-700">申請人</p>
            </div>
            <div className="text-sm text-stone-600 flex flex-wrap gap-x-4 gap-y-1">
                <span className="font-medium text-stone-900">{employee.name}</span>
                <span className="text-stone-300">|</span>
                <span>{employee.department?.name || '未設定部門'}</span>
                <span className="text-stone-300">|</span>
                <span>{employee.position || '未設定職位'}</span>
            </div>
          </div>

          {/* 2. 用車時間 */}
          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2 border-b border-stone-100 pb-2">
              <Calendar className="w-5 h-5 text-rose-600" />
              用車時間
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">開始日期 <span className="text-rose-500">*</span></label>
                <input 
                  type="date" 
                  required 
                  value={formData.start_date} 
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})} 
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">結束日期 <span className="text-rose-500">*</span></label>
                <input 
                  type="date" 
                  required 
                  value={formData.end_date} 
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})} 
                  min={formData.start_date || new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">開始時間</label>
                <input type="time" value={formData.start_time} onChange={(e) => setFormData({...formData, start_time: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">結束時間</label>
                <input type="time" value={formData.end_time} onChange={(e) => setFormData({...formData, end_time: e.target.value})} className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" />
              </div>
            </div>
          </div>

          {/* 3. 車輛選擇 */}
          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2 border-b border-stone-100 pb-2">
              <Car className="w-5 h-5 text-rose-600" />
              車輛選擇
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 選擇車型 (Filter) */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  選擇車型 (篩選)
                </label>
                <select
                  value={formData.vehicle_type_filter}
                  onChange={(e) => setFormData({...formData, vehicle_type_filter: e.target.value, vehicle_id: ''})} // 切換篩選時清空已選車輛
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all"
                >
                  {vehicleTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              {/* 指定車輛 (必填) */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  指定車輛 <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={formData.vehicle_id}
                  onChange={(e) => setFormData({...formData, vehicle_id: e.target.value})}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent disabled:bg-stone-100 disabled:text-stone-400 transition-all"
                  disabled={!formData.start_date || !formData.end_date}
                >
                  <option value="" disabled>
                    {(!formData.start_date || !formData.end_date) 
                      ? '請先選擇用車日期' 
                      : '請選擇一輛車'}
                  </option>
                  
                  {/* 根據車型篩選顯示 */}
                  {(formData.vehicle_type_filter 
                      ? vehicles.filter(v => v.type === formData.vehicle_type_filter) 
                      : vehicles
                  ).map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.brand} {vehicle.model} ({vehicle.seats}人座)
                    </option>
                  ))}

                  {/* 若該車型無車 */}
                  {vehicles.length > 0 && formData.vehicle_type_filter && vehicles.filter(v => v.type === formData.vehicle_type_filter).length === 0 && (
                     <option value="" disabled>此車型目前無可用車輛</option>
                  )}
                </select>
                
                {(!formData.start_date || !formData.end_date) ? (
                  <p className="text-xs text-stone-500 mt-1">請先設定日期以查看可用車輛</p>
                ) : (
                  <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    查詢到 {vehicles.length} 輛可用車
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 4. 行程資訊 */}
          <div>
            <h2 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2 border-b border-stone-100 pb-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              行程資訊
            </h2>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-stone-700 mb-1">用車目的 <span className="text-rose-500">*</span></label>
                    <textarea 
                        required 
                        rows={3} 
                        value={formData.purpose} 
                        onChange={(e) => setFormData({...formData, purpose: e.target.value})} 
                        placeholder="請簡述用車事由，例如：前往新竹廠區進行設備維護..."
                        className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" 
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">目的地</label>
                        <input 
                            type="text" 
                            value={formData.destination} 
                            onChange={(e) => setFormData({...formData, destination: e.target.value})} 
                            placeholder="例如：台北市信義區"
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" 
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-stone-700 mb-1">預估里程 (km)</label>
                        <input 
                            type="number" 
                            value={formData.estimated_mileage} 
                            onChange={(e) => setFormData({...formData, estimated_mileage: e.target.value})} 
                            placeholder="0"
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent transition-all" 
                        />
                    </div>
                </div>
            </div>
          </div>

          <div className="flex gap-4 pt-8 border-t border-stone-100">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="w-1/3 px-6 py-3 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors font-medium"
            >
              取消
            </button>
            <button
              type="submit"
              className="w-2/3 px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium shadow-lg shadow-rose-200"
            >
              提交申請
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};