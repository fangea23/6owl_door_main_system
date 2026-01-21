# RBAC 角色同步修復說明

## 問題描述

使用者反映以下權限問題：

1. **付款系統**：無法取消、刪除、駁回付款申請
2. **車輛系統**：無法新增和編輯車輛
3. **會議室系統**：有權限但被擋下來無法預約

## 根本原因

**角色同步函數缺少關鍵角色映射**

在 `sync_employee_roles_to_rbac()` 觸發器函數中，只映射了以下角色：
- admin, hr, boss, unit_manager, accountant, audit_manager, cashier, user

**缺少了：**
- `staff` (一般員工)
- `manager` (主管)

這導致 employees 表中 role 為 'staff' 或 'manager' 的員工，無法被同步到 `rbac.user_roles` 表，因此**完全沒有任何權限**。

## 系統運作方式

```
employees.role → (觸發器) → rbac.user_roles → rbac.role_permissions → 權限檢查
     ↓
  'staff'    →    sync 函數   →   user_roles   →   role_permissions  →  有權限 ✅
  'manager'  →    sync 函數   →   user_roles   →   role_permissions  →  有權限 ✅

  如果沒有映射：
  'staff'    →    sync 函數   →   (無映射)     →   (無角色)         →  無權限 ❌
```

### 關鍵組件

1. **employees 表** - 儲存員工基本資料和 role 欄位
2. **觸發器** - `trigger_sync_employee_role_to_rbac` 監聽 employees 表變更
3. **同步函數** - `sync_employee_role_to_rbac()` 將 role 映射到 RBAC
4. **權限檢查** - `rbac.user_has_permission()` 查詢 user_roles 和 role_permissions

## 修復方案

### 檔案：`fix_role_sync_add_missing_roles.sql`

此 migration 執行以下操作：

1. **更新觸發器函數** - 添加 'staff' 和 'manager' 角色映射
2. **重新同步所有員工** - 補救性地為所有現有員工同步角色
3. **驗證同步結果** - 輸出詳細的同步狀態報告

### 修復後的角色映射

```sql
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
```

## 部署步驟

### 1. 執行 Migration

```bash
# 推送到 Supabase
supabase db push

# 或手動執行 SQL
# 登入 Supabase Dashboard → SQL Editor
# 執行：supabase/migrations/fix_role_sync_add_missing_roles.sql
```

### 2. 檢查執行結果

Migration 執行時會輸出詳細日誌：

```
========================================
角色同步完成：
  ✅ 成功同步：25 位員工
  ❌ 失敗：0 位員工
========================================

員工角色分配檢查：
========================================
✅ 已同步：張三 (員工角色：staff, RBAC角色：一般員工)
✅ 已同步：李四 (員工角色：manager, RBAC角色：主管)
...
========================================
✅ 所有員工角色已正確同步到 RBAC 系統
========================================
```

### 3. 驗證修復

#### 方法 1：在 Supabase Dashboard SQL Editor 執行

```sql
-- 檢查員工角色同步狀態
SELECT
  e.name as 員工姓名,
  e.employee_id as 員工編號,
  e.role as 員工角色,
  r.name as RBAC角色,
  CASE
    WHEN ur.role_id IS NULL THEN '❌ 未同步'
    ELSE '✅ 已同步'
  END as 同步狀態
FROM public.employees e
LEFT JOIN rbac.user_roles ur ON e.user_id = ur.user_id
LEFT JOIN rbac.roles r ON ur.role_id = r.id
WHERE e.user_id IS NOT NULL
  AND e.deleted_at IS NULL
  AND e.status = 'active'
ORDER BY e.name;

-- 檢查特定員工的權限
SELECT *
FROM rbac.get_user_permissions('員工的 user_id UUID');

-- 測試權限檢查
SELECT rbac.user_has_permission(
  '員工的 user_id UUID',
  'meeting.booking.create'  -- 測試會議室預約權限
);
```

#### 方法 2：在前端測試

1. **以 staff 角色員工登入**
2. **檢查功能是否正常**：
   - ✅ 可以建立付款申請
   - ✅ 可以取消自己的付款申請
   - ✅ 可以查看車輛清單
   - ✅ 可以預約會議室
   - ✅ 可以預約租車

3. **以 manager 角色員工登入**
4. **檢查管理功能**：
   - ✅ 可以新增/編輯車輛
   - ✅ 可以審核租車申請
   - ✅ 可以管理會議室

## 權限配置總覽

### Staff 角色權限（一般員工）

