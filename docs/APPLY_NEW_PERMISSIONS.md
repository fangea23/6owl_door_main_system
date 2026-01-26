# 如何應用新的細粒度權限

## 📋 概述

為了更精確地控制付款系統的特定操作，我們新增了以下細粒度權限：

| 權限代碼 | 功能 | 建議角色 |
|---------|------|---------|
| `payment.paper.manage` | 紙本入庫管理 | 會計 |
| `payment.fee.manage` | 手續費管理 | 出納 |
| `payment.invoice.manage` | 發票資訊管理 | 會計 |
| `payment.invoice.view` | 發票資訊查看 | 主管、會計、出納 |

---

## 🚀 部署步驟

### 步驟 1: 執行資料庫遷移

在 Supabase SQL Editor 中執行以下遷移檔案：

```bash
supabase/migrations/add_payment_operation_permissions.sql
```

或者使用 Supabase CLI：

```bash
supabase db push
```

### 步驟 2: 驗證權限已創建

在 Supabase SQL Editor 中執行查詢：

```sql
SELECT code, name, description, module
FROM rbac.permissions
WHERE code IN (
  'payment.paper.manage',
  'payment.fee.manage',
  'payment.invoice.manage',
  'payment.invoice.view'
);
```

應該看到 4 筆記錄。

### 步驟 3: 驗證角色權限分配

檢查會計角色是否有紙本和發票權限：

```sql
SELECT
  r.code as role_code,
  r.name as role_name,
  p.code as permission_code,
  p.name as permission_name
FROM rbac.v_role_permissions
WHERE r.code IN ('accountant', 'cashier', 'admin')
  AND p.code IN (
    'payment.paper.manage',
    'payment.fee.manage',
    'payment.invoice.manage',
    'payment.invoice.view'
  )
ORDER BY r.code, p.code;
```

預期結果：
- **accountant**: paper.manage, invoice.manage, invoice.view
- **cashier**: fee.manage, invoice.view
- **admin**: 所有 4 個權限

### 步驟 4: 重新部署前端

前端程式碼已更新為使用新權限，需要重新部署：

```bash
# 如果使用 npm
npm run build

# 如果使用其他構建工具
yarn build
# 或
pnpm build
```

### 步驟 5: 測試權限功能

#### 測試紙本入庫（會計專用）
1. 以會計身份登入
2. 進入付款申請總覽頁面
3. 應該看到「紙本已收/未收紙本」按鈕可以點擊
4. 以一般員工登入，按鈕應該是灰色且不可點擊

#### 測試手續費管理（出納專用）
1. 以出納身份登入
2. 進入待撥款的付款申請詳情頁
3. 點擊審核按鈕
4. 應該看到「實際手續費」輸入框
5. 以其他角色登入，應該看不到此輸入框

#### 測試發票補登（會計專用）
1. 以會計身份登入
2. 進入任何付款申請詳情頁
3. 在發票資訊區應該看到編輯按鈕（滑鼠懸停時顯示）
4. 點擊後可以補登發票狀態、日期、號碼
5. 審核區也應該有發票補登區塊
6. 以其他角色登入，應該看不到編輯按鈕

---

## 🔧 故障排除

### 問題 1: 遷移執行失敗

**錯誤訊息**: `permission already exists`

**解決方法**:
權限可能已經存在，這是正常的。SQL 中有 `ON CONFLICT (code) DO NOTHING` 防止重複。

### 問題 2: 用戶看不到新功能

**檢查清單**:
1. ✅ 確認資料庫遷移已執行
2. ✅ 確認用戶角色有對應權限（查詢 rbac.v_user_permissions）
3. ✅ 確認前端已重新部署
4. ✅ 清除瀏覽器快取並重新登入

**檢查用戶權限**:
```sql
SELECT *
FROM rbac.v_user_permissions
WHERE user_id = '<USER_ID>'
  AND permission_code LIKE 'payment.%';
```

### 問題 3: 所有人都能看到操作

**原因**: 用戶可能有 admin 角色

**檢查方法**:
```sql
SELECT
  u.email,
  r.code as role_code,
  r.name as role_name
FROM auth.users u
JOIN rbac.user_roles ur ON u.id = ur.user_id
JOIN rbac.roles r ON ur.role_id = r.id
WHERE u.id = '<USER_ID>';
```

---

## 📊 權限分配建議

### 標準配置

```sql
-- 會計角色
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'accountant'
  AND p.code IN (
    'payment.paper.manage',
    'payment.invoice.manage',
    'payment.invoice.view'
  )
ON CONFLICT DO NOTHING;

-- 出納角色
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code = 'cashier'
  AND p.code IN (
    'payment.fee.manage',
    'payment.invoice.view'
  )
ON CONFLICT DO NOTHING;

-- 審核主管和放行主管（可以查看發票）
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM rbac.roles r
CROSS JOIN rbac.permissions p
WHERE r.code IN ('audit_manager', 'boss', 'unit_manager')
  AND p.code = 'payment.invoice.view'
ON CONFLICT DO NOTHING;
```

### 特殊授權

如果需要給特定用戶臨時權限：

```sql
-- 給特定用戶臨時的發票管理權限（30 天）
INSERT INTO rbac.user_permissions (user_id, permission_id, expires_at, reason)
SELECT
  '<USER_ID>',
  p.id,
  NOW() + INTERVAL '30 days',
  '臨時協助發票補登作業'
FROM rbac.permissions p
WHERE p.code = 'payment.invoice.manage';
```

---

## ✅ 驗證檢查清單

部署後請確認：

- [ ] 資料庫中有 4 個新權限
- [ ] 會計角色有紙本和發票權限
- [ ] 出納角色有手續費權限
- [ ] 前端已重新部署
- [ ] 會計可以點擊紙本按鈕
- [ ] 出納可以看到手續費輸入框
- [ ] 會計可以編輯發票資訊
- [ ] 無權限者看不到相關操作
- [ ] 錯誤訊息清楚說明所需權限

---

## 📚 相關文檔

- `docs/PAYMENT_RBAC_STATUS.md` - 付款系統 RBAC 完整狀態報告
- `docs/ALL_SYSTEMS_RBAC_PLAN.md` - 全系統 RBAC 規劃
- `supabase/migrations/create_rbac_system.sql` - RBAC 系統初始化
- `supabase/migrations/add_payment_operation_permissions.sql` - 新權限遷移檔

---

**最後更新**: 2026-01-21
**適用版本**: 所有使用 RBAC 的付款系統版本
