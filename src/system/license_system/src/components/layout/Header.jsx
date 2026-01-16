import { Bell, Search, User } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

export function Header({ title }) {
  const { profile } = useAuth()

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋..."
            className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User menu */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.full_name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-white" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
