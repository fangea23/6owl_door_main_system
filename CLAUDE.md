# CLAUDE.md - 六扇門主系統完整開發指南

> **專為 AI 助手設計的項目指南文檔**
> 最後更新：2026-01-28

---

## Supabase 專案資訊

| 項目 | 值 |
|------|-----|
| **專案名稱** | 6owldoor_paper |
| **專案 ID** | `kxgdbnhpqcvuifwunyid` |
| **Region** | ap-south-1 |
| **Database Host** | db.kxgdbnhpqcvuifwunyid.supabase.co |

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
- `public`: 共用資料（員工、部門、品牌、店舖、銀行資料、門市銀行帳戶）
- `rbac`: 權限系統
- `payment_approval`: 付款簽核專用
- `training`: 教育訓練系統
- 其他 schema 依業務需求建立

**重要**：銀行相關資料表（`banks`, `bank_branches`, `store_bank_accounts`）已統一遷移至 `public` schema，供所有子系統共用。

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

-- 銀行資料（共用）
public.banks                  -- 銀行總行資料
public.bank_branches          -- 銀行分行資料
public.store_bank_accounts    -- 門市銀行帳戶（用於匯出媒體檔）

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
  employee_id TEXT NOT NULL,                -- 員工編號（行政用途，可修改）
  login_id VARCHAR(50) UNIQUE,              -- 登入帳號（設定後不可修改）⭐
  name TEXT NOT NULL,
  email TEXT,                               -- 聯絡用 Email（可修改）
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

**重要設計決策 - 登入帳號與員工編號分離**：

| 欄位 | 用途 | 可否修改 | 說明 |
|------|------|---------|------|
| `login_id` | 系統登入 | ❌ 設定後不可修改 | 用於 Supabase Auth 登入，轉換為 `{login_id}@6owldoor.internal` |
| `employee_id` | 行政識別 | ✅ 可隨時修改 | 人資用途，如員工調動、編號重整 |
| `email` | 聯絡用途 | ✅ 可隨時修改 | 純聯絡用，不影響登入 |

**登入流程**：
```javascript
// Login.jsx - 統一登入入口
const accountInput = formData.account.trim();

// 自動判斷：含 @ 為 Email，否則為登入帳號 (login_id)
let loginEmail;
if (isEmailFormat(accountInput)) {
  loginEmail = accountInput;  // Email 直接使用
} else {
  // 登入帳號轉換為虛擬 email
  loginEmail = `${accountInput.toLowerCase()}@6owldoor.internal`;
}
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

#### banks / bank_branches (銀行資料) ⭐

**⚠️ 重要：銀行資料表的欄位命名與其他表不同，請務必注意！**

```sql
-- 銀行總行表
CREATE TABLE public.banks (
  bank_code TEXT PRIMARY KEY,    -- 銀行代碼（3碼），如 "004", "812"
  bank_name TEXT NOT NULL,       -- 銀行名稱，如 "臺灣銀行", "台新銀行"
  idx INTEGER                    -- 排序索引
);

-- 銀行分行表
CREATE TABLE public.bank_branches (
  id INTEGER PRIMARY KEY,
  bank_code TEXT REFERENCES banks(bank_code),  -- 關聯銀行代碼
  branch_code TEXT NOT NULL,     -- 分行代碼（4碼），如 "0037"
  branch_name TEXT NOT NULL,     -- 分行名稱，如 "營業部"
  full_code TEXT,                -- 完整代碼（7碼），如 "0040037"
  idx INTEGER                    -- 排序索引
);
```

**查詢銀行資料的正確方式**：

```javascript
// ✅ 正確：使用實際欄位名稱 bank_code, bank_name
const { data: banks } = await supabase
  .from('banks')
  .select('bank_code, bank_name')
  .order('bank_code');

// ✅ 正確：查詢分行使用 branch_code, branch_name
const { data: branches } = await supabase
  .from('bank_branches')
  .select('branch_code, branch_name')
  .eq('bank_code', selectedBankCode)  // 用 bank_code 過濾
  .order('branch_code');

