-- ============================================
-- 新增門店管理系統權限
-- 日期：2026-01-22
-- 目的：為門店管理系統創建完整的權限定義
-- ============================================

-- ============================================
-- 門店管理權限
-- ============================================
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  -- 門店管理相關
  ('store.view', '查看門店列表', '可以查看門店清單', 'store_management', 'read'),
  ('store.create', '新增門店', '可以新增門店', 'store_management', 'write'),
  ('store.edit', '編輯門店資料', '可以編輯門店資訊', 'store_management', 'write'),
  ('store.delete', '刪除門店', '可以刪除門店（軟刪除）', 'store_management', 'delete'),

  -- 品牌管理相關
  ('brand.view', '查看品牌列表', '可以查看品牌清單', 'store_management', 'read'),
  ('brand.create', '新增品牌', '可以新增品牌', 'store_management', 'write'),
  ('brand.edit', '編輯品牌資料', '可以編輯品牌資訊', 'store_management', 'write'),
  ('brand.delete', '刪除品牌', '可以刪除品牌', 'store_management', 'delete')

ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 角色權限分配
-- ============================================

-- 一般員工：只能查看門店和品牌
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'staff'
  AND p.code IN (
    'store.view',
    'brand.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 主管、HR、管理員：可以管理門店和品牌
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code IN ('manager', 'unit_manager', 'hr', 'admin')
  AND p.code IN (
    'store.view',
    'store.create',
    'store.edit',
    'store.delete',
    'brand.view',
    'brand.create',
    'brand.edit',
    'brand.delete'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 說明
-- ============================================
--
-- 門店管理系統權限說明：
-- 1. store.* - 門店管理相關權限
--    - view: 查看門店列表及詳細資訊
--    - create: 新增門店（包含所有欄位：開店日、關店日、證號等）
--    - edit: 編輯門店資訊
--    - delete: 刪除門店（軟刪除，設定 is_active = false）
--
-- 2. brand.* - 品牌管理相關權限
--    - view: 查看品牌列表
--    - create: 新增品牌
--    - edit: 編輯品牌
--    - delete: 刪除品牌
--
-- 預設角色權限分配：
-- - staff: 查看權限（view）
-- - manager/unit_manager/hr/admin: 完整管理權限（view, create, edit, delete）
