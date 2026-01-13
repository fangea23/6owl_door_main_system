// 統一使用主系統的認證 Context
// 所有 import { useAuth } from './AuthContext' 會自動使用主系統的認證
export { AuthProvider, useAuth } from '../../../contexts/AuthContext';
