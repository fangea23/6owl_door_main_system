import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * 從 RBAC 系統取得用戶角色名稱
 * @returns {{ roleName: string, roleCode: string, loading: boolean }}
 */
export const useUserRole = () => {
  const { user } = useAuth();
  const [roleInfo, setRoleInfo] = useState({
    roleName: '一般用戶',
    roleCode: 'user',
    loading: true
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user?.id) {
        setRoleInfo({ roleName: '訪客', roleCode: 'guest', loading: false });
        return;
      }

      try {
        // 從 RBAC 系統取得用戶角色
        const { data, error } = await supabase
          .schema('rbac')
          .from('user_roles')
          .select(`
            role:roles (
              code,
              name
            )
          `)
          .eq('user_id', user.id)
          .single();

        if (error || !data?.role) {
          // 如果 RBAC 沒有資料，嘗試從 profiles 取得
          const { data: profileData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileData?.role) {
            // 根據 profiles 的 role code 去查詢 RBAC 角色名稱
            const { data: roleData } = await supabase
              .schema('rbac')
              .from('roles')
              .select('code, name')
              .eq('code', profileData.role)
              .single();

            if (roleData) {
              setRoleInfo({
                roleName: roleData.name,
                roleCode: roleData.code,
                loading: false
              });
              return;
            }
          }

          // 最終 fallback
          setRoleInfo({ roleName: '一般用戶', roleCode: 'user', loading: false });
          return;
        }

        setRoleInfo({
          roleName: data.role.name || '一般用戶',
          roleCode: data.role.code || 'user',
          loading: false
        });
      } catch (err) {
        console.error('Error fetching user role:', err);
        setRoleInfo({ roleName: '一般用戶', roleCode: 'user', loading: false });
      }
    };

    fetchUserRole();
  }, [user?.id]);

  return roleInfo;
};

export default useUserRole;
