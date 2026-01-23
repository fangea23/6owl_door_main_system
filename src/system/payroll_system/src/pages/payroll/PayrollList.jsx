import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calculator,
  Loader2,
  Calendar,
  ChevronDown,
  Play,
  CheckCircle2,
  Eye,
  DollarSign,
  Users,
  AlertCircle,
  Building
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';
import { usePermission } from '../../../../../hooks/usePermission';

const BASE_PATH = '/systems/payroll';

// 狀態對照
const STATUS_MAP = {
  'draft': { label: '草稿', color: 'bg-stone-100 text-stone-600' },
  'calculated': { label: '已計算', color: 'bg-blue-100 text-blue-700' },
  'reviewed': { label: '已審核', color: 'bg-purple-100 text-purple-700' },
  'approved': { label: '已核准', color: 'bg-emerald-100 text-emerald-700' },
  'paid_10th': { label: '10日已發', color: 'bg-amber-100 text-amber-700' },
  'paid_12th': { label: '12日已發', color: 'bg-teal-100 text-teal-700' },
  'completed': { label: '完成', color: 'bg-green-100 text-green-700' },
};

export default function PayrollList() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [payrollData, setPayrollData] = useState([]);
  const [stores, setStores] = useState([]);
  const [filterStore, setFilterStore] = useState('all');

  const { hasPermission: canCalculate, loading: permLoading } = usePermission('payroll.payroll.calculate');
  const { hasPermission: canReview } = usePermission('payroll.payroll.review');
  const { hasPermission: canApprove } = usePermission('payroll.payroll.approve');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      fetchPayrollData();
    }
  }, [selectedPeriodId, filterStore]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: periodData } = await supabase
        .from('payroll_periods')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(12);

      setPeriods(periodData || []);

      if (periodData && periodData.length > 0) {
        setSelectedPeriodId(periodData[0].id);
      }

      const { data: storeData } = await supabase
        .from('stores')
        .select('id, code, name')
        .eq('is_active', true)
        .order('code');

      setStores(storeData || []);

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollData = async () => {
    try {
      let query = supabase
        .from('payroll_main')
        .select('*')
        .eq('period_id', selectedPeriodId)
        .order('employee_id');

      if (filterStore !== 'all') {
        query = query.eq('store_id', parseInt(filterStore));
      }

      const { data } = await query;

      // 取得員工資訊
      const employeeIds = data?.map(d => d.employee_id) || [];
      if (employeeIds.length > 0) {
        const { data: employees } = await supabase
          .from('employees')
          .select('id, name, employee_id, store_code')
          .in('id', employeeIds);

        const enriched = (data || []).map(item => ({
          ...item,
          employee: employees?.find(e => e.id === item.employee_id)
        }));

        setPayrollData(enriched);
      } else {
        setPayrollData([]);
      }

    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCalculate = async () => {
    if (!window.confirm('確定要執行薪資計算嗎？這將根據出勤資料計算所有員工的薪資。')) return;

    setCalculating(true);
    try {
      // 取得已核准的出勤資料
      const { data: attendanceData } = await supabase
        .from('monthly_attendance_summary')
        .select('*')
        .eq('period_id', selectedPeriodId)
        .eq('status', 'approved');

      if (!attendanceData || attendanceData.length === 0) {
        alert('沒有已核准的出勤資料，無法計算薪資');
        setCalculating(false);
        return;
      }

      // 取得員工薪資設定
      const employeeIds = attendanceData.map(a => a.employee_id);
      const { data: salarySettings } = await supabase
        .from('employee_salary_settings')
        .select('*, salary_grade:salary_grades(*), insurance:insurance_brackets(*)')
        .in('employee_id', employeeIds)
        .is('effective_to', null);

      // 對每個員工計算薪資
      for (const attendance of attendanceData) {
        const setting = salarySettings?.find(s => s.employee_id === attendance.employee_id);
        const grade = setting?.salary_grade;
        const insurance = setting?.insurance;

        // 基本薪資計算
        let baseSalary = 0;
        let overtimePay133 = 0;
        let overtimePay166 = 0;
        let overtimePay200 = 0;
        let hourlyRate = 0;

        if (grade?.salary_type === 'monthly') {
          baseSalary = setting?.custom_base_salary || grade?.base_salary || 0;
          // 月薪制加班費計算
          hourlyRate = baseSalary / 30 / 8;
          overtimePay133 = Math.round(hourlyRate * 1.33 * (attendance.overtime_hours_133 || 0));
          overtimePay166 = Math.round(hourlyRate * 1.66 * (attendance.overtime_hours_166 || 0));
          overtimePay200 = Math.round(hourlyRate * 2.0 * (attendance.overtime_hours_200 || 0));
        } else if (grade?.salary_type === 'hourly') {
          hourlyRate = setting?.custom_hourly_rate || grade?.hourly_rate || 0;
          baseSalary = Math.round(hourlyRate * (attendance.regular_hours || 0));
          overtimePay133 = Math.round(hourlyRate * 1.33 * (attendance.overtime_hours_133 || 0));
          overtimePay166 = Math.round(hourlyRate * 1.66 * (attendance.overtime_hours_166 || 0));
          overtimePay200 = Math.round(hourlyRate * 2.0 * (attendance.overtime_hours_200 || 0));
        }

        // 津貼
        const mealAllowance = setting?.custom_meal_allowance || grade?.meal_allowance || 0;
        const positionAllowance = setting?.custom_position_allowance || grade?.position_allowance || 0;

        // 勞健保
        const laborEmployee = setting?.labor_insurance_enabled ? (insurance?.labor_employee || 0) : 0;
        const healthEmployee = setting?.health_insurance_enabled ? (insurance?.health_employee || 0) : 0;
        const laborEmployer = setting?.labor_insurance_enabled ? (insurance?.labor_employer || 0) : 0;
        const healthEmployer = setting?.health_insurance_enabled ? (insurance?.health_employer || 0) : 0;

        // 10日發薪項目
        const pay10thGross = baseSalary + overtimePay133 + overtimePay166 + overtimePay200;
        const pay10thDeduction = laborEmployee + healthEmployee;
        const pay10thNet = pay10thGross - pay10thDeduction;

        // 12日發薪項目
        const pay12thTotal = mealAllowance + positionAllowance;

        // 總計
        const totalGross = pay10thGross + pay12thTotal;
        const totalDeduction = pay10thDeduction;
        const totalNet = totalGross - totalDeduction;

        const payrollData = {
          period_id: selectedPeriodId,
          employee_id: attendance.employee_id,
          attendance_id: attendance.id,
          salary_setting_id: setting?.id,
          store_id: attendance.store_id,
          base_salary: baseSalary,
          overtime_pay_133: overtimePay133,
          overtime_pay_166: overtimePay166,
          overtime_pay_200: overtimePay200,
          labor_insurance_employee: laborEmployee,
          health_insurance_employee: healthEmployee,
          labor_insurance_employer: laborEmployer,
          health_insurance_employer: healthEmployer,
          meal_allowance: mealAllowance,
          position_allowance: positionAllowance,
          pay_10th_gross: pay10thGross,
          pay_10th_deduction: pay10thDeduction,
          pay_10th_net: pay10thNet,
          pay_12th_total: pay12thTotal,
          total_gross: totalGross,
          total_deduction: totalDeduction,
          total_net: totalNet,
          status: 'calculated',
          calculated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Upsert
        const { data: existing } = await supabase
          .from('payroll_main')
          .select('id')
          .eq('period_id', selectedPeriodId)
          .eq('employee_id', attendance.employee_id)
          .single();

        if (existing) {
          await supabase
            .from('payroll_main')
            .update(payrollData)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('payroll_main')
            .insert(payrollData);
        }
      }

      alert('薪資計算完成！');
      fetchPayrollData();

    } catch (error) {
      console.error('Error calculating:', error);
      alert('計算失敗：' + error.message);
    } finally {
      setCalculating(false);
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

  // 統計
  const totalNet = payrollData.reduce((sum, p) => sum + parseFloat(p.total_net || 0), 0);
  const calculated = payrollData.filter(p => p.status !== 'draft').length;

  return (
    <div className="pb-20">
      {/* 標題 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-100 to-amber-100 rounded-xl text-red-600">
              <Calculator className="h-6 w-6" />
            </div>
            薪資計算
          </h1>
          <p className="text-stone-500 mt-1 text-sm">執行薪資計算與審核</p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* 週期選擇 */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="pl-10 pr-10 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>{p.period_name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
          </div>

          {/* 門市篩選 */}
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
            <select
              value={filterStore}
              onChange={(e) => setFilterStore(e.target.value)}
              className="pl-10 pr-10 py-2.5 border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">全部門市</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
          </div>

          {/* 執行計算 */}
          {canCalculate && (
            <button
              onClick={handleCalculate}
              disabled={calculating}
              className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-amber-500 text-white rounded-xl hover:from-red-600 hover:to-amber-600 font-medium shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
            >
              {calculating ? <Loader2 className="animate-spin" size={18} /> : <Play size={18} />}
              執行薪資計算
            </button>
          )}
        </div>
      </div>

      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">員工人數</p>
          <p className="text-2xl font-bold text-stone-800">{payrollData.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">已計算</p>
          <p className="text-2xl font-bold text-blue-600">{calculated}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">10日發薪總額</p>
          <p className="text-2xl font-bold text-amber-600">
            ${payrollData.reduce((sum, p) => sum + parseFloat(p.pay_10th_net || 0), 0).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200 p-4">
          <p className="text-xs text-stone-500">薪資總淨額</p>
          <p className="text-2xl font-bold text-red-600">${totalNet.toLocaleString()}</p>
        </div>
      </div>

      {/* 薪資列表 */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 text-left">員工</th>
                <th className="p-4 text-left">門市</th>
                <th className="p-4 text-right">本薪</th>
                <th className="p-4 text-right">加班費</th>
                <th className="p-4 text-right bg-blue-50 text-blue-700">10日實發</th>
                <th className="p-4 text-right">津貼/獎金</th>
                <th className="p-4 text-right bg-purple-50 text-purple-700">12日實發</th>
                <th className="p-4 text-right bg-red-50 text-red-700">總淨額</th>
                <th className="p-4 text-center">狀態</th>
                <th className="p-4 text-center w-20">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {payrollData.map((payroll) => {
                const store = stores.find(s => s.id === payroll.store_id);
                const overtimeTotal = parseFloat(payroll.overtime_pay_133 || 0) +
                                     parseFloat(payroll.overtime_pay_166 || 0) +
                                     parseFloat(payroll.overtime_pay_200 || 0);

                return (
                  <tr key={payroll.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-stone-800">{payroll.employee?.name}</p>
                      <p className="text-xs text-stone-400">{payroll.employee?.employee_id}</p>
                    </td>
                    <td className="p-4 text-sm text-stone-600">
                      {store?.code || payroll.employee?.store_code || '-'}
                    </td>
                    <td className="p-4 text-right font-mono text-sm">
                      ${parseFloat(payroll.base_salary || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono text-sm text-amber-600">
                      ${overtimeTotal.toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-blue-700 bg-blue-50">
                      ${parseFloat(payroll.pay_10th_net || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono text-sm">
                      ${parseFloat(payroll.pay_12th_total || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-purple-700 bg-purple-50">
                      ${parseFloat(payroll.pay_12th_total || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-red-600 bg-red-50">
                      ${parseFloat(payroll.total_net || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_MAP[payroll.status]?.color || 'bg-stone-100'}`}>
                        {STATUS_MAP[payroll.status]?.label || payroll.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <Link
                        to={`${BASE_PATH}/payroll/${payroll.id}`}
                        className="p-1.5 text-stone-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors inline-block"
                      >
                        <Eye size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {payrollData.length === 0 && (
          <div className="p-12 text-center">
            <Users className="mx-auto text-stone-300 mb-3" size={48} />
            <p className="text-stone-500">尚無薪資資料</p>
            <p className="text-xs text-stone-400 mt-1">請先確認出勤資料已核准，再執行薪資計算</p>
          </div>
        )}
      </div>

      <div className="mt-4 text-center text-xs text-stone-400">
        共 {payrollData.length} 筆薪資資料
      </div>
    </div>
  );
}
