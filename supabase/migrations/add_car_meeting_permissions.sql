-- ============================================
-- 新增車輛租借系統和會議室系統權限
-- 日期：2026-01-21
-- 目的：為車輛租借和會議室系統創建完整的權限定義
-- ============================================

-- ============================================
-- 車輛租借系統權限
-- ============================================
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  -- 租借申請相關
  ('car.request.create', '建立租車申請', '可以提交新的租車申請', 'car_rental', 'write'),
  ('car.request.view.own', '查看自己的申請', '查看自己提交的租車申請', 'car_rental', 'read'),
  ('car.request.view.all', '查看所有申請', '查看所有人的租車申請（管理員）', 'car_rental', 'read'),
  ('car.request.cancel.own', '取消自己的申請', '可以取消自己的租車申請', 'car_rental', 'write'),
  ('car.request.edit.own', '編輯自己的申請', '可以編輯自己的草稿申請', 'car_rental', 'write'),

  -- 審核相關
  ('car.approve', '審核租車申請', '可以核准或拒絕租車申請', 'car_rental', 'approve'),
  ('car.reject', '駁回租車申請', '可以駁回租車申請', 'car_rental', 'approve'),

  -- 租借記錄管理
  ('car.rental.pickup', '執行取車操作', '可以執行取車確認操作（管理員）', 'car_rental', 'write'),
  ('car.rental.return', '執行還車操作', '可以執行還車處理操作（管理員）', 'car_rental', 'write'),
  ('car.rental.view.all', '查看所有租借記錄', '可以查看所有租借記錄', 'car_rental', 'read'),
  ('car.rental.view.own', '查看自己的租借', '查看自己的租借記錄', 'car_rental', 'read'),

  -- 車輛管理
  ('car.vehicle.create', '新增車輛', '可以新增車輛到系統中', 'car_rental', 'write'),
  ('car.vehicle.edit', '編輯車輛資料', '可以編輯車輛資訊', 'car_rental', 'write'),
  ('car.vehicle.delete', '刪除車輛', '可以刪除車輛（軟刪除）', 'car_rental', 'delete'),
  ('car.vehicle.view', '查看車輛清單', '可以查看所有車輛', 'car_rental', 'read')

ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 會議室系統權限
-- ============================================
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  -- 會議室預約相關
  ('meeting.booking.create', '建立會議室預約', '可以預約會議室', 'meeting_room', 'write'),
  ('meeting.booking.view.own', '查看自己的預約', '查看自己的會議室預約', 'meeting_room', 'read'),
  ('meeting.booking.view.all', '查看所有預約', '查看所有會議室預約', 'meeting_room', 'read'),
  ('meeting.booking.cancel.own', '取消自己的預約', '可以取消自己的會議室預約', 'meeting_room', 'write'),
  ('meeting.booking.cancel.all', '取消任何預約', '可以取消任何人的預約（管理員）', 'meeting_room', 'write'),
  ('meeting.booking.edit.own', '編輯自己的預約', '可以編輯自己的預約', 'meeting_room', 'write'),

  -- 會議室管理
  ('meeting.room.create', '新增會議室', '可以新增會議室', 'meeting_room', 'write'),
  ('meeting.room.edit', '編輯會議室', '可以編輯會議室資料', 'meeting_room', 'write'),
  ('meeting.room.delete', '刪除會議室', '可以刪除會議室', 'meeting_room', 'delete'),
  ('meeting.room.view', '查看會議室清單', '可以查看會議室清單', 'meeting_room', 'read')

ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 角色權限分配
-- ============================================

-- 一般員工：租車和預約會議室的基本權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'staff'
  AND p.code IN (
    -- 租車權限
    'car.request.create',
    'car.request.view.own',
    'car.request.cancel.own',
    'car.request.edit.own',
    'car.rental.view.own',
    'car.vehicle.view',
    -- 會議室權限
    'meeting.booking.create',
    'meeting.booking.view.own',
    'meeting.booking.cancel.own',
    'meeting.booking.edit.own',
    'meeting.room.view'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 車輛管理員角色（如果存在）或使用 manager 角色
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code IN ('manager', 'admin')
  AND p.code IN (
    -- 租車審核和管理
    'car.approve',
    'car.reject',
    'car.rental.pickup',
    'car.rental.return',
    'car.rental.view.all',
    'car.request.view.all',
    'car.vehicle.create',
    'car.vehicle.edit',
    'car.vehicle.delete',
    -- 會議室管理
    'meeting.booking.view.all',
    'meeting.booking.cancel.all',
    'meeting.room.create',
    'meeting.room.edit',
    'meeting.room.delete'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 管理員：所有權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin'
  AND (p.module = 'car_rental' OR p.module = 'meeting_room')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 創建車輛管理員角色（如果不存在）
-- ============================================
INSERT INTO rbac.roles (code, name, description, level, is_system) VALUES
  ('car_admin', '車輛管理員', '管理車輛和租借申請', 60, true)
ON CONFLICT (code) DO NOTHING;

-- 為車輛管理員分配所有車輛相關權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'car_admin'
  AND p.module = 'car_rental'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 創建會議室管理員角色（如果不存在）
-- ============================================
INSERT INTO rbac.roles (code, name, description, level, is_system) VALUES
  ('meeting_admin', '會議室管理員', '管理會議室和預約', 50, true)
ON CONFLICT (code) DO NOTHING;

-- 為會議室管理員分配所有會議室相關權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'meeting_admin'
  AND p.module = 'meeting_room'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ============================================
-- 完成！
-- ============================================
COMMENT ON TABLE rbac.permissions IS '
權限表 - 已新增車輛租借和會議室系統權限：

車輛租借系統：
- car.request.* : 租借申請相關權限
- car.approve/reject : 審核權限
- car.rental.* : 租借記錄管理權限
- car.vehicle.* : 車輛管理權限

會議室系統：
- meeting.booking.* : 會議室預約權限
- meeting.room.* : 會議室管理權限
';
