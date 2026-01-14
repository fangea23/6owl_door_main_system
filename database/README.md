# 資料庫結構說明

## 統一員工管理系統

所有子系統（License System、Car Rental System、Payment System 等）現在都使用統一的員工和部門表，位於 `public` schema。

### 執行順序

1. **首先執行統一員工表** - 這是所有系統的基礎
2. 然後執行各子系統的資料庫腳本

```bash
# 1. 先執行統一員工表（必須）
database/unified_employees.sql

# 2. 再執行各子系統的資料庫腳本
src/system/car_rental_system/database_schema.sql
src/system/license_system/database_schema.sql  # 如果有
src/system/payment_system/database_schema.sql  # 如果有
```

## 統一員工表 (unified_employees.sql)

### 主要表格

#### 1. public.departments (部門表)
- 所有系統共用的部門資訊
- 支援階層式部門結構（parent_department_id）
- 包含部門主管資訊

**主要欄位：**
```sql
id                    UUID (主鍵)
name                  VARCHAR(100) 部門名稱（唯一）
code                  VARCHAR(20) 部門代碼
manager_id            UUID 部門主管（關聯 employees）
parent_department_id  UUID 上級部門
email                 VARCHAR(255) 部門信箱
phone                 VARCHAR(50) 部門電話
location              VARCHAR(200) 辦公地點
is_active             BOOLEAN 是否啟用
```

#### 2. public.employees (員工表)
- 所有系統共用的員工資訊
- 可選擇性關聯 auth.users（用於登入認證）
- 完整的員工資料管理

**主要欄位：**
```sql
id                UUID (主鍵)
user_id           UUID 關聯 auth.users（可選）
employee_id       VARCHAR(50) 員工編號（唯一，如 EMP001）
name              VARCHAR(100) 姓名
email             VARCHAR(255) 電子郵件（唯一）
phone             VARCHAR(50) 電話
department_id     UUID 部門（關聯 departments）
position          VARCHAR(100) 職位
job_title         VARCHAR(100) 職稱
supervisor_id     UUID 直屬主管（關聯 employees）
hire_date         DATE 到職日期
status            VARCHAR(50) 狀態（active, on_leave, resigned, terminated）
role              VARCHAR(50) 角色（user, admin, manager, hr）
```

### View

#### public.employees_with_details
完整的員工資訊視圖，包含部門名稱和主管資訊。

```sql
SELECT * FROM public.employees_with_details;
```

### 實用函數

#### 1. get_employee_by_email(email)
根據電子郵件獲取員工資訊

```sql
SELECT * FROM public.get_employee_by_email('user@company.com');
```

#### 2. get_employee_by_user_id(user_id)
根據 auth.users 的 user_id 獲取員工資訊

```sql
SELECT * FROM public.get_employee_by_user_id('uuid-here');
```

## 各系統如何使用統一員工表

### License System (軟體授權系統)

**配置：** `src/system/license_system/src/lib/supabase.js`

```javascript
// 自動路由：
// - employees, departments → public schema
// - 其他表格 → software_maintenance schema
from: (table) => {
  if (table === 'employees' || table === 'departments') {
    return mainClient.from(table); // public
  }
  return mainClient.schema('software_maintenance').from(table);
}
```

**使用方式：**
- 直接使用現有的 `useEmployees()` hook
- 無需修改現有代碼
- 自動查詢 public.employees 和 public.departments

### Car Rental System (公司車租借系統)

**資料庫結構：** `src/system/car_rental_system/database_schema.sql`

**關聯方式：**
```sql
-- rental_requests 表
requester_id UUID REFERENCES public.employees(id)  -- 申請人
reviewer_id UUID REFERENCES public.employees(id)   -- 審核者

-- rentals 表
renter_id UUID REFERENCES public.employees(id)     -- 租借人
```

**查詢示例：**
```javascript
// 獲取租借申請（含員工資訊）
const { data } = await supabase
  .from('rental_requests')
  .select(`
    *,
    requester:requester_id (
      id, employee_id, name, email,
      department:department_id (id, name),
      position
    )
  `);
```

### Payment System (付款簽核系統)

**配置：** 直接使用 public.employees

```javascript
// 查詢申請人資訊
const { data } = await supabase
  .from('payment_requests')
  .select(`
    *,
    requester:requester_id (
      id, employee_id, name,
      department:department_id (name)
    )
  `);
```

## Row Level Security (RLS) 政策

### 部門表政策

```sql
-- 所有已登入用戶可讀取啟用的部門
"Anyone can view active departments"

-- HR 和管理員可完全管理部門
"HR and admins can manage departments"
```

