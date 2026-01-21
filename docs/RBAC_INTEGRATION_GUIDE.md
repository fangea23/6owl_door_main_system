# RBAC 權限系統整合指南

這份文件說明如何在現有和新的功能中整合 RBAC (Role-Based Access Control) 權限系統。

## 📋 目錄

1. [快速開始](#快速開始)
2. [在 React 組件中使用權限](#在-react-組件中使用權限)
3. [在後端查詢中使用權限](#在後端查詢中使用權限)
4. [添加新權限](#添加新權限)
5. [實際範例](#實際範例)
6. [最佳實踐](#最佳實踐)

---

## 快速開始

### 1. 檢查用戶是否有權限

```jsx
import { usePermission } from '../hooks/usePermission';

function MyComponent() {
  const { hasPermission, loading } = usePermission('payment.create');

  if (loading) return <Loader />;

  if (!hasPermission) {
    return <div>您沒有權限訪問此功能</div>;
  }

  return <div>功能內容...</div>;
}
```

### 2. 條件渲染（隱藏無權限的按鈕）

```jsx
import { PermissionGuard } from '../hooks/usePermission';

function MyComponent() {
  return (
    <div>
      {/* 只有有權限的人才能看到這個按鈕 */}
      <PermissionGuard permission="payment.approve.accountant">
        <button>審核付款</button>
      </PermissionGuard>

      {/* 其他人看不到這個按鈕 */}
    </div>
  );
}
```

### 3. 批量權限檢查

```jsx
import { usePermissions } from '../hooks/usePermission';

function MyComponent() {
  // 檢查是否有任一權限（OR 邏輯）
  const { hasPermission } = usePermissions(
    ['payment.view.all', 'payment.view.own'],
    'any'
  );

  // 檢查是否有所有權限（AND 邏輯）
  const { hasPermission: hasAllPerms } = usePermissions(
    ['payment.create', 'payment.approve.manager'],
    'all'
  );

  return <div>...</div>;
}
```

---

## 在 React 組件中使用權限

### 方式 1：使用 Hook 條件渲染

**適用場景**：需要根據權限顯示不同內容

```jsx
import { usePermission } from '../hooks/usePermission';

function PaymentDashboard() {
  const { hasPermission: canCreate } = usePermission('payment.create');
  const { hasPermission: canApprove } = usePermission('payment.approve.accountant');

  return (
    <div>
      {canCreate && (
        <button onClick={createPayment}>建立付款申請</button>
      )}

      {canApprove && (
        <section>
          <h2>待審核區域</h2>
          {/* 審核相關功能 */}
        </section>
      )}
    </div>
  );
}
```

### 方式 2：使用 PermissionGuard 組件

**適用場景**：簡單的顯示/隱藏邏輯

```jsx
import { PermissionGuard } from '../hooks/usePermission';

function PaymentActions({ requestId }) {
  return (
    <div className="flex gap-2">
      <PermissionGuard permission="payment.approve.accountant">
        <button onClick={() => approve(requestId)}>
          ✅ 核准
        </button>
      </PermissionGuard>

      <PermissionGuard permission="payment.reject">
        <button onClick={() => reject(requestId)}>
          ❌ 駁回
        </button>
      </PermissionGuard>

      <PermissionGuard permission="payment.delete">
        <button onClick={() => deleteRequest(requestId)}>
          🗑️ 刪除
        </button>
      </PermissionGuard>
    </div>
  );
}
```

### 方式 3：路由層級保護

**適用場景**：整個頁面需要權限才能訪問

```jsx
import { usePermission } from '../hooks/usePermission';
import { Navigate } from 'react-router-dom';

function ProtectedPage() {
  const { hasPermission, loading } = usePermission('rbac.manage');

  if (loading) {
    return <LoadingScreen />;
  }

  if (!hasPermission) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <div>
      {/* 頁面內容 */}
    </div>
  );
}
```

### 方式 4：動態權限檢查（取得所有權限）

**適用場景**：需要根據用戶的完整權限列表動態調整 UI

```jsx
import { useUserPermissions } from '../hooks/usePermission';

function DynamicMenu() {
  const { permissions, loading } = useUserPermissions();

  if (loading) return <Loader />;

  // 將權限轉換為 Set 以便快速查找
  const permSet = new Set(permissions.map(p => p.permission_code));

  const menuItems = [
    {
      label: '建立付款',
      permission: 'payment.create',
      path: '/payment/create'
    },
    {
      label: '會計審核',
      permission: 'payment.approve.accountant',
      path: '/payment/approve'
    },
    {
      label: '權限管理',
      permission: 'rbac.manage',
      path: '/management/permissions'
    },
  ];

  return (
    <nav>
      {menuItems
        .filter(item => permSet.has(item.permission))
        .map(item => (
          <a key={item.path} href={item.path}>
            {item.label}
          </a>
        ))
      }
    </nav>
  );
}
```

---

## 在後端查詢中使用權限

### 方式 1：使用 RPC 函數檢查權限

```jsx
async function handleApprovePayment(requestId) {
  // 1. 先檢查權限
  const { data: hasPermission } = await supabase.rpc('user_has_permission', {
    p_user_id: user.id,
    p_permission_code: 'payment.approve.accountant'
  });

  if (!hasPermission) {
    alert('您沒有審核權限');
    return;
  }

  // 2. 執行操作
  const { error } = await supabase
    .from('payment_requests')
    .update({ status: 'approved' })
    .eq('id', requestId);

  if (error) {
    console.error('審核失敗:', error);
  }
}
```

### 方式 2：在資料庫層級使用權限（RLS 政策）

**在遷移檔案中**：

```sql
-- 範例：只有有 payment.approve.accountant 權限的人可以更新狀態為 pending_accountant 的申請
CREATE POLICY "Accountants can approve payments"
ON payment_approval.payment_requests
FOR UPDATE
USING (
  status = 'pending_accountant'
  AND rbac.user_has_permission(auth.uid(), 'payment.approve.accountant')
);
```

---

## 添加新權限

### 步驟 1：創建遷移檔案

創建新的遷移檔案（例如 `add_new_permissions.sql`）：

```sql
-- 添加新權限到 rbac.permissions 表
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  ('inventory.view', '查看庫存', '可以查看庫存列表', 'inventory', 'read'),
  ('inventory.create', '新增庫存', '可以新增庫存項目', 'inventory', 'write'),
  ('inventory.edit', '編輯庫存', '可以修改庫存資料', 'inventory', 'write'),
  ('inventory.delete', '刪除庫存', '可以刪除庫存項目', 'inventory', 'delete'),
  ('inventory.approve', '核准調撥', '可以核准庫存調撥申請', 'inventory', 'approve')
ON CONFLICT (code) DO NOTHING;

-- 為角色分配權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin'  -- 管理員擁有所有權限
  AND p.module = 'inventory'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 為倉管員分配特定權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  r.id,
  p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'warehouse_manager'
  AND p.code IN ('inventory.view', 'inventory.edit', 'inventory.approve')
ON CONFLICT (role_id, permission_id) DO NOTHING;
```

### 步驟 2：在前端使用新權限

```jsx
import { usePermission } from '../hooks/usePermission';

function InventoryPage() {
  const { hasPermission: canView } = usePermission('inventory.view');
  const { hasPermission: canCreate } = usePermission('inventory.create');
  const { hasPermission: canApprove } = usePermission('inventory.approve');

  if (!canView) {
    return <div>您沒有權限查看庫存</div>;
  }

  return (
    <div>
      <h1>庫存管理</h1>

      {canCreate && (
        <button>➕ 新增庫存</button>
      )}

      {canApprove && (
        <section>待核准項目...</section>
      )}
    </div>
  );
}
```

---

## 實際範例

### 範例 1：付款系統整合

#### 修改前（基於角色字串）

```jsx
function PaymentDashboard() {
  const { role } = useAuth();

  return (
    <div>
      {role === 'accountant' && (
        <button>審核付款</button>
      )}

      {role === 'boss' && (
        <button>最終決行</button>
      )}
    </div>
  );
}
```

#### 修改後（使用 RBAC）

```jsx
import { PermissionGuard } from '../../../hooks/usePermission';

function PaymentDashboard() {
  return (
    <div>
      <PermissionGuard permission="payment.approve.accountant">
        <button>審核付款</button>
      </PermissionGuard>

      <PermissionGuard permission="payment.approve.boss">
        <button>最終決行</button>
      </PermissionGuard>
    </div>
  );
}
```

**優點**：
- ✅ 更細粒度的控制（可以讓非會計角色也有審核權限）
- ✅ 易於調整（在資料庫中修改，無需改代碼）
- ✅ 支援臨時權限（例如代理審核）

### 範例 2：管理中心頁籤權限

#### 修改前

```jsx
const tabs = [
  { id: 'profiles', name: '用戶帳號', component: ProfilesManagement },
  { id: 'employees', name: '員工資料', component: EmployeesManagement },
  // ...
];
```

#### 修改後

```jsx
import { useUserPermissions } from '../../hooks/usePermission';

function ManagementCenter() {
  const { permissions, loading } = useUserPermissions();

  if (loading) return <Loader />;

  const permSet = new Set(permissions.map(p => p.permission_code));

  const allTabs = [
    {
      id: 'profiles',
      name: '用戶帳號',
      component: ProfilesManagement,
      requiredPermission: 'employee.view'
    },
    {
      id: 'employees',
      name: '員工資料',
      component: EmployeesManagement,
      requiredPermission: 'employee.edit'
    },
    {
      id: 'permissions',
      name: '權限管理',
      component: PermissionManagement,
      requiredPermission: 'rbac.manage'
    },
  ];

  // 只顯示用戶有權限的頁籤
  const tabs = allTabs.filter(tab =>
    !tab.requiredPermission || permSet.has(tab.requiredPermission)
  );

  return (
    <div>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
          {tab.name}
        </button>
      ))}

      {/* 渲染選中的頁籤內容 */}
    </div>
  );
}
```

### 範例 3：資料查詢權限控制

```jsx
import { usePermission } from '../hooks/usePermission';

function PaymentRequestsList() {
  const { hasPermission: canViewAll } = usePermission('payment.view.all');
  const { hasPermission: canViewOwn } = usePermission('payment.view.own');
  const { user } = useAuth();

  const fetchRequests = async () => {
    let query = supabase.from('payment_requests').select('*');

    if (canViewAll) {
      // 可以看所有人的申請
      query = query.order('created_at', { ascending: false });
    } else if (canViewOwn) {
      // 只能看自己的申請
      query = query.eq('requester_id', user.id);
    } else {
      // 沒有任何查看權限
      return [];
    }

    const { data } = await query;
    return data;
  };

  // ...
}
```

---

## 最佳實踐

### 1. 權限命名規範

遵循 `{模組}.{動作}.{範圍}` 的格式：

```
✅ 好的命名：
- payment.create          // 建立付款
- payment.view.all        // 查看所有付款
- payment.view.own        // 查看自己的付款
- payment.approve.accountant  // 會計審核
- vehicle.book            // 預約車輛
- rbac.manage             // 管理權限

❌ 不好的命名：
- create_payment          // 使用底線而非點號
- payment                 // 太籠統
- accountant              // 這是角色不是權限
```

### 2. 權限粒度設計

**太粗**：
```
❌ system.admin  // 一個權限控制所有功能
```

**太細**：
```
❌ payment.button.create.click  // 過度細分
```

**剛好**：
```
✅ payment.create        // 建立功能
✅ payment.view.all      // 查看所有
✅ payment.approve.manager  // 主管審核
```

### 3. 性能優化

**❌ 不好**：在列表循環中多次調用權限檢查

```jsx
function PaymentList({ requests }) {
  return requests.map(req => {
    const { hasPermission } = usePermission('payment.approve');  // ❌ 每個項目都調用
    return <PaymentItem request={req} canApprove={hasPermission} />;
  });
}
```

**✅ 好**：在外層檢查一次

```jsx
function PaymentList({ requests }) {
  const { hasPermission } = usePermission('payment.approve');  // ✅ 只調用一次

  return requests.map(req => (
    <PaymentItem request={req} canApprove={hasPermission} />
  ));
}
```

### 4. 優雅降級

當用戶沒有權限時，提供有用的反饋：

```jsx
import { usePermission } from '../hooks/usePermission';

function PaymentCreateButton() {
  const { hasPermission, loading } = usePermission('payment.create');

  if (loading) {
    return <button disabled>載入中...</button>;
  }

  if (!hasPermission) {
    return (
      <button
        disabled
        title="您沒有建立付款申請的權限，請聯絡管理員"
        className="opacity-50 cursor-not-allowed"
      >
        🔒 建立付款（無權限）
      </button>
    );
  }

  return (
    <button onClick={createPayment}>
      ➕ 建立付款
    </button>
  );
}
```

### 5. 開發環境除錯

在開發環境中顯示用戶的所有權限：

```jsx
import { useUserPermissions } from '../hooks/usePermission';

function DevPermissionDebugger() {
  const { permissions } = useUserPermissions();

  if (process.env.NODE_ENV !== 'development') {
    return null;  // 生產環境不顯示
  }

  return (
    <details className="border p-4">
      <summary>🔧 權限除錯器</summary>
      <pre>{JSON.stringify(permissions, null, 2)}</pre>
    </details>
  );
}
```

---

## 常見問題

### Q1: 權限檢查會影響性能嗎？

A: 權限檢查結果會被 React Hook 快取，相同的權限檢查不會重複查詢資料庫。但仍建議：
- 在組件外層檢查一次，而非在循環中重複檢查
- 使用 `useUserPermissions()` 一次取得所有權限，然後用 Set 查找

### Q2: 如何處理動態權限？

A: 例如「只能編輯自己創建的申請」：

```jsx
function PaymentItem({ request }) {
  const { user } = useAuth();
  const { hasPermission: canEditAll } = usePermission('payment.edit.all');
  const { hasPermission: canEditOwn } = usePermission('payment.edit.own');

  const canEdit = canEditAll || (canEditOwn && request.requester_id === user.id);

  return (
    <div>
      {canEdit && <button>編輯</button>}
    </div>
  );
}
```

### Q3: 如何為臨時角色分配權限？

A: 使用 `rbac.user_permissions` 表直接分配：

```sql
INSERT INTO rbac.user_permissions (user_id, permission_id, grant_type, expires_at, reason)
SELECT
  '用戶UUID',
  p.id,
  'grant',
  NOW() + INTERVAL '7 days',  -- 7天後過期
  '代理會計審核'
FROM rbac.permissions p
WHERE p.code = 'payment.approve.accountant';
```

### Q4: 如何測試權限系統？

A: 在 Supabase Dashboard 的 SQL Editor 中：

```sql
-- 檢查特定用戶的權限
SELECT * FROM rbac.get_user_permissions('用戶UUID');

-- 測試權限檢查
SELECT rbac.user_has_permission('用戶UUID', 'payment.approve.accountant');

-- 查看角色的所有權限
SELECT * FROM rbac.v_role_permissions WHERE role_code = 'accountant';
```

---

## 遷移步驟總結

1. **執行資料庫遷移**
   - `create_rbac_system.sql` - 創建 RBAC 架構
   - `sync_employee_roles_to_rbac.sql` - 同步現有角色
   - `fix_rbac_rls_policies.sql` - 修復 RLS 政策

2. **修改前端代碼**
   - 將 `role === 'xxx'` 改為 `usePermission('xxx.yyy')`
   - 將條件渲染改為 `<PermissionGuard>`

3. **測試**
   - 使用不同角色登入測試
   - 確認權限按預期運作
   - 檢查無權限時的降級體驗

4. **調整權限**
   - 在權限管理頁面為角色分配權限
   - 測試權限變更即時生效

---

## 下一步

- 閱讀 `src/hooks/usePermission.js` 了解 Hook 實現細節
- 查看 `src/pages/management/components/PermissionManagement.jsx` 了解權限管理 UI
- 參考本文件中的實際範例修改您的組件

有問題或建議請聯絡系統管理員。
