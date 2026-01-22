import { useState, useMemo } from 'react';
import { getAllSystems } from '../data/systems';
import { useUserPermissions } from './useUserPermissions';
import { useAuth } from '../contexts/AuthContext';

export default function useSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const { role } = useAuth();
  const { hasPermission, loading: permissionsLoading } = useUserPermissions();

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const query = searchQuery.toLowerCase().trim();
    const allSystems = getAllSystems();

    return allSystems.filter(system => {
      // 先檢查文字匹配
      const nameMatch = system.name.toLowerCase().includes(query);
      const descMatch = system.description.toLowerCase().includes(query);
      const categoryMatch = system.categoryName.toLowerCase().includes(query);
      const textMatch = nameMatch || descMatch || categoryMatch;

      if (!textMatch) return false;

      // 權限檢查還在載入中，暫時隱藏
      if (permissionsLoading) return false;

      // 優先檢查系統訪問權限（如果有設定 permissionCode）
      if (system.permissionCode) {
        // 只要有權限就可以看到，不再檢查角色
        return hasPermission(system.permissionCode);
      }

      // 如果沒有 permissionCode，才檢查角色（向後兼容）
      if (system.requiresRole && system.requiresRole.length > 0) {
        return system.requiresRole.includes(role);
      }

      return true;
    });
  }, [searchQuery, permissionsLoading, hasPermission, role]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching: searchQuery.trim().length > 0,
  };
}
