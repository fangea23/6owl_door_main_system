// 統一使用主系統的 Supabase client
import { supabase as mainClient } from '../../../lib/supabase';

// 🛑 定義白名單：這些表格位於 public schema，不應該加上 meeting_system 前綴
const PUBLIC_SCHEMA_TABLES = [
  'employees', 
  // 'profiles', // 如果之後需要查 profiles 也可以加進來
  // 'departments' // 如果需要查部門也可以加
];

// 建立包裝物件
export const supabase = {
  // 共用主系統的 Auth, Storage, Channel
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),

  // 🔄 修改後的資料庫查詢邏輯
  from: (table) => {
    // 檢查是否為白名單表格 (例如 employees)
    if (PUBLIC_SCHEMA_TABLES.includes(table)) {
      // 查詢 public schema (預設)
      return mainClient.from(table);
    }
    
    // 其他表格查詢 meeting_system schema
    return mainClient.schema('meeting_system').from(table);
  },

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};