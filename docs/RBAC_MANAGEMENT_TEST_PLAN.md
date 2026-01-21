# RBAC 權限管理系統測試計劃

## 測試目標

確保 Management Center 中的 RBAC 權限管理介面：
1. **可以正確載入** 所有角色和權限
2. **可以正確操作** 權限的分配和撤銷
3. **確保正確性** 權限變更立即生效且反映到實際系統
4. **安全性驗證** 只有授權用戶才能修改權限

---

## 系統架構確認

### 1. 資料流程

```
前端 PermissionManagement.jsx
    ↓ (查詢)
rbac.roles + rbac.permissions + rbac.role_permissions
    ↓ (顯示 UI)
用戶勾選/取消權限
    ↓ (保存)
DELETE role_permissions WHERE role_id = X
INSERT role_permissions (role_id, permission_id) VALUES ...
    ↓ (RLS 政策檢查)
employees.role = 'admin' OR rbac.user_has_permission(auth.uid(), 'rbac.manage')
    ↓ (成功)
重新載入資料並顯示
```

### 2. 安全機制

**RLS 政策** (`fix_rbac_rls_policies.sql`)：
- ✅ admin 角色可以直接修改權限（檢查 `employees.role = 'admin'`）
- ✅ 有 `rbac.manage` 權限的用戶可以修改
- ✅ 所有已登入用戶可以**讀取**權限資料

**前端權限檢查** (`ManagementCenter.jsx:152`)：
- ✅ 只有有 `rbac.manage` 權限的用戶能看到「權限管理」頁籤

---

## 測試前準備

### 1. 執行角色同步 Migration

```bash
cd /home/user/6owl_door_main_system
supabase db push
```

確保執行了 `fix_role_sync_add_missing_roles.sql`，讓所有員工角色正確同步到 RBAC 系統。

### 2. 驗證角色同步狀態

在 Supabase Dashboard → SQL Editor 執行：

```sql
-- 檢查所有員工的角色同步狀態
SELECT
  e.name as 員工姓名,
  e.email,
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
ORDER BY e.role, e.name;
```

**預期結果**：所有員工都應該顯示「✅ 已同步」

### 3. 確認 admin 角色有 rbac.manage 權限

```sql
-- 檢查 admin 角色的權限
SELECT
  p.code,
  p.name
FROM rbac.role_permissions rp
JOIN rbac.roles r ON rp.role_id = r.id
JOIN rbac.permissions p ON rp.permission_id = p.id
WHERE r.code = 'admin'
  AND p.code = 'rbac.manage';
```

**預期結果**：應該返回一行記錄

如果沒有，執行：

```sql
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin'
  AND p.code = 'rbac.manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

---

## 測試案例

### 測試案例 1：權限管理頁面訪問控制

**目的**：確保只有授權用戶可以看到權限管理頁面

#### 測試步驟：

1. **使用 admin 角色登入**
   - 前往 `/management`
   - **預期**：可以看到「權限管理」頁籤 ✅

2. **使用 staff 角色登入**
   - 前往 `/management`
   - **預期**：不應該看到「權限管理」頁籤 ❌

3. **使用沒有 rbac.manage 權限的角色登入**（例如 accountant）
   - 前往 `/management`
   - **預期**：不應該看到「權限管理」頁籤 ❌

#### 驗證SQL：

```sql
-- 檢查特定用戶是否有 rbac.manage 權限
SELECT rbac.user_has_permission(
  '用戶的 UUID',
  'rbac.manage'
);
```

---

### 測試案例 2：權限資料載入

**目的**：確保權限管理介面可以正確載入所有資料

#### 測試步驟：

1. **點擊「權限管理」頁籤**
2. **檢查「角色管理」分頁**：
   - **預期**：左側顯示所有角色列表（admin, hr, boss, staff, manager 等）
   - **預期**：每個角色顯示其擁有的權限數量

3. **檢查「權限列表」分頁**：
   - **預期**：按模組分組顯示所有權限
   - **預期**：顯示權限代碼、名稱、分類、說明

#### 驗證SQL：

```sql
-- 檢查系統中的角色數量
SELECT COUNT(*) as 角色數量 FROM rbac.roles WHERE deleted_at IS NULL;

-- 檢查系統中的權限數量
SELECT
  module as 模組,
  COUNT(*) as 權限數量
FROM rbac.permissions
WHERE deleted_at IS NULL
GROUP BY module
ORDER BY module;

-- 檢查角色權限分配數量
SELECT
  r.name as 角色,
  COUNT(rp.id) as 權限數量
