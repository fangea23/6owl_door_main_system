import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { usePermission } from '../../../../hooks/usePermission';
import SearchableSelect from '../components/SearchableSelect';
import {
  Save,
  Send,
  FileText,
  Building,
  CreditCard,
  User,
  AlertCircle,
  Calculator,
  Banknote,
  ChevronLeft,
  Loader2,
} from 'lucide-react';

// 員工代墊款系統的基礎路徑
const BASE_PATH = '/systems/expense-reimbursement';

// 區塊標題組件
const SectionTitle = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-stone-200 text-stone-700 font-bold text-lg">
    <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
      <Icon size={20} />
    </div>
    <h3>{title}</h3>
  </div>
);

export default function ApplyForm() {
  const navigate = useNavigate();
  const { id: editId } = useParams(); // 編輯模式的 ID
  const { user } = useAuth();

  // RBAC 權限檢查
  const { hasPermission: canCreate, loading: permissionLoading } = usePermission('expense.create');

  // 編輯模式狀態
  const isEditMode = !!editId;
  const [loadingEdit, setLoadingEdit] = useState(false);

  // 狀態管理
  const [submitting, setSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', department: '', department_id: null });
  const [departments, setDepartments] = useState([]);

  // 銀行與分行列表
  const [bankList, setBankList] = useState([]);
  const [branchList, setBranchList] = useState([]);
  const [fetchingBanks, setFetchingBanks] = useState(false);
  const [fetchingBranches, setFetchingBranches] = useState(false);

  // 表單資料
  const [formData, setFormData] = useState({
    application_date: new Date().toISOString().split('T')[0],
    department_id: null,
    payment_method: 'transfer', // cash 或 transfer
    bank_name: '',
    bank_code: '',
    branch_name: '',
    branch_code: '',
    account_number: '',
  });

  // 費用明細（15行）
  const [items, setItems] = useState(
    Array.from({ length: 15 }, (_, i) => ({
      line_number: i + 1,
      category: '',
      description: '',
      amount: '',
      receipt_count: '',
      usage_note: '',
      cost_allocation: '六扇門', // 預設六扇門
    }))
  );

  // 載入用戶資訊
  useEffect(() => {
    const fetchUserInfo = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('employees')
          .select('name, department_id, departments!employees_department_id_fkey(id, name)')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;

        if (data) {
          setUserInfo({
            name: data.name,
            department: data.departments?.name || '',
            department_id: data.department_id,
          });
          setFormData(prev => ({
            ...prev,
            department_id: data.department_id,
          }));
        }
      } catch (err) {
        console.error('Error fetching user info:', err);
      }
    };

    fetchUserInfo();
  }, [user]);

  // 載入部門列表
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const { data, error } = await supabase
          .from('departments')
          .select('id, name')
          .order('name');

        if (error) throw error;
        setDepartments(data || []);
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };

    fetchDepartments();
  }, []);

  // 載入銀行列表
  useEffect(() => {
    const fetchBanks = async () => {
      setFetchingBanks(true);
      try {
        const { data, error } = await supabase
          .from('banks')
          .select('bank_code, bank_name')
          .order('bank_code', { ascending: true });
        if (error) throw error;
        if (data) setBankList(data);
      } catch (err) {
        console.error('抓取銀行列表失敗:', err);
      } finally {
        setFetchingBanks(false);
      }
    };
    fetchBanks();
  }, []);

  // 當銀行代碼改變時，載入對應分行
  useEffect(() => {
    if (formData.bank_code) {
      const fetchBranches = async () => {
        setFetchingBranches(true);
        try {
          const { data, error } = await supabase
            .from('branches')
            .select('branch_code, branch_name')
            .eq('bank_code', formData.bank_code)
            .order('branch_code', { ascending: true });
          if (error) throw error;
          if (data) setBranchList(data);
        } catch (err) {
          console.error('抓取分行列表失敗:', err);
        } finally {
          setFetchingBranches(false);
        }
      };
      fetchBranches();
    } else {
      setBranchList([]);
    }
  }, [formData.bank_code]);

  // 編輯模式：載入現有資料
  useEffect(() => {
    if (!editId) return;

    const loadExistingRequest = async () => {
      setLoadingEdit(true);
      try {
        // 載入申請主表
        const { data: requestData, error: requestError } = await supabase
          .from('expense_reimbursement_requests')
          .select('*')
          .eq('id', editId)
          .single();

        if (requestError) throw requestError;

        // 檢查是否可以編輯（只有被駁回的申請才能編輯）
        if (requestData.status !== 'rejected' && requestData.status !== 'draft') {
          alert('此申請無法編輯');
          navigate(`${BASE_PATH}/request/${editId}`);
          return;
        }

        // 檢查是否為申請人本人
        if (requestData.applicant_id !== user?.id) {
          alert('您沒有權限編輯此申請');
          navigate(`${BASE_PATH}/dashboard`);
          return;
        }

        // 設定表單資料
        setFormData({
          application_date: requestData.application_date,
          department_id: requestData.department_id,
          payment_method: requestData.payment_method || 'transfer',
          bank_name: requestData.bank_name || '',
          bank_code: requestData.bank_code || '',
          branch_name: requestData.branch_name || '',
          branch_code: requestData.branch_code || '',
          account_number: requestData.account_number || '',
        });

        // 載入明細
        const { data: itemsData, error: itemsError } = await supabase
          .from('expense_reimbursement_items')
          .select('*')
          .eq('request_id', editId)
          .order('line_number', { ascending: true });

        if (itemsError) throw itemsError;

        // 建立 15 行的明細陣列
        const newItems = Array.from({ length: 15 }, (_, i) => {
          const existingItem = itemsData?.find(item => item.line_number === i + 1);
          return existingItem ? {
            line_number: existingItem.line_number,
            category: existingItem.category || '',
            description: existingItem.description || '',
            amount: existingItem.amount?.toString() || '',
            receipt_count: existingItem.receipt_count?.toString() || '',
            usage_note: existingItem.usage_note || '',
            cost_allocation: existingItem.cost_allocation || '六扇門',
          } : {
            line_number: i + 1,
            category: '',
            description: '',
            amount: '',
            receipt_count: '',
            usage_note: '',
            cost_allocation: '六扇門',
          };
        });

        setItems(newItems);
      } catch (err) {
        console.error('Error loading request:', err);
        alert('載入失敗：' + err.message);
        navigate(`${BASE_PATH}/dashboard`);
      } finally {
        setLoadingEdit(false);
      }
    };

    loadExistingRequest();
  }, [editId, user]);

  // 計算總金額和各品牌分別合計
  const calculateTotals = () => {
    const totals = {
      total: 0,
      totalReceipts: 0,
      六扇門: 0,
      粥大福: 0,
    };

    items.forEach(item => {
      const amount = parseInt(item.amount) || 0; // 改為整數
      const receipts = parseInt(item.receipt_count) || 0;

      if (amount > 0) {
        totals.total += amount;
        totals.totalReceipts += receipts;
        totals[item.cost_allocation] += amount;
      }
    });

    return totals;
  };

  // 更新明細行
  const updateItem = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  // 處理銀行選擇
  const handleBankChange = (selectedBankCode) => {
    const selectedBank = bankList.find(b => b.bank_code === selectedBankCode);

    setFormData({
      ...formData,
      bank_code: selectedBankCode,
      bank_name: selectedBank?.bank_name || '',
      branch_code: '', // 清空分行
      branch_name: '',
    });
  };

  // 處理分行選擇
  const handleBranchChange = (selectedBranchCode) => {
    const selectedBranch = branchList.find(b => b.branch_code === selectedBranchCode);

    setFormData({
      ...formData,
      branch_code: selectedBranchCode,
      branch_name: selectedBranch?.branch_name || '',
    });
  };

  // 移除草稿功能

  // 送出申請
  const handleSubmit = async () => {
    try {
      // 驗證必填欄位
      const totals = calculateTotals();

      if (totals.total === 0) {
        alert('請至少填寫一筆費用明細');
        return;
      }

      // 🔒 驗證：有金額的行必須填寫品項
      const invalidItems = items.filter(item => {
        const amount = parseInt(item.amount) || 0;
        const category = (item.category || '').trim();
        return amount > 0 && !category;
      });

      if (invalidItems.length > 0) {
        const lineNumbers = invalidItems.map(item => item.line_number).join('、');
        alert(`❌ 驗證失敗\n\n第 ${lineNumbers} 行有填寫金額但未填寫品項。\n請填寫品項後再送出。`);
        return;
      }

      if (!formData.department_id) {
        alert('請選擇申請部門');
        return;
      }

      if (formData.payment_method === 'transfer') {
        if (!formData.bank_name || !formData.account_number) {
          alert('選擇匯款方式時，請填寫銀行名稱和帳號');
          return;
        }
      }

      setSubmitting(true);

      // 建立申請單
      const requestData = {
        application_date: formData.application_date,
        applicant_id: user.id,
        department_id: formData.department_id,
        total_amount: totals.total,
        total_receipt_count: totals.totalReceipts,
        brand_totals: JSON.stringify({
          六扇門: totals.六扇門,
          粥大福: totals.粥大福,
        }),
        payment_method: formData.payment_method,
        bank_name: formData.payment_method === 'transfer' ? formData.bank_name : null,
        bank_code: formData.payment_method === 'transfer' ? formData.bank_code : null,
        branch_name: formData.payment_method === 'transfer' ? formData.branch_name : null,
        branch_code: formData.payment_method === 'transfer' ? formData.branch_code : null,
        account_number: formData.payment_method === 'transfer' ? formData.account_number : null,
        status: totals.total >= 30000 ? 'pending_ceo' : 'pending_boss',
        submitted_at: new Date().toISOString(),
      };

      // 準備明細資料
      const itemsToInsert = items
        .filter(item => parseInt(item.amount) > 0)
        .map(item => ({
          line_number: item.line_number,
          category: item.category || null,
          description: item.description || null,
          amount: parseInt(item.amount),
          receipt_count: parseInt(item.receipt_count) || 0,
          usage_note: item.usage_note || null,
          cost_allocation: item.cost_allocation,
        }));

      let requestId;

      if (isEditMode) {
        // 編輯模式：更新現有申請
        // ⚠️ 重要順序：先處理明細（狀態還是 rejected），最後才更新狀態
        requestId = editId;

        // 1. 先刪除舊的明細（在狀態還是 rejected 時，RLS 允許）
        const { error: deleteError } = await supabase
          .from('expense_reimbursement_items')
          .delete()
          .eq('request_id', editId);

        if (deleteError) {
          console.warn('刪除舊明細失敗:', deleteError.message);
        }

        // 2. 插入新的明細（在狀態還是 rejected 時，RLS 允許）
        if (itemsToInsert.length > 0) {
          const itemsWithRequestId = itemsToInsert.map(item => ({
            ...item,
            request_id: requestId,
          }));

          const { error: itemsError } = await supabase
            .from('expense_reimbursement_items')
            .upsert(itemsWithRequestId, {
              onConflict: 'request_id,line_number',
              ignoreDuplicates: false,
            });

          if (itemsError) throw itemsError;
        }

        // 3. 刪除舊的簽核紀錄
        const { error: deleteApprovalsError } = await supabase
          .from('expense_approvals')
          .delete()
          .eq('request_id', editId);

        if (deleteApprovalsError) {
          console.warn('刪除舊簽核紀錄失敗:', deleteApprovalsError.message);
        }

        // 4. 最後才更新 request 狀態（從 rejected → pending）
        const { error: updateError } = await supabase
          .from('expense_reimbursement_requests')
          .update(requestData)
          .eq('id', editId);

        if (updateError) throw updateError;

      } else {
        // 新建模式：建立新申請
        const { data: newRequest, error: insertError } = await supabase
          .from('expense_reimbursement_requests')
          .insert([requestData])
          .select()
          .single();

        if (insertError) throw insertError;
        requestId = newRequest.id;

        // 插入明細
        if (itemsToInsert.length > 0) {
          const itemsWithRequestId = itemsToInsert.map(item => ({
            ...item,
            request_id: requestId,
          }));

          const { error: itemsError } = await supabase
            .from('expense_reimbursement_items')
            .insert(itemsWithRequestId);

          if (itemsError) throw itemsError;
        }
      }

      const actionText = isEditMode ? '重新送出' : '送出';
      alert(`✅ 申請已${actionText}！\n\n總金額：NT$ ${totals.total.toLocaleString()}`);
      navigate(`${BASE_PATH}/dashboard`);
    } catch (err) {
      console.error('Error submitting request:', err);
      alert('送出失敗：' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();

  // 檢查是否有金額但沒有品項的行
  const hasInvalidItems = items.some(item => {
    const amount = parseInt(item.amount) || 0;
    const category = (item.category || '').trim();
    return amount > 0 && !category;
  });

  // 權限檢查 & 載入中
  if (permissionLoading || loadingEdit) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!canCreate) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">權限不足</h2>
          <p className="text-stone-600 mb-6">您沒有建立代墊款申請的權限</p>
          <button
            onClick={() => navigate(`${BASE_PATH}/dashboard`)}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 py-6 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`${BASE_PATH}/dashboard`)}
              className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-stone-800">
                {isEditMode ? '修改代墊款申請' : '新增代墊款申請'}
              </h1>
              <p className="text-sm text-stone-500 mt-1">Employee Reimbursement Request</p>
            </div>
          </div>
        </div>

        {/* 基本資訊 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <SectionTitle icon={User} title="基本資訊" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                申請日期 *
              </label>
              <input
                type="date"
                value={formData.application_date}
                onChange={(e) => setFormData({ ...formData, application_date: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                申請人
              </label>
              <input
                type="text"
                value={userInfo.name}
                disabled
                className="w-full px-4 py-2 border border-stone-300 rounded-lg bg-stone-50 text-stone-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">
                申請部門 *
              </label>
              <select
                value={formData.department_id || ''}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                required
              >
                <option value="">請選擇部門</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* 費用明細表格 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <SectionTitle icon={FileText} title="費用明細" />

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-stone-50">
                  <th className="border border-stone-300 px-2 py-2 text-xs font-bold text-stone-700 w-12">編號</th>
                  <th className="border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700">品項</th>
                  <th className="border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700">內容</th>
                  <th className="border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 w-32">申請金額</th>
                  <th className="border border-stone-300 px-2 py-2 text-xs font-bold text-stone-700 w-24">收據張數</th>
                  <th className="border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 w-32">費用歸屬</th>
                  <th className="border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700">用途說明</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => {
                  // 檢查是否有金額但沒有品項（用於視覺提示）
                  const hasAmountNoCategory = (parseInt(item.amount) || 0) > 0 && !(item.category || '').trim();

                  return (
                  <tr key={item.line_number} className="hover:bg-stone-50">
                    <td className="border border-stone-300 px-2 py-2 text-center text-sm text-stone-600">
                      {item.line_number}
                    </td>
                    <td className="border border-stone-300 px-2 py-1">
                      <input
                        type="text"
                        value={item.category}
                        onChange={(e) => updateItem(index, 'category', e.target.value)}
                        className={`w-full px-2 py-1 text-sm border-0 focus:ring-1 rounded ${
                          hasAmountNoCategory
                            ? 'ring-2 ring-red-500 focus:ring-red-500 bg-red-50'
                            : 'focus:ring-amber-500'
                        }`}
                        placeholder={hasAmountNoCategory ? "⚠️ 必填" : "品項"}
                      />
                    </td>
                    <td className="border border-stone-300 px-2 py-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-amber-500 rounded"
                        placeholder="內容"
                      />
                    </td>
                    <td className="border border-stone-300 px-2 py-1">
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => updateItem(index, 'amount', e.target.value)}
                        className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-amber-500 rounded text-right"
                        placeholder="0"
                        min="0"
                        step="1"
                      />
                    </td>
                    <td className="border border-stone-300 px-2 py-1">
                      <input
                        type="number"
                        value={item.receipt_count}
                        onChange={(e) => updateItem(index, 'receipt_count', e.target.value)}
                        className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-amber-500 rounded text-center"
                        placeholder="0"
                        min="0"
                      />
                    </td>
                    <td className="border border-stone-300 px-2 py-1">
                      <select
                        value={item.cost_allocation}
                        onChange={(e) => updateItem(index, 'cost_allocation', e.target.value)}
                        className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-amber-500 rounded"
                      >
                        <option value="六扇門">六扇門</option>
                        <option value="粥大福">粥大福</option>
                      </select>
                    </td>
                    <td className="border border-stone-300 px-2 py-1">
                      <input
                        type="text"
                        value={item.usage_note}
                        onChange={(e) => updateItem(index, 'usage_note', e.target.value)}
                        className="w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-amber-500 rounded"
                        placeholder="用途說明"
                      />
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 結算資訊 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <SectionTitle icon={Calculator} title="結算資訊" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 品牌分別合計 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-stone-700 mb-3">品牌分別合計</h4>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900">六扇門</span>
                  <span className="text-lg font-bold text-blue-600">
                    NT$ {totals.六扇門.toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-900">粥大福</span>
                  <span className="text-lg font-bold text-green-600">
                    NT$ {totals.粥大福.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* 總計 */}
            <div className="space-y-4">
              <h4 className="font-semibold text-stone-700 mb-3">總計</h4>

              <div className="bg-amber-50 rounded-lg p-4 border-2 border-amber-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-amber-900">合計總金額</span>
                  <span className="text-2xl font-bold text-amber-600">
                    NT$ {totals.total.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-amber-200">
                  <span className="text-xs text-amber-700">發票/收據總張數</span>
                  <span className="text-sm font-semibold text-amber-700">
                    {totals.totalReceipts} 張
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 撥款資訊 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <SectionTitle icon={CreditCard} title="撥款資訊" />

          <div className="space-y-6">
            {/* 撥款方式選擇 */}
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-3">
                撥款方式 *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method"
                    value="cash"
                    checked={formData.payment_method === 'cash'}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-stone-700">領現</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="payment_method"
                    value="transfer"
                    checked={formData.payment_method === 'transfer'}
                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                    className="w-4 h-4 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-stone-700">匯款（次月12日）</span>
                </label>
              </div>
            </div>

            {/* 匯款資訊（條件顯示） */}
            {formData.payment_method === 'transfer' && (
              <div className="bg-stone-50 rounded-lg p-4 space-y-4">
                <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-amber-600" />
                  匯款帳戶資訊
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      銀行 *
                    </label>
                    <SearchableSelect
                      options={bankList.map(bank => ({
                        value: bank.bank_code,
                        label: bank.bank_name,
                        subLabel: `(${bank.bank_code})`
                      }))}
                      value={formData.bank_code}
                      onChange={handleBankChange}
                      placeholder="請選擇銀行"
                      disabled={fetchingBanks}
                      loading={fetchingBanks}
                      loadingText="載入銀行列表中..."
                      emptyText="無可用銀行"
                      required={formData.payment_method === 'transfer'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      分行
                    </label>
                    <SearchableSelect
                      options={branchList.map(branch => ({
                        value: branch.branch_code,
                        label: branch.branch_name,
                        subLabel: `(${branch.branch_code})`
                      }))}
                      value={formData.branch_code}
                      onChange={handleBranchChange}
                      placeholder="請選擇分行"
                      disabled={!formData.bank_code || fetchingBranches}
                      loading={fetchingBranches}
                      loadingText="載入分行列表中..."
                      emptyText={!formData.bank_code ? '請先選擇銀行' : '無可用分行'}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-stone-700 mb-2">
                      帳號 *
                    </label>
                    <input
                      type="text"
                      value={formData.account_number}
                      onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                      className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder="請輸入完整帳號"
                      required={formData.payment_method === 'transfer'}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 送出按鈕 */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <button
            onClick={handleSubmit}
            disabled={submitting || totals.total === 0 || hasInvalidItems}
            className={`
              w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-3
              transition-all duration-200 shadow-lg
              ${submitting || totals.total === 0 || hasInvalidItems
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-amber-600 text-white hover:bg-amber-700 hover:shadow-xl active:scale-[0.98]'
              }
            `}
          >
            {submitting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                {isEditMode ? '重新送出中...' : '送出中...'}
              </>
            ) : (
              <>
                <Send className="w-6 h-6" />
                {isEditMode ? '修改並重新送出' : '送出申請'}
              </>
            )}
          </button>
          {totals.total === 0 && (
            <p className="text-sm text-stone-500 text-center mt-3">
              請至少填寫一筆費用明細後才能送出申請
            </p>
          )}
          {hasInvalidItems && totals.total > 0 && (
            <p className="text-sm text-red-600 text-center mt-3 font-semibold">
              ⚠️ 有金額的項目必須填寫品項
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
