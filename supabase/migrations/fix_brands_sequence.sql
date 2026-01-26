-- 修復 brands 和 stores 表的序列不同步問題
-- 當手動插入或從備份還原數據後，序列可能與實際數據不同步
-- 這會導致插入新記錄時出現 "duplicate key value violates unique constraint" 錯誤

-- 1. 修復 brands 表的序列
DO $$
DECLARE
  seq_name TEXT;
  max_id INTEGER;
BEGIN
  -- 獲取 brands 表的序列名稱
  seq_name := pg_get_serial_sequence('public.brands', 'id');

  IF seq_name IS NOT NULL THEN
    -- 獲取當前最大 ID
    SELECT COALESCE(MAX(id), 0) INTO max_id FROM public.brands;

    -- 重置序列，使其從 max_id + 1 開始
    EXECUTE format('SELECT setval(%L, %s, false)', seq_name, max_id + 1);

    RAISE NOTICE 'Brands sequence reset to %', max_id + 1;
  END IF;
END $$;

-- 2. 修復 stores 表的序列（如果使用自增 ID）
-- 注意：stores 表使用 UUID 作為主鍵，不需要修復序列

-- 註釋：
-- pg_get_serial_sequence() 獲取表的序列名稱
-- COALESCE() 處理表為空的情況
-- setval() 的第三個參數 false 表示下次 nextval() 會返回設置的值
