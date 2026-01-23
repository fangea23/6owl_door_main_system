import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { useCurrentUser } from '../../../../hooks/useCurrentUser';
import {
  BookOpen,
  GraduationCap,
  Clock,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';

const BASE_PATH = '/systems/training';

// 進度環形圖組件
const ProgressRing = ({ progress, size = 60, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={progress >= 100 ? '#10b981' : '#f59e0b'}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className="transition-all duration-500"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="transform rotate-90 origin-center fill-stone-700 font-bold text-sm"
        style={{ transform: `rotate(90deg)`, transformOrigin: `${size/2}px ${size/2}px` }}
      >
        {progress}%
      </text>
    </svg>
  );
};

// 課程卡片組件
const CourseCard = ({ course, enrollment, onClick }) => {
  const status = enrollment?.status || 'not_started';
  const progress = enrollment?.progress_percent || 0;

  const statusConfig = {
    not_started: { color: 'bg-stone-100 text-stone-600', label: '未開始', icon: Play },
    in_progress: { color: 'bg-amber-100 text-amber-700', label: '學習中', icon: Clock },
    completed: { color: 'bg-green-100 text-green-700', label: '已完成', icon: CheckCircle },
    failed: { color: 'bg-red-100 text-red-700', label: '未通過', icon: AlertCircle },
  };

  const { color, label, icon: StatusIcon } = statusConfig[status];

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl border border-stone-200 p-5 hover:shadow-lg hover:border-amber-300 transition-all cursor-pointer group"
    >
      {/* 封面圖片 */}
      <div className="relative h-32 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg mb-4 overflow-hidden">
        {course.cover_image_url ? (
          <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-amber-400" />
          </div>
        )}
        {course.is_mandatory && (
          <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">
            必修
          </span>
        )}
      </div>

      {/* 課程資訊 */}
      <h3 className="font-bold text-stone-800 mb-2 group-hover:text-amber-700 transition-colors line-clamp-2">
        {course.title}
      </h3>

      <p className="text-sm text-stone-500 mb-3 line-clamp-2">
        {course.description}
      </p>

      {/* 狀態與進度 */}
      <div className="flex items-center justify-between">
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
          <StatusIcon size={12} />
          {label}
        </span>

        {status !== 'not_started' && (
          <div className="flex items-center gap-2">
            <div className="w-20 h-2 bg-stone-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  status === 'completed' ? 'bg-green-500' : 'bg-amber-500'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-stone-500">{progress}%</span>
          </div>
        )}
      </div>

      {/* 課程資訊 */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-stone-100 text-xs text-stone-400">
        {course.duration_minutes && (
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {course.duration_minutes} 分鐘
          </span>
        )}
        {course.has_quiz && (
          <span className="flex items-center gap-1">
            <GraduationCap size={12} />
            含測驗
          </span>
        )}
      </div>
    </div>
  );
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { user: currentUser, loading: userLoading } = useCurrentUser();

  // 狀態
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    inProgressCourses: 0,
    avgScore: 0,
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 判斷用戶是否為總部人員（沒有 store_id 或有 department_id）
  const isHeadquarters = currentUser?.employee?.department_id && !currentUser?.employee?.store_id;
  const employeeBrandId = currentUser?.employee?.brand_id;

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || userLoading) return;

      setLoading(true);
      try {
        // 載入分類
        const { data: categoriesData } = await supabase
          .from('training_categories')
          .select('*')
          .eq('is_active', true)
          .order('sort_order');

        setCategories(categoriesData || []);

        // 載入課程（根據品牌和受眾篩選）
        let query = supabase
          .from('training_courses')
          .select(`
            *,
            category:training_categories(name, icon)
          `)
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        const { data: coursesData } = await query;

        // 前端篩選：根據品牌和目標受眾
        const filteredByBrandAndAudience = (coursesData || []).filter(course => {
          // 品牌篩選：通用課程(brand_id=null) 或 符合員工品牌
          const brandMatch = !course.brand_id || course.brand_id === employeeBrandId;

          // 目標受眾篩選
          let audienceMatch = true;
          if (course.target_audience === 'headquarters' && !isHeadquarters) {
            audienceMatch = false;
          }
          if (course.target_audience === 'store' && isHeadquarters) {
            audienceMatch = false;
          }

          return brandMatch && audienceMatch;
        });

        setCourses(filteredByBrandAndAudience);

        // 載入我的學習進度
        const { data: enrollmentsData } = await supabase
          .from('training_enrollments')
          .select('*')
          .eq('user_id', user.id);

        setEnrollments(enrollmentsData || []);

        // 計算統計（只計算符合條件的課程）
        const courseIds = filteredByBrandAndAudience.map(c => c.id);
        const relevantEnrollments = (enrollmentsData || []).filter(e => courseIds.includes(e.course_id));
        const completed = relevantEnrollments.filter(e => e.status === 'completed').length;
        const inProgress = relevantEnrollments.filter(e => e.status === 'in_progress').length;

        setStats({
          totalCourses: filteredByBrandAndAudience.length,
          completedCourses: completed,
          inProgressCourses: inProgress,
          avgScore: 0, // TODO: 從測驗記錄計算
        });

      } catch (err) {
        console.error('載入資料失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, userLoading, employeeBrandId, isHeadquarters]);

  // 過濾課程
  const filteredCourses = courses.filter(course => {
    const matchCategory = selectedCategory === 'all' || course.category_id === selectedCategory;
    const matchSearch = !searchTerm ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  // 取得課程的學習進度
  const getEnrollment = (courseId) => {
    return enrollments.find(e => e.course_id === courseId);
  };

  // 載入中
  if (loading || userLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
          <p className="text-stone-500">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 我的學習統計 */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 mb-6 text-white">
          <h2 className="text-lg font-bold mb-4">我的學習進度</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.totalCourses}</div>
              <div className="text-sm opacity-80">可學習課程</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.inProgressCourses}</div>
              <div className="text-sm opacity-80">學習中</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">{stats.completedCourses}</div>
              <div className="text-sm opacity-80">已完成</div>
            </div>
            <div className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
              <div className="text-3xl font-bold">
                {stats.totalCourses > 0
                  ? Math.round((stats.completedCourses / stats.totalCourses) * 100)
                  : 0}%
              </div>
              <div className="text-sm opacity-80">完成率</div>
            </div>
          </div>
        </div>

        {/* 搜尋與篩選 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={20} />
            <input
              type="text"
              placeholder="搜尋課程..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-amber-500 text-white'
                  : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'
              }`}
            >
              全部
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:border-amber-300'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* 必修課程提醒 */}
        {courses.filter(c => c.is_mandatory && !getEnrollment(c.id)?.status?.includes('completed')).length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
              <AlertCircle size={20} />
              必修課程提醒
            </div>
            <p className="text-sm text-red-600">
              您有 {courses.filter(c => c.is_mandatory && getEnrollment(c.id)?.status !== 'completed').length} 門必修課程尚未完成
            </p>
          </div>
        )}

        {/* 課程列表 */}
        {filteredCourses.length === 0 ? (
          <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
            <BookOpen className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-stone-700 mb-2">
              {searchTerm ? '找不到符合的課程' : '目前沒有可學習的課程'}
            </h3>
            <p className="text-sm text-stone-500">
              {searchTerm ? '請嘗試其他關鍵字' : '請稍後再來查看'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                enrollment={getEnrollment(course.id)}
                onClick={() => navigate(`${BASE_PATH}/course/${course.id}`)}
              />
            ))}
          </div>
        )}
    </main>
  );
}
