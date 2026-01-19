import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Header } from './Header'; // 引入剛剛建立的 Header

export function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 頂部導航 */}
      <Header />

      {/* 主要內容區 */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        <Outlet />
      </main>

      {/* 頁尾 */}
      <footer className="border-t border-gray-200/60 mt-auto bg-white/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-800">六扇門企業服務入口</span>
                <span className="text-[10px] text-gray-400 tracking-wider">LICENSE SYSTEM</span>
              </div>
            </div>
            <div className="text-sm text-gray-500 font-medium">
              © {new Date().getFullYear()} 六扇門時尚湯鍋. <span className="text-gray-300">|</span> All rights reserved.
            </div>
          </div>
        </div>
      </footer>

      {/* 全域通知 */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
          success: { duration: 3000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </div>
  );
}