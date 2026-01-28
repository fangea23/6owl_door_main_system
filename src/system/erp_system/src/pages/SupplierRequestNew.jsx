import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SupplierRequestForm from '../components/SupplierRequestForm';
import { useSupplierRequests } from '../hooks/useSupplierRequests';

export default function SupplierRequestNew() {
  const navigate = useNavigate();
  const { createRequest } = useSupplierRequests();

  const handleSubmit = async (formData) => {
    const result = await createRequest(formData);
    if (result.success) {
      alert('供應商申請單建立成功！');
      navigate('/systems/erp');
    }
    return result;
  };

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <button
        onClick={() => navigate('/systems/erp')}
        className="flex items-center gap-2 text-stone-600 hover:text-orange-600 transition"
      >
        <ArrowLeft size={20} />
        返回列表
      </button>

      {/* 標題 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <h1 className="text-xl font-bold text-stone-800 mb-2">供應商基本資料表</h1>
        <p className="text-sm text-stone-500">大福國際餐飲股份有限公司（統編：83023084）</p>
      </div>

      {/* 表單 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <SupplierRequestForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/systems/erp')}
        />
      </div>
    </div>
  );
}
