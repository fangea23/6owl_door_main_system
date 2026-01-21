# 全系統 RBAC 權限規劃文檔

## 權限命名規範

所有權限遵循 `{module}.{action}.{scope}` 格式：
- **module**: 系統模組名稱（car, meeting, license, store, ticket, km）
- **action**: 操作類型（create, view, edit, delete, approve, assign 等）
- **scope**: 權限範圍（own, all, admin 等）

---

## 1. 車輛租借系統 (car_rental_system) 🚗

### 系統特性
- ✅ 完整審核流程（pending → approved/rejected）
- ✅ 有角色區分（admin/user）
- ✅ 租借記錄管理（取車/還車）

### 權限定義

#### 1.1 租借申請相關
```
car.request.create       - 建立租車申請（所有員工）
car.request.view.own     - 查看自己的申請
car.request.view.all     - 查看所有申請（管理員）
car.request.cancel.own   - 取消自己的申請
car.request.edit.own     - 編輯自己的草稿申請
```

#### 1.2 審核相關
```
car.approve              - 審核租車申請（管理員）
car.reject               - 駁回租車申請（管理員）
```

#### 1.3 租借記錄管理
```
car.rental.pickup        - 執行取車操作（管理員）
car.rental.return        - 執行還車操作（管理員）
car.rental.view.all      - 查看所有租借記錄
car.rental.view.own      - 查看自己的租借記錄
```

#### 1.4 車輛管理
```
car.vehicle.create       - 新增車輛（管理員）
car.vehicle.edit         - 編輯車輛資料（管理員）
car.vehicle.delete       - 刪除車輛（管理員）
car.vehicle.view         - 查看車輛清單（所有人）
```

### 角色權限配置建議
```
一般員工 (staff):
  - car.request.create
  - car.request.view.own
  - car.request.cancel.own
  - car.request.edit.own
  - car.rental.view.own
  - car.vehicle.view

車輛管理員 (car_admin):
  - 所有 staff 權限
  - car.approve
  - car.reject
  - car.rental.pickup
  - car.rental.return
  - car.rental.view.all
  - car.request.view.all
  - car.vehicle.create
  - car.vehicle.edit
  - car.vehicle.delete
```

---

## 2. 會議室系統 (meeting_room_system) 🏢

### 系統特性
- ❌ 無審核流程（預約直接生效）
- ⚠️ 無角色區分
- ✅ 時間衝突檢測

### 權限定義

#### 2.1 會議室預約
```
meeting.booking.create      - 建立會議室預約
meeting.booking.view.own    - 查看自己的預約
meeting.booking.view.all    - 查看所有預約
meeting.booking.cancel.own  - 取消自己的預約
meeting.booking.cancel.all  - 取消任何預約（管理員）
meeting.booking.edit.own    - 編輯自己的預約
```

#### 2.2 會議室管理
```
meeting.room.create         - 新增會議室
meeting.room.edit           - 編輯會議室資料
meeting.room.delete         - 刪除會議室
meeting.room.view           - 查看會議室清單（所有人）
```

### 角色權限配置建議
```
一般員工 (staff):
  - meeting.booking.create
  - meeting.booking.view.own
  - meeting.booking.cancel.own
  - meeting.booking.edit.own
  - meeting.room.view

會議室管理員 (meeting_admin):
  - 所有 staff 權限
  - meeting.booking.view.all
  - meeting.booking.cancel.all
  - meeting.room.create
  - meeting.room.edit
  - meeting.room.delete
```

---

## 3. 授權管理系統 (license_system) 🔑

### 系統特性
- ❌ 無審核流程
- ⚠️ 無角色區分
- ✅ 複雜資源管理（授權、軟體、設備、分配）

### 權限定義

#### 3.1 授權管理
```
license.license.create       - 建立授權
license.license.edit         - 編輯授權資料
license.license.delete       - 刪除授權
license.license.view         - 查看授權清單
license.license.viewkey      - 查看授權金鑰（敏感資訊）
```

#### 3.2 授權分配
```
license.assign.create        - 分配授權給員工/設備
license.assign.revoke        - 撤銷授權分配
license.assign.view          - 查看分配記錄
```

#### 3.3 軟體管理
```
license.software.create      - 新增軟體產品
license.software.edit        - 編輯軟體資料
license.software.delete      - 刪除軟體
license.software.view        - 查看軟體清單
```

#### 3.4 設備管理
```
license.device.create        - 新增設備
license.device.edit          - 編輯設備資料
license.device.delete        - 刪除設備
license.device.view          - 查看設備清單
```

