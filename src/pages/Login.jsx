import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// 確保您已將 App.css 的新樣式套用

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
      {/* 左側 - 品牌區 (大升級) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-red-950 p-12 flex-col justify-between">
        {/* 背景紋理層 */}
        <div className="absolute inset-0 bg-pattern-hex opacity-30"></div>
        
        {/* 裝飾光暈 - 增加空間深邃感 */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-amber-600/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 text-white">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-2xl">
              {/* 六扇門 Logo */}
              <svg viewBox="0 0 40 40" className="w-10 h-10 drop-shadow-lg">
                <polygon
                  points="20,2 34,8 38,22 34,34 20,38 6,34 2,22 6,8"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                />
                <circle cx="20" cy="20" r="8" fill="none" stroke="white" strokeWidth="1.5"/>
                {/* 增加一點金色點綴在 Logo 中心 */}
                <circle cx="20" cy="20" r="3" fill="#fbbf24" fillOpacity="0.8" stroke="none"/>
                <line x1="20" y1="12" x2="20" y2="28" stroke="white" strokeWidth="1.5"/>
                <line x1="12" y1="20" x2="28" y2="20" stroke="white" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <span className="text-3xl font-bold tracking-wider text-white">六扇門</span>
              <div className="flex items-center gap-2">
                <div className="h-[1px] w-8 bg-amber-500/50"></div>
                <p className="text-xs text-amber-200/80 tracking-[0.2em] uppercase">6OWL DOOR GROUP</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-white">
          <h1 className="text-5xl font-bold mb-6 tracking-wide leading-tight">
            企業服務<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-red-200">智慧入口</span>
          </h1>
          <p className="text-lg text-red-100/80 mb-12 max-w-md font-light leading-relaxed">
            整合財務、IT 與行政資源，打造高效流暢的數位辦公體驗。
          </p>

          <div className="grid grid-cols-3 gap-6">
            {[
              { icon: '💰', label: '付款簽核', desc: '高效審批' },
              { icon: '🔑', label: '軟體授權', desc: '資產管理' },
              { icon: '📅', label: '會議預約', desc: '空間活化' }
            ].map((item, idx) => (
              <div key={idx} className="group bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/10 hover:bg-white/10 hover:border-amber-500/30 transition-all duration-300 cursor-default">
                <div className="text-3xl mb-3 transform group-hover:scale-110 transition-transform duration-300">{item.icon}</div>
                <div className="font-medium text-white group-hover:text-amber-200 transition-colors">{item.label}</div>
                <div className="text-xs text-white/40 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex justify-between items-end text-white/40 text-xs font-light">
          <div>© {new Date().getFullYear()} 六扇門時尚湯鍋</div>
          <div className="flex gap-4">
            <span>隱私權政策</span>
            <span>服務條款</span>
          </div>
        </div>
      </div>

      {/* 右側 - 登入表單 */}
      <div className="flex-1 flex items-center justify-center p-8 bg-stone-50 relative">
        {/* 背景裝飾：非常淡的紋理，打破純白背景的單調 */}
        <div className="absolute inset-0 bg-stone-100/50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"></div>

        <div className="w-full max-w-md relative z-10">
          {/* 手機版 Logo */}
          <div className="lg:hidden flex flex-col items-center gap-3 mb-8">
             <div className="w-16 h-16 bg-gradient-to-br from-red-700 to-red-900 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/20">
               <svg viewBox="0 0 40 40" className="w-10 h-10">
                 <polygon points="20,2 34,8 38,22 34,34 20,38 6,34 2,22 6,8" fill="none" stroke="white" strokeWidth="2"/>
                 <circle cx="20" cy="20" r="3" fill="#fbbf24" stroke="none"/>
               </svg>
             </div>
             <div className="text-center">
               <span className="text-2xl font-bold text-stone-800">六扇門</span>
               <p className="text-xs text-stone-500 tracking-widest mt-1">企業服務入口</p>
             </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-stone-200/50 p-8 border border-white">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-stone-800">歡迎回來</h2>
              <p className="text-stone-500 mt-2">請輸入您的員工帳號以繼續</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-stone-700 ml-1">電子郵件</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="user@6owldoor.com"
                  required
                  className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all hover:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-sm font-semibold text-stone-700 ml-1">密碼</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  className="w-full px-5 py-3.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all hover:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-stone-300 text-red-600 focus:ring-red-500 transition-colors"
                  />
                  <span className="text-sm text-stone-600 group-hover:text-stone-800 transition-colors">記住我</span>
                </label>
                <button type="button" className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline decoration-2 underline-offset-4">
                  忘記密碼？
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transform hover:-translate-y-0.5 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    驗證中...
                  </span>
                ) : '登入系統'}
              </button>
            </form>
          </div>
          
          <p className="text-center text-xs text-stone-400 mt-8">
            此系統僅供六扇門內部員工使用，未經授權存取將被記錄
          </p>
        </div>
      </div>
    </div>
  );
}