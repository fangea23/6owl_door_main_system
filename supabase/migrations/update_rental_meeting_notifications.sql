-- ============================================
-- 租車/會議室預約通知系統（更新版）
-- 根據實際資料庫結構調整
-- ============================================

-- ============================================================================
-- 1. 租車系統通知函數
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_rental_request_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_ids UUID[];
  v_title TEXT;
  v_message TEXT;
  v_date_range TEXT;
  v_requester_name TEXT;
  v_vehicle_info TEXT;
BEGIN
  -- 格式化日期範圍
  v_date_range := to_char(NEW.start_date, 'YYYY-MM-DD') || ' 至 ' || to_char(NEW.end_date, 'YYYY-MM-DD');

  -- 取得申請人姓名
  SELECT name INTO v_requester_name
  FROM public.employees
  WHERE id = NEW.requester_id;

  -- 取得車輛資訊（如果有指定）
  IF NEW.vehicle_id IS NOT NULL THEN
    SELECT brand || ' ' || model || ' (' || plate_number || ')'
    INTO v_vehicle_info
    FROM car_rental.vehicles
    WHERE id = NEW.vehicle_id;
  ELSE
    v_vehicle_info := '未指定車輛';
  END IF;

  -- 根據操作類型和狀態發送通知
  IF TG_OP = 'INSERT' THEN
    -- === 新增租車申請 ===
    v_title := '新的租車申請';
    v_message := v_requester_name || ' 提交了租車申請' ||
                 E'\n車輛：' || v_vehicle_info ||
                 E'\n用車期間：' || v_date_range ||
                 CASE WHEN NEW.purpose IS NOT NULL
                      THEN E'\n用途：' || NEW.purpose
                      ELSE ''
                 END;

    -- 通知管理員和 HR（有權審核的角色）
    SELECT ARRAY_AGG(DISTINCT e.user_id)
    INTO v_user_ids
    FROM public.employees e
    WHERE e.role IN ('admin', 'hr')
      AND e.user_id IS NOT NULL
      AND e.status = 'active'
      AND e.deleted_at IS NULL;

  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- === 狀態變更 ===
    CASE NEW.status
      WHEN 'approved' THEN
        v_title := '✅ 租車申請已核准';
        v_message := '您的租車申請已核准' ||
                     E'\n車輛：' || v_vehicle_info ||
                     E'\n用車期間：' || v_date_range ||
                     CASE WHEN NEW.review_comment IS NOT NULL
                          THEN E'\n審核意見：' || NEW.review_comment
                          ELSE ''
                     END;

        -- 通知申請人
        SELECT ARRAY_AGG(DISTINCT e.user_id)
        INTO v_user_ids
        FROM public.employees e
        WHERE e.id = NEW.requester_id
          AND e.user_id IS NOT NULL;

      WHEN 'rejected' THEN
        v_title := '❌ 租車申請已拒絕';
        v_message := '您的租車申請已被拒絕' ||
                     E'\n預約期間：' || v_date_range ||
                     CASE WHEN NEW.review_comment IS NOT NULL
                          THEN E'\n原因：' || NEW.review_comment
                          ELSE ''
                     END;

        -- 通知申請人
        SELECT ARRAY_AGG(DISTINCT e.user_id)
        INTO v_user_ids
        FROM public.employees e
        WHERE e.id = NEW.requester_id
          AND e.user_id IS NOT NULL;

      WHEN 'cancelled' THEN
        v_title := '租車申請已取消';
        v_message := '租車申請已取消' ||
                     E'\n原預約期間：' || v_date_range;

        -- 取消時通知管理員
        SELECT ARRAY_AGG(DISTINCT e.user_id)
        INTO v_user_ids
        FROM public.employees e
        WHERE e.role IN ('admin', 'hr')
          AND e.user_id IS NOT NULL
          AND e.status = 'active'
          AND e.deleted_at IS NULL;
    END CASE;
  END IF;

  -- 發送通知
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    PERFORM send_notification_to_users(v_user_ids, v_title, v_message, 'system');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. 會議室預約通知函數
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_meeting_booking_change()
RETURNS TRIGGER AS $$
DECLARE
  v_user_ids UUID[];
  v_title TEXT;
  v_message TEXT;
  v_booking_datetime TEXT;
  v_room_name TEXT;
