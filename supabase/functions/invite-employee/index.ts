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

    console.log(`Processing invite for: ${email}`)

    // 3. 發送邀請
    const { data: userData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name: name },
        // 請確保這個網址是正確的 (前端路由要有這一頁)
        redirect_to: 'https://6owl-door-main-system.vercel.app/update-password' 
      }
    )

    if (inviteError) throw inviteError

    // 4. 更新員工資料
    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({
        employee_id: employee_id,
        department_id: department_id || null,
        position: position,
        role: role || 'user',
        status: 'active',
        phone: phone,
        mobile: mobile
      })
      .eq('user_id', userData.user.id)

    if (updateError) throw updateError

    // 5. 成功回傳 (務必帶上 corsHeaders)
    return new Response(
      JSON.stringify({ message: '邀請成功', user: userData.user }),
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