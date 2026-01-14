import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Users,
  MapPin,
  Loader2,
  X
} from 'lucide-react';

export default function RoomManagement() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    capacity: '',
    description: '',
    is_active: true,
  });

  // 載入會議室列表
  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('name');
    if (!error) setRooms(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  // 開啟新增/編輯視窗
  const openModal = (room = null) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        location: room.location || '',
        capacity: room.capacity || '',
        description: room.description || '',
        is_active: room.is_active !== false,
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        location: '',
        capacity: '',
        description: '',
        is_active: true,
      });
    }
    setShowModal(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      capacity: parseInt(formData.capacity) || 0,
    };

    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('rooms')
          .update(payload)
          .eq('id', editingRoom.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert([payload]);
        if (error) throw error;
      }
      setShowModal(false);
      fetchRooms();
    } catch (error) {
      alert(`操作失敗：${error.message}`);
    }
  };

  const handleDelete = async (room) => {
    if (!confirm(`確定要刪除「${room.name}」嗎？`)) return;

    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id);
      if (error) throw error;
      fetchRooms();
    } catch (error) {
      alert(`刪除失敗：${error.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-800">會議室管理</h2>
          <p className="text-stone-500 text-sm mt-1">管理可預約的會議室</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <Plus size={18} />
          新增會議室
        </button>
      </div>

      {/* 會議室列表 */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-amber-500" size={32} />
        </div>
      ) : rooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-12 text-center">
          <Building2 size={48} className="mx-auto mb-3 text-stone-300" />
          <p className="text-stone-500">尚無會議室資料</p>
          <button
            onClick={() => openModal()}
            className="mt-4 text-amber-600 hover:text-amber-700 font-medium"
          >
            立即新增
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map(room => (
            <div
              key={room.id}
              className={`bg-white rounded-xl border p-5 transition-all hover:shadow-lg ${
                room.is_active ? 'border-stone-200' : 'border-stone-100 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-bold text-stone-800 text-lg">{room.name}</h3>
                  {!room.is_active && (
                    <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded">
                      已停用
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openModal(room)}
                    className="p-2 hover:bg-amber-50 text-stone-500 hover:text-amber-600 rounded-lg transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(room)}
                    className="p-2 hover:bg-red-50 text-stone-500 hover:text-red-600 rounded-lg transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-stone-600">
                <p className="flex items-center gap-2">
                  <MapPin size={16} className="text-stone-400" />
                  {room.location || '未設定位置'}
                </p>
                <p className="flex items-center gap-2">
                  <Users size={16} className="text-stone-400" />
                  容納 {room.capacity || '?'} 人
                </p>
              </div>

              {room.description && (
                <p className="mt-3 text-xs text-stone-400 line-clamp-2 pt-3 border-t border-stone-100">
                  {room.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 新增/編輯 Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-800">
                {editingRoom ? '編輯會議室' : '新增會議室'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-stone-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  會議室名稱 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="例：A會議室、大會議廳..."
                  className="w-full rounded-lg border-stone-200 p-3 border focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    位置
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    placeholder="例：3F、B棟..."
                    className="w-full rounded-lg border-stone-200 p-3 border focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1.5">
                    容納人數
                  </label>
                  <input
                    type="number"
                    name="capacity"
                    value={formData.capacity}
                    onChange={handleChange}
                    min="1"
                    placeholder="人數"
                    className="w-full rounded-lg border-stone-200 p-3 border focus:ring-2 focus:ring-amber-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">
                  說明
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={2}
                  placeholder="其他說明..."
                  className="w-full rounded-lg border-stone-200 p-3 border focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="w-4 h-4 text-amber-500 focus:ring-amber-500 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-stone-700">
                  啟用此會議室 (可供預約)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                >
                  {editingRoom ? '儲存' : '新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
