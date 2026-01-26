import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Save,
  X,
  DollarSign,
  Clock
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import { usePermission } from '../../../../../hooks/usePermission';

export default function SalaryGrades() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newGrade, setNewGrade] = useState({
    code: '',
    name: '',
    salary_type: 'monthly',
    base_salary: '',
    hourly_rate: '',
    meal_allowance: '0',
    position_allowance: '0',
    description: ''
  });

  const { hasPermission: canManage, loading: permLoading } = usePermission('payroll.salary_grades.manage');

  useEffect(() => {
    fetchGrades();
  }, []);

  const fetchGrades = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salary_grades')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setGrades(data || []);
    } catch (error) {
      console.error('Error fetching salary grades:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (grade) => {
    setEditingId(grade.id);
    setEditForm({
      code: grade.code,
      name: grade.name,
      salary_type: grade.salary_type,
      base_salary: grade.base_salary || '',
      hourly_rate: grade.hourly_rate || '',
      meal_allowance: grade.meal_allowance || 0,
      position_allowance: grade.position_allowance || 0,
      description: grade.description || ''
    });
  };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      const updateData = {
        ...editForm,
        base_salary: editForm.salary_type === 'monthly' ? parseFloat(editForm.base_salary) || null : null,
        hourly_rate: editForm.salary_type === 'hourly' ? parseFloat(editForm.hourly_rate) || null : null,
        meal_allowance: parseFloat(editForm.meal_allowance) || 0,
        position_allowance: parseFloat(editForm.position_allowance) || 0,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('salary_grades')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      fetchGrades();
    } catch (error) {
      console.error('Error saving:', error);
      alert('儲存失敗：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const insertData = {
        code: newGrade.code,
        name: newGrade.name,
        salary_type: newGrade.salary_type,
        base_salary: newGrade.salary_type === 'monthly' ? parseFloat(newGrade.base_salary) || null : null,
        hourly_rate: newGrade.salary_type === 'hourly' ? parseFloat(newGrade.hourly_rate) || null : null,
        meal_allowance: parseFloat(newGrade.meal_allowance) || 0,
        position_allowance: parseFloat(newGrade.position_allowance) || 0,
        description: newGrade.description,
        sort_order: grades.length * 10 + 10
      };

      const { error } = await supabase
        .from('salary_grades')
        .insert(insertData);

      if (error) throw error;

      setShowAddForm(false);
      setNewGrade({
        code: '',
        name: '',
        salary_type: 'monthly',
        base_salary: '',
        hourly_rate: '',
        meal_allowance: '0',
        position_allowance: '0',
        description: ''
      });
      fetchGrades();
    } catch (error) {
      console.error('Error adding:', error);
      alert('新增失敗：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`確定要刪除「${name}」嗎？`)) return;

    try {
      const { error } = await supabase
        .from('salary_grades')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      fetchGrades();
    } catch (error) {
      console.error('Error deleting:', error);
      alert('刪除失敗：' + error.message);
    }
  };

  if (loading || permLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin mb-3 text-red-500" size={32} />
        <p className="text-stone-400">載入中...</p>
      </div>
    );
  }

  const monthlyGrades = grades.filter(g => g.salary_type === 'monthly');
  const hourlyGrades = grades.filter(g => g.salary_type === 'hourly');

  return (
    <div className="pb-20">
      {/* 標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-xl text-purple-600">
              <TrendingUp className="h-6 w-6" />
            </div>
            薪資級距設定
          </h1>
          <p className="text-stone-500 mt-1 text-sm">管理各職等的薪資標準</p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-gradient-to-r from-red-500 to-amber-500 text-white px-5 py-2.5 rounded-xl hover:from-red-600 hover:to-amber-600 font-medium shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
          >
            <Plus size={18} />
            新增級距
          </button>
        )}
      </div>

      {/* 新增表單 */}
      {showAddForm && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm animate-slide-in">
          <h3 className="font-bold text-stone-800 mb-4">新增薪資級距</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">代碼</label>
              <input
                type="text"
                value={newGrade.code}
                onChange={(e) => setNewGrade({ ...newGrade, code: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="如：fulltime_3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">名稱</label>
              <input
                type="text"
                value={newGrade.name}
                onChange={(e) => setNewGrade({ ...newGrade, name: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="如：正職3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">薪資類型</label>
              <select
                value={newGrade.salary_type}
                onChange={(e) => setNewGrade({ ...newGrade, salary_type: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="monthly">月薪制</option>
                <option value="hourly">時薪制</option>
              </select>
            </div>
            {newGrade.salary_type === 'monthly' ? (
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">底薪</label>
                <input
                  type="number"
                  value={newGrade.base_salary}
                  onChange={(e) => setNewGrade({ ...newGrade, base_salary: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="28590"
                />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-stone-600 mb-1">時薪</label>
                <input
                  type="number"
                  value={newGrade.hourly_rate}
                  onChange={(e) => setNewGrade({ ...newGrade, hourly_rate: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="183"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">伙食津貼</label>
              <input
                type="number"
                value={newGrade.meal_allowance}
                onChange={(e) => setNewGrade({ ...newGrade, meal_allowance: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="2400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-600 mb-1">職務津貼</label>
              <input
                type="number"
                value={newGrade.position_allowance}
                onChange={(e) => setNewGrade({ ...newGrade, position_allowance: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !newGrade.code || !newGrade.name}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              儲存
            </button>
          </div>
        </div>
      )}

      {/* 月薪制 */}
      <div className="mb-8">
        <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
          <DollarSign size={20} className="text-purple-500" />
          月薪制
        </h2>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 text-left">代碼</th>
                <th className="p-4 text-left">名稱</th>
                <th className="p-4 text-right">底薪</th>
                <th className="p-4 text-right">伙食津貼</th>
                <th className="p-4 text-right">職務津貼</th>
                {canManage && <th className="p-4 text-center w-24">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {monthlyGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-stone-50 transition-colors">
                  {editingId === grade.id ? (
                    // 編輯模式
                    <>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.code}
                          onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          value={editForm.base_salary}
                          onChange={(e) => setEditForm({ ...editForm, base_salary: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded text-right"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          value={editForm.meal_allowance}
                          onChange={(e) => setEditForm({ ...editForm, meal_allowance: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded text-right"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          value={editForm.position_allowance}
                          onChange={(e) => setEditForm({ ...editForm, position_allowance: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded text-right"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleSave(grade.id)}
                            disabled={saving}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-stone-400 hover:bg-stone-100 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    // 顯示模式
                    <>
                      <td className="p-4 font-mono text-sm text-stone-600">{grade.code}</td>
                      <td className="p-4 font-medium text-stone-800">{grade.name}</td>
                      <td className="p-4 text-right font-mono text-red-600">
                        ${parseFloat(grade.base_salary || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-stone-600">
                        ${parseFloat(grade.meal_allowance || 0).toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-stone-600">
                        ${parseFloat(grade.position_allowance || 0).toLocaleString()}
                      </td>
                      {canManage && (
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleEdit(grade)}
                              className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(grade.id, grade.name)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 時薪制 */}
      <div>
        <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
          <Clock size={20} className="text-blue-500" />
          時薪制
        </h2>
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 text-left">代碼</th>
                <th className="p-4 text-left">名稱</th>
                <th className="p-4 text-right">時薪</th>
                {canManage && <th className="p-4 text-center w-24">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {hourlyGrades.map((grade) => (
                <tr key={grade.id} className="hover:bg-stone-50 transition-colors">
                  {editingId === grade.id ? (
                    <>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.code}
                          onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded"
                        />
                      </td>
                      <td className="p-4">
                        <input
                          type="number"
                          value={editForm.hourly_rate}
                          onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value })}
                          className="w-full px-2 py-1 border border-stone-300 rounded text-right"
                        />
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleSave(grade.id)}
                            disabled={saving}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                          >
                            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-stone-400 hover:bg-stone-100 rounded"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-4 font-mono text-sm text-stone-600">{grade.code}</td>
                      <td className="p-4 font-medium text-stone-800">{grade.name}</td>
                      <td className="p-4 text-right font-mono text-blue-600">
                        ${parseFloat(grade.hourly_rate || 0).toLocaleString()}/hr
                      </td>
                      {canManage && (
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleEdit(grade)}
                              className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(grade.id, grade.name)}
                              className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
