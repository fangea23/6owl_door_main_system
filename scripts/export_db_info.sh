#!/bin/bash
# 輸出資料庫關鍵資訊給 Claude 參考

echo "==================================="
echo "資料庫結構概覽"
echo "==================================="

# 1. 查看所有表
echo -e "\n【所有表列表】"
npx supabase db exec <<'SQL'
SELECT
  schemaname || '.' || tablename as full_table_name
FROM pg_tables
WHERE schemaname IN ('public', 'payment_approval', 'eip', 'service')
ORDER BY schemaname, tablename;
SQL

# 2. 查看所有視圖
echo -e "\n【所有視圖列表】"
npx supabase db exec <<'SQL'
SELECT
  schemaname || '.' || viewname as full_view_name
FROM pg_views
WHERE schemaname IN ('public', 'payment_approval', 'eip', 'service')
ORDER BY schemaname, viewname;
SQL

# 3. 品牌資料
echo -e "\n【品牌資料】"
npx supabase db exec <<'SQL'
SELECT id, name, code, created_at
FROM public.brands
ORDER BY id;
SQL

# 4. 員工角色分佈
echo -e "\n【員工角色分佈】"
npx supabase db exec <<'SQL'
SELECT
  role,
  COUNT(*) as count
FROM public.employees
WHERE deleted_at IS NULL
GROUP BY role
ORDER BY count DESC;
SQL

# 5. 會計品牌分配
echo -e "\n【會計品牌分配】"
npx supabase db exec <<'SQL'
SELECT
  e.name as accountant_name,
  e.employee_id,
  b.name as brand_name,
  b.id as brand_id
FROM payment_approval.accountant_brands ab
JOIN public.employees e ON ab.employee_id = e.id
JOIN public.brands b ON ab.brand_id = b.id
ORDER BY e.name, b.id;
SQL

# 6. 付款申請統計
echo -e "\n【付款申請狀態統計】"
npx supabase db exec <<'SQL'
SELECT
  status,
  COUNT(*) as count
FROM payment_approval.payment_requests
GROUP BY status
ORDER BY count DESC;
SQL

# 7. 關鍵表欄位資訊
echo -e "\n【employees 表欄位】"
npx supabase db exec <<'SQL'
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employees'
ORDER BY ordinal_position;
SQL

echo -e "\n【payment_requests 表欄位】"
npx supabase db exec <<'SQL'
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'payment_approval'
  AND table_name = 'payment_requests'
ORDER BY ordinal_position;
SQL

echo -e "\n==================================="
echo "查詢完成！"
echo "==================================="
