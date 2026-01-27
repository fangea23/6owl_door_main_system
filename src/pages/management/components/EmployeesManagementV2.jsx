import React, { useState, useEffect } from 'react';
import { useEmployees } from '../../../hooks/management/useEmployees';
import { useDepartments } from '../../../hooks/management/useDepartments';
import { useStores } from '../../../hooks/management/useStores';
import { useBrands } from '../../../hooks/management/useBrands';
import { usePermission } from '../../../hooks/usePermission';
import { supabase } from '../../../lib/supabase';
import Badge, { StatusBadge, statusBadgeMap } from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import SearchableSelect from '../../../components/ui/SearchableSelect';
import {
  UserPlus, Search, Loader2, Mail, Phone, Briefcase, Building2, User, Save, X,
  Edit2, Trash2, Link as LinkIcon, Shield, Store, Filter, ChevronDown, Users, Landmark
} from 'lucide-react';

// 組織類型
const ORG_TYPES = [
  { value: 'headquarters', label: '總部', color: 'indigo' },
  { value: 'store', label: '門市', color: 'teal' },
];

// 僱用類型
const EMPLOYMENT_TYPES = [
  { value: 'fulltime', label: '正職', color: 'success' },
  { value: 'parttime', label: '計時', color: 'warning' },
  { value: 'contract', label: '約聘', color: 'orange' },
  { value: 'intern', label: '實習', color: 'info' },
];

// 職位列表（從資料庫的 positions 表）
const POSITION_CODES = [
  // 總部職位
  { code: 'ceo', name: '總經理', category: 'headquarters' },
  { code: 'director', name: '部門總監', category: 'headquarters' },
  { code: 'fin_manager', name: '財務經理', category: 'headquarters' },
  { code: 'hr_manager', name: '人資經理', category: 'headquarters' },
  { code: 'ops_manager', name: '營運經理', category: 'headquarters' },
  { code: 'accountant', name: '會計', category: 'headquarters' },
  { code: 'cashier', name: '出納', category: 'headquarters' },
  { code: 'hr_specialist', name: '人資專員', category: 'headquarters' },
  { code: 'it_admin', name: '資訊管理員', category: 'headquarters' },
  { code: 'area_supervisor', name: '區域督導', category: 'headquarters' },
  // 門市職位
  { code: 'store_manager', name: '店長', category: 'store' },
  { code: 'assistant_manager', name: '副店長', category: 'store' },
  { code: 'store_staff', name: '正職人員', category: 'store' },
  { code: 'store_parttime', name: '計時人員', category: 'store' },
];

// 員工狀態
const EMPLOYEE_STATUS = [
  { value: 'active', label: '在職' },
  { value: 'on_leave', label: '請假中' },
  { value: 'resigned', label: '已離職' },
  { value: 'terminated', label: '已終止' },
];

