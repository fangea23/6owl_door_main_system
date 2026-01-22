// expense_reimbursement_system/src/supabaseClient.js

import { supabase as mainClient } from '../../../lib/supabase';

// 員工代墊款系統的表都在 public schema
const EXPENSE_TABLES = [
  'expense_reimbursement_requests',
  'expense_reimbursement_items',
  'expense_approvals',
  'expense_requests_with_details'
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

// payment_approval schema 的表（銀行資料）
const PAYMENT_APPROVAL_TABLES = [
  'banks',
  'branches'
];

export const supabase = {
  // 共用主系統的 Auth, Storage, Channel
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  removeChannel: (channel) => mainClient.removeChannel(channel),

  // 針對資料庫查詢，根據表名決定 schema
  from: (table) => {
    if (PAYMENT_APPROVAL_TABLES.includes(table)) {
      // banks 和 branches 在 payment_approval schema
      return mainClient.schema('payment_approval').from(table);
    } else {
      // 其他表在 public schema
      return mainClient.from(table);
    }
  },

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
