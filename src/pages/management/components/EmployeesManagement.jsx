import React, { useState } from 'react';
import { useEmployees } from '../../../hooks/management/useEmployees';
import { useDepartments } from '../../../hooks/management/useDepartments';
import { useProfiles } from '../../../hooks/management/useProfiles';
import {
  UserPlus, Search, Loader2, Mail, Phone, Briefcase, Building2, User, Save, X, Edit2, Trash2, Link as LinkIcon
} from 'lucide-react';

// 1. 統一：將 ProfilesManagement 的完整角色列表複製過來，確保兩邊一致
const ROLES = [
  { value: 'user', label: '一般使用者', color: 'bg-gray-100 text-gray-600' },
  { value: 'staff', label: '一般員工', color: 'bg-gray-100 text-gray-600' },
  { value: 'manager', label: '主管', color: 'bg-blue-100 text-blue-700' },
  { value: 'unit_manager', label: '單位主管', color: 'bg-blue-100 text-blue-700' },
  { value: 'accountant', label: '會計', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'audit_manager', label: '審核主管', color: 'bg-purple-100 text-purple-700' },
  { value: 'cashier', label: '出納', color: 'bg-orange-100 text-orange-700' },
  { value: 'boss', label: '放行主管', color: 'bg-pink-100 text-pink-700' },
  { value: 'hr', label: '人資', color: 'bg-green-100 text-green-700' },
  { value: 'admin', label: '系統管理員', color: 'bg-red-100 text-red-700' },
];

