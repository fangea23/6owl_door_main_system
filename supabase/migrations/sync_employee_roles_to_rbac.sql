-- ============================================================================
-- 同步現有員工角色到 RBAC 系統
-- 將 employees.role 映射到 rbac.user_roles
-- ============================================================================

-- 為所有有 user_id 的員工創建對應的角色關聯
-- 只處理角色已在 rbac.roles 中定義的員工

INSERT INTO rbac.user_roles (user_id, role_id)
SELECT DISTINCT
  e.user_id,
  r.id
FROM public.employees e
JOIN rbac.roles r ON (
  -- 映射邏輯：employees.role -> rbac.roles.code
  CASE e.role
    WHEN 'admin' THEN 'admin'
    WHEN 'hr' THEN 'hr'
    WHEN 'boss' THEN 'boss'
    WHEN 'unit_manager' THEN 'unit_manager'
    WHEN 'accountant' THEN 'accountant'
    WHEN 'audit_manager' THEN 'audit_manager'
    WHEN 'cashier' THEN 'cashier'
    WHEN 'user' THEN 'user'
    ELSE NULL
  END = r.code
)
WHERE e.user_id IS NOT NULL           -- 必須有關聯的用戶帳號
  AND e.deleted_at IS NULL            -- 未被軟刪除
  AND e.status = 'active'             -- 狀態為活躍
  AND NOT EXISTS (                    -- 避免重複插入
    SELECT 1 FROM rbac.user_roles ur
    WHERE ur.user_id = e.user_id
      AND ur.role_id = r.id
  );

-- 添加註解
COMMENT ON TABLE rbac.user_roles IS '用戶角色關聯表 - 記錄每個用戶被分配的角色';

-- 查看同步結果
DO $$
DECLARE
  v_synced_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_synced_count
  FROM rbac.user_roles;

  RAISE NOTICE '已同步 % 個用戶角色關聯', v_synced_count;
END $$;

-- ============================================================================
-- 可選：創建觸發器自動同步新員工
-- ============================================================================

-- 當員工的 user_id 或 role 更新時，自動同步到 RBAC
CREATE OR REPLACE FUNCTION public.sync_employee_role_to_rbac()
RETURNS TRIGGER AS $$
DECLARE
  v_role_id UUID;
BEGIN
  -- 只處理有 user_id 且狀態為 active 的員工
  IF NEW.user_id IS NOT NULL AND NEW.status = 'active' AND NEW.deleted_at IS NULL THEN

    -- 取得對應的 RBAC 角色 ID
    SELECT id INTO v_role_id
    FROM rbac.roles
    WHERE code = CASE NEW.role
      WHEN 'admin' THEN 'admin'
      WHEN 'hr' THEN 'hr'
      WHEN 'boss' THEN 'boss'
      WHEN 'unit_manager' THEN 'unit_manager'
      WHEN 'accountant' THEN 'accountant'
      WHEN 'audit_manager' THEN 'audit_manager'
      WHEN 'cashier' THEN 'cashier'
      WHEN 'user' THEN 'user'
      ELSE NULL
    END;

    IF v_role_id IS NOT NULL THEN
      -- 刪除該用戶的所有舊角色
      DELETE FROM rbac.user_roles
      WHERE user_id = NEW.user_id;

      -- 插入新角色
      INSERT INTO rbac.user_roles (user_id, role_id)
      VALUES (NEW.user_id, v_role_id)
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 綁定觸發器
DROP TRIGGER IF EXISTS trigger_sync_employee_role_to_rbac ON public.employees;
CREATE TRIGGER trigger_sync_employee_role_to_rbac
AFTER INSERT OR UPDATE OF user_id, role, status, deleted_at
ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.sync_employee_role_to_rbac();

COMMENT ON FUNCTION public.sync_employee_role_to_rbac() IS
'自動同步員工角色到 RBAC 系統 - 當員工的 user_id 或 role 變更時觸發';

-- ============================================================================
-- 測試查詢（可選）
-- ============================================================================

-- 查看所有用戶及其 RBAC 角色
-- SELECT
--   e.name as employee_name,
--   e.employee_id,
--   e.role as old_role,
--   r.name as rbac_role,
--   ur.is_active
-- FROM public.employees e
-- LEFT JOIN rbac.user_roles ur ON e.user_id = ur.user_id
-- LEFT JOIN rbac.roles r ON ur.role_id = r.id
-- WHERE e.user_id IS NOT NULL
--   AND e.deleted_at IS NULL
-- ORDER BY e.name;
