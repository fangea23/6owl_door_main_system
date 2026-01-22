-- 修復：accountant_brands 表的 schema 問題
--
-- 問題：
-- 多個 view 和查詢使用了 payment_approval.accountant_brands
-- 但這個表實際上在 public schema 中
-- 導致查詢失敗：relation "payment_approval.accountant_brands" does not exist
--
-- 解決方案：
-- 重建所有使用到 accountant_brands 的 view，使用正確的 schema

-- 1. 刪除舊的 views
DROP VIEW IF EXISTS payment_approval.accountant_pending_requests_view CASCADE;
DROP VIEW IF EXISTS payment_approval.accountant_all_requests_view CASCADE;

-- 2. 重建 accountant_pending_requests_view（待簽核申請）
CREATE OR REPLACE VIEW payment_approval.accountant_pending_requests_view AS
SELECT DISTINCT
  pr.*,
  -- 會計負責人資訊（從 accountant_brands JOIN 查詢）
  e.user_id as accountant_user_id,
  emp.name as accountant_name,
  emp.email as accountant_email
FROM payment_approval.payment_requests pr
  JOIN public.brands b ON (pr.brand = b.name)
  JOIN public.accountant_brands ab ON (b.id = ab.brand_id)  -- ✅ 修正：改為 public schema
  JOIN public.employees e ON (ab.employee_id = e.id)
  LEFT JOIN public.employees emp ON (e.id = emp.id)
WHERE pr.status IN ('pending', 'approved_by_supervisor')  -- 只顯示待會計簽核的
  AND e.user_id IS NOT NULL;

-- 3. 重建 accountant_all_requests_view（所有申請）
CREATE OR REPLACE VIEW payment_approval.accountant_all_requests_view AS
SELECT DISTINCT
  pr.*,
  e.user_id as accountant_user_id,
  emp.name as accountant_name,
  emp.email as accountant_email
FROM payment_approval.payment_requests pr
  JOIN public.brands b ON (pr.brand = b.name)
  JOIN public.accountant_brands ab ON (b.id = ab.brand_id)  -- ✅ 修正：改為 public schema
  JOIN public.employees e ON (ab.employee_id = e.id)
  LEFT JOIN public.employees emp ON (e.id = emp.id)
WHERE e.user_id IS NOT NULL;

-- 4. 授予權限
GRANT SELECT ON payment_approval.accountant_pending_requests_view TO authenticated;
GRANT SELECT ON payment_approval.accountant_all_requests_view TO authenticated;

-- 說明：
-- accountant_brands 表記錄哪些會計負責哪些品牌
-- 這個表在 public schema 中，不在 payment_approval schema
-- 所有相關的 view 都需要使用正確的 schema 引用
