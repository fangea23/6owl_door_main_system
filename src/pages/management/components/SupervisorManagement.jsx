import React, { useState, useEffect } from 'react';
import { useStores } from '../../../hooks/management/useStores';
import { useEmployees } from '../../../hooks/management/useEmployees';
import { useBrands } from '../../../hooks/management/useBrands';
import { usePermission } from '../../../hooks/usePermission';
import { supabase } from '../../../lib/supabase';
import Badge, { StatusBadge } from '../../../components/ui/Badge';
import Modal from '../../../components/ui/Modal';
import {
  Users, Store, Search, Loader2, Plus, X, Save, ChevronDown, ChevronRight,
  UserCheck, Building, MapPin, AlertCircle, Check
} from 'lucide-react';

/**
 * 督導管理 - 指派門市給督導
 */
export default function SupervisorManagement() {
  const { stores, loading: storesLoading } = useStores();
  const { employees, loading: employeesLoading } = useEmployees();
  const { brands } = useBrands();
  const { hasPermission: canEdit } = usePermission('employee.edit');

  // 狀態
  const [supervisorAssignments, setSupervisorAssignments] = useState([]);
  const [unassignedStores, setUnassignedStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBrand, setFilterBrand] = useState('all');
  const [expandedSupervisors, setExpandedSupervisors] = useState({});

  // Modal 狀態
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [selectedStores, setSelectedStores] = useState([]);

  // 載入督導指派資料
  const fetchAssignments = async () => {
    try {
      setLoading(true);

      // 取得所有督導指派
      const { data: assignments, error } = await supabase
        .from('user_store_assignments')
        .select(`
          id,
          user_id,
          store_id,
          assignment_type,
          assigned_at
        `)
        .eq('assignment_type', 'supervisor');

      if (error) throw error;

      // 建立督導 -> 門市 的映射
      const supervisorMap = {};

      for (const assignment of assignments || []) {
        if (!supervisorMap[assignment.user_id]) {
          // 找到對應的員工
          const employee = employees.find(e => e.user_id === assignment.user_id);
          if (employee) {
            supervisorMap[assignment.user_id] = {
              user_id: assignment.user_id,
              employee: employee,
              stores: [],
            };
          }
        }

        if (supervisorMap[assignment.user_id]) {
          const store = stores.find(s => s.id === assignment.store_id);
          if (store) {
            supervisorMap[assignment.user_id].stores.push({
              ...store,
              assignment_id: assignment.id,
              assigned_at: assignment.assigned_at,
            });
          }
        }
      }

      setSupervisorAssignments(Object.values(supervisorMap));

      // 找出未指派的門市
      const assignedStoreIds = new Set(assignments?.map(a => a.store_id) || []);
      const unassigned = stores.filter(s => !assignedStoreIds.has(s.id) && s.is_active);
      setUnassignedStores(unassigned);

    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!storesLoading && !employeesLoading) {
      fetchAssignments();
    }
  }, [stores, employees, storesLoading, employeesLoading]);

  // 可作為督導的員工（有 user_id 的在職員工）
  const availableSupervisors = employees.filter(
    e => e.user_id && e.status === 'active'
  );

  // 搜尋過濾
  const filteredSupervisors = supervisorAssignments.filter(sup => {
    const matchesSearch =
      sup.employee?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sup.employee?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // 篩選未指派門市
  const filteredUnassigned = unassignedStores.filter(store => {
    const matchesBrand = filterBrand === 'all' || store.brand_id?.toString() === filterBrand;
    const matchesSearch =
      store.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      store.code?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesBrand && matchesSearch;
  });

  // 切換展開
  const toggleExpand = (userId) => {
    setExpandedSupervisors(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // 開啟指派 Modal
  const openAssignModal = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setSelectedStores([]);
    setShowAssignModal(true);
  };

  // 切換選取門市
  const toggleStoreSelection = (storeId) => {
    setSelectedStores(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  // 指派門市給督導
  const handleAssign = async () => {
    if (!selectedSupervisor || selectedStores.length === 0) return;

    setProcessing(true);
    try {
      const insertData = selectedStores.map(storeId => ({
        user_id: selectedSupervisor.user_id || selectedSupervisor.employee?.user_id,
        store_id: storeId,
        assignment_type: 'supervisor',
      }));

      const { error } = await supabase
        .from('user_store_assignments')
        .upsert(insertData, {
          onConflict: 'user_id,store_id,assignment_type',
        });

      if (error) throw error;

      setShowAssignModal(false);
      await fetchAssignments();
      alert(`✅ 已成功指派 ${selectedStores.length} 家門市`);
    } catch (err) {
      console.error('Error assigning stores:', err);
      alert('❌ 指派失敗: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // 移除門市指派
  const handleRemoveStore = async (assignmentId, storeName) => {
    if (!window.confirm(`確定要移除「${storeName}」的督導指派嗎？`)) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('user_store_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      await fetchAssignments();
      alert('✅ 已移除指派');
    } catch (err) {
      console.error('Error removing assignment:', err);
      alert('❌ 移除失敗: ' + err.message);
    } finally {
      setProcessing(false);
    }
  };

  // 快速指派新督導
  const handleQuickAssign = async (employeeUserId) => {
    setSelectedSupervisor({ user_id: employeeUserId, employee: employees.find(e => e.user_id === employeeUserId) });
    setSelectedStores([]);
    setShowAssignModal(true);
  };

  if (loading || storesLoading || employeesLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-blue-600" size={40} />
        <span className="ml-3 text-gray-600">載入中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 統計卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCheck size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{supervisorAssignments.length}</p>
              <p className="text-sm text-gray-500">督導人數</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Store size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {supervisorAssignments.reduce((sum, s) => sum + s.stores.length, 0)}
              </p>
              <p className="text-sm text-gray-500">已指派門市</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{unassignedStores.length}</p>
              <p className="text-sm text-gray-500">未指派門市</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users size={20} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {supervisorAssignments.length > 0
                  ? Math.round(supervisorAssignments.reduce((sum, s) => sum + s.stores.length, 0) / supervisorAssignments.length)
                  : 0}
              </p>
              <p className="text-sm text-gray-500">平均管理數</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜尋與操作 */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="搜尋督導或門市..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {canEdit && (
          <select
            value=""
            onChange={(e) => e.target.value && handleQuickAssign(e.target.value)}
            className="px-4 py-3 bg-blue-600 text-white rounded-xl shadow-lg cursor-pointer"
          >
            <option value="">+ 新增督導</option>
            {availableSupervisors
              .filter(e => !supervisorAssignments.find(s => s.user_id === e.user_id))
              .map(emp => (
                <option key={emp.user_id} value={emp.user_id}>
                  {emp.name} ({emp.employee_id})
                </option>
              ))}
          </select>
        )}
      </div>

      {/* 督導列表 */}
      <div className="space-y-4">
        {filteredSupervisors.map((supervisor) => {
          const isExpanded = expandedSupervisors[supervisor.user_id];

          return (
            <div key={supervisor.user_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* 督導標頭 */}
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => toggleExpand(supervisor.user_id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                    {supervisor.employee?.name?.[0] || 'S'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800">{supervisor.employee?.name}</h3>
                      <span className="text-sm text-gray-500 font-mono">({supervisor.employee?.employee_id})</span>
                      <Badge variant="info">督導</Badge>
                    </div>
                    <p className="text-sm text-gray-500">管理 {supervisor.stores.length} 家門市</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openAssignModal(supervisor); }}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1"
                    >
                      <Plus size={16} /> 指派門市
                    </button>
                  )}
                  {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </div>
              </div>

              {/* 門市列表 */}
              {isExpanded && (
                <div className="border-t border-gray-200">
                  {supervisor.stores.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Store size={40} className="mx-auto mb-2 opacity-30" />
                      <p>尚未指派門市</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                      {supervisor.stores.map((store) => (
                        <div key={store.id} className="flex items-center justify-between p-3 hover:bg-gray-50">
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 bg-green-100 rounded-lg">
                              <Store size={16} className="text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-800">{store.name}</span>
                                <span className="text-xs text-gray-500 font-mono">({store.code})</span>
                                <Badge variant={store.brand?.code === '01' ? 'info' : 'purple'} size="sm">
                                  {store.brand?.name}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {canEdit && (
                            <button
                              onClick={() => handleRemoveStore(store.assignment_id, store.name)}
                              disabled={processing}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="移除指派"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredSupervisors.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            <UserCheck size={48} className="mx-auto mb-3 opacity-30" />
            <p className="text-lg">尚無督導資料</p>
            <p className="text-sm mt-1">請新增督導並指派門市</p>
          </div>
        )}
      </div>

      {/* 未指派門市區塊 */}
      {unassignedStores.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle size={20} className="text-yellow-600" />
            <h3 className="font-bold text-yellow-800">未指派督導的門市 ({unassignedStores.length})</h3>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => setFilterBrand('all')}
              className={`px-3 py-1 text-sm rounded-full transition ${
                filterBrand === 'all' ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              全部
            </button>
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => setFilterBrand(brand.id.toString())}
                className={`px-3 py-1 text-sm rounded-full transition ${
                  filterBrand === brand.id.toString() ? 'bg-yellow-600 text-white' : 'bg-white text-yellow-700 hover:bg-yellow-100'
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {filteredUnassigned.slice(0, 20).map(store => (
              <span
                key={store.id}
                className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-yellow-300 rounded-lg text-sm text-gray-700"
              >
                <Store size={14} className="text-yellow-600" />
                {store.brand?.name} - {store.name}
              </span>
            ))}
            {filteredUnassigned.length > 20 && (
              <span className="px-2 py-1 text-sm text-yellow-700">
                ...還有 {filteredUnassigned.length - 20} 家
              </span>
            )}
          </div>
        </div>
      )}

      {/* 指派 Modal */}
      <Modal
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        title={`指派門市給 ${selectedSupervisor?.employee?.name || '督導'}`}
        size="lg"
      >
        <div className="space-y-4">
          {/* 品牌篩選 */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterBrand('all')}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${
                filterBrand === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              全部品牌
            </button>
            {brands.map(brand => (
              <button
                key={brand.id}
                onClick={() => setFilterBrand(brand.id.toString())}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  filterBrand === brand.id.toString() ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {brand.name}
              </button>
            ))}
          </div>

          {/* 門市列表 */}
          <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
            {filteredUnassigned.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Check size={40} className="mx-auto mb-2 opacity-30" />
                <p>沒有待指派的門市</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredUnassigned.map(store => {
                  const isSelected = selectedStores.includes(store.id);
                  return (
                    <label
                      key={store.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer transition ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStoreSelection(store.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-800">{store.name}</span>
                          <span className="text-xs text-gray-500 font-mono">({store.code})</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Badge variant={store.brand?.code === '01' ? 'info' : 'purple'} size="sm">
                            {store.brand?.name}
                          </Badge>
                          <StatusBadge status={store.store_type} />
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 已選取提示 */}
          {selectedStores.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                已選取 <strong>{selectedStores.length}</strong> 家門市
              </span>
              <button
                onClick={() => setSelectedStores([])}
                className="text-sm text-blue-600 hover:underline"
              >
                清除選取
              </button>
            </div>
          )}

          {/* 操作按鈕 */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleAssign}
              disabled={processing || selectedStores.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              確認指派 ({selectedStores.length})
            </button>
            <button
              type="button"
              onClick={() => setShowAssignModal(false)}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              取消
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
