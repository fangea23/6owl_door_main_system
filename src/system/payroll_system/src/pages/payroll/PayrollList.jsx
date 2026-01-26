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

/**
 * 薪資計算邏輯 - 依據 Excel 薪資表公式
 *
 * 月薪制（正職）公式：
 * - 本薪：固定月薪
 * - 時薪 = 本薪 ÷ 240
 * - 加班費(10日) = 時薪×1.34×加班前2hr + 時薪×1.67×加班2hr後 + 國假時薪×國假時數
 * - 特休代金 = 本薪÷240×特休代金時數
 * - 12日超額津貼 = 本薪÷240×12日時數
 * - 12日加班費 = 本薪÷240×M×1.34 + 本薪÷240×N×1.67
 * - 職務獎金 = 職務獎金基數÷30×在職天數
 * - 請假扣款 = 病假時數×(時薪÷2) + 事假時數×時薪
 *
 * 時薪制（計時人員）公式：
 * - 本薪 = 底薪基數÷30×在職天數 + 時薪×正常時數 + 有薪假時數×時薪
 * - 加班費(10日) = 加班前2hr費率×J + 加班2hr後費率×K + 國假時薪×O
 * - 特休代金 = 已休特休時數×時薪 + 國假時薪×特休代金時數
 * - 12日超額津貼 = 12日時數×國假時薪
 * - 12日加班費 = M×加班前2hr費率 + N×加班2hr後費率
 * - 請假扣款 = 病假時數×(-時薪÷2)（計時病假負值）
 */
