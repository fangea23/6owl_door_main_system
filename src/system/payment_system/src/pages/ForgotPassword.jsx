import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // 這裡不用 useNavigate，因為我們要用 Link 回登入頁
import { supabase } from '../supabaseClient';
import { Mail, Loader2, ArrowRight, ArrowLeft, KeyRound, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false); // 狀態：是否發送成功
  const [error, setError] = useState(null);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Supabase 發送重設密碼信件
      // redirectTo: 當使用者點擊信中連結時，要導向回來的頁面 (我們稍後會在 App.jsx 設定這個路由)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setSuccess(true); // 顯示成功訊息
    } catch (err) {
      setError('發送失敗：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      
      {/* 左側：形象區 (與登入頁類似，但換個圖示) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-900 overflow-hidden items-center justify-center">
        <div className="absolute w-[500px] h-[500px] bg-emerald-800 rounded-full blur-3xl opacity-50 -top-20 -left-20"></div>
        <div className="absolute w-[300px] h-[300px] bg-emerald-600 rounded-full blur-3xl opacity-30 bottom-10 right-10"></div>
        
        <div className="relative z-10 text-white p-12 max-w-lg text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center mb-8 border border-white/20 mx-auto">
             <KeyRound size={40} className="text-emerald-300" />
          </div>
          <h2 className="text-3xl font-bold mb-4">忘記密碼了嗎？</h2>
          <p className="text-emerald-100 text-lg leading-relaxed">
            別擔心，這種事很常發生。<br/>輸入您的電子信箱，我們將協助您重設密碼。
          </p>
        </div>
      </div>

      {/* 右側：表單區 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-gray-50">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          
          <div className="mb-6">
            <Link to="/login" className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
               <ArrowLeft size={16}/> 返回登入
            </Link>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">重設您的密碼</h2>
            <p className="mt-2 text-sm text-gray-500">輸入您註冊時使用的電子信箱</p>
          </div>

          {success ? (
            // --- 成功發送後的畫面 ---
            <div className="text-center py-6 animate-fade-in">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">信件已發送！</h3>
                <p className="text-gray-600 text-sm mb-6">
                如果 <strong>{email}</strong> 已註冊為我們的會員，
                系統將會發送一封重設密碼的信件至該信箱。
                <br/><br/>
                若您未收到信件，請檢查垃圾郵件夾，或確認該信箱是否已註冊。
                </p>
              <button 
                onClick={() => setSuccess(false)} // 讓使用者可以重新輸入
                className="text-sm text-emerald-600 font-bold hover:underline"
              >
                沒收到？重新發送
              </button>
            </div>
          ) : (
            // --- 輸入 Email 的表單 ---
            <form className="space-y-6" onSubmit={handleResetPassword}>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2">
                  <span className="font-bold">錯誤：</span> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">電子信箱</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors bg-gray-50 focus:bg-white"
                    placeholder="name@company.com"
                  />
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
                    發送中...
                  </>
                ) : (
                  <>
                    發送重設連結 <ArrowRight className="ml-2 h-4 w-4" />
                  </>
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