import React, { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Modal from '../../../components/ui/Modal';
import { supabase } from '../../../lib/supabase';
import {
  Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertCircle,
  Loader2, X, ChevronLeft, ChevronRight, Eye, EyeOff, Key, Users
} from 'lucide-react';

// 取得環境變數
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

// Excel 欄位對應
const COLUMN_MAPPING = {
  '員工編號': 'employee_id',
  '登入帳號': 'login_id',
  '姓名': 'name',
  '組織類型': 'org_type',
  '部門代碼': 'department_code',
  '門市代碼': 'store_code',
  '職位代碼': 'position_code',
  '僱用類型': 'employment_type',
  'Email': 'email',
  '電話': 'phone',
  '手機': 'mobile',
  '狀態': 'status',
  '到職日': 'hire_date',
  '直屬主管編號': 'manager_employee_id',
  '銀行代碼': 'bank_code',
  '分行代碼': 'branch_code',
  '銀行帳號': 'bank_account',
};

// 值對應（中文 -> 系統值）
const VALUE_MAPPINGS = {
  org_type: {
    '總部': 'headquarters',
    'headquarters': 'headquarters',
    '門市': 'store',
    'store': 'store',
  },
  employment_type: {
    '正職': 'fulltime',
    'fulltime': 'fulltime',
    '計時': 'parttime',
    'parttime': 'parttime',
    '約聘': 'contract',
    'contract': 'contract',
    '實習': 'intern',
    'intern': 'intern',
  },
  status: {
    '在職': 'active',
    'active': 'active',
    '請假中': 'on_leave',
    'on_leave': 'on_leave',
    '已離職': 'resigned',
    'resigned': 'resigned',
    '已終止': 'terminated',
    'terminated': 'terminated',
  }
};

// 範本資料
const TEMPLATE_HEADERS = [
  '員工編號', '登入帳號', '姓名', '組織類型', '部門代碼', '門市代碼',
  '職位代碼', '僱用類型', 'Email', '電話', '手機', '狀態', '到職日',
  '直屬主管編號', '銀行代碼', '分行代碼', '銀行帳號'
];

const TEMPLATE_EXAMPLE = [
  'A001', 'A001', '王小明', '總部', 'FIN', '', 'accountant', '正職',
  'ming@example.com', '02-1234-5678', '0912-345-678', '在職', '2024-01-15',
  '', '812', '0154', '12345678901234'
];

export default function EmployeeBatchImportModal({ isOpen, onClose, onSuccess, departments, stores, employees }) {
  // 步驟：1=上傳, 2=預覽驗證, 3=處理中, 4=結果
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [createAccounts, setCreateAccounts] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [importResults, setImportResults] = useState({ success: [], failed: [], warnings: [] });

  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  // 重置狀態
  const resetState = () => {
    setStep(1);
    setFile(null);
    setParsedData([]);
    setValidationResults([]);
    setCreateAccounts(false);
    setDefaultPassword('');
    setShowPassword(false);
    setProcessing(false);
    setProgress({ current: 0, total: 0 });
    setImportResults({ success: [], failed: [], warnings: [] });
  };

  // 關閉 Modal
  const handleClose = () => {
    resetState();
    onClose();
  };

  // 下載範本
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 主資料表
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_HEADERS,
      TEMPLATE_EXAMPLE,
    ]);

    // 設定欄寬
    ws['!cols'] = TEMPLATE_HEADERS.map(() => ({ wch: 15 }));

    XLSX.utils.book_append_sheet(wb, ws, '員工資料');

    // 參考資料表 - 部門
    if (departments?.length > 0) {
      const deptData = [['部門代碼', '部門名稱']];
      departments.forEach(d => deptData.push([d.code || d.id, d.name]));
      const deptWs = XLSX.utils.aoa_to_sheet(deptData);
      XLSX.utils.book_append_sheet(wb, deptWs, '部門清單');
    }

    // 參考資料表 - 門市
    if (stores?.length > 0) {
      const storeData = [['門市代碼', '門市名稱', '品牌']];
      stores.filter(s => s.is_active).forEach(s => {
        storeData.push([s.code, s.name, s.brand?.name || '']);
      });
      const storeWs = XLSX.utils.aoa_to_sheet(storeData);
      XLSX.utils.book_append_sheet(wb, storeWs, '門市清單');
    }

    // 參考資料表 - 說明
    const helpData = [
      ['欄位', '說明', '必填', '範例值'],
      ['員工編號', '唯一識別碼，行政用途', '是', 'A001'],
      ['登入帳號', '系統登入用，預設=員工編號', '否', 'A001'],
      ['姓名', '員工姓名', '是', '王小明'],
      ['組織類型', '總部 或 門市', '否', '總部'],
      ['部門代碼', '總部員工需填寫', '條件', 'FIN'],
      ['門市代碼', '門市員工需填寫', '條件', '01001'],
      ['職位代碼', '職位代碼', '否', 'accountant'],
      ['僱用類型', '正職/計時/約聘/實習', '否', '正職'],
      ['Email', '聯絡用 Email', '否', 'test@example.com'],
      ['電話', '公司電話', '否', '02-1234-5678'],
      ['手機', '手機號碼', '否', '0912-345-678'],
      ['狀態', '在職/請假中/已離職/已終止', '否', '在職'],
      ['到職日', '格式 YYYY-MM-DD', '否', '2024-01-15'],
      ['直屬主管編號', '主管的員工編號', '否', 'M001'],
      ['銀行代碼', '3位數銀行代碼', '否', '812'],
      ['分行代碼', '4位數分行代碼', '否', '0154'],
      ['銀行帳號', '銀行帳戶號碼', '否', '12345678901234'],
    ];
    const helpWs = XLSX.utils.aoa_to_sheet(helpData);
    helpWs['!cols'] = [{ wch: 15 }, { wch: 30 }, { wch: 8 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, helpWs, '欄位說明');

    XLSX.writeFile(wb, '員工匯入範本.xlsx');
  };

  // 解析 Excel/CSV
  const parseFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });

          // 讀取第一個工作表
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          // 轉換為 JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { raw: false });

          // 欄位對應
          const mappedData = jsonData.map((row, index) => {
            const mapped = { _rowIndex: index + 2 }; // Excel 行號（從 2 開始，1 是標題）

            Object.entries(row).forEach(([key, value]) => {
              const trimmedKey = key.trim();
              const fieldName = COLUMN_MAPPING[trimmedKey] || trimmedKey;
              mapped[fieldName] = value?.toString().trim() || '';
            });

            return mapped;
          });

          resolve(mappedData);
        } catch (error) {
          reject(new Error('檔案解析失敗：' + error.message));
        }
      };

      reader.onerror = () => reject(new Error('檔案讀取失敗'));
      reader.readAsArrayBuffer(file);
    });
  };

  // 驗證資料
  const validateData = async (data) => {
    const results = [];
    const employeeIds = new Set();
    const loginIds = new Set();

    // 取得現有的 employee_id 和 login_id
    const existingEmployeeIds = new Set(employees.map(e => e.employee_id?.toLowerCase()));
    const existingLoginIds = new Set(employees.map(e => e.login_id?.toLowerCase()).filter(Boolean));

    // 建立部門代碼對照
    const deptCodeMap = {};
    departments.forEach(d => {
      if (d.code) deptCodeMap[d.code.toLowerCase()] = d.id;
      deptCodeMap[d.id] = d.id;
    });

    // 建立門市代碼對照
    const storeCodeMap = {};
    stores.forEach(s => {
      if (s.code) storeCodeMap[s.code.toString()] = s.id;
      storeCodeMap[s.id.toString()] = s.id;
    });

    // 建立員工編號對照（用於主管查詢）
    const employeeIdMap = {};
    employees.forEach(e => {
      if (e.employee_id) employeeIdMap[e.employee_id.toLowerCase()] = e.id;
    });

    for (const row of data) {
      const errors = [];
      const warnings = [];

      // 轉換值
      const orgType = VALUE_MAPPINGS.org_type[row.org_type] || row.org_type || 'headquarters';
      const employmentType = VALUE_MAPPINGS.employment_type[row.employment_type] || row.employment_type || 'fulltime';
      const status = VALUE_MAPPINGS.status[row.status] || row.status || 'active';

      // 必填驗證
      if (!row.employee_id) {
        errors.push('員工編號為必填');
      }
      if (!row.name) {
        errors.push('姓名為必填');
      }

      // 檔案內重複檢查
      if (row.employee_id) {
        const empIdLower = row.employee_id.toLowerCase();
        if (employeeIds.has(empIdLower)) {
          errors.push('員工編號在檔案中重複');
        } else {
          employeeIds.add(empIdLower);
        }

        // 資料庫重複檢查
        if (existingEmployeeIds.has(empIdLower)) {
          errors.push('員工編號已存在於系統中');
        }
      }

      // 登入帳號重複檢查
      const loginId = row.login_id || row.employee_id;
      if (loginId) {
        const loginIdLower = loginId.toLowerCase();
        if (loginIds.has(loginIdLower)) {
          errors.push('登入帳號在檔案中重複');
        } else {
          loginIds.add(loginIdLower);
        }

        if (existingLoginIds.has(loginIdLower)) {
          errors.push('登入帳號已存在於系統中');
        }
      }

      // 條件驗證：總部需要部門，門市需要門市代碼
      let departmentId = null;
      let storeId = null;

      if (orgType === 'headquarters') {
        if (row.department_code) {
          departmentId = deptCodeMap[row.department_code.toLowerCase()];
          if (!departmentId) {
            warnings.push(`找不到部門代碼: ${row.department_code}`);
          }
        }
      } else if (orgType === 'store') {
        if (row.store_code) {
          storeId = storeCodeMap[row.store_code.toString()];
          if (!storeId) {
            warnings.push(`找不到門市代碼: ${row.store_code}`);
          }
        }
      }

      // Email 格式驗證
      if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
        warnings.push('Email 格式不正確');
      }

      // 日期格式驗證
      let hireDate = null;
      if (row.hire_date) {
        const dateMatch = row.hire_date.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
        if (dateMatch) {
          hireDate = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
        } else {
          warnings.push('到職日格式應為 YYYY-MM-DD');
        }
      }

      // 主管查詢
      let managerId = null;
      if (row.manager_employee_id) {
        managerId = employeeIdMap[row.manager_employee_id.toLowerCase()];
        if (!managerId) {
          warnings.push(`找不到主管: ${row.manager_employee_id}`);
        }
      }

      results.push({
        ...row,
        _rowIndex: row._rowIndex,
        _errors: errors,
        _warnings: warnings,
        _isValid: errors.length === 0,
        // 轉換後的值
        _converted: {
          org_type: orgType,
          employment_type_new: employmentType,
          status: status,
          department_id: departmentId,
          store_id: storeId,
          hire_date: hireDate,
          manager_id: managerId,
          login_id: loginId,
        }
      });
    }

    return results;
  };

  // 處理檔案上傳
  const handleFileChange = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 驗證檔案類型
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const isValidType = validTypes.includes(selectedFile.type) ||
      selectedFile.name.endsWith('.xlsx') ||
      selectedFile.name.endsWith('.xls') ||
      selectedFile.name.endsWith('.csv');

    if (!isValidType) {
      alert('請上傳 Excel (.xlsx, .xls) 或 CSV 檔案');
      return;
    }

    setFile(selectedFile);
    setProcessing(true);

    try {
      const data = await parseFile(selectedFile);

      if (data.length === 0) {
        alert('檔案中沒有資料');
        setFile(null);
        setProcessing(false);
        return;
      }

      setParsedData(data);

      // 驗證資料
      const results = await validateData(data);
      setValidationResults(results);

      setStep(2);
    } catch (error) {
      alert('檔案處理失敗：' + error.message);
      setFile(null);
    } finally {
      setProcessing(false);
    }
  };

  // 拖放處理
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.add('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-blue-500', 'bg-blue-50');
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZoneRef.current?.classList.remove('border-blue-500', 'bg-blue-50');

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // 模擬 file input change 事件
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(droppedFile);
      if (fileInputRef.current) {
        fileInputRef.current.files = dataTransfer.files;
        handleFileChange({ target: { files: dataTransfer.files } });
      }
    }
  }, []);

  // 執行匯入
  const handleImport = async () => {
    const validRows = validationResults.filter(r => r._isValid);

    if (validRows.length === 0) {
      alert('沒有可匯入的資料');
      return;
    }

    if (createAccounts && (!defaultPassword || defaultPassword.length < 6)) {
      alert('請設定至少 6 位數的預設密碼');
      return;
    }

    setStep(3);
    setProcessing(true);
    setProgress({ current: 0, total: validRows.length });

    const results = { success: [], failed: [], warnings: [] };

    // 取得 session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('請先登入');
      setStep(2);
      setProcessing(false);
      return;
    }

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      setProgress({ current: i + 1, total: validRows.length });

      try {
        // 根據門市找到 store_code
        let storeCode = null;
        if (row._converted.store_id) {
          const store = stores.find(s => s.id === row._converted.store_id);
          storeCode = store?.code || null;
        }

        // 建立員工資料
        const employeeData = {
          employee_id: row.employee_id,
          login_id: row._converted.login_id,
          name: row.name,
          org_type: row._converted.org_type,
          department_id: row._converted.department_id || null,
          store_id: row._converted.store_id || null,
          store_code: storeCode,
          position_code: row.position_code || null,
          employment_type_new: row._converted.employment_type_new,
          status: row._converted.status,
          email: row.email || null,
          phone: row.phone || null,
          mobile: row.mobile || null,
          hire_date: row._converted.hire_date || null,
          manager_id: row._converted.manager_id || null,
          bank_code: row.bank_code || null,
          branch_code: row.branch_code || null,
          bank_account: row.bank_account || null,
        };

        // 插入員工表
        const { data: empData, error: empError } = await supabase
          .from('employees')
          .insert(employeeData)
          .select()
          .single();

        if (empError) throw empError;

        let accountCreated = false;
        let accountError = null;

        // 建立帳號
        if (createAccounts) {
          try {
            const response = await fetch(`${SUPABASE_URL}/functions/v1/create-employee-account`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`,
                'apikey': SUPABASE_KEY,
              },
              body: JSON.stringify({
                employee_id: row._converted.login_id,
                password: defaultPassword,
                full_name: row.name,
                role: 'user',
              }),
            });

            const result = await response.json();

            if (!response.ok) {
              accountError = result.error || '帳號建立失敗';
            } else {
              accountCreated = true;
            }
          } catch (err) {
            accountError = err.message;
          }
        }

        if (accountError) {
          results.warnings.push({
            employee_id: row.employee_id,
            name: row.name,
            message: `員工已建立，但帳號建立失敗: ${accountError}`,
          });
        } else {
          results.success.push({
            employee_id: row.employee_id,
            name: row.name,
            accountCreated,
          });
        }

      } catch (error) {
        results.failed.push({
          employee_id: row.employee_id,
          name: row.name,
          error: error.message,
        });
      }

      // 避免 rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setImportResults(results);
    setProcessing(false);
    setStep(4);
  };

  // 下載失敗報告
  const downloadFailureReport = () => {
    const failedData = [
      ['員工編號', '姓名', '錯誤原因'],
      ...importResults.failed.map(f => [f.employee_id, f.name, f.error]),
      ...importResults.warnings.map(w => [w.employee_id, w.name, w.message]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(failedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '匯入失敗報告');
    XLSX.writeFile(wb, `匯入失敗報告_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // 統計
  const validCount = validationResults.filter(r => r._isValid).length;
  const errorCount = validationResults.filter(r => !r._isValid).length;
  const warningCount = validationResults.filter(r => r._warnings.length > 0).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="批量匯入員工"
      size="xl"
    >
      <div className="min-h-[400px]">
        {/* 步驟指示器 */}
        <div className="flex items-center justify-center mb-6">
          {[
            { num: 1, label: '上傳檔案' },
            { num: 2, label: '預覽驗證' },
            { num: 3, label: '匯入中' },
            { num: 4, label: '完成' },
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className={`flex items-center gap-2 ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                  ${step > s.num ? 'bg-blue-600 text-white' :
                    step === s.num ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' :
                    'bg-gray-100 text-gray-400'}`}>
                  {step > s.num ? <CheckCircle2 size={16} /> : s.num}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </div>
              {idx < 3 && (
                <div className={`w-12 h-0.5 mx-2 ${step > s.num ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: 上傳檔案 */}
        {step === 1 && (
          <div className="space-y-6">
            {/* 拖放區域 */}
            <div
              ref={dropZoneRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer
                hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
                className="hidden"
              />

              {processing ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-blue-600" size={48} />
                  <p className="text-gray-600">正在解析檔案...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Upload className="text-blue-600" size={32} />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-700">拖放檔案至此</p>
                    <p className="text-gray-500">或點擊選擇檔案</p>
                  </div>
                  <p className="text-sm text-gray-400">支援格式: .xlsx, .xls, .csv</p>
                </div>
              )}
            </div>

            {/* 下載範本 */}
            <div className="flex items-center justify-center">
              <button
                onClick={downloadTemplate}
                className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
              >
                <Download size={20} />
                下載匯入範本
              </button>
            </div>

            {/* 說明 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-semibold mb-2">匯入須知：</p>
              <ul className="list-disc list-inside space-y-1 text-amber-700">
                <li>員工編號和姓名為必填欄位</li>
                <li>登入帳號若未填寫，將使用員工編號作為登入帳號</li>
                <li>總部員工請填寫部門代碼，門市員工請填寫門市代碼</li>
                <li>建議先下載範本，參考欄位說明</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: 預覽驗證 */}
        {step === 2 && (
          <div className="space-y-4">
            {/* 統計 */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-600">
                  <FileSpreadsheet size={20} />
                  <span>共 {validationResults.length} 筆</span>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 size={18} />
                  <span>{validCount} 筆通過</span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle size={18} />
                    <span>{errorCount} 筆錯誤</span>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle size={18} />
                    <span>{warningCount} 筆警告</span>
                  </div>
                )}
              </div>
            </div>

            {/* 資料表格 */}
            <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 w-12">#</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600 w-16">狀態</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">員工編號</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">姓名</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">組織</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">部門/門市</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">錯誤/警告</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {validationResults.map((row, idx) => (
                    <tr key={idx} className={row._isValid ? 'hover:bg-blue-50/30' : 'bg-red-50/50'}>
                      <td className="px-3 py-2 text-gray-500">{row._rowIndex}</td>
                      <td className="px-3 py-2">
                        {row._isValid ? (
                          <CheckCircle2 size={18} className="text-green-500" />
                        ) : (
                          <XCircle size={18} className="text-red-500" />
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono">{row.employee_id || '-'}</td>
                      <td className="px-3 py-2">{row.name || '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          row._converted?.org_type === 'headquarters'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-teal-100 text-teal-700'
                        }`}>
                          {row._converted?.org_type === 'headquarters' ? '總部' : '門市'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {row.department_code || row.store_code || '-'}
                      </td>
                      <td className="px-3 py-2">
                        {row._errors.length > 0 && (
                          <div className="text-red-600 text-xs">{row._errors.join('; ')}</div>
                        )}
                        {row._warnings.length > 0 && (
                          <div className="text-amber-600 text-xs">{row._warnings.join('; ')}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 帳號建立選項 */}
            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-blue-600" />
                  <span className="font-semibold text-gray-700">系統帳號</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createAccounts}
                    onChange={(e) => setCreateAccounts(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">同時建立登入帳號</span>
                </label>
              </div>

              {createAccounts && (
                <div className="bg-blue-50 rounded-lg p-3 space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      統一預設密碼 *
                    </label>
                    <div className="relative max-w-xs">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        placeholder="至少 6 位數"
                        value={defaultPassword}
                        onChange={(e) => setDefaultPassword(e.target.value)}
                        className="w-full p-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">所有新建帳號將使用此密碼，建議員工首次登入後修改</p>
                  </div>
                </div>
              )}
            </div>

            {/* 操作按鈕 */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => {
                  setStep(1);
                  setFile(null);
                  setParsedData([]);
                  setValidationResults([]);
                }}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                <ChevronLeft size={18} />
                重新選擇檔案
              </button>

              <button
                onClick={handleImport}
                disabled={validCount === 0 || (createAccounts && (!defaultPassword || defaultPassword.length < 6))}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                開始匯入 ({validCount} 筆)
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 匯入中 */}
        {step === 3 && (
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <Loader2 className="animate-spin text-blue-600" size={64} />

            <div className="text-center">
              <p className="text-xl font-semibold text-gray-700">正在匯入...</p>
              <p className="text-gray-500 mt-1">處理中: {progress.current} / {progress.total}</p>
            </div>

            <div className="w-full max-w-md">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <p className="text-center text-sm text-gray-500 mt-2">
                {Math.round((progress.current / progress.total) * 100)}%
              </p>
            </div>
          </div>
        )}

        {/* Step 4: 完成 */}
        {step === 4 && (
          <div className="space-y-6">
            {/* 結果摘要 */}
            <div className="text-center py-6">
              {importResults.failed.length === 0 && importResults.warnings.length === 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-green-100 rounded-full">
                    <CheckCircle2 className="text-green-600" size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-green-600">匯入完成！</h3>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-amber-100 rounded-full">
                    <AlertCircle className="text-amber-600" size={48} />
                  </div>
                  <h3 className="text-2xl font-bold text-amber-600">部分匯入完成</h3>
                </div>
              )}
            </div>

            {/* 統計卡片 */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="text-green-600" size={20} />
                  <span className="text-2xl font-bold text-green-600">{importResults.success.length}</span>
                </div>
                <p className="text-sm text-green-700">成功匯入</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <AlertCircle className="text-amber-600" size={20} />
                  <span className="text-2xl font-bold text-amber-600">{importResults.warnings.length}</span>
                </div>
                <p className="text-sm text-amber-700">部分成功</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="text-red-600" size={20} />
                  <span className="text-2xl font-bold text-red-600">{importResults.failed.length}</span>
                </div>
                <p className="text-sm text-red-700">失敗</p>
              </div>
            </div>

            {/* 失敗詳情 */}
            {(importResults.failed.length > 0 || importResults.warnings.length > 0) && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between">
                  <span className="font-semibold text-gray-700">詳細資訊</span>
                  <button
                    onClick={downloadFailureReport}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Download size={16} />
                    下載報告
                  </button>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {importResults.warnings.map((w, idx) => (
                    <div key={`w-${idx}`} className="px-4 py-2 border-b bg-amber-50/50 flex items-start gap-3">
                      <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={16} />
                      <div>
                        <span className="font-medium">{w.employee_id} - {w.name}</span>
                        <p className="text-sm text-amber-600">{w.message}</p>
                      </div>
                    </div>
                  ))}
                  {importResults.failed.map((f, idx) => (
                    <div key={`f-${idx}`} className="px-4 py-2 border-b bg-red-50/50 flex items-start gap-3">
                      <XCircle className="text-red-500 mt-0.5 flex-shrink-0" size={16} />
                      <div>
                        <span className="font-medium">{f.employee_id} - {f.name}</span>
                        <p className="text-sm text-red-600">{f.error}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 操作按鈕 */}
            <div className="flex justify-center pt-4">
              <button
                onClick={() => {
                  handleClose();
                  if (onSuccess) onSuccess();
                }}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
              >
                <Users size={20} />
                完成
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