// ❌ 錯誤：不要使用 code, name（這些欄位不存在）
const { data } = await supabase
  .from('banks')
  .select('code, name');  // 會查不到資料！
```

**SearchableSelect 選項映射**：

```jsx
// ✅ 正確的 options 映射
<SearchableSelect
  options={banks.map(bank => ({
    value: bank.bank_code,      // 使用 bank_code
    label: bank.bank_name,      // 使用 bank_name
    subLabel: bank.bank_code    // 顯示代碼供搜尋
  }))}
  value={formData.bank_code}
  onChange={(value) => handleChange('bank_code', value)}
/>

// 分行選項
<SearchableSelect
  options={branches.map(branch => ({
    value: branch.branch_code,    // 使用 branch_code
    label: branch.branch_name,    // 使用 branch_name
    subLabel: branch.branch_code
  }))}
  value={formData.branch_code}
  onChange={(value) => handleChange('branch_code', value)}
/>
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

### 角色分類設計

系統採用**組合式角色設計**，分為以下類別：

#### 1. 職級角色 (Level)
決定簽核層級和基本權限範圍：
| 角色代碼 | 名稱 | 說明 |
|---------|------|------|
| `level_executive` | 高階主管 | 董事長、總經理、副總 - 最高簽核權 |
| `level_manager` | 部門主管 | 經理、副理 - 中階簽核 |
| `level_supervisor` | 基層主管 | 主任、督導 - 初階簽核 |
| `level_staff` | 一般員工 | 專員、助理、計時 - 基本功能 |

#### 2. 功能角色 (Function)
授予特定業務功能的存取權限：
| 角色代碼 | 名稱 | 說明 |
|---------|------|------|
| `func_hr` | 人資功能 | 員工查詢、基本人事操作 |
| `func_hr_admin` | 人資管理 | 員工審核、薪資管理（人資經理） |
| `func_finance` | 財務功能 | 帳務查詢、基本財務操作 |
| `func_finance_admin` | 財務管理 | 付款審核、薪資審核（財務經理） |
| `func_it` | 資訊功能 | 授權管理、叫修處理 |
| `func_it_admin` | 資訊管理 | 系統管理、權限管理（資訊主管） |
| `func_admin` | 行政功能 | 車輛租借、會議室預約 |
| `func_ops` | 營運功能 | 門市督導、營業管理 |

#### 3. 簽核角色 (Approval)
用於簽核流程的專用角色：
| 角色代碼 | 名稱 | 說明 |
|---------|------|------|
| `approval_unit_manager` | 單位主管簽核 | 部門初審 |
| `approval_accountant` | 會計簽核 | 會計審核 |
| `approval_audit` | 審核主管 | 財務審核 |
| `approval_cashier` | 出納 | 撥款確認 |
| `approval_boss` | 放行主管 | 最終放行 |
| `approval_ceo` | 總經理簽核 | 大額簽核（≥30,000） |

#### 4. 門市角色 (Store)
門市人員專用：
| 角色代碼 | 名稱 | 說明 |
|---------|------|------|
| `store_manager` | 店長 | 門市最高管理者 |
| `assistant_manager` | 副店長 | 代理店長職務 |
| `store_staff` | 正職人員 | 門市正職 |
| `store_parttime` | 計時人員 | 門市兼職 |
| `area_supervisor` | 區域督導 | 管理指定門市群 |

#### 5. 系統角色
| 角色代碼 | 名稱 | 說明 |
|---------|------|------|
| `super_admin` | 超級管理員 | 系統最高權限 |

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

### Edge Function 權限檢查

**重要原則**：Edge Function 不應該寫死角色名單，而是使用 RBAC 權限檢查。

#### 正確做法（使用 RBAC）
```typescript
// 建立 Admin Client
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

// 使用 RBAC 權限檢查
const { data: hasPermission } = await supabaseAdmin
  .schema('rbac')
  .rpc('user_has_permission', {
    p_user_id: caller.id,
    p_permission_code: 'employee.create'
  });

if (!hasPermission) {
  throw new Error('權限不足：您沒有此操作的權限');
}
```

