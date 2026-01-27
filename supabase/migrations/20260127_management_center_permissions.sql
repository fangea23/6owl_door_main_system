-- ============================================================================
-- 管理中心細緻權限設定
-- 將原本粗糙的 employee.view/edit 細分為各模組獨立權限
-- ============================================================================

-- 1. 員工資料模組權限（保持現有，確保完整）
INSERT INTO rbac.permissions (code, name, module, category, description) VALUES
  ('employee.view', '查看員工資料', 'employee', 'read', '允許查看員工列表和詳細資料'),
  ('employee.create', '新增員工', 'employee', 'write', '允許新增員工記錄'),
  ('employee.edit', '編輯員工', 'employee', 'write', '允許編輯員工資料'),
  ('employee.delete', '刪除員工', 'employee', 'delete', '允許刪除員工記錄')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 2. 用戶帳號模組權限（新增）
INSERT INTO rbac.permissions (code, name, module, category, description) VALUES
  ('profile.view', '查看用戶帳號', 'profile', 'read', '允許查看系統登入帳號列表'),
  ('profile.create', '建立用戶帳號', 'profile', 'write', '允許建立新的系統登入帳號'),
  ('profile.edit', '編輯用戶帳號', 'profile', 'write', '允許編輯用戶帳號角色'),
  ('profile.delete', '刪除用戶帳號', 'profile', 'delete', '允許刪除系統登入帳號')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 3. 部門管理模組權限（新增）
INSERT INTO rbac.permissions (code, name, module, category, description) VALUES
  ('department.view', '查看部門', 'department', 'read', '允許查看部門架構'),
  ('department.create', '新增部門', 'department', 'write', '允許新增部門'),
  ('department.edit', '編輯部門', 'department', 'write', '允許編輯部門資料'),
  ('department.delete', '刪除部門', 'department', 'delete', '允許刪除部門')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 4. 會計品牌分配權限（新增）
INSERT INTO rbac.permissions (code, name, module, category, description) VALUES
  ('accountant_brand.view', '查看會計品牌分配', 'accountant_brand', 'read', '允許查看會計人員負責的品牌'),
  ('accountant_brand.manage', '管理會計品牌分配', 'accountant_brand', 'write', '允許設定會計人員負責的品牌分配')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 5. 督導設定權限（新增）
INSERT INTO rbac.permissions (code, name, module, category, description) VALUES
  ('supervisor.view', '查看督導設定', 'supervisor', 'read', '允許查看區域督導與門市指派'),
  ('supervisor.manage', '管理督導設定', 'supervisor', 'write', '允許設定區域督導與門市範圍')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- 6. 管理中心訪問權限（新增）
INSERT INTO rbac.permissions (code, name, module, category, description) VALUES
  ('system.management_center', '訪問管理中心', 'system_access', 'access', '允許進入管理中心')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- ============================================================================
-- 為現有角色分配新權限
-- ============================================================================

-- 獲取角色 ID
DO $$
DECLARE
  v_super_admin_id UUID;
  v_ceo_id UUID;
  v_boss_id UUID;
  v_director_id UUID;
  v_hr_manager_id UUID;
  v_fin_manager_id UUID;
  v_accountant_id UUID;
  v_ops_manager_id UUID;
  v_area_supervisor_id UUID;
BEGIN
  -- 獲取角色 ID
  SELECT id INTO v_super_admin_id FROM rbac.roles WHERE code = 'super_admin';
  SELECT id INTO v_ceo_id FROM rbac.roles WHERE code = 'ceo';
  SELECT id INTO v_boss_id FROM rbac.roles WHERE code = 'boss';
  SELECT id INTO v_director_id FROM rbac.roles WHERE code = 'director';
  SELECT id INTO v_hr_manager_id FROM rbac.roles WHERE code = 'hq_hr_manager';
  SELECT id INTO v_fin_manager_id FROM rbac.roles WHERE code = 'hq_fin_manager';
  SELECT id INTO v_accountant_id FROM rbac.roles WHERE code = 'hq_accountant';
  SELECT id INTO v_ops_manager_id FROM rbac.roles WHERE code = 'hq_ops_manager';
  SELECT id INTO v_area_supervisor_id FROM rbac.roles WHERE code = 'area_supervisor';


  -- CEO / 總經理：查看所有 + 部分管理
  IF v_ceo_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT v_ceo_id, id FROM rbac.permissions
    WHERE code IN (
      'system.management_center',
      'employee.view',
      'profile.view',
      'department.view',
      'accountant_brand.view',
      'supervisor.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Boss / 放行主管：查看所有
  IF v_boss_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT v_boss_id, id FROM rbac.permissions
    WHERE code IN (
      'system.management_center',
      'employee.view',
      'profile.view',
      'department.view',
      'accountant_brand.view',
      'supervisor.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 部門總監：查看 + 部分編輯
  IF v_director_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT v_director_id, id FROM rbac.permissions
    WHERE code IN (
      'system.management_center',
      'employee.view', 'employee.edit',
      'department.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 人資經理：員工與帳號完整權限
  IF v_hr_manager_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT v_hr_manager_id, id FROM rbac.permissions
    WHERE code IN (
      'system.management_center',
      'employee.view', 'employee.create', 'employee.edit', 'employee.delete',
      'profile.view', 'profile.create', 'profile.edit', 'profile.delete',
      'department.view', 'department.create', 'department.edit'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 財務經理：會計品牌分配權限
  IF v_fin_manager_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT v_fin_manager_id, id FROM rbac.permissions
    WHERE code IN (
      'system.management_center',
      'employee.view',
      'accountant_brand.view', 'accountant_brand.manage'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 會計：查看會計品牌分配
  IF v_accountant_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT v_accountant_id, id FROM rbac.permissions
    WHERE code IN (
      'accountant_brand.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 營運經理：督導設定權限
  IF v_ops_manager_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT v_ops_manager_id, id FROM rbac.permissions
    WHERE code IN (
      'system.management_center',
      'employee.view',
      'supervisor.view', 'supervisor.manage'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 區域督導：查看督導設定（自己的）
  IF v_area_supervisor_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT v_area_supervisor_id, id FROM rbac.permissions
    WHERE code IN (
      'supervisor.view'
    )
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- ============================================================================
-- 驗證權限已建立
-- ============================================================================
SELECT
  p.code,
  p.name,
  p.module,
  p.category,
  COUNT(rp.role_id) as role_count
FROM rbac.permissions p
LEFT JOIN rbac.role_permissions rp ON p.id = rp.permission_id
WHERE p.module IN ('employee', 'profile', 'department', 'accountant_brand', 'supervisor', 'system_access')
   OR p.code = 'rbac.manage'
GROUP BY p.id, p.code, p.name, p.module, p.category
ORDER BY p.module, p.code;
