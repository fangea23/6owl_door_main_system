import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { usePermission, PermissionGuard } from '../../../../hooks/usePermission';
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
  AlertCircle,
  LayoutList,
  LayoutGrid,
  User
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

// 完整日期格式化
const formatFullDate = (date) => {
  return date.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
};

// 狀態標籤
const StatusBadge = ({ status, size = 'normal' }) => {
  const config = {
    pending: { color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle, label: '待審核' },
    approved: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: '已核准' },
    rejected: { color: 'bg-red-100 text-red-700', icon: XCircle, label: '已拒絕' },
    cancelled: { color: 'bg-stone-100 text-stone-500', icon: XCircle, label: '已取消' },
  };
  const { color, icon: Icon, label } = config[status] || config.pending;

  if (size === 'small') {
    return (
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium ${color}`}>
        <Icon size={10} />
        {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

// 時間段定義 (每30分鐘一個時段，從08:00到21:00)
const TIME_SLOTS = [];
for (let h = 8; h <= 21; h++) {
  for (let m = 0; m < 60; m += 30) {
    if (h === 21 && m > 0) break;
    TIME_SLOTS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('schedule'); // 'list' | 'schedule'

  // RBAC 權限檢查
  const { hasPermission: canCreate } = usePermission('meeting.booking.create');
  const { hasPermission: canCancelOwn } = usePermission('meeting.booking.cancel.own');
  const { hasPermission: canCancelAll } = usePermission('meeting.booking.cancel.all');

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

  // 將日期轉換為 YYYY-MM-DD 格式 (避免時區問題)
  const toDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 取得預約資料和會議室資料
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const startOfWeek = toDateString(weekDates[0]);
        const endOfWeek = toDateString(weekDates[6]);

        // 同時取得預約和會議室資料
        const [bookingsRes, roomsRes] = await Promise.all([
          supabase
            .from('bookings')
            .select(`
              *,
              rooms (id, name, location, capacity)
            `)
            .gte('booking_date', startOfWeek)
            .lte('booking_date', endOfWeek)
            .order('booking_date', { ascending: true })
            .order('start_time', { ascending: true }),
          supabase
            .from('rooms')
            .select('*')
            .eq('is_active', true)
            .order('name')
        ]);

        if (bookingsRes.error) throw bookingsRes.error;
        if (roomsRes.error) throw roomsRes.error;

        setBookings(bookingsRes.data || []);
        setRooms(roomsRes.data || []);
      } catch (err) {
        console.error('載入資料失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  // 週導航
  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(newDate);
  };

  // 日期導航 (單日)
  const navigateDay = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
  };

  // 依日期分組預約 (用於列表視圖)
  const groupedBookings = bookings.reduce((acc, booking) => {
    const date = booking.booking_date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(booking);
    return acc;
  }, {});

  // 取得選中日期的預約
  const selectedDateStr = toDateString(selectedDate);
  const selectedDateBookings = bookings.filter(b => b.booking_date === selectedDateStr);

  // 檢查某個時段是否有預約
  const getBookingForSlot = (roomId, timeSlot) => {
    return selectedDateBookings.find(booking => {
      if (booking.room_id !== roomId) return false;
      const startTime = formatTime(booking.start_time);
      const endTime = formatTime(booking.end_time);
      return timeSlot >= startTime && timeSlot < endTime;
    });
  };

  // 取得預約在時間軸上的起始位置和寬度
  const getBookingSpan = (booking, timeSlot) => {
    const startTime = formatTime(booking.start_time);
    const endTime = formatTime(booking.end_time);

    if (timeSlot !== startTime) return null;

    const startIdx = TIME_SLOTS.indexOf(startTime);
    const endIdx = TIME_SLOTS.indexOf(endTime);
    const span = endIdx - startIdx;

    return span > 0 ? span : 1;
  };

  // 狀態對應的顏色
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 border-yellow-300 text-yellow-800',
      approved: 'bg-green-100 border-green-300 text-green-800',
      rejected: 'bg-red-100 border-red-300 text-red-800',
      cancelled: 'bg-stone-100 border-stone-300 text-stone-500',
    };
    return colors[status] || colors.pending;
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">預約總覽</h2>
          <p className="text-stone-500 text-sm mt-1">查看並管理會議室預約</p>
        </div>
        <div className="flex items-center gap-3">
          {/* 視圖切換 */}
          <div className="flex items-center bg-stone-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('schedule')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'schedule'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              <LayoutGrid size={16} />
              時間表
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-stone-600 hover:text-stone-800'
              }`}
            >
              <LayoutList size={16} />
              列表
            </button>
          </div>
          <PermissionGuard permission="meeting.booking.create">
            <button
              onClick={() => navigate(`${BASE_PATH}/booking`)}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
            >
              <Plus size={18} />
              新增預約
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* 週選擇器 */}
      <div className="bg-white rounded-xl border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            title="上一週"
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
            title="下一週"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* 週日曆 */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date, idx) => {
            const dateStr = toDateString(date);
            const dayBookings = groupedBookings[dateStr] || [];
            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = dateStr === selectedDateStr;

            return (
              <button
                key={idx}
                type="button"
                className={`p-2 rounded-lg text-center transition-all ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-300'
                    : isToday
                      ? 'bg-amber-50 border-2 border-amber-300 hover:bg-amber-100'
                      : 'bg-stone-50 hover:bg-stone-100'
                }`}
                onClick={() => setSelectedDate(date)}
              >
                <p className={`text-xs ${isSelected ? 'text-amber-100' : 'text-stone-500'}`}>
                  {['日', '一', '二', '三', '四', '五', '六'][date.getDay()]}
                </p>
                <p className={`text-lg font-bold ${
                  isSelected ? 'text-white' : isToday ? 'text-amber-600' : 'text-stone-700'
                }`}>
                  {date.getDate()}
                </p>
                {dayBookings.length > 0 && (
                  <div className="mt-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${
                      isSelected ? 'bg-white' : 'bg-amber-400'
                    }`} />
                    <span className={`text-xs ml-1 ${isSelected ? 'text-amber-100' : 'text-stone-500'}`}>
                      {dayBookings.length}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 回到今天按鈕 */}
        {toDateString(new Date()) !== selectedDateStr && (
          <div className="mt-3 text-center">
            <button
              onClick={() => setSelectedDate(new Date())}
              className="text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              回到今天
            </button>
          </div>
        )}
      </div>

      {/* 時間表視圖 */}
      {viewMode === 'schedule' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {/* 日期標題與導航 */}
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <button
              onClick={() => navigateDay(-1)}
              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <h3 className="font-bold text-stone-800">{formatFullDate(selectedDate)}</h3>
              <p className="text-sm text-stone-500">{selectedDateBookings.length} 筆預約</p>
            </div>
            <button
              onClick={() => navigateDay(1)}
              className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <MapPin size={48} className="mx-auto mb-3 text-stone-300" />
              <p>尚無會議室資料</p>
              <button
                onClick={() => navigate(`${BASE_PATH}/rooms`)}
                className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
              >
                新增會議室
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="bg-stone-50">
                    <th className="text-left p-3 border-b border-r border-stone-200 font-bold text-stone-700 sticky left-0 bg-stone-50 z-10 min-w-[120px]">
                      會議室
                    </th>
                    {TIME_SLOTS.map((slot, idx) => (
                      <th
                        key={slot}
                        className={`p-2 border-b border-stone-200 text-xs font-medium text-stone-500 min-w-[60px] ${
                          idx % 2 === 0 ? 'border-l border-stone-200' : ''
                        }`}
                      >
                        {slot}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room) => {
                    // 追蹤已渲染的預約，避免重複
                    const renderedBookings = new Set();

                    return (
                      <tr key={room.id} className="hover:bg-stone-50/50">
                        <td className="p-3 border-b border-r border-stone-200 sticky left-0 bg-white z-10">
                          <div className="font-medium text-stone-800">{room.name}</div>
                          <div className="text-xs text-stone-500 flex items-center gap-1">
                            <MapPin size={10} />
                            {room.location || '未設定'}
                          </div>
                        </td>
                        {TIME_SLOTS.map((slot, idx) => {
                          const booking = getBookingForSlot(room.id, slot);

                          if (booking) {
                            // 如果這個預約已經渲染過，跳過
                            if (renderedBookings.has(booking.id)) {
                              return null;
                            }

                            const span = getBookingSpan(booking, slot);
                            if (span) {
                              renderedBookings.add(booking.id);
                              return (
                                <td
                                  key={slot}
                                  colSpan={span}
                                  className={`p-1 border-b border-stone-200 ${idx % 2 === 0 ? 'border-l' : ''}`}
                                >
                                  <div
                                    className={`p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md ${getStatusColor(booking.status)}`}
                                    onClick={() => navigate(`${BASE_PATH}/booking/${booking.id}`)}
                                  >
                                    <div className="font-medium text-sm truncate">{booking.title}</div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs flex items-center gap-0.5">
                                        <User size={10} />
                                        {booking.booker_name}
                                      </span>
                                      <StatusBadge status={booking.status} size="small" />
                                    </div>
                                    <div className="text-xs mt-1 opacity-75">
                                      {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                                    </div>
                                  </div>
                                </td>
                              );
                            }
                          }

                          // 空白時段
                          return (
                            <td
                              key={slot}
                              className={`p-1 border-b border-stone-200 ${idx % 2 === 0 ? 'border-l' : ''}`}
                            >
                              <div className="h-16 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                onClick={() => navigate(`${BASE_PATH}/booking?room=${room.id}&date=${selectedDateStr}&time=${slot}`)}
                                title={`預約 ${room.name} - ${slot}`}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* 圖例 */}
          <div className="p-4 border-t border-stone-100 bg-stone-50">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-stone-500">圖例：</span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" />
                待審核
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-green-100 border border-green-300" />
                已核准
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-red-100 border border-red-300" />
                已拒絕
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded bg-stone-100 border border-stone-300" />
                已取消
              </span>
              <span className="flex items-center gap-1 ml-4">
                <span className="w-3 h-3 rounded bg-amber-50 border border-amber-200" />
                點擊空白處可快速預約
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 列表視圖 */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-bold text-stone-800">{formatFullDate(selectedDate)} 的預約</h3>
            <span className="text-sm text-stone-500">{selectedDateBookings.length} 筆預約</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="animate-spin text-amber-500" size={32} />
            </div>
          ) : selectedDateBookings.length === 0 ? (
            <div className="text-center py-12 text-stone-500">
              <Calendar size={48} className="mx-auto mb-3 text-stone-300" />
              <p>這天沒有預約</p>
              <button
                onClick={() => navigate(`${BASE_PATH}/booking`)}
                className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
              >
                立即預約會議室
              </button>
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {selectedDateBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start gap-4 p-4 hover:bg-amber-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`${BASE_PATH}/booking/${booking.id}`)}
                >
                  {/* 時間 */}
                  <div className="text-center shrink-0 w-16">
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
                        <User size={14} />
                        {booking.booker_name}
                      </span>
                    </div>
                    {booking.description && (
                      <p className="mt-2 text-sm text-stone-400 line-clamp-1">
                        {booking.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 本週所有預約 (僅在列表模式顯示) */}
      {viewMode === 'list' && Object.keys(groupedBookings).length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-100">
            <h3 className="font-bold text-stone-800">本週其他預約</h3>
          </div>
          <div className="divide-y divide-stone-100">
            {Object.entries(groupedBookings)
              .filter(([date]) => date !== selectedDateStr)
              .map(([date, dayBookings]) => (
                <div key={date} className="p-4">
                  <button
                    className="text-sm font-bold text-amber-600 hover:text-amber-700 mb-2 flex items-center gap-1"
                    onClick={() => setSelectedDate(new Date(date + 'T00:00:00'))}
                  >
                    <Calendar size={14} />
                    {formatDate(date)} ({dayBookings.length} 筆)
                  </button>
                  <div className="space-y-2">
                    {dayBookings.slice(0, 3).map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center gap-3 text-sm text-stone-600 hover:text-stone-800 cursor-pointer"
                        onClick={() => navigate(`${BASE_PATH}/booking/${booking.id}`)}
                      >
                        <span className="font-medium text-amber-600 w-12">
                          {formatTime(booking.start_time)}
                        </span>
                        <span className="truncate flex-1">{booking.title}</span>
                        <span className="text-stone-400">{booking.rooms?.name}</span>
                      </div>
                    ))}
                    {dayBookings.length > 3 && (
                      <p className="text-xs text-stone-400">
                        還有 {dayBookings.length - 3} 筆預約...
                      </p>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
