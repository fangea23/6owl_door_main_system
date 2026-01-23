import React, { useEffect, useState } from 'react';
import {
  Users,
  Search,
  Edit2,
  Loader2,
  Save,
  X,
  Building,
  DollarSign,
  Shield,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { usePermission } from '../../../../../hooks/usePermission';

export default function EmployeeSalarySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [salaryGrades, setSalaryGrades] = useState([]);
  const [insuranceBrackets, setInsuranceBrackets] = useState([]);
  const [salarySettings, setSalarySettings] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStore, setFilterStore] = useState('all');
  const [stores, setStores] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const { hasPermission: canManage, loading: permLoading } = usePermission('payroll.employee_settings.manage');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 取得員工
      const { data: empData } = await supabase
        .from('employees')
        .select('id, name, employee_id, position, store_code, employment_type_new, bank_name, bank_account')
        .eq('status', 'active')
        .order('employee_id');

      // 取得薪資級距
      const { data: gradeData } = await supabase
        .from('salary_grades')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      // 取得勞健保級距
      const { data: bracketData } = await supabase
        .from('insurance_brackets')
        .select('*')
        .eq('is_active', true)
        .order('bracket_level');

      // 取得現有的員工薪資設定
      const { data: settingsData } = await supabase
        .from('employee_salary_settings')
        .select('*')
        .is('effective_to', null);

      // 取得門市
      const { data: storeData } = await supabase
        .from('stores')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code');

      setEmployees(empData || []);
      setSalaryGrades(gradeData || []);
      setInsuranceBrackets(bracketData || []);
      setStores(storeData || []);

      // 轉換為 Map 方便查詢
      const settingsMap = {};
      (settingsData || []).forEach(s => {
        settingsMap[s.employee_id] = s;
      });
      setSalarySettings(settingsMap);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (employee) => {
    const setting = salarySettings[employee.id] || {};
    setEditingId(employee.id);
    setEditForm({
      salary_grade_id: setting.salary_grade_id || '',
      custom_base_salary: setting.custom_base_salary || '',
      custom_hourly_rate: setting.custom_hourly_rate || '',
      custom_meal_allowance: setting.custom_meal_allowance || '',
      custom_position_allowance: setting.custom_position_allowance || '',
      insurance_bracket_id: setting.insurance_bracket_id || '',
      labor_insurance_enabled: setting.labor_insurance_enabled !== false,
      health_insurance_enabled: setting.health_insurance_enabled !== false,
      dependents_count: setting.dependents_count || 0,
      bank_code: setting.bank_code || '',
      bank_name: setting.bank_name || employee.bank_name || '',
      bank_account: setting.bank_account || employee.bank_account || '',
    });
  };

  const handleSave = async (employeeId) => {
    setSaving(true);
    try {
      const existingSetting = salarySettings[employeeId];

      const settingData = {
        employee_id: employeeId,
        salary_grade_id: editForm.salary_grade_id || null,
        custom_base_salary: editForm.custom_base_salary ? parseFloat(editForm.custom_base_salary) : null,
        custom_hourly_rate: editForm.custom_hourly_rate ? parseFloat(editForm.custom_hourly_rate) : null,
        custom_meal_allowance: editForm.custom_meal_allowance ? parseFloat(editForm.custom_meal_allowance) : null,
        custom_position_allowance: editForm.custom_position_allowance ? parseFloat(editForm.custom_position_allowance) : null,
        insurance_bracket_id: editForm.insurance_bracket_id || null,
        labor_insurance_enabled: editForm.labor_insurance_enabled,
        health_insurance_enabled: editForm.health_insurance_enabled,
        dependents_count: parseInt(editForm.dependents_count) || 0,
        bank_code: editForm.bank_code || null,
        bank_name: editForm.bank_name || null,
        bank_account: editForm.bank_account || null,
        updated_at: new Date().toISOString()
      };

      if (existingSetting?.id) {
        // 更新
        const { error } = await supabase
          .from('employee_salary_settings')
          .update(settingData)
          .eq('id', existingSetting.id);

        if (error) throw error;
      } else {
        // 新增
        settingData.effective_from = new Date().toISOString().split('T')[0];
        const { error } = await supabase
          .from('employee_salary_settings')
          .insert(settingData);

        if (error) throw error;
      }

      setEditingId(null);
      fetchData();
    } catch (error) {
      console.error('Error saving:', error);
      alert('儲存失敗：' + error.message);
    } finally {
      setSaving(false);
    }
  };

  // 過濾員工
  const filteredEmployees = employees.filter(emp => {
    const matchSearch = !searchTerm ||
      emp.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStore = filterStore === 'all' || emp.store_code === filterStore;

    return matchSearch && matchStore;
  });

  // 取得員工的薪資級距名稱
  const getGradeName = (employeeId) => {
    const setting = salarySettings[employeeId];
    if (!setting?.salary_grade_id) return '-';
    const grade = salaryGrades.find(g => g.id === setting.salary_grade_id);
    return grade?.name || '-';
  };

  // 取得有效薪資
  const getEffectiveSalary = (employeeId) => {
    const setting = salarySettings[employeeId];
    if (!setting) return { type: '-', amount: 0 };

    const grade = salaryGrades.find(g => g.id === setting.salary_grade_id);

    if (grade?.salary_type === 'monthly') {
      const amount = setting.custom_base_salary || grade?.base_salary || 0;
      return { type: '月薪', amount };
    } else if (grade?.salary_type === 'hourly') {
      const amount = setting.custom_hourly_rate || grade?.hourly_rate || 0;
      return { type: '時薪', amount };
    }

    return { type: '-', amount: 0 };
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
          <div className="p-2 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl text-indigo-600">
            <Users className="h-6 w-6" />
          </div>
          員工薪資設定
        </h1>
        <p className="text-stone-500 mt-1 text-sm">設定每位員工的薪資級距、勞健保與銀行帳戶</p>
      </div>

      {/* 搜尋與篩選 */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <input
            type="text"
            placeholder="搜尋員工姓名或編號..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="pl-10 pr-10 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
          >
            <option value="all">全部門市</option>
            {stores.map(store => (
              <option key={store.id} value={store.code}>{store.code} - {store.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
        </div>
      </div>

      {/* 員工列表 */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 text-left">員工</th>
                <th className="p-4 text-left">門市</th>
                <th className="p-4 text-left">薪資級距</th>
                <th className="p-4 text-right">薪資</th>
                <th className="p-4 text-center">勞保</th>
                <th className="p-4 text-center">健保</th>
                <th className="p-4 text-left">銀行帳戶</th>
                {canManage && <th className="p-4 text-center w-20">操作</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredEmployees.map((emp) => {
                const salary = getEffectiveSalary(emp.id);
                const setting = salarySettings[emp.id];

                return (
                  <tr key={emp.id} className="hover:bg-stone-50 transition-colors">
                    {editingId === emp.id ? (
                      // 編輯模式
                      <>
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-stone-800">{emp.name}</p>
                            <p className="text-xs text-stone-400">{emp.employee_id}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-stone-600">
                          {emp.store_code || '-'}
                        </td>
                        <td className="p-4">
                          <select
                            value={editForm.salary_grade_id}
                            onChange={(e) => setEditForm({ ...editForm, salary_grade_id: e.target.value })}
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm"
                          >
                            <option value="">選擇級距</option>
                            <optgroup label="月薪制">
                              {salaryGrades.filter(g => g.salary_type === 'monthly').map(g => (
                                <option key={g.id} value={g.id}>{g.name} (${g.base_salary?.toLocaleString()})</option>
                              ))}
                            </optgroup>
                            <optgroup label="時薪制">
                              {salaryGrades.filter(g => g.salary_type === 'hourly').map(g => (
                                <option key={g.id} value={g.id}>{g.name} (${g.hourly_rate}/hr)</option>
                              ))}
                            </optgroup>
                          </select>
                        </td>
                        <td className="p-4">
                          <input
                            type="number"
                            placeholder="自訂薪資(可選)"
                            value={editForm.custom_base_salary || editForm.custom_hourly_rate || ''}
                            onChange={(e) => {
                              const grade = salaryGrades.find(g => g.id === editForm.salary_grade_id);
                              if (grade?.salary_type === 'monthly') {
                                setEditForm({ ...editForm, custom_base_salary: e.target.value, custom_hourly_rate: '' });
                              } else {
                                setEditForm({ ...editForm, custom_hourly_rate: e.target.value, custom_base_salary: '' });
                              }
                            }}
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm text-right"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={editForm.labor_insurance_enabled}
                            onChange={(e) => setEditForm({ ...editForm, labor_insurance_enabled: e.target.checked })}
                            className="w-4 h-4 text-red-600 rounded"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={editForm.health_insurance_enabled}
                            onChange={(e) => setEditForm({ ...editForm, health_insurance_enabled: e.target.checked })}
                            className="w-4 h-4 text-red-600 rounded"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            placeholder="銀行帳號"
                            value={editForm.bank_account}
                            onChange={(e) => setEditForm({ ...editForm, bank_account: e.target.value })}
                            className="w-full px-2 py-1 border border-stone-300 rounded text-sm"
                          />
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-1">
                            <button
                              onClick={() => handleSave(emp.id)}
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
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-stone-800">{emp.name}</p>
                            <p className="text-xs text-stone-400">{emp.employee_id}</p>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-stone-600">
                          {emp.store_code || '-'}
                        </td>
                        <td className="p-4">
                          <span className={`text-sm ${setting?.salary_grade_id ? 'text-stone-800' : 'text-stone-400'}`}>
                            {getGradeName(emp.id)}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          {salary.amount > 0 ? (
                            <div>
                              <span className="font-mono font-bold text-red-600">
                                ${parseFloat(salary.amount).toLocaleString()}
                              </span>
                              <span className="text-xs text-stone-400 ml-1">
                                /{salary.type === '時薪' ? 'hr' : '月'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-stone-400">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {setting?.labor_insurance_enabled !== false ? (
                            <Shield size={16} className="inline text-emerald-500" />
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {setting?.health_insurance_enabled !== false ? (
                            <Shield size={16} className="inline text-blue-500" />
                          ) : (
                            <span className="text-stone-300">-</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-stone-600">
                          {setting?.bank_account || emp.bank_account || '-'}
                        </td>
                        {canManage && (
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleEdit(emp)}
                              className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-stone-400">
        顯示 {filteredEmployees.length} / {employees.length} 位員工
      </div>
    </div>
  );
}
