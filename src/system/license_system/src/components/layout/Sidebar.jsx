import { NavLink, useLocation } from 'react-router-dom'
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
  ChevronRight
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useState } from 'react'

const navigation = [
  { name: '儀表板', href: '/', icon: LayoutDashboard },
  { name: '授權管理', href: '/licenses', icon: Key },
  { name: '授權分配', href: '/assignments', icon: UserCheck },
  { name: '員工管理', href: '/employees', icon: Users },
  { name: '軟體管理', href: '/software', icon: Monitor },
  { name: '設定', href: '/settings', icon: Settings }
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div
      className={`
        flex flex-col bg-gray-900 text-white transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-500" />
            <span className="text-xl font-bold">授權管理</span>
          </div>
        )}
        {collapsed && <Shield className="h-8 w-8 text-blue-500 mx-auto" />}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== '/' && location.pathname.startsWith(item.href))

          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
      <div className="border-t border-gray-800 p-4">
        {!collapsed && profile && (
          <div className="mb-3">
            <p className="text-sm font-medium truncate">
              {profile.full_name || profile.email}
            </p>
            <p className="text-xs text-gray-400 truncate">{profile.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={`
            flex items-center gap-3 w-full px-3 py-2 rounded-lg
            text-gray-300 hover:bg-gray-800 hover:text-white transition-colors
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
