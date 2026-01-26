-- ============================================
-- 修復租車日期限制：允許開始和結束日期為同一天
-- ============================================

-- 問題：check_dates_logic constraint 要求 end_date > start_date（嚴格大於）
-- 這導致無法預訂同一天的租車（例如：當天早上借、當天晚上還）

-- 解決方案：刪除嚴格限制的 constraint，保留允許同一天的 constraint

-- 1. 刪除嚴格限制的 constraint
ALTER TABLE car_rental.rental_requests
DROP CONSTRAINT IF EXISTS check_dates_logic;

-- 2. 確認保留允許同一天的 constraint（end_date >= start_date）
-- 此 constraint 已存在：rental_requests_dates_check
-- 無需額外操作

-- 3. 驗證
DO $$
BEGIN
  -- 檢查 check_dates_logic 是否已刪除
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'car_rental'
      AND table_name = 'rental_requests'
      AND constraint_name = 'check_dates_logic'
  ) THEN
    RAISE WARNING '⚠️  check_dates_logic constraint 仍然存在！';
  ELSE
    RAISE NOTICE '✅ check_dates_logic constraint 已成功刪除';
  END IF;

  -- 檢查 rental_requests_dates_check 是否存在
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'car_rental'
      AND table_name = 'rental_requests'
      AND constraint_name = 'rental_requests_dates_check'
  ) THEN
    RAISE NOTICE '✅ rental_requests_dates_check constraint 存在（允許同一天）';
  ELSE
    RAISE WARNING '⚠️  rental_requests_dates_check constraint 不存在！需要創建';
    -- 創建允許同一天的 constraint
    ALTER TABLE car_rental.rental_requests
    ADD CONSTRAINT rental_requests_dates_check
    CHECK (end_date >= start_date);
  END IF;
END $$;

-- 完成！
COMMENT ON TABLE car_rental.rental_requests IS
'租車申請表 - 已修復日期限制，現在允許開始和結束日期為同一天';
