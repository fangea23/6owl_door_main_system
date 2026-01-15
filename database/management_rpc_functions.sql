-- ============================================================================
-- 統一管理中心必要的 RPC 函數
-- ============================================================================

-- ============================================================================
-- 函數 1: 刪除用戶（Admin 專用）
-- ============================================================================
-- 此函數允許管理員刪除用戶帳號（包括 auth.users 和 profiles）
DROP FUNCTION IF EXISTS public.delete_user_by_admin(UUID);
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id UUID)
RETURNS JSON AS $$
DECLARE
  current_user_role VARCHAR;
  target_user_role VARCHAR;
BEGIN
  -- 檢查當前用戶是否為管理員
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_user_role NOT IN ('admin', 'hr') THEN
    RAISE EXCEPTION 'Permission denied: Only admin or hr can delete users';
  END IF;

  -- 檢查目標用戶角色（不能刪除其他管理員）
  SELECT role INTO target_user_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF target_user_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete admin users';
  END IF;

  -- 先將 employees 的 user_id 設為 NULL（解除關聯）
  UPDATE public.employees
  SET user_id = NULL
  WHERE user_id = target_user_id;

  -- 刪除 profiles 記錄
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 刪除 auth.users 記錄（需要 service_role 權限）
  -- 注意：這需要在 Supabase Dashboard 執行或使用 service_role key
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 函數 2: 獲取當前用戶完整資訊（使用 employees_with_details）
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_current_user_full_info();
CREATE OR REPLACE FUNCTION public.get_current_user_full_info()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', row_to_json(p.*),
    'employee', row_to_json(e.*)
  ) INTO result
  FROM public.profiles p
  LEFT JOIN public.employees_with_details e ON p.id = e.user_id
  WHERE p.id = auth.uid();

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 函數 3: 獲取用戶顯示名稱（智能選擇）
-- ============================================================================
-- 優先順序: employees.name > profiles.full_name > profiles.email
DROP FUNCTION IF EXISTS public.get_user_display_name(UUID);
CREATE OR REPLACE FUNCTION public.get_user_display_name(user_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  display_name VARCHAR;
BEGIN
  SELECT COALESCE(
    e.name,
    p.full_name,
    p.email
  ) INTO display_name
  FROM public.profiles p
  LEFT JOIN public.employees e ON p.id = e.user_id AND e.deleted_at IS NULL
  WHERE p.id = user_id;

  RETURN display_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 函數 4: 獲取用戶頭像 URL（智能選擇）
-- ============================================================================
-- 優先順序: employees.avatar_url > profiles.avatar_url
DROP FUNCTION IF EXISTS public.get_user_avatar_url(UUID);
CREATE OR REPLACE FUNCTION public.get_user_avatar_url(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  avatar_url TEXT;
BEGIN
  SELECT COALESCE(
    e.avatar_url,
    p.avatar_url
  ) INTO avatar_url
  FROM public.profiles p
  LEFT JOIN public.employees e ON p.id = e.user_id AND e.deleted_at IS NULL
  WHERE p.id = user_id;

  RETURN avatar_url;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 函數 5: 同步 profiles 和 employees 的基本資料
-- ============================================================================
-- 當更新 profiles 時，自動同步到 employees
DROP FUNCTION IF EXISTS public.sync_profile_to_employee();
CREATE OR REPLACE FUNCTION public.sync_profile_to_employee()
RETURNS TRIGGER AS $$
BEGIN
  -- 如果 profiles.full_name 或 email 變更，同步到 employees
  UPDATE public.employees
  SET
    name = COALESCE(NEW.full_name, name),
    email = COALESCE(NEW.email, email),
    role = COALESCE(NEW.role, role),
    updated_at = NOW()
  WHERE user_id = NEW.id
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
DROP TRIGGER IF EXISTS sync_profile_to_employee_trigger ON public.profiles;
CREATE TRIGGER sync_profile_to_employee_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  WHEN (
    OLD.full_name IS DISTINCT FROM NEW.full_name OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.role IS DISTINCT FROM NEW.role
  )
  EXECUTE FUNCTION public.sync_profile_to_employee();

-- ============================================================================
-- 函數 6: 獲取用戶統計資訊
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_management_stats();
CREATE OR REPLACE FUNCTION public.get_management_stats()
RETURNS JSON AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_profiles', (SELECT COUNT(*) FROM public.profiles),
    'total_employees', (SELECT COUNT(*) FROM public.employees WHERE deleted_at IS NULL),
    'active_employees', (SELECT COUNT(*) FROM public.employees WHERE status = 'active' AND deleted_at IS NULL),
    'total_departments', (SELECT COUNT(*) FROM public.departments WHERE deleted_at IS NULL),
    'active_departments', (SELECT COUNT(*) FROM public.departments WHERE is_active = true AND deleted_at IS NULL),
    'linked_accounts', (SELECT COUNT(*) FROM public.employees WHERE user_id IS NOT NULL AND deleted_at IS NULL),
    'unlinked_employees', (SELECT COUNT(*) FROM public.employees WHERE user_id IS NULL AND deleted_at IS NULL)
  ) INTO stats;

  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 授予權限
-- ============================================================================
-- 允許已認證用戶執行這些函數
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_full_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_display_name TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_avatar_url TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_management_stats TO authenticated;

-- ============================================================================
-- 完成！
-- ============================================================================
COMMENT ON FUNCTION public.delete_user_by_admin IS '管理員專用：刪除用戶帳號（包括 auth.users 和 profiles）';
COMMENT ON FUNCTION public.get_current_user_full_info IS '獲取當前用戶的完整資訊（profiles + employees_with_details）';
COMMENT ON FUNCTION public.get_user_display_name IS '智能獲取用戶顯示名稱（employees.name > profiles.full_name > email）';
COMMENT ON FUNCTION public.get_user_avatar_url IS '智能獲取用戶頭像 URL（employees.avatar_url > profiles.avatar_url）';
COMMENT ON FUNCTION public.get_management_stats IS '獲取管理中心統計資訊';

-- 顯示完成訊息
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ 統一管理中心 RPC 函數已建立完成！';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '已建立的函數:';
  RAISE NOTICE '1. delete_user_by_admin - 刪除用戶';
  RAISE NOTICE '2. get_current_user_full_info - 獲取完整用戶資訊';
  RAISE NOTICE '3. get_user_display_name - 智能顯示名稱';
  RAISE NOTICE '4. get_user_avatar_url - 智能頭像 URL';
  RAISE NOTICE '5. sync_profile_to_employee - 自動同步資料';
  RAISE NOTICE '6. get_management_stats - 統計資訊';
  RAISE NOTICE '===========================================';
END $$;
