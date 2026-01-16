import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Portal from './pages/Portal';
import Login from './pages/Login';
import Account from './pages/Account';
import UserProfile from './pages/UserProfile';
import ManagementCenter from './pages/management/ManagementCenter';
import UpdatePassword from './pages/UpdatePassword';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import './App.css';

// 子系統 Layout
import PaymentSystemLayout from './pages/systems/PaymentSystemLayout';
import LicenseSystemLayout from './pages/systems/LicenseSystemLayout';
import MeetingRoomSystemLayout from './pages/systems/MeetingRoomSystemLayout';
import CarRentalSystemLayout from './pages/systems/CarRentalSystemLayout';
import StoreManagementSystemLayout from './pages/systems/StoreManagementSystemLayout'; 

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* PWA 安裝提示 */}
        <PWAInstallPrompt />

        <Routes>
          {/* ========================================
              1. 公開路由 (任何人都能看)
             ======================================== */}
          <Route path="/login" element={<Login />} />
          
          {/* ✅ 正確：更新密碼頁面放在這裡，不需先登入 */}
          <Route path="/update-password" element={<UpdatePassword />} />
          

          {/* ========================================
              2. 受保護路由 (必須登入才能看)
             ======================================== */}
          <Route element={<ProtectedRoute />}>
             {/* 主入口 */}
             <Route path="/" element={<Portal />} />
             <Route path="/account" element={<Account />} />
             <Route path="/account" element={<UserProfile />} />
             <Route path="/management/*" element={<ManagementCenter />} />

             {/* 👇 修正：子系統應該要放在 ProtectedRoute 裡面！ */}
             
             {/* 付款簽核系統 */}
             <Route path="/systems/payment-approval/*" element={<PaymentSystemLayout />} />

             {/* 軟體授權系統 */}
             <Route path="/systems/software-license/*" element={<LicenseSystemLayout />} />

             {/* 會議室租借系統 */}
             <Route path="/systems/meeting-room/*" element={<MeetingRoomSystemLayout />} />

             {/* 公司車租借系統 */}
             <Route path="/systems/car-rental/*" element={<CarRentalSystemLayout />} />

             {/* 店舖管理系統 */}
             <Route path="/systems/store-management/*" element={<StoreManagementSystemLayout />} />
          </Route>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;