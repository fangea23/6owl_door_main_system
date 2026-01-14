// 修改：不再建立新的 client，而是引入主系統的實例
import { supabase as mainClient } from '../../../../lib/supabase';

// 建立一個包裝物件，讓授權系統能共用主系統的登入 (SSO)，但查詢特定的 Schema
export const supabase = {
  // 1. 共用主系統的 Auth (解決多重實例打架的問題)
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),
  
  // 2. 針對資料庫查詢，強制指定 'software_maintenance' schema
  from: (table) => mainClient.schema('software_maintenance').from(table),
  
  // 3. RPC 呼叫 (通常不需要 schema，若有需要可在此調整)
  rpc: (fn, args) => mainClient.rpc(fn, args),
};

// 授權驗證 API (保持原有邏輯，但使用上面的 supabase 代理)
export const licenseApi = {
  // 驗證授權碼
  async verify(licenseKey, machineId, machineName = null) {
    const { data, error } = await supabase.rpc('verify_license', {
      p_license_key: licenseKey,
      p_machine_id: machineId,
      p_machine_name: machineName,
      p_ip_address: null
    })

    if (error) throw error
    return data
  },

  // 停用授權
  async deactivate(licenseKey, machineId) {
    const { data, error } = await supabase.rpc('deactivate_license', {
      p_license_key: licenseKey,
      p_machine_id: machineId
    })

    if (error) throw error
    return data
  }
}