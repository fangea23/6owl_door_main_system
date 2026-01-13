import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Missing Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_KEY in your .env file.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    db: {
      schema: 'software_maintenance'
    }
  }
)

// 授權驗證 API
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