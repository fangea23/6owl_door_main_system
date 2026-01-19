// payment_system/src/supabaseClient.js

import { supabase as mainClient } from '../../../lib/supabase';

// brands 和 stores 已遷移到 public schema
const PUBLIC_TABLES = ['brands', 'stores','profiles','employees','employees_with_details'];

export const supabase = {
  // 共用主系統的 Auth, Storage, Channel
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),

  // ✅ 新增這行：將 removeChannel 對應回主客戶端
  removeChannel: (channel) => mainClient.removeChannel(channel),

  // 針對資料庫查詢，指定 Schema
  // brands 和 stores 使用 public schema，其他表使用 payment_approval schema
  from: (table) => {
    if (PUBLIC_TABLES.includes(table)) {
      // brands 和 stores 在 public schema
      return mainClient.from(table);
    } else {
      // 其他表在 payment_approval schema
      return mainClient.schema('payment_approval').from(table);
    }
  },

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};