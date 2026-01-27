import { useState, useEffect } from 'react';
import { useNavigate, useLocation} from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Loader2, Mail, X, CheckCircle, User } from 'lucide-react';
import logoSrc from '../assets/logo.png';

export default function Login() {
  // 統一帳號輸入（自動判斷員工編號或 Email）
  const [formData, setFormData] = useState({
    account: '', // 統一帳號欄位（員工編號或 Email）
    password: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // 忘記密碼彈窗狀態
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  // 載入時檢查是否有記住的帳號
  useEffect(() => {
    const rememberedAccount = localStorage.getItem('rememberedAccount');
    const isRemembered = localStorage.getItem('rememberMe') === 'true';

    if (isRemembered && rememberedAccount) {
      setFormData(prev => ({ ...prev, account: rememberedAccount }));
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const isUpdatingPassword =
        window.location.hash.includes('access_token') ||
        window.location.pathname === '/update-password';

      if (isUpdatingPassword) {
        console.log("偵測到密碼更新流程，停止自動導向首頁");
        return;
      }

      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // 判斷輸入是否為 Email 格式
  const isEmailFormat = (input) => {
    return input.includes('@');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const accountInput = formData.account.trim();

    // 自動判斷：含 @ 為 Email，否則為員工編號
    let loginEmail;
    if (isEmailFormat(accountInput)) {
      // Email 格式：直接使用
      loginEmail = accountInput;
    } else {
      // 員工編號格式：轉換為虛擬 email
      loginEmail = `${accountInput.toLowerCase()}@6owldoor.internal`;
    }

    const result = await login({
      email: loginEmail,
      password: formData.password,
    });

    if (result.success) {
      // 處理記住我功能
      if (rememberMe) {
        localStorage.setItem('rememberedAccount', accountInput);
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberedAccount');
        localStorage.removeItem('rememberMe');
      }

      navigate(from, { replace: true });
    } else {
      // 優化錯誤訊息
      let errorMsg = result.error || '登入失敗';
      if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = '帳號或密碼錯誤';
      }
      setError(errorMsg);
    }

    setIsSubmitting(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  // 忘記密碼處理
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordEmail,
        {
          redirectTo: `${window.location.origin}/update-password`,
        }
      );

      if (error) throw error;

      setForgotPasswordSuccess(true);
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordSuccess(false);
        setForgotPasswordEmail('');
      }, 3000);
    } catch (err) {
      setForgotPasswordError(err.message || '發送失敗，請稍後再試');
    } finally {
      setForgotPasswordLoading(false);
    }
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
            <div className="w-16 h-16 flex items-center justify-center">
              <img src={logoSrc} alt="Logo" className="w-full h-full object-contain drop-shadow-lg" />
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

      {/* 右側 - 登入表單 (手機版優化) */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-stone-50 relative">
        {/* 背景裝飾：非常淡的紋理，打破純白背景的單調 */}
        <div className="absolute inset-0 bg-stone-100/50 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]"></div>

        <div className="w-full max-w-md relative z-10">
          {/* 手機版 Logo - 優化 */}
          <div className="lg:hidden flex flex-col items-center gap-2 sm:gap-3 mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center">
               <img src={logoSrc} alt="Logo" className="w-full h-full object-contain" />
             </div>
             <div className="text-center">
               <span className="text-xl sm:text-2xl font-bold text-stone-800">六扇門</span>
               <p className="text-[10px] sm:text-xs text-stone-500 tracking-widest mt-0.5 sm:mt-1">企業服務入口</p>
             </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl shadow-stone-200/50 p-6 sm:p-8 border border-white">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-800">歡迎回來</h2>
              <p className="text-sm sm:text-base text-stone-500 mt-1.5 sm:mt-2">請輸入您的員工帳號以繼續</p>
            </div>

            {error && (
              <div className="mb-5 sm:mb-6 p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-2.5 sm:gap-3">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs sm:text-sm text-red-700 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              {/* 統一帳號輸入 */}
              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-stone-700 ml-1">帳號</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400">
                    {isEmailFormat(formData.account) ? <Mail size={18} /> : <User size={18} />}
                  </div>
                  <input
                    type="text"
                    name="account"
                    value={formData.account}
                    onChange={handleInputChange}
                    placeholder="員工編號或 Email"
                    required
                    autoComplete="username"
                    className="w-full pl-11 pr-4 sm:pr-5 py-3 sm:py-3.5 text-sm sm:text-base bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all hover:bg-white"
                  />
                </div>
                <p className="text-[10px] sm:text-xs text-stone-400 ml-1">
                  例如：A001 或 user@company.com
                </p>
              </div>

              <div className="space-y-1 sm:space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-stone-700 ml-1">密碼</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 sm:px-5 py-3 sm:py-3.5 text-sm sm:text-base bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all hover:bg-white"
                />
              </div>

              <div className="flex items-center justify-between pt-1 sm:pt-2">
                <label className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded border-stone-300 text-red-600 focus:ring-red-500 transition-colors"
                  />
                  <span className="text-xs sm:text-sm text-stone-600 group-hover:text-stone-800 transition-colors">記住我</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700 active:text-red-800 font-medium hover:underline decoration-2 underline-offset-4"
                >
                  忘記密碼？
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 sm:py-3.5 px-4 text-sm sm:text-base bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 active:from-red-900 active:to-red-950 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/40 active:shadow-red-500/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none touch-manipulation"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    驗證中...
                  </span>
                ) : '登入系統'}
              </button>
            </form>
          </div>

          <p className="text-center text-[10px] sm:text-xs text-stone-400 mt-6 sm:mt-8 px-4">
            此系統僅供六扇門內部員工使用，未經授權存取將被記錄
          </p>
        </div>
      </div>

      {/* 忘記密碼彈窗 */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-md p-6 sm:p-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-stone-800">忘記密碼</h3>
              </div>
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail('');
                  setForgotPasswordError('');
                  setForgotPasswordSuccess(false);
                }}
                className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            {forgotPasswordSuccess ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-stone-800 mb-2">郵件已發送</h4>
                <p className="text-sm text-stone-600 leading-relaxed">
                  我們已將密碼重設連結發送至您的信箱，<br />請檢查您的電子郵件並按照指示重設密碼。
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm text-stone-600 mb-4 leading-relaxed">
                  請輸入您的電子郵件地址，我們會將密碼重設連結發送至您的信箱。
                </p>
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700">
                    <strong>💡 提示：</strong>使用員工編號登入的同仁，如需重設密碼請聯繫 IT 部門。
                  </p>
                </div>

                {forgotPasswordError && (
                  <div className="mb-5 p-3 sm:p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg flex items-start gap-2.5">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs sm:text-sm text-red-700 font-medium leading-relaxed">{forgotPasswordError}</p>
                  </div>
                )}

                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-stone-700 ml-1">電子郵件</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                      <input
                        type="email"
                        value={forgotPasswordEmail}
                        onChange={(e) => setForgotPasswordEmail(e.target.value)}
                        placeholder="user@6owldoor.com"
                        required
                        className="w-full pl-12 pr-5 py-3.5 text-base bg-stone-50 border border-stone-200 rounded-xl text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all hover:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail('');
                        setForgotPasswordError('');
                      }}
                      className="flex-1 py-3 px-4 text-base bg-stone-100 hover:bg-stone-200 active:bg-stone-300 text-stone-700 font-semibold rounded-xl transition-all"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={forgotPasswordLoading}
                      className="flex-1 py-3 px-4 text-base bg-gradient-to-r from-red-700 to-red-800 hover:from-red-800 hover:to-red-900 active:from-red-900 active:to-red-950 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 hover:shadow-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {forgotPasswordLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="animate-spin w-5 h-5" />
                          發送中...
                        </span>
                      ) : '發送重設連結'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}