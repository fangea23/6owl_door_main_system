-- ============================================
-- 權限管理系統 (RBAC - Role-Based Access Control)
-- ============================================

CREATE SCHEMA IF NOT EXISTS rbac;

-- ============================================================================
-- 1. 權限表 (permissions)
-- ============================================================================
CREATE TABLE rbac.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 權限識別
  code VARCHAR(100) UNIQUE NOT NULL,           -- 權限代碼 (例如：payment.approve)
  name VARCHAR(200) NOT NULL,                  -- 權限名稱
  description TEXT,                            -- 權限描述

  -- 分類
  module VARCHAR(100) NOT NULL,                -- 所屬模組 (payment, vehicle, meeting, etc.)
  category VARCHAR(100),                       -- 分類 (read, write, approve, delete)

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 軟刪除
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_permissions_module ON rbac.permissions(module) WHERE deleted_at IS NULL;
CREATE INDEX idx_permissions_code ON rbac.permissions(code) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. 角色表 (roles)
-- ============================================================================
CREATE TABLE rbac.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 角色識別
  code VARCHAR(50) UNIQUE NOT NULL,            -- 角色代碼 (例如：accountant)
  name VARCHAR(100) NOT NULL,                  -- 角色名稱
  description TEXT,                            -- 角色描述

  -- 層級
  level INTEGER DEFAULT 0,                     -- 角色層級（數字越大權限越高）

  -- 狀態
  is_active BOOLEAN DEFAULT true,              -- 是否啟用
  is_system BOOLEAN DEFAULT false,             -- 是否系統內建（不可刪除）

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- 索引
CREATE INDEX idx_roles_code ON rbac.roles(code) WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. 角色權限關聯表 (role_permissions)
-- ============================================================================
CREATE TABLE rbac.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯
  role_id UUID NOT NULL REFERENCES rbac.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES rbac.permissions(id) ON DELETE CASCADE,

  -- 授權資訊
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),

  -- 確保同一角色不會重複授予同一權限
  UNIQUE(role_id, permission_id)
);

-- 索引
CREATE INDEX idx_role_permissions_role ON rbac.role_permissions(role_id);
CREATE INDEX idx_role_permissions_permission ON rbac.role_permissions(permission_id);

-- ============================================================================
-- 4. 用戶角色關聯表 (user_roles) - 支援一個用戶多個角色
-- ============================================================================
CREATE TABLE rbac.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES rbac.roles(id) ON DELETE CASCADE,

  -- 授權資訊
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,         -- 角色到期時間（可選）

  -- 確保同一用戶不會重複分配同一角色
  UNIQUE(user_id, role_id)
);

-- 索引
CREATE INDEX idx_user_roles_user ON rbac.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON rbac.user_roles(role_id);

-- ============================================================================
-- 5. 用戶直接權限表 (user_permissions) - 特殊授權
-- ============================================================================
CREATE TABLE rbac.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES rbac.permissions(id) ON DELETE CASCADE,

  -- 授權類型
  grant_type VARCHAR(20) DEFAULT 'grant',      -- grant（授予）或 deny（拒絕）

  -- 授權資訊
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMP WITH TIME ZONE,         -- 權限到期時間（可選）
  reason TEXT,                                 -- 授權原因

  -- 確保同一用戶不會重複授予同一權限
  UNIQUE(user_id, permission_id)
);

-- 索引
CREATE INDEX idx_user_permissions_user ON rbac.user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission ON rbac.user_permissions(permission_id);

-- ============================================================================
-- 6. 權限檢查函數
-- ============================================================================

