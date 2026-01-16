import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Users, Building2, Briefcase } from 'lucide-react';
import ProfilesManagement from './components/ProfilesManagement';
import EmployeesManagement from './components/EmployeesManagement';
import DepartmentsManagement from './components/DepartmentsManagement';
import logoSrc from '../../assets/logo.png';

// 六扇門 Logo 組件
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={`${sizeClasses} relative flex items-center justify-center`}>
      <img
        src={logoSrc}
        alt="六扇門 Logo"
        className="w-full h-full object-contain filter drop-shadow-md"
      />
    </div>
  );
};

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
    <div className="min-h-screen bg-stone-50 bg-pattern-diagonal">
      {/* Header - 與主系統統一風格 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        <div className="absolute inset-0 bg-pattern-diagonal opacity-50 pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="group flex items-center gap-3 hover:opacity-100 transition-opacity"
                title="回到入口"
              >
                <Logo />
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-stone-800 tracking-tight group-hover:text-red-800 transition-colors">
                    六扇門
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <div className="h-[1px] w-3 bg-amber-500/50"></div>
                    <p className="text-[10px] text-stone-500 font-medium tracking-[0.2em] group-hover:text-amber-600 transition-colors">
                      6OWL DOOR
                    </p>
                  </div>
                </div>
              </button>

              <div className="h-8 w-px bg-stone-200 mx-2" />

              {/* 子系統標題 */}
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Shield size={18} className="text-blue-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-stone-700">統一管理中心</p>
                  <p className="text-[10px] text-stone-400 tracking-wider">MANAGEMENT CENTER</p>
                </div>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-red-500/20">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-stone-700">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || '使用者'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab 導航 */}
        <div className="border-t border-stone-200 bg-white/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-2 py-3 overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium transition-all whitespace-nowrap text-sm ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                        : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

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