function calculatePayroll(attendance, grade, setting, insurance) {
  const isMonthly = grade?.salary_type === 'monthly';
  const workDaysInMonth = attendance.work_days_in_month || 30;

  // 基本薪資參數
  const baseSalaryGrade = setting?.custom_base_salary || grade?.base_salary || 0;
  const hourlyRateGrade = setting?.custom_hourly_rate || grade?.hourly_rate || 0;
  const positionAllowanceGrade = setting?.custom_position_allowance || grade?.position_allowance || 0;
  const mealAllowance = setting?.custom_meal_allowance || grade?.meal_allowance || 0;

  // 費率（從薪資級距取得或動態計算）
  const holidayHourlyRate = grade?.holiday_hourly_rate || (isMonthly ? Math.round(baseSalaryGrade / 240) : hourlyRateGrade);
  const overtimeRate134 = grade?.overtime_rate_134 || Math.round((isMonthly ? baseSalaryGrade / 240 : hourlyRateGrade) * 1.34);
  const overtimeRate167 = grade?.overtime_rate_167 || Math.round((isMonthly ? baseSalaryGrade / 240 : hourlyRateGrade) * 1.67);
  const sickLeaveRate = grade?.sick_leave_rate || (isMonthly ? Math.round(baseSalaryGrade / 240 / 2) : -Math.round(hourlyRateGrade / 2));
  const personalLeaveRate = grade?.personal_leave_rate || (isMonthly ? Math.round(baseSalaryGrade / 240) : 0);

  // ==================== 10日發薪項目 ====================

  let baseSalary = 0;

  if (isMonthly) {
    // 月薪制：本薪固定
    baseSalary = baseSalaryGrade;
  } else {
    // 時薪制：底薪基數÷30×在職天數 + 時薪×正常時數 + 有薪假×時薪
    const baseSalaryMonthly = grade?.base_salary_monthly || 0;  // 計時底薪基數
    const proRataBase = Math.round(baseSalaryMonthly / 30 * workDaysInMonth);
    const regularPay = Math.round(hourlyRateGrade * (attendance.regular_hours || 0));
    const paidLeavePay = Math.round((attendance.paid_leave_hours || 0) * hourlyRateGrade);
    baseSalary = proRataBase + regularPay + paidLeavePay;
  }

  // 加班費 (10日) - 使用 1.34/1.67 費率
  const overtimePay134 = Math.round(overtimeRate134 * (attendance.overtime_hours_134 || 0));
  const overtimePay167 = Math.round(overtimeRate167 * (attendance.overtime_hours_167 || 0));

  // 國假加班費
  const holidayPay = Math.round(holidayHourlyRate * (attendance.holiday_hours || 0));

  // 特休代金
  let annualLeavePay = 0;
  if (isMonthly) {
    // 管理者：本薪÷240×特休代金時數
    annualLeavePay = Math.round(baseSalaryGrade / 240 * (attendance.annual_leave_pay_hours || 0));
  } else {
    // 計時人員：已休特休時數×時薪 + 國假時薪×特休代金時數
    const usedPay = Math.round((attendance.annual_leave_used_hours || 0) * hourlyRateGrade);
    const payHoursPay = Math.round(holidayHourlyRate * (attendance.annual_leave_pay_hours || 0));
    annualLeavePay = usedPay + payHoursPay;
  }

  // 三節生日獎金（從出勤資料或手動輸入）
  const festivalBonus = attendance.festival_bonus || 0;

  // ==================== 10日扣款項目 ====================

  // 請假扣款
  const sickLeaveDeduction = Math.round(Math.abs(sickLeaveRate) * (attendance.sick_leave_hours || 0));
  const personalLeaveDeduction = Math.round(personalLeaveRate * (attendance.personal_leave_hours || 0));

  // 勞健保
  const laborEmployee = setting?.labor_insurance_enabled ? (insurance?.labor_employee || 0) : 0;
  const healthEmployee = setting?.health_insurance_enabled ? (insurance?.health_employee || 0) : 0;
  const laborEmployer = setting?.labor_insurance_enabled ? (insurance?.labor_employer || 0) : 0;
  const healthEmployer = setting?.health_insurance_enabled ? (insurance?.health_employer || 0) : 0;

  // 健保眷屬費（眷屬數 × 健保費）
  const dependentsCount = setting?.dependents_count || 0;
  const healthDependents = Math.round(healthEmployee * dependentsCount);

  // 預支、追朔等（從出勤資料）
  const advancePayment = attendance.advance_payment || 0;
  const laborRetroactive = attendance.labor_insurance_retroactive || 0;
  const healthRetroactive = attendance.health_insurance_retroactive || 0;
  const otherDeduction = attendance.other_deduction || 0;

  // 10日應發
  const pay10thGross = baseSalary + overtimePay134 + overtimePay167 + holidayPay + annualLeavePay + festivalBonus;

  // 10日應扣
  const pay10thDeduction = sickLeaveDeduction + personalLeaveDeduction +
    laborEmployee + healthEmployee + healthDependents +
    advancePayment + laborRetroactive + healthRetroactive + otherDeduction;

  // 10日實發
  const pay10thNet = pay10thGross - pay10thDeduction;

  // ==================== 12日發薪項目 ====================

  // 12日超額津貼
  let overtime12thAllowance = 0;
  if (isMonthly) {
    // 管理者：本薪÷240×12日時數
    overtime12thAllowance = Math.round(baseSalaryGrade / 240 * (attendance.overtime_12th_hours || 0));
  } else {
    // 計時人員：12日時數×國假時薪
    overtime12thAllowance = Math.round((attendance.overtime_12th_hours || 0) * holidayHourlyRate);
  }

  // 12日加班費
  let overtime12thPay = 0;
  if (isMonthly) {
    // 管理者：本薪÷240×M×1.34 + 本薪÷240×N×1.67
    const hourly = baseSalaryGrade / 240;
    overtime12thPay = Math.round(hourly * (attendance.overtime_12th_hours_134 || 0) * 1.34) +
                      Math.round(hourly * (attendance.overtime_12th_hours_167 || 0) * 1.67);
  } else {
    // 計時人員：M×加班前2hr費率 + N×加班2hr後費率
    overtime12thPay = Math.round((attendance.overtime_12th_hours_134 || 0) * overtimeRate134) +
                      Math.round((attendance.overtime_12th_hours_167 || 0) * overtimeRate167);
  }

  // 職務獎金（按在職天數比例）
  const positionAllowance = Math.round(positionAllowanceGrade / 30 * workDaysInMonth);

  // 12日其他獎金
  const performanceBonus = attendance.performance_bonus || 0;
  const attendanceBonus = attendance.attendance_bonus || 0;
  const otherBonus = attendance.other_bonus || 0;

  // 12日扣項
  const pay12thDeduction = attendance.pay_12th_deduction || 0;

  // 12日應發
  const pay12thGross = overtime12thAllowance + overtime12thPay + positionAllowance +
    mealAllowance + performanceBonus + attendanceBonus + otherBonus;

  // 12日實發
  const pay12thTotal = pay12thGross - pay12thDeduction;

  // ==================== 總計 ====================

  const totalGross = pay10thGross + pay12thGross;
  const totalDeduction = pay10thDeduction + pay12thDeduction;
  const totalNet = pay10thNet + pay12thTotal;

  return {
    // 10日發薪
    base_salary: baseSalary,
    overtime_pay_134: overtimePay134,
    overtime_pay_167: overtimePay167,
    holiday_pay: holidayPay,
    annual_leave_pay: annualLeavePay,
    festival_bonus: festivalBonus,
    sick_leave_deduction: sickLeaveDeduction,
    personal_leave_deduction: personalLeaveDeduction,
    labor_insurance_employee: laborEmployee,
    health_insurance_employee: healthEmployee,
    health_insurance_dependents: healthDependents,
    advance_payment: advancePayment,
    labor_insurance_retroactive: laborRetroactive,
    health_insurance_retroactive: healthRetroactive,
    other_deduction: otherDeduction,
    pay_10th_gross: pay10thGross,
    pay_10th_deduction: pay10thDeduction,
    pay_10th_net: pay10thNet,

    // 12日發薪
    overtime_12th_allowance: overtime12thAllowance,
    overtime_12th_pay: overtime12thPay,
    position_allowance: positionAllowance,
    meal_allowance: mealAllowance,
    performance_bonus: performanceBonus,
    attendance_bonus: attendanceBonus,
    other_bonus: otherBonus,
    pay_12th_deduction: pay12thDeduction,
    pay_12th_total: pay12thTotal,

    // 雇主負擔
    labor_insurance_employer: laborEmployer,
    health_insurance_employer: healthEmployer,

    // 總計
    total_gross: totalGross,
    total_deduction: totalDeduction,
    total_net: totalNet,

    // 保留舊欄位相容性
    overtime_pay_133: overtimePay134,
    overtime_pay_166: overtimePay167,
    overtime_pay_200: 0,  // 已整合到 holiday_pay
  };
}

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

      // 取得員工薪資設定（含薪資級距和保險級距）
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

        // 使用新的計算函數
        const calculated = calculatePayroll(attendance, grade, setting, insurance);

        const payrollRecord = {
          period_id: selectedPeriodId,
          employee_id: attendance.employee_id,
          attendance_id: attendance.id,
          salary_setting_id: setting?.id,
          store_id: attendance.store_id,
          ...calculated,
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
            .update(payrollRecord)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('payroll_main')
            .insert(payrollRecord);
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
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-stone-50 text-stone-500 text-xs font-bold uppercase tracking-wider border-b border-stone-200">
                <th className="p-4 text-left">員工</th>
                <th className="p-4 text-left">門市</th>
                <th className="p-4 text-right">本薪</th>
                <th className="p-4 text-right">加班費</th>
                <th className="p-4 text-right">國假</th>
                <th className="p-4 text-right bg-blue-50 text-blue-700">10日實發</th>
                <th className="p-4 text-right">職務獎金</th>
                <th className="p-4 text-right bg-purple-50 text-purple-700">12日實發</th>
                <th className="p-4 text-right bg-red-50 text-red-700">總淨額</th>
                <th className="p-4 text-center">狀態</th>
                <th className="p-4 text-center w-20">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {payrollData.map((payroll) => {
                const store = stores.find(s => s.id === payroll.store_id);
                const overtimeTotal = parseFloat(payroll.overtime_pay_134 || payroll.overtime_pay_133 || 0) +
                                     parseFloat(payroll.overtime_pay_167 || payroll.overtime_pay_166 || 0);

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
                    <td className="p-4 text-right font-mono text-sm text-red-600">
                      ${parseFloat(payroll.holiday_pay || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono font-bold text-blue-700 bg-blue-50">
                      ${parseFloat(payroll.pay_10th_net || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono text-sm">
                      ${parseFloat(payroll.position_allowance || 0).toLocaleString()}
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
