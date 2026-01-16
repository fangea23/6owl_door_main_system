import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const navigate = useNavigate();

useEffect(() => {
  let mounted = true;
  let sessionCheckTimeout = null;

  // 監聽 Auth 狀態變化 (這是最可靠的方式)
  // 因為邀請連結帶有 hash (#access_token=...), Supabase 會自動處理登入
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (!mounted) return;

    console.log('Auth 狀態變化:', event, session ? '有 session' : '無 session');

    if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
      // 成功抓到邀請連結的 Token，使用者已登入
      console.log('✅ 邀請連結驗證成功，可以設定密碼');
      setIsSessionValid(true);
      setIsCheckingSession(false);
      setError(null);
      // 清除超時檢查
      if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
    } else if (event === 'SIGNED_OUT') {
      // Session 被登出了
      setIsSessionValid(false);
      setIsCheckingSession(false);
      setError('驗證階段已結束，請重新點擊信件中的連結');
    } else if (event === 'INITIAL_SESSION' && session) {
      // 已有有效的 session (可能是從 localStorage 恢復的)
      console.log('✅ 找到現有 session');
      setIsSessionValid(true);
      setIsCheckingSession(false);
      setError(null);
      if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
    }
  });

  // 備用檢查：如果 3 秒後還沒收到任何 auth 事件，手動檢查
  sessionCheckTimeout = setTimeout(async () => {
    if (!mounted) return;

    console.log('⏰ 3 秒超時，手動檢查 session...');

    try {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (session) {
        console.log('✅ 手動檢查找到 session');
        setIsSessionValid(true);
        setIsCheckingSession(false);
        setError(null);
      } else {
        console.warn('❌ 手動檢查未找到 session:', error);
        setIsSessionValid(false);
        setIsCheckingSession(false);
        setError('驗證連結已過期或無效。密碼重設連結通常在 1 小時內有效。');
      }
    } catch (err) {
      console.error('手動檢查 session 時發生錯誤:', err);
      if (mounted) {
        setIsSessionValid(false);
        setIsCheckingSession(false);
        setError('無法驗證重設連結，請檢查網路連線後重試');
      }
    }
  }, 3000);

  return () => {
    mounted = false;
    if (sessionCheckTimeout) clearTimeout(sessionCheckTimeout);
    authListener.subscription.unsubscribe();
  };
}, []);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 6) {
      setError('密碼長度至少需要 6 個字元');
      return;
    }

    if (password !== confirmPassword) {
      setError('兩次輸入的密碼不一致');
      return;
    }

    setLoading(true);

    try {
      // 1. 新增：先檢查是否擁有有效的 Session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        // 如果沒有 Session，可能是 Token 過期或被清除了
        setIsSessionValid(false);
        throw new Error('驗證連結已過期。密碼重設連結通常在 1 小時內有效，請重新申請。');
      }

      // 2. 執行更新
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (err) {
      console.error('Password update failed:', err);

      // 3. 優化錯誤訊息顯示
      if (err.message?.includes('AbortError') || err.name === 'AbortError') {
        setError('連線逾時，請檢查網路連線後重試');
      } else if (err.message?.includes('expired') || err.message?.includes('過期')) {
        setError('驗證連結已過期，請重新申請密碼重設');
        setIsSessionValid(false);
      } else {
        setError(err.message || '密碼更新失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  // 重新發送密碼重設郵件的函數
  const handleResendEmail = () => {
    navigate('/login');
    // 或者可以導向到忘記密碼頁面，如果有的話
    // navigate('/forgot-password');
  };
  123
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 px-8 py-6 text-center">
          <div className="mx-auto w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-4 shadow-inner">
            <Lock className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">設定新密碼</h2>
          <p className="text-blue-100 mt-2 text-sm">請輸入您的新密碼以完成帳號啟用</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {isCheckingSession ? (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">驗證連結中...</p>
              <p className="text-gray-400 text-sm mt-2">正在處理您的重設連結，請稍候</p>
            </div>
          ) : !isSessionValid ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">驗證連結已過期</h3>
              <p className="text-gray-600 mb-6">
                密碼重設連結通常在 1 小時內有效。<br />
                請重新申請密碼重設。
              </p>
              <button
                onClick={handleResendEmail}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl transition-colors"
              >
                返回登入頁面
              </button>
            </div>
          ) : success ? (
            <div className="text-center py-8 animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">密碼設定成功！</h3>
              <p className="text-gray-500">正在為您登入系統...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-5">

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <span>{error}</span>
                    {!isSessionValid && (
                      <button
                        onClick={handleResendEmail}
                        className="block mt-2 text-blue-600 hover:text-blue-700 font-medium underline"
                      >
                        返回登入頁面重新申請
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  新密碼
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="至少 6 個字元"
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  確認新密碼
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="再次輸入新密碼"
                    className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>更新中...</span>
                  </>
                ) : (
                  <span>設定密碼並登入</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}