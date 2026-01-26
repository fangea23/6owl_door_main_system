// payroll_system/src/supabaseClient.js

import { supabase as mainClient } from '../../../lib/supabase';

// payroll schema 的表
const PAYROLL_TABLES = [
  'salary_grades',
  'insurance_brackets',
  'employee_salary_settings',
  'payroll_periods',
  'monthly_attendance_summary',
  'payroll_main',
  'payroll_details'
];

// 共用的 public 表
const PUBLIC_TABLES = [
  'brands',
  'stores',
  'profiles',
  'employees',
  'employees_with_details',
  'departments',
  'positions'
];

// scheduling schema 的表（出勤相關）
const SCHEDULING_TABLES = [
  'attendance_records',
  'leave_requests',
  'overtime_requests',
  'leave_balances'
];

export const supabase = {
  // 共用主系統的 Auth, Storage, Channel
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  removeChannel: (channel) => mainClient.removeChannel(channel),

  // 針對資料庫查詢，根據表名決定 schema
  from: (table) => {
    if (PAYROLL_TABLES.includes(table)) {
      // payroll schema
      return mainClient.schema('payroll').from(table);
    } else if (SCHEDULING_TABLES.includes(table)) {
      // scheduling schema
      return mainClient.schema('scheduling').from(table);
    } else {
      // public schema (employees, stores, etc.)
      return mainClient.from(table);
    }
  },

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
