import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { usePermission } from '../../../../hooks/usePermission';
import {
  ChevronLeft,
  Save,
  Plus,
  Trash2,
  GripVertical,
  BookOpen,
  FileText,
  Video,
  Image as ImageIcon,
  HelpCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react';

const BASE_PATH = '/systems/training';

// 課程單元類型選項
const LESSON_TYPES = [
  { value: 'text', label: '文字', icon: FileText },
  { value: 'video', label: '影片', icon: Video },
  { value: 'image', label: '圖片', icon: ImageIcon },
];

// 目標受眾選項
const TARGET_AUDIENCES = [
  { value: 'all', label: '全體員工' },
  { value: 'headquarters', label: '僅總部' },
  { value: 'store', label: '僅門市' },
];

// 題目類型選項
const QUESTION_TYPES = [
  { value: 'single_choice', label: '單選題' },
  { value: 'multiple_choice', label: '多選題' },
  { value: 'true_false', label: '是非題' },
];

export default function CourseEditor() {
  const navigate = useNavigate();
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const isNew = courseId === 'new';

  // 權限檢查
  const { hasPermission: canManageCourses, loading: permissionLoading } = usePermission('training.manage.courses');

  // 狀態
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // 當前編輯的 tab
  const [activeTab, setActiveTab] = useState('basic'); // basic, lessons, quiz, settings

  // 課程資料
  const [course, setCourse] = useState({
    title: '',
    description: '',
    category_id: '',
    brand_id: null,
    target_audience: 'all',
    cover_image_url: '',
    duration_minutes: 0,
    is_mandatory: false,
    has_quiz: false,
    passing_score: 60,
    max_attempts: 3,
    is_published: false,
  });

  // 課程單元
  const [lessons, setLessons] = useState([]);

  // 測驗題目
  const [questions, setQuestions] = useState([]);

  // 載入資料
  useEffect(() => {
    const fetchData = async () => {
      // 載入分類
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      setCategories(categoriesData || []);

      // 載入品牌（使用 code 欄位作為 BIGINT 連結）
      const { data: brandsData } = await supabase
        .from('brands')
        .select('id, name, code')
        .order('name');

      setBrands(brandsData || []);

      // 如果是編輯模式，載入課程資料
      if (!isNew && courseId) {
        setLoading(true);
        try {
          // 載入課程
          const { data: courseData, error: courseError } = await supabase
            .from('courses')
            .select('*')
            .eq('id', courseId)
            .single();

          if (courseError) throw courseError;
          setCourse(courseData);

          // 載入課程單元
          const { data: lessonsData } = await supabase
            .from('lessons')
            .select('*')
            .eq('course_id', courseId)
            .order('sort_order');

          setLessons(lessonsData || []);

          // 載入測驗題目
          const { data: questionsData } = await supabase
            .from('questions')
            .select('*')
            .eq('course_id', courseId)
            .order('sort_order');

          setQuestions(questionsData || []);

        } catch (err) {
          console.error('載入課程失敗:', err);
          alert('載入課程失敗');
          navigate(`${BASE_PATH}/admin`);
        } finally {
          setLoading(false);
        }
      }
    };

    if (!permissionLoading && canManageCourses) {
      fetchData();
    }
  }, [courseId, isNew, permissionLoading, canManageCourses, navigate]);

  // 儲存課程
  const handleSave = async () => {
    if (!course.title.trim()) {
      alert('請輸入課程名稱');
      return;
    }

    setSaving(true);
    try {
      let savedCourseId = courseId;

      if (isNew) {
        // 新增課程
        const { data, error } = await supabase
          .from('courses')
          .insert({
            ...course,
            created_by: user.id,
          })
          .select()
          .single();

        if (error) throw error;
        savedCourseId = data.id;
      } else {
        // 更新課程
        const { error } = await supabase
          .from('courses')
          .update(course)
          .eq('id', courseId);

        if (error) throw error;
      }

      // 儲存課程單元
      if (lessons.length > 0) {
        // 先刪除舊的單元
        if (!isNew) {
          await supabase
            .from('lessons')
            .delete()
            .eq('course_id', savedCourseId);
        }

        // 新增單元
        const lessonsToInsert = lessons.map((lesson, index) => ({
          ...lesson,
          course_id: savedCourseId,
          sort_order: index,
          id: undefined, // 移除暫時的 ID
        }));

        const { error: lessonsError } = await supabase
          .from('lessons')
          .insert(lessonsToInsert);

        if (lessonsError) throw lessonsError;
      }

      // 儲存測驗題目
      if (questions.length > 0) {
        // 先刪除舊的題目
        if (!isNew) {
          await supabase
            .from('questions')
            .delete()
            .eq('course_id', savedCourseId);
        }

        // 新增題目
        const questionsToInsert = questions.map((question, index) => ({
          ...question,
          course_id: savedCourseId,
          sort_order: index,
          id: undefined,
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (questionsError) throw questionsError;
      }

      alert('儲存成功！');
      navigate(`${BASE_PATH}/admin`);

    } catch (err) {
      console.error('儲存失敗:', err);
      alert('儲存失敗，請稍後再試');
    } finally {
      setSaving(false);
    }
  };

  // 新增課程單元
  const addLesson = () => {
    setLessons([
      ...lessons,
      {
        id: `temp-${Date.now()}`,
        title: '',
        content: '',
        content_type: 'text',
        duration_minutes: 5,
      },
    ]);
  };

  // 更新課程單元
  const updateLesson = (index, field, value) => {
    setLessons(prev =>
      prev.map((lesson, i) =>
        i === index ? { ...lesson, [field]: value } : lesson
      )
    );
  };

  // 刪除課程單元
  const removeLesson = (index) => {
    setLessons(prev => prev.filter((_, i) => i !== index));
  };

  // 新增測驗題目
  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: `temp-${Date.now()}`,
        question_text: '',
        question_type: 'single_choice',
        options: ['', '', '', ''],
        correct_answer: [],
        points: 10,
      },
    ]);
  };

  // 更新測驗題目
  const updateQuestion = (index, field, value) => {
    setQuestions(prev =>
      prev.map((question, i) =>
        i === index ? { ...question, [field]: value } : question
      )
    );
  };

  // 刪除測驗題目
  const removeQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // 權限檢查中
  if (permissionLoading || loading) {
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
          <p className="text-sm text-red-600">您沒有課程管理的權限。</p>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* 頁面標題 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`${BASE_PATH}/admin`)}
            className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-stone-800">
              {isNew ? '新增課程' : '編輯課程'}
            </h1>
            <p className="text-sm text-stone-500">
              {isNew ? '建立新的教育訓練課程' : course.title}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          儲存
        </button>
      </div>

      {/* Tab 切換 */}
      <div className="flex gap-1 mb-6 bg-stone-100 p-1 rounded-xl">
        {[
          { id: 'basic', label: '基本資料' },
          { id: 'lessons', label: `課程單元 (${lessons.length})` },
          { id: 'quiz', label: `測驗題目 (${questions.length})` },
          { id: 'settings', label: '進階設定' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-stone-800 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 基本資料 Tab */}
      {activeTab === 'basic' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-6">
          {/* 課程名稱 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              課程名稱 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={course.title}
              onChange={(e) => setCourse({ ...course, title: e.target.value })}
              placeholder="輸入課程名稱"
              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* 課程描述 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              課程描述
            </label>
            <textarea
              value={course.description || ''}
              onChange={(e) => setCourse({ ...course, description: e.target.value })}
              placeholder="輸入課程描述"
              rows={3}
              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* 分類與品牌 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                課程分類
              </label>
              <select
                value={course.category_id || ''}
                onChange={(e) => setCourse({ ...course, category_id: e.target.value || null })}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">選擇分類</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                適用品牌
              </label>
              <select
                value={course.brand_id || ''}
                onChange={(e) => setCourse({ ...course, brand_id: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">所有品牌</option>
                {brands.map(brand => (
                  <option key={brand.id} value={parseInt(brand.code)}>{brand.name} ({brand.code})</option>
                ))}
              </select>
            </div>
          </div>

          {/* 目標受眾與時長 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                目標受眾
              </label>
              <select
                value={course.target_audience}
                onChange={(e) => setCourse({ ...course, target_audience: e.target.value })}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                {TARGET_AUDIENCES.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                預估時長 (分鐘)
              </label>
              <input
                type="number"
                value={course.duration_minutes || 0}
                onChange={(e) => setCourse({ ...course, duration_minutes: parseInt(e.target.value) || 0 })}
                min={0}
                className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>
          </div>

          {/* 封面圖片 URL */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">
              封面圖片 URL
            </label>
            <input
              type="text"
              value={course.cover_image_url || ''}
              onChange={(e) => setCourse({ ...course, cover_image_url: e.target.value })}
              placeholder="https://example.com/image.jpg"
              className="w-full px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>
        </div>
      )}

      {/* 課程單元 Tab */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          {lessons.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
              <FileText className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 mb-4">尚未新增任何課程單元</p>
              <button
                onClick={addLesson}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus size={16} />
                新增單元
              </button>
            </div>
          ) : (
            <>
              {lessons.map((lesson, index) => (
                <div key={lesson.id} className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 text-stone-400 pt-2">
                      <GripVertical size={16} />
                      <span className="text-sm font-medium">{index + 1}</span>
                    </div>
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={lesson.title}
                        onChange={(e) => updateLesson(index, 'title', e.target.value)}
                        placeholder="單元標題"
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <select
                          value={lesson.content_type}
                          onChange={(e) => updateLesson(index, 'content_type', e.target.value)}
                          className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                          {LESSON_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={lesson.duration_minutes || 5}
                          onChange={(e) => updateLesson(index, 'duration_minutes', parseInt(e.target.value) || 0)}
                          min={0}
                          placeholder="時長 (分鐘)"
                          className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        />
                      </div>
                      <textarea
                        value={lesson.content || ''}
                        onChange={(e) => updateLesson(index, 'content', e.target.value)}
                        placeholder={lesson.content_type === 'video' ? '輸入影片 URL' : '輸入單元內容'}
                        rows={3}
                        className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      />
                    </div>
                    <button
                      onClick={() => removeLesson(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={addLesson}
                className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                新增單元
              </button>
            </>
          )}
        </div>
      )}

      {/* 測驗題目 Tab */}
      {activeTab === 'quiz' && (
        <div className="space-y-4">
          {questions.length === 0 ? (
            <div className="bg-white border border-stone-200 rounded-xl p-12 text-center">
              <HelpCircle className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500 mb-4">尚未新增任何測驗題目</p>
              <button
                onClick={addQuestion}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
              >
                <Plus size={16} />
                新增題目
              </button>
            </div>
          ) : (
            <>
              {questions.map((question, index) => (
                <div key={question.id} className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center gap-2 text-stone-400 pt-2">
                      <span className="text-sm font-medium">Q{index + 1}</span>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                          <input
                            type="text"
                            value={question.question_text}
                            onChange={(e) => updateQuestion(index, 'question_text', e.target.value)}
                            placeholder="題目內容"
                            className="w-full px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </div>
                        <select
                          value={question.question_type}
                          onChange={(e) => updateQuestion(index, 'question_type', e.target.value)}
                          className="px-3 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        >
                          {QUESTION_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      {/* 選項 */}
                      <div className="space-y-2">
                        {(question.options || []).map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <input
                              type={question.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                              checked={(question.correct_answer || []).includes(optIndex)}
                              onChange={(e) => {
                                let newCorrect = [...(question.correct_answer || [])];
                                if (question.question_type === 'multiple_choice') {
                                  if (e.target.checked) {
                                    newCorrect.push(optIndex);
                                  } else {
                                    newCorrect = newCorrect.filter(i => i !== optIndex);
                                  }
                                } else {
                                  newCorrect = [optIndex];
                                }
                                updateQuestion(index, 'correct_answer', newCorrect);
                              }}
                              className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                            />
                            <input
                              type="text"
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(question.options || [])];
                                newOptions[optIndex] = e.target.value;
                                updateQuestion(index, 'options', newOptions);
                              }}
                              placeholder={`選項 ${optIndex + 1}`}
                              className="flex-1 px-3 py-1.5 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-sm"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-stone-500">
                        <label className="flex items-center gap-2">
                          分數:
                          <input
                            type="number"
                            value={question.points || 10}
                            onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 10)}
                            min={1}
                            className="w-16 px-2 py-1 border border-stone-200 rounded focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                          />
                        </label>
                      </div>
                    </div>
                    <button
                      onClick={() => removeQuestion(index)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={addQuestion}
                className="w-full py-3 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-amber-400 hover:text-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                新增題目
              </button>
            </>
          )}
        </div>
      )}

      {/* 進階設定 Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-6">
          {/* 必修課程 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-stone-800">必修課程</h3>
              <p className="text-sm text-stone-500">設為必修後，員工必須完成此課程</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={course.is_mandatory}
                onChange={(e) => setCourse({ ...course, is_mandatory: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          <div className="border-t border-stone-100" />

          {/* 包含測驗 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-stone-800">包含測驗</h3>
              <p className="text-sm text-stone-500">啟用後，員工需完成測驗才算完成課程</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={course.has_quiz}
                onChange={(e) => setCourse({ ...course, has_quiz: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {course.has_quiz && (
            <>
              <div className="border-t border-stone-100" />

              {/* 及格分數 */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  及格分數
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={course.passing_score}
                    onChange={(e) => setCourse({ ...course, passing_score: parseInt(e.target.value) || 60 })}
                    min={0}
                    max={100}
                    className="w-24 px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <span className="text-stone-500">分</span>
                </div>
              </div>

              {/* 最大嘗試次數 */}
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  最大嘗試次數
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={course.max_attempts}
                    onChange={(e) => setCourse({ ...course, max_attempts: parseInt(e.target.value) || 3 })}
                    min={1}
                    className="w-24 px-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <span className="text-stone-500">次 (0 表示無限制)</span>
                </div>
              </div>
            </>
          )}

          <div className="border-t border-stone-100" />

          {/* 發布狀態 */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-stone-800">發布課程</h3>
              <p className="text-sm text-stone-500">發布後員工才能看到並學習此課程</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={course.is_published}
                onChange={(e) => setCourse({ ...course, is_published: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-200 peer-focus:ring-2 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>
        </div>
      )}
    </main>
  );
}