BEGIN
  -- 格式化預約時間
  v_booking_datetime := to_char(NEW.booking_date, 'YYYY-MM-DD') ||
                        ' ' || to_char(NEW.start_time, 'HH24:MI') ||
                        ' - ' || to_char(NEW.end_time, 'HH24:MI');

  -- 取得會議室名稱
  IF NEW.room_id IS NOT NULL THEN
    SELECT name INTO v_room_name
    FROM meeting_system.rooms
    WHERE id = NEW.room_id;
  ELSE
    v_room_name := '未指定';
  END IF;

  -- 根據操作類型發送通知
  IF TG_OP = 'INSERT' THEN
    -- === 新增會議室預約 ===
    v_title := '會議室預約確認';
    v_message := '預約人：' || NEW.booker_name ||
                 E'\n會議室：' || v_room_name ||
                 E'\n時間：' || v_booking_datetime ||
                 CASE WHEN NEW.title IS NOT NULL
                      THEN E'\n會議主題：' || NEW.title
                      ELSE ''
                 END;

    -- 通知預約人（如果有 user_id）
    IF NEW.user_id IS NOT NULL THEN
      v_user_ids := ARRAY[NEW.user_id];
    END IF;

  ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    -- === 預約狀態變更 ===
    CASE NEW.status
      WHEN 'confirmed' THEN
        v_title := '✅ 會議室預約已確認';
        v_message := '您的會議室預約已確認' ||
                     E'\n會議室：' || v_room_name ||
                     E'\n時間：' || v_booking_datetime ||
                     CASE WHEN NEW.title IS NOT NULL
                          THEN E'\n會議主題：' || NEW.title
                          ELSE ''
                     END;

      WHEN 'rejected' THEN
        v_title := '❌ 會議室預約已拒絕';
        v_message := '您的會議室預約已被拒絕' ||
                     E'\n會議室：' || v_room_name ||
                     E'\n時間：' || v_booking_datetime;

      WHEN 'cancelled' THEN
        v_title := '會議室預約已取消';
        v_message := '會議室預約已取消' ||
                     E'\n會議室：' || v_room_name ||
                     E'\n時間：' || v_booking_datetime;
    END CASE;

    -- 通知預約人
    IF NEW.user_id IS NOT NULL THEN
      v_user_ids := ARRAY[NEW.user_id];
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- === 預約被刪除 ===
    v_title := '會議室預約已取消';
    v_booking_datetime := to_char(OLD.booking_date, 'YYYY-MM-DD') ||
                          ' ' || to_char(OLD.start_time, 'HH24:MI') ||
                          ' - ' || to_char(OLD.end_time, 'HH24:MI');

    SELECT name INTO v_room_name
    FROM meeting_system.rooms
    WHERE id = OLD.room_id;

    v_message := '您的會議室預約已被取消' ||
                 E'\n會議室：' || COALESCE(v_room_name, '未指定') ||
                 E'\n原預約時間：' || v_booking_datetime;

    -- 通知預約人
    IF OLD.user_id IS NOT NULL THEN
      v_user_ids := ARRAY[OLD.user_id];
    END IF;
  END IF;

  -- 發送通知
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    PERFORM send_notification_to_users(v_user_ids, v_title, v_message, 'system');
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. 會議提醒通知函數（提前 15 分鐘）
-- ============================================================================
CREATE OR REPLACE FUNCTION notify_upcoming_meetings()
RETURNS void AS $$
DECLARE
  v_booking RECORD;
  v_meeting_start TIMESTAMP;
  v_room_name TEXT;
