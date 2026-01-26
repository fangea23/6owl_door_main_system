# CLAUDE.md - 六扇門主系統完整開發指南

> **專為 AI 助手設計的項目指南文檔**
> 最後更新：2026-01-23

---

## 目錄

1. [系統概述](#系統概述)
2. [技術架構](#技術架構)
3. [項目結構](#項目結構)
4. [資料庫架構](#資料庫架構)
5. [RBAC 權限系統](#rbac-權限系統)
6. [子系統詳解](#子系統詳解)
7. [設計系統](#設計系統)
8. [開發指南](#開發指南)
9. [常用命令](#常用命令)
10. [故障排除](#故障排除)

---

## 系統概述

### 業務背景

**六扇門 (6owl_door)** 是一個多品牌餐飲集團企業管理系統，服務以下品牌：
- 🍜 **六扇門**: 主要餐飲品牌
- 🍚 **粥大福**: 粥品品牌

### 系統架構圖

```
六扇門主系統
├── 🏠 Portal (入口系統)
│   └── 統一認證、權限控制、系統導航
│
├── 💰 財務管理
│   ├── 付款簽核系統 (Payment Approval System)
│   └── 員工代墊款系統 (Expense Reimbursement System)
│
├── 💻 IT 服務
│   └── 軟體授權系統 (License System)
│
├── 👥 人力資源
│   └── 教育訓練系統 (Training System)
│
├── 🏢 行政服務
│   ├── 會議室租借系統 (Meeting Room System)
│   ├── 公司車租借系統 (Car Rental System)
│   ├── 店舖管理系統 (Store Management System)
│   ├── 企業入口網 (EIP & KM System)
│   └── 叫修服務系統 (Ticketing System)
│
└── ⚙️ 系統管理
    └── 管理中心 (帳號、員工、部門、權限)
```

---

## 技術架構

### 技術棧

| 層級 | 技術 | 版本 |
|------|------|------|
| **前端框架** | React | 19.x |
| **建置工具** | Vite | 7.x |
| **CSS 框架** | TailwindCSS | 4.x |
| **狀態管理** | TanStack Query (React Query) | 5.x |
| **路由** | React Router DOM | 7.x |
| **圖標** | Lucide React | - |
| **通知** | React Hot Toast | - |
| **後端** | Supabase (PostgreSQL + Auth + Edge Functions) | - |
| **語言** | JavaScript (JSX), SQL | - |

### 架構設計原則

#### 1. 微前端架構
每個子系統都是獨立的 React 應用，通過 Portal 整合：
- **獨立開發**：各系統可獨立開發、測試
- **統一認證**：共用 Supabase Auth
- **統一權限**：共用 RBAC 系統

#### 2. Schema 隔離
不同業務模組使用不同的 database schema：
- `public`: 共用資料（員工、部門、品牌、店舖）
- `rbac`: 權限系統
- `payment_approval`: 付款簽核專用
- `training`: 教育訓練系統
- 其他 schema 依業務需求建立

#### 3. RLS 優先安全模型
- 前端 RBAC：功能可見性控制
- 後端 RLS：資料存取安全保障
- 雙重防護確保安全

---

## 項目結構

```
/
├── src/
│   ├── components/           # 共用 UI 組件
│   │   ├── Header.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── SystemCard.jsx
│   │   └── ...
│   │
│   ├── contexts/             # React Contexts
│   │   ├── AuthContext.jsx   # 認證狀態
│   │   └── NotificationContext.jsx
│   │
│   ├── hooks/                # 共用 Hooks
│   │   ├── usePermission.js  # 權限檢查 ⭐
│   │   ├── useCurrentUser.js
│   │   └── useSearch.js
│   │
│   ├── pages/                # 主要頁面
│   │   ├── Portal.jsx        # 系統入口
│   │   ├── Login.jsx
│   │   ├── Account.jsx
│   │   ├── management/       # 管理中心
│   │   │   ├── ManagementCenter.jsx
│   │   │   └── components/
│   │   └── systems/          # 系統 Layout 包裝器
│   │
│   ├── system/               # 子系統 (微前端) ⭐
│   │   ├── car_rental_system/
│   │   ├── expense_reimbursement_system/
│   │   ├── license_system/
│   │   ├── meeting_room_system/
│   │   ├── payment_system/
│   │   ├── store_management_system/
│   │   ├── ticketing_system/
│   │   ├── training_system/
│   │   └── eip_km_system/
│   │
│   ├── data/
│   │   └── systems.js        # 系統目錄配置 ⭐
│   │
│   ├── lib/
│   │   └── supabase.js       # Supabase 客戶端
│   │
│   └── services/
│       └── auth.js           # 認證服務
│
├── database/                 # SQL Schema 文件
│   ├── unified_employees.sql
│   ├── training_system_schema.sql
│   └── ...
│
├── supabase/
│   ├── migrations/           # 資料庫遷移 ⭐
│   ├── functions/            # Edge Functions (Deno)
│   └── config.toml
│
├── docs/                     # 文檔
│   ├── RBAC_INTEGRATION_GUIDE.md
│   └── ...
│
└── public/                   # 靜態資源
```

---

## 資料庫架構

### Schema 設計

#### Public Schema (共用資料)

```sql
-- 認證與用戶
auth.users                    -- Supabase 內建用戶表
public.profiles               -- 用戶 Profile (認證層)

-- 組織架構
public.employees              -- 員工資料 ⭐
public.departments            -- 部門
public.brands                 -- 品牌 (六扇門、粥大福)
public.stores                 -- 店舖資料

-- RBAC 權限系統
rbac.roles                    -- 角色
rbac.permissions              -- 權限
rbac.role_permissions         -- 角色權限關聯
rbac.user_roles               -- 用戶角色關聯
```

### 核心表格結構

#### employees (員工表)
```sql
CREATE TABLE public.employees (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),  -- 關聯認證用戶
  employee_id TEXT UNIQUE NOT NULL,         -- 員工編號
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  department_id UUID REFERENCES public.departments(id),
  position TEXT,                            -- 職位
  role TEXT,                                -- 業務角色
  status TEXT DEFAULT 'active',             -- active, resigned
  brand_id BIGINT,                          -- 關聯品牌 code
  store_id BIGINT,                          -- 關聯門市 code
  hire_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### departments (部門表)
```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  parent_department_id UUID REFERENCES departments(id),
  manager_id UUID REFERENCES employees(id),
  is_active BOOLEAN DEFAULT true
);
```

#### brands / stores (品牌與門市)
```sql
-- 品牌使用 code 欄位 (BIGINT)
public.brands.code     -- 2 位數字: 01, 02, 89, 90

-- 門市使用 code 欄位 (BIGINT)
public.stores.code     -- 5 位數字: BB+SSS (品牌碼+流水號)
                       -- 例如: 01001, 02015
```

### 跨 Schema 關聯規則

**原則**：避免跨 schema 的外鍵約束，使用應用層關聯

```javascript
// ❌ 錯誤：跨 schema 嵌套查詢
const { data } = await supabase
  .from('expense_reimbursement_requests')
  .select('*, applicant:employees(name)');  // 會失敗

// ✅ 正確：分別查詢後組合
const { data: requests } = await supabase
  .from('expense_reimbursement_requests')
  .select('*');

const { data: employees } = await supabase
  .from('employees')
  .select('*')
  .in('user_id', requests.map(r => r.applicant_id));

// 前端組合
const enriched = requests.map(r => ({
  ...r,
  applicant: employees.find(e => e.user_id === r.applicant_id)
}));
```

---

## RBAC 權限系統

### 架構設計

```
用戶 (auth.users)
    │
    │ N:M (透過 user_roles)
    ▼
角色 (rbac.roles)
    │
    │ N:M (透過 role_permissions)
    ▼
權限 (rbac.permissions)
```

### 權限命名規範

```
<module>.<action>.<scope>

例如：
- system.payment           # 系統訪問權限
- payment.view.own         # 查看自己的付款申請
- payment.view.all         # 查看所有付款申請
- payment.approve.boss     # 放行主管簽核
- expense.create           # 建立代墊款申請
```

### 常見角色

| 角色代碼 | 名稱 | 說明 |
|---------|------|------|
| `ceo` | 總經理 | 負責高金額簽核 |
| `boss` | 放行主管 | 最終決行 |
| `audit_manager` | 審核主管 | 審核簽核 |
| `accountant` | 會計 | 會計審核 |
| `cashier` | 出納 | 出納處理 |
| `unit_manager` | 單位主管 | 部門主管 |
| `store_manager` | 店長 | 店舖管理 |
| `employee` | 一般員工 | 基本權限 |

### 前端權限檢查

#### 使用 usePermission Hook

```jsx
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const { hasPermission, loading } = usePermission('payment.approve.boss');

  if (loading) return <Loader />;
  if (!hasPermission) return <AccessDenied />;

  return <div>有權限的內容</div>;
}
```

#### 使用 PermissionGuard 組件

```jsx
import { PermissionGuard } from '@/hooks/usePermission';

function MyComponent() {
  return (
    <div>
      <PermissionGuard permission="payment.approve.accountant">
        <button>審核付款</button>
      </PermissionGuard>
    </div>
  );
}
```

#### 批量權限檢查

```jsx
import { useUserPermissions } from '@/hooks/usePermission';

function DynamicMenu() {
  const { permissions, loading } = useUserPermissions();
  const permSet = new Set(permissions.map(p => p.permission_code));

  const tabs = allTabs.filter(tab =>
    !tab.requiredPermission || permSet.has(tab.requiredPermission)
  );

  return <nav>{/* 渲染 tabs */}</nav>;
}
```

### 資料庫權限檢查

```sql
-- 檢查用戶是否有特定權限
SELECT rbac.user_has_permission('user-uuid', 'payment.approve.boss');

-- 取得用戶所有權限
SELECT * FROM rbac.get_user_permissions('user-uuid');
```

---

## 子系統詳解

### 1. 付款簽核系統 (Payment Approval)

**路徑**: `src/system/payment_system/`
**Schema**: `payment_approval`

**簽核流程**:
```
pending_unit_manager → pending_accountant → pending_audit_manager
    → pending_cashier → pending_boss → approved
```

**關鍵設計**:
- 狀態驅動流程
- 自動跳過邏輯（申請人是會計時跳過會計關卡）
- 每個關卡都有時間戳記錄

### 2. 員工代墊款系統 (Expense Reimbursement)

**路徑**: `src/system/expense_reimbursement_system/`
**Schema**: `public`

**簽核流程**:
```
金額 ≥ NT$30,000: pending_ceo → pending_audit_manager → approved
金額 < NT$30,000: pending_boss → pending_audit_manager → approved
```

**關鍵設計**:
- 無草稿功能，直接送出
- 最多 15 行明細
- 品項必填驗證（有金額時）
- 多品牌分帳（六扇門、粥大福）

### 3. 教育訓練系統 (Training)

**路徑**: `src/system/training_system/`
**Schema**: `training`

**核心功能**:
- 線上課程學習
- 測驗與評量
- 新人訓練範本
- 學習進度追蹤

### 4. 其他系統

| 系統 | 路徑 | 說明 |
|------|------|------|
| 軟體授權 | `license_system/` | 軟體授權申請與管理 |
| 會議室租借 | `meeting_room_system/` | 會議室預約 |
| 公司車租借 | `car_rental_system/` | 車輛預約 |
| 店舖管理 | `store_management_system/` | 品牌與店舖管理 |
| 叫修服務 | `ticketing_system/` | 設備報修工單 |
| 企業入口網 | `eip_km_system/` | 文件、公告、知識管理 |

---

## 設計系統

### 色彩系統

#### 品牌主色 (紅色系)
```css
red-500: #ef4444  /* 主要強調色 */
red-600: #dc2626  /* 主要按鈕 */
red-700: #b91c1c  /* hover 狀態 */
```

#### 中性色 (Stone 石色系)
```css
stone-50:  #fafaf9  /* 頁面背景 */
stone-100: #f5f5f4  /* 卡片背景 */
stone-200: #e7e5e4  /* 邊框 */
stone-600: #57534e  /* 正文文字 */
stone-800: #292524  /* 標題文字 */
```

### 按鈕樣式

#### 主要按鈕
```jsx
className="
  px-4 sm:px-5 py-2.5 sm:py-3
  bg-gradient-to-r from-red-600 to-red-700
  hover:from-red-700 hover:to-red-800
  text-white font-bold rounded-xl
  shadow-lg shadow-red-500/20
  transition-all duration-300
  touch-manipulation
"
```

#### 次要按鈕
```jsx
className="
  px-4 sm:px-5 py-2.5 sm:py-3
  bg-white border border-stone-200
  hover:border-red-300 hover:bg-red-50
  text-stone-700 font-semibold rounded-xl
  shadow-sm hover:shadow-md
  transition-all duration-300
"
```

### 卡片樣式

```jsx
className="
  bg-white border border-stone-200
  rounded-xl sm:rounded-2xl
  shadow-sm hover:shadow-lg
  hover:-translate-y-1
  transition-all duration-300
  p-4 sm:p-6
"
```

### 響應式斷點

```css
sm: 640px   /* 小平板 */
md: 768px   /* 平板 */
lg: 1024px  /* 桌面 */
xl: 1280px  /* 大桌面 */
```

### 設計檢查清單

- [ ] 使用 Stone 色系作為中性色（不用 Gray）
- [ ] 使用 Red/Amber 作為強調色（不用 Blue）
- [ ] 圓角使用 rounded-xl 或 rounded-2xl
- [ ] 所有尺寸都有響應式變化
- [ ] 按鈕添加 touch-manipulation
- [ ] 陰影使用 shadow-red-500/20

---

## 開發指南

### 新增子系統流程

#### Step 1: 建立目錄結構

```bash
src/system/new_system/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   └── Detail.jsx
│   ├── components/
│   ├── hooks/
│   ├── supabaseClient.js    # 跨 schema 路由
│   ├── AuthContext.jsx
│   └── App.jsx
└── database_schema.sql
```

#### Step 2: 配置 Supabase 客戶端

```javascript
// src/system/new_system/src/supabaseClient.js
import { supabase as mainClient } from '../../../lib/supabase';

const NEW_SYSTEM_TABLES = ['table1', 'table2'];

export const supabase = {
  auth: mainClient.auth,
  from: (table) => {
    if (NEW_SYSTEM_TABLES.includes(table)) {
      return mainClient.schema('new_system').from(table);
    }
    return mainClient.from(table); // public schema
  },
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
```

#### Step 3: 註冊到 Portal

```javascript
// src/data/systems.js
{
  id: 'new-system',
  name: '新系統名稱',
  description: '系統描述',
  icon: '🆕',
  url: '/systems/new-system',
  status: 'active',
  permissionCode: 'system.new_system'
}
```

#### Step 4: 新增路由

```javascript
// src/App.jsx
<Route path="/systems/new-system/*" element={<NewSystemLayout />} />
```

#### Step 5: 建立 RBAC 權限

```sql
-- 系統存取權限
INSERT INTO rbac.permissions (code, name, module, category) VALUES
  ('system.new_system', '訪問新系統', 'system_access', 'access');

-- 功能權限
INSERT INTO rbac.permissions (code, name, module, category) VALUES
  ('new_system.view', '查看資料', 'new_system', 'read'),
  ('new_system.create', '建立資料', 'new_system', 'write');
```

### RLS 政策設計模式

#### 模式 1: 用戶只能看自己的資料
```sql
CREATE POLICY "Users view own" ON table_name FOR SELECT
  USING (auth.uid() = user_id);
```

#### 模式 2: 簽核人可更新待簽核資料
```sql
CREATE POLICY "Approvers update pending" ON table_name FOR UPDATE
  USING (status IN ('pending_xxx', 'pending_yyy'))
  WITH CHECK (status IN ('approved', 'rejected'));
```

#### 模式 3: 使用 RBAC 權限檢查
```sql
CREATE POLICY "Check permission" ON table_name FOR SELECT
  USING (rbac.user_has_permission(auth.uid(), 'module.action'));
```

### Supabase 查詢模式

```jsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const { data, isLoading, error } = useQuery({
  queryKey: ['my-data'],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('my_table')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  }
});
```

---

## 常用命令

### 開發

```bash
npm run dev          # 啟動開發伺服器
npm run build        # 建置生產版本
npm run lint         # 執行 ESLint
npm run preview      # 預覽生產版本
```

### Supabase MCP 工具

在 Claude Code 中，可以使用以下 MCP 工具：

| 工具 | 用途 |
|------|------|
| `execute_sql` | 執行 SQL 查詢 |
| `apply_migration` | 執行 DDL 遷移 |
| `list_tables` | 列出資料表 |
| `list_migrations` | 列出遷移記錄 |
| `get_project` | 取得專案資訊 |

---

## 故障排除

### 常見問題

#### 1. 權限錯誤 "You do not have permission..."

**排查步驟**:
```sql
-- 檢查用戶角色
SELECT r.code FROM rbac.user_roles ur
JOIN rbac.roles r ON ur.role_id = r.id
WHERE ur.user_id = 'user-uuid';

-- 檢查角色權限
SELECT p.code FROM rbac.role_permissions rp
JOIN rbac.permissions p ON rp.permission_id = p.id
WHERE rp.role_id = 'role-uuid';
```

#### 2. 跨 Schema 查詢失敗

**錯誤**: `Could not find the table` 或 `Could not find a relationship`

**解決**: 使用分別查詢 + 前端組合，避免嵌套跨 schema 查詢

#### 3. 簽核流程卡住

**排查**:
```javascript
console.log('Current status:', request.status);
console.log('Config:', WORKFLOW_CONFIG[request.status]);
console.log('Approvals:', approvals);
```

**可能原因**:
- RLS 政策阻止簽核人更新狀態
- 防重複簽核邏輯誤判

#### 4. RLS 政策阻擋更新

**解決**: 確保有簽核人專用的 UPDATE 政策
```sql
CREATE POLICY "Approvers can update pending" ON table_name
FOR UPDATE USING (
  status IN ('pending_xxx') AND auth.uid() IS NOT NULL
);
```

---

## 重要提醒 (For AI Assistants)

1. **語言**: 所有 UI 文字使用**繁體中文**
2. **地區**: 系統為台灣餐飲業設計
3. **權限**: 新增功能前先檢查現有 RBAC 權限
4. **資料庫**: 使用 Supabase MCP 工具進行資料庫操作
5. **RLS**: 所有新表格必須啟用 Row Level Security
6. **設計**: 遵循現有設計系統（紅色主色、Stone 中性色）
7. **模式**: 遵循現有組件模式和目錄結構

---

## 相關文檔

| 文檔 | 路徑 | 說明 |
|------|------|------|
| 系統架構 | `SYSTEM_ARCHITECTURE.md` | 完整技術文檔 |
| 設計系統 | `DESIGN_SYSTEM.md` | UI 設計規範 |
| RBAC 指南 | `docs/RBAC_INTEGRATION_GUIDE.md` | 權限整合指南 |
| RBAC 範例 | `docs/RBAC_EXAMPLES.md` | 實際集成示例 |
| 資料庫說明 | `database/README.md` | 資料庫結構說明 |
| 代墊款文檔 | `src/system/expense_reimbursement_system/SYSTEM_DOCUMENTATION.md` | 代墊款系統詳細文檔 |

---

**文檔維護**: Claude AI Assistant
**最後更新**: 2026-01-23
