import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { usePermission } from '../../../../hooks/usePermission';
import {
  Save,
  Send,
  FileText,
  Building,
  CreditCard,
  User,
  AlertCircle,
  Plus,
  Trash2,
  Calculator,
  Banknote,
  ChevronLeft,
  Loader2,
} from 'lucide-react';

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
  const { id } = useParams(); // 如果是編輯模式，會有 id
  const { user } = useAuth();

  // RBAC 權限檢查
  const { hasPermission: canCreate, loading: permissionLoading } = usePermission('expense.create');
  const { hasPermission: canEdit } = usePermission('expense.edit.own');

  // 狀態管理
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userInfo, setUserInfo] = useState({ name: '', department: '', department_id: null });
  const [departments, setDepartments] = useState([]);

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
          .select('name, department_id, departments(id, name)')
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

  // 如果是編輯模式，載入現有資料
  useEffect(() => {
    if (id) {
      loadExistingRequest();
    }
  }, [id]);

  const loadExistingRequest = async () => {
    try {
      setLoading(true);

      const { data: request, error } = await supabase
        .from('expense_reimbursement_requests')
        .select(`
          *,
          items:expense_reimbursement_items(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      // 只能編輯草稿
      if (request.status !== 'draft') {
        alert('只能編輯草稿狀態的申請');
        navigate('/expense');
        return;
      }

      // 載入表單資料
      setFormData({
        application_date: request.application_date,
        department_id: request.department_id,
        payment_method: request.payment_method,
        bank_name: request.bank_name || '',
        bank_code: request.bank_code || '',
        branch_name: request.branch_name || '',
        branch_code: request.branch_code || '',
        account_number: request.account_number || '',
      });

      // 載入明細
      const loadedItems = Array.from({ length: 15 }, (_, i) => {
        const existingItem = request.items?.find(item => item.line_number === i + 1);
        return existingItem ? {
          line_number: i + 1,
          category: existingItem.category || '',
          description: existingItem.description || '',
          amount: existingItem.amount || '',
          receipt_count: existingItem.receipt_count || '',
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

      setItems(loadedItems);
    } catch (err) {
      console.error('Error loading request:', err);
      alert('載入失敗：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 計算總金額和各品牌分別合計
  const calculateTotals = () => {
    const totals = {
      total: 0,
      totalReceipts: 0,
      六扇門: 0,
      粥大福: 0,
    };

    items.forEach(item => {
      const amount = parseFloat(item.amount) || 0;
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

  // 儲存草稿
  const handleSaveDraft = async () => {
    try {
      setLoading(true);

      const totals = calculateTotals();

      const requestData = {
        application_date: formData.application_date,
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
        status: 'draft',
      };

      let requestId = id;

      if (id) {
        // 更新現有申請
        const { error: updateError } = await supabase
          .from('expense_reimbursement_requests')
          .update(requestData)
          .eq('id', id);

        if (updateError) throw updateError;
      } else {
        // 建立新申請
        const { data: newRequest, error: insertError } = await supabase
          .from('expense_reimbursement_requests')
          .insert([{
            ...requestData,
            applicant_id: user.id,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        requestId = newRequest.id;
      }

      // 儲存明細（先刪除舊的）
      if (id) {
        await supabase
          .from('expense_reimbursement_items')
          .delete()
          .eq('request_id', requestId);
      }

      // 插入新明細（只插入有金額的行）
      const itemsToInsert = items
        .filter(item => parseFloat(item.amount) > 0)
        .map(item => ({
          request_id: requestId,
          line_number: item.line_number,
          category: item.category || null,
          description: item.description || null,
          amount: parseFloat(item.amount),
          receipt_count: parseInt(item.receipt_count) || 0,
          usage_note: item.usage_note || null,
          cost_allocation: item.cost_allocation,
        }));

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase
          .from('expense_reimbursement_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      alert('草稿已儲存');
      navigate('/expense');
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('儲存失敗：' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 送出申請
  const handleSubmit = async () => {
    try {
      // 驗證必填欄位
      const totals = calculateTotals();

      if (totals.total === 0) {
        alert('請至少填寫一筆費用明細');
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

      // 先儲存草稿
      await handleSaveDraft();

      // 決定簽核流程
      const nextStatus = totals.total >= 30000 ? 'pending_ceo' : 'pending_boss';

      // 更新狀態為送出
      const requestId = id || (await getCurrentRequestId());

      const { error } = await supabase
        .from('expense_reimbursement_requests')
        .update({
          status: nextStatus,
          submitted_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) throw error;

      alert(`申請已送出！\n總金額：${totals.total.toLocaleString()} 元\n簽核流程：${totals.total >= 30000 ? '總經理 → 審核主管' : '放行主管 → 審核主管'}`);
      navigate('/expense');
    } catch (err) {
      console.error('Error submitting request:', err);
      alert('送出失敗：' + err.message);
    }
  };

  const getCurrentRequestId = async () => {
    const { data } = await supabase
      .from('expense_reimbursement_requests')
      .select('id')
      .eq('applicant_id', user.id)
      .eq('status', 'draft')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.id;
  };

  const totals = calculateTotals();

  // 權限檢查
  if (permissionLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
      </div>
    );
  }

  if (!canCreate && !id) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">權限不足</h2>
          <p className="text-stone-600 mb-6">您沒有建立代墊款申請的權限</p>
          <button
            onClick={() => navigate('/expense')}
            className="px-6 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all"
          >
            返回列表
          </button>
        </div>
      </div>
    );
  }

  if (id && !canEdit) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-stone-800 mb-2">權限不足</h2>
          <p className="text-stone-600 mb-6">您沒有編輯代墊款申請的權限</p>
          <button
            onClick={() => navigate('/expense')}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/expense')}
                className="p-2 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-stone-800">
                  {id ? '編輯代墊款申請' : '新增代墊款申請'}
                </h1>
                <p className="text-sm text-stone-500 mt-1">Employee Reimbursement Request</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-stone-600 text-white rounded-lg hover:bg-stone-700 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                儲存草稿
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-lg hover:from-amber-600 hover:to-red-600 transition-all disabled:opacity-50 shadow-lg"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                送出申請
              </button>
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

        {/* 費用明細 - 將在下一部分繼續 */}

      </div>
    </div>
  );
}
