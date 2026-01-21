-- ============================================
-- 用戶權限診斷工具
-- 用途：快速診斷特定用戶為什麼會被權限系統阻擋
-- 使用方法：將 '{USER_EMAIL}' 替換為實際的用戶 email
-- ============================================

-- 設定要診斷的用戶（請替換為實際的 email）
-- 例如：DO $$ DECLARE v_user_email TEXT := 'user@example.com';
DO $$
DECLARE
  v_user_email TEXT := '{USER_EMAIL}';  -- ⚠️ 請替換為實際的用戶 email
  v_user_id UUID;
  v_user RECORD;
  v_employee RECORD;
  v_role RECORD;
  v_perm RECORD;
  v_has_perm BOOLEAN;
BEGIN
  -- ============================================
  -- 1. 查找用戶基本資訊
  -- ============================================
  RAISE NOTICE '========================================';
  RAISE NOTICE '用戶權限診斷報告';
  RAISE NOTICE '========================================';

  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '找不到用戶：%', v_user_email;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '用戶 Email：%', v_user_email;
  RAISE NOTICE '用戶 ID：%', v_user_id;

  -- ============================================
  -- 2. 查找員工記錄
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '員工記錄：';
  RAISE NOTICE '----------------------------------------';

  SELECT * INTO v_employee
  FROM public.employees
  WHERE user_id = v_user_id
    AND deleted_at IS NULL;

  IF v_employee IS NOT NULL THEN
    RAISE NOTICE '員工姓名：%', v_employee.name;
    RAISE NOTICE '員工編號：%', v_employee.employee_id;
    RAISE NOTICE '員工角色：%', v_employee.role;
    RAISE NOTICE '狀態：%', v_employee.status;
  ELSE
    RAISE WARNING '⚠️  找不到對應的員工記錄！';
    RAISE WARNING '    用戶可能沒有關聯到 employees 表';
    RAISE WARNING '    這會導致角色同步失敗';
    RETURN;
  END IF;

  -- ============================================
  -- 3. 查找 RBAC 角色分配
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE 'RBAC 角色分配：';
  RAISE NOTICE '----------------------------------------';

  FOR v_role IN
    SELECT r.code, r.name, r.level
    FROM rbac.user_roles ur
    JOIN rbac.roles r ON ur.role_id = r.id
    WHERE ur.user_id = v_user_id
      AND r.deleted_at IS NULL
    ORDER BY r.level DESC
  LOOP
    RAISE NOTICE '✓ % (%) - 等級 %', v_role.name, v_role.code, v_role.level;
  END LOOP;

  IF NOT FOUND THEN
    RAISE WARNING '❌ 用戶沒有被分配任何 RBAC 角色！';
    RAISE WARNING '   這是問題所在：用戶無法通過任何權限檢查';
    RAISE WARNING '';
    RAISE WARNING '   可能原因：';
    RAISE WARNING '   1. 員工角色 "%" 無法映射到 RBAC 角色', v_employee.role;
    RAISE WARNING '   2. 觸發器 sync_employee_role_to_rbac() 沒有執行';
    RAISE WARNING '   3. rbac.roles 表中沒有對應的角色';
    RAISE WARNING '';
    RAISE WARNING '   建議執行 fix_role_sync_add_missing_roles.sql 修復';
  END IF;

  -- ============================================
  -- 4. 列出用戶擁有的所有權限
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '用戶擁有的所有權限：';
  RAISE NOTICE '----------------------------------------';

  -- 車輛相關權限
  RAISE NOTICE '';
  RAISE NOTICE '【車輛租借系統】';
  FOR v_perm IN
    SELECT DISTINCT p.code, p.name
    FROM rbac.user_roles ur
    JOIN rbac.role_permissions rp ON ur.role_id = rp.role_id
    JOIN rbac.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = v_user_id
      AND p.deleted_at IS NULL
      AND rp.deleted_at IS NULL
      AND (p.code LIKE 'car.%' OR p.code LIKE 'vehicle.%')
    ORDER BY p.code
  LOOP
    RAISE NOTICE '  ✓ % - %', v_perm.code, v_perm.name;
  END LOOP;

  IF NOT FOUND THEN
    RAISE WARNING '  ❌ 沒有任何車輛相關權限';
  END IF;

  -- 會議室相關權限
  RAISE NOTICE '';
  RAISE NOTICE '【會議室系統】';
  FOR v_perm IN
    SELECT DISTINCT p.code, p.name
    FROM rbac.user_roles ur
    JOIN rbac.role_permissions rp ON ur.role_id = rp.role_id
    JOIN rbac.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = v_user_id
      AND p.deleted_at IS NULL
      AND rp.deleted_at IS NULL
      AND p.code LIKE 'meeting.%'
    ORDER BY p.code
  LOOP
    RAISE NOTICE '  ✓ % - %', v_perm.code, v_perm.name;
  END LOOP;

  IF NOT FOUND THEN
    RAISE WARNING '  ❌ 沒有任何會議室相關權限';
  END IF;

  -- ============================================
  -- 5. 測試關鍵權限檢查
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '----------------------------------------';
  RAISE NOTICE '關鍵權限檢查測試：';
  RAISE NOTICE '----------------------------------------';

  -- 車輛管理權限
  RAISE NOTICE '';
  RAISE NOTICE '【車輛管理】';

  SELECT rbac.user_has_permission(v_user_id, 'car.vehicle.create') INTO v_has_perm;
  RAISE NOTICE '  car.vehicle.create (新增車輛)：%',
    CASE WHEN v_has_perm THEN '✅ 有權限' ELSE '❌ 無權限' END;

  SELECT rbac.user_has_permission(v_user_id, 'car.vehicle.edit') INTO v_has_perm;
  RAISE NOTICE '  car.vehicle.edit (編輯車輛)：%',
    CASE WHEN v_has_perm THEN '✅ 有權限' ELSE '❌ 無權限' END;

  SELECT rbac.user_has_permission(v_user_id, 'car.vehicle.delete') INTO v_has_perm;
  RAISE NOTICE '  car.vehicle.delete (刪除車輛)：%',
    CASE WHEN v_has_perm THEN '✅ 有權限' ELSE '❌ 無權限' END;

  -- 租車申請權限
  RAISE NOTICE '';
  RAISE NOTICE '【租車申請】';

  SELECT rbac.user_has_permission(v_user_id, 'car.request.create') INTO v_has_perm;
  RAISE NOTICE '  car.request.create (建立申請)：%',
    CASE WHEN v_has_perm THEN '✅ 有權限' ELSE '❌ 無權限' END;

  SELECT rbac.user_has_permission(v_user_id, 'car.approve') INTO v_has_perm;
  RAISE NOTICE '  car.approve (審核申請)：%',
    CASE WHEN v_has_perm THEN '✅ 有權限' ELSE '❌ 無權限' END;

  -- 會議室權限
  RAISE NOTICE '';
  RAISE NOTICE '【會議室預約】';

  SELECT rbac.user_has_permission(v_user_id, 'meeting.booking.create') INTO v_has_perm;
  RAISE NOTICE '  meeting.booking.create (建立預約)：%',
    CASE WHEN v_has_perm THEN '✅ 有權限' ELSE '❌ 無權限' END;

  SELECT rbac.user_has_permission(v_user_id, 'meeting.booking.edit.own') INTO v_has_perm;
  RAISE NOTICE '  meeting.booking.edit.own (編輯自己的預約)：%',
    CASE WHEN v_has_perm THEN '✅ 有權限' ELSE '❌ 無權限' END;

  SELECT rbac.user_has_permission(v_user_id, 'meeting.booking.cancel.all') INTO v_has_perm;
  RAISE NOTICE '  meeting.booking.cancel.all (取消任何預約)：%',
    CASE WHEN v_has_perm THEN '✅ 有權限' ELSE '❌ 無權限' END;

  -- ============================================
  -- 6. 診斷結論和建議
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '診斷結論：';
  RAISE NOTICE '========================================';

  -- 檢查是否有 RBAC 角色
  IF NOT EXISTS(
    SELECT 1 FROM rbac.user_roles WHERE user_id = v_user_id
  ) THEN
    RAISE WARNING '❌ 問題：用戶沒有 RBAC 角色分配';
    RAISE NOTICE '';
    RAISE NOTICE '建議解決方案：';
    RAISE NOTICE '1. 執行 fix_role_sync_add_missing_roles.sql 重新同步角色';
    RAISE NOTICE '2. 或手動插入角色：';
    RAISE NOTICE '   INSERT INTO rbac.user_roles (user_id, role_id)';
    RAISE NOTICE '   SELECT ''%'', id FROM rbac.roles WHERE code = ''%'';',
      v_user_id, v_employee.role;
  ELSE
    -- 檢查是否有車輛管理權限
    IF NOT EXISTS(
      SELECT 1
      FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON ur.role_id = rp.role_id
      JOIN rbac.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = v_user_id
        AND p.code IN ('car.vehicle.create', 'car.vehicle.edit')
    ) THEN
      RAISE WARNING '⚠️  用戶無法管理車輛（新增/編輯）';
      RAISE NOTICE '';
      RAISE NOTICE '這可能是預期的行為（只有 manager/admin 可以管理車輛）';
      RAISE NOTICE '如果需要此權限，請在 Management Center 中：';
      RAISE NOTICE '1. 進入「權限管理」';
      RAISE NOTICE '2. 選擇角色「%」', v_employee.role;
      RAISE NOTICE '3. 勾選以下權限：';
      RAISE NOTICE '   - car.vehicle.create (新增車輛)';
      RAISE NOTICE '   - car.vehicle.edit (編輯車輛)';
      RAISE NOTICE '   - car.vehicle.delete (刪除車輛)';
    ELSE
      RAISE NOTICE '✅ 用戶有車輛管理權限';
    END IF;

    -- 檢查會議室權限
    IF NOT EXISTS(
      SELECT 1
      FROM rbac.user_roles ur
      JOIN rbac.role_permissions rp ON ur.role_id = rp.role_id
      JOIN rbac.permissions p ON rp.permission_id = p.id
      WHERE ur.user_id = v_user_id
        AND p.code = 'meeting.booking.create'
    ) THEN
      RAISE WARNING '❌ 用戶無法預約會議室';
      RAISE NOTICE '';
      RAISE NOTICE '請在 Management Center 中為角色「%」添加權限', v_employee.role;
    ELSE
      RAISE NOTICE '✅ 用戶有會議室預約權限';
    END IF;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '診斷完成';
  RAISE NOTICE '========================================';
END $$;
