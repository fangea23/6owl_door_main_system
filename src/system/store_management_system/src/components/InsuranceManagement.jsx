import React, { useState } from 'react';
import { useInsurances, INSURANCE_TYPES, PAYMENT_FREQUENCIES } from '../hooks/useInsurances';
import { Plus, Edit2, Trash2, Shield, AlertTriangle, Calendar, DollarSign, Building2, Phone, X, Save, Loader2 } from 'lucide-react';

/**
 * 保險管理組件
 * @param {number} storeCode - 門店代碼
 * @param {boolean} canEdit - 是否可編輯
 * @param {boolean} canDelete - 是否可刪除
 */
export default function InsuranceManagement({ storeCode, canEdit = false, canDelete = false }) {
  const { insurances, loading, addInsurance, updateInsurance, deleteInsurance } = useInsurances(storeCode);
  const [showModal, setShowModal] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(null);

  // 計算到期狀態
  const getExpiryStatus = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysUntil = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { label: '已到期', color: 'red', urgent: true };
    if (daysUntil <= 14) return { label: `${daysUntil} 天後到期`, color: 'red', urgent: true };
    if (daysUntil <= 30) return { label: `${daysUntil} 天後到期`, color: 'amber', urgent: false };
    return { label: '正常', color: 'green', urgent: false };
  };

  // 格式化金額
  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `$${Number(amount).toLocaleString('zh-TW')}`;
  };

  // 處理新增
  const handleAdd = () => {
    setEditingInsurance(null);
    setShowModal(true);
  };

  // 處理編輯
  const handleEdit = (insurance) => {
    setEditingInsurance(insurance);
    setShowModal(true);
  };

  // 處理刪除
  const handleDelete = async (insurance) => {
    if (!confirm(`確定要刪除「${insurance.insurance_name}」保險嗎？`)) return;
    const result = await deleteInsurance(insurance.id);
    if (!result.success) {
      alert(`刪除失敗：${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-amber-500 mr-2" size={20} />
        <span className="text-stone-400">載入保險資料中...</span>
      </div>
    );
  }

  return (
    <div>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-stone-800 flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          保險資訊
        </h4>
        {canEdit && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            新增保險
          </button>
        )}
      </div>

      {/* 保險列表 */}
      {insurances.length === 0 ? (
        <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-lg">
          <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>尚無保險資料</p>
          {canEdit && (
            <button
              onClick={handleAdd}
              className="mt-3 text-purple-600 hover:text-purple-800 text-sm font-medium"
            >
              + 新增第一筆保險
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {insurances.map((insurance) => {
            const expiryStatus = getExpiryStatus(insurance.end_date);
            const typeInfo = INSURANCE_TYPES[insurance.insurance_type] || INSURANCE_TYPES.other;

            return (
              <div
                key={insurance.id}
                className={`border rounded-lg p-4 transition-all ${
                  expiryStatus.urgent ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white'
                }`}
              >
                {/* 到期警示 */}
                {expiryStatus.urgent && (
                  <div className="flex items-center gap-2 text-red-600 text-sm font-medium mb-3 pb-3 border-b border-red-200">
                    <AlertTriangle size={16} />
                    {expiryStatus.label}
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* 保險名稱與類型 */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{typeInfo.icon}</span>
                      <span className="font-semibold text-stone-800">{insurance.insurance_name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium bg-${typeInfo.color}-100 text-${typeInfo.color}-700`}>
                        {typeInfo.label}
                      </span>
                    </div>

                    {/* 保險公司 */}
                    <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
                      <Building2 size={14} className="text-stone-400" />
                      <span>{insurance.insurance_company}</span>
                      {insurance.policy_number && (
                        <span className="text-stone-400">保單號碼：{insurance.policy_number}</span>
                      )}
                    </div>

                    {/* 保險期間 */}
                    <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
                      <Calendar size={14} className="text-stone-400" />
                      <span>{insurance.start_date} ~ {insurance.end_date}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        expiryStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                        expiryStatus.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {expiryStatus.label}
                      </span>
                    </div>

                    {/* 保額與保費 */}
                    <div className="flex items-center gap-4 text-sm">
                      {insurance.coverage_amount && (
                        <div className="flex items-center gap-1">
                          <Shield size={14} className="text-blue-600" />
                          <span className="text-blue-700">保額 {formatCurrency(insurance.coverage_amount)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-green-600" />
                        <span className="font-medium text-green-700">
                          保費 {formatCurrency(insurance.premium)} / {PAYMENT_FREQUENCIES[insurance.payment_frequency] || '年'}
                        </span>
                      </div>
                    </div>

                    {/* 業務員資訊 */}
                    {insurance.agent_name && (
                      <div className="flex items-center gap-2 text-xs text-stone-400 mt-2">
                        <span>業務：{insurance.agent_name}</span>
                        {insurance.agent_phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={10} />
                            {insurance.agent_phone}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 操作按鈕 */}
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(insurance)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="編輯"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(insurance)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="刪除"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 保險編輯 Modal */}
      {showModal && (
        <InsuranceModal
          insurance={editingInsurance}
          storeCode={storeCode}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            const result = editingInsurance
              ? await updateInsurance(editingInsurance.id, data)
              : await addInsurance(data);

            if (result.success) {
              setShowModal(false);
            } else {
              alert(`操作失敗：${result.error}`);
            }
          }}
        />
      )}
    </div>
  );
}

// 保險編輯 Modal
function InsuranceModal({ insurance, storeCode, onClose, onSave }) {
  const [formData, setFormData] = useState({
    store_code: storeCode,
    insurance_type: insurance?.insurance_type || 'fire',
    insurance_name: insurance?.insurance_name || '',
    insurance_company: insurance?.insurance_company || '',
    policy_number: insurance?.policy_number || '',
    agent_name: insurance?.agent_name || '',
    agent_phone: insurance?.agent_phone || '',
    start_date: insurance?.start_date || '',
    end_date: insurance?.end_date || '',
    renewal_notice_days: insurance?.renewal_notice_days || 30,
    coverage_amount: insurance?.coverage_amount || '',
    premium: insurance?.premium || '',
    payment_frequency: insurance?.payment_frequency || 'yearly',
    notes: insurance?.notes || '',
    status: insurance?.status || 'active'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.insurance_name.trim()) {
      alert('請輸入保險名稱');
      return;
    }
    if (!formData.insurance_company.trim()) {
      alert('請輸入保險公司');
      return;
    }
    if (!formData.start_date || !formData.end_date) {
      alert('請輸入保險期間');
      return;
    }
    if (!formData.premium) {
      alert('請輸入保費');
      return;
    }

    setSaving(true);
    await onSave({
      ...formData,
      coverage_amount: formData.coverage_amount ? Number(formData.coverage_amount) : null,
      premium: Number(formData.premium),
      renewal_notice_days: Number(formData.renewal_notice_days)
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 p-4 border-b border-stone-200 bg-gradient-to-r from-purple-600 to-purple-700 flex items-center justify-between rounded-t-xl">
          <h3 className="text-lg font-bold text-white">
            {insurance ? '編輯保險' : '新增保險'}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 保險基本資訊 */}
          <div className="bg-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Shield size={16} />
              保險資訊
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  保險類型 <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.insurance_type}
                  onChange={(e) => setFormData({ ...formData, insurance_type: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                >
                  {Object.entries(INSURANCE_TYPES).map(([key, value]) => (
                    <option key={key} value={key}>{value.icon} {value.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  保險名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.insurance_name}
                  onChange={(e) => setFormData({ ...formData, insurance_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="例：商業火災保險"
                  required
                />
              </div>
            </div>
          </div>

          {/* 保險公司資訊 */}
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Building2 size={16} />
              保險公司資訊
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  保險公司 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.insurance_company}
                  onChange={(e) => setFormData({ ...formData, insurance_company: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="保險公司名稱"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">保單號碼</label>
                <input
                  type="text"
                  value={formData.policy_number}
                  onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="保單編號"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">業務員姓名</label>
                <input
                  type="text"
                  value={formData.agent_name}
                  onChange={(e) => setFormData({ ...formData, agent_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="承辦業務員"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">業務員電話</label>
                <input
                  type="text"
                  value={formData.agent_phone}
                  onChange={(e) => setFormData({ ...formData, agent_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="聯絡電話"
                />
              </div>
            </div>
          </div>

          {/* 保險期間 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Calendar size={16} />
              保險期間
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  起始日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  結束日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">提前通知天數</label>
                <input
                  type="number"
                  value={formData.renewal_notice_days}
                  onChange={(e) => setFormData({ ...formData, renewal_notice_days: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  min="0"
                  max="365"
                />
              </div>
            </div>
          </div>

          {/* 金額資訊 */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <DollarSign size={16} />
              金額資訊
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">保額</label>
                <input
                  type="number"
                  value={formData.coverage_amount}
                  onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  保費 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.premium}
                  onChange={(e) => setFormData({ ...formData, premium: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">付款頻率</label>
                <select
                  value={formData.payment_frequency}
                  onChange={(e) => setFormData({ ...formData, payment_frequency: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                >
                  {Object.entries(PAYMENT_FREQUENCIES).map(([key, value]) => (
                    <option key={key} value={key}>{value}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 狀態與備註 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">狀態</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="active">有效</option>
                <option value="pending_renewal">待續保</option>
                <option value="expired">已到期</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">備註</label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                placeholder="其他備註"
              />
            </div>
          </div>

          {/* 按鈕 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-stone-300 text-stone-700 rounded-lg hover:bg-stone-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {saving ? '儲存中...' : '儲存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
