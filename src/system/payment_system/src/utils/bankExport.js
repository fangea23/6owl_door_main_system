/**
 * 銀行匯款媒體檔匯出工具
 * 支援格式：台新銀行 (Tab分隔TXT, Big5)、國泰銀行 (固定長度TXT 361 bytes, ANSI)
 */

import iconv from '@vscode/iconv-lite-umd';

// ============================================
// Big5/ANSI 編碼轉換
// ============================================

/**
 * 將字串轉換為 Big5 編碼的 Uint8Array
 */
function stringToBig5(str) {
  return iconv.encode(str, 'big5');
}

// ============================================
// 公司付款資訊設定（匯出時由 Modal 傳入）
// ============================================
const DEFAULT_COMPANY_INFO = {
  // 台新銀行 - 付款方資訊
  payerBankCode: '812',        // 付款銀行代碼 (台新: 812)
  payerBranchCode: '1019',     // 付款分行代碼
  payerAccountNo: '',          // 付款帳號
  payerTaxId: '',              // 公司統編
  payerName: '',               // 公司戶名
  payerIdType: '58',           // 付款人代碼識別 (58=統一編號)
  payerContact: '',            // 付款聯絡人
  payerPhone: '',              // 付款聯絡電話
  payerFax: '',                // 付款傳真號碼
};

// ============================================
// 工具函數
// ============================================

/**
 * 計算字串的 byte 長度（中文字佔 2 bytes - Big5 編碼）
 */
function getByteLength(str) {
  let byteLen = 0;
  for (const char of String(str || '')) {
    byteLen += char.charCodeAt(0) > 127 ? 2 : 1;
  }
  return byteLen;
}

/**
 * 將字串靠左填充到指定 byte 長度（用空白補齊）
 */
function padRight(str, length, padChar = ' ') {
  const s = String(str || '');
  let byteLen = 0;
  let result = '';
  for (const char of s) {
    const charBytes = char.charCodeAt(0) > 127 ? 2 : 1;
    if (byteLen + charBytes > length) break;
    result += char;
    byteLen += charBytes;
  }
  const padCharBytes = padChar.charCodeAt(0) > 127 ? 2 : 1;
  while (byteLen + padCharBytes <= length) {
    result += padChar;
    byteLen += padCharBytes;
  }
  while (byteLen < length) {
    result += ' ';
    byteLen++;
  }
  return result;
}

/**
 * 將數字靠右填充到指定長度（用0補齊）
 */
function padLeft(str, length, padChar = '0') {
  const s = String(str || '');
  return s.padStart(length, padChar);
}

/**
 * 格式化金額（含2位小數，無小數點）
 * 例如：1234 -> 000000000000123400
 */
function formatAmountWithDecimals(amount, digits = 18) {
  const num = Math.round((Number(amount) || 0) * 100);
  return padLeft(num, digits, '0');
}

/**
 * 格式化金額（含角分，9(12)V99 格式，14位）
 */
