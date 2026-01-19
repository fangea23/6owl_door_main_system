import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import ApplyForm from './pages/ApplyForm';
import RequestDetail from './pages/RequestDetail';
import './App.css'; // 確保引入了樣式

// 主版面配置 (修改背景風格)
const MainLayout = () => {
  return (
    <div className="min-h-screen bg-stone-50 bg-pattern-diagonal text-stone-800 font-sans">
      <Header />
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
             <Route path="/dashboard" element={<Dashboard />} />
             <Route path="/apply" element={<ApplyForm />} />
             <Route path="/request/:id" element={<RequestDetail />} />
             {/* AdminPanel 已移至統一管理中心 /management */}
             <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Route>


      </Routes>
    </BrowserRouter>
  );
}