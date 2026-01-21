-- ============================================
-- 調試權限不匹配問題
-- 檢查組件使用的權限代碼 vs 數據庫中實際定義的權限
-- ============================================

-- 1. 列出所有定義的權限
DO $$
DECLARE
  v_perm RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '所有已定義的權限：';
  RAISE NOTICE '========================================';

  FOR v_perm IN
    SELECT code, name, module
    FROM rbac.permissions
    WHERE deleted_at IS NULL
    ORDER BY module, code
  LOOP
    RAISE NOTICE '[%] % - %', v_perm.module, v_perm.code, v_perm.name;
  END LOOP;
END $$;

-- 2. 檢查組件需要的權限是否存在
DO $$
DECLARE
  v_required_permissions TEXT[] := ARRAY[
    -- 車輛系統需要的權限
    'car.vehicle.create',
    'car.vehicle.edit',
    'car.vehicle.delete',
    'car.vehicle.view',
    'car.request.create',
    'car.request.view.own',
    'car.request.view.all',
    'car.approve',
    'car.reject',
    'car.rental.pickup',
    'car.rental.return',

    -- 會議室系統需要的權限
    'meeting.booking.create',
    'meeting.booking.edit.own',
    'meeting.booking.cancel.own',
    'meeting.booking.cancel.all',
    'meeting.booking.view.own',
    'meeting.booking.view.all',
    'meeting.room.create',
    'meeting.room.edit',
    'meeting.room.delete',
    'meeting.room.view'
  ];
  v_perm_code TEXT;
  v_exists BOOLEAN;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '檢查組件需要的權限是否存在：';
  RAISE NOTICE '========================================';

  FOREACH v_perm_code IN ARRAY v_required_permissions
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM rbac.permissions
      WHERE code = v_perm_code AND deleted_at IS NULL
    ) INTO v_exists;

    IF v_exists THEN
      RAISE NOTICE '✅ % - 存在', v_perm_code;
    ELSE
      RAISE WARNING '❌ % - 不存在！組件會被阻擋！', v_perm_code;
    END IF;
  END LOOP;
END $$;

-- 3. 檢查每個角色被分配了哪些權限
DO $$
DECLARE
  v_role RECORD;
  v_perm RECORD;
  v_perm_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '每個角色的權限分配：';
  RAISE NOTICE '========================================';

  FOR v_role IN
    SELECT id, code, name
    FROM rbac.roles
    WHERE deleted_at IS NULL
    ORDER BY code
  LOOP
    SELECT COUNT(*) INTO v_perm_count
    FROM rbac.role_permissions rp
    WHERE rp.role_id = v_role.id
      AND rp.deleted_at IS NULL;

    RAISE NOTICE '';
    RAISE NOTICE '角色：% (%) - 共 % 個權限', v_role.name, v_role.code, v_perm_count;
    RAISE NOTICE '----------------------------------------';

    -- 列出車輛相關權限
    RAISE NOTICE '  車輛權限：';
    FOR v_perm IN
      SELECT p.code, p.name
      FROM rbac.role_permissions rp
      JOIN rbac.permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = v_role.id
        AND rp.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND (p.code LIKE 'car.%' OR p.code LIKE 'vehicle.%')
      ORDER BY p.code
    LOOP
      RAISE NOTICE '    ✓ % - %', v_perm.code, v_perm.name;
    END LOOP;

    -- 列出會議室相關權限
    RAISE NOTICE '  會議室權限：';
    FOR v_perm IN
      SELECT p.code, p.name
      FROM rbac.role_permissions rp
      JOIN rbac.permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = v_role.id
        AND rp.deleted_at IS NULL
        AND p.deleted_at IS NULL
        AND (p.code LIKE 'meeting.%')
      ORDER BY p.code
    LOOP
      RAISE NOTICE '    ✓ % - %', v_perm.code, v_perm.name;
    END LOOP;
  END LOOP;
END $$;

-- 4. 檢查是否有重複或衝突的權限代碼
DO $$
DECLARE
  v_duplicate RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '檢查重複的權限代碼：';
  RAISE NOTICE '========================================';

  FOR v_duplicate IN
    SELECT code, COUNT(*) as count
    FROM rbac.permissions
    WHERE deleted_at IS NULL
    GROUP BY code
    HAVING COUNT(*) > 1
  LOOP
    RAISE WARNING '⚠️  權限代碼 "%" 出現 % 次！', v_duplicate.code, v_duplicate.count;
  END LOOP;

  IF NOT FOUND THEN
    RAISE NOTICE '✅ 沒有重複的權限代碼';
  END IF;
END $$;

-- 5. 查找可能的舊權限代碼（需要遷移）
DO $$
DECLARE
  v_old_perm RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '可能的舊權限代碼（需要遷移到新格式）：';
  RAISE NOTICE '========================================';

  FOR v_old_perm IN
    SELECT code, name, module
    FROM rbac.permissions
    WHERE deleted_at IS NULL
      AND (
        code LIKE 'vehicle.%'
        OR code = 'meeting.view'
        OR code = 'meeting.book'
      )
    ORDER BY code
  LOOP
    RAISE WARNING '⚠️  舊代碼：% (%)', v_old_perm.code, v_old_perm.name;

    -- 建議新代碼
    IF v_old_perm.code = 'vehicle.view' THEN
      RAISE NOTICE '    → 建議遷移到：car.vehicle.view';
    ELSIF v_old_perm.code = 'vehicle.book' THEN
      RAISE NOTICE '    → 建議遷移到：car.request.create';
    ELSIF v_old_perm.code = 'vehicle.approve' THEN
      RAISE NOTICE '    → 建議遷移到：car.approve';
    ELSIF v_old_perm.code = 'meeting.view' THEN
      RAISE NOTICE '    → 建議遷移到：meeting.room.view';
    ELSIF v_old_perm.code = 'meeting.book' THEN
      RAISE NOTICE '    → 建議遷移到：meeting.booking.create';
    END IF;
  END LOOP;
END $$;

-- 6. 總結報告
DO $$
DECLARE
  v_total_permissions INTEGER;
  v_total_roles INTEGER;
  v_total_assignments INTEGER;
  v_car_permissions INTEGER;
  v_meeting_permissions INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '總結報告：';
  RAISE NOTICE '========================================';

  SELECT COUNT(*) INTO v_total_permissions
  FROM rbac.permissions WHERE deleted_at IS NULL;

  SELECT COUNT(*) INTO v_total_roles
  FROM rbac.roles WHERE deleted_at IS NULL;

  SELECT COUNT(*) INTO v_total_assignments
  FROM rbac.role_permissions WHERE deleted_at IS NULL;

  SELECT COUNT(*) INTO v_car_permissions
  FROM rbac.permissions
  WHERE deleted_at IS NULL AND (code LIKE 'car.%' OR code LIKE 'vehicle.%');

  SELECT COUNT(*) INTO v_meeting_permissions
  FROM rbac.permissions
  WHERE deleted_at IS NULL AND code LIKE 'meeting.%';

  RAISE NOTICE '總權限數：%', v_total_permissions;
  RAISE NOTICE '總角色數：%', v_total_roles;
  RAISE NOTICE '總權限分配數：%', v_total_assignments;
  RAISE NOTICE '車輛相關權限：%', v_car_permissions;
  RAISE NOTICE '會議室相關權限：%', v_meeting_permissions;
  RAISE NOTICE '';
  RAISE NOTICE '平均每個角色有 % 個權限', ROUND(v_total_assignments::NUMERIC / v_total_roles, 2);
END $$;