FROM rbac.roles r
LEFT JOIN rbac.role_permissions rp ON r.id = rp.role_id
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.name
ORDER BY r.level DESC;
```

---

### 測試案例 3：權限分配功能

**目的**：確保可以正確為角色分配權限

#### 測試步驟：

1. **選擇 staff 角色**
2. **記錄當前權限數量**（例如：15 個權限）
3. **勾選一個新權限**（例如：payment.delete）
4. **點擊「保存」按鈕**
   - **預期**：顯示「✅ 已成功更新「一般員工」的權限」
5. **重新載入頁面**
   - **預期**：staff 角色顯示 16 個權限
   - **預期**：payment.delete 權限已被勾選 ✅

#### 驗證SQL（在保存前後執行）：

```sql
-- 檢查 staff 角色的 payment.delete 權限
SELECT
  r.name as 角色,
  p.code as 權限代碼,
  p.name as 權限名稱,
  CASE WHEN rp.id IS NOT NULL THEN '✅ 已分配' ELSE '❌ 未分配' END as 狀態
FROM rbac.roles r
CROSS JOIN rbac.permissions p
LEFT JOIN rbac.role_permissions rp ON (r.id = rp.role_id AND p.id = rp.permission_id)
WHERE r.code = 'staff'
  AND p.code = 'payment.delete';
```

**保存前預期**：❌ 未分配
**保存後預期**：✅ 已分配

---

### 測試案例 4：權限撤銷功能

**目的**：確保可以正確撤銷角色的權限

#### 測試步驟：

1. **選擇 staff 角色**
2. **取消勾選一個現有權限**（例如：payment.cancel）
3. **點擊「保存」按鈕**
4. **重新載入頁面**
   - **預期**：payment.cancel 權限未被勾選 ❌

#### 驗證SQL：

```sql
-- 檢查 staff 角色是否還有 payment.cancel 權限
SELECT
  r.name,
  p.code,
  CASE WHEN rp.id IS NOT NULL THEN '仍然存在' ELSE '已成功撤銷' END as 狀態
FROM rbac.roles r
CROSS JOIN rbac.permissions p
LEFT JOIN rbac.role_permissions rp ON (r.id = rp.role_id AND p.id = rp.permission_id)
WHERE r.code = 'staff'
  AND p.code = 'payment.cancel';
```

---

### 測試案例 5：權限變更即時生效

**目的**：確保權限變更後，實際系統立即反映變更

#### 測試步驟：

1. **使用 admin 帳號**：
   - 為 staff 角色添加 `car.vehicle.create` 權限
   - 保存

2. **使用 staff 帳號登入**（或切換到 staff 帳號）：
   - 前往車輛管理頁面 `/systems/car-rental/vehicles`
   - **預期**：現在應該可以看到「新增車輛」按鈕 ✅

3. **使用 admin 帳號**：
   - 撤銷 staff 角色的 `car.vehicle.create` 權限
   - 保存

4. **staff 帳號重新載入頁面**：
   - **預期**：「新增車輛」按鈕消失 ❌

#### 驗證SQL：

```sql
-- 檢查 staff 用戶是否有 car.vehicle.create 權限
SELECT
  e.name as 員工姓名,
  e.role as 角色,
  rbac.user_has_permission(e.user_id, 'car.vehicle.create') as 是否有權限
FROM employees e
WHERE e.role = 'staff'
  AND e.user_id IS NOT NULL
  AND e.status = 'active'
  AND e.deleted_at IS NULL
LIMIT 5;
```

---

### 測試案例 6：批量權限管理

**目的**：確保可以一次性分配多個權限

#### 測試步驟：

1. **選擇 manager 角色**
2. **勾選整個模組的所有權限**（例如：車輛系統的所有權限）
   - car.vehicle.view
   - car.vehicle.create
   - car.vehicle.edit
   - car.vehicle.delete
   - car.request.view.all
   - car.approve
3. **保存**
4. **驗證**：所有勾選的權限都已正確分配

#### 驗證SQL：

```sql
-- 檢查 manager 角色的車輛系統權限
SELECT
  p.code as 權限代碼,
  p.name as 權限名稱,
  CASE WHEN rp.id IS NOT NULL THEN '✅' ELSE '❌' END as 是否已分配
FROM rbac.permissions p
LEFT JOIN rbac.role_permissions rp ON (
  p.id = rp.permission_id
  AND rp.role_id = (SELECT id FROM rbac.roles WHERE code = 'manager')
)
WHERE p.module = 'car_rental'
ORDER BY p.code;
```

---

### 測試案例 7：非授權用戶無法修改

**目的**：確保 RLS 政策正確阻止非授權修改

#### 測試步驟：

1. **使用 staff 帳號**（沒有 rbac.manage 權限）
2. **嘗試直接呼叫 API 修改權限**（使用瀏覽器 Console）：

```javascript
// 在瀏覽器 Console 執行（應該失敗）
const { error } = await supabase
  .schema('rbac')
  .from('role_permissions')
  .delete()
  .eq('role_id', 'admin的角色ID');

