import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UpdatePassword() {
  const navigate = useNavigate();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // 檢查是否是透過 Email連結進來的 (Supabase 會在 URL hash 中帶 token)
  useEffect(() => {
    // 雖然 Supabase 會自動處理 session，但我們可以檢查一下 session 是否存在
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // 如果沒有 session，代表連結失效或使用者直接打網址進來
        setError('無效的連結或連結已過期，請重新申請重設密碼。');
      }
    });
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setError(null);

    // 1. 基本驗證
    if (password.length < 6) {
      return setError('密碼長度至少需要 6 個字元');
    }
    if (password !== confirmPassword) {
      return setError('兩次輸入的密碼不符');
    }

    setLoading(true);

    try {
      // 2. 呼叫 Supabase 更新密碼
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // 3. 成功
      setSuccess(true);
      
      // 3秒後自動導向登入頁
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setError('密碼更新失敗：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      
      {/* 左側：形象區 */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-900 overflow-hidden items-center justify-center">
        <div className="absolute w-[500px] h-[500px] bg-emerald-800 rounded-full blur-3xl opacity-50 -top-20 -left-20"></div>
        <div className="absolute w-[300px] h-[300px] bg-emerald-600 rounded-full blur-3xl opacity-30 bottom-10 right-10"></div>
        
        <div className="relative z-10 text-white p-12 max-w-lg text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-8 border border-white/20 mx-auto">
             <Lock size={40} className="text-emerald-300" />
          </div>
          <h2 className="text-3xl font-bold mb-4">設定新密碼</h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            為了您的帳戶安全，<br/>請設定一組強度足夠的新密碼。
          </p>
        </div>
      </div>

      {/* 右側：表單區 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">建立新密碼</h2>
            <p className="mt-2 text-sm text-gray-500">請輸入您的新密碼</p>
          </div>

          {success ? (
            // --- 成功畫面 ---
            <div className="text-center py-8 animate-fade-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">密碼修改成功！</h3>
              <p className="text-gray-600 text-sm mb-6">
                您的密碼已更新，系統將在 3 秒後自動導向登入頁面...
              </p>
              <button 
                onClick={() => navigate('/login')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors"
              >
                立即登入
              </button>
            </div>
          ) : (
            // --- 修改密碼表單 ---
            <form className="space-y-6" onSubmit={handleUpdatePassword}>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} /> {error}
                </div>
              )}

              <div className="space-y-4">
                {/* 新密碼 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">新密碼</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock size={20} />
                    </div>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 focus:bg-white"
                      placeholder="至少 6 個字元"
                    />
                  </div>
                </div>

                {/* 確認新密碼 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">確認新密碼</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                      <Lock size={20} />
                    </div>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-emerald-500 bg-gray-50 focus:bg-white ${
                        confirmPassword && password !== confirmPassword 
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                          : 'border-gray-300 focus:border-emerald-500'
                      }`}
                      placeholder="再次輸入密碼"
                    />
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                     <div className="text-xs text-red-500 mt-1">密碼不相符</div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || (confirmPassword && password !== confirmPassword)}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                    更新中...
                  </>
                ) : (
                  '確認修改密碼'
                )}
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-xs text-gray-400">
          </div>
        </div>
      </div>
    </div>
  );
}