#### 錯誤做法（寫死角色）
```typescript
// ❌ 不要這樣做 - 寫死角色會導致新增角色時需要修改程式碼
const allowedRoles = ['admin', 'hr'];
if (!allowedRoles.includes(callerRole)) {
  throw new Error('權限不足');
}
```

#### 目前的 Edge Functions

| Function | 版本 | 權限檢查 | 說明 |
|----------|------|----------|------|
| `create-employee-account` | v4 | `employee.create` 或 `profile.create` | 建立員工帳號（免 Email 驗證） |
| `invite-employee` | v8 | `employee.create` 或 `profile.create` | 發送邀請信（需 Email 驗證） |
| `reset-user-password` | v2 | `profile.edit` | 管理員重設他人密碼 |

### 直屬主管設計

#### 員工表 manager_id 欄位
```sql
-- employees 表新增直屬主管欄位
ALTER TABLE public.employees
ADD COLUMN manager_id UUID REFERENCES public.employees(id);
```

#### 主管查詢邏輯
```sql
-- 取得員工的主管（優先直屬主管，否則依組織類型決定）
CREATE FUNCTION public.get_employee_manager(p_employee_id UUID)
RETURNS UUID AS $$
  -- 1. 若有設定直屬主管，直接回傳
  -- 2. 總部人員 → 回傳部門主管 (department.manager_id)
  -- 3. 門市人員 → 回傳店長 (position_code = 'store_manager')
$$;

-- 取得主管的 user_id（用於簽核流程）
CREATE FUNCTION public.get_employee_manager_user_id(p_employee_id UUID)
RETURNS UUID;

-- 取得某主管管理的所有員工 user_id 清單（用於付款系統單位主管簽核）
CREATE FUNCTION public.get_managed_employee_user_ids(p_manager_user_id UUID)
RETURNS UUID[];
```

#### 前端設定
在「員工資料」編輯表單中，可選擇直屬主管：
- 若未指定：總部人員預設為部門主管，門市人員預設為店長
- 若有指定：優先使用直屬主管

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
- **單位主管驗證**：只有申請人的直屬主管才能簽核（使用 `get_managed_employee_user_ids` 函數）

**單位主管簽核邏輯**：
```javascript
// Dashboard.jsx - 過濾只顯示我管理的員工的申請
if (req.status === 'pending_unit_manager' && canApproveManager) {
  if (!managedEmployeeUserIds.includes(req.applicant_id)) {
    return false;
  }
}

// RequestDetail.jsx - 驗證簽核者是申請人的主管
const canApprove =
  (request.status === 'pending_unit_manager' && canApproveManager && isApplicantManager) || ...
```

**匯出銀行媒體檔**：
- 權限：`payment.export`
- 支援格式：台新銀行 (Tab分隔)、國泰銀行 (固定長度 351 bytes)
- 編碼：Big5/ANSI（台灣銀行系統標準）
- 功能位置：Dashboard 批量匯出、RequestDetail 單筆匯出
- 相關檔案：`src/system/payment_system/src/utils/bankExport.js`、`ExportModal.jsx`
- **自動帶入門市銀行帳戶**：若申請單都來自同一門市，會自動從 `store_bank_accounts` 帶入付款方資訊

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

**匯出銀行媒體檔**：
- 權限：`expense.export`
- 支援格式：台新銀行 (Tab分隔)、國泰銀行 (固定長度 351 bytes)
- 編碼：Big5/ANSI（台灣銀行系統標準）
- 功能位置：Dashboard 批量匯出、RequestDetail 單筆匯出
- 相關檔案：`src/system/expense_reimbursement_system/src/utils/bankExport.js`、`ExportModal.jsx`
- **門市銀行帳戶快速選擇**：可從門市的預設銀行帳戶帶入付款方資訊

### 3. 教育訓練系統 (Training)

