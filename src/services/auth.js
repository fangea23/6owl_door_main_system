/**
 * 認證服務
 *
 * 注意：這是模擬實作，實際使用時請替換為真實的 API 呼叫
 *
 * 整合真實後端時，請修改以下方法：
 * - login(): 呼叫後端 /api/auth/login
 * - logout(): 呼叫後端 /api/auth/logout
 * - updateProfile(): 呼叫後端 /api/user/profile
 * - changePassword(): 呼叫後端 /api/user/password
 */

const STORAGE_KEY = 'sixdoor_auth';
const TOKEN_KEY = 'sixdoor_token';

// 模擬用戶資料庫（實際應連接後端）
const MOCK_USERS = [
  {
    id: '1',
    employeeId: 'EMP001',
    email: 'admin@sixdoor.com',
    password: 'admin123', // 實際環境請勿明文儲存
    name: '系統管理員',
    department: '資訊部',
    position: '系統管理員',
    avatar: null,
    phone: '02-1234-5678',
    role: 'admin',
    permissions: ['all'],
  },
  {
    id: '2',
    employeeId: 'EMP002',
    email: 'user@sixdoor.com',
    password: 'user123',
    name: '王小明',
    department: '業務部',
    position: '業務專員',
    avatar: null,
    phone: '02-8765-4321',
    role: 'user',
    permissions: ['payment-approval', 'meeting-room'],
  },
];

// 模擬 API 延遲
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const authService = {
  /**
   * 登入
   * @param {Object} credentials - { email, password } 或 { employeeId, password }
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async login({ email, employeeId, password }) {
    await delay(800); // 模擬網路延遲

    const user = MOCK_USERS.find(u =>
      (email && u.email === email && u.password === password) ||
      (employeeId && u.employeeId === employeeId && u.password === password)
    );

    if (user) {
      // 移除密碼後儲存
      const { password: _, ...safeUser } = user;
      const token = btoa(JSON.stringify({ userId: user.id, exp: Date.now() + 86400000 }));

      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeUser));
      localStorage.setItem(TOKEN_KEY, token);

      return { success: true, user: safeUser, token };
    }

    return { success: false, error: '帳號或密碼錯誤' };
  },

  /**
   * 登出
   */
  logout() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * 取得當前登入用戶
   * @returns {Object|null}
   */
  getCurrentUser() {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) return null;

      // 檢查 token 是否過期
      const decoded = JSON.parse(atob(token));
      if (decoded.exp < Date.now()) {
        this.logout();
        return null;
      }

      const user = localStorage.getItem(STORAGE_KEY);
      return user ? JSON.parse(user) : null;
    } catch {
      this.logout();
      return null;
    }
  },

  /**
   * 取得 Token
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * 更新用戶資料
   * @param {Object} updates - 要更新的欄位
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async updateProfile(updates) {
    await delay(500);

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: '請先登入' };
    }

    // 合併更新（實際應呼叫 API）
    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedUser));

    return { success: true, user: updatedUser };
  },

  /**
   * 變更密碼
   * @param {string} currentPassword - 當前密碼
   * @param {string} newPassword - 新密碼
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async changePassword(currentPassword, newPassword) {
    await delay(500);

    const currentUser = this.getCurrentUser();
    if (!currentUser) {
      return { success: false, error: '請先登入' };
    }

    // 模擬驗證當前密碼（實際應呼叫 API）
    const user = MOCK_USERS.find(u => u.id === currentUser.id);
    if (user?.password !== currentPassword) {
      return { success: false, error: '當前密碼錯誤' };
    }

    // 實際環境應呼叫 API 更新密碼
    return { success: true, message: '密碼已更新' };
  },

  /**
   * 檢查用戶是否有特定權限
   * @param {string} permission - 權限名稱
   * @returns {boolean}
   */
  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.permissions.includes('all')) return true;
    return user.permissions.includes(permission);
  },
};
