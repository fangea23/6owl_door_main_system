import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化時檢查登入狀態
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = authService.getCurrentUser();
        if (savedUser) {
          setUser(savedUser);
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, []);

  // 登入
  const login = async (credentials) => {
    setIsLoading(true);
    try {
      const result = await authService.login(credentials);
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: '登入失敗，請稍後再試' };
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = () => {
    authService.logout();
    setUser(null);
  };

  // 更新用戶資料
  const updateProfile = async (updates) => {
    try {
      const result = await authService.updateProfile(updates);
      if (result.success) {
        setUser(result.user);
        return { success: true };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return { success: false, error: '更新失敗' };
    }
  };

  // 變更密碼
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const result = await authService.changePassword(currentPassword, newPassword);
      return result;
    } catch (error) {
      return { success: false, error: '密碼變更失敗' };
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateProfile,
    changePassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
