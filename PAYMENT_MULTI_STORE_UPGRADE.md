# 付款簽核系統多門店功能升級指南

## 概述

本升級為付款簽核系統添加兩個主要功能：
1. **會計品牌分流**：不同品牌的付款申請分配給對應的會計處理
2. **多門店付款**：允許一次申請包含多個門店的付款明細

## 一、資料庫變更

### 1. 執行 SQL Migration

執行以下 SQL 文件來創建新的資料庫結構：

```bash
# 在 Supabase Dashboard 的 SQL Editor 中執行
supabase/migrations/add_payment_system_enhancements.sql
```

這將創建：
- `accountant_brands` 表：會計負責品牌關聯
- `payment_request_items` 表：付款申請明細
- 相關視圖和觸發器

### 2. 設定會計負責品牌

在執行 migration 後，需要為會計分配負責的品牌：

```sql
-- 範例：為「六扇門」品牌的會計分配品牌
INSERT INTO payment_approval.accountant_brands (employee_id, brand_id)
SELECT
    e.id as employee_id,
    b.id as brand_id
FROM public.employees e
CROSS JOIN payment_approval.brands b
WHERE e.role = 'accountant'
    AND e.name LIKE '%六扇門%'  -- 根據實際會計姓名調整
    AND b.name = '六扇門';

-- 為其他品牌的會計分配
INSERT INTO payment_approval.accountant_brands (employee_id, brand_id)
SELECT
    e.id as employee_id,
    b.id as brand_id
FROM public.employees e
CROSS JOIN payment_approval.brands b
WHERE e.role = 'accountant'
    AND e.name NOT LIKE '%六扇門%'  -- 其他會計
    AND b.name != '六扇門';         -- 所有非六扇門的品牌
```

---

## 二、前端代碼修改

### 文件清單

需要修改的文件：
1. ✅ `src/system/payment_system/src/components/PaymentItemsInput.jsx` - **已創建**
2. ⚠️ `src/system/payment_system/src/pages/ApplyForm.jsx` - **需要修改**
3. ⚠️ `src/system/payment_system/src/pages/Dashboard.jsx` - **需要修改**
4. ⚠️ `src/system/payment_system/src/pages/RequestDetail.jsx` - **需要修改**

---

## 三、ApplyForm.jsx 修改步驟

### Step 1: 在文件頂部導入新組件

```jsx
// 在其他 import 之後添加
import PaymentItemsInput from '../components/PaymentItemsInput';
```

### Step 2: 修改 State 初始化（第 78 行附近）

在 `formData` state 中添加新字段：

```jsx
const [formData, setFormData] = useState({
    // 保留原有字段...
    brand: '',
    brandId: '',
    store: '',
    // ... 其他原有字段 ...

    // 新增：多門店付款相關字段
    isMultiStore: false,         // 是否為多門店付款
    paymentItems: [],            // 付款明細陣列
});
```

### Step 3: 添加多門店列表管理 State

```jsx
// 在其他 useState 之後添加
// 管理每個明細項對應的門店列表（索引對應 paymentItems）
const [multiStoreList, setMultiStoreList] = useState([]);
```

### Step 4: 創建處理多門店品牌變更的函數

```jsx
// 處理單個明細項的品牌變更
const handleItemBrandChange = async (brandId, itemIndex) => {
    if (!brandId) {
        // 清空該索引的門店列表
        setMultiStoreList(prev => {
            const newList = [...prev];
            newList[itemIndex] = [];
            return newList;
        });
        return;
    }

    setFetchingStores(true);
    try {
        const { data, error } = await supabase
            .from('stores')
            .select('*')
            .eq('brand_id', brandId)
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        // 更新該索引的門店列表
        setMultiStoreList(prev => {
            const newList = [...prev];
            newList[itemIndex] = data || [];
            return newList;
        });
    } catch (err) {
        console.error('載入門店失敗:', err);
        alert('載入門店清單失敗，請稍後再試');
    } finally {
        setFetchingStores(false);
    }
};
```

### Step 5: 替換「基本付款資訊」區塊（第 676-824 行）

找到這個區塊：

```jsx
{/* 一、基本付款資訊 */}
<section className="bg-stone-50/50 p-4 rounded-lg border border-stone-200/60">
    <SectionTitle icon={FileText} title="一、基本付款資訊" />
    {/* ... 現有的表單欄位 ... */}
</section>
```

替換為：

