/**
 * 軟體授權系統 Layout
 *
 * 目前為開發中狀態，之後可以擴展
 */
import { Link } from 'react-router-dom';

// 返回主系統的導航列
function BackToPortal() {
  return (
    <div className="bg-green-600 text-white px-4 py-2 flex items-center justify-between">
      <Link
        to="/"
        className="flex items-center gap-2 hover:text-green-200 transition-colors"
      >
        <span>←</span>
        <span>返回六扇門入口</span>
      </Link>
      <span className="text-sm opacity-80">軟體授權系統</span>
    </div>
  );
}

export default function LicenseSystemLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <BackToPortal />
      <div className="flex items-center justify-center min-h-[calc(100vh-48px)]">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🔑</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">軟體授權系統</h1>
          <p className="text-gray-500 mb-6">系統開發中，敬請期待</p>
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
}
