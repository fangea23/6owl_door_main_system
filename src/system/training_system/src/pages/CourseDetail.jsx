import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotifications } from '../../../../contexts/NotificationContext';
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Play,
  CheckCircle,
  Clock,
  FileText,
  Video,
  Image as ImageIcon,
  Award,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';

const BASE_PATH = '/systems/training';

export default function CourseDetail() {
  const navigate = useNavigate();
  const { id: courseId } = useParams();
  const { user } = useAuth();
  const { createNotification } = useNotifications();

  // 狀態
  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [lessonProgress, setLessonProgress] = useState([]);

  // 當前視圖
  const [currentView, setCurrentView] = useState('overview'); // overview, lesson, quiz, result
  const [currentLessonIndex, setCurrentLessonIndex] = useState(0);

  // 測驗狀態
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizResult, setQuizResult] = useState(null);
  const [attemptCount, setAttemptCount] = useState(0);

  // 載入課程資料
  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId || !user?.id) return;

      setLoading(true);
      try {
        // 載入課程
        const { data: courseData, error: courseError } = await supabase
          .from('training_courses')
          .select(`
            *,
            category:training_categories(name, icon)
          `)
          .eq('id', courseId)
          .single();

        if (courseError) throw courseError;
        setCourse(courseData);

        // 載入章節
        const { data: lessonsData } = await supabase
          .from('training_lessons')
          .select('*')
          .eq('course_id', courseId)
          .order('sort_order');

        setLessons(lessonsData || []);

        // 載入測驗題目
        if (courseData.has_quiz) {
          const { data: questionsData } = await supabase
            .from('training_questions')
            .select('*')
            .eq('course_id', courseId)
            .order('sort_order');

          setQuestions(questionsData || []);
        }

        // 載入或建立學習進度
        let { data: enrollmentData } = await supabase
          .from('training_enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single();

        if (!enrollmentData) {
          // 建立新的學習記錄
          const { data: newEnrollment } = await supabase
            .from('training_enrollments')
            .insert({
              user_id: user.id,
              course_id: courseId,
              status: 'not_started',
            })
            .select()
            .single();

          enrollmentData = newEnrollment;
        }

        setEnrollment(enrollmentData);

        // 載入章節進度
        if (enrollmentData) {
          const { data: progressData } = await supabase
            .from('training_lesson_progress')
            .select('*')
            .eq('enrollment_id', enrollmentData.id);

          setLessonProgress(progressData || []);

          // 載入測驗次數
          const { count } = await supabase
            .from('training_quiz_attempts')
            .select('*', { count: 'exact', head: true })
            .eq('enrollment_id', enrollmentData.id);

          setAttemptCount(count || 0);
        }

      } catch (err) {
        console.error('載入課程失敗:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourse();
  }, [courseId, user]);

  // 開始學習
  const startLearning = async () => {
    if (enrollment?.status === 'not_started') {
      await supabase
        .from('training_enrollments')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', enrollment.id);

      setEnrollment(prev => ({ ...prev, status: 'in_progress', started_at: new Date().toISOString() }));
    }

    setCurrentView('lesson');
    setCurrentLessonIndex(0);
  };

  // 完成章節
  const completeLesson = async (lessonId) => {
    const existing = lessonProgress.find(p => p.lesson_id === lessonId);

    if (!existing) {
      const { data: newProgress } = await supabase
        .from('training_lesson_progress')
        .insert({
          enrollment_id: enrollment.id,
          lesson_id: lessonId,
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .select()
        .single();

      setLessonProgress(prev => [...prev, newProgress]);
    } else if (!existing.is_completed) {
      await supabase
        .from('training_lesson_progress')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      setLessonProgress(prev =>
        prev.map(p => p.id === existing.id ? { ...p, is_completed: true } : p)
      );
    }

    // 更新整體進度
    const completedCount = lessonProgress.filter(p => p.is_completed).length + (existing?.is_completed ? 0 : 1);
    const totalLessons = lessons.length;
    const progressPercent = Math.round((completedCount / totalLessons) * 100);

    await supabase
      .from('training_enrollments')
      .update({ progress_percent: progressPercent })
      .eq('id', enrollment.id);

    setEnrollment(prev => ({ ...prev, progress_percent: progressPercent }));
  };

  // 下一章節
  const nextLesson = async () => {
    const currentLesson = lessons[currentLessonIndex];
    await completeLesson(currentLesson.id);

    if (currentLessonIndex < lessons.length - 1) {
      setCurrentLessonIndex(prev => prev + 1);
    } else if (course.has_quiz && questions.length > 0) {
      // 所有章節完成，進入測驗
      setCurrentView('quiz');
    } else {
      // 沒有測驗，直接完成
      await completeCourse();
    }
  };

  // 上一章節
  const prevLesson = () => {
    if (currentLessonIndex > 0) {
      setCurrentLessonIndex(prev => prev - 1);
    }
  };

  // 提交測驗
  const submitQuiz = async () => {
    setQuizSubmitting(true);

    try {
      // 計算分數
      let score = 0;
      let totalPoints = 0;

      questions.forEach(q => {
        totalPoints += q.points;
        const userAnswer = quizAnswers[q.id];
        const correctAnswer = q.correct_answer;

        if (Array.isArray(correctAnswer)) {
          if (JSON.stringify(userAnswer?.sort()) === JSON.stringify(correctAnswer.sort())) {
            score += q.points;
          }
        } else {
          if (userAnswer === correctAnswer) {
            score += q.points;
          }
        }
      });

      const percentage = Math.round((score / totalPoints) * 100);
      const isPassed = percentage >= course.passing_score;

      // 儲存測驗記錄
      const { data: attempt } = await supabase
        .from('training_quiz_attempts')
        .insert({
          enrollment_id: enrollment.id,
          user_id: user.id,
          course_id: courseId,
          attempt_number: attemptCount + 1,
          score,
          total_points: totalPoints,
          percentage,
          is_passed: isPassed,
          answers: quizAnswers,
          submitted_at: new Date().toISOString(),
        })
        .select()
        .single();

      setQuizResult({
        score,
        totalPoints,
        percentage,
        isPassed,
      });

      setAttemptCount(prev => prev + 1);

      if (isPassed) {
        await completeCourse();
      } else {
        // 未通過
        await supabase
          .from('training_enrollments')
          .update({ status: 'failed' })
          .eq('id', enrollment.id);

        setEnrollment(prev => ({ ...prev, status: 'failed' }));

        // 發送未通過通知（如果還有重考機會）
        const remainingAttempts = course.max_attempts > 0
          ? course.max_attempts - (attemptCount + 1)
          : '無限';

        try {
          await createNotification({
            title: '測驗未通過',
            message: `課程「${course.title}」測驗未通過，得分 ${percentage}%。${remainingAttempts !== 0 ? `還有 ${remainingAttempts} 次重考機會。` : '已無重考機會。'}`,
            type: 'training',
          });
        } catch (err) {
          console.error('發送通知失敗:', err);
        }
      }

      setCurrentView('result');

    } catch (err) {
      console.error('提交測驗失敗:', err);
      alert('提交失敗：' + err.message);
    } finally {
      setQuizSubmitting(false);
    }
  };

  // 完成課程
  const completeCourse = async () => {
    await supabase
      .from('training_enrollments')
      .update({
        status: 'completed',
        progress_percent: 100,
        completed_at: new Date().toISOString(),
      })
      .eq('id', enrollment.id);

    setEnrollment(prev => ({
      ...prev,
      status: 'completed',
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    }));

    // 發送完成通知
    try {
      await createNotification({
        title: '課程完成',
        message: `恭喜！您已成功完成課程「${course.title}」`,
        type: 'training',
      });
    } catch (err) {
      console.error('發送通知失敗:', err);
    }
  };

  // 重新測驗
  const retryQuiz = () => {
    if (course.max_attempts > 0 && attemptCount >= course.max_attempts) {
      alert('已達到最大測驗次數');
      return;
    }

    setQuizAnswers({});
    setQuizResult(null);
    setCurrentView('quiz');
  };

  // 檢查章節是否完成
  const isLessonCompleted = (lessonId) => {
    return lessonProgress.some(p => p.lesson_id === lessonId && p.is_completed);
  };

  // 載入中
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-stone-300 mx-auto mb-4" />
          <p className="text-stone-500">找不到課程</p>
          <button
            onClick={() => navigate(`${BASE_PATH}`)}
            className="mt-4 text-amber-600 hover:text-amber-700"
          >
            返回課程列表
          </button>
        </div>
      </div>
    );
  }

  // 課程總覽
  if (currentView === 'overview') {
    return (
      <div className="min-h-screen bg-stone-50">
        {/* Header */}
        <header className="bg-white border-b border-stone-200">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <button
              onClick={() => navigate(`${BASE_PATH}`)}
              className="flex items-center gap-2 text-stone-600 hover:text-stone-800"
            >
              <ChevronLeft size={20} />
              返回課程列表
            </button>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          {/* 課程封面 */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-8 mb-6 text-white">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm mb-3 inline-block">
              {course.category?.name}
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold mb-3">{course.title}</h1>
            <p className="text-white/80 mb-4">{course.description}</p>

            <div className="flex flex-wrap gap-4 text-sm">
              {course.duration_minutes && (
                <span className="flex items-center gap-1">
                  <Clock size={16} />
                  {course.duration_minutes} 分鐘
                </span>
              )}
              <span className="flex items-center gap-1">
                <FileText size={16} />
                {lessons.length} 個章節
              </span>
              {course.has_quiz && (
                <span className="flex items-center gap-1">
                  <Award size={16} />
                  測驗及格 {course.passing_score}%
                </span>
              )}
            </div>
          </div>

          {/* 學習進度 */}
          {enrollment?.status !== 'not_started' && (
            <div className="bg-white rounded-xl border border-stone-200 p-4 mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-stone-700">學習進度</span>
                <span className="text-amber-600 font-bold">{enrollment.progress_percent}%</span>
              </div>
              <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all"
                  style={{ width: `${enrollment.progress_percent}%` }}
                />
              </div>
            </div>
          )}

          {/* 章節列表 */}
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden mb-6">
            <div className="p-4 border-b border-stone-200">
              <h2 className="font-bold text-stone-800">課程章節</h2>
            </div>
            <div className="divide-y divide-stone-100">
              {lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="flex items-center gap-4 p-4 hover:bg-stone-50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    isLessonCompleted(lesson.id)
                      ? 'bg-green-100 text-green-600'
                      : 'bg-stone-100 text-stone-500'
                  }`}>
                    {isLessonCompleted(lesson.id) ? (
                      <CheckCircle size={18} />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-stone-800">{lesson.title}</h3>
                    {lesson.duration_minutes && (
                      <p className="text-sm text-stone-500">{lesson.duration_minutes} 分鐘</p>
                    )}
                  </div>
                  {lesson.content_type === 'video' && <Video size={18} className="text-stone-400" />}
                  {lesson.content_type === 'pdf' && <FileText size={18} className="text-stone-400" />}
                </div>
              ))}

              {course.has_quiz && (
                <div className="flex items-center gap-4 p-4 bg-amber-50">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                    <Award size={18} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-stone-800">課後測驗</h3>
                    <p className="text-sm text-stone-500">
                      {questions.length} 題 · 及格分數 {course.passing_score}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 開始學習按鈕 */}
          <button
            onClick={startLearning}
            className="w-full py-4 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
          >
            {enrollment?.status === 'not_started' ? (
              <>
                <Play size={20} />
                開始學習
              </>
            ) : enrollment?.status === 'completed' ? (
              <>
                <RotateCcw size={20} />
                重新學習
              </>
            ) : (
              <>
                <Play size={20} />
                繼續學習
              </>
            )}
          </button>
        </main>
      </div>
    );
  }

  // 章節學習視圖
  if (currentView === 'lesson') {
    const currentLesson = lessons[currentLessonIndex];

    return (
      <div className="min-h-screen bg-stone-50 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => setCurrentView('overview')}
              className="flex items-center gap-2 text-stone-600 hover:text-stone-800"
            >
              <ChevronLeft size={20} />
              課程總覽
            </button>
            <span className="text-sm text-stone-500">
              {currentLessonIndex + 1} / {lessons.length}
            </span>
          </div>
          {/* 進度條 */}
          <div className="h-1 bg-stone-200">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{ width: `${((currentLessonIndex + 1) / lessons.length) * 100}%` }}
            />
          </div>
        </header>

        {/* 內容 */}
        <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
          <h1 className="text-xl font-bold text-stone-800 mb-6">{currentLesson.title}</h1>

          {/* 根據內容類型顯示 */}
          {currentLesson.content_type === 'video' && currentLesson.media_url && (
            <div className="aspect-video bg-black rounded-xl mb-6 overflow-hidden">
              <video
                src={currentLesson.media_url}
                controls
                className="w-full h-full"
              />
            </div>
          )}

          {currentLesson.content_type === 'image' && currentLesson.media_url && (
            <img
              src={currentLesson.media_url}
              alt={currentLesson.title}
              className="w-full rounded-xl mb-6"
            />
          )}

          {currentLesson.content && (
            <div
              className="prose prose-stone max-w-none bg-white rounded-xl border border-stone-200 p-6"
              dangerouslySetInnerHTML={{ __html: currentLesson.content }}
            />
          )}
        </main>

        {/* 導航按鈕 */}
        <footer className="bg-white border-t border-stone-200 sticky bottom-0">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={prevLesson}
              disabled={currentLessonIndex === 0}
              className="flex items-center gap-2 px-4 py-2 text-stone-600 hover:text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={20} />
              上一章
            </button>

            <button
              onClick={nextLesson}
              className="flex items-center gap-2 px-6 py-2 bg-amber-500 text-white font-medium rounded-lg hover:bg-amber-600 transition-colors"
            >
              {currentLessonIndex === lessons.length - 1 ? (
                course.has_quiz ? '進入測驗' : '完成課程'
              ) : (
                '下一章'
              )}
              <ChevronRight size={20} />
            </button>
          </div>
        </footer>
      </div>
    );
  }

  // 測驗視圖
  if (currentView === 'quiz') {
    return (
      <div className="min-h-screen bg-stone-50">
        <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="font-bold text-stone-800">課後測驗</h1>
            <span className="text-sm text-stone-500">
              {Object.keys(quizAnswers).length} / {questions.length} 題已作答
            </span>
          </div>
        </header>

        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="space-y-6">
            {questions.map((question, qIndex) => (
              <div key={question.id} className="bg-white rounded-xl border border-stone-200 p-6">
                <div className="flex items-start gap-3 mb-4">
                  <span className="w-8 h-8 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {qIndex + 1}
                  </span>
                  <p className="font-medium text-stone-800">{question.question_text}</p>
                </div>

                <div className="space-y-2 ml-11">
                  {question.options?.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        quizAnswers[question.id] === option.id
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <input
                        type={question.question_type === 'multiple_choice' ? 'checkbox' : 'radio'}
                        name={`question-${question.id}`}
                        value={option.id}
                        checked={quizAnswers[question.id] === option.id}
                        onChange={() => setQuizAnswers(prev => ({
                          ...prev,
                          [question.id]: option.id
                        }))}
                        className="w-4 h-4 text-amber-500 focus:ring-amber-500"
                      />
                      <span className="text-stone-700">{option.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={submitQuiz}
            disabled={quizSubmitting || Object.keys(quizAnswers).length < questions.length}
            className="w-full mt-6 py-4 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {quizSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                提交中...
              </>
            ) : (
              '提交測驗'
            )}
          </button>
        </main>
      </div>
    );
  }

  // 測驗結果
  if (currentView === 'result') {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-8 max-w-md w-full text-center">
          {quizResult?.isPassed ? (
            <>
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">恭喜通過！</h2>
              <p className="text-stone-500 mb-6">您已成功完成此課程</p>
            </>
          ) : (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">未通過</h2>
              <p className="text-stone-500 mb-6">請再接再厲</p>
            </>
          )}

          <div className="bg-stone-50 rounded-xl p-4 mb-6">
            <div className="text-4xl font-bold text-amber-600 mb-1">
              {quizResult?.percentage}%
            </div>
            <div className="text-sm text-stone-500">
              {quizResult?.score} / {quizResult?.totalPoints} 分
            </div>
            <div className="text-xs text-stone-400 mt-1">
              及格分數: {course.passing_score}%
            </div>
          </div>

          <div className="space-y-3">
            {!quizResult?.isPassed && (course.max_attempts === 0 || attemptCount < course.max_attempts) && (
              <button
                onClick={retryQuiz}
                className="w-full py-3 bg-amber-500 text-white font-medium rounded-xl hover:bg-amber-600 transition-colors"
              >
                重新測驗
                {course.max_attempts > 0 && (
                  <span className="text-sm opacity-80 ml-2">
                    (剩餘 {course.max_attempts - attemptCount} 次)
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => navigate(`${BASE_PATH}`)}
              className="w-full py-3 border border-stone-300 text-stone-700 font-medium rounded-xl hover:bg-stone-50 transition-colors"
            >
              返回課程列表
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
