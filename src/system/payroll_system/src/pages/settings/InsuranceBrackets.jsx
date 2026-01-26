import React, { useEffect, useState } from 'react';
import {
  FileText,
  Plus,
  Edit2,
  Loader2,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { usePermission } from '../../../../../hooks/usePermission';

export default function InsuranceBrackets() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brackets, setBrackets] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { hasPermission: canManage, loading: permLoading } = usePermission('payroll.insurance.manage');

  useEffect(() => {
    fetchBrackets();
  }, []);

  const fetchBrackets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('insurance_brackets')
        .select('*')
        .eq('is_active', true)
        .order('bracket_level', { ascending: true });

      if (error) throw error;
      setBrackets(data || []);
    } catch (error) {
      console.error('Error fetching brackets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bracket) => {
    setEditingId(bracket.id);
    setEditForm({
      salary_min: bracket.salary_min,
      salary_max: bracket.salary_max,
      insured_salary: bracket.insured_salary,
      labor_employee: bracket.labor_employee,
      labor_employer: bracket.labor_employer,
      health_employee: bracket.health_employee,
      health_employer: bracket.health_employer,
    });
  };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      const updateData = {
        salary_min: parseFloat(editForm.salary_min),
        salary_max: parseFloat(editForm.salary_max),
        insured_salary: parseFloat(editForm.insured_salary),
        labor_employee: parseFloat(editForm.labor_employee),
        labor_employer: parseFloat(editForm.labor_employer),
        health_employee: parseFloat(editForm.health_employee),
        health_employer: parseFloat(editForm.health_employer),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('insurance_brackets')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setEditingId(null);
      fetchBrackets();
    } catch (error) {
      console.error('Error saving:', error);
      alert('儲存失敗：' + error.message);
    } finally {
      setSaving(false);
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

  return (
    <div className="pb-20">
      {/* 標題 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl text-amber-600">
            <FileText className="h-6 w-6" />
          </div>
          勞健保投保級距
        </h1>
        <p className="text-stone-500 mt-1 text-sm">管理勞保、健保投保級距與費率</p>
      </div>

      {/* 說明 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-amber-600 shrink-0 mt-0.5" size={18} />
          <div className="text-sm text-amber-700">
            <p className="font-medium mb-1">級距說明</p>
            <ul className="space-y-0.5 text-amber-600">
              <li>• 勞保費率：12%（員工負擔 20%，雇主負擔 70%，政府負擔 10%）</li>
              <li>• 健保費率：5.17%（員工負擔 30%，雇主負擔 60%，政府負擔 10%）</li>
              <li>• 以上費率為參考值，實際請依勞動部最新公告調整</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
              <th className="p-3 text-center w-16">級距</th>
              <th className="p-3 text-right">薪資下限</th>
              <th className="p-3 text-right">薪資上限</th>
              <th className="p-3 text-right bg-blue-50 text-blue-700">投保薪資</th>
              <th className="p-3 text-right">勞保(員工)</th>
              <th className="p-3 text-right text-stone-400">勞保(雇主)</th>
              <th className="p-3 text-right">健保(員工)</th>
              <th className="p-3 text-right text-stone-400">健保(雇主)</th>
              {canManage && <th className="p-3 text-center w-20">操作</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {brackets.map((bracket) => (
              <tr key={bracket.id} className="hover:bg-stone-50 transition-colors">
                {editingId === bracket.id ? (
                  // 編輯模式
                  <>
                    <td className="p-3 text-center font-bold text-stone-800">
                      {bracket.bracket_level}
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={editForm.salary_min}
                        onChange={(e) => setEditForm({ ...editForm, salary_min: e.target.value })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-right text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={editForm.salary_max}
                        onChange={(e) => setEditForm({ ...editForm, salary_max: e.target.value })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-right text-sm"
                      />
                    </td>
                    <td className="p-3 bg-blue-50">
                      <input
                        type="number"
                        value={editForm.insured_salary}
                        onChange={(e) => setEditForm({ ...editForm, insured_salary: e.target.value })}
                        className="w-full px-2 py-1 border border-blue-300 rounded text-right text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={editForm.labor_employee}
                        onChange={(e) => setEditForm({ ...editForm, labor_employee: e.target.value })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-right text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={editForm.labor_employer}
                        onChange={(e) => setEditForm({ ...editForm, labor_employer: e.target.value })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-right text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={editForm.health_employee}
                        onChange={(e) => setEditForm({ ...editForm, health_employee: e.target.value })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-right text-sm"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        value={editForm.health_employer}
                        onChange={(e) => setEditForm({ ...editForm, health_employer: e.target.value })}
                        className="w-full px-2 py-1 border border-stone-300 rounded text-right text-sm"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => handleSave(bracket.id)}
                          disabled={saving}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-stone-400 hover:bg-stone-100 rounded"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  // 顯示模式
                  <>
                    <td className="p-3 text-center font-bold text-stone-800">
                      {bracket.bracket_level}
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-stone-600">
                      ${parseFloat(bracket.salary_min).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-stone-600">
                      ${parseFloat(bracket.salary_max).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-sm font-bold text-blue-700 bg-blue-50">
                      ${parseFloat(bracket.insured_salary).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-red-600">
                      ${parseFloat(bracket.labor_employee).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-stone-400">
                      ${parseFloat(bracket.labor_employer).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-red-600">
                      ${parseFloat(bracket.health_employee).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-sm text-stone-400">
                      ${parseFloat(bracket.health_employer).toLocaleString()}
                    </td>
                    {canManage && (
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleEdit(bracket)}
                          className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-center text-xs text-stone-400">
        共 {brackets.length} 個級距 | 生效日期：{brackets[0]?.effective_from || '-'}
      </div>
    </div>
  );
}
