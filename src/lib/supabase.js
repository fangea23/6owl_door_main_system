import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// 🔴 重要：如果環境變數未設定，立即拋出錯誤
if (!supabaseUrl || !supabaseKey) {
  const errorMsg = `
❌ Supabase 環境變數未設置！

缺少的變數：
${!supabaseUrl ? '  - VITE_SUPABASE_URL\n' : ''}${!supabaseKey ? '  - VITE_SUPABASE_KEY\n' : ''}
請按照以下步驟設置：

1. 在專案根目錄創建 .env 檔案
2. 添加以下內容：
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_KEY=your_supabase_anon_key
3. 重啟開發伺服器

如果在 Vercel 部署，請在 Vercel Dashboard 設置環境變數。
  `;
  console.error(errorMsg);
  throw new Error('Supabase configuration missing. Check console for details.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true, // 重要：從 URL hash 中檢測 token
    // ⬇️ 加入這行：將 Token 檢查間隔縮短，減少過期機會
    // 但這無法完全解決「瀏覽器睡眠」問題，還是要靠上面的 visibilitychange
    flowType: 'pkce',
    // 增加更詳細的調試信息
    debug: import.meta.env.DEV, // 開發環境下啟用 debug
  },
});