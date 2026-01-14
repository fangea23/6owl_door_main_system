import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  Calendar,
  Plus,
  Building2,
  Home,
  LogOut,
  User,
  Menu,
  X
} from 'lucide-react';

const BASE_PATH = '/systems/meeting-room';

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
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
                title="回到入口"
              >
                <Home size={20} className="text-stone-600" />
              </button>
              <div className="h-6 w-px bg-stone-200" />
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 rounded-lg">
                  <Calendar size={20} className="text-amber-600" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-stone-800">會議室租借系統</h1>
                  <p className="text-xs text-stone-400 hidden sm:block">Meeting Room Booking</p>
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

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-stone-600">
                <User size={16} />
                <span>{user?.user_metadata?.full_name || user?.email?.split('@')[0] || '使用者'}</span>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-stone-100 rounded-lg"
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

      {/* Footer */}
      <footer className="text-center text-stone-400 text-sm py-8">
        &copy; 2025 6OWL DOOR Meeting Room System. Powered by Supabase.
      </footer>
    </div>
  );
}
