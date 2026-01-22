-- 員工代墊款系統 RBAC 權限定義

-- 插入權限
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  -- 查看權限
  ('expense.view.all', '查看所有代墊款申請', '可以查看所有員工的代墊款申請', 'expense_reimbursement', 'read'),
  ('expense.view.own', '查看自己的代墊款申請', '可以查看自己的代墊款申請', 'expense_reimbursement', 'read'),

  -- 操作權限
  ('expense.create', '建立代墊款申請', '可以建立新的代墊款申請', 'expense_reimbursement', 'write'),
  ('expense.edit.own', '編輯自己的代墊款申請', '可以編輯自己的代墊款申請（草稿狀態）', 'expense_reimbursement', 'write'),
  ('expense.delete.own', '刪除自己的代墊款申請', '可以刪除自己的代墊款申請（草稿狀態）', 'expense_reimbursement', 'delete'),
  ('expense.cancel', '取消代墊款申請', '可以取消已送出的代墊款申請', 'expense_reimbursement', 'write'),

  -- 簽核權限
  ('expense.approve.ceo', '總經理簽核', '可以審核高金額申請（≥30,000）', 'expense_reimbursement', 'approve'),
  ('expense.approve.boss', '放行主管簽核', '可以審核低金額申請（<30,000）', 'expense_reimbursement', 'approve'),
  ('expense.approve.accountant', '審核主管簽核', '可以進行最終審核', 'expense_reimbursement', 'approve'),

  -- 其他權限
  ('expense.print', '列印代墊款申請單', '可以列印代墊款申請單', 'expense_reimbursement', 'read'),
  ('expense.export', '匯出代墊款資料', '可以匯出代墊款資料', 'expense_reimbursement', 'read')
ON CONFLICT (code) DO NOTHING;

-- 為預設角色分配權限
DO $$
DECLARE
  staff_role_id UUID;
  manager_role_id UUID;
  hr_role_id UUID;
  admin_role_id UUID;
  ceo_role_id UUID;
  boss_role_id UUID;
  accountant_role_id UUID;
BEGIN
  -- 獲取角色 ID
  SELECT id INTO staff_role_id FROM rbac.roles WHERE name = 'staff';
  SELECT id INTO manager_role_id FROM rbac.roles WHERE name = 'manager';
  SELECT id INTO hr_role_id FROM rbac.roles WHERE name = 'hr';
  SELECT id INTO admin_role_id FROM rbac.roles WHERE name = 'admin';

  -- 嘗試建立特定角色（如果不存在）
  -- 注意：boss 和 accountant 已在 payment_approval 系統中建立
  INSERT INTO rbac.roles (name, description) VALUES
    ('ceo', '總經理 - 負責高金額簽核'),
    ('boss', '放行主管 - 負責低金額初審'),
    ('accountant', '審核主管 - 負責最終審核')
  ON CONFLICT (name) DO NOTHING;

  -- 重新獲取特定角色 ID
  SELECT id INTO ceo_role_id FROM rbac.roles WHERE name = 'ceo';
  SELECT id INTO boss_role_id FROM rbac.roles WHERE name = 'boss';
  SELECT id INTO accountant_role_id FROM rbac.roles WHERE name = 'accountant';

  -- 一般員工權限（可以建立和查看自己的申請）
  IF staff_role_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT staff_role_id, id FROM rbac.permissions
    WHERE code IN (
      'expense.view.own',
      'expense.create',
      'expense.edit.own',
      'expense.delete.own',
      'expense.cancel',
      'expense.print'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 主管權限（可以查看所有申請）
  IF manager_role_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT manager_role_id, id FROM rbac.permissions
    WHERE code IN (
      'expense.view.all',
      'expense.view.own',
      'expense.create',
      'expense.edit.own',
      'expense.delete.own',
      'expense.cancel',
      'expense.print',
      'expense.export'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- HR 權限（可以查看所有申請和匯出）
  IF hr_role_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT hr_role_id, id FROM rbac.permissions
    WHERE code IN (
      'expense.view.all',
      'expense.view.own',
      'expense.create',
      'expense.edit.own',
      'expense.delete.own',
      'expense.print',
      'expense.export'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 管理員權限（所有權限）
  IF admin_role_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT admin_role_id, id FROM rbac.permissions
    WHERE code LIKE 'expense.%'
    ON CONFLICT DO NOTHING;
  END IF;

  -- 總經理權限（高金額簽核）
  IF ceo_role_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT ceo_role_id, id FROM rbac.permissions
    WHERE code IN (
      'expense.view.all',
      'expense.approve.ceo',
      'expense.print'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 放行主管權限（低金額初審）
  IF boss_role_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT boss_role_id, id FROM rbac.permissions
    WHERE code IN (
      'expense.view.all',
      'expense.approve.boss',
      'expense.print'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- 審核主管權限（最終審核）
  IF accountant_role_id IS NOT NULL THEN
    INSERT INTO rbac.role_permissions (role_id, permission_id)
    SELECT accountant_role_id, id FROM rbac.permissions
    WHERE code IN (
      'expense.view.all',
      'expense.approve.accountant',
      'expense.print',
      'expense.export'
    )
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- 建立視圖：我的待簽核申請
CREATE OR REPLACE VIEW public.my_pending_expense_approvals AS
SELECT DISTINCT
  r.*,
  e.name as applicant_name,
  a.approval_type,
  a.approval_order
FROM public.expense_reimbursement_requests r
JOIN public.employees e ON r.applicant_id = e.user_id
JOIN public.expense_approvals a ON r.id = a.request_id
WHERE a.approver_id = auth.uid()
  AND a.status = 'pending'
  AND r.deleted_at IS NULL;

COMMENT ON VIEW public.my_pending_expense_approvals IS '我的待簽核代墊款申請';

-- 授權視圖
GRANT SELECT ON public.my_pending_expense_approvals TO authenticated;