| 模組 | 權限 | 說明 |
|------|------|------|
| 付款系統 | payment.create | 建立付款申請 |
| | payment.view.own | 查看自己的申請 |
| | payment.cancel | 取消申請 |
| 車輛系統 | car.vehicle.view | 查看車輛清單 |
| | car.request.create | 建立租車申請 |
| | car.request.view.own | 查看自己的租車申請 |
| | car.request.cancel.own | 取消自己的租車申請 |
| 會議室系統 | meeting.room.view | 查看會議室清單 |
| | meeting.booking.create | 建立會議室預約 |
| | meeting.booking.view.own | 查看自己的預約 |
| | meeting.booking.cancel.own | 取消自己的預約 |

### Manager 角色權限（主管）

包含所有 staff 權限，額外增加：

| 模組 | 權限 | 說明 |
|------|------|------|
| 車輛系統 | car.vehicle.create | 新增車輛 |
| | car.vehicle.edit | 編輯車輛 |
| | car.vehicle.delete | 刪除車輛 |
| | car.approve | 審核租車申請 |
| 會議室系統 | meeting.room.create | 新增會議室 |
| | meeting.room.edit | 編輯會議室 |
| | meeting.booking.cancel.all | 取消任何人的預約 |

## 故障排除

### 如果員工仍然沒有權限

#### 1. 檢查員工的 user_id 是否存在

```sql
SELECT user_id, role, status
FROM employees
WHERE email = '員工Email';
```

- 如果 `user_id` 是 NULL → 需要創建用戶帳號並關聯
- 如果 `status` 不是 'active' → 需要啟用員工

#### 2. 手動觸發同步

```sql
-- 更新員工的 role 欄位（觸發同步）
UPDATE employees
SET role = role  -- 更新為相同值以觸發 trigger
WHERE user_id = '員工的 UUID'
  AND status = 'active';

-- 檢查是否已同步
SELECT * FROM rbac.user_roles WHERE user_id = '員工的 UUID';
```

#### 3. 檢查角色是否存在於 RBAC

```sql
SELECT code, name FROM rbac.roles;
```

應該看到：admin, hr, boss, unit_manager, accountant, audit_manager, cashier, **manager**, **staff**, user

#### 4. 檢查權限是否已分配給角色

```sql
SELECT * FROM rbac.v_role_permissions
WHERE role_code = 'staff'
ORDER BY module, permission_code;
```

應該看到 payment、car、meeting 等模組的權限

## 技術細節

### 觸發器運作方式

```sql
-- 觸發條件
AFTER INSERT OR UPDATE OF user_id, role, status, deleted_at ON public.employees

-- 觸發時機
1. 新增員工
2. 員工的 user_id 變更（關聯到用戶帳號）
3. 員工的 role 變更
4. 員工的 status 變更
5. 員工被軟刪除/恢復
```

### 同步邏輯

1. **檢查條件**：user_id 不是 NULL、status 是 'active'、deleted_at 是 NULL
2. **映射角色**：根據 employees.role 查找對應的 rbac.roles
3. **刪除舊角色**：刪除該用戶的所有 user_roles 記錄
4. **插入新角色**：插入新的 user_roles 記錄

**注意**：每個用戶在當前實作中只能有一個角色（觸發器會刪除所有舊角色再插入新的）

## 預防措施

### 未來添加新角色時

當需要在 employees 表中添加新的 role 值時，請記得：

1. **在 `rbac.roles` 表中創建對應角色**

```sql
INSERT INTO rbac.roles (code, name, description, level, is_system)
VALUES ('new_role', '新角色名稱', '角色描述', 30, true);
```

2. **更新 `sync_employee_role_to_rbac()` 函數**

在 CASE 語句中添加新的映射：

```sql
WHEN 'new_role' THEN 'new_role'
```

3. **為新角色分配權限**

```sql
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'new_role'
  AND p.code IN ('permission1', 'permission2', ...);
```

4. **重新同步員工**（如果已有員工使用這個角色）

```sql
UPDATE employees SET role = role
WHERE role = 'new_role' AND user_id IS NOT NULL;
```

## 相關文件

- [RBAC 整合指南](./RBAC_INTEGRATION_GUIDE.md) - 如何在前端使用權限
- [RBAC 實際範例](./RBAC_EXAMPLES.md) - 程式碼範例
- [RBAC 整合狀態](./RBAC_INTEGRATION_STATUS.md) - 整合進度

---

**修復日期**：2026-01-21
**修復分支**：`claude/add-rbac-permissions-zRoG5`
**Migration 檔案**：`fix_role_sync_add_missing_roles.sql`
