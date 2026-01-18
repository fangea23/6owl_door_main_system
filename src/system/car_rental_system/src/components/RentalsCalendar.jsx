import React, { useMemo, useState, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import zhTW from 'date-fns/locale/zh-TW';
import { parseISO } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// 設定語系
const locales = {
  'zh-TW': zhTW,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// ✅ 修正：把輔助函式移到元件外面 (這樣就不會有順序問題)
const getStatusLabel = (status) => {
  const map = {
    pending: '待審',
    approved: '已核',
    confirmed: '待取',
    in_progress: '用車中',
    completed: '已還',
    cancelled: '取消',
    rejected: '拒絕'
  };
  return map[status] || status;
};

export const RentalsCalendar = ({ rentals = [] }) => {
  // State 管理：自己控制日期與視圖
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState(Views.MONTH);

  // 處理導航事件
  const onNavigate = useCallback((newDate) => {
    setDate(newDate);
  }, []);

  // 處理視圖切換事件
  const onView = useCallback((newView) => {
    setView(newView);
  }, []);

  const events = useMemo(() => {
    if (!rentals) return [];
    
    return rentals.map(rental => {
      // 🎨 顏色設定邏輯
      let color = '#6b7280'; // 預設灰色
      
      switch (rental.status) {
        case 'pending':   
          color = '#8b5cf6'; // 紫色 (待審核)
          break;
        case 'approved':  
        case 'confirmed': 
          color = '#2563eb'; // 藍色 (已核准/待取車)
          break;
        case 'in_progress': 
          color = '#d97706'; // 琥珀色 (進行中)
          break;
        case 'completed': 
          color = '#059669'; // 綠色 (已還車)
          break;
        case 'cancelled': 
        case 'rejected':
          color = '#ef4444'; // 紅色 (已取消/拒絕)
          break;
        default:
          color = '#6b7280';
      }

      // 檢查日期是否存在
      if (!rental.start_date || !rental.end_date) return null;

      return {
        id: rental.id,
        // ✅ 這裡現在可以安全呼叫 getStatusLabel 了
        title: `[${getStatusLabel(rental.status)}] ${rental.vehicle?.plate_number || '未排車'} - ${rental.renter?.name || '未知'}`,
        start: parseISO(rental.start_date), 
        end: parseISO(rental.end_date),     
        resource: rental,
        style: { backgroundColor: color }
      };
    }).filter(Boolean);
  }, [rentals]);

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: event.style.backgroundColor,
      borderRadius: '4px',
      opacity: 0.9,
      color: 'white',
      border: '0px',
      display: 'block',
      fontSize: '0.85em'
    }
  });

  return (
    <div className="h-full w-full bg-white p-2 shadow-sm rounded-lg border border-gray-200">
      <Calendar
        localizer={localizer}
        events={events}
        
        // 受控屬性
        date={date}
        view={view}
        onNavigate={onNavigate}
        onView={onView}

        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        culture="zh-TW"
        views={['month', 'week', 'day', 'agenda']}
        
        eventPropGetter={eventStyleGetter}
        messages={{
          next: "下期間",
          previous: "上期間",
          today: "今天",
          month: "月",
          week: "週",
          day: "日",
          agenda: "列表",
          date: "日期",
          time: "時間",
          event: "行程",
          noEventsInRange: "此期間無租借紀錄"
        }}
        onSelectEvent={(event) => alert(
            `狀態：${getStatusLabel(event.resource.status)}\n車輛：${event.resource.vehicle?.plate_number || '未指定'}\n申請人：${event.resource.renter?.name}\n時間：${event.resource.start_date} ~ ${event.resource.end_date}`
        )}
      />
    </div>
  );
};