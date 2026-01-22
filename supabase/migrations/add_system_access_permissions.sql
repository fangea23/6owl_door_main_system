-- ============================================
-- 添加系統訪問權限
-- 用途：控制用戶在 Portal 中是否能看到特定系統
-- ============================================

-- 1. 創建系統訪問權限
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  -- 系統訪問權限
  ('system.management', '訪問管理中心', '可以在Portal中看到並訪問管理中心', 'system_access', 'access'),
  ('system.payment', '訪問付款簽核系統', '可以在Portal中看到並訪問付款簽核系統', 'system_access', 'access'),
  ('system.license', '訪問軟體授權系統', '可以在Portal中看到並訪問軟體授權系統', 'system_access', 'access'),
  ('system.meeting_room', '訪問會議室系統', '可以在Portal中看到並訪問會議室租借系統', 'system_access', 'access'),
  ('system.car_rental', '訪問車輛租借系統', '可以在Portal中看到並訪問公司車租借系統', 'system_access', 'access'),
  ('system.store_management', '訪問店舖管理系統', '可以在Portal中看到並訪問店舖管理系統', 'system_access', 'access'),
  ('system.eip_km', '訪問企業入口網', '可以在Portal中看到並訪問EIP&KM系統', 'system_access', 'access'),
  ('system.ticketing', '訪問叫修系統', '可以在Portal中看到並訪問叫修服務系統', 'system_access', 'access')
ON CONFLICT (code) DO NOTHING;

-- 2. 為不同角色分配系統訪問權限

-- Admin: 可以訪問所有系統
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin'
  AND p.module = 'system_access'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- HR: 可以訪問管理中心
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'hr'
  AND p.code = 'system.management'
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: 可以訪問大部分系統
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'manager'
  AND p.code IN (
    'system.payment',
    'system.meeting_room',
    'system.car_rental',
    'system.store_management',
    'system.eip_km',
    'system.ticketing'
  )
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff: 可以訪問基本系統
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'staff'
  AND p.code IN (
    'system.payment',
    'system.meeting_room',
    'system.car_rental',
    'system.eip_km',
    'system.ticketing'
  )
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- User: 只能訪問基礎系統
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'user'
  AND p.code IN (
    'system.eip_km',
    'system.ticketing'
  )
  AND p.deleted_at IS NULL
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. 顯示分配結果
DO $$
DECLARE
  v_role RECORD;
  v_perm RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '系統訪問權限分配結果：';
  RAISE NOTICE '========================================';

  FOR v_role IN
    SELECT id, code, name
    FROM rbac.roles
    WHERE deleted_at IS NULL
      AND code IN ('admin', 'hr', 'manager', 'staff', 'user')
    ORDER BY
      CASE code
        WHEN 'admin' THEN 1
        WHEN 'hr' THEN 2
        WHEN 'manager' THEN 3
        WHEN 'staff' THEN 4
        WHEN 'user' THEN 5
      END
  LOOP
    RAISE NOTICE '';
    RAISE NOTICE '角色：% (%)', v_role.name, v_role.code;
    RAISE NOTICE '可訪問的系統：';

    FOR v_perm IN
      SELECT p.name, p.code
      FROM rbac.role_permissions rp
      JOIN rbac.permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = v_role.id
        AND p.module = 'system_access'
        AND p.deleted_at IS NULL
        AND rp.deleted_at IS NULL
      ORDER BY p.code
    LOOP
      RAISE NOTICE '  ✓ % (%)', v_perm.name, v_perm.code;
    END LOOP;

    IF NOT FOUND THEN
      RAISE NOTICE '  ❌ 無系統訪問權限';
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '完成！';
  RAISE NOTICE '========================================';
END $$;

-- 完成！
COMMENT ON TABLE rbac.permissions IS
'權限表 - 包含系統訪問權限（system_access 模組），控制 Portal 中的系統可見性';
