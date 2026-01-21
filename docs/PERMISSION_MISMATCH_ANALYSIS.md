# RBAC 權限不匹配問題分析

## 問題總結

用戶報告「有些擋住我了 但是 我明明就有權限」- 即使擁有權限仍被阻擋。

經過調查，發現存在 **新舊權限代碼並存** 的問題，導致組件檢查的權限代碼與用戶實際擁有的權限代碼不匹配。

---

## 根本原因

系統中存在兩套權限代碼體系：

### 1️⃣ 舊權限代碼 (create_rbac_system.sql)

```sql
-- 車輛相關
'vehicle.view'      -- 查看車輛
'vehicle.book'      -- 租借車輛
'vehicle.approve'   -- 核准租車
'vehicle.manage'    -- 管理車輛

-- 會議室相關
'meeting.view'      -- 查看會議室
'meeting.book'      -- 預約會議室
'meeting.approve'   -- 核准會議室
'meeting.manage'    -- 管理會議室
```

**分配給 'staff' 角色的舊權限：**
- `vehicle.view`
- `vehicle.book`
- `meeting.view`
- `meeting.book`

### 2️⃣ 新權限代碼 (add_car_meeting_permissions.sql)

```sql
-- 車輛租借系統
'car.request.create'        -- 建立租車申請
'car.request.view.own'      -- 查看自己的申請
'car.request.view.all'      -- 查看所有申請
'car.request.cancel.own'    -- 取消自己的申請
'car.request.edit.own'      -- 編輯自己的申請
'car.approve'               -- 審核租車申請
'car.reject'                -- 駁回租車申請
'car.rental.pickup'         -- 執行取車操作
'car.rental.return'         -- 執行還車操作
'car.rental.view.all'       -- 查看所有租借記錄
'car.rental.view.own'       -- 查看自己的租借
'car.vehicle.create'        -- 新增車輛
'car.vehicle.edit'          -- 編輯車輛資料
'car.vehicle.delete'        -- 刪除車輛
'car.vehicle.view'          -- 查看車輛清單

-- 會議室系統
'meeting.booking.create'        -- 建立會議室預約
'meeting.booking.view.own'      -- 查看自己的預約
'meeting.booking.view.all'      -- 查看所有預約
'meeting.booking.cancel.own'    -- 取消自己的預約
'meeting.booking.cancel.all'    -- 取消任何預約
'meeting.booking.edit.own'      -- 編輯自己的預約
'meeting.room.create'           -- 新增會議室
'meeting.room.edit'             -- 編輯會議室
'meeting.room.delete'           -- 刪除會議室
'meeting.room.view'             -- 查看會議室清單
```

**分配給 'staff' 角色的新權限：**
- `car.request.create`
- `car.request.view.own`
- `car.request.cancel.own`
- `car.request.edit.own`
- `car.rental.view.own`
- `car.vehicle.view`
- `meeting.booking.create`
- `meeting.booking.view.own`
- `meeting.booking.cancel.own`
- `meeting.booking.edit.own`
- `meeting.room.view`

**分配給 'manager'/'admin' 角色的新權限：**
- `car.approve`
- `car.reject`
- `car.rental.pickup`
- `car.rental.return`
- `car.rental.view.all`
- `car.request.view.all`
- `car.vehicle.create` ⚠️
- `car.vehicle.edit` ⚠️
- `car.vehicle.delete` ⚠️
- `meeting.booking.view.all`
- `meeting.booking.cancel.all`
- `meeting.room.create`
- `meeting.room.edit`
- `meeting.room.delete`

---

## 組件實際檢查的權限

### 車輛系統 (Vehicles.jsx)
```javascript
const { hasPermission: canCreate } = usePermission('car.vehicle.create');   // ❌ 只有 manager/admin
const { hasPermission: canEdit } = usePermission('car.vehicle.edit');       // ❌ 只有 manager/admin
const { hasPermission: canDelete } = usePermission('car.vehicle.delete');   // ❌ 只有 manager/admin
```

### 租車申請 (RentalRequests.jsx)
```javascript
const { hasPermission: canCreate } = usePermission('car.request.create');   // ✅ staff 有此權限
const { hasPermission: canApprove } = usePermission('car.approve');         // ❌ 只有 manager/admin
const { hasPermission: canViewAll } = usePermission('car.request.view.all'); // ❌ 只有 manager/admin
```