**路徑**: `src/system/training_system/`
**Schema**: `training`

**核心功能**:
- 線上課程學習
- 測驗與評量
- 新人訓練範本
- 學習進度追蹤

### 4. 薪資管理系統 (Payroll)

**路徑**: `src/system/payroll_system/`
**Schema**: `public` (使用 `salary_grades`, `insurance_brackets`, `employee_salary_settings`, `attendance_records`, `payroll_records`)

**核心功能**:
- 薪資等級設定（正職/計時）
- 勞健保級距設定
- 員工薪資設定（個人薪資參數）
- 出勤資料輸入（店長輸入）
- 出勤資料審核（總部審核）
- 薪資計算與發放

#### 薪資計算邏輯

**時薪計算**：
| 員工類型 | 時薪算法 |
|---------|---------|
| 正職（月薪制） | `月薪 ÷ 240` |
| 計時（時薪制） | 直接使用薪資等級的時薪 |

**請假扣款/加給規則**：

| 假別 | 正職（月薪制） | 計時（時薪制） |
|------|---------------|---------------|
| 公婚喪產假 | 不扣薪（月薪固定） | `時薪 × 有薪假時數`（加給） |
| 病假 | `時薪 × 病假時數 ÷ 2`（扣半薪） | `時薪 × 病假時數 ÷ 2`（扣半薪） |
| 事假 | `時薪 × 事假時數`（扣全薪） | `時薪 × 事假時數`（扣全薪） |
| 颱風假 | `時薪 × 颱風假時數`（扣全薪） | `時薪 × 颱風假時數`（扣全薪） |
| 特休 | 不扣薪（月薪固定） | `時薪 × 特休時數`（加給） |
| 特休代金 | `時薪 × 特休代金時數`（加給） | `時薪 × 特休代金時數`（加給） |
| 國定假日上班 | `時薪 × 國假時數`（額外加給） | `時薪 × 國假時數`（額外加給） |

**加班費計算**：
- 加班前 2 小時：`時薪 × 1.34`
- 加班 2 小時後：`時薪 × 1.67`

**本薪計算**：
| 員工類型 | 本薪算法 |
|---------|---------|
| 正職 | 固定月薪 |
| 計時 | `底薪基數 ÷ 30 × 在職天數 + 時薪 × 正常時數` |

#### 薪資計算核心程式碼

**檔案位置**: `src/system/payroll_system/src/pages/payroll/PayrollList.jsx`

```javascript
// 計算時薪（正職：月薪÷240，計時：直接用時薪）
const hourlyRate = isMonthly ? Math.round(baseSalaryGrade / 240) : hourlyRateGrade;

// 加班費率
const overtimeRate134 = Math.round(hourlyRate * 1.34);
const overtimeRate167 = Math.round(hourlyRate * 1.67);

// 請假扣款費率（正職計時都一樣）
const sickLeaveRate = Math.round(hourlyRate / 2);  // 病假扣半薪
const personalLeaveRate = hourlyRate;              // 事假扣全薪

// 計時人員有薪假加給
const paidLeavePay = isMonthly ? 0 : Math.round(paidLeaveHours * hourlyRate);
```

#### 發薪日期

系統採用**雙發薪日**設計：
- **10日發薪**：基本薪資、加班費、扣款
- **12日發薪**：國假加班、特休代金、公司其他獎金

#### 總部手動輸入欄位

以下欄位由人資/財務在「出勤資料審核」頁面手動輸入：

| 欄位 | 說明 | 對應資料表欄位 |
|------|------|---------------|
| 預支扣款 | 薪資預支扣回 | `attendance.advance_payment` |
| 勞保追朔 | 勞保補繳 | `attendance.labor_insurance_retroactive` |
| 健保追朔 | 健保補繳 | `attendance.health_insurance_retroactive` |
| 健保眷屬數 | 健保眷屬人數 | `attendance.health_insurance_dependents` |
| 其他扣款(10日) | 10日發薪其他扣款 | `attendance.other_deduction_10th` |
| 其他獎金(12日) | 12日發薪其他獎金 | `attendance.other_bonus_12th` |

