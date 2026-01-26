// training_system/src/supabaseClient.js

import { supabase as mainClient } from '../../../lib/supabase';

// 訓練系統的表在 training schema
// 表名已改為無前綴（schema.table 格式）
const TRAINING_TABLES = [
  'categories',
  'courses',
  'lessons',
  'questions',
  'enrollments',
  'lesson_progress',
  'quiz_attempts',
  'onboarding_templates',
  'onboarding_items',
  'onboarding_progress'
];

// 共用的 public 表
const PUBLIC_TABLES = [
  'profiles',
  'employees',
  'employees_with_details',
  'departments',
  'brands',
  'stores'
];

// 取得 training schema client
const trainingSchema = mainClient.schema('training');

export const supabase = {
  // 共用主系統的 Auth, Storage, Channel
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  removeChannel: (channel) => mainClient.removeChannel(channel),

  // 針對資料庫查詢 - 自動判斷 schema
  from: (table) => {
    // training schema 的表
    if (TRAINING_TABLES.includes(table)) {
      return trainingSchema.from(table);
    }
    // public schema 的表
    return mainClient.from(table);
  },

  // 直接存取 training schema (明確使用)
  training: trainingSchema,

  // 直接存取 public schema (明確使用)
  public: mainClient,

  // RPC 呼叫 (預設 public schema)
  rpc: (fn, args) => mainClient.rpc(fn, args),

  // 指定 schema 的 RPC 呼叫
  schema: (schemaName) => mainClient.schema(schemaName),
};

// 導出便捷方法
export const training = trainingSchema;
export { mainClient as publicClient };
