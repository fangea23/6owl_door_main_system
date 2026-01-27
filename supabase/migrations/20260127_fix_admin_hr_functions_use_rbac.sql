-- Migration: 修正 check_is_admin_or_hr 和 delete_user_by_admin 函數
-- 改用 RBAC 權限檢查，取代硬編碼的 role 字串檢查
--
-- 問題：
-- 1. check_is_admin_or_hr() 檢查 employees.role IN ('admin', 'hr')
-- 2. delete_user_by_admin() 檢查 profiles.role NOT IN ('admin', 'hr')
-- 這些都是舊的角色檢查方式，不符合新的 RBAC 系統
--
-- 解決方案：
-- 改用 RBAC 權限檢查 employee.edit 權限

-- ============================================================
-- 1. 更新 check_is_admin_or_hr() 函數
-- ============================================================
CREATE OR REPLACE FUNCTION public.check_is_admin_or_hr()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 方案一：使用 RBAC 權限檢查
  -- 檢查用戶是否有 employee.edit 權限
  RETURN EXISTS (
    SELECT 1
    FROM rbac.user_roles ur
    JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
    JOIN rbac.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
    AND p.code = 'employee.edit'
  );
END;
$$;

-- ============================================================
-- 2. 更新 delete_user_by_admin() 函數
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  -- 使用 RBAC 檢查是否有 employee.delete 權限
  SELECT EXISTS (
    SELECT 1
    FROM rbac.user_roles ur
    JOIN rbac.role_permissions rp ON rp.role_id = ur.role_id
    JOIN rbac.permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = auth.uid()
    AND p.code = 'employee.delete'
  ) INTO has_permission;

  IF NOT has_permission THEN
    RAISE EXCEPTION 'Permission denied: You do not have permission to delete users';
  END IF;

  -- 不允許刪除自己
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;

  -- 先刪除 RBAC 角色關聯
  DELETE FROM rbac.user_roles WHERE user_id = target_user_id;

  -- 將 employees 的 user_id 設為 NULL（解除關聯）
  UPDATE public.employees
  SET user_id = NULL
  WHERE user_id = target_user_id;

  -- 刪除 profiles 記錄
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 刪除 auth.users 記錄（需要 SECURITY DEFINER 權限）
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
$$;

-- ============================================================
-- 3. 確認 RBAC 權限存在
-- ============================================================
-- 確保 employee.edit 和 employee.delete 權限存在
INSERT INTO rbac.permissions (code, name, description, module, category)
VALUES
  ('employee.edit', '編輯員工', '編輯員工資料', 'employee', 'write'),
  ('employee.delete', '刪除員工', '刪除員工資料', 'employee', 'write')
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 4. 授予 hq_hr_specialist 角色這些權限
-- ============================================================
DO $$
DECLARE
  hr_role_id UUID;
  admin_role_id UUID;
  edit_perm_id UUID;
  delete_perm_id UUID;
BEGIN
  -- 取得角色 ID
  SELECT id INTO hr_role_id FROM rbac.roles WHERE code = 'hq_hr_specialist';
  SELECT id INTO admin_role_id FROM rbac.roles WHERE code = 'admin';

  -- 取得權限 ID
  SELECT id INTO edit_perm_id FROM rbac.permissions WHERE code = 'employee.edit';
  SELECT id INTO delete_perm_id FROM rbac.permissions WHERE code = 'employee.delete';

  -- 授予 hq_hr_specialist 角色權限
  IF hr_role_id IS NOT NULL AND edit_perm_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    VALUES (hr_role_id, edit_perm_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF hr_role_id IS NOT NULL AND delete_perm_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    VALUES (hr_role_id, delete_perm_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 授予 admin 角色權限
  IF admin_role_id IS NOT NULL AND edit_perm_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    VALUES (admin_role_id, edit_perm_id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF admin_role_id IS NOT NULL AND delete_perm_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    VALUES (admin_role_id, delete_perm_id)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============================================================
-- 驗證修改
-- ============================================================
-- 可以用以下 SQL 驗證：
-- SELECT check_is_admin_or_hr(); -- 以人資專員身份執行，應返回 true
