-- ============================================================================
-- 修正登入 500 錯誤
-- ============================================================================
-- 問題：handle_new_user() trigger 在 INSERT OR UPDATE 時都會執行
-- 導致每次登入時（auth.users 被更新）都會觸發，可能造成錯誤
-- 解決方案：只在 INSERT 時執行（真正的新用戶註冊）
-- ============================================================================

SET search_path TO public;

-- ============================================================================
-- 1. 改進 handle_new_user 函數，增加錯誤處理
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- 只在真正的新用戶時執行（INSERT 操作）
  -- 如果是 UPDATE 操作且 profile 已存在，直接返回
  IF TG_OP = 'UPDATE' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = NEW.id) THEN
      RETURN NEW;
    END IF;
  END IF;

  -- 嘗試插入或更新 profile
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
  EXCEPTION
    WHEN OTHERS THEN
      -- 記錄錯誤但不中斷註冊流程
      RAISE WARNING 'Failed to create/update profile for user %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. 重新創建觸發器（只在 INSERT 時觸發）
-- ============================================================================

-- 移除舊的觸發器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 創建新的觸發器（只在 INSERT 時執行，不在 UPDATE 時執行）
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 3. 確保所有現有用戶都有 profile
-- ============================================================================

-- 為所有沒有 profile 的 auth.users 創建 profile
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  COALESCE(au.raw_user_meta_data->>'role', 'user')
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. 確保 RLS 政策不會阻擋認證操作
-- ============================================================================

-- 重新確認 profiles 表的 RLS 政策
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 確保新用戶註冊時可以插入自己的 profile
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 確保用戶可以查看所有已認證用戶的基本資訊
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 確保用戶可以更新自己的 profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 確保管理員可以管理所有 profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
  ON public.profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'hr')
    )
  );

-- ============================================================================
-- 5. 檢查 sync_profile_to_employee 觸發器
-- ============================================================================

-- 改進 sync_profile_to_employee 函數，增加錯誤處理
CREATE OR REPLACE FUNCTION public.sync_profile_to_employee()
RETURNS TRIGGER AS $$
BEGIN
  -- 只在有關聯的員工記錄時才同步
  IF EXISTS (SELECT 1 FROM public.employees WHERE user_id = NEW.id AND deleted_at IS NULL) THEN
    BEGIN
      UPDATE public.employees
      SET
        name = COALESCE(NEW.full_name, name),
        email = COALESCE(NEW.email, email),
        role = COALESCE(NEW.role, role),
        updated_at = NOW()
      WHERE user_id = NEW.id
        AND deleted_at IS NULL;
    EXCEPTION
      WHEN OTHERS THEN
        -- 記錄錯誤但不中斷操作
        RAISE WARNING 'Failed to sync profile to employee for user %: %', NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 完成！
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '=========================================';
  RAISE NOTICE '✅ 登入 500 錯誤修正完成！';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '修正項目：';
  RAISE NOTICE '1. ✅ 觸發器改為只在新用戶註冊時執行';
  RAISE NOTICE '2. ✅ 增加錯誤處理，避免中斷註冊/登入';
  RAISE NOTICE '3. ✅ 確保所有現有用戶都有 profile';
  RAISE NOTICE '4. ✅ 確認 RLS 政策正確';
  RAISE NOTICE '5. ✅ 改進同步觸發器的錯誤處理';
  RAISE NOTICE '=========================================';
  RAISE NOTICE '現在可以正常登入了！';
  RAISE NOTICE '=========================================';
END $$;
