import React, { useState } from 'react';
import { useEmployees } from '../../../hooks/management/useEmployees';
import { useDepartments } from '../../../hooks/management/useDepartments';
import { useProfiles } from '../../../hooks/management/useProfiles';
import {
  UserPlus, Search, Loader2, Mail, Phone, Briefcase, Building2, User, Save, X, Edit2, Trash2, Link as LinkIcon
} from 'lucide-react';

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
// 處理創建
  const handleCreate = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // 同樣進行資料清理
      const cleanData = {
        ...formData,
        department_id: formData.department_id || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        position: formData.position || null,
      };

      const result = await createEmployee(cleanData); // 使用 cleanData

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
  // 處理更新
const handleUpdate = async (e) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // --- 新增：資料清理邏輯 ---
      // 將空字串轉換為 null，確保後端能正確接收（特別是 UUID 類型的 department_id）
      const cleanData = {
        ...formData,
        department_id: formData.department_id || null,
        email: formData.email || null,
        phone: formData.phone || null,
        mobile: formData.mobile || null,
        position: formData.position || null,
        // employee_id 通常作為主鍵或識別碼，若後端不允許修改此欄位，建議在此移除
        // employee_id: undefined 
      };
      // ------------------------

      // 使用 cleanData 而非 formData
      const result = await updateEmployee(editingId, cleanData);

      if (result.success) {
        alert('✅ 員工資料更新成功！');
        
        // 建議：如果是自行維護的 hook，這裡可能需要手動觸發列表重新整理
        // fetchEmployees(); 
        
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
      employee_id: employee.employee_id,
      name: employee.name,
      email: employee.email || '',
      phone: employee.phone || '',
      mobile: employee.mobile || '',
      department_id: employee.department_id || '',
      position: employee.position || '',
      role: employee.role,
      status: employee.status,
    });
    setEditingId(employee.id);
    setShowCreateForm(false);
  };

  // 處理刪除
  const handleDelete = async (employeeId, employeeName) => {
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
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">員工編號 *</label>
                <input
                  type="text"
                  required
                  placeholder="EMP001"
                  value={formData.employee_id}
                  onChange={e => setFormData({ ...formData, employee_id: e.target.value })}
                  disabled={!!editingId}
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
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
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
                  <option value="user">一般使用者</option>
                  <option value="manager">主管</option>
                  <option value="hr">人資</option>
                  <option value="admin">管理員</option>
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
                <th className="p-4 font-semibold">狀態</th>
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
                      <div className="text-gray-800">{employee.department?.name || '未指定'}</div>
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
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${statusColors[employee.status]}`}>
                        {statusLabels[employee.status]}
                      </span>
                      {employee.user_id && (
                        <div className="text-xs text-green-600 mt-1 flex items-center gap-1">
                          <LinkIcon size={10} /> 已關聯帳號
                        </div>
                      )}
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
                          onClick={() => handleDelete(employee.id, employee.name)}
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
