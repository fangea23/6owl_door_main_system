import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

const BASE_PATH = '/systems/meeting-room';

// 時間格式化
const formatTime = (time) => {
  if (!time) return '';
  return time.substring(0, 5);
};

// 日期格式化
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', weekday: 'short' });
};

// 狀態標籤
const StatusBadge = ({ status }) => {
  const config = {
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: '待審核' },
    approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: '已核准' },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: '已拒絕' },
    cancelled: { color: 'bg-stone-100 text-stone-500', icon: XCircle, label: '已取消' },
  };
  const { color, icon: Icon, label } = config[status] || config.pending;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  // 取得本週日期範圍
  const getWeekDates = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  };

  const weekDates = getWeekDates(selectedDate);

  // 取得預約資料
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const startOfWeek = weekDates[0].toISOString().split('T')[0];
        const endOfWeek = weekDates[6].toISOString().split('T')[0];

        const { data, error } = await supabase
          .from('bookings')
          .select(`
            *,
            rooms (id, name, location, capacity)
          `)
          .gte('booking_date', startOfWeek)
          .lte('booking_date', endOfWeek)
          .order('booking_date', { ascending: true })
          .order('start_time', { ascending: true });

        if (error) throw error;
        setBookings(data || []);
      } catch (err) {
        console.error('載入預約資料失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [selectedDate]);

  // 週導航
  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  // 依日期分組預約
  const groupedBookings = bookings.reduce((acc, booking) => {
    const date = booking.booking_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(booking);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">預約總覽</h2>
          <p className="text-stone-500 text-sm mt-1">查看並管理會議室預約</p>
        </div>
        <button
          onClick={() => navigate(`${BASE_PATH}/booking`)}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          新增預約
        </button>
      </div>

      {/* 週選擇器 */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <p className="text-sm text-stone-500">
              {weekDates[0].toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
            </p>
            <p className="font-bold text-stone-800">
              {weekDates[0].getDate()} - {weekDates[6].getDate()} 日
            </p>
          </div>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 週日曆 */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayBookings = groupedBookings[dateStr] || [];
            const isToday = date.toDateString() === new Date().toDateString();

            return (
              <div
                key={idx}
                className={`p-2 rounded-lg text-center cursor-pointer transition-colors ${
                  isToday ? 'bg-amber-50 border-2 border-amber-300' : 'bg-stone-50 hover:bg-stone-100'
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <p className="text-xs text-stone-500">
                  {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
                </p>
                <p className={`text-lg font-bold ${isToday ? 'text-amber-600' : 'text-stone-700'}`}>
                  {date.getDate()}
                </p>
                {dayBookings.length > 0 && (
                  <div className="mt-1">
                    <span className="inline-block w-2 h-2 bg-amber-400 rounded-full" />
                    <span className="text-xs text-stone-500 ml-1">{dayBookings.length}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 預約列表 */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="p-4 border-b border-stone-100">
          <h3 className="font-bold text-stone-800">本週預約</h3>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-amber-500" size={32} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12 text-stone-500">
            <Calendar size={48} className="mx-auto mb-3 text-stone-300" />
            <p>本週沒有預約</p>
            <button
              onClick={() => navigate(`${BASE_PATH}/booking`)}
              className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
            >
              立即預約會議室
            </button>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {Object.entries(groupedBookings).map(([date, dayBookings]) => (
              <div key={date} className="p-4">
                <p className="text-sm font-bold text-stone-500 mb-3">
                  {formatDate(date)}
                </p>
                <div className="space-y-3">
                  {dayBookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-start gap-4 p-3 bg-stone-50 rounded-lg hover:bg-amber-50 transition-colors cursor-pointer"
                      onClick={() => navigate(`${BASE_PATH}/booking/${booking.id}`)}
                    >
                      {/* 時間 */}
                      <div className="text-center shrink-0">
                        <p className="text-lg font-bold text-amber-600">
                          {formatTime(booking.start_time)}
                        </p>
                        <p className="text-xs text-stone-400">
                          {formatTime(booking.end_time)}
                        </p>
                      </div>

                      {/* 詳情 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-stone-800 truncate">
                            {booking.title}
                          </h4>
                          <StatusBadge status={booking.status} />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-stone-500">
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {booking.rooms?.name || '未指定'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            {booking.attendees_count || 0} 人
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {booking.booker_name}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
