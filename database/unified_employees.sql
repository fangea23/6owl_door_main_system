-- ============================================================================
-- 統一員工管理系統 - Public Schema
-- ============================================================================
-- 此 SQL 在 public schema 建立統一的員工和部門表
-- 所有子系統（License、Car Rental、Payment）都將使用這些表
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- 表格 1: departments (部門表)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 部門資訊
  name VARCHAR(100) NOT NULL UNIQUE,              -- 部門名稱
  code VARCHAR(20) UNIQUE,                        -- 部門代碼
  description TEXT,                               -- 部門描述

  -- 主管資訊
  manager_id UUID,                                -- 部門主管（外鍵待建立）
  parent_department_id UUID REFERENCES public.departments(id),  -- 上級部門

  -- 聯絡資訊
  email VARCHAR(255),                             -- 部門信箱
  phone VARCHAR(50),                              -- 部門電話
  location VARCHAR(200),                          -- 辦公地點

  -- 狀態
  is_active BOOLEAN DEFAULT true,                 -- 是否啟用

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 軟刪除
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_departments_parent ON public.departments(parent_department_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 表格 2: employees (員工表)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯認證系統
  user_id UUID UNIQUE REFERENCES auth.users(id),  -- 關聯 Supabase Auth（可選）

  -- 基本資訊
  employee_id VARCHAR(50) UNIQUE NOT NULL,        -- 員工編號（如 EMP001）
  name VARCHAR(100) NOT NULL,                     -- 姓名
  name_en VARCHAR(100),                           -- 英文姓名

  -- 聯絡資訊
  email VARCHAR(255) UNIQUE,                      -- 電子郵件
  phone VARCHAR(50),                              -- 電話
  mobile VARCHAR(50),                             -- 手機
  extension VARCHAR(20),                          -- 分機

  -- 組織資訊
  department_id UUID REFERENCES public.departments(id),  -- 部門
  position VARCHAR(100),                          -- 職位
  job_title VARCHAR(100),                         -- 職稱
  employee_type VARCHAR(50) DEFAULT 'full-time',  -- 員工類型（full-time, part-time, contractor）
  level VARCHAR(50),                              -- 職級

  -- 主管資訊
  supervisor_id UUID REFERENCES public.employees(id),  -- 直屬主管

  -- 日期資訊
  hire_date DATE,                                 -- 到職日期
  contract_start_date DATE,                       -- 合約開始日期
  contract_end_date DATE,                         -- 合約結束日期
  probation_end_date DATE,                        -- 試用期結束日期
  resignation_date DATE,                          -- 離職日期

  -- 辦公資訊
  office_location VARCHAR(200),                   -- 辦公地點
  work_location VARCHAR(200),                     -- 工作地點
  seat_number VARCHAR(50),                        -- 座位號

  -- 身份資訊
  id_number VARCHAR(50),                          -- 身分證字號（加密存儲）
  passport_number VARCHAR(50),                    -- 護照號碼
  birth_date DATE,                                -- 出生日期
  gender VARCHAR(20),                             -- 性別
  nationality VARCHAR(50),                        -- 國籍

  -- 緊急聯絡人
  emergency_contact_name VARCHAR(100),            -- 緊急聯絡人姓名
  emergency_contact_phone VARCHAR(50),            -- 緊急聯絡人電話
  emergency_contact_relationship VARCHAR(50),     -- 關係

  -- 銀行資訊（薪資用）
  bank_name VARCHAR(100),                         -- 銀行名稱
  bank_account VARCHAR(100),                      -- 銀行帳號

  -- 狀態
  status VARCHAR(50) DEFAULT 'active',            -- active, on_leave, resigned, terminated
  is_active BOOLEAN DEFAULT true,                 -- 是否啟用

  -- 權限相關
  role VARCHAR(50) DEFAULT 'user',                -- user, admin, manager, hr
  permissions JSONB DEFAULT '[]'::jsonb,          -- 額外權限

  -- 備註
  notes TEXT,                                     -- 備註

  -- 頭像
  avatar_url TEXT,                                -- 頭像 URL

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 軟刪除
  deleted_at TIMESTAMP WITH TIME ZONE,

  -- 檢查約束
  CONSTRAINT employees_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT employees_status_check CHECK (status IN ('active', 'on_leave', 'resigned', 'terminated'))
);

-- 建立 manager_id 外鍵（部門表）
ALTER TABLE public.departments
  ADD CONSTRAINT fk_departments_manager
  FOREIGN KEY (manager_id) REFERENCES public.employees(id);

