/**
 * 系統分類配置
 *
 * 如何新增系統：
 * 1. 在對應的 category 中新增系統物件
 * 2. 如需新增類別，在 categories 陣列新增類別物件
 *
 * 系統物件格式：
 * {
 * id: 'unique-id',           // 唯一識別碼
 * name: '系統名稱',           // 顯示名稱
 * description: '系統描述',    // 簡短描述
 * icon: 'IconComponent',     // 圖標（使用 SVG 或 emoji）
 * url: '/path-to-system',    // 系統連結
 * status: 'active',          // active | coming-soon | maintenance
 * isExternal: false,         // 是否為外部連結
 * permissionCode: 'system.xxx', // 系統訪問權限代碼（可選，沒有則所有人可見）
 * }
 */

export const categories = [
  {
    id: 'system-management',
    name: '系統管理',
    description: '帳號、員工、部門統一管理',
    icon: '⚙️',
    color: 'blue', // 藍色代表系統管理
    systems: [
      {
        id: 'management-center',
        name: '管理中心',
        description: '帳號、員工、部門統一管理平台',
        icon: '🛡️',
        url: '/management',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.management', // 系統訪問權限（已取代 requiresRole）
      },
    ],
  },
  {
    id: 'finance',
    name: '財務管理',
    description: '財務相關流程與簽核',
    icon: '💰',
    color: 'rose', // 改為玫瑰紅，與主色呼應
    systems: [
      {
        id: 'payment-approval',
        name: '付款簽核系統',
        description: '管理付款申請、審核與追蹤',
        icon: '📝',
        url: '/systems/payment-approval',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.payment', // 需要系統訪問權限
      },
      {
        id: 'expense-reimbursement',
        name: '員工代墊款系統',
        description: '員工費用報銷申請與審核',
        icon: '💸',
        url: '/systems/expense-reimbursement',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.expense_reimbursement', // 需要系統訪問權限
      },
    ],
  },
  {
    id: 'it-service',
    name: 'IT 服務',
    description: '資訊技術支援與管理',
    icon: '💻',
    color: 'stone', // 改為岩石灰，作為紅色的視覺緩衝，專業且耐看
    systems: [
      {
        id: 'software-license',
        name: '軟體授權系統',
        description: '軟體授權申請與管理',
        icon: '🔑',
        url: '/systems/software-license',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.license', // 需要系統訪問權限
      },
    ],
  },
  {
    id: 'hr-service',
    name: '人力資源',
    description: '員工發展與教育訓練',
    icon: '👥',
    color: 'amber',
    systems: [
      {
        id: 'training',
        name: '教育訓練系統',
        description: '線上課程學習與測驗',
        icon: '🎓',
        url: '/systems/training',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.training', // 需要系統訪問權限
      },
    ],
  },
  {
    id: 'admin-service',
    name: '行政服務',
    description: '日常行政與辦公支援',
    icon: '🏢',
    color: 'stone', // 改為岩石灰，與 HR 區分
    systems: [
      {
        id: 'meeting-room',
        name: '會議室租借系統',
        description: '會議室預約與管理',
        icon: '📅',
        url: '/systems/meeting-room',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.meeting_room', // 需要系統訪問權限
      },
      {
        id: 'car-rental',
        name: '公司車租借系統',
        description: '公司車輛預約與管理',
        icon: '🚗',
        url: '/systems/car-rental',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.car_rental', // 需要系統訪問權限
      },
      {
        id: 'store-management',
        name: '店舖管理系統',
        description: '品牌與店舖資料管理',
        icon: '🏪',
        url: '/systems/store-management',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.store_management', // 需要系統訪問權限
      },
      {
        id: 'eip-km',
        name: '企業入口網 (EIP & KM)',
        description: '文件、公告、知識管理',
        icon: '📚',
        url: '/systems/eip-km',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.eip_km', // 需要系統訪問權限
      },
      {
        id: 'ticketing',
        name: '叫修服務系統',
        description: '設備報修與服務工單',
        icon: '🔧',
        url: '/systems/ticketing',
        status: 'active',
        isExternal: false,
        permissionCode: 'system.ticketing', // 需要系統訪問權限
      },
    ],
  },
];

// 取得所有系統的扁平列表（用於搜尋）
export const getAllSystems = () => {
  return categories.flatMap(category =>
    category.systems.map(system => ({
      ...system,
      categoryId: category.id,
      categoryName: category.name,
    }))
  );
};

// 根據 ID 取得單一系統
export const getSystemById = (id) => {
  return getAllSystems().find(system => system.id === id);
};

// 根據類別 ID 取得類別
export const getCategoryById = (id) => {
  return categories.find(category => category.id === id);
};