BEGIN
  -- 找出 15 分鐘後即將開始的會議
  FOR v_booking IN
    SELECT *
    FROM meeting_system.bookings
    WHERE status IN ('confirmed', 'pending')
      AND booking_date = CURRENT_DATE
      AND (booking_date + start_time) > NOW()
      AND (booking_date + start_time) <= NOW() + INTERVAL '15 minutes'
      -- 避免重複通知（可選：添加 notified_at 欄位）
  LOOP
    -- 取得會議室名稱
    SELECT name INTO v_room_name
    FROM meeting_system.rooms
    WHERE id = v_booking.room_id;

    v_meeting_start := v_booking.booking_date + v_booking.start_time;

    -- 通知預約人
    IF v_booking.user_id IS NOT NULL THEN
      PERFORM send_notification_to_users(
        ARRAY[v_booking.user_id],
        '⏰ 會議即將開始',
        '您預約的會議即將在 15 分鐘後開始' ||
        E'\n會議室：' || COALESCE(v_room_name, '未指定') ||
        E'\n時間：' || to_char(v_meeting_start, 'HH24:MI') ||
        CASE WHEN v_booking.title IS NOT NULL
             THEN E'\n會議主題：' || v_booking.title
             ELSE ''
        END,
        'alert'
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. 綁定觸發器
-- ============================================================================

-- 租車系統觸發器
DROP TRIGGER IF EXISTS trigger_notify_rental_request_change ON car_rental.rental_requests;
CREATE TRIGGER trigger_notify_rental_request_change
AFTER INSERT OR UPDATE OF status
ON car_rental.rental_requests
FOR EACH ROW
EXECUTE FUNCTION notify_rental_request_change();

-- 會議室系統觸發器
DROP TRIGGER IF EXISTS trigger_notify_meeting_booking_change ON meeting_system.bookings;
CREATE TRIGGER trigger_notify_meeting_booking_change
AFTER INSERT OR UPDATE OF status OR DELETE
ON meeting_system.bookings
FOR EACH ROW
EXECUTE FUNCTION notify_meeting_booking_change();

-- ============================================================================
-- 5. 添加註解
-- ============================================================================
COMMENT ON FUNCTION notify_rental_request_change() IS
'租車申請通知：當申請創建或狀態改變時，自動通知相關人員（管理員或申請人）';

COMMENT ON FUNCTION notify_meeting_booking_change() IS
'會議室預約通知：當預約創建、狀態改變或被刪除時，自動通知預約人';

COMMENT ON FUNCTION notify_upcoming_meetings() IS
'會議提醒：提前 15 分鐘提醒預約人。需要配合排程器定期執行（每 5 分鐘）';

-- ============================================================================
-- 排程任務（需要 pg_cron 或外部排程）
-- ============================================================================
-- 如果安裝了 pg_cron，可以執行以下 SQL：
-- SELECT cron.schedule(
--   'notify-upcoming-meetings',
--   '*/5 * * * *',
--   $$ SELECT notify_upcoming_meetings(); $$
-- );

-- ============================================================================
-- 測試查詢（可選）
-- ============================================================================
-- 查看租車管理員
-- SELECT name, email, role
-- FROM employees
-- WHERE role IN ('admin', 'hr') AND user_id IS NOT NULL AND status = 'active';

-- 查看最近的租車申請
-- SELECT rr.*, e.name as requester_name, v.plate_number
-- FROM car_rental.rental_requests rr
-- JOIN employees e ON rr.requester_id = e.id
-- LEFT JOIN car_rental.vehicles v ON rr.vehicle_id = v.id
-- ORDER BY rr.created_at DESC
-- LIMIT 10;

-- 查看今天的會議室預約
-- SELECT b.*, r.name as room_name
-- FROM meeting_system.bookings b
-- LEFT JOIN meeting_system.rooms r ON b.room_id = r.id
-- WHERE b.booking_date = CURRENT_DATE
-- ORDER BY b.start_time;
