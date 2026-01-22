# 員工代墊款系統 (Employee Reimbursement System) 技術文檔

**最後更新**: 2026-01-22
**系統版本**: 1.0
**開發狀態**: 已完成核心功能，待部署測試

---

## 目錄

1. [系統概述](#系統概述)
2. [資料庫架構](#資料庫架構)
3. [簽核流程邏輯](#簽核流程邏輯)
4. [RLS 權限政策](#rls-權限政策)
5. [RBAC 權限設計](#rbac-權限設計)
6. [前端架構](#前端架構)
7. [已解決的關鍵問題](#已解決的關鍵問題)
8. [待執行的 SQL Migrations](#待執行的-sql-migrations)
9. [重要技術決策](#重要技術決策)
10. [開發注意事項](#開發注意事項)

---

## 系統概述

### 業務需求
取代傳統紙本代墊款申請流程，實現線上申請、簽核、審核的完整數位化流程。

### 核心功能
- ✅ 員工線上填寫代墊款申請（最多 15 行明細）
- ✅ 根據金額自動路由簽核流程
  - **金額 ≥ NT$30,000**: 總經理 → 審核主管
  - **金額 < NT$30,000**: 放行主管 → 審核主管
- ✅ 多品牌分帳（六扇門、粥大福）
- ✅ 兩種撥款方式：領現、匯款（次月12日）
- ✅ 完整簽核記錄與追蹤
- ✅ 列印/PDF 功能

### 關鍵設計特點
- **無草稿功能**：與付款簽核系統保持一致，直接送出進入簽核流程
- **品項必填**：有金額的項目必須填寫品項（防止空排）
- **防重複簽核**：同一用戶不能對同一申請重複簽核
- **自動單號生成**：格式 `ER-YYYYMMDD-XXXX`

---

## 資料庫架構

### 核心資料表

#### 1. `expense_reimbursement_requests` (申請主表)

```sql
CREATE TABLE public.expense_reimbursement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT UNIQUE NOT NULL,           -- ER-YYYYMMDD-XXXX

  -- 申請人資訊
  applicant_id UUID NOT NULL REFERENCES auth.users(id),
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  department_id UUID REFERENCES public.departments(id),

  -- 金額統計
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_receipt_count INTEGER NOT NULL DEFAULT 0,
  brand_totals JSONB,                            -- {"六扇門": 10000, "粥大福": 5000}

  -- 撥款資訊
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer')),
  bank_name TEXT,
  bank_code TEXT,
  branch_name TEXT,
  branch_code TEXT,
  account_number TEXT,

  -- 狀態管理
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_ceo', 'pending_boss', 'pending_audit_manager',
               'approved', 'rejected', 'cancelled')
  ),
  current_approver_id UUID REFERENCES auth.users(id),

  -- 時間戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);
```

**重要欄位說明**:
- `status`: 申請狀態，決定簽核流程位置
- `current_approver_id`: 當前待簽核人（實務上設為 NULL，依賴前端 RBAC 控制）
- `brand_totals`: JSONB 格式儲存各品牌分帳總計

#### 2. `expense_reimbursement_items` (明細表)

```sql
CREATE TABLE public.expense_reimbursement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.expense_reimbursement_requests(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number >= 1 AND line_number <= 15),

  category TEXT,                                 -- 品項 (有金額時必填)
  description TEXT,                              -- 內容
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,       -- 金額 (整數)
  receipt_count INTEGER NOT NULL DEFAULT 0,      -- 收據張數
  usage_note TEXT,                               -- 用途說明
  cost_allocation TEXT NOT NULL CHECK (cost_allocation IN ('六扇門', '粥大福')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(request_id, line_number)
);
```

**設計重點**:
- 最多 15 行（業務規則）
- `amount > 0` 時，`category` 必填（前端驗證）
- 只儲存有金額的項目（空行自動過濾）

#### 3. `expense_approvals` (簽核記錄表)

```sql
CREATE TABLE public.expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.expense_reimbursement_requests(id) ON DELETE CASCADE,

  approver_id UUID NOT NULL REFERENCES auth.users(id),
  approval_type TEXT NOT NULL CHECK (approval_type IN ('ceo', 'boss', 'audit_manager')),
  approval_order INTEGER NOT NULL,               -- 簽核順序

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  comment TEXT,                                  -- 簽核意見

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,

  UNIQUE(request_id, approval_order)
);
```

**設計重點**:
- 每次簽核都會插入一筆記錄
- `approval_order` 確保簽核順序
- 防重複簽核：前端檢查同一 `approver_id` 不能重複簽核同一申請

---

## 簽核流程邏輯

### 狀態流轉圖

```
                    送出申請
                       │
                       ▼
              ┌────────────────┐
              │  檢查金額大小    │
              └────────┬───────┘
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
  ≥ NT$30,000              < NT$30,000
  pending_ceo              pending_boss
     (總經理)                 (放行主管)
          │                         │
          └────────────┬────────────┘
                       ▼
              pending_audit_manager
                  (審核主管)
                       │
                       ▼
                   approved
                  (已核准)
```

### 簽核流程配置 (RequestDetail.jsx)

```javascript
const WORKFLOW_CONFIG = {
  'pending_ceo': {
    label: '總經理',
    nextStatus: 'pending_audit_manager',
    permission: 'expense.approve.ceo'
  },
  'pending_boss': {
    label: '放行主管',
    nextStatus: 'pending_audit_manager',
    permission: 'expense.approve.boss'
  },
  'pending_audit_manager': {
    label: '審核主管',
    nextStatus: 'approved',
    permission: 'expense.approve.audit_manager'
  }
};
```

### 簽核執行步驟 (handleApprove)

```javascript
1. 檢查是否已簽核（防重複）
   ↓
2. 詢問簽核意見（可選）
   ↓
3. 插入 expense_approvals 記錄
   ↓
4. 更新 expense_reimbursement_requests 狀態
   ↓
5. 重新載入資料顯示
```

**關鍵**：先插入簽核記錄，再更新申請狀態（確保有完整記錄）

---

## RLS 權限政策

### 核心挑戰
Supabase RLS 需要平衡安全性與功能性。員工代墊款系統的 RLS 經過多次修正才達到正確狀態。

### 申請表 (expense_reimbursement_requests) 的 RLS 政策

#### 1. SELECT 政策
```sql
-- 申請人可查看自己的申請
CREATE POLICY "Users can view their own expense requests"
  ON public.expense_reimbursement_requests
  FOR SELECT
  USING (auth.uid() = applicant_id);

-- 簽核人可查看待簽核的申請
CREATE POLICY "Approvers can view pending requests"
  ON public.expense_reimbursement_requests
  FOR SELECT
  USING (auth.uid() = current_approver_id);
```

#### 2. INSERT 政策
```sql
-- 申請人可建立申請
CREATE POLICY "Users can create expense requests"
  ON public.expense_reimbursement_requests
  FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);
```

#### 3. UPDATE 政策（關鍵！）

**政策 1: 申請人更新草稿**
```sql
CREATE POLICY "Users can update their own requests"
  ON public.expense_reimbursement_requests
  FOR UPDATE
  USING (
    auth.uid() = applicant_id AND
    status = 'draft'  -- 更新前必須是草稿
  )
  WITH CHECK (
    auth.uid() = applicant_id
    -- 更新後可以是任何狀態（包含 pending_xxx）
  );
```

**政策 2: 簽核人更新待簽核申請** ⭐ 重要！
```sql
CREATE POLICY "Approvers can update pending requests"
  ON public.expense_reimbursement_requests
  FOR UPDATE
  USING (
    status IN ('pending_ceo', 'pending_boss', 'pending_audit_manager')
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    status IN ('pending_ceo', 'pending_boss', 'pending_audit_manager', 'approved', 'rejected')
  );
```

**為什麼需要第二個政策？**
- 簽核人不是申請人（`applicant_id`）
- 簽核人需要更新狀態（`pending_boss` → `pending_audit_manager`）
- 如果只有第一個政策，簽核人會被 RLS 阻擋

### 簽核記錄表 (expense_approvals) 的 RLS 政策

#### INSERT 政策
```sql
CREATE POLICY "Approvers can insert their own approvals"
  ON public.expense_approvals
  FOR INSERT
  WITH CHECK (
    auth.uid() = approver_id
    AND EXISTS (
      SELECT 1 FROM public.expense_reimbursement_requests
      WHERE id = expense_approvals.request_id
    )
  );
```

**設計重點**：
- 不依賴 `current_approver_id`（因為簽核時已設為 NULL）
- 只檢查 `approver_id` 是自己且申請存在
- 配合前端 RBAC 權限檢查

---

## RBAC 權限設計

### 權限清單 (rbac.permissions)

```sql
INSERT INTO rbac.permissions (code, name, description, module, category) VALUES
  ('expense.view.all', '查看所有代墊款申請', '可以查看所有員工的代墊款申請', 'expense_reimbursement', 'read'),
  ('expense.view.own', '查看自己的代墊款申請', '可以查看自己的代墊款申請', 'expense_reimbursement', 'read'),
  ('expense.create', '建立代墊款申請', '可以建立新的代墊款申請', 'expense_reimbursement', 'write'),
  ('expense.approve.ceo', '總經理簽核', '可以審核高金額申請（≥30,000）', 'expense_reimbursement', 'approve'),
  ('expense.approve.boss', '放行主管簽核', '可以審核低金額申請（<30,000）', 'expense_reimbursement', 'approve'),
  ('expense.approve.audit_manager', '審核主管簽核', '可以進行最終審核', 'expense_reimbursement', 'approve'),
  ('system.expense_reimbursement', '訪問員工代墊款系統', '可以在Portal中看到並訪問員工代墊款系統', 'system_access', 'access');
```

### 角色配置

#### 新增角色
```sql
-- CEO 角色（專為高金額簽核）
INSERT INTO rbac.roles (code, name, description) VALUES
  ('ceo', '總經理', '負責高金額簽核（≥30,000）')
ON CONFLICT (code) DO NOTHING;
```

#### 重用現有角色
- `boss`: 放行主管（已存在於付款簽核系統）
- `audit_manager`: 審核主管（已存在於付款簽核系統）

**設計原則**：避免角色名稱衝突，重用現有角色以保持一致性

---

## 前端架構

### 檔案結構

```
src/system/expense_reimbursement_system/
├── src/
│   ├── pages/
│   │   ├── ApplyForm.jsx          # 申請表單（新增）
│   │   ├── Dashboard.jsx          # 列表頁面
│   │   └── RequestDetail.jsx      # 詳情/簽核頁面
│   ├── components/
│   │   └── SearchableSelect.jsx   # 可搜尋下拉選單（銀行/分行）
│   ├── hooks/
│   │   └── useExpenseRequests.js  # 申請資料管理 Hook
│   ├── supabaseClient.js          # 跨 schema 路由客戶端
│   ├── AuthContext.jsx            # 認證上下文
│   ├── AuthWrapper.jsx            # 認證包裝器
│   ├── App.jsx                    # 路由配置
│   └── index.jsx                  # 入口文件
└── SYSTEM_DOCUMENTATION.md        # 本文檔
```

### 關鍵組件

#### ApplyForm.jsx (申請表單)

**核心功能**：
1. **自動填充用戶資訊**
   ```javascript
   useEffect(() => {
     const fetchUserInfo = async () => {
       const { data } = await supabase
         .from('employees')
         .select('name, department_id, departments!employees_department_id_fkey(id, name)')
         .eq('user_id', user.id)
         .single();
       // 自動填充申請人、部門
     };
   }, [user]);
   ```

2. **品項必填驗證**
   ```javascript
   // 有金額但沒品項 → 紅色邊框提示
   const hasAmountNoCategory = (parseInt(item.amount) || 0) > 0 && !(item.category || '').trim();

   // 送出前檢查
   const invalidItems = items.filter(item => {
     const amount = parseInt(item.amount) || 0;
     const category = (item.category || '').trim();
     return amount > 0 && !category;
   });
   ```

3. **自動計算與品牌分帳**
   ```javascript
   const calculateTotals = () => {
     const totals = { total: 0, totalReceipts: 0, 六扇門: 0, 粥大福: 0 };
     items.forEach(item => {
       const amount = parseInt(item.amount) || 0;
       if (amount > 0) {
         totals.total += amount;
         totals[item.cost_allocation] += amount;
       }
     });
     return totals;
   };
   ```

4. **送出流程**
   ```javascript
   // 1. 建立申請
   const requestData = {
     status: totals.total >= 30000 ? 'pending_ceo' : 'pending_boss',
     total_amount: totals.total,
     brand_totals: JSON.stringify({ 六扇門: totals.六扇門, 粥大福: totals.粥大福 }),
     // ...
   };

   // 2. 插入明細（只插入有金額的項目）
   const itemsToInsert = items
     .filter(item => parseInt(item.amount) > 0)
     .map(item => ({ ... }));
   ```

#### RequestDetail.jsx (詳情/簽核)

**核心功能**：

1. **防重複簽核**
   ```javascript
   const existingApproval = approvals.find(
     approval => approval.approver_id === user.id && approval.status === 'approved'
   );
   if (existingApproval) {
     alert('⚠️ 您已經簽核過此申請，不能重複簽核。');
     return;
   }
   ```

2. **簽核執行**
   ```javascript
   // 先插入簽核記錄
   await supabase.from('expense_approvals').insert({
     request_id: id,
     approver_id: user.id,
     approval_type: request.status.replace('pending_', ''),
     approval_order: approvals.length + 1,
     status: 'approved',
   });

   // 再更新申請狀態
   await supabase.from('expense_reimbursement_requests').update({
     status: config.nextStatus,
     current_approver_id: null
   }).eq('id', id);
   ```

3. **批次查詢優化**（避免跨 schema 嵌套查詢）
   ```javascript
   // 分別查詢，前端組合
   const { data: requestData } = await supabase
     .from('expense_reimbursement_requests')
     .select('*')
     .eq('id', id)
     .single();

   const { data: applicantData } = await supabase
     .from('employees')
     .select('user_id, name, employee_id')
     .eq('user_id', requestData.applicant_id)
     .single();

   // 組合資料
   setRequest({ ...requestData, applicant: applicantData });
   ```

#### supabaseClient.js (跨 schema 路由)

**問題**：銀行/分行資料在 `payment_approval` schema，其他資料在 `public` schema

**解決**：自訂 Supabase 客戶端
```javascript
const PAYMENT_APPROVAL_TABLES = ['banks', 'branches'];

export const supabase = {
  from: (table) => {
    if (PAYMENT_APPROVAL_TABLES.includes(table)) {
      return mainClient.schema('payment_approval').from(table);
    } else {
      return mainClient.from(table);
    }
  },
  // ... 其他方法直接透傳
};
```

**使用方式**：
```javascript
// 自動路由到正確的 schema
await supabase.from('banks').select('*');        // → payment_approval.banks
await supabase.from('employees').select('*');    // → public.employees
```

---

## 已解決的關鍵問題

### 問題 1: 簽核人無法更新申請狀態

**現象**：放行主管簽核後，狀態沒有變化，可以無限重複簽核

**原因**：
- RLS 政策只允許申請人（`applicant_id`）更新申請
- 簽核人不是申請人，更新被 RLS 阻擋
- 簽核記錄成功插入，但狀態更新失敗

**解決**：新增 RLS 政策
```sql
-- fix_expense_approver_update_rls.sql
CREATE POLICY "Approvers can update pending requests"
  ON public.expense_reimbursement_requests
  FOR UPDATE
  USING (
    status IN ('pending_ceo', 'pending_boss', 'pending_audit_manager')
    AND auth.uid() IS NOT NULL
  )
  WITH CHECK (
    status IN ('pending_ceo', 'pending_boss', 'pending_audit_manager', 'approved', 'rejected')
  );
```

**文件位置**：`supabase/migrations/fix_expense_approver_update_rls.sql`

### 問題 2: 簽核記錄插入失敗

**現象**：`new row violates row-level security policy for table "expense_approvals"`

**原因**：
- 簽核流程先更新申請狀態（將 `current_approver_id` 設為 NULL）
- 再插入簽核記錄
- 原本的 INSERT 政策檢查 `current_approver_id = auth.uid()`，此時已是 NULL

**解決**：簡化 INSERT 政策
```sql
-- fix_expense_approvals_rls.sql
CREATE POLICY "Approvers can insert their own approvals"
  ON public.expense_approvals
  FOR INSERT
  WITH CHECK (
    auth.uid() = approver_id
    AND EXISTS (
      SELECT 1 FROM public.expense_reimbursement_requests
      WHERE id = expense_approvals.request_id
    )
  );
```

**文件位置**：`supabase/migrations/fix_expense_approvals_rls.sql`

### 問題 3: 品項未正確顯示

**現象**：費用明細表格中品項欄位顯示 `--`

**原因**：用戶填寫時沒有填品項，導致空值

**解決**：新增品項必填驗證
1. **即時視覺提示**：金額 > 0 但品項為空時，顯示紅色邊框
2. **送出前驗證**：阻止送出並顯示錯誤行號
3. **送出按鈕防呆**：有無效項目時自動禁用

**文件位置**：`src/system/expense_reimbursement_system/src/pages/ApplyForm.jsx`

### 問題 4: 跨 schema 查詢錯誤

**現象**：`PGRST205: Could not find the table 'public.banks'`

**原因**：銀行/分行資料在 `payment_approval` schema，不在 `public`

**解決**：自訂 supabaseClient 進行 schema 路由
```javascript
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

**文件位置**：`src/system/expense_reimbursement_system/src/supabaseClient.js`

### 問題 5: 嵌套查詢跨 schema 失敗

**現象**：`PGRST200: Could not find a relationship`（嵌套 select 跨 schema）

**原因**：Supabase 不支援跨 schema 的嵌套 select

**解決**：改用批次查詢 + 前端組合
```javascript
// ❌ 錯誤：跨 schema 嵌套查詢
const { data } = await supabase
  .from('expense_reimbursement_requests')
  .select('*, applicant:employees(name)');  // employees 在不同 schema

// ✅ 正確：分別查詢後組合
const { data: requests } = await supabase
  .from('expense_reimbursement_requests')
  .select('*');

const userIds = requests.map(r => r.applicant_id);
const { data: employees } = await supabase
  .from('employees')
  .select('user_id, name')
  .in('user_id', userIds);

// 前端組合
const enriched = requests.map(r => ({
  ...r,
  applicant: employees.find(e => e.user_id === r.applicant_id)
}));
```

---

## 待執行的 SQL Migrations

### 執行順序（重要！）

```bash
# 1. 建立資料表與基本功能
supabase migration apply create_expense_reimbursement_system.sql

# 2. 建立 RBAC 權限
supabase migration apply add_expense_reimbursement_permissions.sql

# 3. 新增 Portal 系統存取權限
supabase migration apply add_expense_system_access_permission.sql

# 4. 修正申請表 UPDATE RLS（允許申請人送出）
supabase migration apply fix_expense_rls_policies.sql

# 5. 修正明細表 INSERT RLS（允許送出時插入明細）
supabase migration apply fix_expense_items_rls.sql

# 6. 修正簽核記錄表 RLS（允許簽核人插入記錄）
supabase migration apply fix_expense_approvals_rls.sql

# 7. 修正申請表 UPDATE RLS（允許簽核人更新狀態）⭐ 關鍵！
supabase migration apply fix_expense_approver_update_rls.sql
```

### Migration 檔案清單

| 檔案名稱 | 功能 | 狀態 |
|---------|------|------|
| `create_expense_reimbursement_system.sql` | 建立資料表、觸發器、基本 RLS | ✅ 必須 |
| `add_expense_reimbursement_permissions.sql` | 建立 RBAC 權限、角色 | ✅ 必須 |
| `add_expense_system_access_permission.sql` | Portal 系統存取權限 | ✅ 必須 |
| `fix_expense_rls_policies.sql` | 修正申請表 UPDATE RLS | ✅ 必須 |
| `fix_expense_items_rls.sql` | 修正明細表 INSERT RLS | ✅ 必須 |
| `fix_expense_approvals_rls.sql` | 修正簽核記錄表 RLS | ✅ 必須 |
| `fix_expense_approver_update_rls.sql` | **修正簽核人更新權限** | ⭐ 關鍵 |

---

## 重要技術決策

### 決策 1: 無草稿功能

**原因**：與付款簽核系統保持一致

**實現**：
- 移除 `handleSaveDraft` 函數
- 移除編輯模式（`id` 參數、`loadExistingRequest`）
- `ApplyForm` 只用於新增，不用於編輯
- 送出即進入簽核流程

### 決策 2: 品項必填（有金額時）

**原因**：避免空排、確保資料品質

**實現**：
- 前端即時驗證與視覺提示
- 送出前檢查並顯示錯誤行號
- 送出按鈕防呆

### 決策 3: 防重複簽核

**原因**：確保簽核流程正確性

**實現**：
- 前端檢查 `approvals` 表中是否已有該用戶的記錄
- 不依賴資料庫約束（因為同一用戶可能在不同申請中簽核）

### 決策 4: 先插入簽核記錄，再更新狀態

**原因**：確保有完整簽核記錄，即使更新狀態失敗也有記錄可查

**實現**：
```javascript
// 1. 先插入簽核記錄
await supabase.from('expense_approvals').insert(...);

// 2. 再更新申請狀態
await supabase.from('expense_reimbursement_requests').update(...);
```

### 決策 5: 整數金額（無小數）

**原因**：業務需求為整數金額

**實現**：
- 輸入欄位 `step="1"`
- 儲存時 `parseInt(item.amount)`
- 資料庫仍用 `DECIMAL(15,2)` 保留彈性

### 決策 6: 跨 schema 資料存取

**原因**：
- 銀行/分行資料在 `payment_approval` schema（共用）
- 員工/部門資料在 `public` schema

**實現**：
- 自訂 `supabaseClient.js` 進行 schema 路由
- 避免跨 schema 嵌套查詢，改用批次查詢 + 前端組合

### 決策 7: RLS 政策分離（申請人 vs 簽核人）

**原因**：申請人和簽核人的權限需求不同

**實現**：
- 申請人：可更新草稿狀態的申請
- 簽核人：可更新待簽核狀態的申請
- 兩個獨立的 UPDATE 政策

---

## 開發注意事項

### 1. RLS 政策優先級

Supabase RLS 政策是 **OR** 關係（任一政策通過即可）：
```sql
-- 政策 1: 申請人可更新草稿
USING (auth.uid() = applicant_id AND status = 'draft')

-- 政策 2: 簽核人可更新待簽核
USING (status IN ('pending_ceo', 'pending_boss', 'pending_audit_manager'))

-- 結果：滿足任一條件即可 UPDATE
```

### 2. 跨 schema 查詢限制

❌ **不支援**：跨 schema 嵌套 select
```javascript
// 這樣會失敗
await supabase
  .from('expense_reimbursement_requests')  // public schema
  .select('*, applicant:employees!employees_department_id_fkey(name)');
```

✅ **支援**：分別查詢 + 前端組合
```javascript
const { data: requests } = await supabase.from('expense_reimbursement_requests').select('*');
const { data: employees } = await supabase.from('employees').select('*').in('user_id', userIds);
const enriched = requests.map(r => ({ ...r, applicant: employees.find(...) }));
```

### 3. 外鍵命名衝突

問題：`employees` 表有多個外鍵指向 `departments`

解決：使用明確的外鍵名稱
```javascript
// ❌ 錯誤：模糊不清
.select('departments(name)')

// ✅ 正確：指定外鍵名稱
.select('departments!employees_department_id_fkey(name)')
```

### 4. 防重複簽核邏輯

**前端防呆**：
```javascript
const existingApproval = approvals.find(
  approval => approval.approver_id === user.id && approval.status === 'approved'
);
```

**為什麼不用資料庫約束？**
- 同一用戶可能在不同申請中簽核
- `UNIQUE(request_id, approver_id)` 會阻止正常情況
- 前端檢查更靈活

### 5. RBAC 與 RLS 的配合

- **RBAC**（前端）：控制功能可見性（誰能看到簽核按鈕）
- **RLS**（資料庫）：控制資料存取（誰能更新資料）

兩者必須**同時滿足**才能執行操作：
```javascript
// RBAC 檢查
const canApprove = request.status === 'pending_boss' && canApproveBoss;

// RLS 檢查
USING (status IN ('pending_boss', ...))
```

### 6. 狀態轉換圖

送出申請時的狀態選擇：
```javascript
status: totals.total >= 30000 ? 'pending_ceo' : 'pending_boss'
```

簽核時的狀態轉換：
```javascript
const WORKFLOW_CONFIG = {
  'pending_ceo': { nextStatus: 'pending_audit_manager' },
  'pending_boss': { nextStatus: 'pending_audit_manager' },
  'pending_audit_manager': { nextStatus: 'approved' }
};
```

### 7. 金額計算精度

雖然資料庫用 `DECIMAL(15,2)`，但業務要求整數：
```javascript
// 前端儲存時
amount: parseInt(item.amount)

// 前端顯示時
${parseFloat(item.amount).toLocaleString()}
```

### 8. 品牌分帳計算

```javascript
const calculateTotals = () => {
  const totals = { total: 0, 六扇門: 0, 粥大福: 0 };
  items.forEach(item => {
    if (parseInt(item.amount) > 0) {
      totals.total += parseInt(item.amount);
      totals[item.cost_allocation] += parseInt(item.amount);
    }
  });
  return totals;
};

// 儲存時
brand_totals: JSON.stringify({ 六扇門: totals.六扇門, 粥大福: totals.粥大福 })

// 讀取時
const brandTotals = JSON.parse(request.brand_totals);
```

---

## 測試檢查清單

### 申請流程測試
- [ ] 填寫申請表單（自動填充申請人、部門）
- [ ] 品項必填驗證（有金額時必須填品項）
- [ ] 金額 < 30,000 送出 → 狀態變為 `pending_boss`
- [ ] 金額 ≥ 30,000 送出 → 狀態變為 `pending_ceo`
- [ ] 只儲存有金額的項目（空行自動過濾）
- [ ] 品牌分帳計算正確
- [ ] 銀行/分行選擇（可搜尋）

### 簽核流程測試
- [ ] 放行主管簽核 → 進入 `pending_audit_manager`
- [ ] 總經理簽核 → 進入 `pending_audit_manager`
- [ ] 審核主管簽核 → 進入 `approved`
- [ ] 防重複簽核（同一用戶不能簽核兩次）
- [ ] 駁回功能正常
- [ ] 簽核記錄正確顯示

### 權限測試
- [ ] 無權限用戶看不到系統入口
- [ ] 無簽核權限用戶看不到簽核按鈕
- [ ] RLS 正確阻擋非法存取

### UI/UX 測試
- [ ] 送出按鈕在表單底部
- [ ] 無草稿功能（直接送出）
- [ ] 列印/PDF 功能正常
- [ ] 即時計算總金額
- [ ] 紅色提示（金額有但品項無）

---

## 常見問題 (FAQ)

### Q1: 為什麼沒有草稿功能？
**A**: 為了與付款簽核系統保持一致。業務流程要求填寫完整後直接送出，不需要草稿。

### Q2: 簽核後狀態沒變化怎麼辦？
**A**: 確保執行了 `fix_expense_approver_update_rls.sql`，這個 migration 允許簽核人更新申請狀態。

### Q3: 為什麼銀行資料在不同 schema？
**A**: 銀行/分行資料由付款簽核系統管理，在 `payment_approval` schema，多個系統共用。使用自訂 `supabaseClient.js` 進行路由。

### Q4: 如何防止空排提交？
**A**: 前端過濾 `amount > 0` 的項目才插入資料庫。另外有品項必填驗證防止只填金額不填品項。

### Q5: 簽核順序如何確保？
**A**: 使用 `approval_order` 欄位記錄順序，前端計算為 `approvals.length + 1`。

### Q6: current_approver_id 的作用是什麼？
**A**: 設計上用於指示當前待簽核人，但實務上設為 NULL，依賴前端 RBAC 權限控制誰能簽核。

### Q7: 如何新增簽核關卡？
**A**:
1. 修改 `WORKFLOW_CONFIG` 新增狀態
2. 新增對應的 RBAC 權限
3. 修改 RLS 政策的狀態清單
4. 更新送出邏輯的狀態選擇

---

## 後續優化建議

### 功能增強
1. **通知功能**：簽核時發送 email/即時通知
2. **附件上傳**：允許上傳收據圖片
3. **歷史記錄**：查看申請的完整歷史
4. **批次匯出**：匯出 Excel 報表
5. **統計儀表板**：顯示代墊款統計數據

### 效能優化
1. **快取機制**：快取常用的銀行/分行資料
2. **分頁載入**：Dashboard 分頁顯示申請列表
3. **索引優化**：針對常用查詢條件建立複合索引

### 安全增強
1. **簽核日誌**：記錄所有簽核操作的 IP、時間
2. **異常偵測**：偵測異常的簽核模式
3. **權限稽核**：定期檢查權限配置

---

## 版本歷史

| 版本 | 日期 | 變更內容 |
|------|------|----------|
| 1.0 | 2026-01-22 | 初版完成，包含核心功能與 RLS 修正 |

---

## 聯絡資訊

**系統負責人**: [待填寫]
**技術支援**: [待填寫]
**文檔維護**: Claude AI Assistant

---

**最後更新**: 2026-01-22
**文檔版本**: 1.0
