-- ============================================
-- 刪除舊的 vehicle 和 meeting 模組權限
-- ============================================

-- 背景：
-- 系統中存在兩套權限代碼：
-- 1. 舊代碼：vehicle.*, meeting.* (module = 'vehicle', 'meeting')
-- 2. 新代碼：car.*, meeting.booking.*, meeting.room.* (module = 'car_rental', 'meeting_room')
--
-- 所有組件都已改用新權限代碼，舊權限代碼不再被使用
-- 此遷移將軟刪除舊權限，避免混淆

DO $$
DECLARE
  v_deleted_permissions INTEGER := 0;
  v_deleted_role_perms INTEGER := 0;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '開始刪除舊的 vehicle 和 meeting 權限';
  RAISE NOTICE '========================================';

  -- 1. 列出即將刪除的舊權限
  RAISE NOTICE '';
  RAISE NOTICE '即將軟刪除以下舊權限：';
  RAISE NOTICE '----------------------------------------';

  FOR v_perm IN (
    SELECT code, name, module
    FROM rbac.permissions
    WHERE deleted_at IS NULL
      AND module IN ('vehicle', 'meeting')
    ORDER BY module, code
  )
  LOOP
    RAISE NOTICE '  - % (%) - 模組：%', v_perm.name, v_perm.code, v_perm.module;
  END LOOP;

  -- 2. 軟刪除舊的角色權限關聯
  RAISE NOTICE '';
  RAISE NOTICE '刪除舊權限的角色關聯...';

  WITH deleted AS (
    UPDATE rbac.role_permissions rp
    SET deleted_at = NOW()
    WHERE deleted_at IS NULL
      AND permission_id IN (
        SELECT id
        FROM rbac.permissions
        WHERE module IN ('vehicle', 'meeting')
          AND deleted_at IS NULL
      )
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_role_perms FROM deleted;

  RAISE NOTICE '  ✅ 已刪除 % 條角色權限關聯', v_deleted_role_perms;

  -- 3. 軟刪除舊權限
  RAISE NOTICE '';
  RAISE NOTICE '軟刪除舊權限...';

  WITH deleted AS (
    UPDATE rbac.permissions
    SET deleted_at = NOW()
    WHERE deleted_at IS NULL
      AND module IN ('vehicle', 'meeting')
    RETURNING *
  )
  SELECT COUNT(*) INTO v_deleted_permissions FROM deleted;

  RAISE NOTICE '  ✅ 已軟刪除 % 個舊權限', v_deleted_permissions;

  -- 4. 確認新權限仍然存在
  RAISE NOTICE '';
  RAISE NOTICE '確認新權限狀態：';
  RAISE NOTICE '----------------------------------------';

  FOR v_perm IN (
    SELECT module, COUNT(*) as count
    FROM rbac.permissions
    WHERE deleted_at IS NULL
      AND module IN ('car_rental', 'meeting_room')
    GROUP BY module
    ORDER BY module
  )
  LOOP
    RAISE NOTICE '  ✓ 模組 % : % 個權限', v_perm.module, v_perm.count;
  END LOOP;

  -- 5. 總結
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '刪除完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '已刪除舊權限：% 個', v_deleted_permissions;
  RAISE NOTICE '已刪除角色關聯：% 條', v_deleted_role_perms;
  RAISE NOTICE '';
  RAISE NOTICE '注意事項：';
  RAISE NOTICE '- 使用軟刪除（deleted_at），資料仍保留在資料庫中';
  RAISE NOTICE '- Management Center 將不再顯示這些舊權限';
  RAISE NOTICE '- 所有組件都使用新的權限代碼（car.*, meeting.booking.*, meeting.room.*）';
  RAISE NOTICE '';
END $$;

-- 完成！
COMMENT ON TABLE rbac.permissions IS
'權限表 - 已清理舊的 vehicle 和 meeting 模組權限，現在只使用 car_rental 和 meeting_room 模組';
