import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePermission } from '../../../../hooks/usePermission';
import {
  BarChart3,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  Download,
  Filter,
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Award,
} from 'lucide-react';

const BASE_PATH = '/systems/training';

// 統計卡片組件
const StatCard = ({ icon: Icon, label, value, change, color = 'amber' }) => {
  const colorStyles = {
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  return (
    <div className={`border rounded-xl p-5 ${colorStyles[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-6 h-6" />
        {change !== undefined && (
          <span className={`text-xs font-medium flex items-center gap-1 ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {change >= 0 ? <TrendingUp size={12} /> : <TrendingUp size={12} className="rotate-180" />}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-70">{label}</div>
    </div>
  );
};

// 課程排行榜項目
const CourseRankItem = ({ rank, course, enrollments, completions }) => {
  const completionRate = enrollments > 0 ? Math.round((completions / enrollments) * 100) : 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-0">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
        rank === 1 ? 'bg-amber-100 text-amber-600' :
        rank === 2 ? 'bg-stone-200 text-stone-600' :
        rank === 3 ? 'bg-orange-100 text-orange-600' :
        'bg-stone-100 text-stone-500'
      }`}>
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-stone-800 truncate">{course.title}</div>
        <div className="text-xs text-stone-500">{course.category?.name || '未分類'}</div>
      </div>
      <div className="text-right">
        <div className="font-medium text-stone-800">{enrollments} 人</div>
        <div className="text-xs text-stone-500">{completionRate}% 完成</div>
      </div>
    </div>
  );
};

// 員工學習進度項目
const EmployeeProgressItem = ({ employee, completedCourses, totalCourses, avgScore }) => {
  const progress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-stone-100 last:border-0">
      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-medium">
        {employee.name?.charAt(0) || 'U'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-stone-800">{employee.name}</div>
        <div className="text-xs text-stone-500">{employee.department?.name || '未分配部門'}</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="font-medium text-stone-800">{completedCourses}/{totalCourses}</div>
          <div className="text-xs text-stone-500">課程</div>
        </div>
        <div className="w-16">
          <div className="h-2 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-stone-500 text-center mt-1">{progress}%</div>
        </div>
        {avgScore !== null && (
          <div className="text-center">
            <div className="font-medium text-stone-800">{avgScore}</div>
            <div className="text-xs text-stone-500">平均分</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Reports() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 權限檢查
  const { hasPermission: canViewReports, loading: permissionLoading } = usePermission('training.view.reports');

  // 狀態
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalEnrollments: 0,
    completedEnrollments: 0,
    avgCompletionRate: 0,
  });
  const [courseRanking, setCourseRanking] = useState([]);
  const [employeeProgress, setEmployeeProgress] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // 篩選
  const [dateRange, setDateRange] = useState('30'); // 30, 90, 365, all
  const [searchTerm, setSearchTerm] = useState('');

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !canViewReports) return;

      setLoading(true);
      try {
        // 基本統計
        const { count: totalCourses } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('is_published', true);

        const { count: totalEnrollments } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true });

        const { count: completedEnrollments } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');

        setStats({
          totalCourses: totalCourses || 0,
          totalEnrollments: totalEnrollments || 0,
          completedEnrollments: completedEnrollments || 0,
          avgCompletionRate: totalEnrollments > 0
            ? Math.round((completedEnrollments / totalEnrollments) * 100)
            : 0,
        });

        // 課程排行榜
        const { data: coursesData } = await supabase
          .from('courses')
          .select(`
            id, title,
            category:categories(name)
          `)
          .eq('is_published', true);

        const coursesWithStats = await Promise.all(
          (coursesData || []).map(async (course) => {
            const { count: enrollments } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);

            const { count: completions } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id)
              .eq('status', 'completed');

            return {
              ...course,
              enrollments: enrollments || 0,
              completions: completions || 0,
            };
          })
        );

        // 按學習人數排序
        const sortedCourses = coursesWithStats
          .sort((a, b) => b.enrollments - a.enrollments)
          .slice(0, 10);

        setCourseRanking(sortedCourses);

        // 員工學習進度
        const { data: employeesData } = await supabase
          .from('employees')
          .select(`
            id, name, user_id,
            department:departments(name)
          `)
          .limit(20);

        const employeesWithProgress = await Promise.all(
          (employeesData || []).map(async (employee) => {
            if (!employee.user_id) return null;

            const { count: totalUserCourses } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', employee.user_id);

            const { count: completedUserCourses } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', employee.user_id)
              .eq('status', 'completed');

            // 計算平均分數
            const { data: quizData } = await supabase
              .from('quiz_attempts')
              .select('score')
              .eq('user_id', employee.user_id);

            const avgScore = quizData && quizData.length > 0
              ? Math.round(quizData.reduce((sum, q) => sum + q.score, 0) / quizData.length)
              : null;

            return {
              ...employee,
              completedCourses: completedUserCourses || 0,
              totalCourses: totalUserCourses || 0,
              avgScore,
            };
          })
        );

        setEmployeeProgress(
          employeesWithProgress
            .filter(e => e !== null)
            .sort((a, b) => b.completedCourses - a.completedCourses)
        );

      } catch (err) {
        console.error('載入報表資料失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!permissionLoading) {
      fetchData();
    }
  }, [user, canViewReports, permissionLoading, dateRange]);

  // 權限檢查中
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // 無權限
  if (!canViewReports) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-700 mb-2">無存取權限</h2>
          <p className="text-sm text-red-600">您沒有檢視報表的權限。</p>
        </div>
      </div>
    );
  }

  // 載入中
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
          <p className="text-stone-500">載入報表...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">學習報表</h1>
          <p className="text-sm text-stone-500">教育訓練數據分析</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="30">近 30 天</option>
            <option value="90">近 90 天</option>
            <option value="365">近一年</option>
            <option value="all">全部時間</option>
          </select>
          <button
            className="flex items-center gap-2 px-4 py-2 bg-stone-100 text-stone-600 font-medium rounded-lg hover:bg-stone-200 transition-colors"
          >
            <Download size={16} />
            匯出報表
          </button>
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={BookOpen}
          label="已發布課程"
          value={stats.totalCourses}
          color="amber"
        />
        <StatCard
          icon={Users}
          label="學習人次"
          value={stats.totalEnrollments}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="完成人次"
          value={stats.completedEnrollments}
          color="green"
        />
        <StatCard
          icon={Award}
          label="平均完成率"
          value={`${stats.avgCompletionRate}%`}
          color="purple"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 課程排行榜 */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-amber-500" />
            熱門課程排行
          </h2>
          {courseRanking.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              暫無數據
            </div>
          ) : (
            <div>
              {courseRanking.map((course, index) => (
                <CourseRankItem
                  key={course.id}
                  rank={index + 1}
                  course={course}
                  enrollments={course.enrollments}
                  completions={course.completions}
                />
              ))}
            </div>
          )}
        </div>

        {/* 員工學習進度 */}
        <div className="bg-white border border-stone-200 rounded-xl p-5">
          <h2 className="font-bold text-stone-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-amber-500" />
            員工學習進度
          </h2>
          {employeeProgress.length === 0 ? (
            <div className="text-center py-8 text-stone-500">
              暫無數據
            </div>
          ) : (
            <div>
              {employeeProgress.slice(0, 10).map((employee) => (
                <EmployeeProgressItem
                  key={employee.id}
                  employee={employee}
                  completedCourses={employee.completedCourses}
                  totalCourses={employee.totalCourses}
                  avgScore={employee.avgScore}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 詳細分析區 (可擴展) */}
      <div className="mt-6 bg-white border border-stone-200 rounded-xl p-5">
        <h2 className="font-bold text-stone-800 mb-4">課程完成趨勢</h2>
        <div className="h-64 flex items-center justify-center text-stone-400">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>圖表功能開發中</p>
          </div>
        </div>
      </div>
    </main>
  );
}
