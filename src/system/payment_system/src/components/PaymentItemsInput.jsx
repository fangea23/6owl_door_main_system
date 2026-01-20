import React from 'react';
import { Plus, Trash2, Loader2, Store, FileText, DollarSign } from 'lucide-react';
import SearchableSelect from './SearchableSelect';

/**
 * 付款明細輸入組件
 * 支援多個門店同時付款給同一個廠商
 */
export default function PaymentItemsInput({
  items = [],
  onChange,
  brandList = [],
  storeList = [],
  onBrandChange,
  fetchingStores = false,
  disabled = false
}) {
  // 添加新明細
  const addItem = () => {
    const newItem = {
      id: Date.now(), // 臨時ID
      brandId: '',
      brandName: '',
      storeId: '',
      storeName: '',
      content: '',
      taxType: 'tax_included',
      amount: ''
    };
    onChange([...items, newItem]);
  };

  // 刪除明細
  const removeItem = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems);
  };

  // 更新單個明細
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      [field]: value
    };
    onChange(newItems);
  };

  // 處理品牌變更
  const handleBrandChange = (index, brandId) => {
    console.log('Brand change:', { index, brandId, brandList });
    const selectedBrand = brandList.find(b => String(b.id) === String(brandId));
    console.log('Selected brand:', selectedBrand);
    if (selectedBrand) {
      // 先清空門店選擇
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        brandId: String(brandId),
        brandName: selectedBrand.name,
        storeId: '',
        storeName: ''
      };
      onChange(newItems);

      // 通知父組件載入該品牌的門店
      onBrandChange && onBrandChange(brandId, index);
    }
  };

  // 計算總金額
  const calculateTotal = () => {
    return items.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);
  };

  // 當組件首次渲染且沒有明細時，初始化一筆
  React.useEffect(() => {
    if (items.length === 0) {
      console.log('Initializing first item');
      addItem();
    }
  }, []); // 只在首次掛載時執行

  return (
    <div className="space-y-4">
      {/* 明細列表 */}
      {items.map((item, index) => (
        <div
          key={item.id || index}
          className="relative p-4 border-2 border-stone-200 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow"
        >
          {/* 明細標題與刪除按鈕 */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center font-bold text-sm">
                {index + 1}
              </div>
              <h4 className="font-medium text-stone-700">付款明細 #{index + 1}</h4>
            </div>

            {/* 只有多於一筆時才顯示刪除按鈕 */}
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="刪除此筆明細"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 品牌選擇 */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                支付品牌 <span className="text-red-500">*</span>
              </label>
              <select
                value={item.brandId || ''}
                onChange={(e) => {
                  console.log('Brand select onChange:', e.target.value);
                  handleBrandChange(index, e.target.value);
                }}
                required
                disabled={disabled}
                className="w-full rounded-md border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">請選擇品牌</option>
                {brandList.map(brand => (
                  <option key={brand.id} value={String(brand.id)}>
                    {String(brand.id).padStart(2, '0')} - {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 門店選擇 */}
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex justify-between items-center">
                <span>支付門店 <span className="text-red-500">*</span></span>
                {fetchingStores && (
                  <span className="text-red-500 flex items-center text-xs">
                    <Loader2 className="animate-spin h-3 w-3 mr-1" />
                    查詢中...
                  </span>
                )}
              </label>
              <SearchableSelect
                options={storeList
                  .filter(store => item.brandId ? String(store.brand_id) === String(item.brandId) : true)
                  .map(store => ({
                    value: String(store.id),
                    label: store.name,
                    subLabel: store.code
                  })) || []}
                value={item.storeId}
                onChange={(value) => {
                  console.log('Store selected:', value);
                  const selectedStore = storeList.find(s => String(s.id) === String(value));
                  console.log('Found store:', selectedStore);
                  if (selectedStore) {
                    const newItems = [...items];
                    newItems[index] = {
                      ...newItems[index],
                      storeId: String(value),
                      storeName: selectedStore.name
                    };
                    onChange(newItems);
                  }
                }}
                placeholder={!item.brandId ? '請先選擇品牌' : '請選擇或搜尋門店'}
                disabled={!item.brandId || disabled}
                loading={fetchingStores}
                loadingText="查詢門店資料中..."
                required
                emptyText="無門店資料"
              />
            </div>

            {/* 付款內容說明 */}
            <div className="col-span-1 md:col-span-2 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                付款內容及說明 <span className="text-red-500">*</span>
              </label>
              <textarea
                value={item.content}
                onChange={(e) => updateItem(index, 'content', e.target.value)}
                rows={2}
                placeholder="例如：11月租金、RFY-2011 車貸..."
                required
                disabled={disabled}
                className="w-full rounded-md border-stone-200 p-2.5 border bg-white focus:ring-2 focus:ring-red-500 outline-none shadow-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            {/* 稅別與金額 */}
            <div className="col-span-1 md:col-span-2 bg-stone-50/50 p-4 rounded-lg border border-stone-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 稅別選擇 */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    稅別 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name={`taxType-${index}`}
                        value="tax_included"
                        checked={item.taxType === 'tax_included'}
                        onChange={(e) => updateItem(index, 'taxType', e.target.value)}
                        disabled={disabled}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 disabled:cursor-not-allowed"
                      />
                      <span className="ml-2 text-sm text-gray-700">含稅</span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="radio"
                        name={`taxType-${index}`}
                        value="tax_excluded"
                        checked={item.taxType === 'tax_excluded'}
                        onChange={(e) => updateItem(index, 'taxType', e.target.value)}
                        disabled={disabled}
                        className="w-4 h-4 text-red-600 focus:ring-red-500 disabled:cursor-not-allowed"
                      />
                      <span className="ml-2 text-sm text-gray-700">未稅</span>
                    </label>
                  </div>
                </div>

                {/* 金額輸入 */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    付款金額 <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 text-lg font-bold">$</span>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.amount}
                      onChange={(e) => updateItem(index, 'amount', e.target.value)}
                      placeholder="0.00"
                      required
                      disabled={disabled}
                      className="w-full pl-8 pr-3 py-2.5 border-0 border-b-2 border-stone-300 focus:border-red-500 outline-none bg-transparent font-mono text-lg font-semibold text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* 總金額顯示 */}
      {items.length > 1 && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border-2 border-red-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="text-red-600" size={24} />
              <span className="text-lg font-bold text-stone-700">總計金額</span>
            </div>
            <div className="text-2xl font-bold text-red-600 font-mono">
              $ {calculateTotal().toLocaleString('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="mt-2 text-xs text-stone-500">
            共 {items.length} 筆付款明細
          </div>
        </div>
      )}

      {/* 新增明細按鈕 */}
      <button
        type="button"
        onClick={addItem}
        disabled={disabled}
        className="w-full py-3 px-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus size={20} />
        新增付款明細
      </button>

      {/* 說明文字 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-sm text-blue-800">
          <strong>💡 提示：</strong>您可以在同一個申請中，為不同門店添加多筆付款明細，所有門店將支付給同一個收款廠商。
        </p>
      </div>
    </div>
  );
}
