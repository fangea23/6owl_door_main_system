// Store Management System - Supabase Client
// 使用 public schema 下的 brands 和 stores 表

import { supabase as mainClient } from '../../../lib/supabase';

export const supabase = {
  auth: mainClient.auth,
  storage: mainClient.storage,

  // brands 和 stores 表已遷移到 public schema
  // 直接使用主客戶端，不需要指定 schema（默認就是 public）
  from: (table) => mainClient.from(table),

  rpc: (fn, args) => mainClient.rpc(fn, args),
  removeChannel: (channel) => mainClient.removeChannel(channel),
  channel: (name) => mainClient.channel(name),
};