console.log(error);
```

**預期結果**：
- 應該返回權限錯誤
- RLS 政策阻止操作

3. **檢查資料庫**：
   - **預期**：資料沒有被修改

---

### 測試案例 8：UI 狀態正確性

**目的**：確保 UI 正確反映實際權限狀態

#### 測試步驟：

1. **選擇任一角色**（例如 accountant）
2. **不做任何變更，直接點擊「保存」**
   - **預期**：沒有錯誤
   - **預期**：顯示成功訊息
3. **重新載入頁面**
   - **預期**：權限配置與之前完全相同

4. **選擇另一個角色**（例如 cashier）
   - **預期**：顯示該角色的正確權限配置
   - **預期**：之前選擇的角色的編輯狀態已清除

5. **點擊「取消」按鈕**
   - **預期**：返回未選擇狀態
   - **預期**：編輯的權限變更被丟棄

---

## 已知問題和改進建議

### 1. 缺少前端權限檢查

**問題**：`PermissionManagement.jsx` 沒有檢查用戶是否有 `rbac.manage` 權限

**建議**：添加權限檢查

```jsx
// 在組件開頭添加
const { hasPermission: canManage, loading: permLoading } = usePermission('rbac.manage');

if (permLoading) return <Loader />;

if (!canManage) {
  return (
    <div className="text-center py-12">
      <Shield size={48} className="mx-auto text-gray-300 mb-4" />
      <p className="text-gray-600">您沒有權限管理系統權限</p>
      <p className="text-sm text-gray-400">請聯絡系統管理員</p>
    </div>
  );
}
```

### 2. 缺少錯誤處理改進

**問題**：保存失敗時只顯示 alert，沒有詳細的錯誤資訊

**建議**：改進錯誤處理和顯示

```jsx
catch (error) {
  console.error('Error saving permissions:', error);

  // 更詳細的錯誤訊息
  let errorMsg = '保存失敗';
  if (error.message.includes('permission')) {
    errorMsg = '您沒有權限執行此操作';
  } else if (error.message.includes('network')) {
    errorMsg = '網路連線失敗，請檢查網路';
  }

  setError(errorMsg + ': ' + error.message);
}
```

### 3. 缺少載入狀態指示

**問題**：保存時沒有視覺化的載入指示（除了按鈕上的 Loader）

**建議**：添加全局載入遮罩

### 4. 缺少變更確認

**問題**：點擊「取消」時沒有確認，可能誤操作丟失大量變更

**建議**：檢查是否有未保存的變更，如果有則顯示確認對話框

---

## 驗證腳本

創建一個 SQL 腳本來驗證整個系統的正確性：

```sql
-- ============================================
-- RBAC 系統驗證腳本
-- ============================================

-- 1. 檢查所有角色是否存在
SELECT '檢查角色' as 測試項目;
SELECT
  code as 角色代碼,
  name as 角色名稱,
  level as 層級,
  is_active as 是否啟用
FROM rbac.roles
WHERE deleted_at IS NULL
ORDER BY level DESC;

-- 2. 檢查所有權限是否存在
SELECT '檢查權限' as 測試項目;
SELECT
  module as 模組,
  category as 分類,
  COUNT(*) as 權限數量
FROM rbac.permissions
WHERE deleted_at IS NULL
GROUP BY module, category
ORDER BY module, category;

-- 3. 檢查角色權限分配
SELECT '檢查角色權限分配' as 測試項目;
SELECT
  r.code as 角色,
  r.name as 角色名稱,
  COUNT(rp.id) as 權限數量
FROM rbac.roles r
LEFT JOIN rbac.role_permissions rp ON r.id = rp.role_id
WHERE r.deleted_at IS NULL
GROUP BY r.id, r.code, r.name
ORDER BY r.level DESC;

-- 4. 檢查員工角色同步狀態
SELECT '檢查員工角色同步' as 測試項目;
SELECT
  e.role as 員工角色,
  COUNT(*) as 員工數量,
  SUM(CASE WHEN ur.role_id IS NOT NULL THEN 1 ELSE 0 END) as 已同步數量,
  SUM(CASE WHEN ur.role_id IS NULL THEN 1 ELSE 0 END) as 未同步數量
FROM public.employees e
LEFT JOIN rbac.user_roles ur ON e.user_id = ur.user_id
WHERE e.user_id IS NOT NULL
  AND e.deleted_at IS NULL
  AND e.status = 'active'
GROUP BY e.role
ORDER BY e.role;

-- 5. 檢查 RLS 政策
SELECT '檢查 RLS 政策' as 測試項目;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'rbac'
ORDER BY tablename, policyname;

-- 6. 測試權限檢查函數
SELECT '測試權限檢查函數' as 測試項目;
SELECT
  e.name as 員工姓名,
  e.role as 角色,
  rbac.user_has_permission(e.user_id, 'rbac.manage') as 是否有rbac管理權限,
  rbac.user_has_permission(e.user_id, 'payment.create') as 是否有建立付款權限
FROM public.employees e
WHERE e.user_id IS NOT NULL
  AND e.deleted_at IS NULL
  AND e.status = 'active'
LIMIT 10;
```

---

## 總結

完成以上所有測試案例後，應該確保：

✅ 權限管理介面可以正確載入資料
✅ 可以正確分配和撤銷權限
✅ 權限變更立即生效
✅ RLS 政策正確保護資料
✅ UI 狀態正確反映實際權限
✅ 非授權用戶無法修改權限

如果所有測試都通過，則 RBAC 權限管理系統運作正常 ✅
