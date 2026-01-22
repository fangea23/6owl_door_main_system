// expense_reimbursement_system/src/supabaseClient.js

import { supabase as mainClient } from '../../../lib/supabase';

// 員工代墊款系統的表都在 public schema
const EXPENSE_TABLES = [
  'expense_reimbursement_requests',
  'expense_reimbursement_items',
  'expense_approvals'
];

// 共用的 public 表
const PUBLIC_TABLES = [
  'brands',
  'stores',
  'profiles',
  'employees',
  'employees_with_details',
  'departments'
];

export const supabase = {
  // 共用主系統的 Auth, Storage, Channel
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  removeChannel: (channel) => mainClient.removeChannel(channel),

  // 針對資料庫查詢，所有表都使用 public schema
  from: (table) => {
    return mainClient.from(table);
  },

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
