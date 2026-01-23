import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  Users,
  Calendar,
  Calculator,
  Settings,
  Clock,
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronRight,
  Building
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { usePermission, PermissionGuard } from '../../../../hooks/usePermission';

// 薪資系統的基礎路徑
const BASE_PATH = '/systems/payroll';

// 狀態對照表
const PERIOD_STATUS = {
  'draft': { label: '草稿', color: 'bg-stone-100 text-stone-600' },
  'open': { label: '開放輸入', color: 'bg-blue-100 text-blue-700' },
  'closed': { label: '已關閉', color: 'bg-amber-100 text-amber-700' },
  'calculating': { label: '計算中', color: 'bg-purple-100 text-purple-700' },
  'reviewing': { label: '審核中', color: 'bg-orange-100 text-orange-700' },
  'approved': { label: '已核准', color: 'bg-emerald-100 text-emerald-700' },
  'paid': { label: '已發薪', color: 'bg-green-100 text-green-700' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingAttendance: 0,
    pendingPayroll: 0,
  });

  // 權限檢查
  const { hasPermission: canManageGrades } = usePermission('payroll.salary_grades.manage');
  const { hasPermission: canManageInsurance } = usePermission('payroll.insurance.manage');
  const { hasPermission: canManageSettings } = usePermission('payroll.employee_settings.manage');
  const { hasPermission: canInputAttendance } = usePermission('payroll.attendance.input');
  const { hasPermission: canApproveAttendance } = usePermission('payroll.attendance.approve');
  const { hasPermission: canCalculate } = usePermission('payroll.payroll.calculate');
  const { hasPermission: canReview } = usePermission('payroll.payroll.review');
  const { hasPermission: canViewAll } = usePermission('payroll.payroll.view.all');

  // 員工姓名
  const [employeeName, setEmployeeName] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;

      setLoading(true);
      try {
        // 取得員工姓名
        const { data: empData } = await supabase
          .from('employees')
          .select('name')
          .eq('user_id', user.id)
          .single();

        if (empData?.name) {
          setEmployeeName(empData.name);
        }

        // 取得當前薪資週期
        const { data: periodData } = await supabase
          .from('payroll_periods')
          .select('*')
          .order('year', { ascending: false })
          .order('month', { ascending: false })
          .limit(1)
          .single();

        setCurrentPeriod(periodData);

        // 取得統計資料
        const { count: empCount } = await supabase
          .from('employees')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        // 取得待審核出勤數量
        let attendanceCount = 0;
        if (periodData) {
          const { count } = await supabase
            .from('monthly_attendance_summary')
            .select('*', { count: 'exact', head: true })
            .eq('period_id', periodData.id)
            .eq('status', 'submitted');
          attendanceCount = count || 0;
        }

        setStats({
          totalEmployees: empCount || 0,
          pendingAttendance: attendanceCount,
          pendingPayroll: 0,
        });

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const displayName = employeeName || user?.user_metadata?.full_name || user?.email;

  // 快速連結
  const quickLinks = [
    {
      title: '出勤輸入',
      description: '輸入本月員工出勤資料',
      icon: Clock,
      path: `${BASE_PATH}/attendance/input`,
      color: 'from-blue-500 to-cyan-500',
      show: canInputAttendance,
    },
    {
      title: '出勤審核',
      description: '審核各門市出勤資料',
      icon: CheckCircle2,
      path: `${BASE_PATH}/attendance/review`,
      color: 'from-emerald-500 to-teal-500',
      show: canApproveAttendance,
      badge: stats.pendingAttendance > 0 ? stats.pendingAttendance : null,
    },
    {
      title: '薪資計算',
      description: '執行薪資計算與審核',
      icon: Calculator,
      path: `${BASE_PATH}/payroll`,
      color: 'from-red-500 to-amber-500',
      show: canCalculate || canReview,
    },
    {
      title: '薪資級距設定',
      description: '管理薪資等級與金額',
      icon: TrendingUp,
      path: `${BASE_PATH}/settings/salary-grades`,
      color: 'from-purple-500 to-pink-500',
      show: canManageGrades,
    },
    {
      title: '勞健保級距',
      description: '管理投保級距與費率',
      icon: FileText,
      path: `${BASE_PATH}/settings/insurance-brackets`,
      color: 'from-amber-500 to-orange-500',
      show: canManageInsurance,
    },
    {
      title: '員工薪資設定',
      description: '設定個別員工薪資',
      icon: Users,
      path: `${BASE_PATH}/settings/employee-salary`,
      color: 'from-indigo-500 to-violet-500',
      show: canManageSettings,
    },
  ].filter(link => link.show);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin mb-3 text-red-500" size={32} />
        <p className="text-stone-400">載入中...</p>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* 標題區塊 */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-stone-800 tracking-tight flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-red-100 to-amber-100 rounded-xl text-red-600">
            <DollarSign className="h-6 w-6 md:h-8 md:w-8" />
          </div>
          薪資管理系統
        </h1>
        <p className="text-stone-500 mt-2 ml-1 text-sm md:text-base flex items-center gap-2">
          <span className="font-bold text-stone-700">{displayName}</span>
          <span className="text-stone-300">|</span>
          <span className="text-stone-500">Payroll Management System</span>
        </p>
      </div>

      {/* 當前薪資週期 */}
      {currentPeriod && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600">
                <Calendar size={24} />
              </div>
              <div>
                <p className="text-sm text-stone-500">當前薪資週期</p>
                <p className="text-xl font-bold text-stone-800">{currentPeriod.period_name}</p>
                <p className="text-xs text-stone-400 mt-1">
                  {currentPeriod.start_date} ~ {currentPeriod.end_date}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="text-center px-4 py-2 bg-stone-50 rounded-xl">
                <p className="text-xs text-stone-500">10日發薪</p>
                <p className="font-bold text-stone-800">{currentPeriod.pay_date_10th}</p>
              </div>
              <div className="text-center px-4 py-2 bg-stone-50 rounded-xl">
                <p className="text-xs text-stone-500">12日發薪</p>
                <p className="font-bold text-stone-800">{currentPeriod.pay_date_12th}</p>
              </div>
              <div className="text-center px-4 py-2 bg-stone-50 rounded-xl">
                <p className="text-xs text-stone-500">出勤截止</p>
                <p className="font-bold text-amber-600">{currentPeriod.attendance_deadline}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl flex items-center gap-2 ${PERIOD_STATUS[currentPeriod.status]?.color || 'bg-stone-100'}`}>
                <span className="text-sm font-bold">
                  {PERIOD_STATUS[currentPeriod.status]?.label || currentPeriod.status}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <p className="text-xs text-stone-500">在職員工</p>
              <p className="text-xl font-bold text-stone-800">{stats.totalEmployees}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-xs text-stone-500">待審核出勤</p>
              <p className="text-xl font-bold text-amber-600">{stats.pendingAttendance}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Calculator size={20} />
            </div>
            <div>
              <p className="text-xs text-stone-500">待審核薪資</p>
              <p className="text-xl font-bold text-emerald-600">{stats.pendingPayroll}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
              <Building size={20} />
            </div>
            <div>
              <p className="text-xs text-stone-500">本月週期</p>
              <p className="text-xl font-bold text-purple-600">
                {currentPeriod ? `${currentPeriod.year}/${currentPeriod.month}` : '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 快速連結 */}
      <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
        <Settings size={20} className="text-stone-400" />
        快速操作
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map((link, index) => (
          <Link
            key={index}
            to={link.path}
            className="group bg-white rounded-2xl border border-stone-200 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all relative overflow-hidden"
          >
            {/* 背景漸層 */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${link.color} opacity-5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:opacity-10 transition-opacity`} />

            <div className="flex items-start gap-4 relative">
              <div className={`p-3 bg-gradient-to-br ${link.color} rounded-xl text-white shadow-lg`}>
                <link.icon size={24} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-stone-800 group-hover:text-red-600 transition-colors">
                    {link.title}
                  </h3>
                  {link.badge && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      {link.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-stone-500 mt-1">{link.description}</p>
              </div>
              <ChevronRight
                size={20}
                className="text-stone-300 group-hover:text-red-500 group-hover:translate-x-1 transition-all"
              />
            </div>
          </Link>
        ))}
      </div>

      {/* 說明區塊 */}
      <div className="mt-8 bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h3 className="font-bold text-amber-800 mb-2">薪資發放說明</h3>
            <ul className="text-sm text-amber-700 space-y-1">
              <li>• <strong>10日發薪</strong>：本薪、加班費、扣除勞健保及其他扣款</li>
              <li>• <strong>12日發薪</strong>：伙食津貼、職務津貼、獎金、特休代金</li>
              <li>• 出勤截止日前請完成所有出勤資料輸入</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
