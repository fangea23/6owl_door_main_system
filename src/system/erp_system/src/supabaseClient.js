/**
 * ERP 系統 Supabase Client
 * 所有資料表都在 public schema
 */
import { supabase as mainClient } from '../../../lib/supabase';

// ERP 系統使用的表都在 public schema
const PUBLIC_TABLES = [
  // 共用資料
  'brands', 'stores', 'profiles', 'employees', 'departments',
  'banks', 'bank_branches',
  // ERP 品號管理
  'erp_product_categories',
  'erp_products',
  'erp_product_requests',
  'erp_product_request_items',
  'erp_product_request_approvals',
  // ERP 供應商管理
  'erp_suppliers',
  'erp_supplier_brands',
  'erp_supplier_requests',
  'erp_supplier_request_approvals',
];

export const supabase = {
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  removeChannel: (channel) => mainClient.removeChannel(channel),
  schema: (schemaName) => mainClient.schema(schemaName),
  from: (table) => mainClient.from(table),
  rpc: (fn, args) => mainClient.rpc(fn, args),
  functions: mainClient.functions,
};

export default supabase;