#### 勞健保計算

勞健保金額從 `insurance_brackets` 表格自動查詢，根據員工月薪對應級距：
- **勞保費**：`bracket.labor_employee`（員工自付）
- **健保費**：`bracket.health_employee`（員工自付）
- **健保眷屬費**：`bracket.health_employee × 眷屬人數`

### 5. 其他系統

| 系統 | 路徑 | 說明 |
|------|------|------|
| 軟體授權 | `license_system/` | 軟體授權申請與管理 |
| 會議室租借 | `meeting_room_system/` | 會議室預約 |
| 公司車租借 | `car_rental_system/` | 車輛預約 |
| 店舖管理 | `store_management_system/` | 品牌與店舖管理 |
| 叫修服務 | `ticketing_system/` | 設備報修工單 |
| 企業入口網 | `eip_km_system/` | 文件、公告、知識管理 |

### 5. 管理中心 (Management Center)

**路徑**: `src/pages/management/`

**功能模組**：

| 頁籤 | 組件 | 權限 | 說明 |
|------|------|------|------|
| 員工資料 | `EmployeesManagementV2` | `employee.view/create/edit/delete` | 管理員工、帳號建立、密碼重設 |
| 部門管理 | `DepartmentsManagement` | `department.view/create/edit/delete` | 管理公司部門架構、部門主管 |
| 會計品牌分配 | `AccountantBrandsManagement` | `accountant_brand.view/edit` | 指派會計負責品牌 |
| 督導設定 | `SupervisorManagement` | `supervisor.view/edit` | 區域督導與門市指派 |
| 權限管理 | `PermissionManagement` | `rbac.manage` | 角色與權限設定 |

**員工資料整合功能**（EmployeesManagementV2）：
- 新增員工時可勾選「同時建立登入帳號」
- 編輯員工時可重設密碼、停用帳號
- 設定直屬主管（若未設定則使用預設主管）
- 設定銀行帳戶（用於代墊款匯款）

**帳號建立模式**：
- **員工編號模式**：使用 `{login_id}@6owldoor.internal` 作為虛擬 email，適合門市員工
- **Email 模式**：使用真實 Email 登入，適合總部人員

**相關 Edge Functions**：

| Function | 權限 | 用途 |
|----------|------|------|
| `create-employee-account` | `employee.create` 或 `profile.create` | 建立員工帳號（免 Email 驗證） |
| `invite-employee` | `employee.create` 或 `profile.create` | 發送邀請信（需 Email 驗證） |
| `reset-user-password` | `profile.edit` | 管理員重設他人密碼 |

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

### SearchableSelect 元件

系統中有多個 SearchableSelect 元件，支援搜尋和**鍵盤導航**功能：

| 元件位置 | 色系 | 用途 |
|---------|------|------|
| `src/components/ui/SearchableSelect.jsx` | Blue/Gray | 共用元件 |
| `src/system/payment_system/src/components/SearchableSelect.jsx` | Red/Stone | 付款系統 |
| `src/system/expense_reimbursement_system/src/components/SearchableSelect.jsx` | Amber/Stone | 代墊款系統 |
| `src/system/erp_system/src/components/SearchableSelect.jsx` | Orange/Stone | ERP 系統 |
| `src/system/store_management_system/src/components/BankAccountManagement.jsx` | Green/Stone | 門市銀行帳戶（內嵌） |

**⚠️ 重要設計標準：銀行選擇必須使用 SearchableSelect**

所有需要選擇銀行（總行）和分行的欄位，**必須使用 SearchableSelect 元件**，而非一般的 `<select>` 元素。

**原因**：
1. 台灣銀行數量眾多（約 40 家總行、數千家分行），一般下拉選單難以快速選取
2. 使用者可輸入銀行代碼（如 "812"）快速搜尋台新銀行
3. 使用者可輸入關鍵字（如 "國泰"）快速過濾結果
4. 鍵盤導航支援提升填表效率

