import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FileText, Clock, CheckCircle, XCircle, ChevronRight, Search,
  Package, Truck, Users, Filter, Loader2
} from 'lucide-react';
import { useProductRequests } from '../hooks/useProductRequests';
import { usePermission } from '../../../../hooks/usePermission';

// 狀態配置
const STATUS_CONFIG = {
  pending_purchasing: { label: '待採購單位', color: 'amber', icon: Clock },
  pending_dept_manager: { label: '待部門主管', color: 'blue', icon: Clock },
  pending_review: { label: '待審核', color: 'purple', icon: Clock },
  pending_create: { label: '待品號建立', color: 'indigo', icon: Clock },
  completed: { label: '已完成', color: 'green', icon: CheckCircle },
  rejected: { label: '已退回', color: 'red', icon: XCircle },
};

// 申請類型
const REQUEST_TYPE_CONFIG = {
  new: { label: '新增', color: 'green' },
  change: { label: '變更', color: 'amber' },
  disable: { label: '停用', color: 'red' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { requests, loading, error } = useProductRequests();
  const { hasPermission: canCreate } = usePermission('erp.product_request.create');
  const { hasPermission: canApprovePurchasing } = usePermission('erp.product_request.approve.purchasing');
  const { hasPermission: canApproveDeptManager } = usePermission('erp.product_request.approve.dept_manager');
  const { hasPermission: canApproveReview } = usePermission('erp.product_request.approve.review');
  const { hasPermission: canApproveCreate } = usePermission('erp.product_request.approve.create');

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 過濾申請單
  const filteredRequests = requests.filter((req) => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        req.request_number?.toLowerCase().includes(search) ||
        req.applicant?.name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // 統計
  const stats = {
    pending: requests.filter((r) => r.status.startsWith('pending_')).length,
    completed: requests.filter((r) => r.status === 'completed').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    myPending: requests.filter((r) => {
      if (r.status === 'pending_purchasing' && canApprovePurchasing) return true;
      if (r.status === 'pending_dept_manager' && canApproveDeptManager) return true;
      if (r.status === 'pending_review' && canApproveReview) return true;
      if (r.status === 'pending_create' && canApproveCreate) return true;
      return false;
    }).length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題區 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">品號管理</h1>
          <p className="text-stone-500 text-sm mt-1">品號建立/變更/停用申請</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/systems/erp/product-request/new')}
            className="px-5 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:from-red-700 hover:to-red-800 transition flex items-center gap-2"
          >
            <Plus size={20} />
            新增申請
          </button>
        )}
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">待簽核</p>
              <p className="text-2xl font-bold text-stone-800">{stats.pending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FileText className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">待我簽核</p>
              <p className="text-2xl font-bold text-red-600">{stats.myPending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">已完成</p>
              <p className="text-2xl font-bold text-stone-800">{stats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-lg">
              <XCircle className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">已退回</p>
              <p className="text-2xl font-bold text-stone-800">{stats.rejected}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 快速功能 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/systems/erp/products')}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-red-200 transition flex items-center gap-4"
        >
          <div className="p-3 bg-blue-100 rounded-xl">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-stone-800">品號主檔</p>
            <p className="text-sm text-stone-500">查看所有品號資料</p>
          </div>
          <ChevronRight className="ml-auto text-stone-400" />
        </button>

        <button
          onClick={() => navigate('/systems/erp/suppliers')}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-red-200 transition flex items-center gap-4"
        >
          <div className="p-3 bg-green-100 rounded-xl">
            <Truck className="w-6 h-6 text-green-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-stone-800">廠商管理</p>
            <p className="text-sm text-stone-500">管理供應商資料</p>
          </div>
          <ChevronRight className="ml-auto text-stone-400" />
        </button>

        <button
          onClick={() => navigate('/systems/erp/categories')}
          className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:border-red-200 transition flex items-center gap-4"
        >
          <div className="p-3 bg-purple-100 rounded-xl">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-stone-800">品號類別</p>
            <p className="text-sm text-stone-500">管理品號分類</p>
          </div>
          <ChevronRight className="ml-auto text-stone-400" />
        </button>
      </div>

      {/* 搜尋和篩選 */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋單號、申請人..."
              className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-stone-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
            >
              <option value="all">全部狀態</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 申請單列表 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                  單號
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                  類型
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                  申請人
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                  品項數
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                  狀態
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                  申請日期
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-stone-600 uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-stone-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>尚無申請單</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => {
                  const statusConfig = STATUS_CONFIG[request.status] || {};
                  const typeConfig = REQUEST_TYPE_CONFIG[request.request_type] || {};
                  const StatusIcon = statusConfig.icon || Clock;

                  return (
                    <tr
                      key={request.id}
                      className="hover:bg-stone-50 cursor-pointer"
                      onClick={() => navigate(`/systems/erp/product-request/${request.id}`)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-stone-800">
                          {request.request_number}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}
                        >
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">
                        {request.applicant?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700">
                        {request.items?.length || 0} 項
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusIcon
                            size={14}
                            className={`text-${statusConfig.color}-600`}
                          />
                          <span
                            className={`text-sm font-medium text-${statusConfig.color}-700`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-500">
                        {new Date(request.request_date).toLocaleDateString('zh-TW')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="p-2 hover:bg-stone-100 rounded-lg transition">
                          <ChevronRight size={18} className="text-stone-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
