// Store Management System - Supabase Client
// 使用 payment_approval schema 下的 brands 和 stores 表

import { supabase as mainClient } from '../../../lib/supabase';

export const supabase = {
  auth: mainClient.auth,
  storage: mainClient.storage,

  // 使用 payment_approval schema
  from: (table) => mainClient.schema('payment_approval').from(table),

  rpc: (fn, args) => mainClient.rpc(fn, args),
  removeChannel: (channel) => mainClient.removeChannel(channel),
  channel: (name) => mainClient.channel(name),
};
