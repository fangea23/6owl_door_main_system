import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePermission } from '../../../../hooks/usePermission';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Users,
  BarChart3,
  Search,
  Filter,
  ChevronDown,
  Loader2,
  AlertCircle,
  CheckCircle,
  Clock,
  GraduationCap,
  FolderOpen,
} from 'lucide-react';

const BASE_PATH = '/systems/training';

// 統計卡片組件
const StatCard = ({ icon: Icon, label, value, subValue, color = 'amber' }) => {
  const colorStyles = {
    amber: 'from-amber-500 to-orange-500 shadow-amber-500/20',
    green: 'from-green-500 to-emerald-500 shadow-green-500/20',
    blue: 'from-blue-500 to-indigo-500 shadow-blue-500/20',
    purple: 'from-purple-500 to-pink-500 shadow-purple-500/20',
  };

  return (
    <div className={`bg-gradient-to-br ${colorStyles[color]} rounded-xl p-5 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-3">
        <Icon className="w-8 h-8 opacity-80" />
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <div className="text-sm font-medium opacity-90">{label}</div>
      {subValue && <div className="text-xs opacity-70 mt-1">{subValue}</div>}
    </div>
  );
};

// 課程列表項目組件
const CourseListItem = ({ course, onEdit, onTogglePublish, onDelete }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        {/* 封面縮圖 */}
        <div className="w-20 h-14 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg flex-shrink-0 overflow-hidden">
          {course.cover_image_url ? (
            <img src={course.cover_image_url} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-amber-400" />
            </div>
          )}
        </div>

        {/* 課程資訊 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-stone-800 truncate">{course.title}</h3>
            {course.is_mandatory && (
              <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-medium rounded">
                必修
              </span>
            )}
            {!course.is_published && (
              <span className="px-1.5 py-0.5 bg-stone-100 text-stone-500 text-xs font-medium rounded">
                草稿
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500 truncate mb-2">{course.description}</p>
          <div className="flex items-center gap-4 text-xs text-stone-400">
            {course.category && (
              <span className="flex items-center gap-1">
                <FolderOpen size={12} />
                {course.category.name}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {course.duration_minutes || 0} 分鐘
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {course.enrollment_count || 0} 人學習
            </span>
          </div>
        </div>

        {/* 操作按鈕 */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ChevronDown size={16} className={`text-stone-400 transition-transform ${showActions ? 'rotate-180' : ''}`} />
          </button>

          {showActions && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-stone-200 rounded-xl shadow-lg py-1 z-10 min-w-[140px]">
              <button
                onClick={() => { onEdit(course); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                <Edit2 size={14} />
                編輯課程
              </button>
              <button
                onClick={() => { onTogglePublish(course); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-sm text-stone-600 hover:bg-stone-50 flex items-center gap-2"
              >
                {course.is_published ? <EyeOff size={14} /> : <Eye size={14} />}
                {course.is_published ? '取消發布' : '發布課程'}
              </button>
              <div className="border-t border-stone-100 my-1" />
              <button
                onClick={() => { onDelete(course); setShowActions(false); }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 size={14} />
                刪除課程
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 權限檢查
  const { hasPermission: canManageCourses, loading: permissionLoading } = usePermission('training.manage.courses');

  // 狀態
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    totalCourses: 0,
    publishedCourses: 0,
    totalEnrollments: 0,
    completedEnrollments: 0,
  });

  // 篩選
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [publishFilter, setPublishFilter] = useState('all'); // all, published, draft

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id || !canManageCourses) return;

      setLoading(true);
      try {
        // 載入分類
        const { data: categoriesData } = await supabase
          .from('categories')
          .select('*')
          .order('sort_order');

        setCategories(categoriesData || []);

        // 載入課程（含學習人數統計）
        const { data: coursesData } = await supabase
          .from('courses')
          .select(`
            *,
            category:categories(id, name, icon)
          `)
          .order('created_at', { ascending: false });

        // 取得每門課的學習人數
        const coursesWithStats = await Promise.all(
          (coursesData || []).map(async (course) => {
            const { count } = await supabase
              .from('enrollments')
              .select('*', { count: 'exact', head: true })
              .eq('course_id', course.id);

            return { ...course, enrollment_count: count || 0 };
          })
        );

        setCourses(coursesWithStats);

        // 統計資料
        const { count: totalEnrollments } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true });

        const { count: completedEnrollments } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'completed');

        setStats({
          totalCourses: coursesData?.length || 0,
          publishedCourses: coursesData?.filter(c => c.is_published).length || 0,
          totalEnrollments: totalEnrollments || 0,
          completedEnrollments: completedEnrollments || 0,
        });

      } catch (err) {
        console.error('載入資料失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!permissionLoading) {
      fetchData();
    }
  }, [user, canManageCourses, permissionLoading]);

  // 篩選課程
  const filteredCourses = courses.filter(course => {
    const matchSearch = !searchTerm ||
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchCategory = selectedCategory === 'all' || course.category_id === selectedCategory;

    const matchPublish = publishFilter === 'all' ||
      (publishFilter === 'published' && course.is_published) ||
      (publishFilter === 'draft' && !course.is_published);

    return matchSearch && matchCategory && matchPublish;
  });

  // 處理編輯
  const handleEdit = (course) => {
    navigate(`${BASE_PATH}/admin/course/${course.id}`);
  };

  // 處理發布/取消發布
  const handleTogglePublish = async (course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: !course.is_published })
        .eq('id', course.id);

      if (error) throw error;

      // 更新本地狀態
      setCourses(prev =>
        prev.map(c =>
          c.id === course.id ? { ...c, is_published: !c.is_published } : c
        )
      );
    } catch (err) {
      console.error('更新失敗:', err);
      alert('操作失敗，請稍後再試');
    }
  };

  // 處理刪除
  const handleDelete = async (course) => {
    // 檢查是否有學習記錄
    const { count: enrollmentCount } = await supabase
      .from('enrollments')
      .select('*', { count: 'exact', head: true })
      .eq('course_id', course.id);

    let confirmMessage = `確定要刪除「${course.title}」嗎？`;
    if (enrollmentCount > 0) {
      confirmMessage += `\n\n警告：此課程有 ${enrollmentCount} 筆學習記錄，刪除後將一併移除所有學習進度和測驗記錄。`;
    }
    confirmMessage += '\n\n此操作無法復原！';

    if (!confirm(confirmMessage)) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', course.id);

      if (error) throw error;

      // 更新本地狀態
      setCourses(prev => prev.filter(c => c.id !== course.id));

      // 更新統計
      setStats(prev => ({
        ...prev,
        totalCourses: prev.totalCourses - 1,
        publishedCourses: course.is_published ? prev.publishedCourses - 1 : prev.publishedCourses,
        totalEnrollments: prev.totalEnrollments - (enrollmentCount || 0),
      }));
    } catch (err) {
      console.error('刪除失敗:', err);
      alert('刪除失敗：' + (err.message || '請稍後再試'));
    }
  };

  // 權限檢查中
  if (permissionLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  // 無權限
  if (!canManageCourses) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-red-700 mb-2">無存取權限</h2>
          <p className="text-sm text-red-600">您沒有課程管理的權限，請聯繫管理員。</p>
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
          <p className="text-stone-500">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">課程管理</h1>
          <p className="text-sm text-stone-500">管理教育訓練課程內容</p>
        </div>
        <button
          onClick={() => navigate(`${BASE_PATH}/admin/course/new`)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors shadow-lg shadow-amber-500/20"
        >
          <Plus size={18} />
          新增課程
        </button>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={BookOpen}
          label="課程總數"
          value={stats.totalCourses}
          subValue={`已發布 ${stats.publishedCourses} 門`}
          color="amber"
        />
        <StatCard
          icon={Users}
          label="學習人次"
          value={stats.totalEnrollments}
          subValue={`已完成 ${stats.completedEnrollments} 人次`}
          color="blue"
        />
        <StatCard
          icon={CheckCircle}
          label="完成率"
          value={stats.totalEnrollments > 0 ? `${Math.round((stats.completedEnrollments / stats.totalEnrollments) * 100)}%` : '0%'}
          color="green"
        />
        <StatCard
          icon={GraduationCap}
          label="分類數量"
          value={categories.length}
          color="purple"
        />
      </div>

      {/* 搜尋與篩選 */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* 搜尋 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <input
              type="text"
              placeholder="搜尋課程名稱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* 分類篩選 */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">所有分類</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* 發布狀態篩選 */}
          <select
            value={publishFilter}
            onChange={(e) => setPublishFilter(e.target.value)}
            className="px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
          >
            <option value="all">所有狀態</option>
            <option value="published">已發布</option>
            <option value="draft">草稿</option>
          </select>
        </div>
      </div>

      {/* 課程列表 */}
      {filteredCourses.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
          <BookOpen className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-700 mb-2">
            {searchTerm || selectedCategory !== 'all' || publishFilter !== 'all'
              ? '找不到符合條件的課程'
              : '尚未建立任何課程'}
          </h3>
          <p className="text-sm text-stone-500 mb-4">
            {searchTerm || selectedCategory !== 'all' || publishFilter !== 'all'
              ? '請嘗試其他篩選條件'
              : '點擊上方「新增課程」按鈕開始建立'}
          </p>
          {!searchTerm && selectedCategory === 'all' && publishFilter === 'all' && (
            <button
              onClick={() => navigate(`${BASE_PATH}/admin/course/new`)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
            >
              <Plus size={16} />
              新增課程
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCourses.map(course => (
            <CourseListItem
              key={course.id}
              course={course}
              onEdit={handleEdit}
              onTogglePublish={handleTogglePublish}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </main>
  );
}
