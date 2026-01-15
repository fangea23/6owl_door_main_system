import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Users, Building2, Briefcase } from 'lucide-react';
import ProfilesManagement from './components/ProfilesManagement';
import EmployeesManagement from './components/EmployeesManagement';
import DepartmentsManagement from './components/DepartmentsManagement';

/**
 * 統一管理中心
 * 整合所有系統的帳戶、員工、部門管理
 */
export default function ManagementCenter() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('profiles');

  // 權限檢查：只有 admin 和 hr 可以訪問
  if (role !== 'admin' && role !== 'hr') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">權限不足</h2>
          <p className="text-gray-600 mb-6">您沒有權限存取管理中心</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'profiles',
      name: '用戶帳號',
      icon: Users,
      description: '管理系統登入帳號與權限',
      component: ProfilesManagement,
    },
    {
      id: 'employees',
      name: '員工資料',
      icon: Briefcase,
      description: '管理員工組織架構資訊',
      component: EmployeesManagement,
    },
    {
      id: 'departments',
      name: '部門管理',
      icon: Building2,
      description: '管理公司部門架構',
      component: DepartmentsManagement,
    },
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* 標題 */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <Shield className="text-blue-700" size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">統一管理中心</h1>
                <p className="text-sm text-gray-500">帳號、員工、部門統一管理平台</p>
              </div>
            </div>

            {/* 返回按鈕 */}
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
            >
              ← 返回首頁
            </button>
          </div>

          {/* Tab 導航 */}
          <div className="flex gap-2 mt-6 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap
                    ${activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 內容區域 */}
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Tab 說明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>

        {/* 動態內容 */}
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
}
