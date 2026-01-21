-- ============================================
-- 新增付款系統細粒度操作權限
-- 日期：2026-01-21
-- 目的：為紙本入庫、手續費管理、發票補登創建獨立權限
-- ============================================

-- 插入新的細粒度權限
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  -- 紙本入庫相關
  ('payment.paper.manage', '管理紙本入庫', '可以標記和管理付款申請的紙本收件狀態', 'payment', 'write'),

  -- 手續費相關
  ('payment.fee.manage', '管理手續費', '可以輸入和修改實際手續費金額', 'payment', 'write'),

  -- 發票相關
  ('payment.invoice.manage', '管理發票資訊', '可以補登和修改發票資訊（狀態、日期、號碼）', 'payment', 'write'),
  ('payment.invoice.view', '查看發票資訊', '可以查看發票詳細資訊', 'payment', 'read')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 為現有角色分配新權限
-- ============================================

-- 會計角色：擁有紙本入庫和發票管理權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'accountant'
  AND p.code IN (
    'payment.paper.manage',
    'payment.invoice.manage',
    'payment.invoice.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 出納角色：擁有手續費管理權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'cashier'
  AND p.code IN (
    'payment.fee.manage',
    'payment.invoice.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 管理員：擁有所有新權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin'
  AND p.code IN (
    'payment.paper.manage',
    'payment.fee.manage',
    'payment.invoice.manage',
    'payment.invoice.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 審核主管和放行主管：可以查看發票
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code IN ('audit_manager', 'boss', 'unit_manager')
  AND p.code = 'payment.invoice.view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 完成！
-- ============================================
COMMENT ON TABLE rbac.permissions IS '
權限表 - 已新增以下付款系統操作權限：
- payment.paper.manage: 紙本入庫管理（會計專用）
- payment.fee.manage: 手續費管理（出納專用）
- payment.invoice.manage: 發票資訊管理（會計專用）
- payment.invoice.view: 發票資訊查看（主管和審核人員可用）
';
