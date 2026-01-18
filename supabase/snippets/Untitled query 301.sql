-- 1. 刪除舊的函式 (避免混淆)
DROP FUNCTION IF EXISTS car_rental.approve_rental_request;

-- 2. 在 [public] schema 重新建立核准函式
CREATE OR REPLACE FUNCTION public.approve_rental_request(
  p_request_id UUID,
  p_reviewer_id UUID,
  p_review_comment TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- ⚠️ 關鍵：允許跨 Schema 修改車輛與租借表
AS $$
DECLARE
  v_request RECORD;
  v_vehicle_status TEXT;
  v_rental_id UUID;
BEGIN
  -- A. 鎖定並檢查申請單
  SELECT * INTO v_request 
  FROM car_rental.rental_requests 
  WHERE id = p_request_id 
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION '找不到該申請單';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION '操作失敗：該申請單狀態已變更（可能已被取消或審核）。';
  END IF;

  -- B. 鎖定並檢查車輛
  SELECT status INTO v_vehicle_status
  FROM car_rental.vehicles
  WHERE id = v_request.vehicle_id
  FOR UPDATE;

  IF v_vehicle_status != 'available' THEN
    RAISE EXCEPTION '操作失敗：該車輛目前狀態不可用（%），請選擇其他車輛。', v_vehicle_status;
  END IF;

  -- C. 更新申請單狀態 -> approved
  UPDATE car_rental.rental_requests
  SET status = 'approved',
      reviewer_id = p_reviewer_id,
      reviewed_at = NOW(),
      review_comment = p_review_comment
  WHERE id = p_request_id;

  -- D. 建立租借記錄 (Rentals)
  INSERT INTO car_rental.rentals (
    request_id,
    vehicle_id,
    renter_id,
    start_date,
    end_date,
    status
  ) VALUES (
    p_request_id,
    v_request.vehicle_id,
    v_request.requester_id,
    v_request.start_date,
    v_request.end_date,
    'confirmed'
  ) RETURNING id INTO v_rental_id;

  -- E. 更新車輛狀態 -> rented
  UPDATE car_rental.vehicles
  SET status = 'rented'
  WHERE id = v_request.vehicle_id;

  -- F. 回傳成功
  RETURN jsonb_build_object('success', true, 'rental_id', v_rental_id);
END;
$$;

-- 3. 開放權限給已登入使用者
GRANT EXECUTE ON FUNCTION public.approve_rental_request TO authenticated;