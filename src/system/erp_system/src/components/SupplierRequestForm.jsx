import { useState, useEffect } from 'react';
import {
  Building2, User, MapPin, Phone, Mail, FileText,
  CreditCard, Banknote, Save, X, Loader2, AlertCircle
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import SearchableSelect from './SearchableSelect';

// 常數定義
const INVOICE_TYPES = [
  { value: 'with_goods', label: '貨附發票' },
  { value: 'monthly', label: '月底彙開發票（結帳日25日）' }
];

const INVOICE_FORMATS = [
  { value: 'electronic', label: '1. 電子發票' },
  { value: 'triplicate', label: '2. 三聯式' },
  { value: 'duplicate_pos', label: '3. 二聯式收銀機' },
  { value: 'triplicate_pos', label: '4. 三聯式收銀機' },
  { value: 'exempt', label: '5. 免用統一發票' }
];

const TAX_TYPES = [
  { value: 'tax_included', label: '1. 應稅內含' },
  { value: 'tax_excluded', label: '2. 應稅外加' },
  { value: 'zero_rate', label: '3. 零稅率' },
  { value: 'tax_exempt', label: '4. 免稅' }
];

const PAYMENT_DAYS = [
  { value: 'cod_5days', label: '貨到後5天工作日' },
  { value: 'monthly_30', label: '月結30天(上月26-本月25)' },
  { value: 'monthly_45', label: '月結45天' },
  { value: 'monthly_60', label: '月結60天' },
  { value: 'other', label: '其他' }
];

const PAYMENT_METHODS = [
  { value: 'wire', label: '電匯(優先)' },
  { value: 'other', label: '其他' }
];

const BILLING_METHODS = [
  { value: 'mail', label: '郵寄' },
  { value: 'fax', label: '傳真' },
  { value: 'email', label: 'E-mail' }
];

const SUPPLIER_CATEGORIES = [
  { value: 'raw_material', label: '1. 原料' },
  { value: 'supplies', label: '2. 物料' },
  { value: 'packaging', label: '3. 包材' },
  { value: 'equipment', label: '4. 設備及維修' },
  { value: 'expense', label: '5. 費用' },
  { value: 'other', label: '6. 其它' }
];

const ENTITY_TYPES = [
  { value: 'natural_person', label: '1. 自然人' },
  { value: 'legal_entity', label: '2. 法人' }
];

const EINVOICE_FORMATS = [
  { value: 'B2C', label: '1. B2C' },
  { value: 'B2B', label: '2. B2B-存證' }
];

export default function SupplierRequestForm({ onSubmit, onCancel, initialData = null }) {
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState([]);
  const [banks, setBanks] = useState([]);
  const [branches, setBranches] = useState([]);

  // 表單狀態
  const [formData, setFormData] = useState({
    request_type: 'new',
    brand_codes: [],
    company_name: '',
    tax_id: '',
    capital: '',
    responsible_person: '',
    main_business: '',
    registered_address: '',
    contact_address_same: true,
    contact_address: '',
    contact_sales_name: '',
    contact_sales_email: '',
    contact_sales_mobile: '',
    contact_accounting_name: '',
    contact_accounting_email: '',
    contact_accounting_phone: '',
    contact_accounting_fax: '',
    invoice_type: 'with_goods',
    invoice_format: '',
    tax_type: 'tax_included',
    payment_days: 'cod_5days',
    payment_days_other: '',
    payment_method: 'wire',
    payment_method_other: '',
    billing_method: ['email'],
    bank_code: '',
    bank_name: '',
    branch_code: '',
    branch_name: '',
    account_name: '',
    account_number: '',
    related_company_payment: false,
    related_company_name: '',
    supplier_category: '',
    ...initialData
  });

  const [errors, setErrors] = useState({});

  // 載入品牌列表
  useEffect(() => {
    const fetchBrands = async () => {
      const { data } = await supabase
        .from('brands')
        .select('id, code, name')
        .order('code');
      setBrands(data || []);
    };
    fetchBrands();
  }, []);

  // 載入銀行列表
  useEffect(() => {
    const fetchBanks = async () => {
      const { data } = await supabase
        .from('banks')
        .select('bank_code, bank_name')
        .order('bank_code');
      setBanks(data || []);
    };
    fetchBanks();
  }, []);

  // 當銀行代碼改變時載入分行
  useEffect(() => {
    const fetchBranches = async () => {
      if (!formData.bank_code) {
        setBranches([]);
        return;
      }
      const { data } = await supabase
        .from('bank_branches')
        .select('branch_code, branch_name')
        .eq('bank_code', formData.bank_code)
        .order('branch_code');
      setBranches(data || []);
    };
    fetchBranches();
  }, [formData.bank_code]);

  // 更新表單欄位
  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // 如果勾選聯絡地址同登記地址，自動複製
      if (field === 'contact_address_same' && value) {
        newData.contact_address = prev.registered_address;
      }
      if (field === 'registered_address' && prev.contact_address_same) {
        newData.contact_address = value;
      }

      // 選擇銀行時自動填入銀行名稱
      if (field === 'bank_code') {
        const bank = banks.find(b => b.bank_code === value);
        newData.bank_name = bank?.bank_name || '';
        newData.branch_code = '';
        newData.branch_name = '';
      }

      // 選擇分行時自動填入分行名稱
      if (field === 'branch_code') {
        const branch = branches.find(b => b.branch_code === value);
        newData.branch_name = branch?.branch_name || '';
      }

      return newData;
    });

    // 清除該欄位的錯誤
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 處理品牌多選
  const handleBrandToggle = (brandCode) => {
    setFormData(prev => {
      const newCodes = prev.brand_codes.includes(brandCode)
        ? prev.brand_codes.filter(c => c !== brandCode)
        : [...prev.brand_codes, brandCode];
      return { ...prev, brand_codes: newCodes };
    });
  };

  // 處理請款方式多選
  const handleBillingMethodToggle = (method) => {
    setFormData(prev => {
      const newMethods = prev.billing_method.includes(method)
        ? prev.billing_method.filter(m => m !== method)
        : [...prev.billing_method, method];
      return { ...prev, billing_method: newMethods };
    });
  };

  // 驗證表單
  const validateForm = () => {
    const newErrors = {};

    if (!formData.company_name?.trim()) {
      newErrors.company_name = '請填寫公司名稱';
    }
    if (formData.brand_codes.length === 0) {
      newErrors.brand_codes = '請至少選擇一個品牌';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表單
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const result = await onSubmit(formData);
      if (!result.success) {
        alert('提交失敗: ' + result.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 申請類型 */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="request_type"
              value="new"
              checked={formData.request_type === 'new'}
              onChange={(e) => handleChange('request_type', e.target.value)}
              className="w-4 h-4 text-orange-600"
            />
            <span className="font-medium">新增供應商</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="request_type"
              value="change"
              checked={formData.request_type === 'change'}
              onChange={(e) => handleChange('request_type', e.target.value)}
              className="w-4 h-4 text-orange-600"
            />
            <span className="font-medium">變更資訊</span>
          </label>
        </div>
      </div>

      {/* 品牌選擇 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2">
          <Building2 size={16} />
          適用品牌 <span className="text-red-500">*</span>
        </h3>
        <div className="flex flex-wrap gap-2">
          {brands.map(brand => (
            <label
              key={brand.code}
              className={`px-4 py-2 rounded-lg border cursor-pointer transition ${
                formData.brand_codes.includes(brand.code)
                  ? 'bg-orange-100 border-orange-400 text-orange-700'
                  : 'bg-white border-stone-200 hover:border-orange-300'
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={formData.brand_codes.includes(brand.code)}
                onChange={() => handleBrandToggle(brand.code)}
              />
              {brand.name}
            </label>
          ))}
        </div>
        {errors.brand_codes && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle size={14} /> {errors.brand_codes}
          </p>
        )}
      </div>

      {/* 基本資訊 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Building2 size={16} />
          供應商基本資訊
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              公司名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.company_name}
              onChange={(e) => handleChange('company_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 outline-none ${
                errors.company_name ? 'border-red-300' : 'border-stone-300'
              }`}
              placeholder="請輸入公司全名"
            />
            {errors.company_name && (
              <p className="text-sm text-red-500 mt-1">{errors.company_name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              統一編號（個人填身分證字號）
            </label>
            <input
              type="text"
              value={formData.tax_id}
              onChange={(e) => handleChange('tax_id', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="請輸入統編或身分證字號"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">資本額</label>
            <input
              type="number"
              value={formData.capital}
              onChange={(e) => handleChange('capital', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="資本額"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">負責人</label>
            <input
              type="text"
              value={formData.responsible_person}
              onChange={(e) => handleChange('responsible_person', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="負責人姓名"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-stone-600 mb-1">主要營業項目</label>
            <textarea
              value={formData.main_business}
              onChange={(e) => handleChange('main_business', e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="主要營業項目說明（客戶為個人，請親簽在旁欄位）"
            />
          </div>
        </div>
      </div>

      {/* 地址 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2 border-b border-stone-200 pb-2">
          <MapPin size={16} />
          地址
        </h3>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-1">登記地址</label>
          <input
            type="text"
            value={formData.registered_address}
            onChange={(e) => handleChange('registered_address', e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
            placeholder="登記地址"
          />
        </div>

        <div className="flex items-center gap-4 mb-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.contact_address_same}
              onChange={(e) => handleChange('contact_address_same', e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <span className="text-sm text-stone-600">聯絡地址同登記地址</span>
          </label>
        </div>

        {!formData.contact_address_same && (
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">聯絡地址</label>
            <input
              type="text"
              value={formData.contact_address}
              onChange={(e) => handleChange('contact_address', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="聯絡地址"
            />
          </div>
        )}
      </div>

      {/* 聯絡人資訊 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2 border-b border-stone-200 pb-2">
          <User size={16} />
          聯絡人資訊
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 業務聯絡人 */}
          <div className="space-y-3 p-4 bg-stone-50 rounded-lg">
            <h4 className="font-medium text-stone-700">聯絡人（業務）</h4>
            <div>
              <label className="block text-sm text-stone-600 mb-1">姓名</label>
              <input
                type="text"
                value={formData.contact_sales_name}
                onChange={(e) => handleChange('contact_sales_name', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-1">E-mail</label>
              <input
                type="email"
                value={formData.contact_sales_email}
                onChange={(e) => handleChange('contact_sales_email', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-1">手機電話</label>
              <input
                type="tel"
                value={formData.contact_sales_mobile}
                onChange={(e) => handleChange('contact_sales_mobile', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* 會計聯絡人 */}
          <div className="space-y-3 p-4 bg-stone-50 rounded-lg">
            <h4 className="font-medium text-stone-700">聯絡人（會計）</h4>
            <div>
              <label className="block text-sm text-stone-600 mb-1">姓名</label>
              <input
                type="text"
                value={formData.contact_accounting_name}
                onChange={(e) => handleChange('contact_accounting_name', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-600 mb-1">E-mail</label>
              <input
                type="email"
                value={formData.contact_accounting_email}
                onChange={(e) => handleChange('contact_accounting_email', e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm text-stone-600 mb-1">公司電話/分機</label>
                <input
                  type="tel"
                  value={formData.contact_accounting_phone}
                  onChange={(e) => handleChange('contact_accounting_phone', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-stone-600 mb-1">公司傳真</label>
                <input
                  type="tel"
                  value={formData.contact_accounting_fax}
                  onChange={(e) => handleChange('contact_accounting_fax', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 發票與稅務設定 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2 border-b border-stone-200 pb-2">
          <FileText size={16} />
          發票與稅務設定
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">開立發票方式</label>
            <div className="flex flex-wrap gap-3">
              {INVOICE_TYPES.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="invoice_type"
                    value={opt.value}
                    checked={formData.invoice_type === opt.value}
                    onChange={(e) => handleChange('invoice_type', e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">發票聯式</label>
            <div className="flex flex-wrap gap-3">
              {INVOICE_FORMATS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="invoice_format"
                    value={opt.value}
                    checked={formData.invoice_format === opt.value}
                    onChange={(e) => handleChange('invoice_format', e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">課稅別</label>
            <div className="flex flex-wrap gap-3">
              {TAX_TYPES.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tax_type"
                    value={opt.value}
                    checked={formData.tax_type === opt.value}
                    onChange={(e) => handleChange('tax_type', e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 付款條件 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2 border-b border-stone-200 pb-2">
          <CreditCard size={16} />
          付款條件
        </h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">款項天數</label>
            <div className="flex flex-wrap gap-3">
              {PAYMENT_DAYS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_days"
                    value={opt.value}
                    checked={formData.payment_days === opt.value}
                    onChange={(e) => handleChange('payment_days', e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            {formData.payment_days === 'other' && (
              <input
                type="text"
                value={formData.payment_days_other}
                onChange={(e) => handleChange('payment_days_other', e.target.value)}
                className="mt-2 w-full max-w-xs px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="請說明其他款項天數"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">收款方式</label>
            <div className="flex flex-wrap gap-3">
              {PAYMENT_METHODS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method"
                    value={opt.value}
                    checked={formData.payment_method === opt.value}
                    onChange={(e) => handleChange('payment_method', e.target.value)}
                    className="w-4 h-4 text-orange-600"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            {formData.payment_method === 'other' && (
              <input
                type="text"
                value={formData.payment_method_other}
                onChange={(e) => handleChange('payment_method_other', e.target.value)}
                className="mt-2 w-full max-w-xs px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="請說明其他收款方式"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-2">請款方式（可複選）</label>
            <div className="flex flex-wrap gap-3">
              {BILLING_METHODS.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.billing_method.includes(opt.value)}
                    onChange={() => handleBillingMethodToggle(opt.value)}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-stone-500 mt-2">
              請於每月31日前寄到集團總部財務部（FM@6owldoor.com / fm@joudafu.com）
            </p>
          </div>
        </div>
      </div>

      {/* 銀行資訊 */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2 border-b border-stone-200 pb-2">
          <Banknote size={16} />
          銀行匯款資訊
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">銀行代號</label>
            <SearchableSelect
              options={banks.map(bank => ({
                value: bank.bank_code,
                label: bank.bank_name,
                subLabel: bank.bank_code
              }))}
              value={formData.bank_code}
              onChange={(value) => handleChange('bank_code', value)}
              placeholder="請選擇銀行（可輸入代碼或名稱搜尋）"
              emptyText="無可選銀行"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">分行代號</label>
            <SearchableSelect
              options={branches.map(branch => ({
                value: branch.branch_code,
                label: branch.branch_name,
                subLabel: branch.branch_code
              }))}
              value={formData.branch_code}
              onChange={(value) => handleChange('branch_code', value)}
              placeholder="請選擇分行（可輸入代碼或名稱搜尋）"
              emptyText={formData.bank_code ? "無可選分行" : "請先選擇銀行"}
              disabled={!formData.bank_code}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">帳戶名稱（需同供應商名稱）</label>
            <input
              type="text"
              value={formData.account_name}
              onChange={(e) => handleChange('account_name', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="帳戶名稱"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">銀行帳號</label>
            <input
              type="text"
              value={formData.account_number}
              onChange={(e) => handleChange('account_number', e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="銀行帳號"
            />
          </div>
        </div>

        {/* 關聯企業代付 */}
        <div className="p-4 bg-stone-50 rounded-lg">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.related_company_payment}
              onChange={(e) => handleChange('related_company_payment', e.target.checked)}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <span className="text-sm text-stone-600">本公司與 ___ 為相關企業，統一由此相關企業代為付款</span>
          </label>
          {formData.related_company_payment && (
            <input
              type="text"
              value={formData.related_company_name}
              onChange={(e) => handleChange('related_company_name', e.target.value)}
              className="mt-2 w-full max-w-md px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
              placeholder="請輸入關聯企業名稱"
            />
          )}
        </div>
      </div>

      {/* 內部管理欄位（申請人填寫） */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-stone-700 flex items-center gap-2 border-b border-stone-200 pb-2">
          <FileText size={16} />
          廠商分類（申請人填寫）
        </h3>

        <div>
          <label className="block text-sm font-medium text-stone-600 mb-2">廠商分類</label>
          <div className="flex flex-wrap gap-3">
            {SUPPLIER_CATEGORIES.map(opt => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="supplier_category"
                  value={opt.value}
                  checked={formData.supplier_category === opt.value}
                  onChange={(e) => handleChange('supplier_category', e.target.value)}
                  className="w-4 h-4 text-orange-600"
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* 附件說明 */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm font-medium text-amber-800 mb-2">※ 必要附件：</p>
        <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
          <li>銀行存摺封面影本</li>
          <li>產品報價單（含產品品項/出貨單位/未稅價/含稅價）</li>
        </ul>
        <p className="text-xs text-amber-600 mt-2">
          寄件資訊：30091新竹市香山區牛埔南路203-10號 03-5308181 財務部 大福組 收
        </p>
      </div>

      {/* 按鈕 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
        <button
          type="button"
          onClick={onCancel}
          className="px-6 py-2.5 border border-stone-300 text-stone-600 rounded-xl hover:bg-stone-50 transition flex items-center gap-2"
        >
          <X size={18} />
          取消
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl hover:from-orange-700 hover:to-amber-700 transition flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {loading ? '提交中...' : '提交申請'}
        </button>
      </div>
    </form>
  );
}
