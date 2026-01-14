// 統一使用主系統的 Supabase client（避免多個客戶端實例）
import { supabase as mainClient } from '../../../../lib/supabase';

// 建立包裝物件，共用主系統的認證，但查詢特定的 Schema
export const supabase = {
  // 共用主系統的 Auth, Storage, Channel (實現 SSO)
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),

  // 針對資料庫查詢，指定 'car_rental' schema
  from: (table) => mainClient.schema('car_rental').from(table),

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