export default function EmployeesManagementV2() {
  const { employees, loading, createEmployee, updateEmployee, deleteEmployee, refetch } = useEmployees();
  const { departments } = useDepartments();
  const { stores } = useStores();
  const { brands } = useBrands();

  // 權限檢查
  const { hasPermission: canView, loading: viewLoading } = usePermission('employee.view');
  const { hasPermission: canCreate } = usePermission('employee.create');
  const { hasPermission: canEdit } = usePermission('employee.edit');
  const { hasPermission: canDelete } = usePermission('employee.delete');

  // 狀態
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrgType, setFilterOrgType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterBrand, setFilterBrand] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Modal 狀態
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // 銀行資料狀態
  const [bankList, setBankList] = useState([]);
  const [branchList, setBranchList] = useState([]);
  const [fetchingBanks, setFetchingBanks] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);

  // 表單資料
  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    mobile: '',
    org_type: 'headquarters',
    department_id: '',
    store_id: '',
    position_code: '',
    employment_type_new: 'fulltime',
    status: 'active',
    hire_date: '',
    // 銀行帳戶資訊
    bank_name: '',
    bank_code: '',
    branch_name: '',
    branch_code: '',
    bank_account: '',
  });

  // 載入銀行列表（從 payment_approval schema）
  useEffect(() => {
    const fetchBanks = async () => {
      setFetchingBanks(true);
      try {
        const { data, error } = await supabase
          .schema('payment_approval')
          .from('banks')
          .select('bank_code, bank_name')
          .order('bank_code', { ascending: true });

        if (data) setBankList(data);
        if (error) console.error('Error fetching banks:', error);
      } finally {
        setFetchingBanks(false);
      }
    };
    fetchBanks();
  }, []);

  // 根據銀行代碼載入分行列表（從 payment_approval schema）
  useEffect(() => {
    const fetchBranches = async () => {
      if (!formData.bank_code) {
        setBranchList([]);
        return;
      }

      setFetchingBranches(true);
      try {
        // 使用 branches 表（有 branch_name 欄位）
        const { data, error } = await supabase
          .schema('payment_approval')
          .from('branches')
          .select('branch_code, branch_name')
          .eq('bank_code', formData.bank_code)
          .order('branch_code', { ascending: true });

        if (data) setBranchList(data);
        if (error) console.error('Error fetching branches:', error);
      } finally {
        setFetchingBranches(false);
      }
    };
    fetchBranches();
  }, [formData.bank_code]);

  // 重置表單
  const resetForm = () => {
    setFormData({
      employee_id: '',
      name: '',
      email: '',
      phone: '',
      mobile: '',
      org_type: 'headquarters',
      department_id: '',
      store_id: '',
      position_code: '',
      employment_type_new: 'fulltime',
      status: 'active',
      hire_date: '',
      // 銀行帳戶資訊
      bank_name: '',
      bank_code: '',
      branch_name: '',
      branch_code: '',
      bank_account: '',
    });
    setEditingEmployee(null);
  };

  // 開啟 Modal
  const openModal = (employee = null) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        employee_id: employee.employee_id || '',
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        mobile: employee.mobile || '',
        org_type: employee.org_type || 'headquarters',
        department_id: employee.department_id || '',
        store_id: employee.store_id || '',
        position_code: employee.position_code || '',
        employment_type_new: employee.employment_type_new || 'fulltime',
        status: employee.status || 'active',
        hire_date: employee.hire_date || '',
        // 銀行帳戶資訊
        bank_name: employee.bank_name || '',
        bank_code: employee.bank_code || '',
        branch_name: employee.branch_name || '',
        branch_code: employee.branch_code || '',
        bank_account: employee.bank_account || '',
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  // 儲存員工
  const handleSave = async (e) => {
    e.preventDefault();

    if (editingEmployee && !canEdit) {
      return alert('您沒有編輯員工的權限');
    }
    if (!editingEmployee && !canCreate) {
      return alert('您沒有新增員工的權限');
    }

    setProcessing(true);
    try {
      // 根據 store_id 找到對應的 store_code
      const selectedStore = formData.store_id
        ? stores.find(s => s.id === parseInt(formData.store_id) || s.id === formData.store_id)
        : null;

      const cleanData = {
        ...formData,
        department_id: formData.department_id || null,
        store_id: formData.store_id || null,
        store_code: selectedStore?.code || null,  // 同步更新 store_code
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        hire_date: formData.hire_date || null,
        // 銀行帳戶資訊
        bank_name: formData.bank_name || null,
        bank_code: formData.bank_code || null,
        branch_name: formData.branch_name || null,
        branch_code: formData.branch_code || null,
        bank_account: formData.bank_account || null,
      };

      let result;
      if (editingEmployee) {
        result = await updateEmployee(editingEmployee.id, cleanData);
      } else {
        result = await createEmployee(cleanData);
      }

      if (result.success) {
        setShowModal(false);
        alert(editingEmployee ? '✅ 員工資料更新成功' : '✅ 員工建立成功');
      } else {
        alert('❌ 操作失敗: ' + result.error);
      }
    } finally {
      setProcessing(false);
    }
  };

  // 刪除員工
  const handleDelete = async (employee) => {
    if (!canDelete) return alert('您沒有刪除員工的權限');
    if (!window.confirm(`確定要刪除員工「${employee.name}」嗎？`)) return;

    setProcessing(true);
    const result = await deleteEmployee(employee.id);
    setProcessing(false);

    if (result.success) {
      alert('✅ 員工已刪除');
    } else {
      alert('❌ 刪除失敗: ' + result.error);
    }
  };

  // 過濾員工
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesOrgType = filterOrgType === 'all' || emp.org_type === filterOrgType;
    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;

    // 品牌篩選：透過門市的品牌
    let matchesBrand = filterBrand === 'all';
    if (!matchesBrand && emp.store_id) {
      const store = stores.find(s => s.id === emp.store_id);
      matchesBrand = store?.brand_id?.toString() === filterBrand;
    }

    return matchesSearch && matchesOrgType && matchesStatus && (filterBrand === 'all' || matchesBrand);
  });

  // 統計
  const stats = {
    total: employees.length,
    headquarters: employees.filter(e => e.org_type === 'headquarters').length,
    store: employees.filter(e => e.org_type === 'store').length,
    active: employees.filter(e => e.status === 'active').length,
  };

  // 取得職位顯示名稱
  const getPositionName = (code) => {
    const position = POSITION_CODES.find(p => p.code === code);
    return position?.name || code || '未設定';
  };

  // 取得僱用類型顯示
  const getEmploymentType = (type) => {
    const emp = EMPLOYMENT_TYPES.find(e => e.value === type);
    return emp || { value: type, label: type || '未設定', color: 'neutral' };
  };

  // 權限檢查載入中
  if (viewLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">檢查權限中...</span>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <Shield size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">無查看權限</h2>
          <p className="text-gray-600">您沒有查看員工列表的權限</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">載入中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
              <p className="text-sm text-gray-500">總員工數</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Building2 size={20} className="text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.headquarters}</p>
              <p className="text-sm text-gray-500">總部人員</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Store size={20} className="text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.store}</p>
              <p className="text-sm text-gray-500">門市人員</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <User size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.active}</p>
              <p className="text-sm text-gray-500">在職人數</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜尋與操作列 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋員工編號、姓名或 Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-3 rounded-xl border transition flex items-center gap-2 ${
            showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter size={20} />
          篩選
          <ChevronDown size={16} className={`transition ${showFilters ? 'rotate-180' : ''}`} />
        </button>

        {canCreate && (
          <button
            onClick={() => openModal()}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap"
          >
            <UserPlus size={20} />
            新增員工
          </button>
        )}
      </div>

      {/* 篩選面板 */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">組織類型</label>
            <select
              value={filterOrgType}
              onChange={(e) => setFilterOrgType(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">全部</option>
              {ORG_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">狀態</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">全部</option>
              {EMPLOYEE_STATUS.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">品牌（門市員工）</label>
            <select
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="all">全部</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id.toString()}>{brand.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* 員工列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                <th className="p-4 font-semibold">員工資訊</th>
                <th className="p-4 font-semibold">組織/部門</th>
                <th className="p-4 font-semibold">職位/類型</th>
                <th className="p-4 font-semibold">聯絡方式</th>
                <th className="p-4 font-semibold">狀態</th>
                <th className="p-4 font-semibold text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee) => {
                const orgType = ORG_TYPES.find(t => t.value === employee.org_type);
                const empType = getEmploymentType(employee.employment_type_new);
                const store = stores.find(s => s.id === employee.store_id);

                return (
                  <tr key={employee.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          employee.org_type === 'store' ? 'bg-teal-100 text-teal-700' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {employee.name?.[0] || <User size={20} />}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{employee.name}</div>
                          <div className="text-xs text-gray-500">{employee.employee_id || '無編號'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <Badge variant={orgType?.color || 'neutral'} size="sm">
                          {orgType?.label || employee.org_type}
                        </Badge>
                        {employee.org_type === 'headquarters' && employee.department && (
                          <span className="text-sm text-gray-600">{employee.department.name}</span>
                        )}
                        {employee.org_type === 'store' && store && (
                          <span className="text-sm text-gray-600">
                            {store.brand?.name} - {store.name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-gray-800">
                          {getPositionName(employee.position_code)}
                        </span>
                        <Badge variant={empType.color} size="sm">
                          {empType.label}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">
                      {employee.email && (
                        <div className="flex items-center gap-1 text-gray-600 text-sm mb-1">
                          <Mail size={12} /> {employee.email}
                        </div>
                      )}
                      {employee.mobile && (
                        <div className="flex items-center gap-1 text-gray-600 text-sm">
                          <Phone size={12} /> {employee.mobile}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <StatusBadge status={employee.status} />
                      {employee.user_id && (
                        <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <LinkIcon size={10} /> 已關聯帳號
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {canEdit && (
                          <button
                            onClick={() => openModal(employee)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="編輯"
                          >
                            <Edit2 size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(employee)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="刪除"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 無資料提示 */}
      {filteredEmployees.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Briefcase size={64} className="mb-3 opacity-20" />
          <p className="text-lg">查無員工資料</p>
        </div>
      )}

      {/* 統計資訊 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm text-gray-600 flex justify-between">
        <p>顯示 <span className="font-bold text-blue-600">{filteredEmployees.length}</span> 位員工</p>
        <p>在職 <span className="font-bold text-green-600">
          {filteredEmployees.filter(e => e.status === 'active').length}
        </span> 位</p>
      </div>

      {/* 員工表單 Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingEmployee ? '編輯員工資料' : '新增員工'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {/* 基本資訊 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">員工編號 *</label>
              <input
                type="text"
                required
                placeholder="EMP001"
                value={formData.employee_id}
                onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                disabled={editingEmployee && editingEmployee.employee_id}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">姓名 *</label>
              <input
                type="text"
                required
                placeholder="王小明"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 組織類型 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">組織類型 *</label>
              <select
                value={formData.org_type}
                onChange={(e) => setFormData({
                  ...formData,
                  org_type: e.target.value,
                  department_id: '',
                  store_id: '',
                  position_code: '',
                })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {ORG_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            {/* 總部：選擇部門 */}
            {formData.org_type === 'headquarters' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">部門</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">未指定</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.code ? `(${dept.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 門市：選擇門市 */}
            {formData.org_type === 'store' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">所屬門市</label>
                <select
                  value={formData.store_id}
                  onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">未指定</option>
                  {stores.filter(s => s.is_active).map(store => (
                    <option key={store.id} value={store.id}>
                      {store.brand?.name} - {store.name} ({store.code})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 職位與僱用類型 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">職位</label>
              <select
                value={formData.position_code}
                onChange={(e) => setFormData({ ...formData, position_code: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">未指定</option>
                {POSITION_CODES
                  .filter(p => p.category === formData.org_type || p.category === 'both')
                  .map(position => (
                    <option key={position.code} value={position.code}>
                      {position.name}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">僱用類型</label>
              <select
                value={formData.employment_type_new}
                onChange={(e) => setFormData({ ...formData, employment_type_new: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {EMPLOYMENT_TYPES.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 聯絡方式 */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                placeholder="email@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">電話</label>
              <input
                type="tel"
                placeholder="02-1234-5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">手機</label>
              <input
                type="tel"
                placeholder="0912-345-678"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 狀態與到職日 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">狀態</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {EMPLOYEE_STATUS.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">到職日</label>
              <input
                type="date"
                value={formData.hire_date}
                onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 銀行帳戶資訊 */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Landmark size={18} className="text-green-600" />
              <h3 className="font-semibold text-gray-700">銀行帳戶（代墊款匯款用）</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* 銀行選擇（可搜尋） */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex justify-between items-center">
                  <span>銀行</span>
                  {fetchingBanks && <span className="text-blue-500 flex items-center text-xs"><Loader2 className="animate-spin h-3 w-3 mr-1" />載入中...</span>}
                </label>
                <SearchableSelect
                  options={bankList.map(bank => ({
                    value: bank.bank_code,
                    label: bank.bank_name,
                    subLabel: bank.bank_code
                  }))}
                  value={formData.bank_code}
                  onChange={(value) => {
                    const selectedBank = bankList.find(b => b.bank_code === value);
                    setFormData(prev => ({
                      ...prev,
                      bank_name: selectedBank ? selectedBank.bank_name : '',
                      bank_code: value,
                      branch_name: '',
                      branch_code: ''
                    }));
                  }}
                  placeholder="請選擇或搜尋銀行"
                  loading={fetchingBanks}
                  loadingText="載入銀行資料中..."
                  emptyText="無銀行資料"
                />
              </div>

              {/* 分行選擇（可搜尋） */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex justify-between items-center">
                  <span>分行</span>
                  {fetchingBranches && <span className="text-blue-500 flex items-center text-xs"><Loader2 className="animate-spin h-3 w-3 mr-1" />查詢中...</span>}
                </label>
                {branchList.length > 0 ? (
                  <SearchableSelect
                    options={branchList.map(branch => ({
                      value: branch.branch_name,
                      label: branch.branch_name,
                      subLabel: branch.branch_code || ''
                    }))}
                    value={formData.branch_name}
                    onChange={(value) => {
                      const selectedBranch = branchList.find(b => b.branch_name === value);
                      setFormData(prev => ({
                        ...prev,
                        branch_name: value,
                        branch_code: selectedBranch ? selectedBranch.branch_code : ''
                      }));
                    }}
                    placeholder="請選擇或搜尋分行"
                    loading={fetchingBranches}
                    loadingText="查詢分行資料中..."
                    emptyText="無分行資料"
                    allowManualInput={true}
                    manualInputPlaceholder="請手動輸入分行名稱"
                  />
                ) : (
                  <input
                    type="text"
                    placeholder={!formData.bank_code ? "請先選擇銀行" : fetchingBranches ? "載入分行資料中..." : "查無分行資料，請手動輸入"}
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    disabled={!formData.bank_code}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                  />
                )}
              </div>
            </div>

            {/* 銀行帳號 */}
            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">銀行帳號</label>
              <input
                type="text"
                placeholder="請輸入銀行帳號"
                value={formData.bank_account}
                onChange={(e) => setFormData({ ...formData, bank_account: e.target.value.replace(/\D/g, '') })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono tracking-wide"
              />
            </div>

            {/* 顯示已選銀行資訊 */}
            {formData.bank_code && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm">
                <div className="flex items-center gap-4 text-blue-700">
                  <span><strong>銀行代碼：</strong>{formData.bank_code}</span>
                  {formData.branch_code && <span><strong>分行代碼：</strong>{formData.branch_code}</span>}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 mt-2">
              💡 此銀行帳戶將用於代墊款系統，系統會自動帶入作為預設匯款帳戶
            </p>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={processing}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              {editingEmployee ? '更新' : '建立'}
            </button>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
            >
              <X size={20} />
              取消
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
