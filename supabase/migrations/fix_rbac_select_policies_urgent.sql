-- ============================================================================
-- 緊急修復 RBAC SELECT 政策 - 確保所有登入用戶可以讀取權限資料
--
-- 問題：之前的 RLS 政策修改可能覆蓋了 SELECT 政策，導致用戶無法讀取權限
-- 解決：確保所有 RBAC 表都有正確的 FOR SELECT 政策
-- ============================================================================

-- 1. 確保 role_permissions 有 SELECT 政策
DROP POLICY IF EXISTS "Anyone can view role permissions" ON rbac.role_permissions;
CREATE POLICY "Anyone can view role permissions"
ON rbac.role_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 2. 確保 user_roles 有 SELECT 政策
DROP POLICY IF EXISTS "Anyone can view user roles" ON rbac.user_roles;
CREATE POLICY "Anyone can view user roles"
ON rbac.user_roles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 3. 確保 user_permissions 有 SELECT 政策
DROP POLICY IF EXISTS "Anyone can view user permissions" ON rbac.user_permissions;
CREATE POLICY "Anyone can view user permissions"
ON rbac.user_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 4. 確保 permissions 有 SELECT 政策
DROP POLICY IF EXISTS "Anyone can view permissions" ON rbac.permissions;
CREATE POLICY "Anyone can view permissions"
ON rbac.permissions
FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- 5. 確保 roles 有 SELECT 政策
DROP POLICY IF EXISTS "Anyone can view roles" ON rbac.roles;
CREATE POLICY "Anyone can view roles"
ON rbac.roles
FOR SELECT
USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- 6. 更新 role_permissions 的修改政策（包含 super_admin）
DROP POLICY IF EXISTS "Admins and rbac managers can modify role permissions" ON rbac.role_permissions;
DROP POLICY IF EXISTS "Only rbac managers can modify" ON rbac.role_permissions;
CREATE POLICY "Admins and rbac managers can modify role permissions"
ON rbac.role_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'super_admin')
      AND e.status = 'active'
      AND e.deleted_at IS NULL
  )
  OR rbac.user_has_permission(auth.uid(), 'rbac.manage')
);

-- 7. 更新 user_roles 的修改政策（包含 super_admin）
DROP POLICY IF EXISTS "Admins and rbac managers can modify user roles" ON rbac.user_roles;
DROP POLICY IF EXISTS "Only rbac managers can modify user roles" ON rbac.user_roles;
CREATE POLICY "Admins and rbac managers can modify user roles"
ON rbac.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'super_admin')
      AND e.status = 'active'
      AND e.deleted_at IS NULL
  )
  OR rbac.user_has_permission(auth.uid(), 'rbac.manage')
);

-- 8. 更新 user_permissions 的修改政策（包含 super_admin）
DROP POLICY IF EXISTS "Admins and rbac managers can modify user permissions" ON rbac.user_permissions;
CREATE POLICY "Admins and rbac managers can modify user permissions"
ON rbac.user_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role IN ('admin', 'super_admin')
      AND e.status = 'active'
      AND e.deleted_at IS NULL
  )
  OR rbac.user_has_permission(auth.uid(), 'rbac.manage')
);

-- ============================================================================
-- 說明
-- ============================================================================
-- FOR SELECT 政策：允許所有登入用戶讀取（用於權限檢查函數）
-- FOR ALL 政策：只允許管理員或有 rbac.manage 權限的用戶修改
-- ============================================================================
