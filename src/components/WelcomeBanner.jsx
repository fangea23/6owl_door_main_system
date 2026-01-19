import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import { useAuth } from '../contexts/AuthContext';
import { 
  Sun, 
  Moon, 
  CloudSun, 
  Sparkles, 
  CalendarDays,
  Clock,
  Quote // 新增引用圖示
} from 'lucide-react';

export default function WelcomeBanner() {
  const { user } = useAuth();
  const [employeeName, setEmployeeName] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  // 1. 抓取員工姓名 & 設定時間
  useEffect(() => {
    const fetchEmployeeName = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('employees')
          .select('name')
          .eq('user_id', user.id)
          .single();
        if (data?.name) setEmployeeName(data.name);
      } catch (err) {
        console.error(err);
      }
    };
    fetchEmployeeName();

    // 設定日期格式
    const date = new Date();
    const dateStr = date.toLocaleDateString('zh-TW', { 
      month: 'long', 
      day: 'numeric', 
      weekday: 'long' 
    });
    setCurrentDate(dateStr);

    // 設定時間 (每分鐘更新一次)
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);

    return () => clearInterval(timer);
  }, [user]);

  // 2. 根據時間決定問候語與圖示
  const getGreetingData = () => {
    const hour = new Date().getHours();
    if (hour < 6) return { text: '夜深了', icon: Moon, color: 'text-indigo-200' };
    if (hour < 11) return { text: '早安', icon: Sun, color: 'text-amber-300' };
    if (hour < 14) return { text: '午安', icon: CloudSun, color: 'text-sky-300' };
    if (hour < 18) return { text: '下午好', icon: Sun, color: 'text-orange-300' };
    return { text: '晚安', icon: Moon, color: 'text-indigo-200' };
  };

  const { text: greetingText, icon: GreetingIcon, color: iconColor } = getGreetingData();
  const displayName = employeeName || user?.user_metadata?.full_name || '夥伴';

  return (
    <div className="relative overflow-hidden rounded-3xl mb-8 sm:mb-10 text-white shadow-2xl shadow-red-900/20 group isolate">
      
      {/* === 背景層 === */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-950 via-red-900 to-rose-950" />
      <div className="absolute inset-0 opacity-10 mix-blend-overlay" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '24px 24px' }}>
      </div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-red-500/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-amber-600/20 rounded-full blur-[80px]" />

      {/* === 內容層 === */}
      <div className="relative z-10 p-6 sm:p-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
        
        {/* 左側：問候語 & 主要訊息 */}
        <div className="flex-1 space-y-5 max-w-3xl">
          {/* Badge */}
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-white/10 text-amber-300 border border-white/10 backdrop-blur-md shadow-sm">
              <Sparkles size={12} />
              INTERNAL PORTAL
            </span>
          </div>

          {/* Main Title */}
          <div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight drop-shadow-sm flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center justify-center p-2 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 ${iconColor}`}>
                <GreetingIcon size={32} className="sm:w-9 sm:h-9" />
              </span>
              <span>{greetingText}，{displayName}</span>
            </h2>
            <div className="h-1.5 w-24 bg-gradient-to-r from-amber-400 to-transparent rounded-full mt-4 opacity-80" />
          </div>

          {/* Subtitle - 選項 B：簡潔俐落風 */}
          <p className="text-red-50/90 text-sm sm:text-base lg:text-lg font-light leading-relaxed tracking-wide">
            歡迎登入企業入口網站。請從下方選擇您需要的服務，開啟高效的一天。
          </p>
        </div>

        {/* 右側：日期與時間小卡 (替代原本的統計數據) */}
        <div className="hidden md:flex flex-col items-end gap-2">
          <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 min-w-[180px] text-right shadow-lg">
            <div className="flex items-center justify-end gap-2 text-amber-200 mb-1">
              <CalendarDays size={16} />
              <span className="text-xs font-bold tracking-wider uppercase">TODAY</span>
            </div>
            <div className="text-xl font-bold text-white mb-1">
              {currentDate}
            </div>
            <div className="flex items-center justify-end gap-1.5 text-red-200/80 text-sm font-mono">
              <Clock size={14} />
              {currentTime}
            </div>
          </div>
          
          <div className="flex items-center gap-2 text-white/40 text-xs italic">
            <Quote size={12} className="scale-x-[-1]" />
            <span>Have a productive day</span>
          </div>
        </div>

      </div>
    </div>
  );
}