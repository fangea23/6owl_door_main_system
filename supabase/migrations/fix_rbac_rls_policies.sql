-- ============================================================================
-- 修復 RBAC RLS 政策 - 解決循環依賴問題
-- 允許系統管理員（admin）直接管理權限，無需先有 rbac.manage 權限
-- ============================================================================

-- 1. 刪除舊的限制性政策
DROP POLICY IF EXISTS "Only rbac managers can modify" ON rbac.role_permissions;
DROP POLICY IF EXISTS "Only rbac managers can modify user roles" ON rbac.user_roles;

-- 2. 為 role_permissions 創建新政策：允許 admin 或有 rbac.manage 權限的人修改
CREATE POLICY "Admins and rbac managers can modify role permissions"
ON rbac.role_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
      AND e.status = 'active'
      AND e.deleted_at IS NULL
  )
  OR rbac.user_has_permission(auth.uid(), 'rbac.manage')
);

-- 3. 為 user_roles 創建新政策：允許 admin 或有 rbac.manage 權限的人修改
CREATE POLICY "Admins and rbac managers can modify user roles"
ON rbac.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
      AND e.status = 'active'
      AND e.deleted_at IS NULL
  )
  OR rbac.user_has_permission(auth.uid(), 'rbac.manage')
);

-- 4. 為 user_permissions 創建政策：允許 admin 或有 rbac.manage 權限的人修改
DROP POLICY IF EXISTS "Admins and rbac managers can modify user permissions" ON rbac.user_permissions;
CREATE POLICY "Admins and rbac managers can modify user permissions"
ON rbac.user_permissions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.employees e
    WHERE e.user_id = auth.uid()
      AND e.role = 'admin'
      AND e.status = 'active'
      AND e.deleted_at IS NULL
  )
  OR rbac.user_has_permission(auth.uid(), 'rbac.manage')
);

-- 5. 確保 role_permissions 可以被讀取
DROP POLICY IF EXISTS "Anyone can view role permissions" ON rbac.role_permissions;
CREATE POLICY "Anyone can view role permissions"
ON rbac.role_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 6. 確保 user_roles 可以被讀取
DROP POLICY IF EXISTS "Anyone can view user roles" ON rbac.user_roles;
CREATE POLICY "Anyone can view user roles"
ON rbac.user_roles
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- 7. 確保 user_permissions 可以被讀取
DROP POLICY IF EXISTS "Anyone can view user permissions" ON rbac.user_permissions;
CREATE POLICY "Anyone can view user permissions"
ON rbac.user_permissions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================================================
-- 說明
-- ============================================================================
COMMENT ON POLICY "Admins and rbac managers can modify role permissions" ON rbac.role_permissions IS
'允許系統管理員或擁有 rbac.manage 權限的用戶修改角色權限關聯';

COMMENT ON POLICY "Admins and rbac managers can modify user roles" ON rbac.user_roles IS
'允許系統管理員或擁有 rbac.manage 權限的用戶修改用戶角色關聯';

COMMENT ON POLICY "Admins and rbac managers can modify user permissions" ON rbac.user_permissions IS
'允許系統管理員或擁有 rbac.manage 權限的用戶修改用戶直接權限';