export default function EmployeesManagement() {
  const {
    employees,
    loading,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    linkEmployeeToUser,
  } = useEmployees();

  const { departments } = useDepartments();
  const { profiles } = useProfiles();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  const [formData, setFormData] = useState({
    employee_id: '',
    name: '',
    email: '',
    phone: '',
    mobile: '',
    department_id: '',
    position: '',
    role: 'user',
    status: 'active',
  });

  // 重置表單
  const resetForm = () => {
    setFormData({
      employee_id: '',
      name: '',
      email: '',
      phone: '',
      mobile: '',
      department_id: '',
      position: '',
      role: 'user',
      status: 'active',
    });
    setShowCreateForm(false);
    setEditingId(null);
  };

  // 搜尋過濾
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || emp.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  // 處理創建
  const handleCreate = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const cleanData = {
        ...formData,
        department_id: formData.department_id || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        position: formData.position || null,
      };

      const result = await createEmployee(cleanData);

      if (result.success) {
        alert('✅ 員工資料建立成功！');
        resetForm();
      } else {
        alert('❌ 建立失敗: ' + result.error);
      }
    } catch (error) {
      alert('❌ 建立失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // 處理更新
  const handleUpdate = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      const cleanData = {
        ...formData,
        department_id: formData.department_id || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        position: formData.position || null,
      };

      const result = await updateEmployee(editingId, cleanData);

      if (result.success) {
        alert('✅ 員工資料更新成功！');
        resetForm();
      } else {
        alert('❌ 更新失敗: ' + result.error);
      }
    } catch (error) {
      alert('❌ 更新失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // 開始編輯
  const startEdit = (employee) => {
    setFormData({
      employee_id: employee.employee_id || '', // 允許空值
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      mobile: employee.mobile || '',
      department_id: employee.department_id || '',
      position: employee.position || '',
      role: employee.role || 'user', // 確保有預設值
      status: employee.status,
      _originalEmployeeId: employee.employee_id, // 記錄原始值
    });
    setEditingId(employee.id);
    setShowCreateForm(false);
  };

  // 處理刪除
const handleDelete = async (employeeId, employeeName, employeeRole) => { // 1. 接收 role 參數
    // 2. 新增 Admin 保護邏輯 (與 ProfilesManagement 一致)
    if (employeeRole === 'admin') {
      alert('❌ 操作禁止！\n\n擁有「系統管理員 (Admin)」權限的員工無法被直接刪除。\n請先修改其職位角色。');
      return;
    }

    if (!window.confirm(`確定要刪除員工「${employeeName}」嗎？`)) return;

    setProcessing(true);
    try {
      const result = await deleteEmployee(employeeId);

      if (result.success) {
        alert('✅ 員工已刪除');
      } else {
        alert('❌ 刪除失敗: ' + result.error);
      }
    } catch (error) {
      alert('❌ 刪除失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // 關聯到用戶帳號
  const handleLinkToUser = async (employeeId, employeeName) => {
    const userId = window.prompt(
      `請輸入要關聯的用戶帳號 ID (UUID)\n員工：${employeeName}`
    );

    if (!userId) return;

    setProcessing(true);
    try {
      const result = await linkEmployeeToUser(employeeId, userId);

      if (result.success) {
        alert('✅ 已成功關聯到用戶帳號！');
      } else {
        alert('❌ 關聯失敗: ' + result.error);
      }
    } catch (error) {
      alert('❌ 關聯失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

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
      {/* 操作列 */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* 搜尋 */}
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

        {/* 狀態篩選 */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="all">全部狀態</option>
          <option value="active">在職</option>
          <option value="on_leave">請假中</option>
          <option value="resigned">已離職</option>
        </select>

        {/* 新增按鈕 */}
        <button
          onClick={() => {
            resetForm();
            setShowCreateForm(!showCreateForm);
          }}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap"
        >
          <UserPlus size={20} />
          {showCreateForm ? '取消' : '新增員工'}
        </button>
      </div>

      {/* 表單 (新增或編輯) */}
      {(showCreateForm || editingId) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            {editingId ? <Edit2 size={20} /> : <UserPlus size={20} />}
            {editingId ? '編輯員工資料' : '新增員工資料'}
          </h3>

          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  員工編號 *
                  {editingId && !formData._originalEmployeeId && (
                    <span className="ml-2 text-xs text-amber-600">(請填寫員工編號)</span>
                  )}
                  {editingId && formData._originalEmployeeId && (
                    <span className="ml-2 text-xs text-gray-500">(已鎖定，無法修改)</span>
                  )}
                </label>
                <input
                  type="text"
                  required
                  placeholder="EMP001"
                  value={formData.employee_id}
                  onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                  disabled={editingId && !!formData._originalEmployeeId}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                {editingId && !formData._originalEmployeeId && (
                  <p className="mt-1 text-xs text-amber-600">
                    此員工尚未設定員工編號，請在此輸入後保存。設定後將無法再修改。
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">姓名 *</label>
                <input
                  type="text"
                  required
                  placeholder="王小明"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  placeholder="email@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">電話</label>
                <input
                  type="tel"
                  placeholder="02-1234-5678"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">手機</label>
                <input
                  type="tel"
                  placeholder="0912-345-678"
                  value={formData.mobile}
                  onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">部門</label>
                <select
                  value={formData.department_id}
                  onChange={e => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">未指定</option>
                  {/* 2. 統一：部門顯示格式與 DeptManagement 保持一致 (Name + Code) */}
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} {dept.code ? `(${dept.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">職位</label>
                <input
                  type="text"
                  placeholder="工程師"
                  value={formData.position}
                  onChange={e => setFormData({ ...formData, position: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">權限角色</label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {/* 3. 統一：使用動態生成的完整 ROLES 選單 */}
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">狀態</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="active">在職</option>
                  <option value="on_leave">請假中</option>
                  <option value="resigned">已離職</option>
                  <option value="terminated">已終止</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={processing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                {editingId ? '更新' : '建立'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
              >
                <X size={20} />
                取消
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 員工列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider border-b">
                <th className="p-4 font-semibold">員工資訊</th>
                <th className="p-4 font-semibold">部門/職位</th>
                <th className="p-4 font-semibold">聯絡方式</th>
                <th className="p-4 font-semibold">狀態與權限</th> {/* 4. 統一：修改標題 */}
                <th className="p-4 font-semibold text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((employee) => {
                const statusColors = {
                  active: 'bg-green-100 text-green-700',
                  on_leave: 'bg-yellow-100 text-yellow-700',
                  resigned: 'bg-gray-100 text-gray-600',
                  terminated: 'bg-red-100 text-red-700',
                };

                const statusLabels = {
                  active: '在職',
                  on_leave: '請假中',
                  resigned: '已離職',
                  terminated: '已終止',
                };

                // 取得角色資訊以便顯示
                const roleInfo = ROLES.find(r => r.value === employee.role) || { label: employee.role, color: 'bg-gray-100 text-gray-600' };

                return (
                  <tr key={employee.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                          {employee.name?.[0] || <User size={20} />}
                        </div>
                        <div>
                          <div className="font-bold text-gray-800">{employee.name}</div>
                          <div className="text-xs text-gray-500">ID: {employee.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-gray-800 font-medium">
                        {/* 5. 統一：若有部門代碼，一併顯示 */}
                        {employee.department?.name || '未指定'}
                        {employee.department?.code && <span className="text-gray-400 text-xs ml-1">({employee.department.code})</span>}
                      </div>
                      <div className="text-xs text-gray-500">{employee.position || '未設定'}</div>
                    </td>
                    <td className="p-4">
                      {employee.email && (
                        <div className="flex items-center gap-1 text-gray-600 mb-1">
                          <Mail size={12} /> {employee.email}
                        </div>
                      )}
                      {employee.mobile && (
                        <div className="flex items-center gap-1 text-gray-600">
                          <Phone size={12} /> {employee.mobile}
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${statusColors[employee.status]}`}>
                          {statusLabels[employee.status]}
                        </span>
                        {/* 6. 統一：增加 Role 顯示，與 Profile 頁面風格一致 */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${roleInfo.color}`}>
                           {roleInfo.label}
                        </span>
                        {employee.user_id && (
                          <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <LinkIcon size={10} /> 已關聯帳號
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => startEdit(employee)}
                          disabled={processing}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="編輯"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(employee.id, employee.name, employee.role)} // 傳入 role
                          disabled={processing}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="刪除"
                        >
                          <Trash2 size={16} />
                        </button>
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
        <p>共 <span className="font-bold text-blue-600">{filteredEmployees.length}</span> 位員工</p>
        <p>在職 <span className="font-bold text-green-600">
          {employees.filter(e => e.status === 'active').length}
        </span> 位</p>
      </div>
    </div>
  );
}