```jsx
{/* 一、基本付款資訊 */}
<section className="bg-stone-50/50 p-4 rounded-lg border border-stone-200/60">
    <SectionTitle icon={FileText} title="一、基本付款資訊" />

    {/* 模式切換（可選） */}
    <div className="mb-4 bg-white p-4 rounded-lg border border-stone-200">
        <label className="flex items-center cursor-pointer">
            <input
                type="checkbox"
                checked={formData.isMultiStore}
                onChange={(e) => {
                    setFormData(prev => ({
                        ...prev,
                        isMultiStore: e.target.checked,
                        paymentItems: e.target.checked ? [{
                            id: Date.now(),
                            brandId: '',
                            brandName: '',
                            storeId: '',
                            storeName: '',
                            content: '',
                            taxType: 'tax_included',
                            amount: ''
                        }] : []
                    }));
                }}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">
                多門店付款模式（同時為多個門店付款給同一廠商）
            </span>
        </label>
    </div>

    {/* 根據模式顯示不同的輸入方式 */}
    {formData.isMultiStore ? (
        // 多門店模式：使用 PaymentItemsInput 組件
        <PaymentItemsInput
            items={formData.paymentItems}
            onChange={(items) => {
                setFormData(prev => ({ ...prev, paymentItems: items }));
            }}
            brandList={brandList}
            storeList={multiStoreList}
            onBrandChange={handleItemBrandChange}
            fetchingStores={fetchingStores}
            disabled={loading}
        />
    ) : (
        // 單門店模式：保留原有表單（向後兼容）
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 保留原有的單門店表單欄位 */}
            {/* 1. 支付品牌 */}
            <div className="col-span-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                    <span>支付品牌 <span className="text-red-500">*</span></span>
                    {fetchingBrands && <span className="text-red-500 flex items-center text-xs"><Loader2 className="animate-spin h-3 w-3 mr-1" />載入中...</span>}
                </label>
                <select
                    name="brandId"
                    value={formData.brandId}
                    onChange={handleBrandChange}
                    required
                    className="w-full rounded-md border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
                >
                    <option value="">請選擇品牌</option>
                    {brandList.map(brand => (
                        <option key={brand.id} value={brand.id}>
                            {String(brand.id).padStart(2, '0')} - {brand.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* 2. 支付門店 */}
            <div className="col-span-1 flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                    <span>支付門店 <span className="text-red-500">*</span></span>
                    {fetchingStores && <span className="text-red-500 flex items-center text-xs"><Loader2 className="animate-spin h-3 w-3 mr-1" />查詢中...</span>}
                </label>
                <SearchableSelect
                    options={storeList.map(store => ({
                        value: store.name,
                        label: store.name,
                        subLabel: store.code
                    }))}
                    value={formData.store}
                    onChange={(value) => {
                        setFormData(prev => ({
                            ...prev,
                            store: value
                        }));
                    }}
                    placeholder={!formData.brandId ? '請先選擇品牌' : '請選擇或搜尋門店'}
                    disabled={!formData.brandId}
                    loading={fetchingStores}
                    loadingText="查詢門店資料中..."
                    required
                    emptyText="無門店資料"
                />
            </div>

            {/* 其餘原有欄位保持不變 */}
            {/* 3. 付款日期 */}
            {/* 4. 付款內容說明 */}
            {/* 5. 金額與稅別 */}
            {/* ... */}
        </div>
    )}

    {/* 付款日期（兩種模式都需要） */}
    <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
            付款日期 <span className="text-red-500">*</span>
        </label>
        <input
            type="date"
            name="paymentDate"
            value={formData.paymentDate}
            onChange={handleChange}
            required
            className="w-full rounded-md border-stone-200 p-2.5 border bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm"
        />
    </div>
</section>
```

### Step 6: 修改 handleSubmit 提交邏輯（第 461 行附近）

在 `dbPayload` 創建後添加多門店處理邏輯：

