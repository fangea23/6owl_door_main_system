import { NavLink, useLocation, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Key,
  Users,
  Monitor,
  UserCheck,
  Settings,
  LogOut,
  Shield,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'

// 子系統的基礎路徑
const BASE_PATH = '/systems/software-license'

const navigation = [
  { name: '儀表板', href: `${BASE_PATH}/dashboard`, icon: LayoutDashboard },
  { name: '授權管理', href: `${BASE_PATH}/licenses`, icon: Key },
  { name: '授權分配', href: `${BASE_PATH}/assignments`, icon: UserCheck },
  { name: '員工管理', href: `${BASE_PATH}/employees`, icon: Users },
  { name: '軟體管理', href: `${BASE_PATH}/software`, icon: Monitor },
  { name: '設定', href: `${BASE_PATH}/settings`, icon: Settings }
]

export function LicenseSidebar() {
  const { profiles, signOut, logout } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    // 支援主系統的 logout 或子系統的 signOut
    if (logout) {
      await logout()
    } else if (signOut) {
      await signOut()
    }
  }

  return (
    <div
      className={`
        flex flex-col bg-stone-800 text-white transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-stone-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-red-500" />
            <span className="text-xl font-bold">授權管理</span>
          </div>
        )}
        {collapsed && <Shield className="h-8 w-8 text-red-500 mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-stone-700 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* 返回六扇門入口 */}
      <div className="px-2 py-2 border-b border-stone-700">
        <Link
          to="/"
          className={`
            flex items-center gap-3 px-3 py-2 rounded-lg
            text-stone-300 hover:bg-red-600 hover:text-white transition-colors
          `}
          title={collapsed ? '返回六扇門入口' : undefined}
        >
          <Home className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>返回六扇門入口</span>}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== `${BASE_PATH}/dashboard` && location.pathname.startsWith(item.href))

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${isActive
                  ? 'bg-red-600 text-white'
                  : 'text-stone-300 hover:bg-stone-700 hover:text-white'
                }
              `}
              title={collapsed ? item.name : undefined}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span>{item.name}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-stone-700 p-4">
        {!collapsed && profiles && (
          <div className="mb-3">
            <p className="text-sm font-medium truncate">
              {profiles.full_name || profiles.name || profiles.email}
            </p>
            <p className="text-xs text-stone-400 truncate">{profiles.email}</p>
            {profiles.role && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-red-600/30 text-red-300 rounded-full">
                {profiles.role === 'admin' ? '管理員' : '一般用戶'}
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={`
            flex items-center gap-3 w-full px-3 py-2 rounded-lg
            text-stone-300 hover:bg-stone-700 hover:text-white transition-colors
          `}
          title={collapsed ? '登出' : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>登出</span>}
        </button>
      </div>
    </div>
  )
}
