import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { User, Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function UserProfile() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: '', content: '' });

  // 一進來先讀取現有的名字
  useEffect(() => {
    if (user && user.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ type: '', content: '' });

    try {
      // 呼叫 Supabase 更新使用者 Metadata
      const { data, error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (error) throw error;

      setMsg({ type: 'success', content: '更新成功！請重新整理頁面以查看變更。' });
      
      // 選用：稍微延遲後重新整理，讓 Header 名字也能更新
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', content: '更新失敗：' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 md:p-10 mt-10 bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">個人資料設定</h2>
        <p className="text-gray-500 text-sm mt-1">
          設定您的顯示名稱，讓簽核流程更清楚
        </p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        
        {/* Email (唯讀) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">電子信箱 (帳號)</label>
          <input 
            type="email" 
            value={user?.email || ''} 
            disabled 
            className="w-full p-3 bg-gray-100 text-gray-500 rounded-lg border border-gray-200 cursor-not-allowed"
          />
        </div>

        {/* 全名輸入框 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            顯示全名 <span className="text-red-500">*</span>
          </label>
          <input 
            type="text" 
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="例如：王小明"
            required
            className="w-full p-3 bg-white text-gray-800 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
          />
          <p className="text-xs text-gray-400 mt-1">此名稱將顯示於申請單與簽核紀錄中</p>
        </div>

        {/* 訊息提示 */}
        {msg.content && (
          <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
            msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {msg.type === 'success' ? <CheckCircle size={16}/> : <AlertCircle size={16}/>}
            {msg.content}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg shadow-md transition-all flex justify-center items-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>}
          儲存變更
        </button>
      </form>
    </div>
  );
}