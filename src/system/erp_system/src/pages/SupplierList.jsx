import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Search, Filter, FileText, Clock, CheckCircle, XCircle,
  ChevronRight, Loader2, Building2, ArrowLeft, Truck
} from 'lucide-react';
import { useSupplierRequests, useSuppliers } from '../hooks/useSupplierRequests';
import { usePermission } from '../../../../hooks/usePermission';

// 申請單狀態配置
const STATUS_CONFIG = {
  pending_finance: { label: '待財務審核', color: 'amber', icon: Clock },
  pending_accounting: { label: '待會計審核', color: 'blue', icon: Clock },
  pending_creator: { label: '待建檔人員', color: 'purple', icon: Clock },
  completed: { label: '已完成', color: 'green', icon: CheckCircle },
  rejected: { label: '已退回', color: 'red', icon: XCircle },
};

// 申請類型
const REQUEST_TYPE_LABELS = {
  new: { label: '新增', color: 'green' },
  change: { label: '變更', color: 'amber' },
};

// 廠商分類
const SUPPLIER_CATEGORY_LABELS = {
  raw_material: '原料',
  supplies: '物料',
  packaging: '包材',
  equipment: '設備及維修',
  expense: '費用',
  other: '其它',
};

export default function SupplierList() {
  const navigate = useNavigate();
  const { requests, loading: requestsLoading, fetchRequests } = useSupplierRequests();
  const { suppliers, loading: suppliersLoading, fetchSuppliers } = useSuppliers();

  const { hasPermission: canCreate } = usePermission('erp.supplier.create');
  const { hasPermission: canApproveFinance } = usePermission('erp.supplier.approve.finance');
  const { hasPermission: canApproveAccounting } = usePermission('erp.supplier.approve.accounting');
  const { hasPermission: canApproveCreator } = usePermission('erp.supplier.approve.creator');

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'suppliers'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // 載入資料
  useEffect(() => {
    fetchRequests();
    fetchSuppliers();
  }, [fetchRequests, fetchSuppliers]);

  // 過濾申請單
  const filteredRequests = requests.filter((req) => {
    if (filterStatus !== 'all' && req.status !== filterStatus) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        req.request_number?.toLowerCase().includes(search) ||
        req.company_name?.toLowerCase().includes(search) ||
        req.applicant?.name?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // 過濾供應商
  const filteredSuppliers = suppliers.filter((sup) => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        sup.company_name?.toLowerCase().includes(search) ||
        sup.supplier_code?.toLowerCase().includes(search) ||
        sup.tax_id?.toLowerCase().includes(search)
      );
    }
    return true;
  });

  // 統計
  const stats = {
    pendingRequests: requests.filter((r) => r.status.startsWith('pending_')).length,
    myPending: requests.filter((r) => {
      if (r.status === 'pending_finance' && canApproveFinance) return true;
      if (r.status === 'pending_accounting' && canApproveAccounting) return true;
      if (r.status === 'pending_creator' && canApproveCreator) return true;
      return false;
    }).length,
    totalSuppliers: suppliers.length,
    activeSuppliers: suppliers.filter((s) => s.is_active).length,
  };

  const loading = requestsLoading || suppliersLoading;

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <button
        onClick={() => navigate('/systems/erp')}
        className="flex items-center gap-2 text-stone-600 hover:text-orange-600 transition"
      >
        <ArrowLeft size={20} />
        返回 ERP 首頁
      </button>

      {/* 標題區 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
            <Truck size={28} className="text-orange-600" />
            供應商管理
          </h1>
          <p className="text-stone-500 text-sm mt-1">供應商資料申請與管理</p>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/systems/erp/supplier-request/new')}
            className="px-5 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl shadow-lg hover:from-orange-700 hover:to-amber-700 transition flex items-center gap-2"
          >
            <Plus size={20} />
            新增供應商申請
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
              <p className="text-sm text-stone-500">待簽核申請</p>
              <p className="text-2xl font-bold text-stone-800">{stats.pendingRequests}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <FileText className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">待我簽核</p>
              <p className="text-2xl font-bold text-orange-600">{stats.myPending}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">啟用供應商</p>
              <p className="text-2xl font-bold text-stone-800">{stats.activeSuppliers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-stone-100 rounded-lg">
              <Truck className="w-5 h-5 text-stone-600" />
            </div>
            <div>
              <p className="text-sm text-stone-500">供應商總數</p>
              <p className="text-2xl font-bold text-stone-800">{stats.totalSuppliers}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 頁籤切換 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm">
        <div className="flex border-b border-stone-200">
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'requests'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            申請單列表 ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
              activeTab === 'suppliers'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            供應商主檔 ({suppliers.length})
          </button>
        </div>

        {/* 搜尋和篩選 */}
        <div className="p-4 border-b border-stone-100">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={activeTab === 'requests' ? '搜尋單號、公司名稱、申請人...' : '搜尋公司名稱、代號、統編...'}
                className="w-full pl-10 pr-4 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            {activeTab === 'requests' && (
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-stone-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                >
                  <option value="all">全部狀態</option>
                  {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* 列表內容 */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : activeTab === 'requests' ? (
          // 申請單列表
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    單號
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    類型
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    公司名稱
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    申請人
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
                    const typeConfig = REQUEST_TYPE_LABELS[request.request_type] || {};
                    const StatusIcon = statusConfig.icon || Clock;

                    return (
                      <tr
                        key={request.id}
                        className="hover:bg-stone-50 cursor-pointer"
                        onClick={() => navigate(`/systems/erp/supplier-request/${request.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm font-semibold text-stone-800">
                            {request.request_number}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full bg-${typeConfig.color}-100 text-${typeConfig.color}-700`}>
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-700">
                          {request.company_name}
                        </td>
                        <td className="px-4 py-3 text-sm text-stone-700">
                          {request.applicant?.name || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon size={14} className={`text-${statusConfig.color}-600`} />
                            <span className={`text-sm font-medium text-${statusConfig.color}-700`}>
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
        ) : (
          // 供應商主檔列表
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    代號
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    公司名稱
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    統一編號
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    分類
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    適用品牌
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-stone-600 uppercase">
                    狀態
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-stone-400">
                      <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>尚無供應商資料</p>
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-semibold text-stone-800">
                          {supplier.supplier_code || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-700 font-medium">
                        {supplier.company_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600 font-mono">
                        {supplier.tax_id || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-stone-600">
                        {SUPPLIER_CATEGORY_LABELS[supplier.supplier_category] || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(supplier.brands || []).slice(0, 3).map((brand) => (
                            <span
                              key={brand.code}
                              className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded"
                            >
                              {brand.name}
                            </span>
                          ))}
                          {(supplier.brands || []).length > 3 && (
                            <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded">
                              +{supplier.brands.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {supplier.is_active ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                            啟用
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-stone-100 text-stone-600">
                            停用
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
