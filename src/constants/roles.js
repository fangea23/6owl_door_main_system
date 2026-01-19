/**
 * 系統角色定義
 * 包含：顯示名稱、顏色標籤、權限群組
 */
export const ROLE_OPTIONS = [
  // --- 一般人員 ---
  { value: 'user', label: '一般使用者', color: 'bg-gray-100 text-gray-600', group: 'general' },
  { value: 'staff', label: '專員', color: 'bg-gray-100 text-gray-600', group: 'general' },
  
  // --- 管理職 (負責審核) ---
  { value: 'manager', label: '部門主管', color: 'bg-blue-100 text-blue-700', group: 'manager' },
  { value: 'unit_manager', label: '單位主管', color: 'bg-blue-100 text-blue-700', group: 'manager' },
  
  // --- 財務/審核職 (負責放款/稽核) ---
  { value: 'accountant', label: '會計', color: 'bg-indigo-100 text-indigo-700', group: 'finance' },
  { value: 'cashier', label: '出納', color: 'bg-orange-100 text-orange-700', group: 'finance' },
  { value: 'audit_manager', label: '審核主管', color: 'bg-purple-100 text-purple-700', group: 'finance' },
  { value: 'boss', label: '放行主管', color: 'bg-pink-100 text-pink-700', group: 'finance' },
  
  // --- 系統管理 ---
  { value: 'hr', label: '人資', color: 'bg-green-100 text-green-700', group: 'admin' },
  { value: 'admin', label: '系統管理員', color: 'bg-red-100 text-red-700', group: 'admin' },
];

// Helper: 用 value 查 label (例如顯示 'admin' -> '系統管理員')
export const ROLE_MAP = ROLE_OPTIONS.reduce((acc, cur) => {
  acc[cur.value] = cur.label;
  return acc;
}, {});

// Helper: 取得特定群組的角色 (例如只列出所有 'finance' 角色)
export const getRolesByGroup = (groupName) => 
  ROLE_OPTIONS.filter(r => r.group === groupName);

// 職稱建議 (與權限無關，純文字欄位)
export const POSITIONS = [
    '專員', '資深專員', '主任', '副理', '經理', '處長', '總經理', '工讀生'
];