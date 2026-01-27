/**
 * 銀行匯款媒體檔匯出工具
 * 支援格式：台新銀行 (Tab分隔TXT)、國泰銀行 (固定長度TXT)
 */

// ============================================
// 公司付款資訊設定（請根據實際情況修改）
// ============================================
const COMPANY_INFO = {
  // 付款銀行資訊
  payerBankCode: '013',      // 付款銀行代碼 (國泰: 013)
  payerBranchCode: '0000',   // 付款分行代碼
  payerAccountNo: '',        // 付款帳號（需從設定取得或由用戶輸入）
  payerTaxId: '',            // 公司統編
  payerName: '六扇門餐飲事業有限公司', // 公司戶名
};

// ============================================
// 工具函數
// ============================================

/**
 * 將字串靠左填充到指定長度（用空白補齊）
 */
function padRight(str, length) {
  const s = String(str || '');
  // 計算實際 byte 長度（中文字佔 2 bytes）
  let byteLen = 0;
  let result = '';
  for (const char of s) {
    const charBytes = char.charCodeAt(0) > 127 ? 2 : 1;
    if (byteLen + charBytes > length) break;
    result += char;
    byteLen += charBytes;
  }
  // 用空白補齊剩餘長度
  while (byteLen < length) {
    result += ' ';
    byteLen++;
  }
  return result;
}

/**
 * 將數字靠右填充到指定長度（用零補齊）
 */
function padLeft(str, length, padChar = '0') {
  const s = String(str || '');
  return s.padStart(length, padChar);
}

/**
 * 格式化金額為指定格式
 * @param {number} amount - 金額
 * @param {number} intDigits - 整數位數
 * @param {number} decDigits - 小數位數
 */
function formatAmount(amount, intDigits = 12, decDigits = 2) {
  const num = Math.round(Number(amount) * Math.pow(10, decDigits));
  return padLeft(num, intDigits + decDigits, '0');
}

/**
 * 格式化日期為 YYYYMMDD
 */
function formatDate(dateStr) {
  if (!dateStr) {
    const today = new Date();
    return today.toISOString().slice(0, 10).replace(/-/g, '');
  }
  return String(dateStr).replace(/-/g, '').slice(0, 8);
}

// ============================================
// 台新銀行格式 (Tab 分隔 TXT)
// ============================================

/**
 * 產生台新銀行格式的單筆資料
 * 欄位順序：付款日期、收款銀行碼、收款分行碼、收款帳號、收款人戶名、交易金額
 */
function generateTaishinRow(request, paymentDate) {
  const fields = [
    formatDate(paymentDate || request.payment_date),  // 1. 付款日期 YYYYMMDD
    (request.bank_code || '').slice(0, 3),            // 2. 收款銀行碼 (3碼)
    (request.branch_code || '').slice(0, 4),          // 3. 收款分行碼 (4碼)
    request.account_number || '',                      // 4. 收款帳號
    request.payee_name || '',                          // 5. 收款人戶名
    Math.round(Number(request.amount || request.total_amount || 0)), // 6. 交易金額
  ];
  return fields.join('\t');
}

/**
 * 產生台新銀行格式的標題列
 */
function getTaishinHeader() {
  return ['付款日期', '收款銀行碼', '收款分行碼', '收款帳號', '收款人戶名', '交易金額'].join('\t');
}

/**
 * 匯出台新銀行格式
 * @param {Array} requests - 付款申請陣列
 * @param {Object} options - 選項 { includeHeader, paymentDate }
 */
export function exportTaishin(requests, options = {}) {
  const { includeHeader = true, paymentDate } = options;
  const lines = [];

  if (includeHeader) {
    lines.push(getTaishinHeader());
  }

  for (const req of requests) {
    lines.push(generateTaishinRow(req, paymentDate));
  }

  return lines.join('\r\n');
}

// ============================================
// 國泰銀行格式 (固定長度 TXT, 351 bytes/行)
// ============================================

/**
 * 產生國泰銀行格式的單筆資料 (351 bytes)
 */
