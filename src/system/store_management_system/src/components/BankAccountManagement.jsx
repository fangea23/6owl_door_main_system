import React, { useState, useEffect } from 'react';
import { useBankAccounts } from '../hooks/useBankAccounts';
import { Plus, Edit2, Trash2, CreditCard, Building, Star, StarOff, X, Save, Loader2, Copy, Check, ChevronDown, Search } from 'lucide-react';
import { supabase } from '../supabaseClient';

/**
 * 可搜尋的下拉選單元件（支援鍵盤導航與快速選擇）
 * - 輸入代碼或名稱進行搜尋
 * - 方向鍵上下選擇
 * - Enter 確認選擇
 * - Tab 選擇並跳到下一個欄位
 */
function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = '請選擇',
  disabled = false,
  loading = false,
  loadingText = '載入中...',
  className = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  // 篩選選項
  const filteredOptions = options.filter(option => {
    const searchLower = searchTerm.toLowerCase();
    const labelMatch = option.label?.toLowerCase().includes(searchLower);
    const subLabelMatch = option.subLabel?.toLowerCase().includes(searchLower);
    const valueMatch = String(option.value)?.toLowerCase().includes(searchLower);
    return labelMatch || subLabelMatch || valueMatch;
  });

  // 當搜尋詞改變時重置高亮索引
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // 取得顯示的標籤
  const getDisplayLabel = () => {
    if (value) {
      const selectedOption = options.find(opt => String(opt.value) === String(value));
      if (selectedOption) {
        return selectedOption.subLabel
          ? `${selectedOption.subLabel} ${selectedOption.label}`
          : selectedOption.label;
      }
    }
    return '';
  };

  // 點擊外部關閉
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 開啟時聚焦搜尋框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // 滾動到高亮項目
  useEffect(() => {
    if (isOpen && listRef.current && filteredOptions.length > 0) {
      const highlightedElement = listRef.current.children[highlightedIndex];
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen, filteredOptions.length]);

  // 處理選擇
  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  // 清除選擇
  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  // 處理鍵盤事件
  const handleKeyDown = (e) => {
    if (!isOpen) {
      // 下拉未開啟時，按下任何輸入鍵都開啟
      if (e.key.length === 1 || e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions.length > 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Tab':
        // Tab 時若有高亮選項則選擇它，然後讓焦點自然移到下一個欄位
        if (filteredOptions.length > 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex].value);
        } else {
          setIsOpen(false);
          setSearchTerm('');
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        break;
      default:
        break;
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 觸發按鈕 */}
      <button
        type="button"
        onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled || loading}
        className={`
          w-full rounded-lg border p-2.5 bg-white text-left flex items-center justify-between text-sm
          ${disabled || loading ? 'bg-stone-100 text-stone-400 cursor-not-allowed' : 'border-stone-300 hover:border-green-400 cursor-pointer'}
          ${isOpen ? 'ring-2 ring-green-500 border-green-500' : ''}
          focus:outline-none focus:ring-2 focus:ring-green-500
        `}
      >
        <span className={`truncate ${!getDisplayLabel() ? 'text-stone-400' : 'text-stone-900'}`}>
          {loading ? loadingText : (getDisplayLabel() || placeholder)}
        </span>
        <ChevronDown
          size={16}
          className={`text-stone-400 transition-transform flex-shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 清除按鈕 */}
      {value && !disabled && !loading && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-8 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-1"
        >
          <X size={14} />
        </button>
      )}

      {/* 下拉選單 */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg overflow-hidden">
          {/* 搜尋框 */}
          <div className="p-2 border-b border-stone-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="輸入代碼或名稱搜尋，Enter 選擇..."
                className="w-full pl-8 pr-3 py-1.5 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
            {/* 快捷鍵提示 */}
            {filteredOptions.length > 0 && searchTerm && (
              <div className="text-xs text-stone-400 mt-1.5 flex items-center gap-2">
                <span className="bg-stone-100 px-1.5 py-0.5 rounded">↑↓</span>
                <span>選擇</span>
                <span className="bg-stone-100 px-1.5 py-0.5 rounded">Enter</span>
                <span>確認</span>
                <span className="bg-stone-100 px-1.5 py-0.5 rounded">Tab</span>
                <span>選擇並跳下一欄</span>
              </div>
            )}
          </div>

          {/* 選項列表 */}
          <div ref={listRef} className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-stone-500 text-center">
                {searchTerm ? '找不到符合的項目' : '無可選項目'}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = String(option.value) === String(value);
                const isHighlighted = index === highlightedIndex;
                return (
                  <button
                    key={`${option.value}-${index}`}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      w-full px-3 py-2 text-left flex items-center justify-between text-sm
                      ${isHighlighted ? 'bg-green-100' : ''}
                      ${isSelected ? 'bg-green-50 text-green-700' : 'text-stone-700'}
                      ${!isHighlighted && !isSelected ? 'hover:bg-stone-50' : ''}
                      transition-colors
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {option.subLabel && (
                        <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                          isHighlighted ? 'bg-green-200 text-green-800' : 'bg-stone-100 text-stone-600'
                        }`}>
                          {option.subLabel}
                        </code>
                      )}
                      <span className={isSelected ? 'font-semibold' : ''}>
                        {option.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isHighlighted && searchTerm && (
                        <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                          Enter ↵
                        </span>
                      )}
                      {isSelected && <Check size={14} className="text-green-600 flex-shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 銀行帳戶管理組件
 * @param {number} storeCode - 門店代碼
 * @param {boolean} canEdit - 是否可編輯
 * @param {boolean} canDelete - 是否可刪除
 */
export default function BankAccountManagement({ storeCode, canEdit = false, canDelete = false }) {
  const { bankAccounts, loading, addBankAccount, updateBankAccount, deleteBankAccount, setDefaultAccount } = useBankAccounts(storeCode);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // 銀行列表 state（從 DB 載入）
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(true);

  // 載入銀行列表
  useEffect(() => {
    const fetchBanks = async () => {
      setLoadingBanks(true);
      try {
        const { data, error } = await supabase
          .from('banks')
          .select('bank_code, bank_name')
          .order('bank_code');

        if (error) throw error;
        setBanks(data || []);
      } catch (err) {
        console.error('載入銀行列表失敗:', err);
      } finally {
        setLoadingBanks(false);
      }
    };

    fetchBanks();
  }, []);

  // 取得銀行名稱
  const getBankName = (bankCode) => {
    const bank = banks.find(b => b.bank_code === bankCode);
    return bank ? bank.bank_name : `銀行(${bankCode})`;
  };

  // 格式化帳號顯示
  const formatAccountNumber = (accountNumber) => {
    if (!accountNumber) return '-';
    // 每4位加一個空格方便閱讀
    return accountNumber.replace(/(.{4})/g, '$1 ').trim();
  };

  // 處理新增
  const handleAdd = () => {
    setEditingAccount(null);
    setShowModal(true);
  };

  // 處理編輯
  const handleEdit = (account) => {
    setEditingAccount(account);
    setShowModal(true);
  };

  // 處理刪除
  const handleDelete = async (account) => {
    if (!confirm(`確定要刪除帳戶「${account.account_name}」嗎？`)) return;
    const result = await deleteBankAccount(account.id);
    if (!result.success) {
      alert(`刪除失敗：${result.error}`);
    }
  };

  // 處理設為預設
  const handleSetDefault = async (account) => {
    if (account.is_default) return; // 已經是預設了
    const result = await setDefaultAccount(account.id);
    if (!result.success) {
      alert(`設定失敗：${result.error}`);
    }
  };

  // 複製帳號
  const handleCopyAccount = async (account) => {
    const text = `${getBankName(account.bank_code)} ${account.branch_code || ''}\n帳號: ${account.account_number}\n戶名: ${account.account_name}${account.tax_id ? `\n統編: ${account.tax_id}` : ''}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(account.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('複製失敗:', err);
    }
  };

  if (loading || loadingBanks) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-amber-500 mr-2" size={20} />
        <span className="text-stone-400">載入銀行帳戶資料中...</span>
      </div>
    );
  }

  return (
    <div>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-stone-800 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-green-600" />
          銀行帳戶
        </h4>
        {canEdit && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            新增帳戶
          </button>
        )}
      </div>

      {/* 帳戶列表 */}
      {bankAccounts.length === 0 ? (
        <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-lg">
          <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>尚無銀行帳戶資料</p>
          {canEdit && (
            <button
              onClick={handleAdd}
              className="mt-3 text-green-600 hover:text-green-800 text-sm font-medium"
            >
              + 新增第一筆帳戶
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {bankAccounts.map((account) => (
            <div
              key={account.id}
              className={`border rounded-lg p-4 transition-all ${
                account.is_default
                  ? 'border-green-300 bg-green-50'
                  : 'border-stone-200 bg-white hover:border-stone-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* 銀行資訊 */}
                  <div className="flex items-center gap-2 mb-2">
                    <Building size={16} className="text-stone-400" />
                    <span className="font-semibold text-stone-800">
                      {getBankName(account.bank_code)}
                    </span>
                    <code className="bg-stone-100 px-2 py-0.5 rounded text-xs text-stone-600">
                      {account.bank_code}
                    </code>
                    {account.branch_code && (
                      <span className="text-sm text-stone-500">
                        分行: {account.branch_code}
                      </span>
                    )}
                    {account.is_default && (
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                        <Star size={12} className="fill-current" />
                        預設帳戶
                      </span>
                    )}
                  </div>

                  {/* 帳號與戶名 */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-stone-500">帳號：</span>
                      <code className="font-mono text-stone-800 bg-stone-100 px-2 py-0.5 rounded">
                        {formatAccountNumber(account.account_number)}
                      </code>
                    </div>
                    <div>
                      <span className="text-stone-500">戶名：</span>
                      <span className="font-medium text-stone-800">{account.account_name}</span>
                    </div>
                  </div>

                  {/* 統編與類型 */}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    {account.tax_id && (
                      <div>
                        <span className="text-stone-500">統編：</span>
                        <code className="font-mono text-stone-700">{account.tax_id}</code>
                      </div>
                    )}
                    {account.account_type && (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        account.account_type === 'main'
                          ? 'bg-blue-100 text-blue-700'
                          : account.account_type === 'petty_cash'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}>
                        {account.account_type === 'main' ? '主帳戶' :
                         account.account_type === 'petty_cash' ? '零用金' : '其他'}
                      </span>
                    )}
                  </div>

                  {/* 備註 */}
                  {account.note && (
                    <div className="text-xs text-stone-500 mt-2 italic">
                      {account.note}
                    </div>
                  )}
                </div>

                {/* 操作按鈕 */}
                <div className="flex items-center gap-1 ml-2">
                  {/* 複製按鈕 */}
                  <button
                    onClick={() => handleCopyAccount(account)}
                    className="p-1.5 text-stone-500 hover:bg-stone-100 rounded transition-colors"
                    title="複製帳戶資訊"
                  >
                    {copiedId === account.id ? (
                      <Check size={16} className="text-green-600" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>

                  {canEdit && !account.is_default && (
                    <button
                      onClick={() => handleSetDefault(account)}
                      className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="設為預設"
                    >
                      <StarOff size={16} />
                    </button>
                  )}

                  {canEdit && (
                    <button
                      onClick={() => handleEdit(account)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="編輯"
                    >
                      <Edit2 size={16} />
                    </button>
                  )}

                  {canDelete && (
                    <button
                      onClick={() => handleDelete(account)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="刪除"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 銀行帳戶編輯 Modal */}
      {showModal && (
        <BankAccountModal
          account={editingAccount}
          storeCode={storeCode}
          banks={banks}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            const result = editingAccount
              ? await updateBankAccount(editingAccount.id, data)
              : await addBankAccount(data);

            if (result.success) {
              setShowModal(false);
            } else {
              alert(`操作失敗：${result.error}`);
            }
          }}
        />
      )}
    </div>
  );
}

// 銀行帳戶編輯 Modal
function BankAccountModal({ account, storeCode, banks = [], onClose, onSave }) {
  const [formData, setFormData] = useState({
    bank_code: account?.bank_code || '',
    branch_code: account?.branch_code || '',
    account_number: account?.account_number || '',
    account_name: account?.account_name || '',
    tax_id: account?.tax_id || '',
    account_type: account?.account_type || 'main',
    is_default: account?.is_default || false,
    note: account?.note || ''
  });
  const [saving, setSaving] = useState(false);

  // 分行列表
  const [branches, setBranches] = useState([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // 當銀行改變時載入分行
  useEffect(() => {
    const fetchBranches = async () => {
      if (!formData.bank_code) {
        setBranches([]);
        return;
      }

      setLoadingBranches(true);
      try {
        const { data, error } = await supabase
          .from('bank_branches')
          .select('branch_code, branch_name')
          .eq('bank_code', formData.bank_code)
          .order('branch_code');

        if (error) throw error;
        setBranches(data || []);
      } catch (err) {
        console.error('載入分行列表失敗:', err);
        setBranches([]);
      } finally {
        setLoadingBranches(false);
      }
    };

    fetchBranches();
  }, [formData.bank_code]);

  // 銀行選項
  const bankOptions = banks.map(bank => ({
    value: bank.bank_code,
    label: bank.bank_name,
    subLabel: bank.bank_code
  }));

  // 分行選項
  const branchOptions = branches.map(branch => ({
    value: branch.branch_code,
    label: branch.branch_name,
    subLabel: branch.branch_code
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.bank_code.trim()) {
      alert('請選擇銀行');
      return;
    }
    if (!formData.account_number.trim()) {
      alert('請輸入帳號');
      return;
    }
    if (!formData.account_name.trim()) {
      alert('請輸入戶名');
      return;
    }

    setSaving(true);
    await onSave({
      ...formData,
      bank_code: formData.bank_code.trim(),
      branch_code: formData.branch_code.trim() || null,
      account_number: formData.account_number.replace(/\s/g, '').trim(),
      account_name: formData.account_name.trim(),
      tax_id: formData.tax_id.trim() || null,
      note: formData.note.trim() || null
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 p-4 border-b border-stone-200 bg-gradient-to-r from-green-600 to-green-700 flex items-center justify-between rounded-t-xl">
          <h3 className="text-lg font-bold text-white">
            {account ? '編輯銀行帳戶' : '新增銀行帳戶'}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 銀行資訊 */}
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Building size={16} />
              銀行資訊
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  銀行 <span className="text-red-500">*</span>
                </label>
                <SearchableSelect
                  options={bankOptions}
                  value={formData.bank_code}
                  onChange={(value) => setFormData({ ...formData, bank_code: value, branch_code: '' })}
                  placeholder="請搜尋或選擇銀行..."
                  loading={banks.length === 0}
                  loadingText="載入銀行中..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">分行</label>
                <SearchableSelect
                  options={branchOptions}
                  value={formData.branch_code}
                  onChange={(value) => setFormData({ ...formData, branch_code: value })}
                  placeholder={formData.bank_code ? '請搜尋或選擇分行...' : '請先選擇銀行'}
                  disabled={!formData.bank_code}
                  loading={loadingBranches}
                  loadingText="載入分行中..."
                />
                {formData.bank_code && branches.length === 0 && !loadingBranches && (
                  <p className="text-xs text-stone-500 mt-1">
                    此銀行無分行資料，您可以手動輸入分行代碼
                  </p>
                )}
                {/* 手動輸入分行代碼的備用輸入框 */}
                {formData.bank_code && branches.length === 0 && !loadingBranches && (
                  <input
                    type="text"
                    value={formData.branch_code}
                    onChange={(e) => setFormData({ ...formData, branch_code: e.target.value })}
                    className="w-full mt-2 px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-sm"
                    placeholder="手動輸入4碼分行代碼"
                    maxLength={4}
                  />
                )}
              </div>
            </div>
          </div>

          {/* 帳戶資訊 */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <CreditCard size={16} />
              帳戶資訊
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  帳號 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none font-mono"
                  placeholder="銀行帳號"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  戶名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="帳戶戶名"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">統一編號</label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="8碼統編"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">帳戶類型</label>
                  <select
                    value={formData.account_type}
                    onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value="main">主帳戶</option>
                    <option value="petty_cash">零用金</option>
                    <option value="other">其他</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* 其他設定 */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">備註</label>
              <textarea
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                rows={2}
                placeholder="備註說明（選填）"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                className="w-4 h-4 text-green-600 border-stone-300 rounded focus:ring-green-500"
              />
              <label htmlFor="is_default" className="text-sm font-medium text-stone-700">
                設為此門市的預設帳戶
              </label>
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
