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
import EIPKMSystemLayout from './pages/systems/EIPKMSystemLayout';
import TicketingSystemLayout from './pages/systems/TicketingSystemLayout'; 
import { useAuth } from './contexts/AuthContext'; // 確保路徑正確
/*
function DebugSession() {
  const { user, profile } = useAuth();
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, background: 'rgba(0,0,0,0.8)', color: '#0f0', padding: '10px', fontSize: '12px' }}>
      <p>🔑 User ID: {user?.id || 'No Session'}</p>
      <p>📧 Email: {user?.email || 'No Email'}</p>
      <p>👤 Profile Role: {profile?.role || 'NULL (這就是原因!)'}</p>
    </div>
  );
}
*/
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        {/* 🔥 加入這行！這樣左上角的黑色除錯框才會跑出來 */}123

        {/* PWA 安裝提示 */}
        <PWAInstallPrompt />

        <Routes>
          {/* ... (原本的路由都不用動) ... */}
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
               {/* 注意：這裡有兩個 /account，建議把 UserProfile 改路徑或移除其中一個，避免衝突 */}
               {/* <Route path="/user-profile" element={<UserProfile />} /> */} 
               <Route path="/management/*" element={<ManagementCenter />} />

               {/* 子系統 */}
               <Route path="/systems/payment-approval/*" element={<PaymentSystemLayout />} />
               <Route path="/systems/software-license/*" element={<LicenseSystemLayout />} />
               <Route path="/systems/meeting-room/*" element={<MeetingRoomSystemLayout />} />
               <Route path="/systems/car-rental/*" element={<CarRentalSystemLayout />} />
               <Route path="/systems/store-management/*" element={<StoreManagementSystemLayout />} />
               <Route path="/systems/eip-km/*" element={<EIPKMSystemLayout />} />
               <Route path="/systems/ticketing/*" element={<TicketingSystemLayout />} /> 
           </Route>

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;