**正確用法**：
```jsx
// ✅ 正確：使用 SearchableSelect
<SearchableSelect
  options={banks.map(bank => ({
    value: bank.code,
    label: bank.name,
    subLabel: bank.code  // 顯示銀行代碼
  }))}
  value={formData.bank_code}
  onChange={(value) => handleChange('bank_code', value)}
  placeholder="請選擇銀行（可輸入代碼或名稱搜尋）"
/>

// ❌ 錯誤：使用一般 select
<select value={formData.bank_code} onChange={(e) => ...}>
  {banks.map(bank => <option key={bank.code}>{bank.name}</option>)}
</select>
```

**鍵盤導航功能**：
- `↑` `↓`：上下選擇選項
- `Enter`：確認選擇
- `Tab`：選擇當前高亮項目並移至下一欄位
- `Esc`：關閉下拉選單
- 輸入文字：即時搜尋過濾（支援代碼、名稱搜尋）

**使用範例**（快速選擇銀行）：
```jsx
// 使用者輸入 "812" 後按 Enter，即可快速選擇台新銀行
<SearchableSelect
  options={bankOptions}
  value={selectedBank}
  onChange={setSelectedBank}
  placeholder="請選擇銀行"
/>
```

**核心實作邏輯**：
```javascript
// 鍵盤導航處理
const handleKeyDown = (e) => {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, filteredOptions.length - 1));
      break;
    case 'ArrowUp':
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
      break;
    case 'Enter':
      e.preventDefault();
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
      break;
    case 'Tab':
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value);
      }
      break;
    case 'Escape':
      setIsOpen(false);
      break;
  }
};
```

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

// 定義哪些表在 public schema（共用資料）
const PUBLIC_TABLES = [
  'brands', 'stores', 'profiles', 'employees', 'employees_with_details',
  'departments', 'banks', 'bank_branches', 'store_bank_accounts'
];

// 定義哪些表在此系統專用 schema
const SYSTEM_TABLES = ['table1', 'table2'];

export const supabase = {
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  removeChannel: (channel) => mainClient.removeChannel(channel),

  // 暴露 schema 方法供跨 schema 查詢使用（如 RBAC）
  schema: (schemaName) => mainClient.schema(schemaName),

  from: (table) => {
    if (PUBLIC_TABLES.includes(table)) {
      return mainClient.from(table); // public schema
    }
    // 系統專用表使用專用 schema
    return mainClient.schema('new_system').from(table);
  },
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
```

**重要**：確保 `PUBLIC_TABLES` 包含所有共用資料表，特別是：
- `banks`, `bank_branches`, `store_bank_accounts`（銀行相關，用於匯出功能）
- `brands`, `stores`（品牌門市）
- `employees`, `profiles`（人員資料）

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

#### Step 6: 建立標準格式的 Header 和 Layout ⭐

**重要**：所有子系統必須使用統一的 Header 和 Layout 格式，參考 `payment_system` 的實作。

**Header 組件** (`src/system/new_system/src/components/Header.jsx`)：
```jsx
// 標準 Header 結構（參考 payment_system/src/components/Header.jsx）
// 必須包含以下元素：
// 1. 左側：六扇門 Logo + 子系統標題（圖標 + 名稱）
// 2. 中間：電腦版導覽選單（總覽看板、新增申請等）
// 3. 右側：使用者下拉選單（姓名、角色、帳戶設定、登出）
// 4. 手機版：漢堡選單

import logoSrc from '../../../../assets/logo.png';
import { useAuth } from '../../../../contexts/AuthContext';
import { useUserRole } from '../../../../hooks/useUserRole';
// ... 其他必要 imports

const BASE_PATH = '/systems/new-system';

// Logo 組件（統一樣式）
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10 sm:w-12 sm:h-12';
  return (
    <div className={`${sizeClasses} relative flex items-center justify-center`}>
      <img src={logoSrc} alt="六扇門 Logo" className="w-full h-full object-contain filter drop-shadow-md" />
    </div>
  );
};
```

**Layout 組件** (`src/pages/systems/NewSystemLayout.jsx`)：
```jsx
// 標準 Layout 結構（參考 PaymentSystemLayout.jsx）
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../system/new_system/src/components/Header.jsx';
import Dashboard from '../../system/new_system/src/pages/Dashboard.jsx';

