/**
 * 匯出媒體檔 Modal (代墊款系統版)
 * 用於選擇銀行格式、設定匯出選項
 * 支援從門市銀行帳戶自動帶入付款方資訊
 */
import React, { useState, useEffect } from 'react';
import {
  X, Download, Building, Calendar, FileText, AlertCircle, Loader2, Store
} from 'lucide-react';
import {
  BANK_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  FEE_TYPE_OPTIONS,
  PAYER_ID_TYPE_OPTIONS,
  exportBankFile,
  downloadFile,
  downloadFileAsAnsi,
  generateFilename
} from '../utils/bankExport';
import { supabase } from '../supabaseClient';

export default function ExportModal({
  isOpen,
  onClose,
  requests = [],        // 要匯出的申請列表
  systemType = 'expense' // 'payment' | 'expense'
}) {
  const [bankType, setBankType] = useState('taishin');
  const [paymentDate, setPaymentDate] = useState('');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // 門市銀行帳戶相關 state
  const [stores, setStores] = useState([]);
  const [storeBankAccounts, setStoreBankAccounts] = useState([]);
  const [selectedStoreCode, setSelectedStoreCode] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [loadingStores, setLoadingStores] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // 共用的公司付款資訊
  const [companyInfo, setCompanyInfo] = useState({
    // 台新銀行欄位
    payerBankCode: '812',
    payerBranchCode: '1019',
    payerAccountNo: '',
    payerTaxId: '',
    payerName: '',
    payerIdType: '58',
    payerContact: '',
    payerPhone: '',
    payerFax: '',
  });

  // 國泰銀行選項
  const [transactionType, setTransactionType] = useState('SPU');
  const [feeType, setFeeType] = useState('15');

  // 載入門市列表
  useEffect(() => {
    const fetchStores = async () => {
      setLoadingStores(true);
      try {
        const { data, error } = await supabase
          .from('stores')
          .select('code, name')
          .eq('is_active', true)
          .order('code');

        if (error) throw error;
        setStores(data || []);
      } catch (err) {
        console.error('載入門市失敗:', err);
      } finally {
        setLoadingStores(false);
      }
    };

    if (isOpen) {
      fetchStores();
    }
  }, [isOpen]);

  // 當選擇門市時載入該門市的銀行帳戶
  useEffect(() => {
    const fetchBankAccounts = async () => {
      if (!selectedStoreCode) {
        setStoreBankAccounts([]);
        setSelectedAccountId('');
        return;
      }

      setLoadingAccounts(true);
      try {
        const { data, error } = await supabase
          .from('store_bank_accounts')
          .select('*')
          .eq('store_id', selectedStoreCode)
          .eq('is_active', true)
          .order('is_default', { ascending: false });

        if (error) throw error;
        setStoreBankAccounts(data || []);

        // 自動選擇預設帳戶
        const defaultAccount = data?.find(a => a.is_default);
        if (defaultAccount) {
          setSelectedAccountId(defaultAccount.id);
          applyBankAccountToForm(defaultAccount);
        } else if (data?.length > 0) {
          setSelectedAccountId(data[0].id);
          applyBankAccountToForm(data[0]);
        }
      } catch (err) {
        console.error('載入銀行帳戶失敗:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };

    fetchBankAccounts();
  }, [selectedStoreCode]);

  // 當選擇帳戶改變時套用到表單
  useEffect(() => {
    if (selectedAccountId && storeBankAccounts.length > 0) {
      const account = storeBankAccounts.find(a => a.id === selectedAccountId);
      if (account) {
        applyBankAccountToForm(account);
      }
    }
  }, [selectedAccountId]);

  // 將銀行帳戶資訊套用到表單
  const applyBankAccountToForm = (account) => {
    setCompanyInfo(prev => ({
      ...prev,
      payerBankCode: account.bank_code || prev.payerBankCode,
      payerBranchCode: account.branch_code || prev.payerBranchCode,
      payerAccountNo: account.account_number || '',
      payerTaxId: account.tax_id || '',
      payerName: account.account_name || '',
    }));
  };

  // 重置狀態
  useEffect(() => {
    if (isOpen) {
      setError('');
      // 預設付款日期為今天
      setPaymentDate(new Date().toISOString().slice(0, 10));
      // 重置門市選擇
      setSelectedStoreCode('');
      setSelectedAccountId('');
      setStoreBankAccounts([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 驗證資料 - 代墊款版本：收款人是員工
  const validateRequests = () => {
    const errors = [];
    for (const req of requests) {
      if (!req.account_number) {
        errors.push(`單號 #${req.id}: 缺少收款帳號`);
      }
      if (!req.bank_code) {
        errors.push(`單號 #${req.id}: 缺少銀行代碼`);
      }
    }
    return errors;
  };

  // 執行匯出
  const handleExport = async () => {
    setError('');
    setExporting(true);

    try {
      // 驗證資料
      const validationErrors = validateRequests();
      if (validationErrors.length > 0) {
        setError(`資料驗證失敗:\n${validationErrors.slice(0, 5).join('\n')}${validationErrors.length > 5 ? `\n...還有 ${validationErrors.length - 5} 個錯誤` : ''}`);
        setExporting(false);
        return;
      }

      // 台新銀行驗證
      if (bankType === 'taishin') {
        if (!companyInfo.payerAccountNo) {
          setError('台新銀行格式需要填寫付款帳號');
          setExporting(false);
          return;
        }
        if (!companyInfo.payerName) {
          setError('台新銀行格式需要填寫付款戶名');
          setExporting(false);
          return;
        }
      }

      // 國泰銀行驗證
      if (bankType === 'cathay') {
        if (!companyInfo.payerAccountNo) {
          setError('國泰銀行格式需要填寫付款帳號');
          setExporting(false);
          return;
        }
        if (!companyInfo.payerTaxId) {
          setError('國泰銀行格式需要填寫公司統編');
          setExporting(false);
          return;
        }
        if (!companyInfo.payerName) {
          setError('國泰銀行格式需要填寫公司戶名');
          setExporting(false);
          return;
        }
      }

      // 產生檔案內容
      const content = exportBankFile(bankType, requests, {
        paymentDate,
        companyInfo,
        transactionType,
        feeType,
      });

      // 下載檔案
      const filename = generateFilename(bankType, systemType);

      // 兩家銀行都需要 ANSI/Big5 編碼
      const hint = await downloadFileAsAnsi(content, filename);
      alert(hint);

      // 關閉 Modal
      onClose();
    } catch (err) {
      console.error('匯出失敗:', err);
      setError(`匯出失敗: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  // 計算總金額
  const totalAmount = requests.reduce((sum, req) => {
    return sum + Math.round(Number(req.total_amount || 0));
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* 標題 */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-gradient-to-r from-red-600 to-red-700 sticky top-0 z-10">
          <div className="flex items-center gap-3 text-white">
            <Download size={24} />
            <h2 className="text-lg font-bold">匯出銀行媒體檔</h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* 內容 */}
        <div className="p-5 space-y-5">
          {/* 匯出摘要 */}
          <div className="bg-stone-50 rounded-xl p-4 border border-stone-200">
            <div className="flex items-center gap-2 text-stone-600 mb-2">
              <FileText size={18} />
              <span className="font-medium">匯出摘要</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-stone-400">筆數</span>
                <div className="font-bold text-stone-800">{requests.length} 筆</div>
              </div>
              <div>
                <span className="text-stone-400">總金額</span>
                <div className="font-bold text-emerald-600">
                  ${totalAmount.toLocaleString('zh-TW')}
                </div>
              </div>
            </div>
          </div>

          {/* 銀行選擇 */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              <Building size={16} className="inline mr-1" />
              選擇銀行格式
            </label>
            <div className="grid grid-cols-2 gap-3">
              {BANK_OPTIONS.map((bank) => (
                <button
                  key={bank.value}
                  onClick={() => setBankType(bank.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    bankType === bank.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <div className="font-bold text-stone-800">{bank.label}</div>
                  <div className="text-xs text-stone-500">{bank.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 門市銀行帳戶快速選擇 */}
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
            <div className="text-sm font-bold text-emerald-800 mb-3 flex items-center gap-2">
              <Store size={16} />
              從門市帶入付款方資訊 (選填)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  選擇門市
                </label>
                <select
                  value={selectedStoreCode}
                  onChange={(e) => setSelectedStoreCode(e.target.value)}
                  disabled={loadingStores}
                  className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- 手動輸入 --</option>
                  {stores.map((store) => (
                    <option key={store.code} value={store.code}>
                      {store.code} - {store.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  選擇帳戶
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  disabled={!selectedStoreCode || loadingAccounts || storeBankAccounts.length === 0}
                  className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-stone-100"
                >
                  {!selectedStoreCode ? (
                    <option value="">請先選擇門市</option>
                  ) : loadingAccounts ? (
                    <option value="">載入中...</option>
                  ) : storeBankAccounts.length === 0 ? (
                    <option value="">此門市無銀行帳戶</option>
                  ) : (
                    storeBankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.bank_code} - {account.account_name}
                        {account.is_default ? ' ⭐' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            {selectedStoreCode && storeBankAccounts.length === 0 && !loadingAccounts && (
              <p className="text-xs text-amber-600 mt-2">
                💡 此門市尚未設定銀行帳戶，請至「門店管理」新增或手動輸入下方欄位。
              </p>
            )}
          </div>

          {/* 付款日期 */}
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              付款日期
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
            />
          </div>

          {/* 台新銀行欄位 */}
          {bankType === 'taishin' && (
            <div className="space-y-4 bg-blue-50 p-4 rounded-xl border border-blue-200">
              <div className="text-sm font-bold text-blue-800">
                <AlertCircle size={16} className="inline mr-1" />
                台新銀行付款方資訊
              </div>

              {/* 付款銀行 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    付款總行 *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.payerBankCode}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, payerBankCode: e.target.value })}
                    placeholder="3碼，如 812"
                    maxLength={3}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    付款分行 *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.payerBranchCode}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, payerBranchCode: e.target.value })}
                    placeholder="4碼，如 1019"
                    maxLength={4}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* 付款帳號 & 戶名 */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  付款帳號 *
                </label>
                <input
                  type="text"
                  value={companyInfo.payerAccountNo}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, payerAccountNo: e.target.value })}
                  placeholder="公司帳號"
                  maxLength={17}
                  className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  付款戶名 *
                </label>
                <input
                  type="text"
                  value={companyInfo.payerName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, payerName: e.target.value })}
                  placeholder="公司全名"
                  className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* 統編 & 識別碼類型 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    付款人識別碼 (統編)
                  </label>
                  <input
                    type="text"
                    value={companyInfo.payerTaxId}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, payerTaxId: e.target.value })}
                    placeholder="8位統編"
                    maxLength={17}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    識別碼類型
                  </label>
                  <select
                    value={companyInfo.payerIdType}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, payerIdType: e.target.value })}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {PAYER_ID_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 手續費 */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  手續費負擔
                </label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value)}
                  className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {FEE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 聯絡資訊 (選填) */}
              <details className="text-sm">
                <summary className="cursor-pointer text-stone-500 hover:text-stone-700">
                  聯絡資訊 (選填)
                </summary>
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-stone-600 mb-1">付款聯絡人</label>
                    <input
                      type="text"
                      value={companyInfo.payerContact}
                      onChange={(e) => setCompanyInfo({ ...companyInfo, payerContact: e.target.value })}
                      className="w-full p-2 text-sm border border-stone-300 rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">聯絡電話</label>
                      <input
                        type="text"
                        value={companyInfo.payerPhone}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, payerPhone: e.target.value })}
                        className="w-full p-2 text-sm border border-stone-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-stone-600 mb-1">傳真號碼</label>
                      <input
                        type="text"
                        value={companyInfo.payerFax}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, payerFax: e.target.value })}
                        className="w-full p-2 text-sm border border-stone-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </details>
            </div>
          )}

          {/* 國泰銀行欄位 */}
          {bankType === 'cathay' && (
            <div className="space-y-4 bg-amber-50 p-4 rounded-xl border border-amber-200">
              <div className="text-sm font-bold text-amber-800">
                <AlertCircle size={16} className="inline mr-1" />
                國泰銀行付款方資訊
              </div>

              {/* 付款銀行 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    付款銀行代碼 *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.payerBankCode}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, payerBankCode: e.target.value })}
                    placeholder="3碼，如 013"
                    maxLength={3}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    付款分行代碼 *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.payerBranchCode}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, payerBranchCode: e.target.value })}
                    placeholder="4碼，如 0017"
                    maxLength={4}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              {/* 付款帳號 */}
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  付款帳號 *
                </label>
                <input
                  type="text"
                  value={companyInfo.payerAccountNo}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, payerAccountNo: e.target.value })}
                  placeholder="公司扣款帳號"
                  className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>

              {/* 公司統編 & 戶名 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    公司統編 *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.payerTaxId}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, payerTaxId: e.target.value })}
                    placeholder="8 位統編"
                    maxLength={10}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    公司戶名 *
                  </label>
                  <input
                    type="text"
                    value={companyInfo.payerName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, payerName: e.target.value })}
                    placeholder="公司全名"
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>
              </div>

              {/* 交易類別 & 手續費 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    交易類別
                  </label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    {TRANSACTION_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    手續費負擔
                  </label>
                  <select
                    value={feeType}
                    onChange={(e) => setFeeType(e.target.value)}
                    className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    {FEE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 編碼提醒 */}
          <div className="bg-green-50 p-3 rounded-lg border border-green-200 text-sm text-green-800">
            <AlertCircle size={14} className="inline mr-1" />
            檔案將自動轉換為 <strong>Big5/ANSI</strong> 編碼，可直接上傳至銀行系統。
          </div>

          {/* 錯誤訊息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm whitespace-pre-line">
              <AlertCircle size={16} className="inline mr-1" />
              {error}
            </div>
          )}
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3 p-5 border-t border-stone-200 bg-stone-50 sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-white border border-stone-300 text-stone-700 rounded-xl font-bold hover:bg-stone-100 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || requests.length === 0}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-bold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                匯出中...
              </>
            ) : (
              <>
                <Download size={18} />
                匯出 {requests.length} 筆
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
