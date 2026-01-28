// ==========================================
// Edge Function: create-employee-account v1
// 建立員工帳號（免 Email 驗證）
// ==========================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  employee_id: string;      // 登入帳號（將轉換為 {employee_id}@6owldoor.internal）
  email?: string;           // 或直接提供 email
  password: string;         // 密碼
  full_name: string;        // 姓名
  role?: string;            // 角色（預設 user）
}

Deno.serve(async (req: Request) => {
  console.log("=== create-employee-account v1 - RBAC 權限檢查 ===")

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Parse request body
    const body: RequestBody = await req.json().catch(() => null)
    if (!body) {
      throw new Error('Request body is empty')
    }

    const { employee_id, email, password, full_name, role = 'user' } = body

    // Validate required fields
    if (!password || password.length < 6) {
      throw new Error('密碼至少需要 6 位數')
    }
    if (!full_name) {
      throw new Error('姓名為必填')
    }
    if (!employee_id && !email) {
      throw new Error('請提供員工編號或 Email')
    }

    // ==========================================
    // SECURITY: Verify caller permissions (using RBAC)
    // ==========================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Create a "regular permissions" client to verify user token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Get current operator's user ID
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !caller) {
      throw new Error('Unauthorized: 請先登入')
    }

    // Create Admin Client (for reading RBAC permissions and creating users)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // Use RBAC permission check: Check for employee.create or profile.create permission
    const { data: hasEmployeeCreate } = await supabaseAdmin
      .schema('rbac')
      .rpc('user_has_permission', {
        p_user_id: caller.id,
        p_permission_code: 'employee.create'
      })

    const { data: hasProfileCreate } = await supabaseAdmin
      .schema('rbac')
      .rpc('user_has_permission', {
        p_user_id: caller.id,
        p_permission_code: 'profile.create'
      })

    console.log(`[Permission Check] employee.create: ${hasEmployeeCreate}, profile.create: ${hasProfileCreate}`)

    if (!hasEmployeeCreate && !hasProfileCreate) {
      throw new Error('權限不足：您沒有建立員工帳號的權限')
    }

    // Determine email to use
    // If employee_id is provided, convert to @6owldoor.internal format
    // If email is provided directly, use it
    let authEmail: string
    if (email) {
      authEmail = email.toLowerCase().trim()
    } else {
      authEmail = `${employee_id.toLowerCase().trim()}@6owldoor.internal`
    }

    console.log(`[Create Account] Caller: ${caller.email}, Creating: ${authEmail}`)

    // ==========================================
    // Create auth user (Admin permissions, no email verification)
    // ==========================================
    const loginId = employee_id || authEmail.split('@')[0]

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: password,
      email_confirm: true,  // Auto-confirm email (no verification needed)
      user_metadata: {
        full_name: full_name,
        employee_id: loginId,  // 傳入 employee_id，讓 handle_new_user trigger 使用
        login_id: loginId
      }
    })

    if (createError) {
      console.error('[Create Account] Error:', createError)

      // Handle specific error messages
      if (createError.message.includes('already been registered')) {
        throw new Error('此帳號已存在')
      }
      throw new Error(`建立帳號失敗: ${createError.message}`)
    }

    if (!userData.user) {
      throw new Error('建立帳號失敗：未返回用戶資料')
    }

    console.log(`[Create Account] Success: ${userData.user.id}`)

    // ==========================================
    // Create/Update profile record
    // ==========================================
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userData.user.id,
        email: authEmail,
        full_name: full_name,
        role: role,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.warn('[Profile] Warning:', profileError)
      // Don't throw - profile creation failure is not critical
    }

    // ==========================================
    // Link to employee record (if exists)
    // ==========================================
    const { error: linkError } = await supabaseAdmin
      .from('employees')
      .update({
        user_id: userData.user.id,
        login_id: loginId
      })
      .or(`login_id.eq.${loginId},employee_id.eq.${loginId}`)
      .is('user_id', null)  // Only update if not already linked

    if (linkError) {
      console.warn('[Link Employee] Warning:', linkError)
      // Don't throw - employee linking failure is not critical
    } else {
      console.log(`[Link Employee] Linked to login_id/employee_id: ${loginId}`)
    }

    // Success response
    return new Response(
      JSON.stringify({
        success: true,
        message: '帳號建立成功',
        user: {
          id: userData.user.id,
          email: authEmail,
          full_name: full_name
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('[Function Error]:', error.message)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
