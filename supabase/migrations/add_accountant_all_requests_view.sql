-- 創建新視圖：會計所有申請（包含所有狀態）
-- 用途：讓會計在「歷史紀錄」模式下也只能看到自己負責品牌的申請

CREATE OR REPLACE VIEW payment_approval.accountant_all_requests AS
SELECT
  pr.id,
  pr.brand,
  pr.store,
  pr.payment_date,
  pr.payee_name,
  pr.content,
  pr.tax_type,
  pr.amount,
  pr.payment_method,
  pr.payment_method_other,
  pr.handling_fee,
  pr.bank_name,
  pr.bank_code,
  pr.bank_branch,
  pr.branch_code,
  pr.account_number,
  pr.has_attachment,
  pr.attachment_desc,
  pr.has_invoice,
  pr.invoice_date,
  pr.remarks,
  pr.creator_name,
  pr.apply_date,
  pr.status,
  pr.created_at,
  pr.current_step,
  pr.rejection_reason,
  pr.sign_manager_url,
  pr.sign_manager_at,
  pr.sign_manager_by,
  pr.sign_accountant_url,
  pr.sign_accountant_at,
  pr.sign_accountant_by,
  pr.sign_audit_url,
  pr.sign_audit_at,
  pr.sign_audit_by,
  pr.sign_cashier_url,
  pr.sign_cashier_at,
  pr.sign_cashier_by,
  pr.sign_boss_url,
  pr.sign_boss_at,
  pr.sign_boss_by,
  pr.signature_url,
  pr.attachments,
  pr.is_paper_received,
  pr.applicant_id,
  pr.invoice_number,
  pr.has_voucher,
  pr.voucher_number,
  pr.is_multi_store,
  pr.total_amount,
  pr.item_count,
  -- 會計識別欄位
  e.user_id AS accountant_id,
  e.id AS accountant_employee_id,
  e.name AS accountant_name
FROM payment_approval.payment_requests pr
  JOIN public.brands b ON (pr.brand = b.name)
  JOIN payment_approval.accountant_brands ab ON (b.id = ab.brand_id)
  JOIN public.employees e ON (ab.employee_id = e.id)
WHERE e.user_id IS NOT NULL;  -- 確保 employee 有關聯到 user account

-- 添加註解
COMMENT ON VIEW payment_approval.accountant_all_requests IS
'會計所有申請視圖（包含所有狀態）：根據 accountant_brands 關聯表，過濾出各會計負責品牌的所有申請，不限制狀態。用於歷史紀錄查詢。';
