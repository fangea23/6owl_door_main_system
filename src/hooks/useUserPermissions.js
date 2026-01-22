import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * 批量獲取用戶的所有權限
 * 用於快速檢查用戶是否有多個權限
 *
 * @returns {Object} { permissions: Set<string>, loading: boolean, error: Error }
 */
export function useUserPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) {
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      try {
        setLoading(true);
        setError(null);

        // 查詢用戶所有的權限
        const { data, error: queryError } = await supabase
          .schema('rbac')
          .from('user_roles')
          .select(`
            role:roles!inner(
              role_permissions!inner(
                permission:permissions!inner(
                  code
                )
              )
            )
          `)
          .eq('user_id', user.id)
          .is('role.deleted_at', null)
          .is('role.role_permissions.deleted_at', null)
          .is('role.role_permissions.permission.deleted_at', null);

        if (queryError) throw queryError;

        // 提取所有權限代碼
        const permissionCodes = new Set();
        if (data) {
          data.forEach(userRole => {
            userRole.role?.role_permissions?.forEach(rolePermission => {
              const code = rolePermission.permission?.code;
              if (code) {
                permissionCodes.add(code);
              }
            });
          });
        }

        setPermissions(permissionCodes);
      } catch (err) {
        console.error('Error fetching user permissions:', err);
        setError(err);
        setPermissions(new Set());
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, [user?.id]);

  return {
    permissions,
    loading,
    error,
    hasPermission: (permissionCode) => permissions.has(permissionCode),
    hasAnyPermission: (...permissionCodes) => permissionCodes.some(code => permissions.has(code)),
    hasAllPermissions: (...permissionCodes) => permissionCodes.every(code => permissions.has(code)),
  };
}
