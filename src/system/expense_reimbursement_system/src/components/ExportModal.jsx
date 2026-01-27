/**
 * 匯出媒體檔 Modal (代墊款系統版)
 * 用於選擇銀行格式、設定匯出選項
 */
import React, { useState, useEffect } from 'react';
import {
  X, Download, Building, Calendar, FileText, AlertCircle, CheckCircle, Loader2
} from 'lucide-react';
import { BANK_OPTIONS, exportBankFile, downloadFile, generateFilename } from '../utils/bankExport';

export default function ExportModal({
  isOpen,
  onClose,
  requests = [],        // 要匯出的申請列表
  systemType = 'expense' // 'payment' | 'expense'
}) {
  const [bankType, setBankType] = useState('taishin');
  const [paymentDate, setPaymentDate] = useState('');
  const [includeHeader, setIncludeHeader] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  // 國泰銀行需要的公司資訊
  const [companyInfo, setCompanyInfo] = useState({
    payerAccountNo: '',
    payerTaxId: '',
    payerName: '六扇門餐飲事業有限公司',
  });

  // 重置狀態
  useEffect(() => {
    if (isOpen) {
      setError('');
      // 預設付款日期為今天
      setPaymentDate(new Date().toISOString().slice(0, 10));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 驗證資料
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

      // 國泰銀行需要驗證公司資訊
      if (bankType === 'cathay') {
        if (!companyInfo.payerAccountNo) {
          setError('國泰銀行格式需要填寫付款帳號');
          setExporting(false);
          return;
        }
      }

      // 產生檔案內容
      const content = exportBankFile(bankType, requests, {
        paymentDate,
        includeHeader,
        companyInfo,
      });

      // 下載檔案
      const filename = generateFilename(bankType, systemType);
      downloadFile(content, filename);

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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* 標題 */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 bg-gradient-to-r from-red-600 to-red-700">
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

          {/* 台新銀行選項 */}
          {bankType === 'taishin' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="includeHeader"
                checked={includeHeader}
                onChange={(e) => setIncludeHeader(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
              />
              <label htmlFor="includeHeader" className="text-sm text-stone-600">
                包含標題列
              </label>
            </div>
          )}

          {/* 國泰銀行需要額外資訊 */}
          {bankType === 'cathay' && (
            <div className="space-y-3 bg-amber-50 p-4 rounded-xl border border-amber-200">
              <div className="text-sm font-bold text-amber-800 mb-2">
                <AlertCircle size={16} className="inline mr-1" />
                國泰銀行需要以下資訊
              </div>
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
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  公司統編
                </label>
                <input
                  type="text"
                  value={companyInfo.payerTaxId}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, payerTaxId: e.target.value })}
                  placeholder="8 位統編"
                  className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-600 mb-1">
                  公司戶名
                </label>
                <input
                  type="text"
                  value={companyInfo.payerName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, payerName: e.target.value })}
                  className="w-full p-2 text-sm border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* 錯誤訊息 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm whitespace-pre-line">
              <AlertCircle size={16} className="inline mr-1" />
              {error}
            </div>
          )}
        </div>

        {/* 按鈕 */}
        <div className="flex gap-3 p-5 border-t border-stone-200 bg-stone-50">
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
