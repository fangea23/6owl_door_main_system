import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Portal from './pages/Portal';
import Login from './pages/Login';
import Account from './pages/Account';
import './App.css';

// 子系統 Layout
import PaymentSystemLayout from './pages/systems/PaymentSystemLayout';
import LicenseSystemLayout from './pages/systems/LicenseSystemLayout';
// ✅ 1. 新增引入：引入您剛剛建立的子系統 Layout
import NewSystemLayout from './pages/systems/NewSystemLayout'; 

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* 公開路由 */}
          <Route path="/login" element={<Login />} />

          {/* 受保護路由 */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Portal />
              </ProtectedRoute>
            }
          />

          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <Account />
              </ProtectedRoute>
            }
          />

          {/* ========================================
              子系統路由
              ======================================== */}

          {/* 付款簽核系統 */}
          <Route
            path="/systems/payment-approval/*"
            element={<PaymentSystemLayout />}
          />

          {/* 軟體授權系統 */}
          <Route
            path="/systems/software-license/*"
            element={<LicenseSystemLayout />}
          />

          {/* ✅ 2. 新增路由：為新系統設定路徑 
              注意：
              - path 後面必須加上 "/*"，這樣新系統內部的子路由 (如 /dashboard) 才能生效
              - path 的名稱 (例如 "new-system") 會成為網址的一部分
          */}
          <Route
            path="/systems/new-system/*" 
            element={<NewSystemLayout />}
          />

          {/* 會議室租借系統（預留） */}
          {/* 如果您的新系統就是會議室系統，可以直接把下面這段取代掉 */}
          <Route
            path="/systems/meeting-room/*"
            element={
              <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <div className="text-6xl mb-4">📅</div>
                  <h1 className="text-2xl font-bold">會議室租借系統</h1>
                  <p className="text-gray-500 mt-2">即將推出</p>
                </div>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;