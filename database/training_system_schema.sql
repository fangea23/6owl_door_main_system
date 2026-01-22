-- =============================================
-- 員工教育訓練系統 Database Schema
-- Training System for 六扇門主系統
--
-- 架構說明：
-- - 總部端：課程管理、內容編輯、報表查看
-- - 門市端：課程學習、測驗作答
-- - 支援多品牌：六扇門、粥大福 有不同訓練內容
-- =============================================

-- 課程分類
CREATE TABLE IF NOT EXISTS training_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,           -- 分類名稱（如：食品安全、服務禮儀、系統操作）
  description TEXT,
  icon VARCHAR(50),                      -- 圖示名稱
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 訓練課程
CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES training_categories(id),

  -- 基本資訊
  title VARCHAR(255) NOT NULL,           -- 課程標題
  description TEXT,                      -- 課程說明
  cover_image_url TEXT,                  -- 封面圖片
  duration_minutes INT,                  -- 預估時長（分鐘）
  difficulty_level VARCHAR(20) DEFAULT 'beginner', -- beginner, intermediate, advanced

  -- 品牌與對象設定（重要！）
  brand_id UUID REFERENCES brands(id),   -- 所屬品牌（NULL = 通用/總部課程）
  is_mandatory BOOLEAN DEFAULT false,    -- 是否為必修
  target_audience VARCHAR(20) DEFAULT 'all', -- all, headquarters, store
  target_roles TEXT[],                   -- 適用角色（如：['staff', 'manager', 'store_manager']）
  target_departments UUID[],             -- 適用部門（總部用）
  target_positions TEXT[],               -- 適用職位（如：['外場', '內場', '店長']）

  -- 測驗設定
  has_quiz BOOLEAN DEFAULT true,         -- 是否有測驗
  passing_score INT DEFAULT 80,          -- 測驗及格分數
  max_attempts INT DEFAULT 3,            -- 最多測驗次數（0=無限）

  -- 發布狀態
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,

  -- 追蹤
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 課程章節/單元
CREATE TABLE IF NOT EXISTS training_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES training_courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,                          -- 內容（Markdown 或 HTML）
  content_type VARCHAR(20) DEFAULT 'text', -- text, video, pdf, image
  media_url TEXT,                        -- 影片/PDF/圖片 URL
  sort_order INT DEFAULT 0,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 測驗題目
CREATE TABLE IF NOT EXISTS training_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES training_courses(id) ON DELETE CASCADE,
  question_type VARCHAR(20) DEFAULT 'single_choice', -- single_choice, multiple_choice, true_false
  question_text TEXT NOT NULL,
  options JSONB,                         -- 選項 [{"id": "A", "text": "選項A"}, ...]
  correct_answer JSONB,                  -- 正確答案 ["A"] 或 ["A", "C"]
  explanation TEXT,                      -- 答案解釋
  points INT DEFAULT 1,                  -- 分數
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 員工課程進度
CREATE TABLE IF NOT EXISTS training_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES training_courses(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_started', -- not_started, in_progress, completed, failed
  progress_percent INT DEFAULT 0,        -- 進度百分比
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- 章節完成紀錄
CREATE TABLE IF NOT EXISTS training_lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES training_enrollments(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES training_lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT DEFAULT 0,      -- 花費時間
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);

-- 測驗記錄
CREATE TABLE IF NOT EXISTS training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES training_enrollments(id) ON DELETE CASCADE,
  attempt_number INT DEFAULT 1,
  score INT,                             -- 得分
  total_points INT,                      -- 總分
  percentage DECIMAL(5,2),               -- 百分比
  is_passed BOOLEAN DEFAULT false,
  answers JSONB,                         -- 作答記錄 {"question_id": "answer", ...}
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 新人訓練 Checklist（門市用）
-- =============================================

-- Checklist 模板
CREATE TABLE IF NOT EXISTS training_onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,            -- 模板名稱（如：六扇門外場新人訓練）
  description TEXT,
  brand_id UUID REFERENCES brands(id),   -- 所屬品牌
  target_positions TEXT[],               -- 適用職位
  total_days INT DEFAULT 7,              -- 訓練總天數
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist 項目
CREATE TABLE IF NOT EXISTS training_onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES training_onboarding_templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  day_number INT DEFAULT 1,              -- 第幾天
  requires_sign_off BOOLEAN DEFAULT false, -- 是否需要主管簽核
  linked_course_id UUID REFERENCES training_courses(id), -- 關聯課程
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 員工 Onboarding 進度
CREATE TABLE IF NOT EXISTS training_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  template_id UUID REFERENCES training_onboarding_templates(id),
  item_id UUID REFERENCES training_onboarding_items(id),
  store_id UUID REFERENCES stores(id),   -- 所屬門市
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  signed_off_by UUID REFERENCES auth.users(id), -- 簽核主管
  signed_off_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- =============================================
-- 統計用視圖（總部報表用）
-- =============================================

-- 各門市訓練完成率
CREATE OR REPLACE VIEW training_store_stats AS
SELECT
  s.id AS store_id,
  s.name AS store_name,
  b.name AS brand_name,
  COUNT(DISTINCT e.user_id) AS total_employees,
  COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.user_id END) AS completed_employees,
  ROUND(
    COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.user_id END)::DECIMAL /
    NULLIF(COUNT(DISTINCT e.user_id), 0) * 100,
    1
  ) AS completion_rate
