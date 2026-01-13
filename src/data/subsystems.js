/**
 * 子系統配置
 *
 * ============================================
 * 如何整合你的 Vite 子系統
 * ============================================
 *
 * 方式一：iframe 嵌入（推薦）
 * ------------------------------------------
 * 1. 在這裡配置子系統的 URL
 * 2. 子系統會以 iframe 方式嵌入主系統
 * 3. 主系統會自動傳遞認證 token 給子系統
 *
 * 子系統需要做的事：
 * - 從 URL 參數接收 token: new URLSearchParams(location.search).get('token')
 * - 驗證 token 有效性
 * - 如果要與主系統通訊，使用 postMessage
 *
 * 範例：
 * // 在子系統中接收認證
 * const token = new URLSearchParams(window.location.search).get('token');
 * if (token) {
 *   // 驗證 token 並設置登入狀態
 *   validateToken(token);
 * }
 *
 *
 * 方式二：獨立部署（外部連結）
 * ------------------------------------------
 * 1. 設置 isExternal: true
 * 2. 用戶點擊後會在新視窗開啟子系統
 * 3. 子系統需要有自己的登入機制，或透過 SSO 整合
 *
 *
 * 方式三：Micro Frontend（進階）
 * ------------------------------------------
 * 若需要更深度的整合，可以考慮：
 * - Module Federation (Webpack/Vite)
 * - Single-SPA
 * - qiankun
 *
 * 這需要額外的架構設計，請參考相關文件
 *
 * ============================================
 */

export const subSystemConfig = {
  // ============================================
  // 付款簽核系統
  // ============================================
  'payment-approval': {
    id: 'payment-approval',
    name: '付款簽核系統',
    icon: '📝',
    // 子系統的 URL（開發環境可能是 localhost:5174）
    // 生產環境請改為實際部署的 URL
    url: 'http://localhost:5174',
    // 認證方式：'token' | 'cookie' | 'none'
    authMethod: 'token',
    // 是否傳遞用戶資訊
    passUserInfo: true,
    // 是否允許新視窗開啟
    allowNewWindow: true,
    // 系統狀態：'active' | 'maintenance' | 'coming-soon'
    status: 'active',
    // 維護結束時間（僅在 status 為 maintenance 時使用）
    maintenanceEnd: null,
  },

  // ============================================
  // 軟體授權系統
  // ============================================
  'software-license': {
    id: 'software-license',
    name: '軟體授權系統',
    icon: '🔑',
    url: 'http://localhost:5175',
    authMethod: 'token',
    passUserInfo: true,
    allowNewWindow: true,
    status: 'active',
    maintenanceEnd: null,
  },

  // ============================================
  // 會議室租借系統
  // ============================================
  'meeting-room': {
    id: 'meeting-room',
    name: '會議室租借系統',
    icon: '📅',
    url: 'http://localhost:5176',
    authMethod: 'token',
    passUserInfo: true,
    allowNewWindow: true,
    status: 'active',
    maintenanceEnd: null,
  },
};

/**
 * 子系統與主系統的通訊 Helper
 *
 * 在子系統中使用：
 *
 * // 發送訊息給主系統
 * window.parent.postMessage({
 *   type: 'SUBSYSTEM_EVENT',
 *   payload: { action: 'navigate', path: '/' }
 * }, '*');
 *
 * // 監聽主系統訊息
 * window.addEventListener('message', (event) => {
 *   if (event.data.type === 'MAIN_SYSTEM_EVENT') {
 *     // 處理事件
 *   }
 * });
 */
export const SubSystemEvents = {
  // 子系統 -> 主系統
  NAVIGATE: 'NAVIGATE',           // 請求導航
  LOGOUT: 'LOGOUT',               // 請求登出
  NOTIFICATION: 'NOTIFICATION',   // 發送通知

  // 主系統 -> 子系統
  USER_UPDATED: 'USER_UPDATED',   // 用戶資訊更新
  TOKEN_REFRESH: 'TOKEN_REFRESH', // Token 更新
};
