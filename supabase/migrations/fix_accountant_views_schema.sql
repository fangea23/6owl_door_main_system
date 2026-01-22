-- 修復：會計相關 view 使用錯誤的 accountant_brands schema
--
-- 問題：
-- schema.sql 中的 view 使用 public.accountant_brands
-- 但表實際在 payment_approval.accountant_brands
-- 導致查詢失敗
--
-- 解決方案：
-- 重建所有會計相關的 view，使用正確的 schema

-- 1. 刪除舊的 views
DROP VIEW IF EXISTS payment_approval.accountant_pending_requests_view CASCADE;
DROP VIEW IF EXISTS payment_approval.accountant_all_requests_view CASCADE;

-- 2. 重建 accountant_pending_requests_view（會計待簽核申請）
CREATE OR REPLACE VIEW payment_approval.accountant_pending_requests_view AS
SELECT DISTINCT
  pr.*,
  e.user_id as accountant_user_id,
  emp.name as accountant_name,
  emp.email as accountant_email
FROM payment_approval.payment_requests pr
  JOIN public.brands b ON (pr.brand = b.name)
  JOIN payment_approval.accountant_brands ab ON (b.id = ab.brand_id)  -- ✅ 使用 payment_approval schema
  JOIN public.employees e ON (ab.employee_id = e.id)
  LEFT JOIN public.employees emp ON (e.id = emp.id)
WHERE pr.status = 'pending_accountant'
  AND pr.current_step = 2
  AND e.user_id IS NOT NULL;

-- 3. 重建 accountant_all_requests_view（會計所有申請）
CREATE OR REPLACE VIEW payment_approval.accountant_all_requests_view AS
SELECT DISTINCT
  pr.*,
  e.user_id as accountant_user_id,
  emp.name as accountant_name,
  emp.email as accountant_email
FROM payment_approval.payment_requests pr
  JOIN public.brands b ON (pr.brand = b.name)
  JOIN payment_approval.accountant_brands ab ON (b.id = ab.brand_id)  -- ✅ 使用 payment_approval schema
  JOIN public.employees e ON (ab.employee_id = e.id)
  LEFT JOIN public.employees emp ON (e.id = emp.id)
WHERE e.user_id IS NOT NULL;

-- 4. 授予權限
GRANT SELECT ON payment_approval.accountant_pending_requests_view TO authenticated;
GRANT SELECT ON payment_approval.accountant_all_requests_view TO authenticated;

-- 說明：
-- accountant_brands 表在 payment_approval schema
-- 所有引用都必須使用 payment_approval.accountant_brands
-- 這個修復確保 view 定義與實際表結構一致
