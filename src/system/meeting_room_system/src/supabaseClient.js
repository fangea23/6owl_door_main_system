import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// 修改這裡：加入 db 設定
export const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'meeting_system', // 指定預設 Schema
  },
});