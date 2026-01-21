# RBAC 實際集成示例

本文件展示如何將現有組件升級為使用 RBAC 權限系統。

## 📦 範例 1：付款系統 Dashboard

### 修改前的代碼

```jsx
// src/system/payment_system/src/pages/Dashboard.jsx
export default function Dashboard() {
  const { user, role } = useAuth();
  const currentRole = role || 'staff';

  // 基於角色字串的權限檢查
  const canApprove = ['accountant', 'boss', 'cashier'].includes(currentRole);

  return (
    <div>
      {currentRole === 'accountant' && (
        <button onClick={handleApprove}>審核付款</button>
      )}

      {currentRole === 'boss' && (
        <button onClick={handleFinalApprove}>最終決行</button>
      )}
    </div>
  );
}
```

### 修改後的代碼（使用 RBAC）

```jsx
// src/system/payment_system/src/pages/Dashboard.jsx
import { usePermission, PermissionGuard } from '../../../../hooks/usePermission';

export default function Dashboard() {
  const { user } = useAuth();

  // 使用權限而非角色
  const { hasPermission: canCreate } = usePermission('payment.create');
  const { hasPermission: canViewAll } = usePermission('payment.view.all');
  const { hasPermission: canViewOwn } = usePermission('payment.view.own');

  const { hasPermission: canApproveAccountant } = usePermission('payment.approve.accountant');
  const { hasPermission: canApproveBoss } = usePermission('payment.approve.boss');

  return (
    <div>
      {/* 建立按鈕 - 只有有權限的人可以看到 */}
      <PermissionGuard permission="payment.create">
        <button onClick={handleCreate}>
          ➕ 建立付款申請
        </button>
      </PermissionGuard>

      {/* 會計審核區 */}
      <PermissionGuard permission="payment.approve.accountant">
        <section className="bg-blue-50 p-6">
          <h2>待會計審核</h2>
          <PaymentList status="pending_accountant" onApprove={handleApprove} />
        </section>
      </PermissionGuard>

      {/* 放行決行區 */}
      <PermissionGuard permission="payment.approve.boss">
        <section className="bg-red-50 p-6">
          <h2>待放行決行</h2>
          <PaymentList status="pending_boss" onApprove={handleFinalApprove} />
        </section>
      </PermissionGuard>

      {/* 歷史記錄 - 根據權限決定能看到什麼 */}
      <section>
        <h2>付款記錄</h2>
        <PaymentList
          viewMode={canViewAll ? 'all' : 'own'}
          userId={canViewOwn && !canViewAll ? user.id : null}
        />
      </section>
    </div>
  );
}
```

### 關鍵改進

1. **更靈活**：可以為非會計角色的人臨時授予審核權限
2. **更細粒度**：區分「查看所有」和「查看自己的」權限
3. **易於擴展**：添加新的審核層級只需在資料庫中添加權限，不用改代碼

---

## 📦 範例 2：管理中心動態頁籤

### 修改前的代碼

```jsx
// src/pages/management/ManagementCenter.jsx
export default function ManagementCenter() {
  const { role } = useAuth();

  const tabs = [
    { id: 'profiles', name: '用戶帳號', component: ProfilesManagement },
    { id: 'employees', name: '員工資料', component: EmployeesManagement },
    { id: 'departments', name: '部門管理', component: DepartmentsManagement },
    { id: 'permissions', name: '權限管理', component: PermissionManagement },
  ];

  // 簡單的角色檢查
  if (role !== 'admin' && role !== 'hr') {
    return <div>您沒有權限訪問此頁面</div>;
  }

  return (
    <div>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)}>
          {tab.name}
        </button>
      ))}
    </div>
  );
}
```

### 修改後的代碼（使用 RBAC）

