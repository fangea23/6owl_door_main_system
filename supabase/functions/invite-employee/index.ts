// 檔名：supabase/functions/invite-employee/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 定義 CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// 使用 Deno.serve (新的標準寫法)
Deno.serve(async (req) => {
  // 1. 優先處理 CORS Preflight (OPTIONS 請求)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. 檢查 Request Body 是否為空 (避免 JSON 解析錯誤導致崩潰)
    // 這一點很重要，有時候前端沒傳 body 會導致 req.json() 炸開
    const body = await req.json().catch(() => null)
    
    if (!body) {
       throw new Error('Request body is empty')
    }

    const { email, name, employee_id, department_id, position, role, phone, mobile } = body

    // 建立 Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (!email) throw new Error('必須提供 Email')
    if (!name) throw new Error('必須提供姓名')
    if (!employee_id) throw new Error('必須提供員工編號')

    console.log(`Processing employee creation for: ${email}`)

    // 3. 使用 Admin API 預先創建帳號（方案 A）
    const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      email_confirm: true, // 自動確認信箱，不需要驗證
      user_metadata: {
        full_name: name,
        employee_id: employee_id
      }
    })

    if (createUserError) {
      // 如果是因為 email 已存在，提供更友善的錯誤訊息
      if (createUserError.message.includes('already registered')) {
        throw new Error(`此 Email (${email}) 已被註冊，請使用其他 Email 或聯繫系統管理員`)
      }
      throw createUserError
    }

    console.log(`User account created with ID: ${userData.user.id}`)

    // 4. 創建員工記錄，立即關聯 user_id
    const { error: insertError } = await supabaseAdmin
      .from('employees')
      .insert({
        user_id: userData.user.id,
        employee_id: employee_id,
        name: name,
        email: email,
        department_id: department_id || null,
        position: position,
        role: role || 'user',
        status: 'active',
        phone: phone,
        mobile: mobile
      })

    if (insertError) {
      // 如果員工記錄創建失敗，需要清理已創建的用戶帳號
      console.error('Failed to create employee record, cleaning up user account...')
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
      throw new Error(`建立員工記錄失敗: ${insertError.message}`)
    }

    console.log(`Employee record created for: ${name}`)

    // 5. 發送密碼重設連結，讓員工設定自己的密碼
    const { data: recoveryData, error: recoveryError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: 'https://6owl-door-main-system.vercel.app/update-password'
      }
    })

    if (recoveryError) {
      console.warn('Failed to send password reset email:', recoveryError.message)
      // 不拋出錯誤，因為帳號和員工記錄已經成功創建
      // 管理員可以稍後手動發送重設密碼信
    } else {
      console.log(`Password reset link sent to: ${email}`)
    }

    // 注意：generateLink 返回的 link 需要後端自己發送 Email
    // 如果要自動發送，可以在這裡添加 Email 發送邏輯（例如使用 Resend 或其他服務）

    // 6. 成功回傳 (務必帶上 corsHeaders)
    return new Response(
      JSON.stringify({
        message: '員工帳號建立成功！密碼重設連結已生成',
        user: userData.user,
        employee_id: employee_id,
        recovery_link: recoveryData?.properties?.action_link || null,
        note: '請將密碼重設連結發送給員工，或讓員工使用「忘記密碼」功能'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    // 6. 錯誤處理 (務必帶上 corsHeaders，不然前端會誤判為 CORS 錯誤)
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