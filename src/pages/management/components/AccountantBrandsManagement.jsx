import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Briefcase, Users, Plus, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

/**
 * 會計品牌分配管理
 * 管理會計人員負責的品牌分配
 */
export default function AccountantBrandsManagement() {
  const [accountants, setAccountants] = useState([]);
  const [brands, setBrands] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  // 獲取所有資料
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. 獲取所有會計人員
      const { data: accountantsData, error: accountantsError } = await supabase
        .from('employees')
        .select('id, employee_id, name, email')
        .eq('role', 'accountant')
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('name');

      if (accountantsError) throw accountantsError;

      // 2. 獲取所有品牌
      const { data: brandsData, error: brandsError } = await supabase
        .from('brands')
        .select('*')
        .order('name');

      if (brandsError) throw brandsError;

      // 3. 獲取所有分配關係
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('accountant_brands')
        .select(`
          id,
          employee_id,
          brand_id,
          created_at
        `);

      if (assignmentsError) throw assignmentsError;

      setAccountants(accountantsData || []);
      setBrands(brandsData || []);
      setAssignments(assignmentsData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 獲取會計負責的品牌
  const getAccountantBrands = (accountantId) => {
    const accountantAssignments = assignments.filter(a => a.employee_id === accountantId);
    return accountantAssignments.map(a => {
      const brand = brands.find(b => b.id === a.brand_id);
      return brand;
    }).filter(Boolean);
  };

  // 檢查品牌是否已分配給該會計
  const isBrandAssigned = (accountantId, brandId) => {
    return assignments.some(a => a.employee_id === accountantId && a.brand_id === brandId);
  };

  // 添加品牌分配
  const handleAddBrand = async (accountantId, brandId) => {
    if (isBrandAssigned(accountantId, brandId)) {
      alert('此品牌已分配給該會計！');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('accountant_brands')
        .insert({
          employee_id: accountantId,
          brand_id: brandId
        });

      if (error) throw error;

      alert('✅ 品牌分配成功！');
      await fetchData();
    } catch (err) {
      console.error('Error adding brand:', err);
      alert('❌ 分配失敗: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // 移除品牌分配
  const handleRemoveBrand = async (accountantId, brandId) => {
    if (!window.confirm('確定要移除此品牌分配嗎？')) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('accountant_brands')
        .delete()
        .eq('employee_id', accountantId)
        .eq('brand_id', brandId);

      if (error) throw error;

      alert('✅ 已移除品牌分配');
      await fetchData();
    } catch (err) {
      console.error('Error removing brand:', err);
      alert('❌ 移除失敗: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">載入中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md">
          <AlertCircle className="text-red-600 mb-2" size={32} />
          <p className="text-red-800 font-bold mb-1">載入失敗</p>
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 說明卡片 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
            <Briefcase size={20} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-blue-900 mb-1">會計品牌分配管理</h3>
            <p className="text-sm text-blue-700 leading-relaxed">
              為每位會計分配負責的品牌，分配後該會計將只能看到和處理所負責品牌的付款申請。
              <br />
              例如：六扇門會計只處理六扇門品牌的付款申請。
            </p>
          </div>
        </div>
      </div>

      {/* 統計資訊 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
              <Users size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{accountants.length}</p>
              <p className="text-sm text-gray-500">會計人員</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Briefcase size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{brands.length}</p>
              <p className="text-sm text-gray-500">品牌總數</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <CheckCircle size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{assignments.length}</p>
              <p className="text-sm text-gray-500">分配關係</p>
            </div>
          </div>
        </div>
      </div>

      {/* 會計列表 */}
      {accountants.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium mb-2">目前沒有會計人員</p>
          <p className="text-sm text-gray-400">
            請先在「員工管理」中新增角色為「會計」的員工
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {accountants.map((accountant) => {
            const assignedBrands = getAccountantBrands(accountant.id);
            const availableBrands = brands.filter(b => !isBrandAssigned(accountant.id, b.id));

            return (
              <div
                key={accountant.id}
                className="bg-white rounded-xl border-2 border-gray-200 hover:border-blue-300 transition-colors"
              >
                {/* 會計資訊 */}
                <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        {accountant.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800 text-lg">{accountant.name}</h3>
                        <p className="text-sm text-gray-500">
                          {accountant.email || accountant.employee_id}
                        </p>
                      </div>
                    </div>

                    {/* 品牌數量 */}
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600">{assignedBrands.length}</p>
                      <p className="text-xs text-gray-500">負責品牌</p>
                    </div>
                  </div>
                </div>

                {/* 已分配品牌 */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700 text-sm">負責品牌</h4>
                    {assignedBrands.length === 0 && (
                      <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                        尚未分配品牌
                      </span>
                    )}
                  </div>

                  {assignedBrands.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {assignedBrands.map((brand) => (
                        <div
                          key={brand.id}
                          className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 group hover:bg-indigo-200 transition-colors"
                        >
                          <span className="font-medium text-sm">
                            {String(brand.id).padStart(2, '0')} - {brand.name}
                          </span>
                          <button
                            onClick={() => handleRemoveBrand(accountant.id, brand.id)}
                            disabled={processing}
                            className="p-1 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                            title="移除此品牌"
                          >
                            <X size={14} className="text-red-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-4 mb-4 text-center">
                      <p className="text-sm text-gray-500">此會計尚未負責任何品牌</p>
                    </div>
                  )}

                  {/* 添加品牌 */}
                  {availableBrands.length > 0 && (
                    <div className="pt-4 border-t border-gray-100">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        添加品牌
                      </label>
                      <div className="flex gap-2">
                        <select
                          id={`brand-select-${accountant.id}`}
                          className="flex-1 p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                          disabled={processing}
                        >
                          <option value="">請選擇品牌</option>
                          {availableBrands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                              {String(brand.id).padStart(2, '0')} - {brand.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const select = document.getElementById(`brand-select-${accountant.id}`);
                            const brandId = parseInt(select.value);
                            if (brandId) {
                              handleAddBrand(accountant.id, brandId);
                              select.value = '';
                            } else {
                              alert('請先選擇品牌');
                            }
                          }}
                          disabled={processing}
                          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {processing ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Plus size={16} />
                          )}
                          添加
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 提示訊息 */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-amber-800">
            <p className="font-semibold mb-1">注意事項：</p>
            <ul className="list-disc list-inside space-y-1 text-amber-700">
              <li>品牌分配後，會計在付款系統 Dashboard 只能看到所負責品牌的申請案件</li>
              <li>一個品牌可以分配給多位會計，多位會計都可以處理該品牌的案件</li>
              <li>如果會計沒有分配任何品牌，將無法看到任何待簽核案件</li>
              <li>分配設定即時生效，無需重新登入</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
