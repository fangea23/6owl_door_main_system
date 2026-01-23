# 六扇門主系統 (6owl_door_main_system) 完整技術文檔

**最後更新**: 2026-01-23
**文檔版本**: 1.2
**系統狀態**: 多系統整合運行中

---

## 目錄

1. [系統全景](#系統全景)
2. [整體架構](#整體架構)
3. [技術棧](#技術棧)
4. [數據庫架構](#數據庫架構)
5. [RBAC 權限系統](#rbac-權限系統)
6. [子系統詳解](#子系統詳解)
7. [Portal 主系統](#portal-主系統)
8. [跨系統共用資源](#跨系統共用資源)
9. [開發模式與最佳實踐](#開發模式與最佳實踐)
10. [部署與維護](#部署與維護)
11. [故障排除指南](#故障排除指南)

---

## 系統全景

### 業務概述

**六扇門** 是一個多品牌餐飲集團管理系統，包含以下品牌：
- 🍜 **六扇門**: 主要餐飲品牌
- 🍚 **粥大福**: 粥品品牌

系統整合了財務管理、店舖管理、員工管理等多個業務模組，實現完整的企業資源規劃（ERP）功能。

### 系統模組一覽

```
六扇門主系統
├── 🏠 Portal (入口系統)
│   └── 統一認證、權限控制、系統導航
│
├── 💰 財務管理
│   ├── 付款簽核系統 (Payment Approval System)
│   └── 員工代墊款系統 (Employee Reimbursement System)
│
├── 🏪 運營管理
│   ├── 店舖管理系統 (Store Management System)
│   └── [其他運營模組]
│
├── 👥 人事管理
│   ├── 員工資料管理
│   └── 部門組織架構
│
└── 📚 教育訓練
    └── 員工教育訓練系統 (Training System) - Schema: training
```

---

## 整體架構

### 架構圖

```
┌─────────────────────────────────────────────────────────────┐
│                        前端層 (React)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Portal  │  │  付款簽核  │  │  代墊款   │  │  店舖管理  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    認證與權限層 (Supabase Auth)               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  RBAC 權限系統 (roles, permissions, role_permissions)  │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   數據層 (Supabase PostgreSQL)               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   public   │  │  payment_  │  │   其他      │           │
│  │   schema   │  │  approval  │  │   schema   │           │
│  │            │  │   schema   │  │            │           │
│  │ • users    │  │ • requests │  │            │           │
│  │ • employees│  │ • banks    │  │            │           │
│  │ • stores   │  │ • branches │  │            │           │
│  │ • expense_ │  │            │  │            │           │
│  │   requests │  │            │  │            │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                              │
│  RLS (Row Level Security) 貫穿所有表格                        │
└─────────────────────────────────────────────────────────────┘
```

### 設計原則

#### 1. 微前端架構
每個子系統都是獨立的 React 應用，通過 Portal 整合：
- **獨立開發**：各系統可獨立開發、測試、部署
- **統一認證**：共用 Supabase Auth
- **統一權限**：共用 RBAC 系統
- **統一導航**：通過 Portal 入口

#### 2. Schema 隔離
不同業務模組使用不同的 schema：
- `public`: 共用資料（員工、部門、店舖等）
- `rbac`: 權限控制系統（角色、權限、關聯）
- `payment_approval`: 付款簽核專用
- `training`: 教育訓練系統專用
- 其他 schema 依業務需求建立

**優點**：
- 資料隔離，降低耦合
- 權限控制更細緻
- 遷移和備份更靈活

#### 3. Code-Based 連結模式（BIGINT）
跨表關聯優先使用 `code` 欄位（轉為 BIGINT）而非 UUID：

**適用場景**：
- `brands.code` → 品牌代碼（2 位數字：01-89 品牌，90-99 供應商）
- `stores.code` → 門市代碼（5 位數字：BBSSS，BB=品牌，SSS=門市序號）
- `departments.code` → 部門代碼

**實作方式**：
```sql
-- 員工表使用 BIGINT code 連結
ALTER TABLE public.employees
ADD COLUMN brand_id BIGINT,  -- 對應 brands.code::BIGINT
ADD COLUMN store_id BIGINT;  -- 對應 stores.code::BIGINT

-- 訓練系統課程表
CREATE TABLE training.courses (
  brand_id BIGINT,           -- 品牌代碼
  target_departments BIGINT[] -- 部門代碼陣列
);

-- 視圖中使用 code::BIGINT 進行 JOIN
CREATE VIEW training.course_stats AS
SELECT c.*, b.name AS brand_name
FROM training.courses c
LEFT JOIN public.brands b ON c.brand_id = b.code::BIGINT;
```

**優點**：
- 可讀性高（品牌 01、02 比 UUID 易懂）
- 跨系統整合更方便
- 適合匯入/匯出作業

#### 3. RLS 優先安全模型
所有資料存取都通過 RLS 控制：
- 前端 RBAC：功能可見性控制
- 後端 RLS：資料存取安全保障
- 雙重防護，確保安全

---

## 技術棧

### 前端技術

```javascript
{
  "核心框架": "React 18+",
  "路由": "React Router v6",
  "狀態管理": "React Hooks (useState, useContext)",
  "UI框架": "Tailwind CSS",
  "圖標": "Lucide React",
  "表單": "原生 React (無額外庫)",
  "HTTP客戶端": "Supabase JavaScript Client"
}
```

### 後端技術

```javascript
{
  "數據庫": "PostgreSQL 15+ (via Supabase)",
  "認證": "Supabase Auth (JWT)",
  "即時通訊": "Supabase Realtime",
  "儲存": "Supabase Storage",
  "API": "Supabase PostgREST (自動生成 REST API)"
}
```

### 開發工具

```javascript
{
  "包管理器": "npm",
  "建置工具": "Vite / Create React App",
  "版本控制": "Git",
  "程式碼風格": "ESLint + Prettier (可選)",
  "數據庫遷移": "Supabase CLI"
}
```

---

## 數據庫架構

### Schema 設計策略

#### Public Schema (共用資料)
存放所有系統共用的基礎資料：

```sql
-- 認證與用戶
auth.users                    -- Supabase 內建用戶表

-- 組織架構
public.employees              -- 員工資料
public.departments            -- 部門
public.brands                 -- 品牌 (六扇門、粥大福)

-- 店舖相關
public.stores                 -- 店舖資料
public.store_managers         -- 店長關聯

-- 代墊款系統
public.expense_reimbursement_requests   -- 申請主表
public.expense_reimbursement_items      -- 明細表
public.expense_approvals                -- 簽核記錄

-- RBAC 權限系統
public.rbac.roles             -- 角色
public.rbac.permissions       -- 權限
public.rbac.role_permissions  -- 角色權限關聯
public.rbac.user_roles        -- 用戶角色關聯
```

#### Payment_Approval Schema (付款簽核)
付款簽核系統專用資料：

```sql
payment_approval.payment_requests    -- 付款申請
payment_approval.banks               -- 銀行列表 (共用)
payment_approval.branches            -- 分行列表 (共用)
```

### 跨 Schema 關聯規則

**原則**：避免跨 schema 的外鍵約束，使用應用層關聯

```javascript
// ❌ 錯誤：跨 schema 外鍵
CREATE TABLE payment_approval.requests (
  employee_id UUID REFERENCES public.employees(id)  -- 不建議
);

// ✅ 正確：應用層關聯
CREATE TABLE payment_approval.requests (
  employee_id UUID  -- 無外鍵約束，應用層檢查
);

// 前端查詢時分別取得再組合
const { data: requests } = await supabase
  .from('payment_requests')
  .select('*');

const { data: employees } = await supabase
  .from('employees')
  .select('*')
  .in('id', requests.map(r => r.employee_id));

// 前端組合資料
const enriched = requests.map(r => ({
  ...r,
  employee: employees.find(e => e.id === r.employee_id)
}));
```

### 常用表格結構

#### employees (員工表)
```sql
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id),  -- 關聯認證用戶
  employee_id TEXT UNIQUE NOT NULL,                -- 員工編號
  name TEXT NOT NULL,                              -- 姓名
  department_id UUID REFERENCES public.departments(id),
  role TEXT,                                       -- 業務角色 (boss, audit_manager, accountant 等)
  status TEXT DEFAULT 'active',                    -- active, inactive, resigned
  hire_date DATE,
  resign_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### departments (部門表)
```sql
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                       -- 部門代碼
  name TEXT NOT NULL,                              -- 部門名稱
  org_type VARCHAR(20) DEFAULT 'headquarters',     -- headquarters/brand/store
  parent_id UUID REFERENCES public.departments(id), -- 上級部門
  manager_id UUID REFERENCES public.employees(id),  -- 部門主管
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**總部部門清單**：

| 代碼 | 名稱 | 說明 |
|------|------|------|
| `FIN` | 財務部 | 會計、出納 |
| `HR` | 人力資源部 | 人資專員 |
| `OPS` | 營運部 | 督導管理、門市營運 |
| `PUR` | 採購部 | 採購作業 |
| `IT` | 資訊技術部 | IT 維護 |
| `ADMIN` | 行政管理部 | 一般行政 |
| `RD` | 研發部 | 產品研發 |
| `SALES` | 行銷部 | 品牌行銷 |
| `ART` | 美編部 | 視覺設計 |
| `MAINT` | 工務部 | 門市設備維護、裝修工程 |

#### stores (店舖表)
```sql
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT UNIQUE NOT NULL,                 -- 店舖代碼
  name TEXT NOT NULL,                              -- 店舖名稱
  brand TEXT NOT NULL,                             -- 六扇門 / 粥大福
  address TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',                    -- active, closed
  opening_date DATE,
  closing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## RBAC 權限系統

### 架構設計

RBAC (Role-Based Access Control) 系統是整個平台的權限核心。

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

### 核心表格

#### rbac.roles (角色表)
```sql
CREATE TABLE rbac.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                       -- 角色代碼
  name TEXT NOT NULL,                              -- 角色名稱
  level INT NOT NULL DEFAULT 0,                    -- 角色等級（越高權限越大）
  scope_type VARCHAR(20) DEFAULT 'self',           -- 資料範圍
  org_type VARCHAR(20) DEFAULT 'both',             -- 組織類型
  description TEXT,
  is_franchise_allowed BOOLEAN DEFAULT true,       -- 加盟店是否可用
  created_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ                           -- 軟刪除
);
```

#### 資料範圍類型 (scope_type)

| 類型 | 說明 | 實現方式 |
|------|------|----------|
| `all` | 全集團所有資料 | 無過濾 |
| `assigned_brands` | 僅負責的品牌 | 透過 `user_brand_assignments` 表 |
| `assigned_stores` | 僅負責的門市群 | 透過 `user_store_assignments` 表 |
| `own_store` | 僅所屬門市 | 透過 `employees.store_id` |
| `self` | 僅自己的資料 | `user_id = auth.uid()` |

#### 組織類型 (org_type)

| 類型 | 說明 |
|------|------|
| `headquarters` | 僅限總部人員使用 |
| `store` | 僅限門市人員使用 |
| `both` | 總部和門市皆可使用 |

#### 角色清單（有效角色）

| 等級 | 代碼 | 名稱 | 資料範圍 | 組織類型 |
|------|------|------|----------|----------|
| 100 | `super_admin` | 超級管理員 | all | both |
| 95 | `ceo` | 總經理 | all | headquarters |
| 90 | `boss` | 總經理室主管 | all | headquarters |
| 90 | `director` | 部門總監 | all | headquarters |
| 85 | `hq_fin_manager` | 財務經理 | all | headquarters |
| 85 | `hq_hr_manager` | 人資經理 | all | headquarters |
| 85 | `hq_ops_manager` | 營運經理 | all | headquarters |
| 80 | `area_supervisor` | 區域督導 | assigned_stores | headquarters |
| 75 | `hq_accountant` | 會計 | assigned_brands | headquarters |
| 75 | `hq_auditor` | 審計 | all | headquarters |
| 75 | `hq_cashier` | 出納 | assigned_brands | headquarters |
| 70 | `hq_hr_specialist` | 人資專員 | assigned_brands | headquarters |
| 70 | `hq_it_admin` | 資訊管理員 | all | headquarters |
| 70 | `hq_purchaser` | 採購專員 | assigned_brands | headquarters |
| 70 | `hq_trainer` | 教育訓練專員 | assigned_brands | headquarters |
| 65 | `store_manager` | 店長 | own_store | store |
| 60 | `car_admin` | 車輛管理員 | all | headquarters |
| 55 | `assistant_manager` | 副店長 | own_store | store |
| 50 | `hq_staff` | 總部一般員工 | self | headquarters |
| 50 | `meeting_admin` | 會議室管理員 | all | headquarters |
| 40 | `store_staff` | 正職人員 | own_store | store |
| 30 | `store_parttime` | 計時人員 | self | store |
| 10 | `user` | 一般使用者 | self | both |

> **注意**：已停用的角色（`admin`, `accountant`, `cashier`, `hr`, `audit_manager`, `manager`, `staff`, `unit_manager`）透過 `deleted_at` 軟刪除，保留歷史資料但不再使用。

#### rbac.permissions (權限表)
```sql
CREATE TABLE rbac.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                       -- 權限代碼 (payment.approve.boss)
  name TEXT NOT NULL,                              -- 權限名稱
  description TEXT,
  module TEXT NOT NULL,                            -- 所屬模組 (payment_approval, expense_reimbursement)
  category TEXT,                                   -- 分類 (read, write, approve, delete, system)
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

> ⚠️ **重要**：`module` 欄位為 **NOT NULL**，新增權限時必須指定！

**權限命名規範**：
```
<module>.<action>.<scope>

例如：
- payment.view.own          # 查看自己的付款申請
- payment.view.all          # 查看所有付款申請
- payment.approve.boss      # 放行主管簽核
- expense.create            # 建立代墊款申請
- system.payment_approval   # 訪問付款簽核系統
- system.training           # 訪問教育訓練系統
```

**新增權限的正確範例**：
```sql
-- ✅ 正確：包含 module 欄位
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  ('system.training', '存取教育訓練系統', '可以存取教育訓練系統', 'training', 'system'),
  ('training.view', '查看訓練課程', '查看已發布的訓練課程', 'training', 'training'),
  ('training.manage.courses', '管理課程', '建立、編輯、刪除課程', 'training', 'training')
ON CONFLICT (code) DO NOTHING;

-- ❌ 錯誤：缺少 module 欄位會報錯
-- ERROR: null value in column "module" violates not-null constraint
INSERT INTO rbac.permissions (code, name, description, category) VALUES
  ('system.training', '存取教育訓練系統', '可以存取教育訓練系統', 'system');
```

#### rbac.role_permissions (角色權限關聯)
```sql
CREATE TABLE rbac.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES rbac.roles(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES rbac.permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);
```

#### rbac.user_roles (用戶角色關聯)
```sql
CREATE TABLE rbac.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES rbac.roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);
```

### 前端權限檢查

#### usePermission Hook
```javascript
// src/hooks/usePermission.js
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const usePermission = (permissionCode) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPermission = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setHasPermission(false);
        setLoading(false);
        return;
      }

      // 查詢用戶是否擁有該權限
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: user.id,
        p_permission_code: permissionCode
      });

      setHasPermission(data || false);
      setLoading(false);
    };

    checkPermission();
  }, [permissionCode]);

  return { hasPermission, loading };
};
```

#### 使用範例
```javascript
import { usePermission } from '../hooks/usePermission';

function ApprovalButton() {
  const { hasPermission, loading } = usePermission('payment.approve.boss');

  if (loading) return <Loader />;
  if (!hasPermission) return null;  // 無權限則不顯示按鈕

  return (
    <button onClick={handleApprove}>
      核准
    </button>
  );
}
```

### 資料庫權限檢查函數

```sql
-- 檢查用戶是否有特定權限
CREATE OR REPLACE FUNCTION public.check_user_permission(
  p_user_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM rbac.user_roles ur
    JOIN rbac.role_permissions rp ON ur.role_id = rp.role_id
    JOIN rbac.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.code = p_permission_code
      AND p.deleted_at IS NULL
  );
END;
$$;
```

---

## 子系統詳解

### 1. 付款簽核系統 (Payment Approval System)

**路徑**: `src/system/payment_system/`
**Schema**: `payment_approval`
**狀態**: ✅ 已上線

#### 核心功能
- 員工提交付款申請
- 多關卡簽核流程：單位主管 → 會計 → 審核主管 → 出納 → 放行主管
- 自動跳過邏輯（申請人是會計時自動跳過會計關卡）
- 銀行/分行資料管理

#### 簽核流程
```
pending_unit_manager (單位主管)
    ↓
pending_accountant (會計) [*可跳過]
    ↓
pending_audit_manager (審核主管)
    ↓
pending_cashier (出納)
    ↓
pending_boss (放行主管)
    ↓
approved (已核准)
```

#### 關鍵設計
- **狀態驅動**：使用 `status` 和 `current_step` 追蹤流程
- **時間戳記錄**：每個關卡都有 `sign_xxx_at` 記錄簽核時間
- **URL 記錄**：`sign_xxx_url` 記錄簽核來源（按鈕 or 自動跳過）
- **手續費管理**：出納可填寫 `handling_fee`

#### 資料表
```sql
payment_approval.payment_requests (
  id, request_number, applicant_id, amount,
  status, current_step,
  bank_name, account_number,
  sign_unit_manager_at, sign_accountant_at, sign_audit_manager_at,
  sign_cashier_at, sign_boss_at,
  handling_fee, rejection_reason, ...
)
```

### 2. 員工代墊款系統 (Employee Reimbursement System)

**路徑**: `src/system/expense_reimbursement_system/`
**Schema**: `public`
**狀態**: ✅ 已開發完成，待測試部署

#### 核心功能
- 員工填寫代墊款申請（最多 15 行明細）
- 根據金額自動路由簽核流程
- 多品牌分帳（六扇門、粥大福）
- 兩種撥款方式（領現、匯款）
- 品項必填驗證

#### 簽核流程
```
送出申請
    │
    ├─ 金額 ≥ NT$30,000 → pending_ceo (總經理)
    │                         ↓
    └─ 金額 < NT$30,000 → pending_boss (放行主管)
                              ↓
                      pending_audit_manager (審核主管)
                              ↓
                          approved (已核准)
```

#### 關鍵設計
- **無草稿功能**：直接送出進入簽核（與付款系統一致）
- **品項必填**：有金額的項目必須填寫品項
- **防重複簽核**：前端檢查，同一用戶不能重複簽核
- **先記錄後更新**：先插入簽核記錄，再更新申請狀態
- **跨 schema 資料**：銀行/分行資料來自 `payment_approval` schema

#### 資料表
```sql
public.expense_reimbursement_requests (
  id, request_number, applicant_id, department_id,
  total_amount, brand_totals (JSONB),
  payment_method, bank_name, account_number,
  status, current_approver_id, ...
)

public.expense_reimbursement_items (
  id, request_id, line_number (1-15),
  category, description, amount, receipt_count,
  cost_allocation (六扇門/粥大福), usage_note, ...
)

public.expense_approvals (
  id, request_id, approver_id, approval_type,
  approval_order, status, comment, approved_at
)
```

#### 已解決的關鍵問題
1. **簽核人無法更新狀態** → 新增 RLS 政策允許簽核人更新
2. **簽核記錄插入失敗** → 簡化 RLS 政策，不依賴 `current_approver_id`
3. **跨 schema 查詢失敗** → 自訂 supabaseClient 進行 schema 路由
4. **品項顯示問題** → 新增品項必填驗證與視覺提示

**詳細文檔**: `/src/system/expense_reimbursement_system/SYSTEM_DOCUMENTATION.md`

### 3. 店舖管理系統 (Store Management System)

**路徑**: `src/system/store_management_system/`
**Schema**: `public`
**狀態**: 🚧 開發中

#### 核心功能
- 店舖基本資料管理
- 店長指派
- 品牌關聯（六扇門、粥大福）

#### 資料表
```sql
public.stores (
  id, store_code, name, brand,
  address, phone, status,
  opening_date, closing_date, ...
)

public.store_managers (
  id, store_id, employee_id,
  assigned_at, removed_at
)
```

### 4. 教育訓練系統 (Training System)

**路徑**: `src/system/training_system/`
**Schema**: `training`（獨立 schema）
**狀態**: 🚧 開發中

#### 核心功能
- **總部端**：課程管理、內容編輯、報表查看
- **門市端**：課程學習、測驗作答
- **多品牌支援**：六扇門、粥大福有不同訓練內容
- **新人 Onboarding**：Checklist 模板、主管簽核

#### 架構說明
```
training schema（獨立於 public）
├── courses          # 課程主表
├── lessons          # 課程章節
├── questions        # 測驗題目
├── categories       # 課程分類
├── enrollments      # 學習進度
├── quiz_attempts    # 測驗記錄
├── lesson_progress  # 章節完成記錄
├── onboarding_templates  # 新人訓練模板
├── onboarding_items      # 訓練項目
└── onboarding_progress   # 新人進度
```

#### 關鍵設計：Code-Based 連結
使用 BIGINT 儲存 code 值，而非 UUID 外鍵：

```sql
-- 課程：使用品牌代碼連結
CREATE TABLE training.courses (
  brand_id BIGINT,             -- 對應 brands.code::BIGINT (01, 02...)
  target_departments BIGINT[], -- 部門代碼陣列
  ...
);

-- 新人訓練進度：使用門市代碼連結
CREATE TABLE training.onboarding_progress (
  store_id BIGINT,             -- 對應 stores.code::BIGINT (01001, 02015...)
  ...
);

-- 視圖：使用 code::BIGINT 進行 JOIN
CREATE VIEW training.course_stats AS
SELECT c.*, b.name AS brand_name
FROM training.courses c
LEFT JOIN public.brands b ON c.brand_id = b.code::BIGINT;
```

#### Code 格式說明
| 欄位 | 格式 | 範例 | 說明 |
|------|------|------|------|
| `brands.code` | 2 位數字 | `'01'`, `'02'` | 01-89 品牌，90-99 供應商 |
| `stores.code` | 5 位數字 | `'01001'`, `'02015'` | BB=品牌代碼，SSS=門市序號 |
| `departments.code` | 自訂格式 | `'HQ01'`, `'OP02'` | 依部門類型設計 |

#### RBAC 權限
```sql
-- 系統權限（module = 'training'）
system.training           -- 存取教育訓練系統
training.view             -- 查看訓練課程
training.enroll           -- 參加訓練
training.manage.courses   -- 管理課程（總部）
training.manage.content   -- 編輯內容（總部）
training.view.reports     -- 查看報表（總部）
training.manage.onboarding -- 管理新人訓練
training.sign_off         -- 簽核訓練（門市主管）
```

#### 前端品牌選擇（CourseEditor.jsx）
```javascript
// 品牌下拉選單使用 code 作為 value
<select
  value={course.brand_id || ''}
  onChange={(e) => setCourse({
    ...course,
    brand_id: e.target.value ? parseInt(e.target.value) : null
  })}
>
  <option value="">全品牌通用</option>
  {brands.map(brand => (
    <option key={brand.id} value={parseInt(brand.code)}>
      {brand.name} ({brand.code})
    </option>
  ))}
</select>
```

#### useCurrentUser Hook 整合
```javascript
// src/hooks/useCurrentUser.js
const currentUser = {
  // 基本資訊
  id: employee?.user_id,
  name: employee?.name,

  // 品牌與門市資訊（BIGINT code）
  brandId: employee?.brand_id || null,    // BIGINT
  brandName: employee?.brand_name || null,
  storeId: employee?.store_id || null,    // BIGINT
  storeName: employee?.store_name || null,
};
```

### 5. 管理中心 (Management Center)

**路徑**: `src/pages/management/`
**功能**: 組織架構、員工、督導、權限管理
**狀態**: ✅ 已上線

#### 核心功能

管理中心整合了所有組織管理功能，包含以下頁籤：

| 頁籤 | 元件 | 功能說明 | 所需權限 |
|------|------|----------|----------|
| 組織架構 | `OrganizationManagement` | 品牌與門市管理 | `employee.edit` |
| 督導管理 | `SupervisorManagement` | 督導-門市指派 | `employee.edit` |
| 用戶帳號 | `ProfilesManagement` | 系統帳號與角色 | `employee.view` |
| 員工資料 | `EmployeesManagementV2` | 員工資訊管理 | `employee.edit` |
| 部門管理 | `DepartmentsManagement` | 部門架構 | `employee.edit` |
| 會計品牌分配 | `AccountantBrandsManagement` | 會計負責品牌 | `employee.edit` |
| 權限管理 | `PermissionManagement` | RBAC 角色權限 | `rbac.manage` |

#### 督導管理架構

採用**直接指派模式**（不使用區域分組）：

```sql
-- 督導-門市指派表
CREATE TABLE rbac.user_store_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  store_id BIGINT NOT NULL,                        -- stores.code
  assignment_type VARCHAR(50) NOT NULL,            -- 'supervisor', 'temp_manager' 等
  assigned_at TIMESTAMPTZ DEFAULT now(),
  assigned_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  UNIQUE(user_id, store_id, assignment_type)
);

-- 督導摘要視圖
CREATE VIEW rbac.supervisor_summary AS
SELECT
  u.id AS user_id,
  u.email,
  e.name AS supervisor_name,
  COUNT(usa.store_id) AS store_count,
  ARRAY_AGG(DISTINCT s.brand_id) AS brand_ids
FROM auth.users u
JOIN public.employees e ON u.id = e.user_id
LEFT JOIN rbac.user_store_assignments usa
  ON u.id = usa.user_id AND usa.assignment_type = 'supervisor'
LEFT JOIN public.stores s ON usa.store_id = s.code::BIGINT
WHERE e.role = 'area_supervisor' OR e.position_code = 'area_supervisor'
GROUP BY u.id, u.email, e.name;
```

**督導管理函數**：
```sql
-- 批次指派門市給督導
rbac.assign_stores_to_supervisor(
  p_supervisor_id UUID,
  p_store_ids BIGINT[],
  p_assigned_by UUID
)

-- 移除督導的門市
rbac.remove_stores_from_supervisor(
  p_supervisor_id UUID,
  p_store_ids BIGINT[]
)

-- 取得督導的門市列表
rbac.get_supervisor_stores(p_supervisor_id UUID)
```

#### 員工管理新欄位

`employees` 表新增以下欄位支援更精細的分類：

| 欄位 | 類型 | 說明 |
|------|------|------|
| `org_type` | VARCHAR(20) | 組織類型：`headquarters` / `store` |
| `employment_type` | VARCHAR(20) | 僱用類型：`fulltime` / `parttime` / `contract` / `intern` |
| `position_code` | VARCHAR(50) | 職位代碼，對應 RBAC 角色 |
| `store_id` | BIGINT | 門市員工所屬門市 (stores.code) |

#### 前端檔案結構

```
src/pages/management/
├── ManagementCenter.jsx          # 主頁面（頁籤導航）
└── components/
    ├── OrganizationManagement.jsx  # 品牌/門市管理
    ├── SupervisorManagement.jsx    # 督導管理
    ├── ProfilesManagement.jsx      # 用戶帳號
    ├── EmployeesManagementV2.jsx   # 員工資料（新版）
    ├── DepartmentsManagement.jsx   # 部門管理
    ├── AccountantBrandsManagement.jsx
    └── PermissionManagement.jsx    # 權限管理

src/hooks/management/
├── useBrands.js        # 品牌 CRUD
├── useStores.js        # 門市 CRUD
├── useSupervisors.js   # 督導指派管理
├── useEmployees.js     # 員工 CRUD
├── useDepartments.js   # 部門 CRUD
└── useProfiles.js      # 用戶帳號管理（同步更新 profiles + employees + user_roles）

src/components/ui/
├── Modal.jsx           # 通用彈窗
├── DataTable.jsx       # 通用資料表格
└── Badge.jsx           # 通用標籤（狀態顯示）
```

#### 用戶角色更新流程

當在「用戶帳號」頁面變更角色時，會同步更新三個地方：

```javascript
// useProfiles.js - updateRoleMutation
const updateRoleMutation = useMutation({
  mutationFn: async ({ userId, newRole }) => {
    // 1. 更新 profiles.role
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);

    // 2. 更新 employees.role
    await supabase.from('employees').update({ role: newRole }).eq('user_id', userId);

    // 3. 取得 RBAC role_id
    const { data: roleData } = await supabase.schema('rbac')
      .from('roles').select('id').eq('code', newRole).single();

    // 4. 刪除舊 user_roles
    await supabase.schema('rbac').from('user_roles').delete().eq('user_id', userId);

    // 5. 新增新 user_roles
    await supabase.schema('rbac').from('user_roles').insert({
      user_id: userId,
      role_id: roleData.id
    });
  }
});
```

---

## Portal 主系統

**路徑**: `src/`
**功能**: 統一入口、認證、導航

### 核心組件

#### 1. App.jsx (主路由)
```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Portal from './Portal';
import PaymentSystem from './system/payment_system';
import ExpenseSystem from './system/expense_reimbursement_system';
import StoreSystem from './system/store_management_system';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Portal />} />
        <Route path="/systems/payment-approval/*" element={<PaymentSystem />} />
        <Route path="/systems/expense-reimbursement/*" element={<ExpenseSystem />} />
        <Route path="/systems/store-management/*" element={<StoreSystem />} />
      </Routes>
    </BrowserRouter>
  );
}
```

#### 2. Portal.jsx (系統入口)
```javascript
// 根據 RBAC 權限顯示系統卡片
const systems = [
  {
    id: 'payment-approval',
    name: '付款簽核系統',
    permissionCode: 'system.payment_approval',
    url: '/systems/payment-approval'
  },
  {
    id: 'expense-reimbursement',
    name: '員工代墊款系統',
    permissionCode: 'system.expense_reimbursement',
    url: '/systems/expense-reimbursement'
  },
  // ...
];

// 過濾用戶有權限的系統
const accessibleSystems = systems.filter(sys =>
  hasPermission(sys.permissionCode)
);
```

#### 3. 系統配置檔 (data/systems.js)
```javascript
export const systemsData = [
  {
    id: 'finance',
    name: '財務管理',
    systems: [
      {
        id: 'payment-approval',
        name: '付款簽核系統',
        description: '公司付款流程審核與管理',
        icon: '💰',
        url: '/systems/payment-approval',
        status: 'active',
        permissionCode: 'system.payment_approval'
      },
      {
        id: 'expense-reimbursement',
        name: '員工代墊款系統',
        description: '員工費用報銷申請與審核',
        icon: '💸',
        url: '/systems/expense-reimbursement',
        status: 'active',
        permissionCode: 'system.expense_reimbursement'
      }
    ]
  },
  {
    id: 'operations',
    name: '運營管理',
    systems: [
      {
        id: 'store-management',
        name: '店舖管理系統',
        description: '店舖資料與店長管理',
        icon: '🏪',
        url: '/systems/store-management',
        status: 'active',
        permissionCode: 'system.store_management'
      }
    ]
  }
];
```

---

## 跨系統共用資源

### 1. 共用組件

#### SearchableSelect (可搜尋下拉選單)
**路徑**: `src/system/*/src/components/SearchableSelect.jsx`

**功能**：
- 輸入搜尋過濾選項
- 鍵盤導航（上下鍵、Enter、Esc）
- 自訂樣式主題

**使用範例**：
```javascript
<SearchableSelect
  options={bankList.map(bank => ({
    value: bank.bank_code,
    label: bank.bank_name,
    subLabel: `(${bank.bank_code})`
  }))}
  value={selectedBank}
  onChange={handleBankChange}
  placeholder="請選擇銀行"
  loading={loading}
  loadingText="載入中..."
/>
```

### 2. 共用 Hooks

#### usePermission (權限檢查)
**路徑**: `src/hooks/usePermission.js`

```javascript
const { hasPermission, loading } = usePermission('payment.approve.boss');
```

#### useAuth (認證狀態)
**路徑**: 各系統的 `AuthContext.jsx`

```javascript
const { user, session, loading } = useAuth();
```

### 3. 共用資料

#### 銀行/分行資料
**Schema**: `payment_approval`
**表格**: `banks`, `branches`

**跨系統存取**：
```javascript
// 透過自訂 supabaseClient 路由
const PAYMENT_APPROVAL_TABLES = ['banks', 'branches'];

export const supabase = {
  from: (table) => {
    if (PAYMENT_APPROVAL_TABLES.includes(table)) {
      return mainClient.schema('payment_approval').from(table);
    }
    return mainClient.from(table);
  }
};
```

#### 員工/部門資料
**Schema**: `public`
**表格**: `employees`, `departments`

**所有系統共用**，無需特殊處理。

---

## 開發模式與最佳實踐

### 1. 新增子系統流程

#### Step 1: 建立目錄結構
```bash
src/system/new_system/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   └── Detail.jsx
│   ├── components/
│   ├── hooks/
│   ├── supabaseClient.js
│   ├── AuthContext.jsx
│   ├── AuthWrapper.jsx
│   ├── App.jsx
│   └── index.jsx
├── public/
└── package.json
```

#### Step 2: 註冊到 Portal
```javascript
// src/data/systems.js
{
  id: 'new-system',
  name: '新系統名稱',
  permissionCode: 'system.new_system',
  url: '/systems/new-system',
  status: 'active'
}
```

#### Step 3: 新增路由
```javascript
// src/App.jsx
<Route path="/systems/new-system/*" element={<NewSystem />} />
```

#### Step 4: 建立 RBAC 權限
```sql
-- 系統存取權限
INSERT INTO rbac.permissions (code, name, module, category) VALUES
  ('system.new_system', '訪問新系統', 'system_access', 'access');

-- 功能權限
INSERT INTO rbac.permissions (code, name, module, category) VALUES
  ('new_system.view', '查看資料', 'new_system', 'read'),
  ('new_system.create', '建立資料', 'new_system', 'write');

-- 分配給角色
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r, rbac.permissions p
WHERE r.code = 'admin' AND p.code IN ('system.new_system', 'new_system.view', 'new_system.create');
```

### 2. RLS 政策設計模式

#### 模式 1: 用戶只能看自己的資料
```sql
CREATE POLICY "Users can view their own records"
  ON public.table_name
  FOR SELECT
  USING (auth.uid() = user_id);
```

#### 模式 2: 多角色存取
```sql
-- 申請人可查看
CREATE POLICY "Applicants can view"
  ON public.table_name
  FOR SELECT
  USING (auth.uid() = applicant_id);

-- 簽核人可查看
CREATE POLICY "Approvers can view"
  ON public.table_name
  FOR SELECT
  USING (auth.uid() = approver_id);

-- 兩個政策是 OR 關係，滿足任一即可
```

#### 模式 3: 狀態驅動的權限
```sql
-- 申請人只能更新草稿
CREATE POLICY "Applicants update draft"
  ON public.table_name
  FOR UPDATE
  USING (auth.uid() = applicant_id AND status = 'draft')
  WITH CHECK (auth.uid() = applicant_id);

-- 簽核人可更新待簽核
CREATE POLICY "Approvers update pending"
  ON public.table_name
  FOR UPDATE
  USING (status IN ('pending_xxx', 'pending_yyy'))
  WITH CHECK (status IN ('approved', 'rejected'));
```

### 3. 跨 Schema 查詢模式

#### ❌ 錯誤：嵌套跨 schema 查詢
```javascript
// 這會失敗
const { data } = await supabase
  .from('table_in_schema_a')
  .select('*, related:table_in_schema_b(name)');
```

#### ✅ 正確：分別查詢 + 前端組合
```javascript
// 1. 查詢主表
const { data: records } = await supabase
  .from('table_in_schema_a')
  .select('*');

// 2. 查詢關聯表
const relatedIds = records.map(r => r.related_id);
const { data: related } = await supabase
  .from('table_in_schema_b')
  .select('*')
  .in('id', relatedIds);

// 3. 前端組合
const enriched = records.map(r => ({
  ...r,
  related_data: related.find(rel => rel.id === r.related_id)
}));
```

### 4. 防重複操作模式

```javascript
// 前端檢查
const hasProcessed = records.find(
  r => r.user_id === currentUser.id && r.status === 'completed'
);

if (hasProcessed) {
  alert('您已經處理過此項目');
  return;
}

// 執行操作...
```

### 5. 簽核流程通用模式

```javascript
// 1. 防重複檢查
const existingApproval = approvals.find(
  a => a.approver_id === user.id
);
if (existingApproval) return;

// 2. 取得配置
const config = WORKFLOW_CONFIG[currentStatus];

// 3. 先插入記錄
await supabase.from('approvals').insert({
  request_id: id,
  approver_id: user.id,
  status: 'approved'
});

// 4. 再更新狀態
await supabase.from('requests').update({
  status: config.nextStatus
}).eq('id', id);

// 5. 重新載入
await fetchData();
```

---

## 部署與維護

### 數據庫遷移管理

#### 命名規範
```
<操作>_<模組>_<描述>.sql

例如：
- create_expense_reimbursement_system.sql
- add_expense_reimbursement_permissions.sql
- fix_expense_approver_update_rls.sql
- alter_payment_requests_add_column.sql
```

#### 執行順序
```bash
# 1. 建立表格
supabase migration apply create_*.sql

# 2. 新增權限
supabase migration apply add_*_permissions.sql

# 3. 修正政策
supabase migration apply fix_*.sql

# 4. 調整結構
supabase migration apply alter_*.sql
```

### 環境配置

#### 開發環境 (.env.development)
```bash
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

#### 生產環境 (.env.production)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

### 部署檢查清單

- [ ] 所有 SQL migrations 已執行
- [ ] RBAC 權限已正確配置
- [ ] RLS 政策已啟用並測試
- [ ] 環境變數已設定
- [ ] 前端已建置（`npm run build`）
- [ ] 功能測試通過
- [ ] 權限測試通過
- [ ] 跨瀏覽器測試通過

---

## 故障排除指南

### 常見問題

#### 1. 權限錯誤："You do not have permission..."

**可能原因**：
- RBAC 權限未配置
- RLS 政策阻擋
- 用戶未分配角色

**排查步驟**：
```sql
-- 1. 檢查用戶角色
SELECT r.code, r.name
FROM rbac.user_roles ur
JOIN rbac.roles r ON ur.role_id = r.id
WHERE ur.user_id = 'user-uuid';

-- 2. 檢查角色權限
SELECT p.code, p.name
FROM rbac.role_permissions rp
JOIN rbac.permissions p ON rp.permission_id = p.id
WHERE rp.role_id = 'role-uuid';

-- 3. 測試 RLS 政策
SET ROLE authenticated;
SET request.jwt.claim.sub = 'user-uuid';
SELECT * FROM table_name;  -- 看能否查詢
```

#### 2. 跨 Schema 查詢失敗

**錯誤訊息**：`Could not find the table` 或 `Could not find a relationship`

**解決方案**：
- 使用自訂 supabaseClient 進行 schema 路由
- 避免嵌套跨 schema 查詢
- 改用分別查詢 + 前端組合

#### 3. 簽核流程卡住

**可能原因**：
- RLS 政策阻止簽核人更新狀態
- 防重複邏輯誤判
- 狀態轉換配置錯誤

**排查步驟**：
```javascript
// 1. 檢查當前狀態
console.log('Current status:', request.status);

// 2. 檢查配置
console.log('Config:', WORKFLOW_CONFIG[request.status]);

// 3. 檢查簽核記錄
console.log('Approvals:', approvals);

// 4. 檢查 RLS 政策
// 在資料庫中檢查相關 UPDATE 政策
```

#### 4. 資料不同步

**可能原因**：
- 未重新載入資料
- Realtime 訂閱失效
- 快取問題

**解決方案**：
```javascript
// 手動重新載入
await fetchData();

// 或使用 Realtime 訂閱
const subscription = supabase
  .channel('table-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'table_name'
  }, (payload) => {
    // 更新本地狀態
    setData(prev => /* ... */);
  })
  .subscribe();
```

#### 5. RBAC 權限新增失敗："null value in column 'module'"

**錯誤訊息**：
```
ERROR: 23502: null value in column "module" of relation "permissions" violates not-null constraint
```

**原因**：`rbac.permissions` 表的 `module` 欄位為 NOT NULL，新增權限時必須指定。

**錯誤範例**：
```sql
-- ❌ 缺少 module 欄位
INSERT INTO rbac.permissions (code, name, description, category) VALUES
  ('system.training', '存取教育訓練系統', '...', 'system');
```

**正確範例**：
```sql
-- ✅ 包含 module 欄位
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  ('system.training', '存取教育訓練系統', '...', 'training', 'system');
```

#### 6. 跨 Schema 視圖 JOIN 失敗

**問題**：從 `training` schema 的視圖 JOIN `public` schema 的表時出錯。

**解決方案**：使用完整的 schema.table 名稱：
```sql
-- ✅ 正確：明確指定 schema
CREATE VIEW training.course_stats AS
SELECT c.*, b.name AS brand_name
FROM training.courses c
LEFT JOIN public.brands b ON c.brand_id = b.code::BIGINT;

-- ❌ 錯誤：未指定 schema 可能找不到表
LEFT JOIN brands b ON ...
```

---

## 系統維護指南

### 日常維護任務

#### 每日
- [ ] 檢查系統錯誤日誌
- [ ] 監控 API 回應時間
- [ ] 檢查用戶回報問題

#### 每週
- [ ] 檢查數據庫效能
- [ ] 檢查 RLS 政策效能
- [ ] 備份數據庫

#### 每月
- [ ] 審查權限配置
- [ ] 清理過期資料
- [ ] 更新依賴套件
- [ ] 效能優化

### 數據庫維護

#### 索引優化
```sql
-- 檢查缺少索引的查詢
SELECT * FROM pg_stat_user_tables
WHERE idx_scan < seq_scan
  AND seq_scan > 10000;

-- 新增索引
CREATE INDEX idx_table_column ON table_name(column_name);
```

#### 清理過期資料
```sql
-- 軟刪除資料清理（超過1年）
DELETE FROM table_name
WHERE deleted_at < NOW() - INTERVAL '1 year';

-- 歸檔舊資料
INSERT INTO archive.table_name
SELECT * FROM public.table_name
WHERE created_at < NOW() - INTERVAL '2 years';

DELETE FROM public.table_name
WHERE created_at < NOW() - INTERVAL '2 years';
```

---

## 附錄

### A. 完整權限清單

#### 系統存取權限
```sql
system.payment_approval
system.expense_reimbursement
system.store_management
system.training
```

#### 付款簽核權限
```sql
payment.view.own
payment.view.all
payment.create
payment.edit.own
payment.delete.own
payment.approve.unit_manager
payment.approve.accountant
payment.approve.audit_manager
payment.approve.cashier
payment.approve.boss
payment.reject
payment.manage_fee
```

#### 代墊款權限
```sql
expense.view.own
expense.view.all
expense.create
expense.edit.own
expense.delete.own
expense.approve.ceo
expense.approve.boss
expense.approve.audit_manager
expense.cancel
```

#### 教育訓練權限
```sql
training.view                -- 查看訓練課程
training.enroll              -- 參加訓練
training.manage.courses      -- 管理課程（總部）
training.manage.content      -- 編輯內容（總部）
training.view.reports        -- 查看報表（總部）
training.manage.onboarding   -- 管理新人訓練
training.sign_off            -- 簽核訓練（門市主管）
```

### B. 常用 SQL 函數

#### 檢查用戶權限
```sql
CREATE OR REPLACE FUNCTION check_user_permission(
  p_user_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM rbac.user_roles ur
    JOIN rbac.role_permissions rp ON ur.role_id = rp.role_id
    JOIN rbac.permissions p ON rp.permission_id = p.id
    WHERE ur.user_id = p_user_id
      AND p.code = p_permission_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 取得用戶所有權限
```sql
CREATE OR REPLACE FUNCTION get_user_permissions(p_user_id UUID)
RETURNS TABLE (permission_code TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.code
  FROM rbac.user_roles ur
  JOIN rbac.role_permissions rp ON ur.role_id = rp.role_id
  JOIN rbac.permissions p ON rp.permission_id = p.id
  WHERE ur.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### C. 參考資源

- [Supabase 官方文檔](https://supabase.com/docs)
- [PostgreSQL RLS 文檔](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [React Router 文檔](https://reactrouter.com/)
- [Tailwind CSS 文檔](https://tailwindcss.com/docs)

---

## 版本歷史

| 版本 | 日期 | 變更內容 | 負責人 |
|------|------|----------|--------|
| 1.0 | 2026-01-22 | 初版完成，包含三大子系統文檔 | Claude AI |
| 1.1 | 2026-01-23 | 新增教育訓練系統、Code-Based 連結模式、RBAC module 必填說明 | Claude AI |
| 1.2 | 2026-01-23 | 新增管理中心文檔、RBAC 角色架構重整、督導管理、資料範圍控制 | Claude AI |

---

**最後更新**: 2026-01-23
**文檔維護**: Claude AI Assistant
**系統狀態**: 生產環境運行中

---

**注意事項**：
- 本文檔為技術文檔，包含敏感的系統架構資訊，請妥善保管
- 定期更新文檔以反映最新的系統變更
- 新功能開發前請先閱讀相關章節
- 遇到問題請先查閱故障排除指南