#### 3.5 客戶管理
```
license.customer.create      - 新增客戶
license.customer.edit        - 編輯客戶資料
license.customer.delete      - 刪除客戶
license.customer.view        - 查看客戶清單
```

#### 3.6 產品管理
```
license.product.create       - 新增產品
license.product.edit         - 編輯產品資料
license.product.delete       - 刪除產品
license.product.view         - 查看產品清單
```

### 角色權限配置建議
```
一般員工 (staff):
  - license.license.view（不含金鑰）
  - license.software.view
  - license.device.view
  - license.assign.view（自己相關）

IT 助理 (it_assistant):
  - 所有 staff 權限
  - license.assign.create
  - license.assign.revoke
  - license.device.create
  - license.device.edit

IT 管理員 (it_admin):
  - 所有 it_assistant 權限
  - license.license.create
  - license.license.edit
  - license.license.delete
  - license.license.viewkey（查看金鑰）
  - license.software.create
  - license.software.edit
  - license.software.delete
  - license.device.delete
  - license.customer.create
  - license.customer.edit
  - license.customer.delete
  - license.product.create
  - license.product.edit
  - license.product.delete
```

---

## 4. 店面管理系統 (store_management_system) 🏪

### 系統特性
- ❌ 無審核流程
- ⚠️ 無角色區分
- ✅ 基礎資料管理（品牌、店舖）

### 權限定義

#### 4.1 品牌管理
```
store.brand.create           - 新增品牌
store.brand.edit             - 編輯品牌資料
store.brand.delete           - 刪除品牌
store.brand.view             - 查看品牌清單
```

#### 4.2 店舖管理
```
store.store.create           - 新增店舖
store.store.edit             - 編輯店舖資料
store.store.delete           - 刪除店舖
store.store.view             - 查看店舖清單
store.store.toggle           - 啟用/停用店舖
```

### 角色權限配置建議
```
一般員工 (staff):
  - store.brand.view
  - store.store.view

店面管理員 (store_manager):
  - 所有 staff 權限
  - store.store.create
  - store.store.edit
  - store.store.toggle

系統管理員 (system_admin):
  - 所有 store_manager 權限
  - store.brand.create
  - store.brand.edit
  - store.brand.delete
  - store.store.delete
```

---

## 5. 票務系統 (ticketing_system) 🛠️

### 系統特性
- 🔄 **開發中**
- 預期有審核/指派流程

### 權限定義（規劃）

#### 5.1 工單管理
```
ticket.ticket.create         - 建立工單
ticket.ticket.view.own       - 查看自己的工單
ticket.ticket.view.assigned  - 查看指派給自己的工單
ticket.ticket.view.all       - 查看所有工單
ticket.ticket.edit.own       - 編輯自己的工單
ticket.ticket.close.own      - 關閉自己的工單
```

#### 5.2 工單處理
```
ticket.assign                - 指派工單
ticket.resolve               - 解決工單
ticket.close                 - 關閉工單（管理員）
ticket.reopen                - 重新開啟工單
```

#### 5.3 統計報表
```
ticket.report.view           - 查看統計報表
```

### 角色權限配置建議（規劃）
```
一般員工 (staff):
  - ticket.ticket.create
  - ticket.ticket.view.own
  - ticket.ticket.edit.own
  - ticket.ticket.close.own

技術人員 (technician):
  - ticket.ticket.view.assigned
  - ticket.resolve

IT 主管 (it_manager):
  - 所有權限
  - ticket.assign
  - ticket.ticket.view.all
  - ticket.close
  - ticket.reopen
  - ticket.report.view
```

---

## 6. EIP KM 系統 (eip_km_system) 📚

### 系統特性
- 🔄 **開發中**
- 預期有內容發布審核流程

### 權限定義（規劃）

#### 6.1 文件管理
```
km.document.create           - 建立文件
km.document.edit             - 編輯文件
km.document.delete           - 刪除文件
km.document.view             - 查看文件
km.document.publish          - 發布文件（需審核）
```

#### 6.2 公告管理
```
km.announcement.create       - 建立公告
km.announcement.edit         - 編輯公告
km.announcement.delete       - 刪除公告
km.announcement.view         - 查看公告
km.announcement.publish      - 發布公告（需審核）
```

#### 6.3 表單管理
```
km.form.create               - 上傳表單
km.form.edit                 - 編輯表單
km.form.delete               - 刪除表單
km.form.view                 - 查看/下載表單
```