-- 索引
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_supervisor ON public.employees(supervisor_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_name ON public.employees(name) WHERE deleted_at IS NULL;

-- ============================================================================
-- 觸發器：自動更新 updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) 設定
-- ============================================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- 部門政策：所有已登入用戶可讀取啟用的部門
CREATE POLICY "Anyone can view active departments"
  ON public.departments FOR SELECT
  USING (auth.uid() IS NOT NULL AND is_active = true AND deleted_at IS NULL);

-- 部門政策：HR 和管理員可完全管理部門
CREATE POLICY "HR and admins can manage departments"
  ON public.departments FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.employees
      WHERE role IN ('admin', 'hr') AND deleted_at IS NULL
    )
  );

-- 員工政策：所有已登入用戶可讀取在職員工基本資訊
CREATE POLICY "Anyone can view active employees basic info"
  ON public.employees FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND deleted_at IS NULL
    AND status IN ('active', 'on_leave')
  );

-- 員工政策：用戶可查看和更新自己的資料
CREATE POLICY "Users can view and update own employee record"
  ON public.employees FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 員工政策：HR 和管理員可完全管理員工
CREATE POLICY "HR and admins can manage employees"
  ON public.employees FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.employees
      WHERE role IN ('admin', 'hr') AND deleted_at IS NULL
    )
  );

-- 員工政策：主管可查看其下屬的資料
CREATE POLICY "Supervisors can view their subordinates"
  ON public.employees FOR SELECT
  USING (
    supervisor_id IN (
      SELECT id FROM public.employees
      WHERE user_id = auth.uid() AND deleted_at IS NULL
    )
  );

-- ============================================================================
-- View: 員工完整資訊（含部門和主管）
-- ============================================================================
CREATE OR REPLACE VIEW public.employees_with_details AS
SELECT
  e.*,
  d.name as department_name,
  d.code as department_code,
  s.name as supervisor_name,
  s.employee_id as supervisor_employee_id
FROM public.employees e
LEFT JOIN public.departments d ON e.department_id = d.id AND d.deleted_at IS NULL
LEFT JOIN public.employees s ON e.supervisor_id = s.id AND s.deleted_at IS NULL
WHERE e.deleted_at IS NULL;

-- ============================================================================
-- 示範資料
-- ============================================================================
-- 插入部門
INSERT INTO public.departments (name, code, is_active) VALUES
  ('資訊技術部', 'IT', true),
  ('人力資源部', 'HR', true),
  ('財務部', 'FIN', true),
  ('業務部', 'SALES', true),
  ('行政部', 'ADMIN', true),
  ('研發部', 'RD', true)
ON CONFLICT (name) DO NOTHING;

-- 插入範例員工（需要在實際使用時根據 auth.users 調整）
-- 注意：這裡的 user_id 需要從 auth.users 表中獲取實際的 UUID
INSERT INTO public.employees (
  employee_id, name, email, department_id, position, status, role, hire_date
)
SELECT
  'EMP001', '系統管理員', 'admin@company.com',
  d.id, '系統管理員', 'active', 'admin', CURRENT_DATE
FROM public.departments d WHERE d.code = 'IT'
ON CONFLICT (employee_id) DO NOTHING;

-- ============================================================================
-- 實用函數：根據 email 獲取員工資訊
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_employee_by_email(p_email VARCHAR)
RETURNS TABLE (
  id UUID,
  employee_id VARCHAR,
  name VARCHAR,
  email VARCHAR,
  department_name VARCHAR,
  position VARCHAR,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.employee_id,
    e.name,
    e.email,
    d.name as department_name,
    e.position,
    e.status
  FROM public.employees e
  LEFT JOIN public.departments d ON e.department_id = d.id
  WHERE e.email = p_email
    AND e.deleted_at IS NULL
    AND e.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 實用函數：根據 user_id 獲取員工資訊
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_employee_by_user_id(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  employee_id VARCHAR,
  name VARCHAR,
  email VARCHAR,
  department_id UUID,
  department_name VARCHAR,
  position VARCHAR,
  role VARCHAR,
  status VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.employee_id,
    e.name,
    e.email,
    e.department_id,
    d.name as department_name,
    e.position,
    e.role,
    e.status
  FROM public.employees e
  LEFT JOIN public.departments d ON e.department_id = d.id
  WHERE e.user_id = p_user_id
    AND e.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 完成！
-- ============================================================================
COMMENT ON TABLE public.departments IS '統一部門表 - 所有系統共用';
COMMENT ON TABLE public.employees IS '統一員工表 - 所有系統共用';
COMMENT ON VIEW public.employees_with_details IS '員工完整資訊視圖 - 含部門和主管';
