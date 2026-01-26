-- ============================================
-- 添加員工代墊款系統訪問權限
-- 用途：控制用戶在 Portal 中是否能看到員工代墊款系統
-- ============================================

-- 1. 創建系統訪問權限
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  ('system.expense_reimbursement', '訪問員工代墊款系統', '可以在Portal中看到並訪問員工代墊款系統', 'system_access', 'access')
ON CONFLICT (code) DO NOTHING;

-- 2. 為不同角色分配系統訪問權限

-- Admin: 可以訪問所有系統（包括代墊款系統）
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin'
  AND p.code = 'system.expense_reimbursement'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: 可以訪問代墊款系統（需要審核）
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'manager'
  AND p.code = 'system.expense_reimbursement'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff: 可以訪問代墊款系統（員工申請費用報銷）
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'staff'
  AND p.code = 'system.expense_reimbursement'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CEO: 可以訪問代墊款系統（高金額審核）
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'ceo'
  AND p.code = 'system.expense_reimbursement'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Boss (放行主管): 可以訪問代墊款系統（低金額審核）
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'boss'
  AND p.code = 'system.expense_reimbursement'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Audit Manager (審核主管): 可以訪問代墊款系統（最終審核）
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'audit_manager'
  AND p.code = 'system.expense_reimbursement'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. 顯示分配結果
DO $$
DECLARE
  v_role RECORD;
  v_has_access BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '員工代墊款系統訪問權限分配結果：';
  RAISE NOTICE '========================================';

  FOR v_role IN
    SELECT id, code, name
    FROM rbac.roles
    WHERE deleted_at IS NULL
    ORDER BY
      CASE code
        WHEN 'admin' THEN 1
        WHEN 'ceo' THEN 2
        WHEN 'boss' THEN 3
        WHEN 'audit_manager' THEN 4
        WHEN 'manager' THEN 5
        WHEN 'staff' THEN 6
        WHEN 'user' THEN 7
        ELSE 99
      END
  LOOP
    -- 檢查該角色是否有員工代墊款系統訪問權限
    SELECT EXISTS (
      SELECT 1
      FROM rbac.role_permissions rp
      JOIN rbac.permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = v_role.id
        AND p.code = 'system.expense_reimbursement'
        AND p.deleted_at IS NULL
    ) INTO v_has_access;

    IF v_has_access THEN
      RAISE NOTICE '✓ % (%) - 可訪問員工代墊款系統', v_role.name, v_role.code;
    ELSE
      RAISE NOTICE '✗ % (%) - 無訪問權限', v_role.name, v_role.code;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '完成！';
  RAISE NOTICE '========================================';
END $$;

-- 完成！
COMMENT ON COLUMN rbac.permissions.code IS
'權限代碼 - system.expense_reimbursement 控制員工代墊款系統在 Portal 中的可見性';
