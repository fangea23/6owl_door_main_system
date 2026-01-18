import { supabase as mainClient } from '../../../../lib/supabase';

// 定義 public schema 的表格白名單
const PUBLIC_TABLES = ['employees', 'departments', 'profiles'];

export const supabase = {
  // 1. Auth & Storage & Realtime 照舊
  auth: mainClient.auth,
  storage: mainClient.storage,
  channel: (name, config) => mainClient.channel(name, config),

  // 2. 表格查詢 (自動判斷 Schema)
  from: (table) => {
    if (PUBLIC_TABLES.includes(table)) {
      return mainClient.schema('public').from(table);
    }
    return mainClient.schema('software_maintenance').from(table);
  },

  // 3. ★★★ 修正重點：RPC 強制指定 Schema ★★★
  rpc: (fn, args) => {
    return mainClient.schema('software_maintenance').rpc(fn, args);
  },
};

// licenseApi 不需要動，因為它呼叫的是上面的 supabase.rpc
export const licenseApi = {
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
  
  async deactivate(licenseKey, machineId) {
    const { data, error } = await supabase.rpc('deactivate_license', {
      p_license_key: licenseKey,
      p_machine_id: machineId
    })

    if (error) throw error
    return data
  }
}