-- 檢查用戶是否有某個權限
CREATE OR REPLACE FUNCTION rbac.user_has_permission(
  p_user_id UUID,
  p_permission_code VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rbac, public, pg_temp
AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  -- 1. 檢查是否有直接拒絕權限
  IF EXISTS (
    SELECT 1 FROM rbac.user_permissions up
    JOIN rbac.permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
      AND p.code = p_permission_code
      AND up.grant_type = 'deny'
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  ) THEN
    RETURN FALSE;
  END IF;

  -- 2. 檢查是否有直接授予權限
  IF EXISTS (
    SELECT 1 FROM rbac.user_permissions up
    JOIN rbac.permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id
      AND p.code = p_permission_code
      AND up.grant_type = 'grant'
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  ) THEN
    RETURN TRUE;
  END IF;

  -- 3. 檢查角色權限
  SELECT EXISTS (
    SELECT 1
    FROM rbac.user_roles ur
    JOIN rbac.roles r ON ur.role_id = r.id
    JOIN rbac.role_permissions rp ON r.id = rp.role_id
    JOIN rbac.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.code = p_permission_code
      AND r.is_active = true
      AND r.deleted_at IS NULL
      AND p.deleted_at IS NULL
      AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
  ) INTO v_has_permission;

  RETURN COALESCE(v_has_permission, FALSE);
END;
$$;

-- 獲取用戶的所有權限
CREATE OR REPLACE FUNCTION rbac.get_user_permissions(p_user_id UUID)
RETURNS TABLE(
  permission_code VARCHAR,
  permission_name VARCHAR,
  source VARCHAR  -- 'role' 或 'direct'
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rbac, public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  -- 來自角色的權限
  SELECT DISTINCT
    p.code,
    p.name,
    'role'::VARCHAR
  FROM rbac.user_roles ur
  JOIN rbac.roles r ON ur.role_id = r.id
  JOIN rbac.role_permissions rp ON r.id = rp.role_id
  JOIN rbac.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id
    AND r.is_active = true
    AND r.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())

  UNION

  -- 直接授予的權限
  SELECT DISTINCT
    p.code,
    p.name,
    'direct'::VARCHAR
  FROM rbac.user_permissions up
  JOIN rbac.permissions p ON up.permission_id = p.id
  WHERE up.user_id = p_user_id
    AND up.grant_type = 'grant'
    AND p.deleted_at IS NULL
    AND (up.expires_at IS NULL OR up.expires_at > NOW());
END;
$$;

-- ============================================================================
-- 7. 初始化權限資料
-- ============================================================================

-- 插入系統角色
INSERT INTO rbac.roles (code, name, description, level, is_system) VALUES
  ('admin', '系統管理員', '擁有所有權限', 100, true),
  ('hr', '人資', '管理員工和人事相關功能', 80, true),
  ('boss', '放行主管', '最終決策者', 90, true),
  ('audit_manager', '審核主管', '審核付款申請', 70, true),
  ('accountant', '會計', '處理財務相關事務', 60, true),
  ('cashier', '出納', '處理撥款', 60, true),
  ('unit_manager', '單位主管', '管理部門事務', 50, true),
  ('manager', '主管', '一般主管', 40, true),
  ('staff', '一般員工', '基本員工權限', 20, true),
  ('user', '一般使用者', '最基本權限', 10, true)
ON CONFLICT (code) DO NOTHING;

-- 插入權限（付款系統）
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  -- 查看權限
  ('payment.view', '查看付款申請', '可以查看付款申請列表', 'payment', 'read'),
  ('payment.view.own', '查看自己的付款申請', '只能查看自己提交的申請', 'payment', 'read'),
  ('payment.view.all', '查看所有付款申請', '可以查看所有人的申請', 'payment', 'read'),

  -- 創建權限
  ('payment.create', '創建付款申請', '可以提交新的付款申請', 'payment', 'write'),

  -- 審核權限
  ('payment.approve.manager', '主管簽核', '單位主管簽核權限', 'payment', 'approve'),
  ('payment.approve.accountant', '會計審核', '會計審核權限', 'payment', 'approve'),
  ('payment.approve.audit', '審核主管簽核', '審核主管簽核權限', 'payment', 'approve'),
  ('payment.approve.cashier', '出納撥款', '出納撥款權限', 'payment', 'approve'),
  ('payment.approve.boss', '放行決行', '最終放行權限', 'payment', 'approve'),

  -- 其他操作
  ('payment.reject', '駁回申請', '可以駁回付款申請', 'payment', 'write'),
  ('payment.cancel', '取消申請', '可以取消付款申請', 'payment', 'write'),
  ('payment.delete', '刪除申請', '可以刪除付款申請', 'payment', 'delete'),

  -- 租車系統
  ('vehicle.view', '查看車輛', '可以查看車輛列表', 'vehicle', 'read'),
  ('vehicle.book', '租借車輛', '可以提交租車申請', 'vehicle', 'write'),
  ('vehicle.approve', '核准租車', '可以核准租車申請', 'vehicle', 'approve'),
  ('vehicle.manage', '管理車輛', '可以新增/編輯/刪除車輛', 'vehicle', 'write'),

  -- 會議室系統
  ('meeting.view', '查看會議室', '可以查看會議室列表', 'meeting', 'read'),
  ('meeting.book', '預約會議室', '可以預約會議室', 'meeting', 'write'),
  ('meeting.approve', '核准會議室', '可以核准會議室預約', 'meeting', 'approve'),
  ('meeting.manage', '管理會議室', '可以新增/編輯/刪除會議室', 'meeting', 'write'),

  -- 員工管理
  ('employee.view', '查看員工', '可以查看員工列表', 'employee', 'read'),
  ('employee.create', '新增員工', '可以新增員工', 'employee', 'write'),
  ('employee.edit', '編輯員工', '可以編輯員工資料', 'employee', 'write'),
  ('employee.delete', '刪除員工', '可以刪除員工', 'employee', 'delete'),

  -- 權限管理
  ('rbac.view', '查看權限設定', '可以查看角色和權限設定', 'rbac', 'read'),
  ('rbac.manage', '管理權限', '可以分配角色和權限', 'rbac', 'write')
ON CONFLICT (code) DO NOTHING;

-- 為角色分配權限（範例）
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin'  -- 管理員擁有所有權限
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 會計權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'accountant'
  AND p.code IN (
    'payment.view.all',
    'payment.approve.accountant',
    'payment.reject'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 出納權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'cashier'
  AND p.code IN (
    'payment.view.all',
    'payment.approve.cashier'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 一般員工權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'staff'
  AND p.code IN (
    'payment.create',
    'payment.view.own',
    'payment.cancel',
    'vehicle.view',
    'vehicle.book',
    'meeting.view',
    'meeting.book'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================================================
-- 8. 視圖：方便查詢
-- ============================================================================

-- 角色權限視圖
CREATE OR REPLACE VIEW rbac.v_role_permissions AS
SELECT
  r.code as role_code,
  r.name as role_name,
  p.code as permission_code,
  p.name as permission_name,
  p.module,
  p.category
FROM rbac.roles r
JOIN rbac.role_permissions rp ON r.id = rp.role_id
JOIN rbac.permissions p ON rp.permission_id = p.id
WHERE r.deleted_at IS NULL AND p.deleted_at IS NULL;

-- 用戶權限視圖
CREATE OR REPLACE VIEW rbac.v_user_permissions AS
SELECT
  u.id as user_id,
  u.email,
  e.name as employee_name,
  r.code as role_code,
  r.name as role_name,
  p.code as permission_code,
  p.name as permission_name,
  'role' as source
FROM auth.users u
JOIN rbac.user_roles ur ON u.id = ur.user_id
JOIN rbac.roles r ON ur.role_id = r.id
JOIN rbac.role_permissions rp ON r.id = rp.role_id
JOIN rbac.permissions p ON rp.permission_id = p.id
LEFT JOIN public.employees e ON e.user_id = u.id
WHERE r.deleted_at IS NULL
  AND p.deleted_at IS NULL
  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())

UNION ALL

SELECT
  u.id as user_id,
  u.email,
  e.name as employee_name,
  NULL as role_code,
  NULL as role_name,
  p.code as permission_code,
  p.name as permission_name,
  'direct' as source
FROM auth.users u
JOIN rbac.user_permissions up ON u.id = up.user_id
JOIN rbac.permissions p ON up.permission_id = p.id
LEFT JOIN public.employees e ON e.user_id = u.id
WHERE p.deleted_at IS NULL
  AND up.grant_type = 'grant'
  AND (up.expires_at IS NULL OR up.expires_at > NOW());

-- ============================================================================
-- 9. RLS 設定
-- ============================================================================
ALTER TABLE rbac.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rbac.user_permissions ENABLE ROW LEVEL SECURITY;

-- 所有人可以讀取權限和角色（但不能修改）
CREATE POLICY "Anyone can view permissions" ON rbac.permissions
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

CREATE POLICY "Anyone can view roles" ON rbac.roles
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- 只有有權限管理權限的人可以修改
CREATE POLICY "Only rbac managers can modify" ON rbac.role_permissions
  FOR ALL USING (rbac.user_has_permission(auth.uid(), 'rbac.manage'));

CREATE POLICY "Only rbac managers can modify user roles" ON rbac.user_roles
  FOR ALL USING (rbac.user_has_permission(auth.uid(), 'rbac.manage'));

-- ============================================================================
-- 完成！
-- ============================================================================
COMMENT ON SCHEMA rbac IS '基於角色的存取控制系統 (Role-Based Access Control)';
COMMENT ON FUNCTION rbac.user_has_permission(UUID, VARCHAR) IS '檢查用戶是否擁有特定權限';
COMMENT ON FUNCTION rbac.get_user_permissions(UUID) IS '獲取用戶的所有權限列表';
