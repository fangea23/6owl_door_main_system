-- ============================================
-- 會議室/公車租借通知系統
-- 擴展通知機制到其他預約系統
-- ============================================

-- 1. 會議室預約通知函數
CREATE OR REPLACE FUNCTION notify_meeting_room_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_user_ids UUID[];
  v_title TEXT;
  v_message TEXT;
  v_booking_time TEXT;
BEGIN
  -- 格式化預約時間
  v_booking_time := to_char(NEW.start_time, 'YYYY-MM-DD HH24:MI');

  -- 根據操作類型發送不同通知
  IF TG_OP = 'INSERT' THEN
    -- === 新增預約 ===
    v_title := '會議室預約確認';
    v_message := '您已成功預約會議室：' || COALESCE(NEW.room_name, '未指定') ||
                 E'\n時間：' || v_booking_time ||
                 CASE WHEN NEW.purpose IS NOT NULL
                      THEN E'\n用途：' || NEW.purpose
                      ELSE ''
                 END;

    -- 通知預約人
    IF NEW.user_id IS NOT NULL THEN
      v_user_ids := ARRAY[NEW.user_id];
    END IF;

  ELSIF TG_OP = 'UPDATE' THEN
    -- === 預約狀態變更 ===
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'approved' THEN
          v_title := '✅ 會議室預約已核准';
          v_message := '您的會議室預約已核准：' || COALESCE(NEW.room_name, '未指定') ||
                       E'\n時間：' || v_booking_time;

        WHEN 'rejected' THEN
          v_title := '❌ 會議室預約已拒絕';
          v_message := '您的會議室預約已被拒絕：' || COALESCE(NEW.room_name, '未指定') ||
                       E'\n時間：' || v_booking_time ||
                       CASE WHEN NEW.rejection_reason IS NOT NULL
                            THEN E'\n原因：' || NEW.rejection_reason
                            ELSE ''
                       END;

        WHEN 'cancelled' THEN
          v_title := '會議室預約已取消';
          v_message := '會議室預約已取消：' || COALESCE(NEW.room_name, '未指定') ||
                       E'\n時間：' || v_booking_time;
      END CASE;

      -- 通知預約人
      IF NEW.user_id IS NOT NULL THEN
        v_user_ids := ARRAY[NEW.user_id];
      END IF;
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    -- === 預約被刪除（管理員操作）===
    v_title := '會議室預約已取消';
    v_message := '您的會議室預約已被取消：' || COALESCE(OLD.room_name, '未指定') ||
                 E'\n原預約時間：' || to_char(OLD.start_time, 'YYYY-MM-DD HH24:MI');

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

-- 2. 公車預約通知函數
CREATE OR REPLACE FUNCTION notify_vehicle_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_user_ids UUID[];
  v_title TEXT;
  v_message TEXT;
  v_booking_time TEXT;
