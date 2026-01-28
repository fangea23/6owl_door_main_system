/**
 * 銀行匯款媒體檔匯出工具 (代墊款系統版)
 * 支援格式：台新銀行 (Tab分隔TXT, Big5, 25欄位)、國泰銀行 (固定長度TXT 361 bytes, ANSI)
 *
 * 注意：代墊款的收款資訊來自員工的銀行帳戶設定
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
 * @param {string} str - 原始字串
 * @param {number} length - 目標 byte 長度
 * @param {string} padChar - 填充字元（預設半形空白）
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
  // 用填充字元補齊剩餘長度
  const padCharBytes = padChar.charCodeAt(0) > 127 ? 2 : 1;
  while (byteLen + padCharBytes <= length) {
    result += padChar;
    byteLen += padCharBytes;
  }
  // 如果還有剩餘且 padChar 是全形，用半形空白補
  while (byteLen < length) {
    result += ' ';
    byteLen++;
  }
  return result;
}

/**
 * 將數字靠右填充到指定長度（用指定字元補齊，預設為0）
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
 * 格式化金額（含角分，9(12)V99 格式）
 * @param {number} amount - 金額
 */
function formatAmountWithCents(amount) {
  // 金額 * 100 後補零到 14 位
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
 * 代墊款特別處理：收款人是申請人（員工）
 */
function generateTaishinRow(request, index, paymentDate, companyInfo = {}, options = {}) {
  const info = { ...DEFAULT_COMPANY_INFO, ...companyInfo };
  const { feeType = '15' } = options;
  const txDate = formatDate(paymentDate);

  // 序號：7位數，從1開始
  const seqNo = padLeft(index + 1, 7, '0');

  // 收款人戶名（使用申請人姓名）
  const receiverName = request.applicant_name || request.payee_name || '';

  // 員工通常沒有統編，代碼識別留空
  const receiverIdType = '';

  const fields = [
    seqNo,                                                          // 1.  用戶自定序號 (7)
    txDate,                                                         // 2.  付款日期 (8)
    formatAmountWithDecimals(request.total_amount || 0, 18),        // 3.  付款金額 (18)
    (info.payerAccountNo || '').slice(0, 17),                       // 4.  付款帳號 (17)
    (info.payerName || '').slice(0, 39),                            // 5.  付款戶名 (39)
    (request.account_number || '').slice(0, 17),                    // 6.  收款帳號 (17) *必填
    receiverName.slice(0, 39),                                      // 7.  收款戶名 (39)
    (info.payerBankCode || '').slice(0, 3),                         // 8.  付款總行 (3)
    (info.payerBranchCode || '').slice(0, 4),                       // 9.  付款分行 (4)
    (request.bank_code || '').slice(0, 3),                          // 10. 收款總行 (3) *必填
    (request.branch_code || '').slice(0, 4),                        // 11. 收款分行 (4) *必填
    '員工代墊款',                                                    // 12. 附言 (50 bytes = 25個全形字)
    '',                                                             // 13. 收款人識別碼 (17) - 員工沒有
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
 * 匯出台新銀行格式（不含標題列）
 * @param {Array} requests - 代墊款申請陣列
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
// 1.  識別代碼      9(1)    1   M  0=付款指示(備註不寫入中心)
// 2.  檔案上傳日期  9(08)   8   O  YYYYMMDD，無日期時左靠右補空白
// 3.  預定交易日期  9(08)   8   M  YYYYMMDD
// 4.  交易類別      X(03)   3   M  "TRN"約定戶,"SPU"非約定戶
// 5.  交易編號      X(10)   10  O  左靠右補空白
// 6.  付款行代碼    9(7)    7   M  銀行代碼 ex: 0130017
// 7.  付款人帳號    9(16)   16  M  左靠右補空白
// 8.  付款人統編    X(10)   10  M  左靠右補空白
// 9.  付款人戶名    X(35)   70  M  全形，左靠右補全形空白
// 10. 幣別          X(03)   3   M  TWD
// 11. 金額正負號    X(01)   1   M  +
// 12. 金額          9(12)V99 14 M  含角分，右靠左補零
// 13. 收款行代碼    9(7)    7   M  銀行代碼 ex: 0130017
// 14. 收款人帳號    9(16)   16  M  左靠右補空白
// 15. 收款人統編    X(10)   10  O  左靠右補空白
// 16. 收款人戶名    X(35)   70  M  全形，左靠右補全形空白
// 17. 收款人是否電告 9(1)   1   M  0=不通知
// 18. 電告設備號碼  X(50)   50  O  左靠右補空白
// 19. 手續費分攤    9(2)    2   M  15=外加, 13=內扣
// 20. 發票筆數      9(4)    4   O  右靠左補零
// 21. 備註          X(25)   50  O  全半形皆可，左靠右補空白
// ============================================

/**
 * 產生國泰銀行格式的單筆資料 (361 bytes)
 */
function generateCathayRow(request, paymentDate, companyInfo = {}, options = {}) {
  const info = { ...DEFAULT_COMPANY_INFO, ...companyInfo };
  const txDate = formatDate(paymentDate);
  const { transactionType = 'SPU', feeType = '15' } = options;

  // 組合付款行代碼 (7碼: 銀行碼3碼 + 分行碼4碼)
  const payerBankFullCode = (info.payerBankCode || '013') + (info.payerBranchCode || '0017');

  // 組合收款行代碼 (7碼: 銀行碼3碼 + 分行碼4碼)
  const receiverBankCode = (request.bank_code || '').slice(0, 3);
  const receiverBranchCode = (request.branch_code || '').slice(0, 4);
  const receiverBankFullCode = receiverBankCode + receiverBranchCode;

  // 收款人戶名（使用申請人姓名）
  const receiverName = request.applicant_name || request.payee_name || '';

  // 各欄位組合 (總長度 361 bytes)
  const fields = [
    '0',                                              // 1.  識別代碼 (1)
    padRight('', 8),                                  // 2.  檔案上傳日期 (8) - 選填，留空
    txDate,                                           // 3.  預定交易日期 (8)
    transactionType,                                  // 4.  交易類別 (3) - SPU 非約定戶
    padRight('', 10),                                 // 5.  交易編號 (10) - 選填
    padLeft(payerBankFullCode, 7, '0'),               // 6.  付款行代碼 (7)
    padRight(info.payerAccountNo, 16),                // 7.  付款人帳號 (16)
    padRight(info.payerTaxId, 10),                    // 8.  付款人統編 (10)
    padRight(info.payerName, 70, '　'),               // 9.  付款人戶名 (70) - 全形空白補齊
    'TWD',                                            // 10. 幣別 (3)
    '+',                                              // 11. 金額正負號 (1)
    formatAmountWithCents(request.total_amount || 0), // 12. 金額 (14) 含角分
    padLeft(receiverBankFullCode, 7, '0'),            // 13. 收款行代碼 (7)
    padRight(request.account_number, 16),             // 14. 收款人帳號 (16)
    padRight('', 10),                                 // 15. 收款人統編 (10) - 員工通常沒有
    padRight(receiverName, 70, '　'),                 // 16. 收款人戶名 (70) - 全形空白補齊
    '0',                                              // 17. 收款人是否電告 (1) - 0=不通知
    padRight('', 50),                                 // 18. 電告設備號碼 (50)
    feeType,                                          // 19. 手續費分攤 (2) - 15=外加
    padLeft('0', 4, '0'),                             // 20. 發票筆數 (4)
    padRight('員工代墊款', 50),                        // 21. 備註 (50)
  ];

  return fields.join('');
}

/**
 * 匯出國泰銀行格式
 * @param {Array} requests - 代墊款申請陣列
 * @param {Object} options - 選項 { paymentDate, companyInfo, transactionType, feeType }
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

/**
 * 匯出銀行媒體檔
 * @param {string} bankType - 銀行類型: 'taishin' | 'cathay'
 * @param {Array} requests - 代墊款申請陣列
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
 * @param {string} bankType - 銀行類型
 * @param {string} prefix - 檔名前綴 (如 'expense')
 */
export function generateFilename(bankType, prefix = 'expense') {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const time = new Date().toTimeString().slice(0, 5).replace(':', '');
  const bankName = bankType === 'taishin' ? '台新' : bankType === 'cathay' ? '國泰' : bankType;
  return `${prefix}_${bankName}_${date}_${time}.txt`;
}

// ============================================
// 銀行選項
// ============================================

export const BANK_OPTIONS = [
  { value: 'taishin', label: '台新銀行', description: 'Tab 分隔 25欄位 (Big5)' },
  { value: 'cathay', label: '國泰銀行', description: '固定長度 361 bytes (ANSI)' },
];

// 交易類別選項（國泰銀行）
export const TRANSACTION_TYPE_OPTIONS = [
  { value: 'SPU', label: '非約定戶' },
  { value: 'TRN', label: '約定戶' },
];

// 手續費負擔選項（國泰/台新銀行）
export const FEE_TYPE_OPTIONS = [
  { value: '15', label: '匯費外加' },
  { value: '13', label: '匯費內扣' },
];

// 付款人代碼識別選項（台新銀行）
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