```jsx
// src/pages/management/ManagementCenter.jsx
import { useUserPermissions } from '../../hooks/usePermission';

export default function ManagementCenter() {
  const { permissions, loading } = useUserPermissions();
  const [activeTab, setActiveTab] = useState(null);

  if (loading) {
    return <LoadingScreen />;
  }

  // 轉換為 Set 以便快速查找
  const permSet = new Set(permissions.map(p => p.permission_code));

  // 定義所有頁籤及其所需權限
  const allTabs = [
    {
      id: 'profiles',
      name: '用戶帳號',
      icon: Users,
      description: '管理系統登入帳號',
      component: ProfilesManagement,
      requiredPermission: 'employee.view'
    },
    {
      id: 'employees',
      name: '員工資料',
      icon: Briefcase,
      description: '管理員工組織架構資訊',
      component: EmployeesManagement,
      requiredPermission: 'employee.edit'
    },
    {
      id: 'departments',
      name: '部門管理',
      icon: Building2,
      description: '管理公司部門架構',
      component: DepartmentsManagement,
      requiredPermission: 'employee.edit'
    },
    {
      id: 'accountant-brands',
      name: '會計品牌分配',
      icon: BadgeDollarSign,
      description: '管理會計人員負責的品牌',
      component: AccountantBrandsManagement,
      requiredPermission: 'employee.edit'
    },
    {
      id: 'permissions',
      name: '權限管理',
      icon: Key,
      description: '管理系統角色和權限設定',
      component: PermissionManagement,
      requiredPermission: 'rbac.manage'
    },
  ];

  // 過濾出用戶有權限訪問的頁籤
  const accessibleTabs = allTabs.filter(tab =>
    !tab.requiredPermission || permSet.has(tab.requiredPermission)
  );

  // 如果用戶沒有任何可訪問的頁籤
  if (accessibleTabs.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield size={64} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">
            無訪問權限
          </h2>
          <p className="text-gray-500">
            您目前沒有權限訪問管理中心的任何功能
          </p>
          <p className="text-sm text-gray-400 mt-2">
            請聯絡系統管理員申請權限
          </p>
        </div>
      </div>
    );
  }

  // 設定預設頁籤
  if (!activeTab) {
    setActiveTab(accessibleTabs[0].id);
  }

  const ActiveComponent = accessibleTabs.find(t => t.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-800">管理中心</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 頁籤導航 */}
        <div className="flex gap-2 border-b border-gray-200 mb-6">
          {accessibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700'
              }`}
            >
              <tab.icon size={18} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* 頁籤內容 */}
        <div>
          {ActiveComponent && <ActiveComponent />}
        </div>
      </div>
    </div>
  );
}
```

### 關鍵改進

1. **動態頁籤**：根據用戶權限動態顯示可訪問的頁籤
2. **優雅降級**：沒有權限時顯示友好的提示訊息
3. **易於擴展**：添加新頁籤只需在 `allTabs` 數組中添加即可

---

## 📦 範例 3：批量操作權限控制

### 場景：付款申請批量審核

```jsx
// src/system/payment_system/src/components/PaymentBatchActions.jsx
import { usePermission } from '../../../../hooks/usePermission';

export default function PaymentBatchActions({ selectedRequests, onRefresh }) {
  const { hasPermission: canApprove } = usePermission('payment.approve.accountant');
  const { hasPermission: canReject } = usePermission('payment.reject');
  const { hasPermission: canDelete } = usePermission('payment.delete');

  const [processing, setProcessing] = useState(false);

  const handleBatchApprove = async () => {
    if (!canApprove) {
      alert('您沒有批量審核的權限');
      return;
    }

    setProcessing(true);
    try {
      // 批量更新狀態
      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: 'pending_audit_manager',
          accountant_approved_at: new Date().toISOString()
        })
        .in('id', selectedRequests.map(r => r.id));

      if (error) throw error;

      alert(`✅ 已批量審核 ${selectedRequests.length} 筆申請`);
      onRefresh();
    } catch (error) {
      console.error('批量審核失敗:', error);
      alert('❌ 批量審核失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleBatchReject = async () => {
    if (!canReject) {
      alert('您沒有批量駁回的權限');
      return;
    }

    const reason = prompt('請輸入駁回原因：');
    if (!reason) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: 'rejected',
          reject_reason: reason,
          rejected_at: new Date().toISOString()
        })
        .in('id', selectedRequests.map(r => r.id));

      if (error) throw error;

      alert(`✅ 已批量駁回 ${selectedRequests.length} 筆申請`);
      onRefresh();
    } catch (error) {
      console.error('批量駁回失敗:', error);
      alert('❌ 批量駁回失敗: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (selectedRequests.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 bg-white shadow-2xl rounded-xl p-4 border border-gray-200">
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-700">
          已選擇 {selectedRequests.length} 筆
        </span>

        {canApprove && (
          <button
            onClick={handleBatchApprove}
            disabled={processing}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
          >
            {processing ? '處理中...' : '✅ 批量核准'}
          </button>
        )}

        {canReject && (
          <button
            onClick={handleBatchReject}
            disabled={processing}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
          >
            {processing ? '處理中...' : '❌ 批量駁回'}
          </button>
        )}

        {canDelete && (
          <button
            onClick={handleBatchDelete}
            disabled={processing}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg disabled:opacity-50"
          >
            {processing ? '處理中...' : '🗑️ 批量刪除'}
          </button>
        )}
      </div>
    </div>
  );
}
```

---

## 📦 範例 4：細粒度資料訪問控制

### 場景：員工只能看到自己部門的付款申請

```jsx
// src/system/payment_system/src/pages/PaymentList.jsx
import { usePermission } from '../../../../hooks/usePermission';
import { supabase } from '../supabaseClient';

