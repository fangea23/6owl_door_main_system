import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

/**
 * 權限檢查 Hook
 * @param {string} permissionCode - 權限代碼（例如：payment.approve.accountant）
 * @returns {object} { hasPermission, loading, error }
 */
export function usePermission(permissionCode) {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkPermission();
  }, [user?.id, permissionCode]);

  const checkPermission = async () => {
    if (!user?.id || !permissionCode) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 呼叫資料庫函數檢查權限（指定 rbac schema）
      const { data, error: rpcError } = await supabase
        .schema('rbac')
        .rpc('user_has_permission', {
          p_user_id: user.id,
          p_permission_code: permissionCode
        });

      if (rpcError) throw rpcError;

      setHasPermission(data || false);
    } catch (err) {
      console.error('Error checking permission:', err);
      setError(err.message);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasPermission, loading, error };
}

/**
 * 獲取用戶所有權限 Hook
 * @returns {object} { permissions, loading, error }
 */
export function useUserPermissions() {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPermissions();
  }, [user?.id]);

  const fetchPermissions = async () => {
    if (!user?.id) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 呼叫資料庫函數獲取所有權限（指定 rbac schema）
      const { data, error: rpcError } = await supabase
        .schema('rbac')
        .rpc('get_user_permissions', {
          p_user_id: user.id
        });

      if (rpcError) throw rpcError;

      setPermissions(data || []);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      setError(err.message);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  return { permissions, loading, error, refetch: fetchPermissions };
}

/**
 * 權限檢查高階組件
 * @param {string} permission - 所需權限
 * @param {ReactNode} children - 子組件
 * @param {ReactNode} fallback - 沒有權限時顯示的內容
 */
export function PermissionGuard({ permission, children, fallback = null }) {
  const { hasPermission, loading } = usePermission(permission);

  if (loading) {
    return fallback;
  }

  if (!hasPermission) {
    return fallback;
  }

  return children;
}

/**
 * 批量權限檢查 Hook
 * @param {string[]} permissionCodes - 權限代碼陣列
 * @param {string} mode - 'all' 需要全部權限 / 'any' 任一權限即可
 * @returns {object} { hasPermission, loading, error }
 */
export function usePermissions(permissionCodes = [], mode = 'any') {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [results, setResults] = useState({});

  useEffect(() => {
    checkPermissions();
  }, [user?.id, JSON.stringify(permissionCodes), mode]);

  const checkPermissions = async () => {
    if (!user?.id || permissionCodes.length === 0) {
      setHasPermission(false);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 批量檢查每個權限（指定 rbac schema）
      const checks = await Promise.all(
        permissionCodes.map(async (code) => {
          const { data, error: rpcError } = await supabase
            .schema('rbac')
            .rpc('user_has_permission', {
              p_user_id: user.id,
              p_permission_code: code
            });

          if (rpcError) throw rpcError;

          return { code, hasPermission: data || false };
        })
      );

      // 建立結果對照表
      const resultsMap = {};
      checks.forEach(({ code, hasPermission }) => {
        resultsMap[code] = hasPermission;
      });
      setResults(resultsMap);

      // 根據模式決定最終結果
      if (mode === 'all') {
        setHasPermission(checks.every(({ hasPermission }) => hasPermission));
      } else {
        setHasPermission(checks.some(({ hasPermission }) => hasPermission));
      }
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError(err.message);
      setHasPermission(false);
    } finally {
      setLoading(false);
    }
  };

  return { hasPermission, loading, error, results };
}