### 會議室預約 (BookingForm.jsx, Dashboard.jsx)
```javascript
const { hasPermission: canCreate } = usePermission('meeting.booking.create');      // ✅ staff 有此權限
const { hasPermission: canEdit } = usePermission('meeting.booking.edit.own');      // ✅ staff 有此權限
const { hasPermission: canCancelOwn } = usePermission('meeting.booking.cancel.own'); // ✅ staff 有此權限
const { hasPermission: canCancelAll } = usePermission('meeting.booking.cancel.all'); // ❌ 只有 manager/admin
```

---

## 具體問題案例

### 問題 1：車輛管理功能消失

**用戶報告：**「現在無法新增車輛以及編輯車輛」

**原因：**
- Vehicles.jsx 組件檢查 `car.vehicle.create` 和 `car.vehicle.edit` 權限
- 這些權限 **只分配給 'manager' 和 'admin' 角色**
- 如果用戶的 `employees.role` 是 'staff'，就算他們認為自己應該有權限，也會被阻擋

**影響：**
- ❌ 新增車輛按鈕不顯示（因為 `!canCreate`）
- ❌ 編輯車輛按鈕不顯示（因為 `!canEdit`）
- ❌ 刪除車輛按鈕不顯示（因為 `!canDelete`）

### 問題 2：會議室預約可能被阻擋

**用戶報告：**「我明明有預約會議室的權限 但是我卻被擋了下來」

**可能原因：**
1. 用戶的角色不是 'staff'、'manager' 或 'admin'（例如是 'user' 或其他角色）
2. 角色同步函數沒有正確執行（例如員工的 role 是 'staff' 但沒有被同步到 rbac.user_roles）
3. 用戶想使用 `meeting.booking.cancel.all` 等管理功能，但只有 manager/admin 才有

---

## 數據庫權限定義狀態

### ✅ 權限已定義

所有組件檢查的權限代碼都已在數據庫中定義：

| 權限代碼 | 模組 | 是否定義 | 分配給哪些角色 |
|---------|------|---------|----------------|
| `car.vehicle.create` | car_rental | ✅ | manager, admin |
| `car.vehicle.edit` | car_rental | ✅ | manager, admin |
| `car.vehicle.delete` | car_rental | ✅ | manager, admin |
| `car.vehicle.view` | car_rental | ✅ | staff, manager, admin |
| `car.request.create` | car_rental | ✅ | staff, manager, admin |
| `car.request.view.own` | car_rental | ✅ | staff, manager, admin |
| `car.request.view.all` | car_rental | ✅ | manager, admin |
| `car.approve` | car_rental | ✅ | manager, admin |
| `meeting.booking.create` | meeting_room | ✅ | staff, manager, admin |
| `meeting.booking.edit.own` | meeting_room | ✅ | staff, manager, admin |
| `meeting.booking.cancel.own` | meeting_room | ✅ | staff, manager, admin |
| `meeting.booking.cancel.all` | meeting_room | ✅ | manager, admin |

### ⚠️ 舊權限代碼仍然存在

這些舊代碼沒有被組件使用，但仍在數據庫中：

| 舊權限代碼 | 建議對應的新代碼 |
|-----------|----------------|
| `vehicle.view` | `car.vehicle.view` |
| `vehicle.book` | `car.request.create` |
| `vehicle.approve` | `car.approve` |
| `vehicle.manage` | `car.vehicle.create`, `car.vehicle.edit`, `car.vehicle.delete` |
| `meeting.view` | `meeting.room.view` |
| `meeting.book` | `meeting.booking.create` |
| `meeting.approve` | - |
| `meeting.manage` | `meeting.room.create`, `meeting.room.edit`, `meeting.room.delete` |

---

## 為什麼會被阻擋？

用戶被阻擋的可能原因（按可能性排序）：

### 1. 角色權限不足 ⭐⭐⭐⭐⭐ (最可能)

**情境：**
- 用戶的 `employees.role` = 'staff'
- 但想要新增/編輯車輛
- `car.vehicle.create` 和 `car.vehicle.edit` 只分配給 manager/admin

**解決方案：**
- 在 Management Center 的 RBAC 權限管理中，手動將 `car.vehicle.create` 和 `car.vehicle.edit` 分配給 'staff' 角色
- 或者將該員工的角色改為 'manager' 或 'admin'

