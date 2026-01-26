-- ============================================
-- 修復角色同步函數 - 新增缺失的角色映射
-- 日期：2026-01-21
-- 目的：在 employees.role 同步到 RBAC 的函數中，新增 'staff' 和 'manager' 角色映射
-- ============================================

-- 問題說明：
-- 原本的 sync_employee_role_to_rbac() 函數只映射以下角色：
--   admin, hr, boss, unit_manager, accountant, audit_manager, cashier, user
-- 缺少了：
--   staff (一般員工) 和 manager (主管)
-- 導致這些角色的員工無法被正確同步到 RBAC 系統，因此沒有任何權限

-- ============================================
-- 1. 更新觸發器函數 - 添加缺失的角色映射
-- ============================================

CREATE OR REPLACE FUNCTION public.sync_employee_role_to_rbac()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
  v_rbac_role_code TEXT;
BEGIN
  -- 只處理有 user_id 且狀態為 active 的員工
  IF NEW.user_id IS NOT NULL AND NEW.status = 'active' AND NEW.deleted_at IS NULL THEN

    -- 映射 employees.role 到 rbac.roles.code
    v_rbac_role_code := CASE NEW.role
      WHEN 'admin' THEN 'admin'
      WHEN 'hr' THEN 'hr'
      WHEN 'boss' THEN 'boss'
      WHEN 'unit_manager' THEN 'unit_manager'
      WHEN 'accountant' THEN 'accountant'
      WHEN 'audit_manager' THEN 'audit_manager'
      WHEN 'cashier' THEN 'cashier'
      WHEN 'manager' THEN 'manager'          -- ✅ 新增
      WHEN 'staff' THEN 'staff'              -- ✅ 新增
      WHEN 'user' THEN 'user'
      ELSE NULL
    END;

    -- 取得對應的 RBAC 角色 ID
    IF v_rbac_role_code IS NOT NULL THEN
      SELECT id INTO v_role_id
      FROM rbac.roles
      WHERE code = v_rbac_role_code
        AND deleted_at IS NULL;

      IF v_role_id IS NOT NULL THEN
        -- 刪除該用戶的所有舊角色
        DELETE FROM rbac.user_roles
        WHERE user_id = NEW.user_id;

        -- 插入新角色
        INSERT INTO rbac.user_roles (user_id, role_id)
        VALUES (NEW.user_id, v_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;

        RAISE NOTICE '已同步員工 % 的角色：% -> %', NEW.name, NEW.role, v_rbac_role_code;
      ELSE
        RAISE WARNING '找不到 RBAC 角色：%', v_rbac_role_code;
      END IF;
    ELSE
      RAISE WARNING '員工 % 的角色 "%" 無法映射到 RBAC', NEW.name, NEW.role;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.sync_employee_role_to_rbac() IS
'自動同步員工角色到 RBAC 系統 - 當員工的 user_id 或 role 變更時觸發
已支援的角色：admin, hr, boss, unit_manager, accountant, audit_manager, cashier, manager, staff, user';

-- ============================================
-- 2. 重新同步所有現有員工（補救措施）
-- ============================================

-- 為所有有 user_id 的活躍員工重新同步角色
DO $$
DECLARE
  v_employee RECORD;
  v_role_id UUID;
  v_rbac_role_code TEXT;
  v_synced_count INTEGER := 0;
  v_failed_count INTEGER := 0;
BEGIN
  FOR v_employee IN
    SELECT
      e.id,
      e.user_id,
      e.name,
      e.role
    FROM public.employees e
    WHERE e.user_id IS NOT NULL
      AND e.deleted_at IS NULL
      AND e.status = 'active'
  LOOP
    -- 映射角色
    v_rbac_role_code := CASE v_employee.role
      WHEN 'admin' THEN 'admin'
      WHEN 'hr' THEN 'hr'
      WHEN 'boss' THEN 'boss'
      WHEN 'unit_manager' THEN 'unit_manager'
      WHEN 'accountant' THEN 'accountant'
      WHEN 'audit_manager' THEN 'audit_manager'
      WHEN 'cashier' THEN 'cashier'
      WHEN 'manager' THEN 'manager'
      WHEN 'staff' THEN 'staff'
      WHEN 'user' THEN 'user'
      ELSE NULL
    END;

    IF v_rbac_role_code IS NOT NULL THEN
      -- 取得 RBAC 角色 ID
      SELECT id INTO v_role_id
      FROM rbac.roles
      WHERE code = v_rbac_role_code
        AND deleted_at IS NULL;

      IF v_role_id IS NOT NULL THEN
        -- 刪除舊的角色分配
        DELETE FROM rbac.user_roles
        WHERE user_id = v_employee.user_id;

        -- 插入新的角色分配
        INSERT INTO rbac.user_roles (user_id, role_id)
        VALUES (v_employee.user_id, v_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;

        v_synced_count := v_synced_count + 1;
        RAISE NOTICE '[成功] 員工 %（%）已同步角色：%', v_employee.name, v_employee.user_id, v_rbac_role_code;
      ELSE
        v_failed_count := v_failed_count + 1;
        RAISE WARNING '[失敗] 找不到 RBAC 角色：% (員工：%)', v_rbac_role_code, v_employee.name;
      END IF;
    ELSE
      v_failed_count := v_failed_count + 1;
      RAISE WARNING '[失敗] 無法映射角色：% (員工：%)', v_employee.role, v_employee.name;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE '角色同步完成：';
  RAISE NOTICE '  ✅ 成功同步：% 位員工', v_synced_count;
  RAISE NOTICE '  ❌ 失敗：% 位員工', v_failed_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 3. 驗證同步結果
-- ============================================

-- 查看所有員工及其 RBAC 角色分配情況
DO $$
DECLARE
  v_result RECORD;
  v_has_issues BOOLEAN := FALSE;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '員工角色分配檢查：';
  RAISE NOTICE '========================================';

  FOR v_result IN
    SELECT
      e.name as employee_name,
      e.employee_id,
      e.role as employee_role,
      r.code as rbac_role_code,
      r.name as rbac_role_name,
      CASE
        WHEN ur.role_id IS NULL THEN '❌ 未同步'
        WHEN e.role IN ('staff', 'manager') AND ur.role_id IS NULL THEN '❌ 新增角色未同步'
        ELSE '✅ 已同步'
      END as sync_status
    FROM public.employees e
    LEFT JOIN rbac.user_roles ur ON e.user_id = ur.user_id
    LEFT JOIN rbac.roles r ON ur.role_id = r.id
    WHERE e.user_id IS NOT NULL
      AND e.deleted_at IS NULL
      AND e.status = 'active'
    ORDER BY e.name
  LOOP
    IF v_result.sync_status LIKE '❌%' THEN
      RAISE WARNING '%：% (員工角色：%, RBAC角色：%)',
        v_result.sync_status,
        v_result.employee_name,
        v_result.employee_role,
        COALESCE(v_result.rbac_role_name, '無');
      v_has_issues := TRUE;
    ELSE
      RAISE NOTICE '%：% (員工角色：%, RBAC角色：%)',
        v_result.sync_status,
        v_result.employee_name,
        v_result.employee_role,
        v_result.rbac_role_name;
    END IF;
  END LOOP;

  RAISE NOTICE '========================================';
  IF v_has_issues THEN
    RAISE WARNING '發現未同步的員工，請檢查上述警告訊息';
  ELSE
    RAISE NOTICE '✅ 所有員工角色已正確同步到 RBAC 系統';
  END IF;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 完成！
-- ============================================

COMMENT ON TRIGGER trigger_sync_employee_role_to_rbac ON public.employees IS
'自動同步員工角色到 RBAC 系統
支援的角色映射：
  - admin → admin (系統管理員)
  - hr → hr (人資)
  - boss → boss (放行主管)
  - unit_manager → unit_manager (單位主管)
  - accountant → accountant (會計)
  - audit_manager → audit_manager (審核主管)
  - cashier → cashier (出納)
  - manager → manager (主管) ✅ 已修復
  - staff → staff (一般員工) ✅ 已修復
  - user → user (一般使用者)
';