```jsx
const handleSubmit = async (e) => {
    e.preventDefault();
    // ... 現有的驗證和上傳邏輯 ...

    // 準備主表資料
    const dbPayload = {
        // ... 現有欄位 ...
        applicant_id: user.id,
        payment_date: formData.paymentDate,
        payment_method: formData.paymentMethod,
        // ... 其他欄位 ...

        // 新增：多門店標記
        is_multi_store: formData.isMultiStore,
    };

    // 如果是多門店模式，使用第一筆明細的品牌/門店（主表保留兼容性）
    if (formData.isMultiStore && formData.paymentItems.length > 0) {
        const firstItem = formData.paymentItems[0];
        dbPayload.brand = firstItem.brandName;
        dbPayload.store = firstItem.storeName;
        dbPayload.content = `多門店付款 (共 ${formData.paymentItems.length} 筆)`;
        dbPayload.tax_type = firstItem.taxType;

        // 計算總金額
        const totalAmount = formData.paymentItems.reduce((sum, item) => {
            return sum + (parseFloat(item.amount) || 0);
        }, 0);
        dbPayload.amount = totalAmount;
        dbPayload.total_amount = totalAmount;
        dbPayload.item_count = formData.paymentItems.length;
    } else {
        // 單門店模式：使用原有欄位
        dbPayload.brand = formData.brand;
        dbPayload.store = formData.store;
        dbPayload.content = formData.content;
        dbPayload.tax_type = formData.taxType;
        dbPayload.amount = Number(formData.amount);
        dbPayload.is_multi_store = false;
        dbPayload.item_count = 1;
    }

    // 設定初始狀態（保留原有邏輯）
    // ... 現有的狀態設定邏輯 ...

    try {
        if (editId) {
            // 更新模式
            const { error } = await supabase
                .from('payment_requests')
                .update(dbPayload)
                .eq('id', editId);

            if (error) throw error;

            // 如果是多門店，更新明細
            if (formData.isMultiStore) {
                // 先刪除舊明細
                await supabase
                    .from('payment_request_items')
                    .delete()
                    .eq('request_id', editId);

                // 插入新明細
                const items = formData.paymentItems.map((item, index) => ({
                    request_id: editId,
                    store_id: item.storeId,
                    store_name: item.storeName,
                    brand_name: item.brandName,
                    content: item.content,
                    tax_type: item.taxType,
                    amount: parseFloat(item.amount),
                    display_order: index
                }));

                const { error: itemsError } = await supabase
                    .from('payment_request_items')
                    .insert(items);

                if (itemsError) throw itemsError;
            }

            alert('✅ 案件已重新提交！');
        } else {
            // 新增模式
            const { data: newRequest, error } = await supabase
                .from('payment_requests')
                .insert([dbPayload])
                .select()
                .single();

            if (error) throw error;

            // 如果是多門店，插入明細
            if (formData.isMultiStore && newRequest) {
                const items = formData.paymentItems.map((item, index) => ({
                    request_id: newRequest.id,
                    store_id: item.storeId,
                    store_name: item.storeName,
                    brand_name: item.brandName,
                    content: item.content,
                    tax_type: item.taxType,
                    amount: parseFloat(item.amount),
                    display_order: index
                }));

                const { error: itemsError } = await supabase
                    .from('payment_request_items')
                    .insert(items);

                if (itemsError) throw itemsError;
            }

            alert('✅ 申請已送出！');
        }

        navigate(`${BASE_PATH}/dashboard`);
    } catch (error) {
        console.error('提交失敗:', error);
        alert(`提交失敗：${error.message}`);
    } finally {
        setLoading(false);
    }
};
```

---

## 四、Dashboard.jsx 修改

### 添加會計品牌分流查詢邏輯

在 `fetchRequests` 函數中添加品牌篩選：

```jsx
const fetchRequests = async () => {
    setFetchingList(true);
    try {
        let query = supabase
            .from('payment_requests')
            .select('*')
            .order('created_at', { ascending: false });

        // 如果是會計角色，只顯示自己負責品牌的申請
        if (currentRole === 'accountant') {
            // 查詢會計負責的品牌
            const { data: accountantBrands } = await supabase
                .from('accountant_brands')
                .select('brand_id, brands(name)')
                .eq('employee_id', userInfo.id);

            if (accountantBrands && accountantBrands.length > 0) {
                const brandNames = accountantBrands.map(ab => ab.brands.name);
                query = query.in('brand', brandNames);
            } else {
                // 如果沒有分配品牌，不顯示任何申請
                setRequestList([]);
                setFetchingList(false);
                return;
            }
        }

        const { data, error } = await query;
        if (error) throw error;
        setRequestList(data || []);
    } catch (err) {
        console.error('載入失敗:', err);
    } finally {
        setFetchingList(false);
    }
};
```

### 顯示多門店資訊

在申請列表顯示時，檢查 `is_multi_store` 標記：

```jsx
{request.is_multi_store && (
    <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
        <Store size={12} />
        多門店付款 ({request.item_count} 筆)
    </div>
)}
```

---

## 五、RequestDetail.jsx 修改

### 載入並顯示付款明細

在組件載入時查詢明細：

```jsx
const [paymentItems, setPaymentItems] = useState([]);

useEffect(() => {
    const loadRequest = async () => {
        // ... 現有的載入邏輯 ...

        // 如果是多門店，載入明細
        if (requestData.is_multi_store) {
            const { data: items } = await supabase
                .from('payment_request_items')
                .select('*')
                .eq('request_id', id)
                .order('display_order');

            setPaymentItems(items || []);
        }
    };

    loadRequest();
}, [id]);
```

### 在詳情頁顯示明細表

