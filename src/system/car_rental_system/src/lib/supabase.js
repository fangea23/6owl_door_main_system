// 統一使用主系統的 Supabase client（避免多個客戶端實例）
import { supabase as mainClient } from '../../../../lib/supabase';

// 建立包裝物件，共用主系統的認證，但查詢特定的 Schema
export const supabase = {
  // 共用主系統的 Auth, Storage, Channel (實現 SSO)
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),

  // 針對資料庫查詢，根據表格自動選擇 schema
  from: (table) => {
    // employees 和 departments 使用統一的 public schema
    if (table === 'employees' || table === 'departments') {
      return mainClient.from(table); // public schema
    }
    // 其他表格使用 car_rental schema
    return mainClient.schema('car_rental').from(table);
  },

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