### 2. 角色同步失敗 ⭐⭐⭐⭐

**情境：**
- 用戶的 `employees.role` = 'manager'
- 但 `rbac.user_roles` 表中沒有對應記錄
- 觸發器 `sync_employee_role_to_rbac()` 沒有正確執行

**檢查方法：**
```sql
-- 查看用戶的 RBAC 角色分配
SELECT
  e.name,
  e.employee_id,
  e.role as employee_role,
  r.code as rbac_role
FROM employees e
LEFT JOIN rbac.user_roles ur ON e.user_id = ur.user_id
LEFT JOIN rbac.roles r ON ur.role_id = r.id
WHERE e.user_id = '{用戶的 user_id}';
```

**解決方案：**
- 已提供 `fix_role_sync_add_missing_roles.sql` 修復遷移
- 執行該遷移會重新同步所有員工

### 3. 員工角色代碼拼寫錯誤 ⭐⭐⭐

**情境：**
- `employees.role` = 'stuff'（拼錯字）或其他非標準值
- 觸發器無法映射到 RBAC 角色

**檢查方法：**
```sql
-- 查看所有獨特的員工角色值
SELECT DISTINCT role, COUNT(*)
FROM employees
WHERE deleted_at IS NULL
GROUP BY role;
```

**解決方案：**
- 修正員工記錄中的 role 字段
- 確保只使用標準角色：admin, hr, boss, unit_manager, accountant, audit_manager, cashier, manager, staff, user

### 4. 權限檢查邏輯錯誤 ⭐⭐

**情境：**
- `rbac.user_has_permission()` 函數有 bug
- RLS 策略阻擋了權限查詢

**檢查方法：**
```sql
-- 直接測試權限檢查函數
SELECT rbac.user_has_permission(
  '{用戶的 user_id}'::UUID,
  'car.vehicle.create'
);
```

**解決方案：**
- 需要檢查並修復 `user_has_permission()` 函數
- 檢查 RLS 策略是否正確

### 5. 前端快取問題 ⭐

**情境：**
- 權限已更新，但前端還在使用舊的快取

**解決方案：**
- 重新整理頁面
- 清除瀏覽器快取
- 重新登入

---

## 下一步行動

### 立即行動（必須）

1. ✅ **識別用戶實際角色和權限**
   - 查詢用戶的 `employees.role`
   - 查詢用戶的 `rbac.user_roles`
   - 查詢用戶實際擁有的權限

2. ✅ **執行角色同步修復遷移**
   - 運行 `fix_role_sync_add_missing_roles.sql`
   - 確保所有員工角色正確同步

3. ⚠️ **清理舊權限代碼**（可選但建議）
   - 移除或標記已棄用的舊權限代碼
   - 確保沒有組件或 RLS 策略仍在使用舊代碼

### 中期行動（建議）

4. **優化權限分配策略**
   - 根據實際業務需求調整權限分配
   - 考慮創建更細緻的角色（例如 'vehicle_manager'）

5. **改善 Management Center UI**
   - 顯示權限代碼和描述
   - 提供更清晰的角色權限總覽
   - 允許管理員自定義權限分配

### 長期行動（改進）

6. **建立權限遷移策略**
   - 當更新權限代碼時，提供遷移路徑
   - 自動檢測並警告權限代碼不匹配

7. **開發權限調試工具**
   - 創建 SQL 函數或管理界面，顯示用戶被阻擋的原因
   - 記錄權限檢查失敗的日誌

---

## 結論

用戶被阻擋的根本原因是：

> **組件檢查的新權限代碼（如 `car.vehicle.create`）只分配給了 'manager' 和 'admin' 角色，而不是所有需要這些功能的用戶角色。**

這不是系統錯誤，而是 **權限設計決策**。解決方案取決於業務需求：

- **選項 A**：允許 'staff' 角色管理車輛 → 在 Management Center 中將 `car.vehicle.*` 權限分配給 'staff' 角色
- **選項 B**：將需要管理權限的員工角色改為 'manager' → 更新 `employees.role`
- **選項 C**：創建新的專門角色（如 'vehicle_manager'）→ 新增角色並分配適當權限

用戶提到「要什麼權限不重要 我會自己選擇」，因此建議 **確保 Management Center 的 RBAC 管理功能完全正常**，讓用戶可以自行調整權限分配。
