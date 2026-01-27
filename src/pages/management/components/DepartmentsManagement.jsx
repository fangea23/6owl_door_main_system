import React, { useState } from 'react';
import { useDepartments } from '../../../hooks/management/useDepartments';
import { useEmployees } from '../../../hooks/management/useEmployees';
import { usePermission } from '../../../hooks/usePermission';
import {
  Building2, Plus, Search, Loader2, Edit2, Trash2, Save, X, Users, MapPin
} from 'lucide-react';

export default function DepartmentsManagement() {
  const {
    departments,
    loading,
    createDepartment,
    updateDepartment,
    deleteDepartment,
  } = useDepartments();

  const { employees } = useEmployees();

  // 細緻權限檢查
  const { hasPermission: canCreate } = usePermission('department.create');
  const { hasPermission: canEdit } = usePermission('department.edit');
  const { hasPermission: canDelete } = usePermission('department.delete');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [processing, setProcessing] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    manager_id: '',
    parent_department_id: '',
    email: '',
    phone: '',
    location: '',
    is_active: true,
  });

  // 重置表單
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      manager_id: '',
      parent_department_id: '',
      email: '',
      phone: '',
      location: '',
      is_active: true,
    });
    setShowCreateForm(false);
    setEditingId(null);
  };

  // 搜尋過濾
  const filteredDepartments = departments.filter(dept =>
    dept.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dept.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 處理創建
  const handleCreate = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // 清理空值
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '' && v !== null)
      );

      const result = await createDepartment(cleanData);

      if (result.success) {
        alert('✅ 部門建立成功！');
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
      // 清理空值
      const cleanData = Object.fromEntries(
        Object.entries(formData).filter(([_, v]) => v !== '')
      );

      const result = await updateDepartment(editingId, cleanData);

      if (result.success) {
        alert('✅ 部門更新成功！');
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
  const startEdit = (department) => {
    setFormData({
      name: department.name,
      code: department.code || '',
      description: department.description || '',
      manager_id: department.manager_id || '',
      parent_department_id: department.parent_department_id || '',
      email: department.email || '',
      phone: department.phone || '',
      location: department.location || '',
      is_active: department.is_active,
    });
    setEditingId(department.id);
    setShowCreateForm(false);
  };

  // 處理刪除
  const handleDelete = async (departmentId, departmentName) => {
    if (!window.confirm(`確定要刪除部門「${departmentName}」嗎？`)) return;

    setProcessing(true);
    try {
      const result = await deleteDepartment(departmentId);

      if (result.success) {
        alert('✅ 部門已刪除');
      } else {
        alert('❌ 刪除失敗: ' + result.error);
      }
    } catch (error) {
      alert('❌ 刪除失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // 計算部門人數
  const getDepartmentEmployeeCount = (departmentId) => {
    return employees.filter(emp => emp.department_id === departmentId && emp.status === 'active').length;
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
            placeholder="搜尋部門名稱或代碼..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* 新增按鈕 - 需要 department.create 權限 */}
        {canCreate && (
          <button
            onClick={() => {
              resetForm();
              setShowCreateForm(!showCreateForm);
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg transition flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={20} />
            {showCreateForm ? '取消' : '新增部門'}
          </button>
        )}
      </div>

      {/* 表單 (新增或編輯) */}
      {((showCreateForm && canCreate) || (editingId && canEdit)) && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 animate-in fade-in">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
            {editingId ? '編輯部門資料' : '新增部門'}
          </h3>

          <form onSubmit={editingId ? handleUpdate : handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">部門名稱 *</label>
                <input
                  type="text"
                  required
                  placeholder="資訊技術部"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">部門代碼</label>
                <input
                  type="text"
                  placeholder="IT"
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">部門描述</label>
              <textarea
                placeholder="部門職責與說明..."
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">部門主管</label>
                <select
                  value={formData.manager_id}
                  onChange={e => setFormData({ ...formData, manager_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">未指定</option>
                  {employees.filter(e => e.status === 'active').map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">上級部門</label>
                <select
                  value={formData.parent_department_id}
                  onChange={e => setFormData({ ...formData, parent_department_id: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">無（頂層部門）</option>
                  {departments.filter(d => d.id !== editingId).map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">部門信箱</label>
                <input
                  type="email"
                  placeholder="dept@company.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">部門電話</label>
                <input
                  type="tel"
                  placeholder="02-1234-5678"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">辦公地點</label>
                <input
                  type="text"
                  placeholder="3F 東側"
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                啟用此部門
              </label>
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

      {/* 部門列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDepartments.map((department) => {
          const employeeCount = getDepartmentEmployeeCount(department.id);

          return (
            <div key={department.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
              {/* 部門頭部 */}
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${department.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{department.name}</h3>
                    {department.code && (
                      <span className="text-xs text-gray-500 font-mono">{department.code}</span>
                    )}
                  </div>
                </div>

                {/* 狀態標籤 */}
                {!department.is_active && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    已停用
                  </span>
                )}
              </div>

              {/* 描述 */}
              {department.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {department.description}
                </p>
              )}

              {/* 資訊 */}
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {department.manager && (
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-gray-400" />
                    <span>主管：{department.manager.name}</span>
                  </div>
                )}

                {department.location && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span>{department.location}</span>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Users size={14} className="text-gray-400" />
                  <span>員工數：{employeeCount} 人</span>
                </div>
              </div>

              {/* 操作按鈕 - 需要對應權限 */}
              {(canEdit || canDelete) && (
                <div className="flex gap-2 pt-4 border-t border-gray-100">
                  {canEdit && (
                    <button
                      onClick={() => startEdit(department)}
                      disabled={processing}
                      className="flex-1 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition flex items-center justify-center gap-1"
                    >
                      <Edit2 size={16} />
                      編輯
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(department.id, department.name)}
                      disabled={processing}
                      className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded-lg transition flex items-center justify-center gap-1"
                    >
                      <Trash2 size={16} />
                      刪除
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 無資料提示 */}
      {filteredDepartments.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Building2 size={64} className="mb-3 opacity-20" />
          <p className="text-lg">查無部門資料</p>
        </div>
      )}

      {/* 統計資訊 */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 text-sm text-gray-600">
        <p>共 <span className="font-bold text-blue-600">{filteredDepartments.length}</span> 個部門</p>
      </div>
    </div>
  );
}
