-- =============================================
-- 員工教育訓練系統 Database Schema
-- Training System for 六扇門主系統
--
-- Schema: training
-- 架構說明：
-- - 總部端：課程管理、內容編輯、報表查看
-- - 門市端：課程學習、測驗作答
-- - 支援多品牌：六扇門、粥大福 有不同訓練內容
-- =============================================

-- 建立 training schema
CREATE SCHEMA IF NOT EXISTS training;

-- 授權
GRANT USAGE ON SCHEMA training TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA training TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA training TO authenticated;

-- 設定預設權限（未來新建的表也會有權限）
ALTER DEFAULT PRIVILEGES IN SCHEMA training GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA training GRANT ALL ON SEQUENCES TO authenticated;

-- =============================================
-- 核心資料表
-- =============================================

-- 課程分類
CREATE TABLE IF NOT EXISTS training.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 訓練課程
CREATE TABLE IF NOT EXISTS training.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES training.categories(id),

  -- 基本資訊
  title VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  duration_minutes INT,
  difficulty_level VARCHAR(20) DEFAULT 'beginner',

  -- 品牌與對象設定（使用 BIGINT code 連結）
  brand_id BIGINT,  -- 品牌代碼，對應 brands.code 的整數值 (1-89 品牌, 90-99 供應商)
  is_mandatory BOOLEAN DEFAULT false,
  target_audience VARCHAR(20) DEFAULT 'all',
  target_roles TEXT[],
  target_departments BIGINT[],  -- 部門代碼陣列
  target_positions TEXT[],

  -- 測驗設定
  has_quiz BOOLEAN DEFAULT true,
  passing_score INT DEFAULT 80,
  max_attempts INT DEFAULT 3,

  -- 發布狀態
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,

  -- 追蹤
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 課程章節/單元
CREATE TABLE IF NOT EXISTS training.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES training.courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  content_type VARCHAR(20) DEFAULT 'text',
  media_url TEXT,
  sort_order INT DEFAULT 0,
  duration_minutes INT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 測驗題目
CREATE TABLE IF NOT EXISTS training.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES training.courses(id) ON DELETE CASCADE,
  question_type VARCHAR(20) DEFAULT 'single_choice',
  question_text TEXT NOT NULL,
  options JSONB,
  correct_answer JSONB,
  explanation TEXT,
  points INT DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 員工課程進度
CREATE TABLE IF NOT EXISTS training.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES training.courses(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'not_started',
  progress_percent INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, course_id)
);

-- 章節完成紀錄
CREATE TABLE IF NOT EXISTS training.lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES training.enrollments(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES training.lessons(id) ON DELETE CASCADE,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  time_spent_seconds INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(enrollment_id, lesson_id)
);

-- 測驗記錄
CREATE TABLE IF NOT EXISTS training.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id UUID REFERENCES training.enrollments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  course_id UUID REFERENCES training.courses(id) ON DELETE CASCADE,
  attempt_number INT DEFAULT 1,
  score INT,
  total_points INT,
  percentage DECIMAL(5,2),
  is_passed BOOLEAN DEFAULT false,
  answers JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  time_spent_seconds INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 新人訓練 Checklist（門市用）
-- =============================================

-- Checklist 模板
CREATE TABLE IF NOT EXISTS training.onboarding_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  brand_id BIGINT,  -- 品牌代碼，對應 brands.code 的整數值
  target_positions TEXT[],
  total_days INT DEFAULT 7,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist 項目
CREATE TABLE IF NOT EXISTS training.onboarding_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES training.onboarding_templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  day_number INT DEFAULT 1,
  requires_sign_off BOOLEAN DEFAULT false,
  linked_course_id UUID REFERENCES training.courses(id),
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 員工 Onboarding 進度
CREATE TABLE IF NOT EXISTS training.onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  template_id UUID REFERENCES training.onboarding_templates(id),
  item_id UUID REFERENCES training.onboarding_items(id),
  store_id BIGINT,  -- 門市代碼，對應 stores.code 的整數值 (格式 BBSSS)
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  signed_off_by UUID REFERENCES auth.users(id),
  signed_off_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

-- =============================================
-- 統計用視圖
-- =============================================

-- 各門市訓練完成率
CREATE OR REPLACE VIEW training.store_stats AS
SELECT
  s.code::BIGINT AS store_id,
  s.name AS store_name,
  b.name AS brand_name,
  b.code::BIGINT AS brand_code,
  COUNT(DISTINCT e.user_id) AS total_employees,
  COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.user_id END) AS completed_employees,
  ROUND(
    COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.user_id END)::DECIMAL /
    NULLIF(COUNT(DISTINCT e.user_id), 0) * 100,
    1
  ) AS completion_rate
FROM public.stores s
JOIN public.brands b ON s.brand_id = b.id
LEFT JOIN public.employees e ON e.store_id = s.code::BIGINT
LEFT JOIN training.enrollments te ON te.user_id = e.user_id
GROUP BY s.code, s.name, b.name, b.code;

-- 課程完成統計
CREATE OR REPLACE VIEW training.course_stats AS
SELECT
  c.id AS course_id,
  c.title,
  c.brand_id AS brand_code,
  b.name AS brand_name,
  COUNT(DISTINCT te.user_id) AS enrolled_count,
  COUNT(DISTINCT CASE WHEN te.status = 'completed' THEN te.user_id END) AS completed_count,
  AVG(CASE WHEN qa.is_passed THEN qa.percentage END) AS avg_score
