/**
 * 系統分類配置
 *
 * 如何新增系統：
 * 1. 在對應的 category 中新增系統物件
 * 2. 如需新增類別，在 categories 陣列新增類別物件
 *
 * 系統物件格式：
 * {
 *   id: 'unique-id',           // 唯一識別碼
 *   name: '系統名稱',           // 顯示名稱
 *   description: '系統描述',    // 簡短描述
 *   icon: 'IconComponent',     // 圖標（使用 SVG 或 emoji）
 *   url: '/path-to-system',    // 系統連結
 *   status: 'active',          // active | coming-soon | maintenance
 *   isExternal: false,         // 是否為外部連結
 * }
 */

export const categories = [
  {
    id: 'finance',
    name: '財務管理',
    description: '財務相關流程與簽核',
    icon: '💰',
    color: 'emerald',
    systems: [
      {
        id: 'payment-approval',
        name: '付款簽核系統',
        description: '管理付款申請、審核與追蹤',
        icon: '📝',
        url: '/systems/payment-approval',  // 請將此連結替換為實際系統路徑
        status: 'active',
        isExternal: false,
      },
      // 未來可新增：報銷系統、預算管理、發票管理等
    ],
  },
  {
    id: 'it-service',
    name: 'IT 服務',
    description: '資訊技術支援與管理',
    icon: '💻',
    color: 'blue',
    systems: [
      {
        id: 'software-license',
        name: '軟體授權系統',
        description: '軟體授權申請與管理',
        icon: '🔑',
        url: '/systems/software-license',  // 請將此連結替換為實際系統路徑
        status: 'active',
        isExternal: false,
      },
      // 未來可新增：設備申請、技術支援工單、VPN 申請等
    ],
  },
  {
    id: 'admin-service',
    name: '行政服務',
    description: '日常行政與辦公支援',
    icon: '🏢',
    color: 'amber',
    systems: [
      {
        id: 'meeting-room',
        name: '會議室租借系統',
        description: '會議室預約與管理',
        icon: '📅',
        url: '/systems/meeting-room',  // 請將此連結替換為實際系統路徑
        status: 'active',
        isExternal: false,
      },
      // 未來可新增：訪客預約、停車位管理、文具申領等
    ],
  },
  // ============================================
  // 以下為預留的擴充類別，取消註解即可啟用
  // ============================================
  // {
  //   id: 'hr',
  //   name: '人力資源',
  //   description: '人事相關服務',
  //   icon: '👥',
  //   color: 'purple',
  //   systems: [
  //     {
  //       id: 'leave',
  //       name: '請假系統',
  //       description: '請假申請與審核',
  //       icon: '🏖️',
  //       url: '/systems/leave',
  //       status: 'coming-soon',
  //       isExternal: false,
  //     },
  //   ],
  // },
  // {
  //   id: 'project',
  //   name: '專案管理',
  //   description: '專案追蹤與協作',
  //   icon: '📊',
  //   color: 'rose',
  //   systems: [],
  // },
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