```jsx
{request.is_multi_store && (
    <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
        <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
            <Store size={18} />
            付款明細清單
        </h4>
        <div className="space-y-2">
            {paymentItems.map((item, index) => (
                <div key={item.id} className="bg-white p-3 rounded border border-purple-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                            <span className="text-gray-500">品牌：</span>
                            <span className="font-medium">{item.brand_name}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">門店：</span>
                            <span className="font-medium">{item.store_name}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">稅別：</span>
                            <span>{item.tax_type === 'tax_included' ? '含稅' : '未稅'}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">金額：</span>
                            <span className="font-bold text-red-600">
                                ${item.amount.toLocaleString()}
                            </span>
                        </div>
                        <div className="col-span-2 md:col-span-4">
                            <span className="text-gray-500">內容：</span>
                            <span>{item.content}</span>
                        </div>
                    </div>
                </div>
            ))}
            <div className="text-right font-bold text-lg text-purple-900 pt-2 border-t border-purple-300">
                總計：${request.total_amount?.toLocaleString() || request.amount.toLocaleString()}
            </div>
        </div>
    </div>
)}
```

---

## 六、測試清單

### 1. 資料庫測試
- [ ] SQL migration 成功執行
- [ ] `accountant_brands` 表創建成功
- [ ] `payment_request_items` 表創建成功
- [ ] 視圖和函數正常運作
- [ ] 會計品牌關聯資料正確插入

### 2. 功能測試

#### 單門店模式（向後兼容）
- [ ] 可以正常提交單門店申請
- [ ] 資料正確保存到 `payment_requests` 表
- [ ] `is_multi_store` 標記為 `false`
- [ ] 現有流程不受影響

#### 多門店模式
- [ ] 可以切換到多門店模式
- [ ] 可以添加多筆付款明細
- [ ] 每筆明細可以選擇不同品牌/門店
- [ ] 總金額自動計算正確
- [ ] 可以刪除明細（至少保留一筆）
- [ ] 提交後資料正確保存
- [ ] `payment_request_items` 表有對應明細記錄

#### 會計品牌分流
- [ ] 六扇門會計只能看到六扇門品牌的申請
- [ ] 其他會計看到分配給他們的品牌申請
- [ ] 未分配品牌的會計不會看到任何申請
- [ ] 管理員可以看到所有申請

#### 顯示測試
- [ ] Dashboard 正確顯示多門店標記
- [ ] RequestDetail 正確顯示明細表
- [ ] 總金額計算正確
- [ ] 簽核流程正常運作

---

## 七、部署步驟

1. **備份資料庫**
   ```bash
   # 在部署前務必備份現有資料
   ```

2. **執行 Migration**
   - 在 Supabase Dashboard 執行 SQL

3. **設定會計品牌關聯**
   - 執行上述 SQL 為會計分配品牌

4. **部署前端代碼**
   - 更新 ApplyForm.jsx
   - 部署 PaymentItemsInput.jsx
   - 更新 Dashboard.jsx
   - 更新 RequestDetail.jsx

5. **測試**
   - 按照測試清單逐項測試
   - 確保現有功能不受影響

---

## 八、注意事項

1. **向後兼容性**
   - 保持單門店模式為預設
   - 現有申請資料不受影響
   - 簽核流程邏輯不變

2. **資料完整性**
   - 明細表使用冗餘字段（brand_name, store_name）
   - 即使品牌/門店被刪除，歷史記錄仍可查看

3. **效能考慮**
   - 使用資料庫觸發器自動更新總金額
   - 查詢時使用索引優化
   - 視圖提供預先計算的資料

4. **權限控制**
   - RLS 確保資料安全
   - 會計只能看到負責品牌的資料
   - 管理員保有完整權限

---

## 九、常見問題

### Q1: 如果會計沒有分配品牌會怎樣？
A: 該會計在 Dashboard 將看不到任何待簽核申請。需要管理員在 `accountant_brands` 表中為其分配品牌。

### Q2: 多門店申請的總金額如何計算？
A: 系統會自動加總所有明細的金額。資料庫觸發器會在明細變更時自動更新主表的 `total_amount` 和 `item_count`。

### Q3: 可以編輯已提交的多門店申請嗎？
A: 可以。編輯時會載入所有明細，修改後重新提交會更新明細資料。

### Q4: 會計品牌分流會影響其他角色嗎？
A: 不會。品牌分流只對會計角色生效，其他角色（如單位主管、審核主管等）仍可看到所有申請。

---

## 十、後續優化建議

1. **管理介面**
   - 創建會計品牌分配的管理頁面
   - 支援批量分配和調整

2. **報表功能**
   - 按品牌統計付款金額
   - 多門店申請的匯總報表

3. **通知系統**
   - 會計接收負責品牌的新申請通知
   - 多門店申請的特殊提示

4. **匯出功能**
   - Excel 匯出時包含明細清單
   - 分品牌匯出會計報表

---

**祝升級順利！如有問題請參考代碼註解或聯繫開發團隊。**
