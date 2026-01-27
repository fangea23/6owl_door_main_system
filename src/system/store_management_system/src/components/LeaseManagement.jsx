import React, { useState } from 'react';
import { useLeases } from '../hooks/useLeases';
import { Plus, Edit2, Trash2, FileText, AlertTriangle, Calendar, DollarSign, User, Phone, MapPin, X, Save, Loader2 } from 'lucide-react';

/**
 * 租約管理組件
 * @param {number} storeCode - 門店代碼
 * @param {boolean} canEdit - 是否可編輯
 * @param {boolean} canDelete - 是否可刪除
 */
export default function LeaseManagement({ storeCode, canEdit = false, canDelete = false }) {
  const { leases, loading, addLease, updateLease, deleteLease } = useLeases(storeCode);
  const [showModal, setShowModal] = useState(false);
  const [editingLease, setEditingLease] = useState(null);

  // 計算到期狀態
  const getExpiryStatus = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    const daysUntil = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { label: '已到期', color: 'red', urgent: true };
    if (daysUntil <= 30) return { label: `${daysUntil} 天後到期`, color: 'red', urgent: true };
    if (daysUntil <= 90) return { label: `${daysUntil} 天後到期`, color: 'amber', urgent: false };
    return { label: '正常', color: 'green', urgent: false };
  };

  // 格式化金額
  const formatCurrency = (amount) => {
    if (!amount) return '-';
    return `$${Number(amount).toLocaleString('zh-TW')}`;
  };

  // 處理新增
  const handleAdd = () => {
    setEditingLease(null);
    setShowModal(true);
  };

  // 處理編輯
  const handleEdit = (lease) => {
    setEditingLease(lease);
    setShowModal(true);
  };

  // 處理刪除
  const handleDelete = async (lease) => {
    if (!confirm(`確定要刪除與「${lease.landlord_name}」的租約嗎？`)) return;
    const result = await deleteLease(lease.id);
    if (!result.success) {
      alert(`刪除失敗：${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="animate-spin text-amber-500 mr-2" size={20} />
        <span className="text-stone-400">載入租約資料中...</span>
      </div>
    );
  }

  return (
    <div>
      {/* 標題列 */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-stone-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-600" />
          租約資訊
        </h4>
        {canEdit && (
          <button
            onClick={handleAdd}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            新增租約
          </button>
        )}
      </div>

      {/* 租約列表 */}
      {leases.length === 0 ? (
        <div className="text-center py-8 text-stone-400 bg-stone-50 rounded-lg">
          <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>尚無租約資料</p>
          {canEdit && (
            <button
              onClick={handleAdd}
              className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              + 新增第一筆租約
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {leases.map((lease) => {
            const expiryStatus = getExpiryStatus(lease.lease_end_date);
            return (
              <div
                key={lease.id}
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
                    {/* 房東資訊 */}
                    <div className="flex items-center gap-2 mb-2">
                      <User size={16} className="text-stone-400" />
                      <span className="font-semibold text-stone-800">{lease.landlord_name}</span>
                      {lease.landlord_phone && (
                        <span className="text-sm text-stone-500 flex items-center gap-1">
                          <Phone size={12} />
                          {lease.landlord_phone}
                        </span>
                      )}
                    </div>

                    {/* 租期 */}
                    <div className="flex items-center gap-2 text-sm text-stone-600 mb-2">
                      <Calendar size={14} className="text-stone-400" />
                      <span>{lease.lease_start_date} ~ {lease.lease_end_date}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        expiryStatus.color === 'green' ? 'bg-green-100 text-green-700' :
                        expiryStatus.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {expiryStatus.label}
                      </span>
                    </div>

                    {/* 租金資訊 */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <DollarSign size={14} className="text-green-600" />
                        <span className="font-medium text-green-700">月租 {formatCurrency(lease.monthly_rent)}</span>
                      </div>
                      {lease.deposit && (
                        <span className="text-stone-500">押金 {formatCurrency(lease.deposit)}</span>
                      )}
                      {lease.management_fee > 0 && (
                        <span className="text-stone-500">管理費 {formatCurrency(lease.management_fee)}</span>
                      )}
                    </div>

                    {/* 地址 */}
                    {lease.property_address && (
                      <div className="flex items-center gap-1 text-sm text-stone-500 mt-2">
                        <MapPin size={14} />
                        {lease.property_address}
                      </div>
                    )}

                    {/* 坪數 */}
                    {lease.floor_area && (
                      <div className="text-xs text-stone-400 mt-1">
                        坪數：{lease.floor_area} 坪 {lease.floor_number && `・${lease.floor_number}`}
                      </div>
                    )}
                  </div>

                  {/* 操作按鈕 */}
                  {(canEdit || canDelete) && (
                    <div className="flex items-center gap-1">
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(lease)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                          title="編輯"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(lease)}
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

      {/* 租約編輯 Modal */}
      {showModal && (
        <LeaseModal
          lease={editingLease}
          storeCode={storeCode}
          onClose={() => setShowModal(false)}
          onSave={async (data) => {
            const result = editingLease
              ? await updateLease(editingLease.id, data)
              : await addLease(data);

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

// 租約編輯 Modal
function LeaseModal({ lease, storeCode, onClose, onSave }) {
  const [formData, setFormData] = useState({
    store_code: storeCode,
    landlord_name: lease?.landlord_name || '',
    landlord_contact: lease?.landlord_contact || '',
    landlord_phone: lease?.landlord_phone || '',
    landlord_address: lease?.landlord_address || '',
    lease_start_date: lease?.lease_start_date || '',
    lease_end_date: lease?.lease_end_date || '',
    renewal_notice_days: lease?.renewal_notice_days || 90,
    monthly_rent: lease?.monthly_rent || '',
    deposit: lease?.deposit || '',
    management_fee: lease?.management_fee || 0,
    other_fees: lease?.other_fees || 0,
    payment_day: lease?.payment_day || 1,
    floor_area: lease?.floor_area || '',
    floor_number: lease?.floor_number || '',
    property_address: lease?.property_address || '',
    notes: lease?.notes || '',
    status: lease?.status || 'active'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.landlord_name.trim()) {
      alert('請輸入房東名稱');
      return;
    }
    if (!formData.lease_start_date || !formData.lease_end_date) {
      alert('請輸入租約期間');
      return;
    }
    if (!formData.monthly_rent) {
      alert('請輸入月租金');
      return;
    }

    setSaving(true);
    await onSave({
      ...formData,
      monthly_rent: Number(formData.monthly_rent),
      deposit: formData.deposit ? Number(formData.deposit) : null,
      management_fee: Number(formData.management_fee) || 0,
      other_fees: Number(formData.other_fees) || 0,
      floor_area: formData.floor_area ? Number(formData.floor_area) : null,
      renewal_notice_days: Number(formData.renewal_notice_days)
    });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 p-4 border-b border-stone-200 bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-between rounded-t-xl">
          <h3 className="text-lg font-bold text-white">
            {lease ? '編輯租約' : '新增租約'}
          </h3>
          <button onClick={onClose} className="text-white/80 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* 房東資訊 */}
          <div className="bg-stone-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <User size={16} />
              房東資訊
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  房東名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.landlord_name}
                  onChange={(e) => setFormData({ ...formData, landlord_name: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="姓名或公司名稱"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">電話</label>
                <input
                  type="text"
                  value={formData.landlord_phone}
                  onChange={(e) => setFormData({ ...formData, landlord_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="聯絡電話"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.landlord_contact}
                  onChange={(e) => setFormData({ ...formData, landlord_contact: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">地址</label>
                <input
                  type="text"
                  value={formData.landlord_address}
                  onChange={(e) => setFormData({ ...formData, landlord_address: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="房東地址"
                />
              </div>
            </div>
          </div>

          {/* 租約期間 */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <Calendar size={16} />
              租約期間
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  起始日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.lease_start_date}
                  onChange={(e) => setFormData({ ...formData, lease_start_date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  結束日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.lease_end_date}
                  onChange={(e) => setFormData({ ...formData, lease_end_date: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">提前通知天數</label>
                <input
                  type="number"
                  value={formData.renewal_notice_days}
                  onChange={(e) => setFormData({ ...formData, renewal_notice_days: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  min="0"
                  max="365"
                />
              </div>
            </div>
          </div>

          {/* 租金資訊 */}
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <DollarSign size={16} />
              租金資訊
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  月租金 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.monthly_rent}
                  onChange={(e) => setFormData({ ...formData, monthly_rent: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">押金</label>
                <input
                  type="number"
                  value={formData.deposit}
                  onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">管理費（月）</label>
                <input
                  type="number"
                  value={formData.management_fee}
                  onChange={(e) => setFormData({ ...formData, management_fee: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">每月付款日</label>
                <select
                  value={formData.payment_day}
                  onChange={(e) => setFormData({ ...formData, payment_day: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {[...Array(28)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1} 日</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 物件資訊 */}
          <div className="bg-amber-50 rounded-lg p-4">
            <h4 className="font-semibold text-stone-700 mb-3 flex items-center gap-2">
              <MapPin size={16} />
              物件資訊
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">坪數</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.floor_area}
                  onChange={(e) => setFormData({ ...formData, floor_area: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">樓層</label>
                <input
                  type="text"
                  value={formData.floor_number}
                  onChange={(e) => setFormData({ ...formData, floor_number: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="例：1F、B1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">狀態</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="active">有效</option>
                  <option value="pending_renewal">待續約</option>
                  <option value="expired">已到期</option>
                  <option value="terminated">已終止</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-stone-700 mb-1">物件地址</label>
              <input
                type="text"
                value={formData.property_address}
                onChange={(e) => setFormData({ ...formData, property_address: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="門店所在地址"
              />
            </div>
          </div>

          {/* 備註 */}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              rows={2}
              placeholder="其他備註事項"
            />
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
