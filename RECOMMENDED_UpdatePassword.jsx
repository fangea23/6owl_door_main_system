// ✅ 推薦的實現方式 - 純 Supabase 自動檢測
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

    // ✅ 只監聽 Supabase 的自動處理
    // Supabase 會自動從 URL hash 中提取 token 並設置 session
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      console.log('Auth event:', event, session ? 'Session exists' : 'No session');

      // 處理成功的認證事件
      if (event === 'SIGNED_IN' ||
          event === 'PASSWORD_RECOVERY' ||
          event === 'USER_UPDATED') {
        console.log('✅ Authentication successful');
        setIsSessionValid(true);
        setIsCheckingSession(false);
        setError(null);
      }
      // 處理初始 session（已登入狀態）
      else if (event === 'INITIAL_SESSION' && session) {
        console.log('✅ Existing session found');
        setIsSessionValid(true);
        setIsCheckingSession(false);
        setError(null);
      }
      // 處理登出
      else if (event === 'SIGNED_OUT') {
        setIsSessionValid(false);
        setIsCheckingSession(false);
        setError('驗證階段已結束，請重新點擊信件中的連結');
      }
      // 處理初始狀態沒有 session 的情況
      else if (event === 'INITIAL_SESSION' && !session) {
        // 給 Supabase 一些時間處理 URL hash
        setTimeout(async () => {
          if (!mounted) return;

          const { data: { session: checkSession } } = await supabase.auth.getSession();

          if (checkSession) {
            console.log('✅ Session detected after delay');
            setIsSessionValid(true);
            setIsCheckingSession(false);
          } else {
            console.log('❌ No session found');
            setIsSessionValid(false);
            setIsCheckingSession(false);
            setError('驗證連結已過期或無效。邀請連結通常在 7 天內有效，密碼重設連結在 1 小時內有效。');
          }
        }, 3000);
      }
    });

    return () => {
      mounted = false;
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
      // 再次檢查 session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        setIsSessionValid(false);
        throw new Error('驗證連結已過期。請重新申請。');
      }

      // 更新密碼
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

      if (err.message?.includes('expired') || err.message?.includes('過期')) {
        setError('驗證連結已過期，請重新申請密碼重設');
        setIsSessionValid(false);
      } else {
        setError(err.message || '密碼更新失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6">
          <div className="flex items-center justify-center mb-2">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <Lock className="text-white" size={32} />
            </div>
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
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                    placeholder="至少 6 個字元"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  確認密碼
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="再次輸入密碼"
                  required
                />
                {password && confirmPassword && password !== confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">密碼不一致</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || password !== confirmPassword}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    更新中...
                  </>
                ) : (
                  '設定密碼'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
