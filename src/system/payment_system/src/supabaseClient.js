// payment_system/src/supabaseClient.js

import { supabase as mainClient } from '../../../lib/supabase';

export const supabase = {
  // 共用主系統的 Auth, Storage, Channel
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  
  // ✅ 新增這行：將 removeChannel 對應回主客戶端
  removeChannel: (channel) => mainClient.removeChannel(channel),

  // 針對資料庫查詢，指定 Schema
  from: (table) => mainClient.schema('payment_approval').from(table),

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};