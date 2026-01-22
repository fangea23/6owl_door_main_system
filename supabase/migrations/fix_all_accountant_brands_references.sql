-- 修復：所有資料庫物件中的 accountant_brands schema 引用錯誤
--
-- 問題：
-- 多個 database functions, views, policies 仍然引用 payment_approval.accountant_brands
-- 但表實際位於 public.accountant_brands
-- 導致提交付款申請時觸發 notification function 報錯
--
-- 解決方案：
-- 重建所有相關的 database objects，使用正確的 public.accountant_brands

-- ============================================================================
-- 1. 修正 notification function (最關鍵 - 這是提交時報錯的根源)
-- ============================================================================

CREATE OR REPLACE FUNCTION payment_approval.notify_approval_step()
RETURNS TRIGGER AS $$
DECLARE
  v_user_ids UUID[];
  v_title TEXT;
  v_message TEXT;
  v_amount TEXT;
  v_brand_id BIGINT;
BEGIN
  -- 格式化金額
  v_amount := TO_CHAR(NEW.amount, 'FM999,999,999');

  -- 根據當前狀態決定通知對象
  CASE NEW.status
    -- === 待單位主管 ===
    WHEN 'pending_unit_manager' THEN
      v_title := '新的付款申請待審核';
      v_message := NEW.creator_name || ' 提交了一筆付款申請（' || NEW.payee_name || '），金額：' || v_amount;

      -- 通知單位主管
      SELECT ARRAY_AGG(DISTINCT e.user_id)
      INTO v_user_ids
      FROM public.employees e
      WHERE e.role = 'unit_manager'
        AND e.user_id IS NOT NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL;

    -- === 待會計 ===
    WHEN 'pending_accountant' THEN
      v_title := '新的付款申請待審核';
      v_message := NEW.creator_name || ' 的付款申請（' || NEW.payee_name || '）已通過單位主管審核，金額：' || v_amount;

      -- 通知負責該品牌的所有會計
      -- 先找出品牌 ID
      SELECT id INTO v_brand_id FROM public.brands WHERE name = NEW.brand LIMIT 1;

      IF v_brand_id IS NOT NULL THEN
        SELECT ARRAY_AGG(DISTINCT e.user_id)
        INTO v_user_ids
        FROM public.employees e
        JOIN public.accountant_brands ab ON e.id = ab.employee_id  -- ✅ 修正：使用 public schema
        WHERE ab.brand_id = v_brand_id
          AND e.user_id IS NOT NULL
          AND e.status = 'active'
          AND e.deleted_at IS NULL;
      END IF;

    -- === 待審核主管 ===
    WHEN 'pending_audit_manager' THEN
      v_title := '新的付款申請待審核';
      v_message := NEW.creator_name || ' 的付款申請（' || NEW.payee_name || '）已通過會計審核，金額：' || v_amount;

      -- 通知審核主管
      SELECT ARRAY_AGG(DISTINCT e.user_id)
      INTO v_user_ids
      FROM public.employees e
      WHERE e.role = 'audit_manager'
        AND e.user_id IS NOT NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL;

    -- === 待出納 ===
    WHEN 'pending_cashier' THEN
      v_title := '新的付款申請待處理';
      v_message := NEW.creator_name || ' 的付款申請（' || NEW.payee_name || '）已通過審核主管核准，金額：' || v_amount;

      -- 通知出納
      SELECT ARRAY_AGG(DISTINCT e.user_id)
      INTO v_user_ids
      FROM public.employees e
      WHERE e.role = 'cashier'
        AND e.user_id IS NOT NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL;

    -- === 待放行主管 ===
    WHEN 'pending_boss' THEN
      v_title := '新的付款申請待放行';
      v_message := NEW.creator_name || ' 的付款申請（' || NEW.payee_name || '）已完成出納作業，金額：' || v_amount;

      -- 通知放行主管
      SELECT ARRAY_AGG(DISTINCT e.user_id)
      INTO v_user_ids
      FROM public.employees e
      WHERE e.role = 'boss'
        AND e.user_id IS NOT NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL;

    -- === 已完成 ===
    WHEN 'completed' THEN
      v_title := '您的付款申請已完成';
      v_message := '您提交的付款申請（' || NEW.payee_name || '）已完成所有審核流程，金額：' || v_amount;

      -- 只通知申請人
      v_user_ids := ARRAY[NEW.applicant_id];

    -- === 已拒絕 ===
    WHEN 'rejected' THEN
      v_title := '您的付款申請已被拒絕';
      v_message := '您提交的付款申請（' || NEW.payee_name || '）已被拒絕';

      -- 只通知申請人
      v_user_ids := ARRAY[NEW.applicant_id];

    ELSE
      -- 其他狀態不發通知
      RETURN NEW;
  END CASE;

  -- 如果有需要通知的用戶，發送通知
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    PERFORM send_notification_to_users(v_user_ids, v_title, v_message, 'approval');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. 重建 accountant pending requests view
-- ============================================================================

DROP VIEW IF EXISTS payment_approval.accountant_pending_requests_view CASCADE;

CREATE OR REPLACE VIEW payment_approval.accountant_pending_requests_view AS
SELECT DISTINCT
  pr.*,
  e.user_id as accountant_user_id,
  emp.name as accountant_name,
  emp.email as accountant_email
FROM payment_approval.payment_requests pr
  JOIN public.brands b ON (pr.brand = b.name)
  JOIN public.accountant_brands ab ON (b.id = ab.brand_id)  -- ✅ 修正：使用 public schema
  JOIN public.employees e ON (ab.employee_id = e.id)
  LEFT JOIN public.employees emp ON (e.id = emp.id)
WHERE pr.status = 'pending_accountant'
  AND pr.current_step = 2
  AND e.user_id IS NOT NULL;

GRANT SELECT ON payment_approval.accountant_pending_requests_view TO authenticated;

-- ============================================================================
-- 3. 重建 accountant all requests view
-- ============================================================================

DROP VIEW IF EXISTS payment_approval.accountant_all_requests_view CASCADE;

CREATE OR REPLACE VIEW payment_approval.accountant_all_requests_view AS
SELECT DISTINCT
  pr.*,
  e.user_id as accountant_user_id,
  emp.name as accountant_name,
  emp.email as accountant_email
FROM payment_approval.payment_requests pr
  JOIN public.brands b ON (pr.brand = b.name)
  JOIN public.accountant_brands ab ON (b.id = ab.brand_id)  -- ✅ 修正：使用 public schema
  JOIN public.employees e ON (ab.employee_id = e.id)
  LEFT JOIN public.employees emp ON (e.id = emp.id)
WHERE e.user_id IS NOT NULL;

GRANT SELECT ON payment_approval.accountant_all_requests_view TO authenticated;

-- ============================================================================
-- 說明
-- ============================================================================
--
-- 此 migration 修正了以下 database objects：
-- 1. payment_approval.notify_approval_step() - notification trigger function
-- 2. payment_approval.accountant_pending_requests_view - 會計待簽核 view
-- 3. payment_approval.accountant_all_requests_view - 會計所有申請 view
--
-- 所有引用都已從 payment_approval.accountant_brands 改為 public.accountant_brands
-- 這解決了提交付款申請時 trigger function 報錯的問題
--