BEGIN
  -- 格式化預約時間
  v_booking_time := to_char(NEW.departure_time, 'YYYY-MM-DD HH24:MI');

  -- 根據操作類型發送不同通知
  IF TG_OP = 'INSERT' THEN
    -- === 新增預約 ===
    v_title := '公務車預約確認';
    v_message := '您已成功預約公務車輛' ||
                 E'\n出發時間：' || v_booking_time ||
                 CASE WHEN NEW.destination IS NOT NULL
                      THEN E'\n目的地：' || NEW.destination
                      ELSE ''
                 END;

    -- 通知預約人
    IF NEW.user_id IS NOT NULL THEN
      v_user_ids := ARRAY[NEW.user_id];
    END IF;

    -- 同時通知車隊管理員（假設有這個角色）
    -- SELECT ARRAY_AGG(DISTINCT e.user_id)
    -- INTO v_admin_ids
    -- FROM employees e
    -- WHERE e.role = 'vehicle_manager' AND e.user_id IS NOT NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    -- === 預約狀態變更 ===
    IF OLD.status != NEW.status THEN
      CASE NEW.status
        WHEN 'approved' THEN
          v_title := '✅ 公務車預約已核准';
          v_message := '您的公務車預約已核准' ||
                       E'\n出發時間：' || v_booking_time ||
                       CASE WHEN NEW.vehicle_number IS NOT NULL
                            THEN E'\n車牌號碼：' || NEW.vehicle_number
                            ELSE ''
                       END;

        WHEN 'rejected' THEN
          v_title := '❌ 公務車預約已拒絕';
          v_message := '您的公務車預約已被拒絕' ||
                       E'\n預約時間：' || v_booking_time ||
                       CASE WHEN NEW.rejection_reason IS NOT NULL
                            THEN E'\n原因：' || NEW.rejection_reason
                            ELSE ''
                       END;

        WHEN 'cancelled' THEN
          v_title := '公務車預約已取消';
          v_message := '公務車預約已取消' ||
                       E'\n原預約時間：' || v_booking_time;

        WHEN 'completed' THEN
          v_title := '公務車行程已完成';
          v_message := '您的公務車行程已完成，感謝使用';
      END CASE;

      -- 通知預約人
      IF NEW.user_id IS NOT NULL THEN
        v_user_ids := ARRAY[NEW.user_id];
      END IF;
    END IF;
  END IF;

  -- 發送通知
  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
    PERFORM send_notification_to_users(v_user_ids, v_title, v_message, 'system');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. 會議提醒通知函數（提前 15 分鐘提醒）
CREATE OR REPLACE FUNCTION notify_upcoming_meeting()
RETURNS void AS $$
DECLARE
  v_booking RECORD;
  v_user_ids UUID[];
BEGIN
  -- 找出 15 分鐘後即將開始的會議
  FOR v_booking IN
    SELECT *
    FROM meeting_room_bookings
    WHERE status = 'approved'
      AND start_time > NOW()
      AND start_time <= NOW() + INTERVAL '15 minutes'
      AND notified_at IS NULL  -- 避免重複通知
  LOOP
    -- 通知預約人
    IF v_booking.user_id IS NOT NULL THEN
      PERFORM send_notification_to_users(
        ARRAY[v_booking.user_id],
        '⏰ 會議即將開始',
        '您預約的會議室（' || COALESCE(v_booking.room_name, '未指定') || '）即將在 15 分鐘後開始',
        'alert'
      );

      -- 標記已通知
      UPDATE meeting_room_bookings
      SET notified_at = NOW()
      WHERE id = v_booking.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. 綁定觸發器（需要對應的表存在才能綁定）
-- 注意：這些觸發器需要在對應的表創建後才能綁定

-- 會議室預約觸發器
-- DROP TRIGGER IF EXISTS trigger_notify_meeting_room_booking ON meeting_room_bookings;
-- CREATE TRIGGER trigger_notify_meeting_room_booking
-- AFTER INSERT OR UPDATE OR DELETE
-- ON meeting_room_bookings
-- FOR EACH ROW
-- EXECUTE FUNCTION notify_meeting_room_booking();

-- 公車預約觸發器
-- DROP TRIGGER IF EXISTS trigger_notify_vehicle_booking ON vehicle_bookings;
-- CREATE TRIGGER trigger_notify_vehicle_booking
-- AFTER INSERT OR UPDATE
-- ON vehicle_bookings
-- FOR EACH ROW
-- EXECUTE FUNCTION notify_vehicle_booking();

-- 5. 添加註解
COMMENT ON FUNCTION notify_meeting_room_booking() IS
'會議室預約通知：當預約創建、狀態改變或被取消時，自動通知預約人';

COMMENT ON FUNCTION notify_vehicle_booking() IS
'公務車預約通知：當預約創建、狀態改變時，自動通知預約人';

COMMENT ON FUNCTION notify_upcoming_meeting() IS
'會議提醒：提前 15 分鐘提醒預約人。需要配合 pg_cron 或外部排程器定期執行';

-- ============================================
-- 排程任務設定（需要 pg_cron 擴展）
-- ============================================
-- 每 5 分鐘檢查一次即將開始的會議
-- SELECT cron.schedule(
--   'notify-upcoming-meetings',
--   '*/5 * * * *',
--   $$ SELECT notify_upcoming_meeting(); $$
-- );
