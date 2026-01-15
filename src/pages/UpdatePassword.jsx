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
  const navigate = useNavigate();

useEffect(() => {
  // 監聽 Auth 狀態變化
  // 因為邀請連結帶有 hash (#access_token=...), Supabase 會自動處理登入
  const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
      // 成功抓到邀請連結的 Token，使用者已登入
      console.log('邀請連結驗證成功，請設定密碼');
    } else if (!session) {
      // 如果過了一陣子還是沒 session，代表連結無效
      // 這裡可以延遲一下再導向，避免剛進來還在讀取就被踢走
      setTimeout(() => {
         // 再次確認
         supabase.auth.getSession().then(({ data: { session: finalSession } }) => {
            if (!finalSession) {
               setError('連結無效或已過期，請重新登入');
               // 或者 navigate('/login');
            }
         });
      }, 1000);
    }
  });

  return () => {
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
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // 如果沒有 Session，可能是 Token 過期或被清除了
        throw new Error('驗證階段已過期，請重新點擊信件中的邀請連結');
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
         setError('連線逾時，請重新整理頁面後再試一次');
      } else {
         setError(err.message || '密碼更新失敗，請稍後再試');
      }
    } finally {
      setLoading(false);
    }
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
          {success ? (
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
                  <span>{error}</span>
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