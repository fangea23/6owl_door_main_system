import React from 'react';
import { Outlet, NavLink, useNavigate ,Link} from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  Calendar,
  Plus,
  Building2,
  Home,
  User,
  Menu,
  X
} from 'lucide-react';
// 在其他 import 下方加入
import logoSrc from '../../../../assets/logo.png'; // 確保路徑層級正確指向 src/assets/logo.png
const BASE_PATH = '/systems/meeting-room';

// 六扇門 Logo 組件 - 與主系統統一風格
// 修改 Logo 組件
const Logo = ({ size = 'default' }) => {
  const sizeClasses = size === 'small' ? 'w-8 h-8' : 'w-10 h-10';
  return (
    <div className={`${sizeClasses} relative flex items-center justify-center`}>
      <img
        src={logoSrc}  // 改用變數
        alt="六扇門 Logo"
        className="w-full h-full object-contain filter drop-shadow-md"
      />
    </div>
  );
};

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { path: `${BASE_PATH}/dashboard`, icon: Calendar, label: '預約總覽' },
    { path: `${BASE_PATH}/booking`, icon: Plus, label: '新增預約' },
    { path: `${BASE_PATH}/rooms`, icon: Building2, label: '會議室管理' },
  ];

  return (
    <div className="min-h-screen bg-stone-50 bg-pattern-diagonal">
      {/* Header - 與主系統統一風格 */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200 shadow-sm">
        {/* 背景紋理 */}
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
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Calendar size={18} className="text-amber-600" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-bold text-stone-700">會議室租借</p>
                  <p className="text-[10px] text-stone-400 tracking-wider">MEETING ROOM</p>
                </div>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'text-stone-600 hover:bg-stone-100 hover:text-stone-800'
                    }`
                  }
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <Link 
                to="/profile" 
                className="hidden sm:flex items-center gap-2 hover:bg-stone-50 p-1.5 rounded-lg transition-colors"
                title="個人資料設定"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-red-700 to-red-900 rounded-lg flex items-center justify-center text-white font-medium text-sm shadow-md shadow-red-500/20">
                  {user?.user_metadata?.full_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="text-sm">
                  <p className="font-medium text-stone-700">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || '使用者'}
                  </p>
                </div>
              </Link>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-stone-200 bg-white p-4 space-y-2">
            {navItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`
                }
              >
                <item.icon size={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer - 與主系統統一風格 */}
      <footer className="border-t border-stone-200/60 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 text-stone-600">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src={logoSrc} // 改用變數
                  alt="Logo" 
                  className="w-full h-full object-contain opacity-80" 
                />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-stone-800">六扇門企業服務入口</span>
                <span className="text-[10px] text-stone-400 tracking-wider">MEETING ROOM SYSTEM</span>
              </div>
            </div>

            <div className="text-sm text-stone-500 font-medium">
              © {new Date().getFullYear()} 六扇門時尚湯鍋. <span className="text-stone-300">|</span> All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