// 受保護路由組件
const NewSystemProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Outlet />;
};

// 內部佈局組件
const NewSystemInternalLayout = () => (
  <div className="min-h-screen bg-stone-50 text-stone-900">
    <Header />
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <Outlet />
    </main>
  </div>
);

export default function NewSystemLayout() {
  return (
    <Routes>
      <Route element={<NewSystemProtectedRoute />}>
        <Route element={<NewSystemInternalLayout />}>
          <Route index element={<Dashboard />} />
          {/* 其他路由 */}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/systems/new-system" replace />} />
    </Routes>
  );
}
```

**色系對照表**（各子系統使用不同主色）：

| 系統 | 主色系 | 用途 |
|------|--------|------|
| 付款簽核 | `red-600` / `red-700` | 財務相關 |
| 代墊款 | `amber-600` / `amber-700` | 財務相關 |
| ERP 管理 | `orange-600` / `amber-600` | 營運相關 |
| 教育訓練 | `blue-600` / `blue-700` | 人資相關 |
| 軟體授權 | `purple-600` / `purple-700` | IT 相關 |
| 會議室 | `teal-600` / `teal-700` | 行政相關 |

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

**錯誤**: `Could not find the table 'schema_name.table_name' in the schema cache`

**常見原因**：
- 子系統的 `supabaseClient.js` 未將該表加入 `PUBLIC_TABLES` 陣列
- 表已遷移到不同 schema，但前端配置未更新

**解決方案**：

1. 檢查並更新 `supabaseClient.js` 的 `PUBLIC_TABLES` 陣列：
```javascript
// 確保包含所有 public schema 的表
const PUBLIC_TABLES = [
  'brands', 'stores', 'profiles', 'employees', 'employees_with_details',
  'departments', 'banks', 'bank_branches', 'store_bank_accounts'  // 銀行相關表
];
```

2. 如果需要嵌套查詢，使用分別查詢 + 前端組合：
```javascript
// ❌ 錯誤：跨 schema 嵌套查詢
const { data } = await supabase
  .from('requests')
  .select('*, employee:employees(name)');  // 可能失敗

// ✅ 正確：分別查詢後組合
const { data: requests } = await supabase.from('requests').select('*');
const { data: employees } = await supabase.from('employees').select('*');
const enriched = requests.map(r => ({
  ...r,
  employee: employees.find(e => e.id === r.employee_id)
}));
```

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

#### 5. 員工編號與登入帳號混淆

**問題**: 員工編號已修改但無法登入

**原因**: `login_id` 才是登入帳號，`employee_id` 只是行政用途

**排查**:
```sql
-- 檢查員工的登入帳號
SELECT employee_id, login_id, name
FROM employees
WHERE employee_id = 'A001';

