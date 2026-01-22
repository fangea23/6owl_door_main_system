// training_system/src/supabaseClient.js

import { supabase as mainClient } from '../../../lib/supabase';

// 訓練系統的表都在 public schema
const TRAINING_TABLES = [
  'training_categories',
  'training_courses',
  'training_lessons',
  'training_questions',
  'training_enrollments',
  'training_lesson_progress',
  'training_quiz_attempts',
  'training_onboarding_templates',
  'training_onboarding_items',
  'training_onboarding_progress'
];

// 共用的 public 表
const PUBLIC_TABLES = [
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

  // 針對資料庫查詢
  from: (table) => {
    return mainClient.from(table);
  },

  // RPC 呼叫
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
