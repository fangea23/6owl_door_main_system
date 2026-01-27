import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, Users, Key, Search, Plus, Edit2, Trash2, Save, X, Loader2, AlertCircle, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';
import { usePermission } from '../../../hooks/usePermission';

/**
 * 權限管理組件
 * 管理角色、權限和權限分配
 */
export default function PermissionManagement() {
  // RBAC 權限檢查
  const { hasPermission: canManage, loading: permissionLoading } = usePermission('rbac.manage');

  const [activeTab, setActiveTab] = useState('roles'); // roles, permissions, user-roles
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // 資料
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);

  // 用戶角色指派相關
  const [employees, setEmployees] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [editingUserRoles, setEditingUserRoles] = useState(new Set());
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set(['level', 'approval', 'function_basic', 'function_admin', 'store']));

  // 搜尋
  const [searchTerm, setSearchTerm] = useState('');

  // 編輯狀態
  const [selectedRole, setSelectedRole] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'user-roles') {
      fetchEmployeesAndUserRoles();
    }
  }, [activeTab]);

  const fetchEmployeesAndUserRoles = async () => {
    try {
      // 獲取所有在職員工
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('id, user_id, employee_id, name, department:departments(name), position')
        .eq('status', 'active')
        .order('employee_id');

      if (employeesError) throw employeesError;

      // 獲取所有用戶角色關聯
      const { data: userRolesData, error: userRolesError } = await supabase
        .schema('rbac')
        .from('user_roles')
        .select(`
          id,
          user_id,
          role_id,
          roles!inner(id, code, name, category)
        `);

      if (userRolesError) throw userRolesError;

      setEmployees(employeesData || []);
      setUserRoles(userRolesData || []);
    } catch (error) {
      console.error('Error fetching employees and user roles:', error);
      alert('載入員工資料失敗: ' + error.message);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // 獲取所有角色
      const { data: rolesData, error: rolesError } = await supabase
        .schema('rbac')
        .from('roles')
        .select('*')
        .is('deleted_at', null)
        .order('level', { ascending: false });

      if (rolesError) throw rolesError;

      // 獲取所有權限
      const { data: permissionsData, error: permissionsError } = await supabase
        .schema('rbac')
        .from('permissions')
        .select('*')
        .is('deleted_at', null)
        .order('module, code');

      if (permissionsError) throw permissionsError;

      // 獲取角色權限關聯
      const { data: rpData, error: rpError } = await supabase
        .schema('rbac')
        .from('role_permissions')
        .select(`
          id,
          role_id,
          permission_id,
          roles!inner(code, name),
          permissions!inner(code, name, module)
        `);

      if (rpError) throw rpError;

      setRoles(rolesData || []);
      setPermissions(permissionsData || []);
      setRolePermissions(rpData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('載入失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 獲取角色的權限ID列表
  const getRolePermissionIds = (roleId) => {
    return rolePermissions
      .filter(rp => rp.role_id === roleId)
      .map(rp => rp.permission_id);
  };

  // 切換權限選擇
  const togglePermission = (permissionId) => {
    setEditingPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(permissionId)) {
        newSet.delete(permissionId);
      } else {
        newSet.add(permissionId);
      }
      return newSet;
    });
  };

  // 批量切換模組的所有權限
  const toggleModulePermissions = (modulePerms) => {
    const modulePermIds = modulePerms.map(p => p.id);
    const allSelected = modulePermIds.every(id => editingPermissions.has(id));

    setEditingPermissions(prev => {
      const newSet = new Set(prev);
      if (allSelected) {
        // 全部已選，則全部取消
        modulePermIds.forEach(id => newSet.delete(id));
      } else {
        // 部分或全部未選，則全部選中
        modulePermIds.forEach(id => newSet.add(id));
      }
      return newSet;
    });
  };

  // 開始編輯角色權限
  const startEditRole = (role) => {
    setSelectedRole(role);
    const currentPermissions = getRolePermissionIds(role.id);
    setEditingPermissions(new Set(currentPermissions));
  };

  // 保存角色權限
  const saveRolePermissions = async () => {
    if (!selectedRole) return;

    setProcessing(true);
    try {
      // 1. 刪除該角色的所有權限
      const { error: deleteError } = await supabase
        .schema('rbac')
        .from('role_permissions')
        .delete()
        .eq('role_id', selectedRole.id);

      if (deleteError) throw deleteError;

      // 2. 插入新的權限
      if (editingPermissions.size > 0) {
        const insertData = Array.from(editingPermissions).map(permissionId => ({
          role_id: selectedRole.id,
          permission_id: permissionId
        }));

        const { error: insertError } = await supabase
          .schema('rbac')
          .from('role_permissions')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      alert(`✅ 已成功更新「${selectedRole.name}」的權限`);
      setSelectedRole(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving permissions:', error);
      alert('❌ 保存失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // 取消編輯
  const cancelEdit = () => {
    setSelectedRole(null);
    setEditingPermissions(new Set());
  };

  // === 用戶角色指派相關函數 ===

  // 獲取員工的角色ID列表
  const getEmployeeRoleIds = (userId) => {
    return userRoles
      .filter(ur => ur.user_id === userId)
      .map(ur => ur.role_id);
  };

  // 開始編輯員工角色
  const startEditEmployeeRoles = (employee) => {
    if (!employee.user_id) {
      alert('此員工尚未綁定系統帳號，無法設定角色');
      return;
    }
    setSelectedEmployee(employee);
    const currentRoles = getEmployeeRoleIds(employee.user_id);
    setEditingUserRoles(new Set(currentRoles));
  };

  // 切換角色選擇
  const toggleUserRole = (roleId) => {
    setEditingUserRoles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roleId)) {
        newSet.delete(roleId);
      } else {
        newSet.add(roleId);
      }
      return newSet;
    });
  };

  // 保存員工角色
  const saveEmployeeRoles = async () => {
    if (!selectedEmployee?.user_id) return;

    setProcessing(true);
    try {
      // 1. 刪除該用戶的所有角色
      const { error: deleteError } = await supabase
        .schema('rbac')
        .from('user_roles')
        .delete()
        .eq('user_id', selectedEmployee.user_id);

      if (deleteError) throw deleteError;

      // 2. 插入新的角色
      if (editingUserRoles.size > 0) {
        const insertData = Array.from(editingUserRoles).map(roleId => ({
          user_id: selectedEmployee.user_id,
          role_id: roleId
        }));

        const { error: insertError } = await supabase
          .schema('rbac')
          .from('user_roles')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      alert(`✅ 已成功更新「${selectedEmployee.name}」的角色`);
      setSelectedEmployee(null);
      setEditingUserRoles(new Set());
      await fetchEmployeesAndUserRoles();
    } catch (error) {
      console.error('Error saving user roles:', error);
      alert('❌ 保存失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  // 取消編輯員工角色
  const cancelEditEmployee = () => {
    setSelectedEmployee(null);
    setEditingUserRoles(new Set());
  };

  // 切換展開/收合分類
  const toggleCategory = (category) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  // 篩選後的員工列表
  const filteredEmployees = employees.filter(emp => {
    if (!employeeSearchTerm) return true;
    const searchLower = employeeSearchTerm.toLowerCase();
    return (
      emp.name?.toLowerCase().includes(searchLower) ||
      emp.employee_id?.toLowerCase().includes(searchLower) ||
      emp.department?.name?.toLowerCase().includes(searchLower) ||
      emp.position?.toLowerCase().includes(searchLower)
    );
  });

  // 按分類分組角色
  const rolesByCategory = roles.reduce((acc, role) => {
    const category = role.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(role);
    return acc;
  }, {});

  // 角色分類名稱
  const categoryNames = {
    level: '🎯 職級角色（每人選一個）',
    approval: '✅ 簽核角色（簽核流程權限）',
    function_basic: '🔧 功能角色 - 基本（可複選）',
    function_admin: '⚙️ 功能角色 - 管理（可複選）',
    store: '🏪 門市角色（門市人員選用）',
    system: '🔐 系統角色（最高權限）',
    other: '📋 其他角色'
  };

  // 按模組分組權限
  const permissionsByModule = permissions.reduce((acc, permission) => {
    if (!acc[permission.module]) {
      acc[permission.module] = [];
    }
    acc[permission.module].push(permission);
    return acc;
  }, {});

  const moduleNames = {
    payment: '💰 付款簽核',
    car_rental: '🚗 車輛租借',
    vehicle: '🚗 車輛租借（舊）',
    meeting_room: '🏢 會議室',
    meeting: '🏢 會議室（舊）',
    employee: '👥 員工管理',
    rbac: '🔐 權限管理',
    scheduling: '📅 排班管理',
    workflow: '📋 簽核流程',
    inspection: '🔍 門市稽核',
    pos_data: '📊 POS 數據',
    franchise: '🏪 加盟管理',
    incident: '⚠️ 異常通報',
    store_ops: '🏬 門市營運',
    store_hr: '👤 門市人事',
    store_finance: '💵 門市財務',
    supervisor: '👔 督導管理'
  };

  // 角色資料範圍類型
  const scopeTypeLabels = {
    all: { label: '全部資料', color: 'bg-red-100 text-red-700' },
    assigned_brands: { label: '負責品牌', color: 'bg-purple-100 text-purple-700' },
    assigned_stores: { label: '負責門市', color: 'bg-blue-100 text-blue-700' },
    own_store: { label: '所屬門市', color: 'bg-green-100 text-green-700' },
    self: { label: '僅自己', color: 'bg-gray-100 text-gray-700' }
  };

  // 角色組織類型
  const orgTypeLabels = {
    headquarters: { label: '總部', color: 'bg-indigo-100 text-indigo-700' },
    store: { label: '門市', color: 'bg-teal-100 text-teal-700' },
    both: { label: '通用', color: 'bg-orange-100 text-orange-700' }
  };

  // 權限檢查載入中
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">檢查權限中...</span>
      </div>
    );
  }

  // 沒有管理權限
  if (!canManage) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield size={32} />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">無管理權限</h2>
          <p className="text-gray-600 mb-4">您沒有權限管理系統角色和權限設定</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5" />
              <div className="text-left text-sm text-amber-800">
                <p className="font-medium mb-1">需要以下權限：</p>
                <code className="bg-amber-100 px-2 py-0.5 rounded text-xs">rbac.manage</code>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            請聯絡系統管理員申請權限管理權限
          </p>
        </div>
      </div>
    );
  }

  // 資料載入中
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">載入資料中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <Shield size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">權限管理</h2>
            <p className="text-sm text-gray-500">管理系統角色和權限設定</p>
          </div>
        </div>
      </div>

      {/* 分頁 */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { id: 'user-roles', label: '用戶角色指派', icon: UserCheck },
          { id: 'roles', label: '角色權限管理', icon: Users },
          { id: 'permissions', label: '權限列表', icon: Key },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent hover:text-gray-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 角色管理 */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：角色列表 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-800 mb-4">角色列表</h3>
              <div className="space-y-2">
                {roles.map(role => {
                  const scopeInfo = scopeTypeLabels[role.scope_type] || scopeTypeLabels.self;
                  const orgInfo = orgTypeLabels[role.org_type] || orgTypeLabels.both;
                  return (
                    <button
                      key={role.id}
                      onClick={() => startEditRole(role)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedRole?.id === role.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">{role.name}</div>
                          <div className="text-xs text-gray-500">{role.code}</div>
                        </div>
                        <div className="text-xs text-gray-500">
                          Lv.{role.level}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${scopeInfo.color}`}>
                          {scopeInfo.label}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${orgInfo.color}`}>
                          {orgInfo.label}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        {getRolePermissionIds(role.id).length} 個權限
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 右側：權限編輯 */}
          <div className="lg:col-span-2">
            {selectedRole ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedRole.name}</h3>
                    <p className="text-sm text-gray-500">{selectedRole.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveRolePermissions}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {processing ? (
                        <><Loader2 size={16} className="animate-spin" /> 保存中...</>
                      ) : (
                        <><Save size={16} /> 保存</>
                      )}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
                    >
                      <X size={16} /> 取消
                    </button>
                  </div>
                </div>

                {/* 按模組分類的權限 */}
                <div className="space-y-6">
                  {Object.entries(permissionsByModule).map(([module, modulePerms]) => {
                    const selectedCount = modulePerms.filter(p => editingPermissions.has(p.id)).length;
                    const totalCount = modulePerms.length;
                    const allSelected = selectedCount === totalCount;

                    return (
                      <div key={module} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            {moduleNames[module] || module}
                            <span className="text-xs text-gray-500">
                              ({selectedCount}/{totalCount})
                            </span>
                          </h4>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(modulePerms)}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              allSelected
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            }`}
                          >
                            {allSelected ? '全部取消' : '全部勾選'}
                          </button>
                        </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {modulePerms.map(permission => {
                          const isSelected = editingPermissions.has(permission.id);
                          return (
                            <label
                              key={permission.id}
                              className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-blue-50 border-2 border-blue-300'
                                  : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-200'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => togglePermission(permission.id)}
                                className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className={`text-sm font-medium ${
                                  isSelected ? 'text-blue-700' : 'text-gray-700'
                                }`}>
                                  {permission.name}
                                </div>
                                <div className="text-xs text-gray-500 mt-0.5">
                                  {permission.code}
                                </div>
                                {permission.description && (
                                  <div className="text-xs text-gray-400 mt-1">
                                    {permission.description}
                                  </div>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                <Shield size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">請從左側選擇要編輯的角色</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 權限列表 */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-800">所有權限</h3>
              <div className="text-sm text-gray-500">
                共 {permissions.length} 個權限
              </div>
            </div>

            {/* 按模組分類顯示 */}
            <div className="space-y-6">
              {Object.entries(permissionsByModule).map(([module, modulePerms]) => (
                <div key={module} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-bold text-gray-800 mb-3">
                    {moduleNames[module] || module}
                    <span className="ml-2 text-xs text-gray-500">
                      ({modulePerms.length} 個權限)
                    </span>
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">權限代碼</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">權限名稱</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">分類</th>
                          <th className="px-4 py-2 text-left font-semibold text-gray-700">說明</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {modulePerms.map(permission => (
                          <tr key={permission.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 font-mono text-xs text-gray-600">
                              {permission.code}
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800">
                              {permission.name}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                permission.category === 'read' ? 'bg-blue-100 text-blue-700' :
                                permission.category === 'write' ? 'bg-green-100 text-green-700' :
                                permission.category === 'approve' ? 'bg-purple-100 text-purple-700' :
                                permission.category === 'delete' ? 'bg-red-100 text-red-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {permission.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-gray-600 text-xs">
                              {permission.description || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 用戶角色指派 */}
      {activeTab === 'user-roles' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：員工列表 */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-bold text-gray-800 mb-4">員工列表</h3>

              {/* 搜尋框 */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="搜尋員工姓名、編號、部門..."
                  value={employeeSearchTerm}
                  onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {filteredEmployees.map(employee => {
                  const employeeRoleCount = employee.user_id ? getEmployeeRoleIds(employee.user_id).length : 0;
                  const hasAccount = !!employee.user_id;
                  return (
                    <button
                      key={employee.id}
                      onClick={() => startEditEmployeeRoles(employee)}
                      disabled={!hasAccount}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedEmployee?.id === employee.id
                          ? 'bg-blue-100 border-2 border-blue-500'
                          : hasAccount
                            ? 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                            : 'bg-gray-100 border-2 border-transparent opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-800 truncate">{employee.name}</div>
                          <div className="text-xs text-gray-500 truncate">
                            {employee.employee_id} · {employee.department?.name || '未設定'}
                          </div>
                          <div className="text-xs text-gray-400">{employee.position || ''}</div>
                        </div>
                        <div className="flex flex-col items-end ml-2">
                          {hasAccount ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              employeeRoleCount > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {employeeRoleCount} 個角色
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-500">
                              無帳號
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 text-xs text-gray-500 text-center">
                共 {filteredEmployees.length} 位員工
                {employeeSearchTerm && ` (篩選自 ${employees.length} 位)`}
              </div>
            </div>
          </div>

          {/* 右側：角色選擇 */}
          <div className="lg:col-span-2">
            {selectedEmployee ? (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{selectedEmployee.name}</h3>
                    <p className="text-sm text-gray-500">
                      {selectedEmployee.employee_id} · {selectedEmployee.department?.name} · {selectedEmployee.position}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveEmployeeRoles}
                      disabled={processing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                    >
                      {processing ? (
                        <><Loader2 size={16} className="animate-spin" /> 保存中...</>
                      ) : (
                        <><Save size={16} /> 保存角色</>
                      )}
                    </button>
                    <button
                      onClick={cancelEditEmployee}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center gap-2"
                    >
                      <X size={16} /> 取消
                    </button>
                  </div>
                </div>

                {/* 說明 */}
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">💡 多角色設計說明：</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700">
                      <li><strong>職級角色</strong>：決定基本權限等級，每人建議選一個</li>
                      <li><strong>簽核角色</strong>：負責簽核流程的人員勾選對應角色</li>
                      <li><strong>功能角色</strong>：依職務需要複選功能權限</li>
                      <li><strong>門市角色</strong>：門市人員選用對應職位</li>
                    </ul>
                  </div>
                </div>

                {/* 已選角色摘要 */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    已選擇 {editingUserRoles.size} 個角色：
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {editingUserRoles.size === 0 ? (
                      <span className="text-gray-400 text-sm">尚未選擇任何角色</span>
                    ) : (
                      roles
                        .filter(r => editingUserRoles.has(r.id))
                        .map(role => (
                          <span
                            key={role.id}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                          >
                            {role.name}
                          </span>
                        ))
                    )}
                  </div>
                </div>

                {/* 按分類顯示角色 */}
                <div className="space-y-4">
                  {Object.entries(rolesByCategory).map(([category, categoryRoles]) => {
                    const isExpanded = expandedCategories.has(category);
                    const selectedInCategory = categoryRoles.filter(r => editingUserRoles.has(r.id)).length;

                    return (
                      <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleCategory(category)}
                          className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-800">
                              {categoryNames[category] || category}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              selectedInCategory > 0
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-200 text-gray-500'
                            }`}>
                              {selectedInCategory}/{categoryRoles.length}
                            </span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp size={20} className="text-gray-400" />
                          ) : (
                            <ChevronDown size={20} className="text-gray-400" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {categoryRoles.map(role => {
                              const isSelected = editingUserRoles.has(role.id);
                              return (
                                <label
                                  key={role.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-blue-50 border-2 border-blue-300'
                                      : 'bg-gray-50 border-2 border-gray-200 hover:border-blue-200'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleUserRole(role.id)}
                                    className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                  />
                                  <div className="flex-1">
                                    <div className={`text-sm font-medium ${
                                      isSelected ? 'text-blue-700' : 'text-gray-700'
                                    }`}>
                                      {role.name}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                      {role.code}
                                    </div>
                                    {role.description && (
                                      <div className="text-xs text-gray-400 mt-1">
                                        {role.description}
                                      </div>
                                    )}
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                <UserCheck size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-2">請從左側選擇要設定角色的員工</p>
                <p className="text-sm text-gray-400">員工需要有系統帳號才能設定角色</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