FROM training.courses c
LEFT JOIN public.brands b ON c.brand_id = b.code::BIGINT
LEFT JOIN training.enrollments te ON te.course_id = c.id
LEFT JOIN training.quiz_attempts qa ON qa.enrollment_id = te.id
WHERE c.is_published = true
GROUP BY c.id, c.title, c.brand_id, b.name;

-- =============================================
-- 索引
-- =============================================
CREATE INDEX IF NOT EXISTS idx_courses_category ON training.courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_brand ON training.courses(brand_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON training.courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_audience ON training.courses(target_audience);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON training.lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_course ON training.questions(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON training.enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON training.enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON training.enrollments(status);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_enrollment ON training.quiz_attempts(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON training.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_course ON training.quiz_attempts(course_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_templates_brand ON training.onboarding_templates(brand_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_progress_store ON training.onboarding_progress(store_id);

-- =============================================
-- 預設分類資料
-- =============================================
INSERT INTO training.categories (name, description, icon, sort_order) VALUES
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
ALTER TABLE training.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.onboarding_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE training.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 用戶端 RLS 政策
-- =============================================

-- 課程分類：所有登入用戶可查看
CREATE POLICY "Anyone can view active categories" ON training.categories
  FOR SELECT USING (is_active = true);

-- 課程：已發布的課程，根據品牌過濾
CREATE POLICY "Users can view published courses for their brand" ON training.courses
  FOR SELECT USING (
    is_published = true
    AND (
      brand_id IS NULL
      OR brand_id IN (
        SELECT e.brand_id FROM public.employees e WHERE e.user_id = auth.uid()
      )
    )
  );

-- 章節：已發布課程的章節可看
CREATE POLICY "Anyone can view lessons of published courses" ON training.lessons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM training.courses WHERE id = course_id AND is_published = true)
  );

-- 測驗題目
CREATE POLICY "Quiz questions access" ON training.questions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM training.courses WHERE id = course_id AND is_published = true)
  );

-- 學習進度：只能看自己的
CREATE POLICY "Users can view own enrollments" ON training.enrollments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own enrollments" ON training.enrollments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own enrollments" ON training.enrollments
  FOR UPDATE USING (user_id = auth.uid());

-- 章節進度
CREATE POLICY "Users can manage own lesson progress" ON training.lesson_progress
  FOR ALL USING (
    EXISTS (SELECT 1 FROM training.enrollments WHERE id = enrollment_id AND user_id = auth.uid())
  );

-- 測驗紀錄
CREATE POLICY "Users can manage own quiz attempts" ON training.quiz_attempts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM training.enrollments WHERE id = enrollment_id AND user_id = auth.uid())
  );

-- Onboarding 模板
CREATE POLICY "View onboarding templates" ON training.onboarding_templates
  FOR SELECT USING (is_active = true);

CREATE POLICY "View onboarding items" ON training.onboarding_items
  FOR SELECT USING (true);

-- Onboarding 進度
CREATE POLICY "Users can view own onboarding progress" ON training.onboarding_progress
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding progress" ON training.onboarding_progress
  FOR UPDATE USING (user_id = auth.uid());

-- =============================================
-- 管理員 RLS 政策（使用現有 RBAC 系統）
-- =============================================

-- 管理員可以查看所有課程（包含未發布的）
CREATE POLICY "Admins can view all courses" ON training.courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.manage.courses'
    )
  );

-- 管理員可以新增課程
CREATE POLICY "Admins can insert courses" ON training.courses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.manage.courses'
    )
  );

-- 管理員可以更新課程
CREATE POLICY "Admins can update courses" ON training.courses
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.manage.courses'
    )
  );

-- 管理員可以刪除課程
CREATE POLICY "Admins can delete courses" ON training.courses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.manage.courses'
    )
  );

-- 管理員可以管理課程章節
CREATE POLICY "Admins can manage lessons" ON training.lessons
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.manage.courses'
    )
  );

-- 管理員可以管理測驗題目
CREATE POLICY "Admins can manage questions" ON training.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.manage.courses'
    )
  );

-- 管理員可以管理分類
CREATE POLICY "Admins can manage categories" ON training.categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.manage.courses'
    )
  );

-- 管理員可以查看所有學習進度（報表用）
CREATE POLICY "Admins can view all enrollments" ON training.enrollments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.view.reports'
    )
  );

-- 管理員可以查看所有測驗記錄（報表用）
CREATE POLICY "Admins can view all quiz attempts" ON training.quiz_attempts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.view.reports'
    )
  );

-- 管理員可以查看所有章節進度（報表用）
CREATE POLICY "Admins can view all lesson progress" ON training.lesson_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
      JOIN rbac.permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = auth.uid()
      AND p.code = 'training.view.reports'
    )
  );

-- =============================================
-- RBAC 權限（需加入 rbac.permissions）
-- module 欄位為 NOT NULL，必須指定
-- =============================================
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  ('system.training', '存取教育訓練系統', '可以存取教育訓練系統', 'training', 'system'),
  ('training.view', '查看訓練課程', '查看已發布的訓練課程', 'training', 'training'),
  ('training.enroll', '參加訓練', '報名參加訓練課程', 'training', 'training'),
  ('training.manage.courses', '管理課程', '建立、編輯、刪除課程（總部）', 'training', 'training'),
  ('training.manage.content', '編輯內容', '編輯課程內容和測驗（總部）', 'training', 'training'),
  ('training.view.reports', '查看報表', '查看訓練統計報表（總部）', 'training', 'training'),
  ('training.manage.onboarding', '管理新人訓練', '建立和編輯新人訓練模板', 'training', 'training'),
  ('training.sign_off', '簽核訓練', '簽核員工訓練完成（門市主管）', 'training', 'training')
ON CONFLICT (code) DO NOTHING;
