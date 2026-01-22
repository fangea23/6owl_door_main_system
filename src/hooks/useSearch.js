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

      // 檢查系統訪問權限
      if (system.permissionCode && !hasPermission(system.permissionCode)) {
        return false;
      }

      // 檢查角色（向後兼容）
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
