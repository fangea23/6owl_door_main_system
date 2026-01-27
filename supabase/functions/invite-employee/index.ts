// 檔名：supabase/functions/invite-employee/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // 處理 CORS Preflight
  console.log("=== invite-employee v4 - RBAC 權限檢查 ===")
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 取得環境變數
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 取得 Request Body
    const body = await req.json().catch(() => null)
    if (!body) throw new Error('Request body is empty')

    const { email, name, employee_id, login_id, department_id, position, role, phone, mobile } = body

    // ==========================================
    // ✅ 安全性檢查：驗證呼叫者權限 (使用 RBAC)
    // ==========================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        throw new Error('Missing Authorization header')
    }

    // 建立一個 "一般權限" 的 Client 來驗證 User Token
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    })

    // 取得目前操作者的 User ID
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !caller) throw new Error('Unauthorized: 請先登入')

    // 建立 Admin Client (用來讀取 RBAC 權限)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 使用 RBAC 權限檢查：檢查是否有 employee.create 或 profile.create 權限
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

    if (!hasEmployeeCreate && !hasProfileCreate) {
      throw new Error('權限不足：您沒有建立員工/帳號的權限')
    }

    if (!email) throw new Error('必須提供 Email')

    console.log(`[Invite] User: ${caller.email} is inviting ${email}`)

    // 發送邀請 (使用 Admin 權限)
    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: name },
        redirectTo: 'https://6owl-door-main-system.vercel.app/update-password'
      }
    )

    if (inviteError) throw inviteError

    // 更新員工資料
    const finalLoginId = login_id || employee_id;
    const targetRole = role || 'user';

    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        employee_id: employee_id,
        login_id: finalLoginId,
        department_id: department_id || null,
        position: position,
        role: targetRole,
        status: 'active',
        phone: phone,
        mobile: mobile
      })
      .eq('user_id', userData.user.id)

    if (updateError) throw updateError

    // 成功回傳
    return new Response(
      JSON.stringify({ message: '邀請成功', user: userData.user }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Function Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
