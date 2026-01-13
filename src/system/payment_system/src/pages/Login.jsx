import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Mail, Lock, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  
  // 表單狀態
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true); // 新增：檢查登入狀態中

  // 1. 初始化檢查
  useEffect(() => {
    const checkSession = async () => {
      // A. 檢查是否已經登入 (Session 是否有效)
      // 如果已經登入，直接跳轉 Dashboard，不用再輸入密碼 (這就是遊戲的自動登入感)
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/systems/payment-approval/dashboard');
        return;
      }

      // B. 如果沒登入，自動填入「上次成功登入的 Email」
      const lastEmail = localStorage.getItem('last_login_email');
      if (lastEmail) {
        setEmail(lastEmail);
      }
      
      setCheckingSession(false);
    };

    checkSession();
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Supabase 登入請求
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 2. 登入成功後，永遠自動記住這個 Email
      localStorage.setItem('last_login_email', email);

      // 登入成功，導向儀表板
      navigate('/systems/payment-approval/dashboard'); 

    } catch (err) {
      setError(err.message === 'Invalid login credentials' 
        ? '帳號或密碼錯誤，請重試。' 
        : '登入失敗：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 如果正在檢查 Session，顯示全白或載入圈圈，避免畫面閃爍
  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white">
      
      {/* 左側：品牌形象區 (維持不變) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-900 overflow-hidden items-center justify-center">
        <div className="absolute w-[500px] h-[500px] bg-emerald-800 rounded-full blur-3xl opacity-50 -top-20 -left-20"></div>
        <div className="absolute w-[300px] h-[300px] bg-emerald-600 rounded-full blur-3xl opacity-30 bottom-10 right-10"></div>
        
        <div className="relative z-10 text-white p-12 max-w-lg">
          <div className="w-16 h-16 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-8 border border-white/20">
             <ShieldCheck size={32} className="text-emerald-300" />
          </div>
          <h1 className="text-4xl font-bold mb-6 leading-tight">六扇門付款簽核系統</h1>
          <p className="text-emerald-100 text-lg leading-relaxed mb-8">
            專為餐飲連鎖設計的智慧財務審核平台。自動化流程、即時簽核，讓每一筆支出都清晰可見。
          </p>
          <div className="flex gap-4 text-sm text-emerald-300/80 font-mono">
             <span>v2.0.1 Stable</span>
             <span>|</span>
             <span>System Ready</span>
          </div>
        </div>
      </div>

      {/* 右側：登入表單區 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-gray-50">
        <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">歡迎回來</h2>
            <p className="mt-2 text-sm text-gray-500">請輸入您的員工帳號登入系統</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-shake">
                <ShieldCheck size={16} /> {error}
              </div>
            )}

            <div className="space-y-4">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電子信箱</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    name="email" // ✅ 加入 name 屬性
                    autoComplete="username" // ✅ 告訴瀏覽器這是帳號
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-gray-50 focus:bg-white"
                    placeholder="name@company.com"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">密碼</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    name="password" // ✅ 加入 name 屬性
                    autoComplete="current-password" // ✅ 告訴瀏覽器這是密碼，請它自動填寫
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-gray-50 focus:bg-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* 只有「忘記密碼」，不需要「記住帳號」了，因為預設就記住 */}
              <div className="flex justify-end mt-2">
                <Link to="/forgot-password" className="text-sm font-medium text-emerald-600 hover:text-emerald-500">
                  忘記密碼？
                </Link>
              </div>

            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  登入中...
                </>
              ) : (
                <>
                  登入系統 <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-400">
             &copy; 2025 六扇門 Finance System
          </div>
        </div>
      </div>
    </div>
  );
}