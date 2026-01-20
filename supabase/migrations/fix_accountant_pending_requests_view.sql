-- 修復 accountant_pending_requests 視圖
-- 問題：視圖輸出 employee_id，但前端需要 user_id 來過濾

-- 1. 刪除舊視圖
DROP VIEW IF EXISTS payment_approval.accountant_pending_requests;

-- 2. 重新創建視圖，輸出 user_id 而非 employee_id
CREATE VIEW payment_approval.accountant_pending_requests AS
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
  -- 修復：輸出 user_id 而不是 employee_id
  e.user_id AS accountant_id,        -- 改為 user_id，欄位名稱改為 accountant_id
  e.id AS accountant_employee_id,    -- 保留 employee_id 作為參考
  e.name AS accountant_name
FROM payment_approval.payment_requests pr
  JOIN public.brands b ON (pr.brand = b.name)
  JOIN payment_approval.accountant_brands ab ON (b.id = ab.brand_id)
  JOIN public.employees e ON (ab.employee_id = e.id)
WHERE pr.status = 'pending_accountant'
  AND pr.current_step = 2
  AND e.user_id IS NOT NULL;  -- 確保 employee 有關聯到 user account

-- 3. 添加註解
COMMENT ON VIEW payment_approval.accountant_pending_requests IS
'會計待簽核申請視圖：根據 accountant_brands 關聯表，過濾出各會計負責品牌的待簽核案件。使用 accountant_id (user_id) 欄位進行過濾。';
