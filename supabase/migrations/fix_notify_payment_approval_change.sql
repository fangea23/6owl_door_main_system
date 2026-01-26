-- 修復：public.notify_payment_approval_change() 函數中的 accountant_brands schema 引用錯誤
--
-- 問題：
-- public.notify_payment_approval_change() 在 line 73 使用 payment_approval.accountant_brands
-- 但表實際位於 public.accountant_brands
--
-- 解決方案：
-- 重建此函數，使用正確的 public.accountant_brands

CREATE OR REPLACE FUNCTION public.notify_payment_approval_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_ids UUID[];
  v_title TEXT;
  v_message TEXT;
  v_amount TEXT;
  v_brand_id BIGINT;
BEGIN
  -- 只在狀態改變時觸發
  IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  -- 格式化金額
  v_amount := '$ ' || COALESCE(ROUND(NEW.amount), ROUND(NEW.total_amount), 0)::TEXT;

  -- 根據新狀態決定通知對象
  CASE NEW.status

    -- === 待主管簽核 ===
    WHEN 'pending_unit_manager' THEN
      v_title := '新的付款申請待簽核';
      v_message := NEW.creator_name || ' 提交了付款申請（' || NEW.payee_name || '），金額：' || v_amount;

      -- 通知所有單位主管（可以優化為只通知申請人的直屬主管）
      SELECT ARRAY_AGG(DISTINCT e.user_id)
      INTO v_user_ids
      FROM public.employees e
      WHERE e.role IN ('unit_manager', 'manager')
        AND e.user_id IS NOT NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL;

    -- === 待會計審核 ===
    WHEN 'pending_accountant' THEN
      v_title := '新的付款申請待審核';
      v_message := NEW.creator_name || ' 提交了付款申請（' || NEW.brand || ' - ' || NEW.payee_name || '），金額：' || v_amount;

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

      SELECT ARRAY_AGG(DISTINCT e.user_id)
      INTO v_user_ids
      FROM public.employees e
      WHERE e.role = 'cashier'
        AND e.user_id IS NOT NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL;

    -- === 待老闆放行 ===
    WHEN 'pending_boss' THEN
      v_title := '新的付款申請待放行';
      v_message := NEW.creator_name || ' 的付款申請（' || NEW.payee_name || '）已完成出納作業，金額：' || v_amount;

      SELECT ARRAY_AGG(DISTINCT e.user_id)
      INTO v_user_ids
      FROM public.employees e
      WHERE e.role = 'boss'
        AND e.user_id IS NOT NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL;

    -- === 已完成 ===
    WHEN 'completed' THEN
      v_title := '✅ 付款申請已完成';
      v_message := '您的付款申請（' || NEW.payee_name || '）已完成所有審核流程，金額：' || v_amount;

      -- 通知申請人
      v_user_ids := ARRAY[NEW.applicant_id];

    -- === 已拒絕 ===
    WHEN 'rejected' THEN
      v_title := '❌ 付款申請已被拒絕';
      v_message := '您的付款申請（' || NEW.payee_name || '）已被拒絕';

      -- 通知申請人
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

-- 添加註解
COMMENT ON FUNCTION public.notify_payment_approval_change() IS
'付款申請狀態變更通知：當申請狀態改變時，自動通知下一個負責處理的角色。會計通知會根據品牌分配過濾。';

-- ============================================================================
-- 說明
-- ============================================================================
--
-- 此 migration 修正了 public.notify_payment_approval_change() function
-- 將 line 73 從 payment_approval.accountant_brands 改為 public.accountant_brands
--
-- 這解決了提交付款申請時資料庫報錯的問題
--