function formatAmountWithCents(amount) {
  const num = Math.round((Number(amount) || 0) * 100);
  return padLeft(num, 14, '0');
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
// 台新銀行格式 (Tab 分隔 TXT, Big5 編碼, 25欄位)
// ============================================
// 欄位規格：
// 1.  用戶自定序號 (文字, 7) - 同一檔案內不得重覆
// 2.  付款日期 (日期, 8) - YYYYMMDD
// 3.  付款金額 (金額, 18) - 含小數2位，無小數點
// 4.  付款帳號 (文字, 17)
// 5.  付款戶名 (文字, 39)
// 6.  收款帳號 (文字, 17) - 必填
// 7.  收款戶名 (文字, 39)
// 8.  付款總行 (文字, 3)
// 9.  付款分行 (文字, 4)
// 10. 收款總行 (文字, 3) - 必填
// 11. 收款分行 (文字, 4) - 必填
// 12. 附言 (文字, 50) - 全形字
// 13. 收款人識別碼 (文字, 17) - 統編或身分證
// 14. 收款人代碼識別 (文字, 3) - 53護照/58統編/174身分證
// 15. 付款人識別碼 (文字, 17)
// 16. 付款人代碼識別 (文字, 3) - 53護照/58統編/174身分證
// 17. 手續費負擔別 (文字, 3) - 13內扣/15外加
// 18. 對帳單Key值 (文字, 30)
// 19. 付款聯絡人 (文字, 35)
// 20. 付款聯絡電話 (文字, 25)
// 21. 付款傳真號碼 (文字, 25)
// 22. 收款聯絡人 (文字, 35)
// 23. 收款聯絡電話 (文字, 25)
// 24. 收款傳真號碼 (文字, 25)
// 25. 收款通知email (文字, 50)
// ============================================

/**
 * 產生台新銀行格式的單筆資料 (25欄位)
 */
function generateTaishinRow(request, index, paymentDate, companyInfo = {}, options = {}) {
  const info = { ...DEFAULT_COMPANY_INFO, ...companyInfo };
  const { feeType = '15' } = options;
  const txDate = formatDate(paymentDate || request.payment_date || request.expected_payment_date);

  // 序號：7位數，從1開始
  const seqNo = padLeft(index + 1, 7, '0');

  // 判斷收款人代碼識別類型
  const receiverIdType = request.payee_tax_id ? '58' : ''; // 有統編就是58

  const fields = [
    seqNo,                                                          // 1.  用戶自定序號 (7)
    txDate,                                                         // 2.  付款日期 (8)
    formatAmountWithDecimals(request.amount || request.total_amount || 0, 18), // 3.  付款金額 (18)
    (info.payerAccountNo || '').slice(0, 17),                       // 4.  付款帳號 (17)
    (info.payerName || '').slice(0, 39),                            // 5.  付款戶名 (39)
    (request.account_number || '').slice(0, 17),                    // 6.  收款帳號 (17) *必填
    (request.payee_name || '').slice(0, 39),                        // 7.  收款戶名 (39)
    (info.payerBankCode || '').slice(0, 3),                         // 8.  付款總行 (3)
    (info.payerBranchCode || '').slice(0, 4),                       // 9.  付款分行 (4)
    (request.bank_code || '').slice(0, 3),                          // 10. 收款總行 (3) *必填
    (request.branch_code || '').slice(0, 4),                        // 11. 收款分行 (4) *必填
    (request.content || '').slice(0, 25),                           // 12. 附言 (50 bytes = 25個全形字)
    (request.payee_tax_id || '').slice(0, 17),                      // 13. 收款人識別碼 (17)
    receiverIdType,                                                 // 14. 收款人代碼識別 (3)
    (info.payerTaxId || '').slice(0, 17),                           // 15. 付款人識別碼 (17)
    info.payerIdType || '58',                                       // 16. 付款人代碼識別 (3)
    feeType,                                                        // 17. 手續費負擔別 (3)
    '',                                                             // 18. 對帳單Key值 (30)
    (info.payerContact || '').slice(0, 35),                         // 19. 付款聯絡人 (35)
    (info.payerPhone || '').slice(0, 25),                           // 20. 付款聯絡電話 (25)
    (info.payerFax || '').slice(0, 25),                             // 21. 付款傳真號碼 (25)
    '',                                                             // 22. 收款聯絡人 (35)
    '',                                                             // 23. 收款聯絡電話 (25)
    '',                                                             // 24. 收款傳真號碼 (25)
    '',                                                             // 25. 收款通知email (50)
  ];
  return fields.join('\t');
}

/**
 * 匯出台新銀行格式
 * @param {Array} requests - 付款申請陣列
 * @param {Object} options - 選項 { paymentDate, companyInfo, feeType }
 */
export function exportTaishin(requests, options = {}) {
  const { paymentDate, companyInfo, feeType } = options;
  const lines = [];

  requests.forEach((req, index) => {
    lines.push(generateTaishinRow(req, index, paymentDate, companyInfo, { feeType }));
  });

  return lines.join('\r\n');
}

// ============================================
// 國泰銀行格式 (固定長度 TXT, 361 bytes/行)
// ============================================
// 付款指示欄位規格 (共 361 bytes)：
// 1.  識別代碼      9(1)    1   M  0=付款指示
// 2.  檔案上傳日期  9(08)   8   O  YYYYMMDD
// 3.  預定交易日期  9(08)   8   M  YYYYMMDD
// 4.  交易類別      X(03)   3   M  TRN約定/SPU非約定
// 5.  交易編號      X(10)   10  O
// 6.  付款行代碼    9(7)    7   M  銀行代碼
// 7.  付款人帳號    9(16)   16  M
// 8.  付款人統編    X(10)   10  M
// 9.  付款人戶名    X(35)   70  M  全形
// 10. 幣別          X(03)   3   M  TWD
// 11. 金額正負號    X(01)   1   M  +
// 12. 金額          9(12)V99 14 M  含角分
// 13. 收款行代碼    9(7)    7   M
// 14. 收款人帳號    9(16)   16  M
// 15. 收款人統編    X(10)   10  O
// 16. 收款人戶名    X(35)   70  M  全形
// 17. 電告          9(1)    1   M  0不通知
// 18. 電告號碼      X(50)   50  O
// 19. 手續費        9(2)    2   M  15外加/13內扣
// 20. 發票筆數      9(4)    4   O
// 21. 備註          X(25)   50  O
// ============================================

/**
 * 產生國泰銀行格式的單筆資料 (361 bytes)
 */
function generateCathayRow(request, paymentDate, companyInfo = {}, options = {}) {
  const info = { ...DEFAULT_COMPANY_INFO, ...companyInfo };
  const txDate = formatDate(paymentDate || request.payment_date || request.expected_payment_date);
  const { transactionType = 'SPU', feeType = '15' } = options;

  const payerBankFullCode = (info.payerBankCode || '013') + (info.payerBranchCode || '0017');
  const receiverBankCode = (request.bank_code || '').slice(0, 3);
  const receiverBranchCode = (request.branch_code || '').slice(0, 4);
  const receiverBankFullCode = receiverBankCode + receiverBranchCode;

  const fields = [
    '0',                                              // 1.  識別代碼 (1)
    padRight('', 8),                                  // 2.  檔案上傳日期 (8)
    txDate,                                           // 3.  預定交易日期 (8)
    transactionType,                                  // 4.  交易類別 (3)
    padRight('', 10),                                 // 5.  交易編號 (10)
    padLeft(payerBankFullCode, 7, '0'),               // 6.  付款行代碼 (7)
    padRight(info.payerAccountNo, 16),                // 7.  付款人帳號 (16)
    padRight(info.payerTaxId, 10),                    // 8.  付款人統編 (10)
    padRight(info.payerName, 70, '　'),               // 9.  付款人戶名 (70) 全形空白
    'TWD',                                            // 10. 幣別 (3)
    '+',                                              // 11. 金額正負號 (1)
    formatAmountWithCents(request.amount || request.total_amount || 0), // 12. 金額 (14)
    padLeft(receiverBankFullCode, 7, '0'),            // 13. 收款行代碼 (7)
    padRight(request.account_number, 16),             // 14. 收款人帳號 (16)
    padRight(request.payee_tax_id || '', 10),         // 15. 收款人統編 (10)
    padRight(request.payee_name, 70, '　'),           // 16. 收款人戶名 (70) 全形空白
    '0',                                              // 17. 電告 (1)
    padRight('', 50),                                 // 18. 電告號碼 (50)
    feeType,                                          // 19. 手續費 (2)
    padLeft('0', 4, '0'),                             // 20. 發票筆數 (4)
    padRight(request.content || '', 50),              // 21. 備註 (50)
  ];

  return fields.join('');
}

/**
 * 匯出國泰銀行格式
 */
export function exportCathay(requests, options = {}) {
  const { paymentDate, companyInfo, transactionType, feeType } = options;
  const lines = [];

  for (const req of requests) {
    lines.push(generateCathayRow(req, paymentDate, companyInfo, { transactionType, feeType }));
  }

  return lines.join('\r\n');
}

// ============================================
// 通用匯出函數
// ============================================

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

// ============================================
// 檔案下載函數
// ============================================

/**
 * 下載 Big5 編碼檔案（台新銀行用）
 */
export function downloadFileAsBig5(content, filename) {
  const big5Buffer = stringToBig5(content);
  const blob = new Blob([big5Buffer], { type: 'application/octet-stream' });
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
 * 下載 UTF-8 檔案
 */
export function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
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
 * 下載 Big5/ANSI 編碼檔案（使用 iconv-lite 轉換）
 * 台新銀行和國泰銀行都使用這個函數
 */
export function downloadFileAsAnsi(content, filename) {
  // 使用 iconv-lite 轉換為 Big5 (相容 ANSI)
  const big5Buffer = stringToBig5(content);
  const blob = new Blob([big5Buffer], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return '檔案已下載 (Big5/ANSI 編碼)，可直接上傳至銀行系統。';
}

/**
 * 產生匯出檔名
 */
export function generateFilename(bankType, prefix = 'payment') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const bankName = bankType === 'taishin' ? '台新' : bankType === 'cathay' ? '國泰' : bankType;
  return `${prefix}_${bankName}_${date}_${time}.txt`;
}

// ============================================
// 選項常數
// ============================================

export const BANK_OPTIONS = [
  { value: 'taishin', label: '台新銀行', description: 'Tab 分隔 25欄位 (Big5)' },
  { value: 'cathay', label: '國泰銀行', description: '固定長度 361 bytes (ANSI)' },
];

export const TRANSACTION_TYPE_OPTIONS = [
  { value: 'SPU', label: '非約定戶' },
  { value: 'TRN', label: '約定戶' },
];

export const FEE_TYPE_OPTIONS = [
  { value: '15', label: '匯費外加' },
  { value: '13', label: '匯費內扣' },
];

// 付款人代碼識別選項
export const PAYER_ID_TYPE_OPTIONS = [
  { value: '58', label: '統一編號' },
  { value: '174', label: '身分證字號' },
  { value: '53', label: '護照號碼' },
];

export default {
  exportTaishin,
  exportCathay,
  exportBankFile,
  downloadFile,
  downloadFileAsBig5,
  downloadFileAsAnsi,
  generateFilename,
  BANK_OPTIONS,
  TRANSACTION_TYPE_OPTIONS,
  FEE_TYPE_OPTIONS,
  PAYER_ID_TYPE_OPTIONS,
};
