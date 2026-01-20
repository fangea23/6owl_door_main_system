-- ============================================
-- 付款簽核通知系統
-- 根據狀態變更自動通知負責的角色
-- ============================================

-- 1. 創建通知發送函數（通用）
CREATE OR REPLACE FUNCTION send_notification_to_users(
  p_user_ids UUID[],
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'approval'
)
RETURNS void AS $$
BEGIN
  -- 批量插入通知
  INSERT INTO public.notifications (user_id, title, message, type)
  SELECT
    unnest(p_user_ids),
    p_title,
    p_message,
    p_type;
END;
$$ LANGUAGE plpgsql;

-- 2. 創建付款申請狀態變更通知函數
CREATE OR REPLACE FUNCTION notify_payment_approval_change()
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
        JOIN payment_approval.accountant_brands ab ON e.id = ab.employee_id
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

    -- === 待出納撥款 ===
    WHEN 'pending_cashier' THEN
      v_title := '新的付款申請待撥款';
      v_message := NEW.creator_name || ' 的付款申請（' || NEW.payee_name || '）已完成審核，請準備撥款，金額：' || v_amount;

      SELECT ARRAY_AGG(DISTINCT e.user_id)
      INTO v_user_ids
      FROM public.employees e
      WHERE e.role = 'cashier'
        AND e.user_id IS NOT NULL
        AND e.status = 'active'
        AND e.deleted_at IS NULL;

    -- === 待放行決行 ===
    WHEN 'pending_boss' THEN
      v_title := '新的付款申請待決行';
      v_message := NEW.creator_name || ' 的付款申請（' || NEW.payee_name || '）已完成所有審核，請放行，金額：' || v_amount;

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
      v_message := '您的付款申請（' || NEW.payee_name || '）已完成所有簽核流程，金額：' || v_amount;

      -- 通知申請人
      IF NEW.applicant_id IS NOT NULL THEN
        v_user_ids := ARRAY[NEW.applicant_id];
      END IF;

    -- === 已駁回 ===
    WHEN 'rejected' THEN
      v_title := '❌ 付款申請已駁回';
      v_message := '您的付款申請（' || NEW.payee_name || '）已被駁回。' ||
                   CASE WHEN NEW.rejection_reason IS NOT NULL
                        THEN E'\n駁回原因：' || NEW.rejection_reason
                        ELSE ''
                   END;

      -- 通知申請人
      IF NEW.applicant_id IS NOT NULL THEN
        v_user_ids := ARRAY[NEW.applicant_id];
      END IF;

    ELSE
      -- 其他狀態不發送通知
      RETURN NEW;
  END CASE;

  -- 發送通知（如果有目標用戶）
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    PERFORM send_notification_to_users(v_user_ids, v_title, v_message, 'approval');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 綁定觸發器到 payment_requests 表
DROP TRIGGER IF EXISTS trigger_notify_payment_approval_change ON payment_approval.payment_requests;

CREATE TRIGGER trigger_notify_payment_approval_change
AFTER INSERT OR UPDATE OF status
ON payment_approval.payment_requests
FOR EACH ROW
EXECUTE FUNCTION notify_payment_approval_change();

-- 4. 添加註解
COMMENT ON FUNCTION notify_payment_approval_change() IS
'付款申請狀態變更通知：當申請狀態改變時，自動通知下一個負責處理的角色。會計通知會根據品牌分配過濾。';

COMMENT ON FUNCTION send_notification_to_users(UUID[], TEXT, TEXT, TEXT) IS
'通用通知發送函數：批量發送通知給多個用戶';

-- ============================================
-- 測試查詢（可選）
-- ============================================
-- 查看某個品牌的會計
-- SELECT e.name, e.email, e.role
-- FROM employees e
-- JOIN accountant_brands ab ON e.id = ab.employee_id
-- JOIN brands b ON ab.brand_id = b.id
-- WHERE b.name = '六扇門' AND e.user_id IS NOT NULL;

-- 查看某個角色的所有員工
-- SELECT name, email, role, status
-- FROM employees
-- WHERE role = 'accountant' AND user_id IS NOT NULL AND status = 'active';
