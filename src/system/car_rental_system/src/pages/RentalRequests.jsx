import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import { useRentalRequests } from '../hooks/useRentalRequests';
import toast from 'react-hot-toast';

export const RentalRequests = () => {
  const { requests, loading, reviewRequest } = useRentalRequests();
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
      yellow: 'bg-yellow-100 text-yellow-800',
      green: 'bg-green-100 text-green-800',
      red: 'bg-red-100 text-red-800',
      gray: 'bg-gray-100 text-gray-800',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[option.color]}`}>
        {option.label}
      </span>
    );
  };

  const filteredRequests = requests.filter(req => {
    if (statusFilter === 'all') return true;
    return req.status === statusFilter;
  });

  const handleReview = async (id, status) => {
    const result = await reviewRequest(id, status, 'current-user-id', reviewComment);
    if (result.success) {
      toast.success(status === 'approved' ? '申請已核准' : '申請已拒絕');
      setReviewingRequest(null);
      setReviewComment('');
    } else {
      toast.error(result.error || '審核失敗');
    }
  };

  const formatDate = (dateString) => {
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">租借申請</h1>
          <p className="text-gray-600 mt-1">查看和審核租車申請</p>
        </div>
        <button
          onClick={() => navigate('/systems/car-rental/requests/new')}
          className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          新增申請
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex gap-2 overflow-x-auto">
          {statusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setStatusFilter(option.value)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === option.value
                  ? 'bg-rose-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
              {option.value !== 'all' && (
                <span className="ml-2">
                  ({requests.filter(r => r.status === option.value).length})
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
            className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {request.requester?.name || '未知'}
                    </h3>
                    {getStatusBadge(request.status)}
                  </div>
                  <p className="text-sm text-gray-500">
                    {request.requester?.department?.name || '未設定部門'}
                    {request.requester?.position && ` • ${request.requester.position}`}
                  </p>
                </div>
                <Clock className="w-5 h-5 text-gray-400" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">用車時間</p>
                  <p className="font-medium">
                    {formatDate(request.start_date)} - {formatDate(request.end_date)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">指定車輛</p>
                  <p className="font-medium">
                    {request.vehicle
                      ? `${request.vehicle.plate_number} (${request.vehicle.brand} ${request.vehicle.model})`
                      : '不指定'}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">用車目的</p>
                  <p className="font-medium">{request.purpose}</p>
                </div>
                {request.destination && (
                  <div>
                    <p className="text-sm text-gray-500">目的地</p>
                    <p className="font-medium">{request.destination}</p>
                  </div>
                )}
              </div>

              {request.review_comment && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">審核意見</p>
                  <p className="text-sm">{request.review_comment}</p>
                </div>
              )}

              {request.status === 'pending' && (
                <div className="flex gap-2 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setReviewingRequest(request)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    審核
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredRequests.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">沒有申請記錄</h3>
          <p className="text-gray-600">目前沒有符合條件的租車申請</p>
        </div>
      )}

      {/* Review Modal */}
      {reviewingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">審核申請</h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">申請人</p>
                <p className="font-medium">
                  {reviewingRequest.requester?.name || '未知'}
                  {reviewingRequest.requester?.department?.name &&
                    ` (${reviewingRequest.requester.department.name})`}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">用車時間</p>
                <p className="font-medium">
                  {formatDate(reviewingRequest.start_date)} - {formatDate(reviewingRequest.end_date)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">用車目的</p>
                <p className="font-medium">{reviewingRequest.purpose}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  審核意見
                </label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="請輸入審核意見（選填）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => {
                  setReviewingRequest(null);
                  setReviewComment('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleReview(reviewingRequest.id, 'rejected')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <XCircle className="w-5 h-5" />
                拒絕
              </button>
              <button
                onClick={() => handleReview(reviewingRequest.id, 'approved')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                核准
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
