import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Shield, Users, Key, Search, Plus, Edit2, Trash2, Save, X, Loader2 } from 'lucide-react';

/**
 * 權限管理組件
 * 管理角色、權限和權限分配
 */
export default function PermissionManagement() {
  const [activeTab, setActiveTab] = useState('roles'); // roles, permissions, assignments
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // 資料
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [rolePermissions, setRolePermissions] = useState([]);

  // 搜尋
  const [searchTerm, setSearchTerm] = useState('');

  // 編輯狀態
  const [selectedRole, setSelectedRole] = useState(null);
  const [editingPermissions, setEditingPermissions] = useState(new Set());

  useEffect(() => {
    fetchData();
  }, []);

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
    vehicle: '🚗 車輛租借',
    meeting: '🏢 會議室',
    employee: '👥 員工管理',
    rbac: '🔐 權限管理'
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
          { id: 'roles', label: '角色管理', icon: Users },
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
                {roles.map(role => (
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
                    <div className="text-xs text-gray-600 mt-1">
                      {getRolePermissionIds(role.id).length} 個權限
                    </div>
                  </button>
                ))}
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
                  {Object.entries(permissionsByModule).map(([module, modulePerms]) => (
                    <div key={module} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                        {moduleNames[module] || module}
                        <span className="text-xs text-gray-500">
                          ({modulePerms.filter(p => editingPermissions.has(p.id)).length}/{modulePerms.length})
                        </span>
                      </h4>
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
                  ))}
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
    </div>
  );
}