### 員工表政策

```sql
-- 所有已登入用戶可讀取在職員工基本資訊
"Anyone can view active employees basic info"

-- 用戶可查看和更新自己的資料
"Users can view and update own employee record"

-- HR 和管理員可完全管理員工
"HR and admins can manage employees"

-- 主管可查看其下屬的資料
"Supervisors can view their subordinates"
```

## 資料遷移注意事項

### 從各系統的員工表遷移到統一表

如果您的系統已經有員工資料（如 License System 的 software_maintenance.employees），需要遷移資料：

```sql
-- 1. 遷移部門資料
INSERT INTO public.departments (name, code, is_active)
SELECT name, code, is_active
FROM software_maintenance.departments
ON CONFLICT (name) DO NOTHING;

-- 2. 遷移員工資料
INSERT INTO public.employees (
  employee_id, name, email, phone,
  department_id, position, hire_date, status
)
SELECT
  e.employee_id,
  e.name,
  e.email,
  e.phone,
  pd.id as department_id,  -- 使用新的部門 ID
  e.position,
  e.hire_date,
  e.status
FROM software_maintenance.employees e
LEFT JOIN software_maintenance.departments od ON e.department_id = od.id
LEFT JOIN public.departments pd ON od.name = pd.name
ON CONFLICT (employee_id) DO NOTHING;

-- 3. 更新關聯表的外鍵（如果需要）
UPDATE car_rental.rental_requests
SET requester_id = (
  SELECT id FROM public.employees
  WHERE user_id = rental_requests.requester_id
);
```

## 開發指南

### 新增系統時如何使用員工表

1. **在資料庫 Schema 中引用員工表**

```sql
CREATE TABLE your_schema.your_table (
  id UUID PRIMARY KEY,
  employee_id UUID REFERENCES public.employees(id),
  -- 其他欄位...
);
```

2. **在查詢中關聯員工資訊**

```javascript
const { data } = await supabase
  .from('your_table')
  .select(`
    *,
    employee:employee_id (
      id,
      employee_id,
      name,
      email,
      department:department_id (
        id,
        name
      ),
      position
    )
  `);
```

3. **使用 Supabase 客戶端配置**

對於使用獨立 schema 的系統，請參考 License System 的配置方式：

```javascript
export const supabase = {
  auth: mainClient.auth,
  storage: mainClient.storage,
  from: (table) => {
    // employees 和 departments 使用 public schema
    if (table === 'employees' || table === 'departments') {
      return mainClient.from(table);
    }
    // 其他表格使用自己的 schema
    return mainClient.schema('your_schema').from(table);
  },
  rpc: (fn, args) => mainClient.rpc(fn, args),
};
```

## 常見問題

### Q: 為什麼要統一員工表？

A:
1. **避免資料重複**：不同系統不需要各自維護員工資料
2. **資料一致性**：員工資訊更新後，所有系統自動同步
3. **簡化管理**：集中管理員工和部門資訊
4. **跨系統查詢**：可以輕鬆查詢員工在不同系統的活動

### Q: 如何區分員工在不同系統的權限？

A: 使用 `public.employees.role` 欄位和 `permissions` JSONB 欄位：

```json
{
  "license_admin": true,
  "car_rental_approver": true,
  "payment_viewer": false
}
```

### Q: 如何處理離職員工？

A: 設置 `status = 'resigned'` 和 `resignation_date`，不要刪除記錄：

```sql
UPDATE public.employees
SET status = 'resigned',
    resignation_date = CURRENT_DATE,
    is_active = false
WHERE id = 'employee-id';
```

### Q: 如何關聯 auth.users？

A: 在 public.employees 表中設置 `user_id` 欄位：

```sql
UPDATE public.employees
SET user_id = 'auth-user-id'
WHERE employee_id = 'EMP001';
```

## 維護建議

1. **定期檢查資料完整性**
   ```sql
   -- 檢查沒有部門的員工
   SELECT * FROM public.employees WHERE department_id IS NULL AND status = 'active';

   -- 檢查沒有主管的部門
   SELECT * FROM public.departments WHERE manager_id IS NULL AND is_active = true;
   ```

2. **定期清理已刪除資料**
   ```sql
   -- 硬刪除已軟刪除超過一年的記錄
   DELETE FROM public.employees WHERE deleted_at < NOW() - INTERVAL '1 year';
   ```

3. **備份重要資料**
   定期備份 public.employees 和 public.departments 表

## 支援

如有問題，請聯繫系統管理員或參考：
- Supabase 文檔：https://supabase.com/docs
- 項目 README：/README.md
