import { useState } from 'react';
import { Plus, Trash2, Save, X } from 'lucide-react';
import { useProductCategories } from '../hooks/useProductCategories';
import { useSuppliers } from '../hooks/useSuppliers';

// 公司別選項
const COMPANIES = [
  { code: '6owl', name: '六扇門' },
  { code: 'dafu', name: '大福' },
  { code: 'daka', name: '大咖' },
  { code: 'haoka', name: '好咖' },
  { code: 'yuteng', name: '昱騰' },
  { code: 'lianju', name: '聯聚' },
];

// 空白品項
const EMPTY_ITEM = {
  product_code: '',
  product_name: '',
  specification: '',
  unit: '',
  supplier_name: '',
  supplier_id: null,
  is_food: true,
  category_code: '',
  inventory_managed: true,
  delivery_method: 'warehouse',
  tax_type: 'tax_excluded',
  storage_method: 'room_temp',
};

export default function ProductRequestForm({ onSubmit, onCancel, initialData = null }) {
  const { foodCategories, nonFoodCategories } = useProductCategories();
  const { suppliers } = useSuppliers();

  const [formData, setFormData] = useState({
    request_type: initialData?.request_type || 'new',
    companies: initialData?.companies || [],
    remarks: initialData?.remarks || '',
  });

  const [items, setItems] = useState(
    initialData?.items?.length > 0
      ? initialData.items
      : [{ ...EMPTY_ITEM }, { ...EMPTY_ITEM }, { ...EMPTY_ITEM }, { ...EMPTY_ITEM }, { ...EMPTY_ITEM }]
  );

  const [processing, setProcessing] = useState(false);

  // 切換公司選擇
  const toggleCompany = (code) => {
    setFormData((prev) => ({
      ...prev,
      companies: prev.companies.includes(code)
        ? prev.companies.filter((c) => c !== code)
        : [...prev.companies, code],
    }));
  };

  // 更新品項
  const updateItem = (index, field, value) => {
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

      // 如果是食材類/非食材類切換，清空類別
      if (field === 'is_food') {
        newItems[index].category_code = '';
      }

      return newItems;
    });
  };

  // 新增品項
  const addItem = () => {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  };

  // 刪除品項
  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 驗證
    if (formData.companies.length === 0) {
      alert('請至少選擇一個公司別');
      return;
    }

    const validItems = items.filter((item) => item.product_name?.trim());
    if (validItems.length === 0) {
      alert('請至少填寫一個品項');
      return;
    }

    setProcessing(true);
    try {
      const result = await onSubmit(formData, validItems);
      if (!result.success) {
        alert('提交失敗: ' + result.error);
      }
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 標題區 */}
      <div className="text-center border-b border-stone-200 pb-4">
        <h2 className="text-2xl font-bold text-stone-800">品號建立/變更申請單</h2>
        <p className="text-sm text-stone-500 mt-1">
          申請日期：{new Date().toLocaleDateString('zh-TW')}
        </p>
      </div>

      {/* 申請類型 */}
      <div className="bg-stone-50 p-4 rounded-xl">
        <label className="block text-sm font-semibold text-stone-700 mb-3">品號申請</label>
        <div className="flex gap-6">
          {[
            { value: 'new', label: '新增' },
            { value: 'change', label: '變更' },
            { value: 'disable', label: '停用' },
          ].map((type) => (
            <label key={type.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="request_type"
                value={type.value}
                checked={formData.request_type === type.value}
                onChange={(e) => setFormData({ ...formData, request_type: e.target.value })}
                className="w-4 h-4 text-red-600 focus:ring-red-500"
              />
              <span className="text-stone-700">{type.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 公司別 */}
      <div className="bg-stone-50 p-4 rounded-xl">
        <label className="block text-sm font-semibold text-stone-700 mb-3">公司別</label>
        <div className="flex flex-wrap gap-4">
          {COMPANIES.map((company) => (
            <label key={company.code} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.companies.includes(company.code)}
                onChange={() => toggleCompany(company.code)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <span className="text-stone-700">{company.name}</span>
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="checkbox" disabled className="w-4 h-4 rounded" />
            <span className="text-stone-400">其他</span>
            <input
              type="text"
              placeholder="請輸入"
              className="ml-2 px-2 py-1 border border-stone-300 rounded text-sm w-24"
              disabled
            />
          </label>
        </div>
      </div>

      {/* 品項表格 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-stone-300">
          <thead>
            <tr className="bg-stone-100">
              <th className="border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 w-24">
                品號
              </th>
              <th className="border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700">
                品名 <span className="text-red-500">*</span>
              </th>
              <th className="border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 w-32">
                規格
              </th>
              <th className="border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 w-24">
                採購單位
              </th>
              <th className="border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 w-32">
                廠商
              </th>
              <th className="border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-700 w-12">
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-stone-50">
                <td className="border border-stone-300 p-1">
                  <input
                    type="text"
                    value={item.product_code}
                    onChange={(e) => updateItem(index, 'product_code', e.target.value)}
                    placeholder="自動產生"
                    className="w-full px-2 py-1.5 border-0 text-sm focus:ring-1 focus:ring-red-500 rounded bg-stone-50"
                    disabled={formData.request_type === 'new'}
                  />
                </td>
                <td className="border border-stone-300 p-1">
                  <input
                    type="text"
                    value={item.product_name}
                    onChange={(e) => updateItem(index, 'product_name', e.target.value)}
                    placeholder="品名"
                    className="w-full px-2 py-1.5 border-0 text-sm focus:ring-1 focus:ring-red-500 rounded"
                  />
                </td>
                <td className="border border-stone-300 p-1">
                  <input
                    type="text"
                    value={item.specification}
                    onChange={(e) => updateItem(index, 'specification', e.target.value)}
                    placeholder="規格"
                    className="w-full px-2 py-1.5 border-0 text-sm focus:ring-1 focus:ring-red-500 rounded"
                  />
                </td>
                <td className="border border-stone-300 p-1">
                  <input
                    type="text"
                    value={item.unit}
                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                    placeholder="箱/包/盒"
                    className="w-full px-2 py-1.5 border-0 text-sm focus:ring-1 focus:ring-red-500 rounded"
                  />
                </td>
                <td className="border border-stone-300 p-1">
                  <input
                    type="text"
                    value={item.supplier_name}
                    onChange={(e) => updateItem(index, 'supplier_name', e.target.value)}
                    placeholder="廠商名稱"
                    className="w-full px-2 py-1.5 border-0 text-sm focus:ring-1 focus:ring-red-500 rounded"
                  />
                </td>
                <td className="border border-stone-300 p-1 text-center">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={addItem}
          className="mt-2 flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
        >
          <Plus size={16} />
          新增品項
        </button>
      </div>

      {/* 屬性設定 */}
      <div className="bg-stone-50 p-4 rounded-xl space-y-4">
        {items.filter((i) => i.product_name?.trim()).length > 0 && (
          <>
            <p className="text-xs text-stone-500 mb-2">
              以下屬性將套用到所有填寫的品項（可個別修改）
            </p>

            {/* 品號類別 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-stone-700 w-20">品號類別</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.is_food === true}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'is_food', true))}
                  className="w-4 h-4 text-red-600"
                />
                <span>食材類</span>
              </label>
              <select
                value={items[0]?.category_code || ''}
                onChange={(e) => items.forEach((_, i) => updateItem(i, 'category_code', e.target.value))}
                className="px-2 py-1 border border-stone-300 rounded text-sm"
                disabled={!items[0]?.is_food}
              >
                <option value="">選擇類別</option>
                {foodCategories.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 cursor-pointer ml-4">
                <input
                  type="radio"
                  checked={items[0]?.is_food === false}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'is_food', false))}
                  className="w-4 h-4 text-red-600"
                />
                <span>非食材類</span>
              </label>
              <select
                value={items[0]?.category_code || ''}
                onChange={(e) => items.forEach((_, i) => updateItem(i, 'category_code', e.target.value))}
                className="px-2 py-1 border border-stone-300 rounded text-sm"
                disabled={items[0]?.is_food !== false}
              >
                <option value="">選擇類別</option>
                {nonFoodCategories.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 庫存管理 & 配送方式 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-stone-700 w-20">庫存管理</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.inventory_managed === true}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'inventory_managed', true))}
                  className="w-4 h-4 text-red-600"
                />
                <span>是</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.inventory_managed === false}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'inventory_managed', false))}
                  className="w-4 h-4 text-red-600"
                />
                <span>否</span>
              </label>

              <span className="text-sm text-stone-500 mx-2">；</span>

              <span className="text-sm font-semibold text-stone-700">配送方式:</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.delivery_method === 'warehouse'}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'delivery_method', 'warehouse'))}
                  className="w-4 h-4 text-red-600"
                />
                <span>總倉</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.delivery_method === 'supplier'}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'delivery_method', 'supplier'))}
                  className="w-4 h-4 text-red-600"
                />
                <span>廠商</span>
              </label>
            </div>

            {/* 應稅與否 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-stone-700 w-20">應稅與否</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.tax_type === 'tax_excluded'}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'tax_type', 'tax_excluded'))}
                  className="w-4 h-4 text-red-600"
                />
                <span>應稅外加</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.tax_type === 'tax_included'}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'tax_type', 'tax_included'))}
                  className="w-4 h-4 text-red-600"
                />
                <span>應稅內含</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.tax_type === 'tax_free'}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'tax_type', 'tax_free'))}
                  className="w-4 h-4 text-red-600"
                />
                <span>免稅</span>
              </label>
            </div>

            {/* 保存方式 */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-stone-700 w-20">保存方式</span>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.storage_method === 'room_temp'}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'storage_method', 'room_temp'))}
                  className="w-4 h-4 text-red-600"
                />
                <span>常溫</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.storage_method === 'refrigerated'}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'storage_method', 'refrigerated'))}
                  className="w-4 h-4 text-red-600"
                />
                <span>冷藏</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={items[0]?.storage_method === 'frozen'}
                  onChange={() => items.forEach((_, i) => updateItem(i, 'storage_method', 'frozen'))}
                  className="w-4 h-4 text-red-600"
                />
                <span>冷凍</span>
              </label>
            </div>
          </>
        )}
      </div>

      {/* 備註 */}
      <div>
        <label className="block text-sm font-semibold text-stone-700 mb-2">備註</label>
        <textarea
          value={formData.remarks}
          onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
          placeholder="其他說明事項..."
        />
      </div>

      {/* 簽核流程說明 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
        <p className="font-semibold text-amber-800 mb-1">簽核流程</p>
        <p className="text-amber-700">
          申請人 → 採購單位 → 部門主管 → 審核 → 品號建立人 → 採購部留存
        </p>
        <p className="text-amber-600 mt-2 text-xs">
          ※ 送單後審核 2 日內完成建檔
          <br />
          ※ 採購單位為進貨單位，例如箱/包/冠/盒/公斤/台斤等，請填寫清楚
        </p>
      </div>

      {/* 操作按鈕 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-stone-300 text-stone-700 rounded-xl hover:bg-stone-50 transition flex items-center gap-2"
        >
          <X size={18} />
          取消
        </button>
        <button
          type="submit"
          disabled={processing}
          className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} />
          {processing ? '送出中...' : '送出申請'}
        </button>
      </div>
    </form>
  );
}
