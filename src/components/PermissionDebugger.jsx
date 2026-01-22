import { useUserPermissions } from '../hooks/useUserPermissions';
import { useAuth } from '../contexts/AuthContext';

/**
 * 權限調試組件
 * 顯示當前用戶的所有權限
 * 用於調試權限問題
 */
export default function PermissionDebugger() {
  const { user, role } = useAuth();
  const { permissions, loading, error } = useUserPermissions();

  if (!user) {
    return (
      <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-md">
        <p className="text-red-400">未登入</p>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-900 text-white p-4 rounded-lg shadow-xl max-w-md max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
        <h3 className="font-bold text-green-400">🔍 權限調試器</h3>
        <span className="text-xs text-gray-400">{user.email}</span>
      </div>

      <div className="space-y-3 text-xs">
        {/* 用戶資訊 */}
        <div>
          <p className="text-gray-400">用戶 ID:</p>
          <p className="font-mono text-blue-300 text-[10px]">{user.id}</p>
        </div>

        <div>
          <p className="text-gray-400">角色:</p>
          <p className="font-bold text-yellow-300">{role || 'NULL'}</p>
        </div>

        {/* 權限載入狀態 */}
        <div>
          <p className="text-gray-400">權限載入狀態:</p>
          {loading ? (
            <p className="text-yellow-400">⏳ 載入中...</p>
          ) : error ? (
            <p className="text-red-400">❌ 錯誤: {error.message}</p>
          ) : (
            <p className="text-green-400">✅ 已載入</p>
          )}
        </div>

        {/* 權限列表 */}
        <div>
          <p className="text-gray-400 mb-1">擁有的權限 ({permissions.size}):</p>
          {permissions.size === 0 ? (
            <p className="text-red-400">⚠️ 沒有任何權限！</p>
          ) : (
            <div className="bg-gray-800 rounded p-2 max-h-48 overflow-y-auto">
              {Array.from(permissions).sort().map(perm => (
                <div key={perm} className="font-mono text-[10px] py-0.5">
                  <span className={perm.startsWith('system.') ? 'text-purple-300' : 'text-green-300'}>
                    {perm}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 系統訪問權限檢查 */}
        <div>
          <p className="text-gray-400 mb-1">系統訪問權限:</p>
          <div className="space-y-1">
            {[
              { code: 'system.management', name: '管理中心' },
              { code: 'system.payment', name: '付款簽核' },
              { code: 'system.meeting_room', name: '會議室' },
              { code: 'system.car_rental', name: '車輛租借' },
            ].map(({ code, name }) => (
              <div key={code} className="flex items-center gap-2">
                <span className={permissions.has(code) ? 'text-green-400' : 'text-red-400'}>
                  {permissions.has(code) ? '✓' : '✗'}
                </span>
                <span className="text-[10px]">{name}</span>
                <span className="text-[9px] text-gray-500 font-mono">{code}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
