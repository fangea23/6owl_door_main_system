import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProductRequestForm from '../components/ProductRequestForm';
import { useProductRequests } from '../hooks/useProductRequests';

export default function ProductRequestNew() {
  const navigate = useNavigate();
  const { createRequest } = useProductRequests();

  const handleSubmit = async (formData, items) => {
    const result = await createRequest(formData, items);
    if (result.success) {
      alert('申請單建立成功！');
      navigate('/systems/erp');
    }
    return result;
  };

  return (
    <div className="space-y-6">
      {/* 返回按鈕 */}
      <button
        onClick={() => navigate('/systems/erp')}
        className="flex items-center gap-2 text-stone-600 hover:text-red-600 transition"
      >
        <ArrowLeft size={20} />
        返回列表
      </button>

      {/* 表單 */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-6">
        <ProductRequestForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/systems/erp')}
        />
      </div>
    </div>
  );
}
