import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Car, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Plus, 
  TrendingUp, 
  Calendar as CalendarIcon,
  ChevronRight,
  Activity,
  ArrowRightCircle,
  ArrowLeftCircle,
  Key // 👈 新增鑰匙圖示
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useRentals } from '../hooks/useRentals';
import { RentalsCalendar } from '../components/RentalsCalendar';
import { isSameDay, parseISO } from 'date-fns';
import toast from 'react-hot-toast'; // 👈 引入 toast 提示

export const Dashboard = () => {
  const { stats, loading: dashboardLoading } = useDashboard();
  // ✅ 修改：解構出操作函式
  const { rentals, loading: rentalsLoading, pickupVehicle, returnVehicle } = useRentals(null);

  const loading = dashboardLoading || rentalsLoading;

  // 計算今日動態數據
  const today = new Date();
  
  // ✅ 篩選：今日待取車清單 (狀態必須是 confirmed 且開始日期是今天)
  const departingTodayList = rentals.filter(r => {
    if (!r.start_date) return false;
    return isSameDay(parseISO(r.start_date), today) && r.status === 'confirmed';
  });

  // ✅ 篩選：今日待還車清單 (狀態必須是 in_progress 且結束日期是今天)
  const returningTodayList = rentals.filter(r => {
    if (!r.end_date) return false;
    return isSameDay(parseISO(r.end_date), today) && r.status === 'in_progress';
  });

  const statCards = [
    {
      title: '總車輛數',
      value: stats.totalVehicles,
      icon: Car,
      color: 'blue',
      link: '/systems/car-rental/vehicles',
      desc: '公司資產總覽'
    },
    {
      title: '目前可用',
      value: stats.availableVehicles,
      icon: CheckCircle,
      color: 'green',
      desc: '在庫可調度車輛'
    },
    {
      title: '借出中',
      value: stats.rentedVehicles,
      icon: Clock,
      color: 'orange',
      desc: '員工使用中'
    },
    {
      title: '維修保養',
      value: stats.maintenanceVehicles,
      icon: AlertCircle,
      color: 'red',
      desc: '暫停服務'
    },
    {
      title: '待審核申請',
      value: stats.pendingRequests,
      icon: CalendarIcon,
      color: 'purple',
      link: '/systems/car-rental/requests',
      desc: '需主管簽核'
    },
    {
      title: '本月累計使用',
      value: stats.completedRentalsThisMonth,
      icon: TrendingUp,
      color: 'indigo',
      desc: '車輛使用頻率'
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 text-blue-600 border-blue-200 group-hover:bg-blue-600 group-hover:text-white',
      green: 'bg-emerald-50 text-emerald-600 border-emerald-200 group-hover:bg-emerald-600 group-hover:text-white',
      orange: 'bg-orange-50 text-orange-600 border-orange-200 group-hover:bg-orange-600 group-hover:text-white',
      red: 'bg-rose-50 text-rose-600 border-rose-200 group-hover:bg-rose-600 group-hover:text-white',
      purple: 'bg-purple-50 text-purple-600 border-purple-200 group-hover:bg-purple-600 group-hover:text-white',
      indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200 group-hover:bg-indigo-600 group-hover:text-white',
    };
    return colors[color] || colors.blue;
  };

  // 操作處理函式
  const handlePickup = async (rental) => {
    if (window.confirm(`確認將鑰匙交給 ${rental.renter?.name} 嗎？\n車號：${rental.vehicle?.plate_number}`)) {
      const result = await pickupVehicle(rental.id);
      if (result.success) {
        toast.success('取車成功！狀態已更新為使用中');
      } else {
        toast.error('操作失敗：' + result.error);
      }
    }
  };

  const handleReturn = async (rental) => {
    // 這裡可以擴展成彈出視窗輸入里程，目前先做簡單確認
    if (window.confirm(`確認 ${rental.renter?.name} 已歸還車輛與鑰匙？\n車號：${rental.vehicle?.plate_number}`)) {
      const result = await returnVehicle(rental.id); // 若需輸入里程可在此傳入
      if (result.success) {
        toast.success('還車成功！車輛已釋放');
      } else {
        toast.error('操作失敗：' + result.error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-stone-200"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-red-600 absolute top-0 left-0"></div>
        </div>
        <p className="mt-4 text-stone-500 font-medium">載入系統資料中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">公務車管理系統</h1>
          <p className="text-stone-500 mt-1">即時掌握車輛動態與排程狀況</p>
        </div>
        <Link
          to="/systems/car-rental/requests/new"
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors shadow-md font-medium"
        >
          <Plus className="w-5 h-5" />
          新增用車申請
        </Link>
      </div>

      {/* 1. Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const colorClass = getColorClasses(stat.color);
          const Wrapper = stat.link ? Link : 'div';
          const wrapperProps = stat.link ? { to: stat.link } : {};

          return (
            <Wrapper
              key={index}
              {...wrapperProps}
              className={`group relative bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 ${stat.link ? 'cursor-pointer' : ''}`}
            >
              <div className="flex flex-col justify-between h-full gap-3">
                <div className="flex justify-between items-start">
                  <div className={`p-2.5 rounded-lg border transition-colors duration-300 ${colorClass}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  {stat.link && <ChevronRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500" />}
                </div>
                <div>
                  <div className="text-2xl font-bold text-stone-900">{stat.value}</div>
                  <div className="text-sm font-medium text-stone-600">{stat.title}</div>
                  <div className="text-xs text-stone-400 mt-0.5">{stat.desc}</div>
                </div>
              </div>
            </Wrapper>
          );
        })}
      </div>

      {/* 2. Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Calendar (佔 2/3 寬度) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="p-5 border-b border-stone-100 flex justify-between items-center bg-stone-50/50">
              <h2 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-stone-700" />
                車輛排程表
              </h2>
              <span className="text-xs font-medium px-2.5 py-1 bg-white border border-stone-200 text-stone-600 rounded-full shadow-sm">
                即時同步
              </span>
            </div>
            <div className="p-4 flex-1 min-h-[500px]">
               <RentalsCalendar rentals={rentals} />
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Operations (佔 1/3 寬度) */}
        <div className="space-y-6">
          
          {/* A. 今日動態 (互動版) */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-stone-100 bg-stone-50/30">
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                今日任務 ({new Date().toLocaleDateString('zh-TW', {month: 'numeric', day: 'numeric'})})
              </h3>
            </div>
            
            <div className="p-4 space-y-5">
                {/* 1. 出車任務區塊 */}
                <div>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ArrowRightCircle className="w-3.5 h-3.5" /> 待取車 (交接鑰匙)
                    </h4>
                    
                    {departingTodayList.length > 0 ? (
                        <div className="space-y-2">
                            {departingTodayList.map(rental => (
                                <div key={rental.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-stone-900 truncate">
                                            {rental.renter?.name || '未知'}
                                        </p>
                                        <p className="text-xs text-stone-500 truncate">
                                            {rental.vehicle?.plate_number}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handlePickup(rental)}
                                        className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
                                    >
                                        <Key className="w-3 h-3" />
                                        確認取車
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-stone-400 italic pl-1 py-2 bg-stone-50 rounded border border-dashed border-stone-200 text-center">
                            目前無待取車輛
                        </div>
                    )}
                </div>

                {/* 分隔線 */}
                <div className="border-t border-stone-100"></div>

                {/* 2. 還車任務區塊 */}
                <div>
                    <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <ArrowLeftCircle className="w-3.5 h-3.5" /> 待還車 (檢查車況)
                    </h4>
                    
                    {returningTodayList.length > 0 ? (
                        <div className="space-y-2">
                             {returningTodayList.map(rental => (
                                <div key={rental.id} className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-stone-900 truncate">
                                            {rental.renter?.name || '未知'}
                                        </p>
                                        <p className="text-xs text-stone-500 truncate">
                                            {rental.vehicle?.plate_number}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleReturn(rental)}
                                        className="ml-2 flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white text-xs font-medium rounded hover:bg-amber-700 transition-colors shadow-sm whitespace-nowrap"
                                    >
                                        <CheckCircle className="w-3 h-3" />
                                        確認歸還
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-stone-400 italic pl-1 py-2 bg-stone-50 rounded border border-dashed border-stone-200 text-center">
                            目前無待還車輛
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* B. 快速操作選單 */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-5">
            <h3 className="text-base font-bold text-stone-900 mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-stone-500" />
              管理功能
            </h3>
            <div className="space-y-2">
              <Link
                to="/systems/car-rental/vehicles"
                className="flex items-center p-3 rounded-lg hover:bg-stone-50 border border-stone-100 hover:border-stone-200 transition-all group"
              >
                <div className="p-2 bg-stone-100 text-stone-600 rounded-lg mr-3 group-hover:bg-stone-600 group-hover:text-white transition-colors">
                  <Car className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-stone-900">車輛清單管理</div>
                  <div className="text-xs text-stone-500">新增或維護車輛資料</div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 ml-auto group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                to="/systems/car-rental/requests"
                className="flex items-center p-3 rounded-lg hover:bg-stone-50 border border-stone-100 hover:border-stone-200 transition-all group"
              >
                <div className="p-2 bg-stone-100 text-stone-600 rounded-lg mr-3 group-hover:bg-stone-600 group-hover:text-white transition-colors">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-stone-900">申請單審核</div>
                  <div className="text-xs text-stone-500">處理員工用車申請</div>
                </div>
                {stats.pendingRequests > 0 && (
                  <span className="ml-auto bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {stats.pendingRequests}
                  </span>
                )}
              </Link>

              <Link
                to="/systems/car-rental/rentals" // 👈 連到新頁面
                className="flex items-center p-3 rounded-lg hover:bg-stone-50 border border-stone-100 hover:border-stone-200 transition-all group"
              >
                <div className="p-2 bg-stone-100 text-stone-600 rounded-lg mr-3 group-hover:bg-stone-600 group-hover:text-white transition-colors">
                  {/* 使用 Key 圖示代表租借管理 */}
                  <Key className="w-5 h-5" /> 
                </div>
                <div className="flex-1">
                  <div className="font-medium text-stone-900">租借記錄管理</div>
                  <div className="text-xs text-stone-500">執行取車、還車與記錄查詢</div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-300 ml-auto group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};