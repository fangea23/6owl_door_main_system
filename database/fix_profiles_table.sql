-- ============================================================================
-- 修正 Profiles 表與統一員工系統的整合
-- ============================================================================
-- 此腳本確保 profiles 表只包含認證相關資訊
-- 所有員工組織資訊都在 public.employees 表中
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- 1. 清理可能存在的舊政策和約束
-- ============================================================================

-- 移除可能引用 department 欄位的舊政策
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'profiles'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', policy_record.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- 2. 確保 Profiles 表結構正確（僅認證相關欄位）
-- ============================================================================

-- 如果 profiles 表不存在，創建它
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 基本認證資訊
  email VARCHAR(255),
  full_name VARCHAR(100),
  avatar_url TEXT,

  -- 權限相關（用於簡單的認證和授權）
  role VARCHAR(50) DEFAULT 'user',  -- user, admin, hr, etc.

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 如果 avatar_url 欄位不存在，新增它
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT;
    END IF;
END $$;

-- 如果舊的 department 欄位存在，移除它（因為現在在 employees 表中）
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'department'
    ) THEN
        ALTER TABLE public.profiles DROP COLUMN department;
    END IF;
END $$;

-- 如果舊的 department_id 欄位存在，移除它
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'department_id'
    ) THEN
        ALTER TABLE public.profiles DROP COLUMN department_id;
    END IF;
END $$;

-- ============================================================================
-- 3. 建立新的 RLS 政策（僅針對認證資訊）
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 政策：用戶可查看所有已認證用戶的基本資訊
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 政策：用戶可更新自己的 profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 政策：用戶可插入自己的 profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 政策：管理員可管理所有 profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

-- ============================================================================
-- 4. 建立觸發器：自動創建 profile
-- ============================================================================

-- 當新用戶註冊時，自動創建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'user')
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 移除舊的觸發器（如果存在）
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 創建新的觸發器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 5. 更新 updated_at 觸發器
-- ============================================================================

-- 如果還沒有 update_updated_at_column 函數，創建它
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 為 profiles 添加 updated_at 觸發器
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 6. 建立實用 View：合併 profile 和 employee 資訊
-- ============================================================================

CREATE OR REPLACE VIEW public.users_with_employee_info AS
SELECT
  p.id as user_id,
  p.email as user_email,
  p.full_name,
  p.avatar_url,
  p.role as auth_role,
  e.id as employee_id,
  e.employee_id as employee_code,
  e.name as employee_name,
  e.phone,
  e.mobile,
  e.department_id,
  d.name as department_name,
  d.code as department_code,
  e."position",
  e.job_title,
  e.status as employee_status,
  e.role as employee_role,
  p.created_at,
  p.updated_at
FROM public.profiles p
LEFT JOIN public.employees e ON p.id = e.user_id AND e.deleted_at IS NULL
LEFT JOIN public.departments d ON e.department_id = d.id AND d.deleted_at IS NULL;

-- ============================================================================
-- 7. 建立實用函數：獲取用戶完整資訊
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_current_user_info()
RETURNS TABLE (
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  auth_role VARCHAR,
  employee_id UUID,
  employee_code VARCHAR,
  employee_name VARCHAR,
  department_id UUID,
  department_name VARCHAR,
  "position" VARCHAR,
  employee_role VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.user_email as email,
    u.full_name,
    u.auth_role,
    u.employee_id,
    u.employee_code,
    u.employee_name,
    u.department_id,
    u.department_name,
    u."position",
    u.employee_role
  FROM public.users_with_employee_info u
  WHERE u.user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 8. 資料遷移：將現有 profiles 與 employees 關聯
-- ============================================================================

-- 如果 profiles 中有 email，嘗試將其與 employees 關聯
UPDATE public.employees e
SET user_id = p.id
FROM public.profiles p
WHERE e.email = p.email
  AND e.user_id IS NULL
  AND e.deleted_at IS NULL
  AND e.status = 'active';

-- ============================================================================
-- 完成！
-- ============================================================================

COMMENT ON TABLE public.profiles IS '用戶認證資料表 - 僅包含認證相關資訊';
COMMENT ON VIEW public.users_with_employee_info IS '用戶完整資訊視圖 - 合併認證和員工資料';

-- 顯示統計資訊
DO $$
DECLARE
  profile_count INT;
  employee_count INT;
  linked_count INT;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM public.profiles;
  SELECT COUNT(*) INTO employee_count FROM public.employees WHERE deleted_at IS NULL;
  SELECT COUNT(*) INTO linked_count FROM public.employees WHERE user_id IS NOT NULL AND deleted_at IS NULL;

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Profiles 表修正完成！';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Profiles 數量: %', profile_count;
  RAISE NOTICE 'Employees 數量: %', employee_count;
  RAISE NOTICE '已關聯數量: %', linked_count;
  RAISE NOTICE '未關聯數量: %', employee_count - linked_count;
  RAISE NOTICE '===========================================';
  RAISE NOTICE '提示：';
  RAISE NOTICE '1. profiles 表現在只包含認證資訊';
  RAISE NOTICE '2. employees 表包含完整的員工組織資訊';
  RAISE NOTICE '3. 兩者通過 user_id 關聯';
  RAISE NOTICE '4. 使用 users_with_employee_info 視圖獲取完整資訊';
  RAISE NOTICE '===========================================';
END $$;
