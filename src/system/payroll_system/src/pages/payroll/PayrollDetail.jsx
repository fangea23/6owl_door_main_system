import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  DollarSign,
  Clock,
  Shield,
  Building,
  FileText
} from 'lucide-react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../AuthContext';

const BASE_PATH = '/systems/payroll';

export default function PayrollDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payroll, setPayroll] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [period, setPeriod] = useState(null);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 取得薪資主表
      const { data: payrollData } = await supabase
        .from('payroll_main')
        .select('*')
        .eq('id', id)
        .single();

      setPayroll(payrollData);

      if (payrollData) {
        // 取得員工資訊
        const { data: empData } = await supabase
          .from('employees')
          .select('*')
          .eq('id', payrollData.employee_id)
          .single();

        setEmployee(empData);

        // 取得薪資週期
        const { data: periodData } = await supabase
          .from('payroll_periods')
          .select('*')
          .eq('id', payrollData.period_id)
          .single();

        setPeriod(periodData);

        // 取得出勤資料
        if (payrollData.attendance_id) {
          const { data: attendanceData } = await supabase
            .from('monthly_attendance_summary')
            .select('*')
            .eq('id', payrollData.attendance_id)
            .single();

          setAttendance(attendanceData);
        }
      }

    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin mb-3 text-red-500" size={32} />
        <p className="text-stone-400">載入中...</p>
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-stone-500">找不到薪資資料</p>
        <Link to={`${BASE_PATH}/payroll`} className="text-red-600 hover:underline mt-2">
          返回列表
        </Link>
      </div>
    );
  }

  const overtimeTotal = parseFloat(payroll.overtime_pay_133 || 0) +
                        parseFloat(payroll.overtime_pay_166 || 0) +
                        parseFloat(payroll.overtime_pay_200 || 0);

  const insuranceTotal = parseFloat(payroll.labor_insurance_employee || 0) +
                         parseFloat(payroll.health_insurance_employee || 0);

  return (
    <div className="pb-20 max-w-4xl mx-auto">
      {/* 返回按鈕 */}
      <Link
        to={`${BASE_PATH}/payroll`}
        className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 mb-6"
      >
        <ArrowLeft size={18} />
        返回列表
      </Link>

      {/* 標題區塊 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-red-100 to-amber-100 rounded-xl">
              <User className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-800">{employee?.name}</h1>
              <p className="text-stone-500">{employee?.employee_id} | {employee?.position || '員工'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-stone-500">{period?.period_name}</p>
            <p className="text-3xl font-bold text-red-600 font-mono">
              ${parseFloat(payroll.total_net || 0).toLocaleString()}
            </p>
            <p className="text-xs text-stone-400">實發總額</p>
          </div>
        </div>
      </div>

      {/* 10日發薪明細 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <Calendar size={18} className="text-blue-600" />
          </div>
          10日發薪明細
          <span className="text-sm font-normal text-stone-400 ml-2">{period?.pay_date_10th}</span>
        </h2>

        <div className="space-y-3">
          {/* 應發項目 */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-emerald-700 mb-3">應發項目</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-stone-600">本薪</span>
                <span className="font-mono font-bold">${parseFloat(payroll.base_salary || 0).toLocaleString()}</span>
              </div>
              {parseFloat(payroll.overtime_pay_133 || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">加班費 (×1.33)</span>
                  <span className="font-mono">${parseFloat(payroll.overtime_pay_133).toLocaleString()}</span>
                </div>
              )}
              {parseFloat(payroll.overtime_pay_166 || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">加班費 (×1.66)</span>
                  <span className="font-mono">${parseFloat(payroll.overtime_pay_166).toLocaleString()}</span>
                </div>
              )}
              {parseFloat(payroll.overtime_pay_200 || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">假日加班 (×2.0)</span>
                  <span className="font-mono">${parseFloat(payroll.overtime_pay_200).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-emerald-200">
                <span className="font-bold text-emerald-700">應發小計</span>
                <span className="font-mono font-bold text-emerald-700">${parseFloat(payroll.pay_10th_gross || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 應扣項目 */}
          <div className="bg-red-50 rounded-xl p-4">
            <h3 className="text-sm font-bold text-red-700 mb-3">應扣項目</h3>
            <div className="space-y-2">
              {parseFloat(payroll.labor_insurance_employee || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">勞保費 (自付)</span>
                  <span className="font-mono">-${parseFloat(payroll.labor_insurance_employee).toLocaleString()}</span>
                </div>
              )}
              {parseFloat(payroll.health_insurance_employee || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">健保費 (自付)</span>
                  <span className="font-mono">-${parseFloat(payroll.health_insurance_employee).toLocaleString()}</span>
                </div>
              )}
              {parseFloat(payroll.absence_deduction || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-stone-600">曠職扣款</span>
                  <span className="font-mono">-${parseFloat(payroll.absence_deduction).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-red-200">
                <span className="font-bold text-red-700">應扣小計</span>
                <span className="font-mono font-bold text-red-700">-${parseFloat(payroll.pay_10th_deduction || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* 10日實發 */}
          <div className="bg-blue-100 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="font-bold text-blue-800 text-lg">10日實發金額</span>
              <span className="font-mono font-bold text-blue-800 text-2xl">${parseFloat(payroll.pay_10th_net || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 12日發薪明細 */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
        <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 rounded-lg">
            <Calendar size={18} className="text-purple-600" />
          </div>
          12日發薪明細
          <span className="text-sm font-normal text-stone-400 ml-2">{period?.pay_date_12th}</span>
        </h2>

        <div className="bg-purple-50 rounded-xl p-4">
          <div className="space-y-2">
            {parseFloat(payroll.meal_allowance || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">伙食津貼</span>
                <span className="font-mono">${parseFloat(payroll.meal_allowance).toLocaleString()}</span>
              </div>
            )}
            {parseFloat(payroll.position_allowance || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">職務津貼</span>
                <span className="font-mono">${parseFloat(payroll.position_allowance).toLocaleString()}</span>
              </div>
            )}
            {parseFloat(payroll.performance_bonus || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">績效獎金</span>
                <span className="font-mono">${parseFloat(payroll.performance_bonus).toLocaleString()}</span>
              </div>
            )}
            {parseFloat(payroll.attendance_bonus || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">全勤獎金</span>
                <span className="font-mono">${parseFloat(payroll.attendance_bonus).toLocaleString()}</span>
              </div>
            )}
            {parseFloat(payroll.annual_leave_pay || 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-stone-600">特休代金</span>
                <span className="font-mono">${parseFloat(payroll.annual_leave_pay).toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-purple-200">
              <span className="font-bold text-purple-800 text-lg">12日發放金額</span>
              <span className="font-mono font-bold text-purple-800 text-xl">${parseFloat(payroll.pay_12th_total || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 出勤資訊 */}
      {attendance && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 mb-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
            <div className="p-1.5 bg-stone-100 rounded-lg">
              <Clock size={18} className="text-stone-600" />
            </div>
            出勤統計
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-stone-50 rounded-xl p-3 text-center">
              <p className="text-xs text-stone-500">實際出勤</p>
              <p className="text-xl font-bold text-stone-800">{attendance.work_days}/{attendance.scheduled_days}</p>
              <p className="text-xs text-stone-400">天</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600">正常工時</p>
              <p className="text-xl font-bold text-blue-700">{attendance.regular_hours || 0}</p>
              <p className="text-xs text-blue-400">小時</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600">加班時數</p>
              <p className="text-xl font-bold text-amber-700">
                {(parseFloat(attendance.overtime_hours_133 || 0) +
                  parseFloat(attendance.overtime_hours_166 || 0) +
                  parseFloat(attendance.overtime_hours_200 || 0)).toFixed(1)}
              </p>
              <p className="text-xs text-amber-400">小時</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600">請假天數</p>
              <p className="text-xl font-bold text-green-700">
                {(parseFloat(attendance.annual_leave_days || 0) +
                  parseFloat(attendance.sick_leave_days || 0) +
                  parseFloat(attendance.personal_leave_days || 0)).toFixed(1)}
              </p>
              <p className="text-xs text-green-400">天</p>
            </div>
          </div>
        </div>
      )}

      {/* 雇主負擔 (僅管理者可見) */}
      {(parseFloat(payroll.labor_insurance_employer || 0) > 0 || parseFloat(payroll.health_insurance_employer || 0) > 0) && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-600 mb-4 flex items-center gap-2">
            <Shield size={18} className="text-stone-500" />
            雇主負擔 (非薪資條內容)
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-stone-500">勞保 (雇主)</span>
              <span className="font-mono text-stone-600">${parseFloat(payroll.labor_insurance_employer || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">健保 (雇主)</span>
              <span className="font-mono text-stone-600">${parseFloat(payroll.health_insurance_employer || 0).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