FROM stores s
JOIN brands b ON s.brand_id = b.id
LEFT JOIN employees e ON e.store_id = s.id
LEFT JOIN training_enrollments te ON te.user_id = e.user_id
GROUP BY s.id, s.name, b.name;

-- 課程完成統計
CREATE OR REPLACE VIEW training_course_stats AS
SELECT
  c.id AS course_id,
  c.title,
  c.brand_id,
  b.name AS brand_name,
  COUNT(DISTINCT te.user_id) AS enrolled_count,
  COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.user_id END) AS completed_count,
  AVG(CASE WHEN qa.is_passed THEN qa.percentage END) AS avg_score
FROM training_courses c
LEFT JOIN brands b ON c.brand_id = b.id
LEFT JOIN training_enrollments te ON te.course_id = c.id
LEFT JOIN training_quiz_attempts qa ON qa.enrollment_id = te.id
WHERE c.is_published = true
GROUP BY c.id, c.title, c.brand_id, b.name;

-- =============================================
-- 索引
-- =============================================
CREATE INDEX IF NOT EXISTS idx_training_courses_category ON training_courses(category_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_brand ON training_courses(brand_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_published ON training_courses(is_published);
CREATE INDEX IF NOT EXISTS idx_training_courses_audience ON training_courses(target_audience);
CREATE INDEX IF NOT EXISTS idx_training_lessons_course ON training_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_training_questions_course ON training_questions(course_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_user ON training_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_course ON training_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_training_enrollments_status ON training_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_training_quiz_attempts_enrollment ON training_quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_training_onboarding_templates_brand ON training_onboarding_templates(brand_id);

-- =============================================
-- 預設分類資料
-- =============================================
INSERT INTO training_categories (name, description, icon, sort_order) VALUES
  ('食品安全', '食品衛生、食材處理、過敏原管理', 'ShieldCheck', 1),
  ('服務禮儀', '顧客服務、應對技巧、投訴處理', 'Heart', 2),
  ('門店營運', '開店流程、打烊流程、設備操作', 'Store', 3),
  ('系統操作', 'POS系統、訂位系統、內部系統', 'Monitor', 4),
  ('產品知識', '湯底介紹、食材特色、搭配建議', 'Utensils', 5),
  ('管理技能', '人員管理、排班技巧、績效考核', 'Users', 6)
ON CONFLICT DO NOTHING;

-- =============================================
-- RLS 政策
-- =============================================
ALTER TABLE training_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_onboarding_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- 課程分類：所有登入用戶可查看
CREATE POLICY "Anyone can view active categories" ON training_categories
  FOR SELECT USING (is_active = true);

-- 課程：已發布的課程，根據品牌和對象過濾
CREATE POLICY "Users can view published courses for their brand" ON training_courses
  FOR SELECT USING (
    is_published = true
    AND (
      brand_id IS NULL  -- 通用課程
      OR brand_id IN (
        SELECT e.brand_id FROM employees e WHERE e.user_id = auth.uid()
      )
    )
  );

-- 章節：已發布課程的章節可看
CREATE POLICY "Anyone can view lessons of published courses" ON training_lessons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM training_courses WHERE id = course_id AND is_published = true)
  );

-- 測驗題目
CREATE POLICY "Quiz questions access" ON training_questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM training_courses WHERE id = course_id AND is_published = true)
  );

-- 學習進度：只能看自己的
CREATE POLICY "Users can view own enrollments" ON training_enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own enrollments" ON training_enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own enrollments" ON training_enrollments
  FOR UPDATE USING (user_id = auth.uid());

-- 章節進度
CREATE POLICY "Users can manage own lesson progress" ON training_lesson_progress
  FOR ALL USING (
    EXISTS (SELECT 1 FROM training_enrollments WHERE id = enrollment_id AND user_id = auth.uid())
  );

-- 測驗紀錄
CREATE POLICY "Users can manage own quiz attempts" ON training_quiz_attempts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM training_enrollments WHERE id = enrollment_id AND user_id = auth.uid())
  );

-- Onboarding 模板：根據品牌
CREATE POLICY "View onboarding templates" ON training_onboarding_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "View onboarding items" ON training_onboarding_items
  FOR SELECT USING (true);

-- Onboarding 進度
CREATE POLICY "Users can view own onboarding progress" ON training_onboarding_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding progress" ON training_onboarding_progress
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- RBAC 權限（需加入 rbac.permissions）
-- =============================================
-- INSERT INTO rbac.permissions (code, name, description, category) VALUES
-- ('training.view', '查看訓練課程', '查看已發布的訓練課程', 'training'),
-- ('training.enroll', '參加訓練', '報名參加訓練課程', 'training'),
-- ('training.manage.courses', '管理課程', '建立、編輯、刪除課程（總部）', 'training'),
-- ('training.manage.content', '編輯內容', '編輯課程內容和測驗（總部）', 'training'),
-- ('training.view.reports', '查看報表', '查看訓練統計報表（總部）', 'training'),
-- ('training.manage.onboarding', '管理新人訓練', '建立和編輯新人訓練模板', 'training'),
-- ('training.sign_off', '簽核訓練', '簽核員工訓練完成（門市主管）', 'training')
-- ON CONFLICT (code) DO NOTHING;
