import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  ChevronLeft,
  Save,
  Loader2,
  AlertCircle,
  Trash2
} from 'lucide-react';

const BASE_PATH = '/systems/meeting-room';

const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200 text-stone-700 font-bold text-lg">
    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
      <Icon size={20} />
    </div>
    <h3>{title}</h3>
  </div>
);

export default function BookingForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const isEditMode = !!id;

  // 從 URL 參數取得預設值（從時間表視圖快速預約）
  const urlRoom = searchParams.get('room') || '';
  const urlDate = searchParams.get('date') || '';
  const urlTime = searchParams.get('time') || '';

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rooms, setRooms] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [conflicts, setConflicts] = useState([]);

  // 計算預設結束時間（開始時間 + 1 小時）
  const getDefaultEndTime = (startTime) => {
    if (!startTime) return '';
    const [h, m] = startTime.split(':').map(Number);
    const endHour = h + 1;
    if (endHour > 21) return '21:30';
    return `${String(endHour).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState({
    title: '',
    room_id: urlRoom,
    booking_date: urlDate,
    start_time: urlTime,
    end_time: getDefaultEndTime(urlTime),
    attendees_count: '',
    description: '',
    booker_name: '',
    booker_email: '',
    booker_phone: '',
  });

  // 載入會議室列表
  useEffect(() => {
    const fetchRooms = async () => {
      const { data } = await supabase
        .from('rooms')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setRooms(data || []);
    };
    fetchRooms();
  }, []);

  // 載入編輯資料
  useEffect(() => {
    if (isEditMode) {
      const fetchBooking = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', id)
          .single();

        if (data) {
          setFormData({
            title: data.title || '',
            room_id: data.room_id || '',
            booking_date: data.booking_date || '',
            start_time: data.start_time?.substring(0, 5) || '',
            end_time: data.end_time?.substring(0, 5) || '',
            attendees_count: data.attendees_count || '',
            description: data.description || '',
            booker_name: data.booker_name || '',
            booker_email: data.booker_email || '',
            booker_phone: data.booker_phone || '',
          });
        }
        setLoading(false);
      };
      fetchBooking();
    } else if (user) {
      setFormData(prev => ({
        ...prev,
        booker_name: user.user_metadata?.full_name || user.email?.split('@')[0] || '',
        booker_email: user.email || '',
      }));
    }
  }, [id, user]);

  // 檢查時間衝突
  useEffect(() => {
    const checkConflicts = async () => {
      if (!formData.room_id || !formData.booking_date || !formData.start_time || !formData.end_time) {
        setConflicts([]);
        return;
      }

      // 建立查詢
      let query = supabase
        .from('bookings')
        .select('id, title, start_time, end_time')
        .eq('room_id', formData.room_id)
        .eq('booking_date', formData.booking_date)
        .neq('status', 'cancelled');

      // 只有在編輯模式且有有效的 id 時才排除當前預約
      if (isEditMode && id) {
        query = query.neq('id', id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('檢查衝突失敗:', error);
        return;
      }

      const overlapping = (data || []).filter(booking => {
        const existingStart = booking.start_time.substring(0, 5);
        const existingEnd = booking.end_time.substring(0, 5);
        return (
          (formData.start_time < existingEnd && formData.end_time > existingStart)
        );
      });

      setConflicts(overlapping);
    };

    checkConflicts();
  }, [formData.room_id, formData.booking_date, formData.start_time, formData.end_time, id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 將 Supabase 錯誤轉換為中文訊息
  const translateError = (error) => {
    const message = error?.message || '';

    // 常見的 Supabase 錯誤訊息對照
    if (message.includes('duplicate key') || message.includes('unique constraint')) {
      return '此時段已被預約，請選擇其他時間';
    }
    if (message.includes('violates foreign key')) {
      return '選擇的會議室不存在，請重新選擇';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return '網路連線異常，請檢查網路後重試';
    }
    if (message.includes('timeout')) {
      return '伺服器回應超時，請稍後再試';
    }
    if (message.includes('permission') || message.includes('denied')) {
      return '您沒有權限執行此操作';
    }
    if (message.includes('not found')) {
      return '找不到相關資料，請重新整理頁面';
    }
    if (message.includes('invalid') || message.includes('malformed')) {
      return '輸入資料格式不正確，請檢查後重試';
    }

    // 預設訊息
    return '操作失敗，請稍後再試或聯繫系統管理員';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 檢查時間衝突
    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(c =>
        `「${c.title}」(${c.start_time.substring(0, 5)} - ${c.end_time.substring(0, 5)})`
      ).join('、');
      setErrorMsg(`該時段與以下預約衝突：${conflictDetails}，請選擇其他時間`);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        ...formData,
        user_id: user?.id,
        status: 'approved', // 直接核准，無需審核
        attendees_count: parseInt(formData.attendees_count) || 0,
      };

      if (isEditMode) {
        const { error } = await supabase
          .from('bookings')
          .update(payload)
          .eq('id', id);
        if (error) throw error;
        alert('預約已更新！');
      } else {
        const { error } = await supabase
          .from('bookings')
          .insert([payload]);
        if (error) throw error;
        alert('預約成功！');
      }

      navigate(`${BASE_PATH}/dashboard`);
    } catch (error) {
      console.error('預約提交錯誤:', error);
      setErrorMsg(translateError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('確定要取消此預約嗎？')) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      alert('預約已取消');
      navigate(`${BASE_PATH}/dashboard`);
    } catch (error) {
      console.error('取消預約錯誤:', error);
      setErrorMsg(translateError(error));
    }
  };

  // 產生時間選項
  const timeOptions = [];
  for (let h = 8; h <= 21; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      timeOptions.push(time);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin text-amber-500" size={40} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate(`${BASE_PATH}/dashboard`)}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-bold text-stone-800">
            {isEditMode ? '編輯預約' : '新增預約'}
          </h2>
          <p className="text-stone-500 text-sm">
            {isEditMode ? 'Edit Booking' : 'New Meeting Room Booking'}
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <p>{errorMsg}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 基本資訊 */}
        <section className="bg-white p-6 rounded-xl border border-stone-200">
          <SectionTitle icon={FileText} title="預約資訊" />

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                會議名稱 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                placeholder="例：週會、客戶會議..."
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                會議說明
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="會議內容或備註事項..."
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* 時間地點 */}
        <section className="bg-white p-6 rounded-xl border border-stone-200">
          <SectionTitle icon={Calendar} title="時間與地點" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                會議室 <span className="text-red-500">*</span>
              </label>
              <select
                name="room_id"
                value={formData.room_id}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="">請選擇會議室</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.name} ({room.location}) - 容納 {room.capacity} 人
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                預約日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="booking_date"
                value={formData.booking_date}
                onChange={handleChange}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                預計人數
              </label>
              <input
                type="number"
                name="attendees_count"
                value={formData.attendees_count}
                onChange={handleChange}
                min="1"
                placeholder="參與人數"
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                開始時間 <span className="text-red-500">*</span>
              </label>
              <select
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="">選擇開始時間</option>
                {timeOptions.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                結束時間 <span className="text-red-500">*</span>
              </label>
              <select
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="">選擇結束時間</option>
                {timeOptions.filter(t => t > formData.start_time).map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 衝突警告 */}
          {conflicts.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg animate-pulse">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full shrink-0">
                  <AlertCircle size={20} className="text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-red-700 font-bold text-base">
                    時段衝突提醒
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    您選擇的時段與以下預約重疊，請調整時間：
                  </p>
                  <div className="mt-3 space-y-2">
                    {conflicts.map(c => (
                      <div key={c.id} className="flex items-center gap-2 text-sm bg-white/60 p-2 rounded-lg border border-red-200">
                        <Clock size={14} className="text-red-500 shrink-0" />
                        <span className="font-medium text-red-800">{c.start_time.substring(0, 5)} - {c.end_time.substring(0, 5)}</span>
                        <span className="text-red-600">「{c.title}」</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-red-500 mt-3">
                    提示：請選擇不同的開始或結束時間來避免衝突
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 預約人資訊 */}
        <section className="bg-amber-50/50 p-6 rounded-xl border border-amber-100">
          <SectionTitle icon={Users} title="預約人資訊" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                姓名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="booker_name"
                value={formData.booker_name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                Email
              </label>
              <input
                type="email"
                name="booker_email"
                value={formData.booker_email}
                onChange={handleChange}
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1.5">
                電話
              </label>
              <input
                type="tel"
                name="booker_phone"
                value={formData.booker_phone}
                onChange={handleChange}
                placeholder="分機或手機"
                className="w-full rounded-lg border-stone-200 p-3 border bg-white focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>
        </section>

        {/* 提交按鈕 */}
        <div className="flex justify-between items-center pt-4 border-t border-stone-200">
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-2 text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={18} />
              取消預約
            </button>
          )}
          <div className={!isEditMode ? 'ml-auto' : ''}>
            <button
              type="submit"
              disabled={submitting || conflicts.length > 0}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-300 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  處理中...
                </>
              ) : (
                <>
                  <Save size={18} />
                  {isEditMode ? '儲存變更' : '送出預約申請'}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
