import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import ForgotPassword from './pages/ForgotPassword';
import UpdatePassword from './pages/UpdatePassword';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute'; // ✅ 1. 引入守門員
import UserProfile from './pages/UserProfile'; // ✅ 引入新頁面
// 引入頁面
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ApplyForm from './pages/ApplyForm';
import RequestDetail from './pages/RequestDetail';
import AdminPanel from './pages/AdminPanel';
// 主版面配置 (維持原樣)
const MainLayout = () => {
  return (
    <>
      <Header />
      <main className="min-h-[calc(100vh-64px)] bg-gray-50">
        <Outlet />
      </main>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* --- 1. 公開路由 (不需要登入) --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />
        
        {/* --- 2. 受保護路由 (也就是你的內部系統) --- */}
        {/* ✅ 重點修改：用 ProtectedRoute 包住 MainLayout */}
        {/* 這樣一來，只要進入這些網址，都會先經過 loading 檢查 */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
             {/* 這裡面的路徑，只有在確定「已登入」後才會被渲染 */}
             <Route path="/dashboard" element={<Dashboard />} />
             <Route path="/apply" element={<ApplyForm />} />
             <Route path="/request/:id" element={<RequestDetail />} />
             <Route path="/profile" element={<UserProfile />} />
             {/* 根目錄導向 Dashboard */}
             <Route path="/admin" element={<AdminPanel />} />
             <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>

        {/* 萬一使用者亂打網址，導回 Login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}