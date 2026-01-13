// 統一使用主系統的認證 Context
// 所有 import { useAuth } from './contexts/AuthContext' 會自動使用主系統的認證
import { AuthProvider as MainAuthProvider, useAuth as useMainAuth } from '../../../../contexts/AuthContext';

// 包裝 useAuth 以提供兼容性 (signOut -> logout)
export function useAuth() {
  const auth = useMainAuth();

  return {
    ...auth,
    // License System 使用 signOut，主系統使用 logout
    signOut: auth.logout,
    // License System 使用 signIn，主系統使用 login
    signIn: auth.login,
    // 兼容 loading 屬性
    loading: auth.isLoading,
  };
}

export const AuthProvider = MainAuthProvider;
