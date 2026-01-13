import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ReactDOM from 'react-dom/client' // ✅ 關鍵：這行就是你缺少的
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './AuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider> {/* 包在最外層 */}
      <App />
    </AuthProvider>
  </StrictMode>,
)