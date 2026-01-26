-- =====================================================
-- 建立員工代墊款系統的 View
-- 解決跨 schema 查詢問題
-- =====================================================

-- 建立申請單詳細資料的 view
CREATE OR REPLACE VIEW public.expense_requests_with_details AS
SELECT
  r.*,
  e.name as applicant_name,
  e.employee_id as applicant_employee_id,
  d.name as department_name,
  d.code as department_code
FROM public.expense_reimbursement_requests r
LEFT JOIN public.employees e ON r.applicant_id = e.user_id
LEFT JOIN public.departments d ON r.department_id = d.id
WHERE r.deleted_at IS NULL;

-- 授權
GRANT SELECT ON public.expense_requests_with_details TO authenticated;

-- 註解
COMMENT ON VIEW public.expense_requests_with_details IS '員工代墊款申請單詳細資料（包含申請人與部門資訊）';
