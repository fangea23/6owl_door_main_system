# RBAC 權限問題修復總結

**日期：** 2026-01-21
**版本：** 1.0

---

## 🎯 問題描述

用戶報告：「有些擋住我了 但是 我明明就有權限」

**具體症狀：**
- ✅ 部分功能可正常使用（付款取消、刪除、駁回等）
- ❌ 車輛管理功能消失（無法新增/編輯車輛）
- ❌ 會議室預約可能被阻擋
- 😕 用戶明確表示擁有權限，卻仍被阻擋

---

## 🔍 根本原因

經過詳細調查，發現以下問題：

### 1. 新舊權限代碼並存

系統中存在兩套權限代碼：

| 類型 | 車輛模組 | 會議室模組 | 來源遷移 |
|-----|---------|-----------|---------|
| **舊代碼** | `vehicle.*` | `meeting.*` | `create_rbac_system.sql` |
| **新代碼** | `car.*` | `meeting.booking.*`, `meeting.room.*` | `add_car_meeting_permissions.sql` |

**組件實際使用：** 新代碼
**問題：** 前端組件檢查新權限代碼，但某些角色可能只被分配了舊權限代碼

### 2. 權限分配策略差異

| 權限 | 預設分配給 | 用戶期望 |
|------|-----------|---------|
| `car.vehicle.create` | manager, admin | 可能也需要 staff |
| `car.vehicle.edit` | manager, admin | 可能也需要 staff |
| `car.vehicle.delete` | manager, admin | 可能也需要 staff |

**結論：** 這不是系統錯誤，而是**權限設計決策**問題。

### 3. Management Center 模組名稱不匹配

PermissionManagement.jsx 的 `moduleNames` 對應：
- ❌ 缺少 `car_rental` 模組映射
- ❌ 缺少 `meeting_room` 模組映射
- ✅ 只有舊的 `vehicle` 和 `meeting`

**影響：** 新權限在 UI 中沒有友好的顯示名稱

---

## ✅ 已執行的修復

### 修復 1：更新 PermissionManagement 模組名稱映射

**文件：** `src/pages/management/components/PermissionManagement.jsx`

**變更：**
```javascript
const moduleNames = {
  payment: '💰 付款簽核',
  car_rental: '🚗 車輛租借',        // ✅ 新增
  vehicle: '🚗 車輛租借（舊）',     // 標註為舊版
  meeting_room: '🏢 會議室',        // ✅ 新增
  meeting: '🏢 會議室（舊）',       // 標註為舊版
  employee: '👥 員工管理',
  rbac: '🔐 權限管理'
};
```

**效果：**
- ✅ 新權限在 Management Center 中正確顯示中文名稱和圖示
- ✅ 用戶可以清楚區分新舊權限

### 修復 2：創建用戶權限診斷工具

**文件：** `supabase/migrations/diagnose_user_permissions.sql`

**功能：**
- 🔍 快速診斷特定用戶為什麼被阻擋
- 📊 顯示用戶的員工記錄、RBAC 角色、擁有權限
- 🧪 測試關鍵權限檢查（車輛管理、租車申請、會議室預約）
- 💡 提供問題診斷和修復建議

**使用方法：**
```sql
-- 將 {USER_EMAIL} 替換為實際 email 後執行
DO $$
DECLARE
  v_user_email TEXT := 'user@example.com';
  ...
```

### 修復 3：創建權限調試工具

**文件：** `supabase/migrations/debug_permission_mismatch.sql`

**功能：**
- 列出所有已定義的權限
- 檢查組件需要的權限是否存在
- 顯示每個角色被分配了哪些權限
- 檢查重複或衝突的權限代碼
- 查找舊權限代碼並建議遷移
- 提供總結報告

---

## 📚 已創建的文檔

### 1. 權限不匹配詳細分析
**文件：** `docs/PERMISSION_MISMATCH_ANALYSIS.md`

**內容：**
- 問題總結和根本原因
- 新舊權限代碼對比表
- 組件實際檢查的權限列表
- 具體問題案例分析
- 為什麼會被阻擋的原因分析
- 下一步行動建議

### 2. 權限診斷與修復指南
**文件：** `docs/RBAC_PERMISSION_DIAGNOSTIC_GUIDE.md`

**內容：**
- 🔍 快速診斷步驟
- 🛠️ 三種修復方案（角色同步、調整權限、修正角色）
- 📊 權限分配參考表
- 🎯 常見問題解答（Q&A）
- 🔧 SQL 調試工具
- ✅ 修復後檢查清單

---

## 🎓 用戶需要了解的關鍵概念

### 權限系統工作原理

```
employees.role (例如 'staff')
    ↓ 觸發器自動同步
rbac.user_roles (用戶 → 角色關聯)
    ↓ 查詢
rbac.role_permissions (角色 → 權限關聯)
    ↓ 最終得到
用戶擁有的權限列表
```

### 權限檢查流程

