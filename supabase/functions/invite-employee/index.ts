// 檔名：supabase/functions/invite-employee/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ✅ 1. 定義允許的角色列表 (加入所有新角色，避免報錯)
const ALLOWED_ROLES = [
  'user', 'staff', 
  'manager', 'unit_manager', 
  'accountant', 'audit_manager', 'cashier', 'boss', 
  'hr', 'admin'
];

Deno.serve(async (req) => {
  // 處理 CORS Preflight
  console.log("=== 這是我剛部署的新版本 v2 ===")
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
    // ✅ 2. 安全性檢查：驗證呼叫者權限
    // ==========================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        throw new Error('Missing Authorization header')
    }

    // 建立一個 "一般權限" 的 Client 來驗證 User Token (確認是誰在呼叫)
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } }
    })

    // 取得目前操作者的 User ID
    const { data: { user: caller }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !caller) throw new Error('Unauthorized: 請先登入')

    // 建立 "超級管理員" Client (用來讀取資料庫與執行邀請)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey)

    // 查詢操作者在 employees 表格中的角色
    const { data: callerEmployee } = await supabaseAdmin
        .from('employees')
        .select('role')
        .eq('user_id', caller.id)
        .single()

    const callerRole = callerEmployee?.role;

    // 權限判斷：只有 'admin' 或 'hr' 可以執行邀請
    // 如果你是用 admin 帳號測試，這行會讓你通過
    if (callerRole !== 'admin' && callerRole !== 'hr') {
        throw new Error('權限不足：只有 系統管理員(Admin) 或 人資(HR) 可以執行此操作')
    }

    // ==========================================
    // ✅ 3. 驗證欲設定的角色是否合法
    // ==========================================
    const targetRole = role || 'user';
    if (!ALLOWED_ROLES.includes(targetRole)) {
        throw new Error(`無效的角色類型: ${targetRole}`)
    }

    if (!email) throw new Error('必須提供 Email')

    console.log(`[Invite] User: ${caller.email} is inviting ${email} as ${targetRole}`)

    // 4. 發送邀請 (使用 Admin 權限)
    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: name },
        // ✅ 保留你的 Redirect URL
        redirectTo: 'https://6owl-door-main-system.vercel.app/update-password' 
      }
    )

    if (inviteError) throw inviteError

    // 5. 更新員工資料 (寫入新角色)
    // login_id 用於登入帳號（設定後不可修改），若未提供則使用 employee_id
    const finalLoginId = login_id || employee_id;

    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        employee_id: employee_id,
        login_id: finalLoginId, // 登入帳號（設定後不可修改）
        department_id: department_id || null,
        position: position,
        role: targetRole, // 這裡寫入正確的角色 (如 accountant)
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