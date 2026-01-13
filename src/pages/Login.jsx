import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login({
      email: formData.email,
      password: formData.password,
    });

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error || '登入失敗');
    }

    setIsSubmitting(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* 左側 - 品牌區 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-red-700 via-red-800 to-red-900 p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 text-white">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center border border-white/30">
              {/* 六扇門 Logo - 八角形設計 */}
              <svg viewBox="0 0 40 40" className="w-10 h-10">
                <polygon
                  points="20,2 34,8 38,22 34,34 20,38 6,34 2,22 6,8"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="1.5"/>
                <line x1="20" y1="12" x2="20" y2="28" stroke="white" strokeWidth="1.5"/>
                <line x1="12" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <span className="text-2xl font-bold tracking-wider">六扇門</span>
              <p className="text-xs text-red-200 tracking-widest">6OWL DOOR</p>
            </div>
          </div>
        </div>

        <div className="text-white">
          <h1 className="text-4xl font-bold mb-4 tracking-wide">
            企業服務入口
          </h1>
          <p className="text-xl text-red-100/80 mb-8">
            統一管理所有內部系統，提升工作效率
          </p>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 hover:bg-white/20 transition-colors">
              <div className="text-3xl mb-2">💰</div>
              <div className="text-sm text-red-100">付款簽核</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 hover:bg-white/20 transition-colors">
              <div className="text-3xl mb-2">🔑</div>
              <div className="text-sm text-red-100">軟體授權</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 hover:bg-white/20 transition-colors">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm text-red-100">會議室租借</div>
            </div>
          </div>
        </div>

        <div className="text-red-200/60 text-sm">
          © {new Date().getFullYear()} 六扇門時尚湯鍋
        </div>
      </div>

      {/* 右側 - 登入表單 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50">
        <div className="w-full max-w-md">
          {/* 手機版 Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-14 h-14 bg-red-800 rounded-xl flex items-center justify-center">
              <svg viewBox="0 0 40 40" className="w-10 h-10">
                <polygon
                  points="20,2 34,8 38,22 34,34 20,38 6,34 2,22 6,8"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="1.5"/>
                <line x1="20" y1="12" x2="20" y2="28" stroke="white" strokeWidth="1.5"/>
                <line x1="12" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <span className="text-2xl font-bold text-stone-800">六扇門</span>
              <p className="text-xs text-stone-500 tracking-widest">6OWL DOOR</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 border border-stone-200">
            <h2 className="text-2xl font-bold text-stone-800 mb-2">
              歡迎回來
            </h2>
            <p className="text-stone-500 mb-6">
              請登入以存取企業服務
            </p>

            {/* 錯誤訊息 */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  電子郵件
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  密碼
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg bg-white text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm text-stone-600">記住我</span>
                </label>
                <button type="button" className="text-sm text-red-600 hover:text-red-700 font-medium">
                  忘記密碼？
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white font-medium rounded-lg shadow-lg shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    登入中...
                  </span>
                ) : '登入'}
              </button>
            </form>

            {/* 提示 */}
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-800">
                使用公司帳號登入。如有問題請聯繫系統管理員。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
