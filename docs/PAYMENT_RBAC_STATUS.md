# 付款系統 RBAC 整合檢查報告

## ✅ 已完成的部分

### 1. **Dashboard.jsx** - 付款申請總覽
**整合狀態**: ✅ 完成

**權限使用**:
- `payment.create` - 顯示「新增申請」按鈕
- `payment.view.all` - 查看所有申請
- `payment.view.own` - 查看自己的申請
- `payment.approve.manager` - 主管審核
- `payment.approve.accountant` - 會計審核（含紙本入庫）
- `payment.approve.audit` - 審核主管
- `payment.approve.cashier` - 出納撥款
- `payment.approve.boss` - 放行決行

**控制點**:
- ✅ 視圖模式（待辦/全部）基於審核權限
- ✅ 資料篩選基於權限
- ✅ 紙本入庫按鈕權限控制
- ✅ 批量操作權限控制（已完整實現）
- ✅ 新增申請按鈕權限控制

### 2. **RequestDetail.jsx** - 付款申請詳情
**整合狀態**: ✅ 完成

**權限使用**:
- `payment.approve.*` - 各階段審核權限
- `payment.reject` - 駁回權限
- `payment.cancel` - 撤銷權限
- `payment.create` - 修改/重新提交權限

**控制點**:
- ✅ 審核按鈕顯示（基於當前狀態 + 權限）
- ✅ 會計補登發票區域
- ✅ 出納手續費輸入
- ✅ 申請人撤銷/修改（基於 requester_id + 權限）

### 3. **ApplyForm.jsx** - 建立申請表單
**整合狀態**: ✅ 完成

**權限使用**:
- `payment.create` - 建立付款申請權限

**控制點**:
- ✅ 頁面級別權限檢查
- ✅ 權限載入中顯示載入動畫
- ✅ 無權限時顯示友好提示訊息
- ✅ 提示用戶需要的權限代碼

### 4. **ProtectedRoute.jsx** - 路由保護
**整合狀態**: ✅ 正確（不需修改）

**說明**:
- 只負責檢查用戶是否登入
- 具體權限在各頁面內部檢查（正確做法）

---

## ✅ 前端 RBAC 整合已全部完成！

付款系統所有前端頁面和操作現已完整整合 RBAC 權限系統：

- ✅ **Dashboard.jsx** - 總覽頁（包含批量操作）
- ✅ **RequestDetail.jsx** - 詳情頁
- ✅ **ApplyForm.jsx** - 建立申請表單
- ✅ **新增申請按鈕** - 權限控制
- ✅ **批量核准功能** - 權限檢查
- ✅ **批量駁回功能** - 權限檢查
- ✅ **紙本入庫** - 權限控制

---

## ⚠️ 建議但非必要的增強項目

### 1. **資料訪問權限（RLS）**
**位置**: 資料庫層級

**說明**:
前端權限控制已完成，資料庫層級的 Row Level Security (RLS) 可作為額外的安全防護層。

**建議添加**:
```sql
-- 範例：只有相關人員可以查看付款申請
CREATE POLICY "Users can view relevant payment requests"
ON payment_approval.payment_requests
FOR SELECT
USING (
  -- 申請人本人
  requester_id = auth.uid()
  OR
  -- 有查看所有權限
  rbac.user_has_permission(auth.uid(), 'payment.view.all')
  OR
  -- 當前狀態的負責人
  (status = 'pending_accountant' AND rbac.user_has_permission(auth.uid(), 'payment.approve.accountant'))
);
```

---

## 🎯 如何將新功能納入 RBAC - 完整流程

### 步驟 1: 定義權限（資料庫遷移）

創建新的遷移檔案 `supabase/migrations/add_xxx_permissions.sql`：

```sql
-- ==========================================
-- 新增 XXX 功能權限
-- ==========================================

-- 1. 定義權限
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  ('xxx.view', '查看XXX', '可以查看XXX列表', 'xxx', 'read'),
  ('xxx.create', '建立XXX', '可以建立新的XXX', 'xxx', 'write'),
  ('xxx.edit', '編輯XXX', '可以修改XXX資料', 'xxx', 'write'),
  ('xxx.delete', '刪除XXX', '可以刪除XXX', 'xxx', 'delete'),
  ('xxx.approve', '審核XXX', '可以審核XXX申請', 'xxx', 'approve')
ON CONFLICT (code) DO NOTHING;

-- 2. 為管理員分配所有權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin' AND p.module = 'xxx'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. 為特定角色分配權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'specific_role'
  AND p.code IN ('xxx.view', 'xxx.create')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 4. 執行遷移
-- 在 Supabase Dashboard 或使用 CLI 執行此檔案
```

### 步驟 2: 前端組件集成

#### A. 頁面級別保護（整個頁面需要權限）

```jsx
// src/xxx/pages/XxxList.jsx
import { usePermission } from '../../../hooks/usePermission';
import { Shield } from 'lucide-react';

export default function XxxList() {
  const { hasPermission: canView, loading } = usePermission('xxx.view');

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!canView) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Shield size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">無訪問權限</h2>
          <p className="text-gray-500">您沒有查看此頁面的權限</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 頁面內容 */}
    </div>
  );
}
```

#### B. 按鈕/功能級別保護（部分功能需要權限）

