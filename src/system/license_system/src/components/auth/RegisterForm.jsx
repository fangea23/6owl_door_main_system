import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Shield, Mail, Lock, User } from 'lucide-react'
import toast from 'react-hot-toast'

export function RegisterForm() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error('密碼不一致')
      return
    }

    if (password.length < 6) {
      toast.error('密碼至少需要 6 個字元')
      return
    }

    setLoading(true)

    const { error } = await signUp(email, password, fullName)

    if (error) {
      toast.error(error.message || '註冊失敗')
    } else {
      toast.success('註冊成功！請查看您的電子郵件以驗證帳號')
      navigate('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">建立帳號</h1>
            <p className="text-gray-500 mt-2">開始管理您的軟體授權</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="text"
                placeholder="姓名"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="email"
                placeholder="電子郵件"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="password"
                placeholder="密碼"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <Input
                type="password"
                placeholder="確認密碼"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10"
              />
            </div>

            <div className="text-sm text-gray-600">
              <label className="flex items-start">
                <input type="checkbox" required className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                <span className="ml-2">
                  我同意{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700">服務條款</a>
                  {' '}和{' '}
                  <a href="#" className="text-blue-600 hover:text-blue-700">隱私政策</a>
                </span>
              </label>
            </div>

            <Button type="submit" className="w-full" loading={loading}>
              註冊
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            已經有帳號？{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              立即登入
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
