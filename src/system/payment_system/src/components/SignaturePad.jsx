import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { UploadCloud, Eraser, Check } from 'lucide-react';

export default function SignaturePad({ onConfirm, label = "主管簽核" }) {
  const sigCanvas = useRef({});
  const [isEmpty, setIsEmpty] = useState(true);

  const clear = () => {
    sigCanvas.current.clear();
    setIsEmpty(true);
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current.isEmpty());
  };

  const confirmSignature = () => {
    if (sigCanvas.current.isEmpty()) {
      alert("請先簽名再送出！");
      return;
    }
    // 取得簽名圖片 (Base64)
    const dataUrl = sigCanvas.current.getCanvas().toDataURL('image/png');
    // 透過 Blob 轉換並回傳給父層
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        onConfirm(blob); // 將圖檔 Blob 傳出去
      });
  };

  return (
    <div className="border-2 border-emerald-100 rounded-lg p-4 bg-white shadow-sm">
      <h4 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
        <UploadCloud size={18} /> {label}
      </h4>
      <div className="border-2 border-dashed border-gray-300 rounded bg-gray-50 cursor-crosshair">
        <SignatureCanvas 
          ref={sigCanvas}
          penColor="black"
          canvasProps={{width: 300, height: 150, className: 'sigCanvas mx-auto'}}
          onEnd={handleEnd}
        />
      </div>
      <div className="flex gap-2 mt-3 justify-end">
        <button 
          type="button" 
          onClick={clear} 
          className="px-3 py-1 text-xs text-gray-500 hover:text-red-500 border border-gray-300 rounded flex items-center gap-1"
        >
          <Eraser size={14} /> 清除
        </button>
        <button 
          type="button" 
          onClick={confirmSignature} 
          disabled={isEmpty}
          className="px-4 py-1 text-sm bg-emerald-600 text-white rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <Check size={16} /> 確認簽署
        </button>
      </div>
    </div>
  );
}