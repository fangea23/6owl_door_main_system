// expense_reimbursement_system/src/supabaseClient.js

import { supabase as mainClient } from '../../../lib/supabase';

// 員工代墊款系統的表都在 public schema
const EXPENSE_TABLES = [
  'expense_reimbursement_requests',
  'expense_reimbursement_items',
  'expense_approvals',
  'expense_requests_with_details'
];

// 共用的 public 表（包含銀行資料，已從 payment_approval 遷移到 public）
const PUBLIC_TABLES = [
  'brands',
  'stores',
  'profiles',
  'employees',
  'employees_with_details',
  'departments',
  'banks',
  'bank_branches',
  'store_bank_accounts'
];

export const supabase = {
  // 共用主系統的 Auth, Storage, Channel
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  removeChannel: (channel) => mainClient.removeChannel(channel),

  // ✅ 暴露 schema 方法供跨 schema 查詢使用（如 RBAC）
  schema: (schemaName) => mainClient.schema(schemaName),

  // 針對資料庫查詢，所有表都在 public schema
  from: (table) => {
    // 代墊款相關表和共用表都在 public schema
    return mainClient.from(table);
  },

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