-- 檢查 auth.users 中的 email
SELECT id, email
FROM auth.users
WHERE email LIKE '%@6owldoor.internal';
```

**設計原則**:
- `login_id` 對應 `auth.users.email` 的 `@` 前面部分
- 修改 `employee_id` 不會影響登入
- 修改 `login_id` 後需要同步更新 `auth.users.email`（目前設計為不可修改）

#### 6. 前端欄位顯示 disabled 但不應該

**排查步驟**:
1. 確認使用的是哪個組件版本（如 `EmployeesManagement.jsx` vs `EmployeesManagementV2.jsx`）
2. 檢查 `ManagementCenter.jsx` 中的 import 和 component 引用
3. 確認本地代碼已保存並被 Vite 熱更新
4. 如果是部署環境，確認已 commit 並 push 到 Vercel

---

## 重要提醒 (For AI Assistants)

1. **語言**: 所有 UI 文字使用**繁體中文**
2. **地區**: 系統為台灣餐飲業設計
3. **權限**: 新增功能前先檢查現有 RBAC 權限
4. **資料庫**: 使用 Supabase MCP 工具進行資料庫操作
5. **RLS**: 所有新表格必須啟用 Row Level Security
6. **設計**: 遵循現有設計系統（紅色主色、Stone 中性色）
7. **模式**: 遵循現有組件模式和目錄結構
8. **登入帳號**: `login_id` 設定後不可修改，`employee_id` 可自由修改

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
| 薪資計算 | `src/system/payroll_system/src/pages/payroll/PayrollList.jsx` | 薪資計算核心邏輯 (calculatePayroll 函數) |

---

## 版本歷史

| 日期 | 變更內容 |
|------|----------|
| 2026-01-28 | **新增銀行資料表結構文檔**：詳細說明 `banks`/`bank_branches` 表的欄位命名規則（使用 `bank_code`/`bank_name` 而非 `code`/`name`），包含正確的查詢方式和 SearchableSelect 選項映射範例 |
| 2026-01-28 | **新增銀行選擇標準**：所有銀行/分行選擇欄位必須使用 SearchableSelect 元件（支援代碼/名稱搜尋、鍵盤導航）；新增 ERP 系統 SearchableSelect 元件（Orange 色系） |
| 2026-01-28 | **新增子系統 Header/Layout 標準格式說明**：所有子系統必須使用統一的 Header 和 Layout 結構，參考 payment_system 實作，包含六扇門 Logo、系統標題、導覽選單、使用者下拉選單、手機版漢堡選單 |
| 2026-01-28 | 新增 SearchableSelect 鍵盤導航功能文檔（↑↓選擇、Enter確認、Tab跳轉）；銀行資料表遷移至 public schema；ExportModal 自動帶入門市銀行帳戶；更新 supabaseClient 跨 schema 配置指南 |
| 2026-01-28 | 新增薪資管理系統文檔：薪資計算規則、請假扣款/加給邏輯、總部手動輸入欄位、勞健保計算說明 |
| 2026-01-27 | 新增直屬主管設計、Edge Function RBAC 權限檢查、角色分類設計、管理中心整合說明 |
| 2026-01-27 | 新增 `login_id` 欄位設計說明、管理中心文檔、故障排除更新 |
| 2026-01-23 | 初版建立 |

---

**文檔維護**: Claude AI Assistant
**最後更新**: 2026-01-28

---

## 附錄：子系統 supabaseClient 配置參考

### payment_system/src/supabaseClient.js
```javascript
// brands 和 stores 已遷移到 public schema
// store_bank_accounts, banks, bank_branches 也在 public schema（用於銀行媒體檔匯出）
const PUBLIC_TABLES = [
  'brands', 'stores', 'profiles', 'employees', 'employees_with_details',
  'store_bank_accounts', 'banks', 'bank_branches'
];

export const supabase = {
  auth: mainClient.auth,
  storage: mainClient.storage,
  schema: (schemaName) => mainClient.schema(schemaName),
  from: (table) => {
    if (PUBLIC_TABLES.includes(table)) {
      return mainClient.from(table);  // public schema
    }
    return mainClient.schema('payment_approval').from(table);  // 系統專用
  },
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
```

### expense_reimbursement_system/src/supabaseClient.js
```javascript
// 代墊款系統所有表都在 public schema
const PUBLIC_TABLES = [
  'brands', 'stores', 'profiles', 'employees', 'employees_with_details',
  'departments', 'banks', 'bank_branches', 'store_bank_accounts',
  'expense_reimbursement_requests', 'expense_reimbursement_items', 'expense_approvals'
];

export const supabase = {
  auth: mainClient.auth,
  storage: mainClient.storage,
  schema: (schemaName) => mainClient.schema(schemaName),
  from: (table) => mainClient.from(table),  // 全部使用 public schema
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
```