```jsx
import { PermissionGuard } from '../../../hooks/usePermission';

export default function XxxDashboard() {
  const { hasPermission: canCreate } = usePermission('xxx.create');
  const { hasPermission: canApprove } = usePermission('xxx.approve');

  return (
    <div>
      {/* 方式 1: 使用 PermissionGuard 組件 */}
      <PermissionGuard permission="xxx.create">
        <button onClick={handleCreate}>
          ➕ 建立新項目
        </button>
      </PermissionGuard>

      {/* 方式 2: 使用條件渲染 */}
      {canApprove && (
        <section>
          <h2>待審核項目</h2>
          <ApprovalList />
        </section>
      )}

      {/* 方式 3: 禁用按鈕（保留但不可點擊）*/}
      <button
        onClick={handleDelete}
        disabled={!canDelete}
        className={!canDelete ? 'opacity-50 cursor-not-allowed' : ''}
        title={!canDelete ? '您沒有刪除權限' : ''}
      >
        🗑️ 刪除
      </button>
    </div>
  );
}
```

#### C. 複雜權限邏輯

```jsx
import { usePermissions } from '../../../hooks/usePermission';

export default function XxxDetail({ item }) {
  const { user } = useAuth();

  // 批量檢查多個權限
  const { results } = usePermissions([
    'xxx.edit',
    'xxx.delete',
    'xxx.approve'
  ]);

  // 自定義邏輯：只有創建者或有特殊權限才能編輯
  const canEdit = item.creator_id === user?.id || results['xxx.edit'];
  const canDelete = results['xxx.delete'];
  const canApprove = results['xxx.approve'] && item.status === 'pending';

  return (
    <div>
      {canEdit && <button>編輯</button>}
      {canDelete && <button>刪除</button>}
      {canApprove && <button>審核</button>}
    </div>
  );
}
```

### 步驟 3: 資料庫層級保護（可選但推薦）

```sql
-- 創建 RLS 政策
CREATE POLICY "xxx_view_policy"
ON xxx_schema.xxx_table
FOR SELECT
USING (
  -- 創建者本人
  creator_id = auth.uid()
  OR
  -- 有查看權限
  rbac.user_has_permission(auth.uid(), 'xxx.view')
);

CREATE POLICY "xxx_create_policy"
ON xxx_schema.xxx_table
FOR INSERT
WITH CHECK (
  rbac.user_has_permission(auth.uid(), 'xxx.create')
);

CREATE POLICY "xxx_update_policy"
ON xxx_schema.xxx_table
FOR UPDATE
USING (
  -- 創建者本人 OR 有編輯權限
  creator_id = auth.uid()
  OR rbac.user_has_permission(auth.uid(), 'xxx.edit')
);

CREATE POLICY "xxx_delete_policy"
ON xxx_schema.xxx_table
FOR DELETE
USING (
  rbac.user_has_permission(auth.uid(), 'xxx.delete')
);

-- 啟用 RLS
ALTER TABLE xxx_schema.xxx_table ENABLE ROW LEVEL SECURITY;
```

### 步驟 4: 在權限管理 UI 中分配

1. 登入管理中心
2. 進入「權限管理」頁籤
3. 選擇角色
4. 在「XXX」模組下勾選需要的權限
5. 儲存

### 步驟 5: 測試

```javascript
// 開發環境除錯工具
import { useUserPermissions } from '../hooks/usePermission';

function DebugPermissions() {
  const { permissions } = useUserPermissions();

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <details className="fixed bottom-4 right-4 bg-white p-4 rounded shadow-lg">
      <summary>🔧 權限除錯 ({permissions.length})</summary>
      <ul className="mt-2 max-h-60 overflow-y-auto text-xs">
        {permissions.map(p => (
          <li key={p.permission_code}>
            {p.permission_code} ({p.source})
          </li>
        ))}
      </ul>
    </details>
  );
}
```

---

## 📝 快速檢查清單

新功能整合 RBAC 時，檢查以下項目：

- [ ] **資料庫**：定義權限（permissions 表）
- [ ] **資料庫**：為角色分配權限（role_permissions 表）
- [ ] **資料庫**：創建 RLS 政策（可選）
- [ ] **前端**：匯入 `usePermission` 或 `PermissionGuard`
- [ ] **前端**：頁面級別保護（如需要）
- [ ] **前端**：按鈕級別保護
- [ ] **前端**：條件渲染敏感資料
- [ ] **測試**：以不同角色登入測試
- [ ] **測試**：確認無權限時的降級體驗
- [ ] **文檔**：更新權限列表文檔

---

## 💡 最佳實踐

### 1. 權限命名規範
```
{模組}.{動作}.{範圍}

✅ 好的命名：
payment.view.all       // 查看所有付款
payment.view.own       // 查看自己的付款
payment.approve.boss   // 放行決行

❌ 不好的命名：
boss_approve           // 這是角色不是權限
payment                // 太籠統
```

### 2. 權限粒度
```
太粗：一個權限控制所有功能 ❌
太細：每個按鈕一個權限 ❌
剛好：按業務操作分類 ✅
```

### 3. 優雅降級
```jsx
// ❌ 不好：直接隱藏
{canEdit && <button>編輯</button>}

// ✅ 好：提供提示
<button
  disabled={!canEdit}
  title={!canEdit ? '您沒有編輯權限，請聯絡管理員' : ''}
>
  編輯
</button>
```

### 4. 性能優化
```jsx
// ❌ 不好：在循環中多次調用
items.map(item => {
  const { hasPermission } = usePermission('xxx.edit');
  return <ItemCard canEdit={hasPermission} />;
});

// ✅ 好：在外層檢查一次
const { hasPermission: canEdit } = usePermission('xxx.edit');
return items.map(item => <ItemCard canEdit={canEdit} />);
```

---

## 🔗 相關資源

- `docs/RBAC_INTEGRATION_GUIDE.md` - 完整整合指南
- `docs/RBAC_EXAMPLES.md` - 實際代碼範例
- `src/hooks/usePermission.js` - 權限檢查 Hook
- `supabase/migrations/create_rbac_system.sql` - RBAC 資料庫架構
