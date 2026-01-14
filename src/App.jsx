import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Portal from './pages/Portal';
import Login from './pages/Login';
import Account from './pages/Account';
import ManagementCenter from './pages/management/ManagementCenter';
import './App.css';

// 子系統 Layout
import PaymentSystemLayout from './pages/systems/PaymentSystemLayout';
import LicenseSystemLayout from './pages/systems/LicenseSystemLayout';
import MeetingRoomSystemLayout from './pages/systems/MeetingRoomSystemLayout';
import CarRentalSystemLayout from './pages/systems/CarRentalSystemLayout'; 

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

          {/* 統一管理中心 */}
          <Route
            path="/management/*"
            element={
              <ProtectedRoute>
                <ManagementCenter />
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

          {/* 會議室租借系統 */}
          <Route
            path="/systems/meeting-room/*"
            element={<MeetingRoomSystemLayout />}
          />

          {/* 公司車租借系統 */}
          <Route
            path="/systems/car-rental/*"
            element={<CarRentalSystemLayout />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;