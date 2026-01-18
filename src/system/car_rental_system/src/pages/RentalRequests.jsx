import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, Clock, Eye, AlertTriangle, Ban } from 'lucide-react';
import { useRentalRequests } from '../hooks/useRentalRequests';
import { useCurrentEmployee } from '../hooks/useCurrentEmployee';
import toast from 'react-hot-toast';

export const RentalRequests = () => {
  // 1. 解構 cancelRequest
  const { requests, loading, reviewRequest, cancelRequest } = useRentalRequests();
  const { employee } = useCurrentEmployee();
  
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewingRequest, setReviewingRequest] = useState(null);
  const [reviewComment, setReviewComment] = useState('');

  const statusOptions = [
    { value: 'all', label: '全部', color: 'gray' },
    { value: 'pending', label: '待審核', color: 'yellow' },
    { value: 'approved', label: '已核准', color: 'green' },
    { value: 'rejected', label: '已拒絕', color: 'red' },
    { value: 'cancelled', label: '已取消', color: 'gray' },
  ];

  const getStatusBadge = (status) => {
    const option = statusOptions.find(opt => opt.value === status);
    if (!option) return null;

    const colors = {
      yellow: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      green: 'bg-green-100 text-green-800 border border-green-200',
      red: 'bg-red-100 text-red-800 border border-red-200',
      gray: 'bg-gray-100 text-gray-800 border border-gray-200',
    };

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[option.color]}`}>
        {option.label}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'all') return true;
    return req.status === statusFilter;
  });

  // 處理審核
  const handleReview = async (id, status) => {
    if (!employee) {
      toast.error('無法確認您的員工身分，請重新登入');
      return;
    }
    const result = await reviewRequest(id, status, employee.id, reviewComment);
    
    if (result.success) {
      toast.success(status === 'approved' ? '申請已核准' : '申請已拒絕');
      setReviewingRequest(null);
      setReviewComment('');
    } else {
      toast.error(result.error || '審核失敗');
    }
  };

  // 2. 處理取消 (新增邏輯)
  const handleCancel = async (request) => {
    const isApproved = request.status === 'approved';
    
    // 根據狀態顯示不同的警告訊息
    const message = isApproved
      ? '⚠️ 警告：此申請已核准並預約車輛。\n\n取消後將會：\n1. 釋放該車輛供他人租借\n2. 刪除相關的租借紀錄\n\n確定要繼續嗎？'
      : '確定要取消此申請嗎？';

    if (!window.confirm(message)) return;

    const toastId = toast.loading('處理中...');
    const result = await cancelRequest(request.id);

    toast.dismiss(toastId);

    if (result.success) {
      toast.success(isApproved ? '已取消申請並釋放車輛' : '申請已取消');
    } else {
      toast.error(result.error || '取消失敗');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">租借申請管理</h1>
          <p className="text-gray-600 mt-1">查看、審核與管理所有的用車申請</p>
        </div>
        <button
          onClick={() => navigate('/systems/car-rental/requests/new')}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors shadow-sm"
        >
          <Plus className="w-5 h-5" />
          新增申請
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
          {statusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all ${
                statusFilter === option.value
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {option.label}
              {option.value !== 'all' && (
                <span className={`ml-2 text-xs py-0.5 px-1.5 rounded-full ${
                    statusFilter === option.value ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {requests.filter(r => r.status === option.value).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.map(request => (
          <div
            key={request.id}
            className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">
                      {request.requester?.name || '未知申請人'}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    {request.requester?.department?.name || '未設定部門'}
                    {request.requester?.position && ` • ${request.requester.position}`}
                  </p>
                </div>
                <div className="text-xs text-gray-400 flex flex-col items-end">
                    <span>申請時間</span>
                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500 mb-1">用車時間</p>
                  <p className="font-medium flex items-center gap-2 text-gray-900">
                    <Clock className="w-4 h-4 text-rose-500" />
                    {formatDate(request.start_date)} ~ {formatDate(request.end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">指定車輛</p>
                  <p className="font-medium text-gray-900">
                    {request.vehicle
                      ? `${request.vehicle.plate_number} (${request.vehicle.brand} ${request.vehicle.model})`
                      : <span className="text-gray-400 italic">不指定 (由管理員安排)</span>}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500 mb-1">用車目的 / 目的地</p>
                  <p className="font-medium text-gray-900">
                    {request.purpose} 
                    {request.destination && <span className="text-gray-500 mx-2">→</span>}
                    {request.destination}
                  </p>
                </div>
              </div>

              {request.review_comment && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg">
                  <p className="text-xs text-yellow-700 font-medium mb-1">審核意見：</p>
                  <p className="text-sm text-yellow-800">{request.review_comment}</p>
                </div>
              )}

              {/* 3. 操作按鈕區塊 */}
              <div className="flex gap-3 pt-4 border-t border-gray-100">
                {/* 審核按鈕：只在 pending 顯示 */}
                {request.status === 'pending' && (
                  <button
                    onClick={() => setReviewingRequest(request)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors shadow-sm"
                  >
                    <Eye className="w-4 h-4" />
                    審核申請
                  </button>
                )}

                {/* 取消按鈕：在 pending 或 approved 顯示 */}
                {(request.status === 'pending' || request.status === 'approved') && (
                  <button
                    onClick={() => handleCancel(request)}
                    className={`flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                        request.status === 'approved'
                            ? 'flex-1 text-orange-700 bg-orange-50 border-orange-200 hover:bg-orange-100' // 核准後的取消比較顯眼
                            : 'text-gray-600 bg-white border-gray-300 hover:bg-gray-50 hover:text-red-600 hover:border-red-200' // 一般取消
                    } ${request.status === 'pending' ? '' : ''}`} // 如果是 pending，這個按鈕寬度不設 flex-1，讓審核按鈕大一點
                  >
                    {request.status === 'approved' ? (
                        <>
                            <AlertTriangle className="w-4 h-4" />
                            取消並釋放車輛
                        </>
                    ) : (
                        <>
                            <Ban className="w-4 h-4" />
                            取消
                        </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <Clock className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">沒有相關記錄</h3>
          <p className="text-gray-500">目前沒有符合篩選條件的租車申請</p>
        </div>
      )}

      {/* Review Modal - 保持不變 */}
      {reviewingRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl transform transition-all">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900">審核申請單</h2>
              <p className="text-sm text-gray-500 mt-1">單號：{reviewingRequest.id.slice(0, 8)}</p>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">申請人</p>
                    <p className="font-medium text-gray-900">
                      {reviewingRequest.requester?.name || '未知'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">部門</p>
                    <p className="font-medium text-gray-900">
                       {reviewingRequest.requester?.department?.name || '-'}
                    </p>
                  </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">行程資訊</p>
                <div className="bg-rose-50 p-4 rounded-lg border border-rose-100 text-rose-900">
                    <p className="font-bold flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4" />
                        {formatDate(reviewingRequest.start_date)} ~ {formatDate(reviewingRequest.end_date)}
                    </p>
                    <p className="text-sm opacity-90">
                        {reviewingRequest.purpose} {reviewingRequest.destination && `→ ${reviewingRequest.destination}`}
                    </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  審核備註 / 意見
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="請輸入審核意見，例如：核准，請至總務處領取鑰匙..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setReviewingRequest(null);
                  setReviewComment('');
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-white transition-colors"
              >
                稍後再審
              </button>
              <button
                onClick={() => handleReview(reviewingRequest.id, 'rejected')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors"
              >
                <XCircle className="w-5 h-5" />
                拒絕
              </button>
              <button
                onClick={() => handleReview(reviewingRequest.id, 'approved')}
                className="flex-[2] flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
              >
                <CheckCircle className="w-5 h-5" />
                核准申請
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};