export default function PaymentList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // 檢查查看權限
  const { hasPermission: canViewAll } = usePermission('payment.view.all');
  const { hasPermission: canViewDepartment } = usePermission('payment.view.department');
  const { hasPermission: canViewOwn } = usePermission('payment.view.own');

  useEffect(() => {
    fetchRequests();
  }, [canViewAll, canViewDepartment, canViewOwn]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('payment_requests')
        .select(`
          *,
          requester:employees!requester_id(name, department_id)
        `);

      if (canViewAll) {
        // 可以查看所有申請，不加過濾
        console.log('權限：查看所有付款申請');
      } else if (canViewDepartment) {
        // 只能查看同部門的申請
        const { data: myEmployee } = await supabase
          .from('employees')
          .select('department_id')
          .eq('user_id', user.id)
          .single();

        if (myEmployee?.department_id) {
          query = query.eq('requester.department_id', myEmployee.department_id);
          console.log('權限：查看部門付款申請');
        }
      } else if (canViewOwn) {
        // 只能查看自己的申請
        query = query.eq('requester_id', user.id);
        console.log('權限：查看自己的付款申請');
      } else {
        // 沒有任何查看權限
        setRequests([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('載入申請失敗:', error);
      alert('載入失敗: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!canViewOwn && !canViewDepartment && !canViewAll) {
    return (
      <div className="text-center py-12">
        <Shield size={48} className="mx-auto text-gray-300 mb-4" />
        <p className="text-gray-600">您沒有查看付款申請的權限</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">目前沒有付款申請</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <PaymentRequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}
```

---

## 📦 範例 5：動態表單欄位權限

### 場景：根據權限顯示/隱藏敏感欄位

```jsx
// src/system/payment_system/src/components/PaymentForm.jsx
import { usePermission } from '../../../../hooks/usePermission';

export default function PaymentForm({ request, onSave }) {
  const { hasPermission: canViewBankAccount } = usePermission('payment.view.sensitive');
  const { hasPermission: canEditAmount } = usePermission('payment.edit.amount');
  const { hasPermission: canViewCost } = usePermission('payment.view.cost');

  return (
    <form onSubmit={handleSubmit}>
      {/* 基本資訊 - 所有人都能看 */}
      <div>
        <label>付款標題</label>
        <input type="text" value={request.title} />
      </div>

      {/* 金額 - 根據權限決定是否可編輯 */}
      <div>
        <label>付款金額</label>
        <input
          type="number"
          value={request.amount}
          disabled={!canEditAmount}
          className={!canEditAmount ? 'bg-gray-100 cursor-not-allowed' : ''}
        />
        {!canEditAmount && (
          <p className="text-xs text-gray-500 mt-1">
            您沒有修改金額的權限
          </p>
        )}
      </div>

      {/* 成本中心 - 只有財務相關人員可以看 */}
      {canViewCost && (
        <div>
          <label>成本中心</label>
          <select value={request.cost_center}>
            <option value="sales">銷售</option>
            <option value="marketing">行銷</option>
            <option value="rd">研發</option>
          </select>
        </div>
      )}

      {/* 銀行帳號 - 只有出納和管理員可以看 */}
      {canViewBankAccount ? (
        <div>
          <label>收款帳號</label>
          <input type="text" value={request.bank_account} />
        </div>
      ) : (
        <div>
          <label>收款帳號</label>
          <input
            type="text"
            value="●●●●●●●●"
            disabled
            className="bg-gray-100"
          />
          <p className="text-xs text-amber-600 mt-1">
            🔒 銀行帳號已隱藏（僅出納可見）
          </p>
        </div>
      )}

      <button type="submit">儲存</button>
    </form>
  );
}
```

---

## 🎯 快速集成檢查清單

當您要為新功能添加權限控制時，按照這個清單操作：

### ✅ 步驟 1：定義權限

在資料庫遷移中添加新權限：

```sql
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  ('新模組.查看', '查看XX', '可以查看XX列表', '新模組', 'read'),
  ('新模組.創建', '創建XX', '可以創建新的XX', '新模組', 'write'),
  ('新模組.編輯', '編輯XX', '可以修改XX資料', '新模組', 'write'),
  ('新模組.刪除', '刪除XX', '可以刪除XX', '新模組', 'delete')
ON CONFLICT (code) DO NOTHING;
```

### ✅ 步驟 2：為角色分配權限

```sql
-- 管理員擁有所有權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'admin' AND p.module = '新模組'
ON CONFLICT DO NOTHING;

-- 特定角色擁有特定權限
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = '特定角色'
  AND p.code IN ('新模組.查看', '新模組.創建')
ON CONFLICT DO NOTHING;
```

### ✅ 步驟 3：在前端使用權限

```jsx
import { usePermission, PermissionGuard } from '../hooks/usePermission';

function MyNewFeature() {
  const { hasPermission: canView } = usePermission('新模組.查看');
  const { hasPermission: canCreate } = usePermission('新模組.創建');

  if (!canView) {
    return <div>無訪問權限</div>;
  }

  return (
    <div>
      <h1>我的新功能</h1>

      <PermissionGuard permission="新模組.創建">
        <button>➕ 新增</button>
      </PermissionGuard>

      {/* 其他內容 */}
    </div>
  );
}
```

### ✅ 步驟 4：測試

1. 以管理員身份登入，確認可以看到所有功能
2. 以普通用戶身份登入，確認看不到無權限的功能
3. 在權限管理頁面調整權限，確認即時生效
4. 測試優雅降級（無權限時的提示訊息）

---

## 🔧 除錯技巧

### 1. 查看當前用戶的所有權限

```jsx
import { useUserPermissions } from '../hooks/usePermission';

function DebugPanel() {
  const { permissions } = useUserPermissions();

  return (
    <details>
      <summary>我的權限 ({permissions.length})</summary>
      <ul>
        {permissions.map(p => (
          <li key={p.permission_code}>
            {p.permission_code} - {p.permission_name} ({p.source})
          </li>
        ))}
      </ul>
    </details>
  );
}
```

### 2. 在瀏覽器 Console 中測試權限

```javascript
// 在瀏覽器 Console 中執行
const { data } = await supabase.rpc('get_user_permissions', {
  p_user_id: '當前用戶的UUID'
});
console.table(data);
```

### 3. 記錄權限檢查結果

```jsx
const { hasPermission } = usePermission('payment.create');
console.log('payment.create permission:', hasPermission);
```

---

## 📚 相關文件

- [RBAC 整合指南](./RBAC_INTEGRATION_GUIDE.md) - 詳細的整合說明
- `src/hooks/usePermission.js` - Hook 實現細節
- `supabase/migrations/create_rbac_system.sql` - RBAC 資料庫架構
- `src/pages/management/components/PermissionManagement.jsx` - 權限管理 UI

---

**提示**：這些範例都是可以直接使用的代碼，複製貼上後只需要調整路徑和權限代碼即可！