function generateCathayRow(request, paymentDate, companyInfo = {}) {
  const info = { ...COMPANY_INFO, ...companyInfo };

  // 各欄位定義 (總長度 351 bytes)
  const fields = [
    '0',                                                    // 1. 標記 (1)
    padRight('', 8),                                        // 2. 空白保留區 (8)
    formatDate(paymentDate || request.payment_date),        // 3. 匯款日期 (8) YYYYMMDD
    'SPU',                                                  // 4. 交易代碼 (3)
    padRight('', 10),                                       // 5. 空白保留區 (10)
    padRight(info.payerBankCode + info.payerBranchCode, 7), // 6. 付款行代碼 (7)
    padRight(info.payerAccountNo, 16),                      // 7. 付款人帳號 (16)
    padRight(info.payerTaxId, 10),                          // 8. 付款人統編 (10)
    padRight(info.payerName, 70),                           // 9. 付款人戶名 (70)
    'TWD',                                                  // 10. 幣別 (3)
    '+',                                                    // 11. 符號 (1)
    formatAmount(request.amount || request.total_amount || 0, 12, 2), // 12. 匯款金額 (14)
    padRight((request.bank_code || '') + (request.branch_code || ''), 7), // 13. 收款行代碼 (7)
    padRight(request.account_number, 16),                   // 14. 收款帳號 (16)
    padRight('', 10),                                       // 15. 收款人統編 (10) - 通常留空
    padRight(request.payee_name, 70),                       // 16. 收款人戶名 (70)
    '0',                                                    // 17. 通知方式 (1) 0:不通知
    padRight('', 50),                                       // 18. 通知號碼 (50)
    '15',                                                   // 19. 手續費負擔 (2) 15:外加
    '0000',                                                 // 20. 保留欄位 (4)
    padRight(request.content || '', 50),                    // 21. 附言/備註 (50)
  ];

  return fields.join('');
}

/**
 * 匯出國泰銀行格式
 * @param {Array} requests - 付款申請陣列
 * @param {Object} options - 選項 { paymentDate, companyInfo }
 */
export function exportCathay(requests, options = {}) {
  const { paymentDate, companyInfo } = options;
  const lines = [];

  for (const req of requests) {
    lines.push(generateCathayRow(req, paymentDate, companyInfo));
  }

  return lines.join('\r\n');
}

// ============================================
// 通用匯出函數
// ============================================

/**
 * 匯出銀行媒體檔
 * @param {string} bankType - 銀行類型: 'taishin' | 'cathay'
 * @param {Array} requests - 付款申請陣列
 * @param {Object} options - 匯出選項
 */
export function exportBankFile(bankType, requests, options = {}) {
  switch (bankType) {
    case 'taishin':
      return exportTaishin(requests, options);
    case 'cathay':
      return exportCathay(requests, options);
    default:
      throw new Error(`不支援的銀行類型: ${bankType}`);
  }
}

/**
 * 下載匯出檔案
 * @param {string} content - 檔案內容
 * @param {string} filename - 檔案名稱
 */
export function downloadFile(content, filename) {
  // 使用 BOM 確保中文正確顯示
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 產生匯出檔名
 * @param {string} bankType - 銀行類型
 * @param {string} prefix - 檔名前綴 (如 'payment', 'expense')
 */
export function generateFilename(bankType, prefix = 'payment') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const bankName = bankType === 'taishin' ? '台新' : bankType === 'cathay' ? '國泰' : bankType;
  return `${prefix}_${bankName}_${date}_${time}.txt`;
}

// ============================================
// 銀行選項
// ============================================

export const BANK_OPTIONS = [
  { value: 'taishin', label: '台新銀行', description: 'Tab 分隔格式' },
  { value: 'cathay', label: '國泰銀行', description: '固定長度格式 (351 bytes)' },
];

export default {
  exportTaishin,
  exportCathay,
  exportBankFile,
  downloadFile,
  generateFilename,
  BANK_OPTIONS,
};
