-- 新增品牌編碼系統與類型區分
-- 品牌編碼：01-89（品牌），90-99（供應商）

-- 1. 新增欄位
ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS brand_type TEXT DEFAULT 'brand' CHECK (brand_type IN ('brand', 'supplier'));

-- 欄位註釋
COMMENT ON COLUMN public.brands.code IS '品牌編碼：01-89 為品牌，90-99 為供應商，自動生成不可修改';
COMMENT ON COLUMN public.brands.brand_type IS '品牌類型：brand(品牌) 或 supplier(供應商)';

-- 2. 創建函數：自動生成品牌編碼
CREATE OR REPLACE FUNCTION public.generate_brand_code(p_brand_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_code INTEGER;
  new_code TEXT;
  min_range INTEGER;
  max_range INTEGER;
BEGIN
  -- 根據類型設定編碼範圍
  IF p_brand_type = 'supplier' THEN
    min_range := 90;
    max_range := 99;
  ELSE
    min_range := 1;
    max_range := 89;
  END IF;

  -- 查找該類型下最大的編碼
  SELECT COALESCE(
    MAX(code::INTEGER),
    min_range - 1
  ) INTO next_code
  FROM public.brands
  WHERE code ~ '^[0-9]{2}$'
    AND code::INTEGER >= min_range
    AND code::INTEGER <= max_range;

  -- 編碼 +1
  next_code := next_code + 1;

  -- 檢查是否超出範圍
  IF next_code > max_range THEN
    IF p_brand_type = 'supplier' THEN
      RAISE EXCEPTION '供應商編碼已達上限（90-99 已用完）';
    ELSE
      RAISE EXCEPTION '品牌編碼已達上限（01-89 已用完）';
    END IF;
  END IF;

  -- 生成完整編碼（例如：01, 02, ..., 90, 91, ...）
  new_code := LPAD(next_code::TEXT, 2, '0');

  RETURN new_code;
END;
$$;

COMMENT ON FUNCTION public.generate_brand_code IS '自動生成品牌編碼：01-89 為品牌，90-99 為供應商';

-- 3. 創建觸發器函數：在插入新品牌時自動生成 code
CREATE OR REPLACE FUNCTION public.trigger_generate_brand_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 如果 code 為空，自動生成
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_brand_code(COALESCE(NEW.brand_type, 'brand'));
  END IF;

  RETURN NEW;
END;
$$;

-- 4. 創建觸發器（如果不存在）
DROP TRIGGER IF EXISTS before_insert_brand_code ON public.brands;

CREATE TRIGGER before_insert_brand_code
  BEFORE INSERT ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_brand_code();

COMMENT ON TRIGGER before_insert_brand_code ON public.brands IS '在插入新品牌時自動生成品牌編碼';

-- 5. 更新現有記錄的 code（如果為空）
DO $$
DECLARE
  brand_record RECORD;
BEGIN
  FOR brand_record IN
    SELECT id, brand_type
    FROM public.brands
    WHERE code IS NULL OR code = ''
    ORDER BY id
  LOOP
    UPDATE public.brands
    SET code = public.generate_brand_code(COALESCE(brand_record.brand_type, 'brand'))
    WHERE id = brand_record.id;
  END LOOP;
END $$;