```
前端組件
    ↓ usePermission('car.vehicle.create')
supabase RPC
    ↓ rbac.user_has_permission(user_id, permission_code)
數據庫函數
    ↓ 查詢 user_roles + role_permissions + permissions
返回結果
    ↓ true / false
顯示/隱藏功能
```

### Management Center 的作用

- **不是** 唯一的權限配置方式（還可以通過 SQL）
- **是** 最方便的可視化管理工具
- **可以** 即時修改角色權限分配
- **需要** `rbac.manage` 權限才能使用

---

## 🚀 用戶下一步行動

### 選項 A：使用 Management Center 自行調整（推薦）

**前提：** 您有 `rbac.manage` 權限

**步驟：**
1. 登入 Management Center
2. 進入「權限管理」→「角色管理」
3. 選擇您的角色或需要調整的角色
4. 勾選/取消需要的權限
5. 點擊「保存」
6. 重新整理頁面測試

**適用情況：**
- ✅ 您有權限管理權限
- ✅ 您清楚知道需要哪些權限
- ✅ 您想要精細控制權限分配

### 選項 B：運行診斷腳本定位問題

**前提：** 您有數據庫訪問權限

**步驟：**
1. 打開 `supabase/migrations/diagnose_user_permissions.sql`
2. 將 `{USER_EMAIL}` 替換為您的 email
3. 在 Supabase SQL Editor 中執行
4. 查看診斷輸出
5. 根據建議執行修復

**適用情況：**
- ✅ 您不確定問題原因
- ✅ 您想要詳細的診斷報告
- ✅ 您需要數據支持來找出問題

### 選項 C：聯絡管理員協助

**前提：** 您沒有上述權限

**提供資訊：**
- 您的帳號 email
- 您的員工角色（如果知道）
- 被阻擋的具體功能
- 預期應該能做什麼

---

## 📊 修復前後對比

### 修復前

| 問題 | 狀態 |
|------|------|
| Management Center 不顯示新權限模組名稱 | ❌ |
| 無法快速診斷用戶權限問題 | ❌ |
| 缺乏權限問題的文檔說明 | ❌ |
| 不清楚為什麼被阻擋 | ❌ |

### 修復後

| 改進 | 狀態 |
|------|------|
| Management Center 正確顯示所有模組 | ✅ |
| 提供一鍵診斷用戶權限的 SQL 腳本 | ✅ |
| 完整的問題分析文檔 | ✅ |
| 詳細的診斷和修復指南 | ✅ |
| 用戶可以自行管理權限 | ✅ |

---

## 🔮 後續建議

### 短期（立即執行）

1. **運行診斷腳本** 確認當前權限狀態
2. **檢查 Management Center** 確保可以正常使用
3. **測試關鍵功能** 驗證修復是否生效

### 中期（本週內）

4. **清理舊權限代碼**（可選）
   - 如果確認所有功能都使用新代碼
   - 可以考慮標記舊權限為已棄用

5. **優化預設權限分配**
   - 根據實際使用情況調整
   - 例如：是否要給 staff 車輛管理權限？

### 長期（持續改進）

6. **建立權限遷移策略**
   - 當更新權限代碼時，提供自動遷移路徑
   - 避免再次出現新舊代碼並存的問題

7. **開發權限調試工具**
   - 在 Management Center 中添加「我的權限」頁面
   - 用戶可以查看自己擁有的所有權限
   - 顯示哪些功能可用/不可用的原因

---

## 📁 相關文件索引

| 文件 | 用途 | 位置 |
|------|------|------|
| 權限不匹配分析 | 詳細的技術分析 | `/docs/PERMISSION_MISMATCH_ANALYSIS.md` |
| 診斷與修復指南 | 用戶操作手冊 | `/docs/RBAC_PERMISSION_DIAGNOSTIC_GUIDE.md` |
| 用戶權限診斷工具 | SQL 診斷腳本 | `/supabase/migrations/diagnose_user_permissions.sql` |
| 權限調試工具 | SQL 調試腳本 | `/supabase/migrations/debug_permission_mismatch.sql` |
| 角色同步修復 | 已有的修復遷移 | `/supabase/migrations/fix_role_sync_add_missing_roles.sql` |
| RBAC 整合指南 | 系統說明文檔 | `/docs/RBAC_INTEGRATION_GUIDE.md` |
| RBAC 使用範例 | 代碼示例 | `/docs/RBAC_EXAMPLES.md` |

---

## ✨ 總結

**問題根源：** 權限分配策略問題，而非系統錯誤

**核心修復：**
- ✅ 更新 Management Center UI 支援新權限模組
- ✅ 提供完整的診斷和修復工具
- ✅ 創建詳細的用戶操作指南

**用戶控制權：**
- 用戶現在可以通過 Management Center 完全控制權限分配
- 不再需要依賴程式碼層級的權限配置
- 符合用戶需求：「要什麼權限不重要 我會自己選擇」

**下一步：**
- 用戶根據實際需求在 Management Center 中調整權限
- 如遇問題，使用診斷腳本快速定位原因
- 參考指南文檔自行解決或聯絡技術支援
