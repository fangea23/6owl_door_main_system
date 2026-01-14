# 公司車租借系統

公司車輛預約與管理系統，支援車輛管理、租借申請、審核流程和租借記錄追蹤。

## 功能特色

### 核心功能
- **車輛管理**：新增、編輯、刪除公司車輛資訊
- **租借申請**：員工可提交租車申請，指定用車時間和目的
- **審核流程**：管理員審核租車申請，核准或拒絕
- **租借記錄**：追蹤當前和歷史租借記錄
- **即時可用性**：根據日期查詢可用車輛
- **儀表板統計**：查看車輛狀態和租借統計

### 車輛資訊
- 基本資訊：車牌號碼、品牌、型號、年份、顏色
- 規格：車輛類型、座位數、燃料類型、變速箱
- 狀態管理：可用、租借中、維護中、已退役
- 位置追蹤：停放位置記錄

### 租借流程
1. 員工提交租車申請（選擇日期、車輛類型、用途）
2. 系統顯示可用車輛列表
3. 管理員審核申請
4. 核准後自動創建租借記錄
5. 取車時記錄里程數
6. 還車時完成租借並更新車輛狀態

## 資料庫結構

### Schema: `car_rental`

#### 1. vehicles（車輛表）
```sql
- id: UUID (主鍵)
- plate_number: VARCHAR(20) (車牌號碼，唯一)
- brand: VARCHAR(100) (品牌)
- model: VARCHAR(100) (型號)
- year: INTEGER (年份)
- color: VARCHAR(50) (顏色)
- vehicle_type: VARCHAR(50) (車輛類型)
- seating_capacity: INTEGER (座位數)
- fuel_type: VARCHAR(50) (燃料類型)
- transmission: VARCHAR(50) (變速箱)
- status: VARCHAR(50) (狀態)
- current_mileage: INTEGER (當前里程)
- location: VARCHAR(200) (停放位置)
- notes: TEXT (備註)
```

#### 2. rental_requests（租借申請表）
```sql
- id: UUID (主鍵)
- requester_id: UUID (申請人 ID)
- requester_name: VARCHAR(100) (申請人姓名)
- requester_department: VARCHAR(100) (申請人部門)
- vehicle_id: UUID (指定車輛)
- start_date/end_date: DATE (用車日期)
- purpose: TEXT (用車目的)
- destination: VARCHAR(300) (目的地)
- status: VARCHAR(50) (pending/approved/rejected/cancelled)
- reviewer_id: UUID (審核者)
- review_comment: TEXT (審核意見)
```

#### 3. rentals（租借記錄表）
```sql
- id: UUID (主鍵)
- request_id: UUID (關聯申請)
- vehicle_id: UUID (車輛)
- renter_id: UUID (租借人)
- start_date/end_date: DATE (租借日期)
- actual_start_time/actual_end_time: TIMESTAMP (實際時間)
- start_mileage/end_mileage: INTEGER (里程數)
- status: VARCHAR(50) (confirmed/in_progress/completed/cancelled)
```

#### 4. maintenance_records（維護記錄表）
```sql
- id: UUID (主鍵)
- vehicle_id: UUID (車輛)
- maintenance_type: VARCHAR(50) (維護類型)
- maintenance_date: DATE (維護日期)
- description: TEXT (說明)
- cost: DECIMAL(12, 2) (費用)
- status: VARCHAR(50) (狀態)
```

## 安裝步驟

### 1. 資料庫設定

在 Supabase Dashboard 執行 `database_schema.sql` 來創建所需的表格和權限：

```bash
# SQL 文件位置
src/system/car_rental_system/database_schema.sql
```

這將會：
- 創建 `car_rental` schema
- 創建所有必要的表格
- 設定 Row Level Security (RLS) 政策
- 創建觸發器（自動更新時間戳）
- 插入示範資料

### 2. 環境變數

確保 `.env` 文件包含 Supabase 設定：

```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_KEY=your-anon-key
```

### 3. 啟動應用

```bash
npm install
npm run dev
```

訪問 `http://localhost:5173/systems/car-rental`

## 技術架構

### 前端技術
- **React 19** - UI 框架
- **React Router 7** - 路由管理
- **Tailwind CSS 4** - 樣式框架
- **Lucide React** - 圖標庫
- **React Hot Toast** - 通知提示

### 後端服務
- **Supabase** - PostgreSQL 資料庫 + 即時 API
- **Row Level Security** - 資料安全控制
- **Schema 隔離** - 多系統資料隔離

### 統一認證
- 共用主系統的 Supabase 客戶端
- 單點登入 (SSO) 實現
- 避免多個客戶端實例

## 目錄結構

```
src/system/car_rental_system/
├── database_schema.sql        # 資料庫結構
├── README.md                  # 本文件
└── src/
    ├── App.jsx                # 主應用路由
    ├── lib/
    │   └── supabase.js        # Supabase 客戶端
    ├── hooks/
    │   ├── useVehicles.js     # 車輛管理 Hook
    │   ├── useRentalRequests.js # 申請管理 Hook
    │   ├── useRentals.js      # 租借管理 Hook
    │   └── useDashboard.js    # 儀表板 Hook
    ├── components/
    │   └── Layout.jsx         # 主佈局
    └── pages/
        ├── Dashboard.jsx      # 儀表板
        ├── Vehicles.jsx       # 車輛管理
        ├── RentalRequests.jsx # 租借申請列表
        ├── MyRentals.jsx      # 我的租借
        └── RequestForm.jsx    # 申請表單
```

## 權限設定

### RLS 政策

1. **車輛資訊**
   - 所有已登入用戶可查看可用車輛
   - 管理員可完全管理車輛

2. **租借申請**
   - 用戶可查看自己的申請
   - 用戶可創建新申請
   - 管理員可查看和審核所有申請

3. **租借記錄**
   - 用戶可查看自己的租借記錄
   - 管理員可管理所有租借記錄

4. **維護記錄**
   - 所有人可查看
   - 管理員可管理

### 角色定義
- **admin**: 完整管理權限
- **user**: 基本使用者權限

## API 使用範例

### 獲取可用車輛
```javascript
const { vehicles } = useVehicles();
await fetchAvailableVehicles('2024-01-01', '2024-01-05');
```

### 創建租借申請
```javascript
const { createRequest } = useRentalRequests();
await createRequest({
  requester_id: userId,
  requester_name: 'John Doe',
  vehicle_id: vehicleId,
  start_date: '2024-01-01',
  end_date: '2024-01-05',
  purpose: '客戶拜訪'
});
```

### 審核申請
```javascript
const { reviewRequest } = useRentalRequests();
await reviewRequest(requestId, 'approved', reviewerId, '核准');
```

## 未來功能規劃

- [ ] 車輛維護提醒（根據里程或日期）
- [ ] 租借衝突檢測和提醒
- [ ] 車輛使用報表
- [ ] 油耗追蹤
- [ ] 違規記錄管理
- [ ] 手機 App 支援
- [ ] GPS 定位追蹤
- [ ] 自動化審核規則
- [ ] Email/SMS 通知

## 疑難排解

### 常見問題

**Q: 車輛列表顯示為空？**
A: 確認資料庫已執行 `database_schema.sql`，並且有插入示範資料。

**Q: 無法創建租借申請？**
A: 檢查 RLS 政策是否正確設定，確認用戶有 `requester_id`。

**Q: Supabase 連線錯誤？**
A: 確認環境變數 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_KEY` 正確設定。

## 授權

此系統為公司內部使用，請勿外傳。

## 聯絡資訊

如有問題，請聯繫系統管理員。