#### 6.4 SOP 管理
```
km.sop.create                - 建立 SOP
km.sop.edit                  - 編輯 SOP
km.sop.delete                - 刪除 SOP
km.sop.view                  - 查看 SOP
km.sop.approve               - 審核 SOP
```

#### 6.5 教育訓練
```
km.training.create           - 建立訓練資源
km.training.edit             - 編輯訓練資源
km.training.delete           - 刪除訓練資源
km.training.view             - 查看訓練資源
```

### 角色權限配置建議（規劃）
```
一般員工 (staff):
  - km.document.view
  - km.announcement.view
  - km.form.view
  - km.sop.view
  - km.training.view

內容編輯 (content_editor):
  - 所有 staff 權限
  - km.document.create
  - km.document.edit
  - km.announcement.create
  - km.announcement.edit
  - km.form.create
  - km.form.edit
  - km.sop.create
  - km.sop.edit
  - km.training.create
  - km.training.edit

知識管理員 (km_admin):
  - 所有 content_editor 權限
  - km.document.delete
  - km.document.publish
  - km.announcement.delete
  - km.announcement.publish
  - km.form.delete
  - km.sop.delete
  - km.sop.approve
  - km.training.delete
```

---

## 整合優先順序

### 第一優先（完整功能 + 類似付款系統）
1. ✅ **payment_system** - 付款系統（已完成）
2. 🔄 **car_rental_system** - 車輛租借系統（有審核流程）

### 第二優先（完整功能 + 資源管理）
3. 🔄 **license_system** - 授權管理系統（複雜權限控制）
4. 🔄 **meeting_room_system** - 會議室系統（預約管理）

### 第三優先（基礎資料管理）
5. 🔄 **store_management_system** - 店面管理系統（簡單 CRUD）

### 第四優先（開發中系統）
6. ⏸️ **ticketing_system** - 票務系統（待開發完成）
7. ⏸️ **eip_km_system** - EIP KM 系統（待開發完成）

---

## 資料庫遷移計劃

### 步驟 1: 新增權限到 RBAC 系統

需要執行 SQL migration 將上述所有權限加入 `rbac.permissions` 表：

```sql
-- 車輛租借系統權限
INSERT INTO rbac.permissions (code, name, description, module) VALUES
('car.request.create', '建立租車申請', '允許建立新的租車申請', 'car_rental'),
('car.request.view.own', '查看自己的申請', '查看自己提交的租車申請', 'car_rental'),
('car.request.view.all', '查看所有申請', '查看所有租車申請（管理員）', 'car_rental'),
('car.approve', '審核租車申請', '核准或駁回租車申請', 'car_rental'),
-- ... 其他權限

-- 會議室系統權限
INSERT INTO rbac.permissions (code, name, description, module) VALUES
('meeting.booking.create', '建立會議室預約', '允許預約會議室', 'meeting_room'),
-- ... 其他權限

-- 授權管理系統權限
INSERT INTO rbac.permissions (code, name, description, module) VALUES
('license.license.create', '建立授權', '允許建立新的軟體授權', 'license'),
-- ... 其他權限
```

### 步驟 2: 建立角色並分配權限

```sql
-- 建立車輛管理員角色
INSERT INTO rbac.roles (code, name, description) VALUES
('car_admin', '車輛管理員', '管理車輛和租借申請');

-- 分配權限給角色
INSERT INTO rbac.role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM rbac.roles WHERE code = 'car_admin'),
  id
FROM rbac.permissions
WHERE module = 'car_rental';
```

---

## 實作檢查清單

每個系統需要完成以下步驟：

### Frontend 整合
- [ ] 匯入 `usePermission` 和 `PermissionGuard` hooks
- [ ] 為主要頁面添加權限檢查
- [ ] 為按鈕/功能添加 `PermissionGuard`
- [ ] 為批量操作添加權限驗證
- [ ] 添加無權限的友好 UI 提示

### Backend 整合（建議）
- [ ] 為 RPC 函數添加權限檢查
- [ ] 實作 RLS 政策（Row Level Security）
- [ ] 添加審計日誌

### 測試
- [ ] 測試無權限時的 UI 表現
- [ ] 測試不同角色的操作權限
- [ ] 測試權限載入狀態

### 文檔
- [ ] 更新系統 RBAC 整合文檔
- [ ] 記錄權限配置方式
- [ ] 提供角色配置範例

---

## 下一步行動

1. 開始整合 **car_rental_system**（最接近 payment_system 的架構）
2. 創建權限資料庫遷移腳本
3. 依序完成其他系統的整合
4. 創建統一的 RBAC 管理 UI（如果需要）
