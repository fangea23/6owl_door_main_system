-- 更新 stores 表：新增欄位、店家類型、自動編碼邏輯
-- 注意：stores 表已有的欄位是 'code'，不是 'store_code'

-- 1. 新增額外欄位（如果還未新增）
ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS opening_date DATE,
ADD COLUMN IF NOT EXISTS closing_date DATE,
ADD COLUMN IF NOT EXISTS labor_insurance_number TEXT,
ADD COLUMN IF NOT EXISTS health_insurance_number TEXT,
ADD COLUMN IF NOT EXISTS food_safety_certificate_number TEXT,
ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'franchise' CHECK (store_type IN ('direct', 'franchise'));

-- 欄位註釋
COMMENT ON COLUMN public.stores.opening_date IS '開店日期';
COMMENT ON COLUMN public.stores.closing_date IS '關店日期（永久關閉時填寫）';
COMMENT ON COLUMN public.stores.labor_insurance_number IS '勞保證號';
COMMENT ON COLUMN public.stores.health_insurance_number IS '健保證號';
COMMENT ON COLUMN public.stores.food_safety_certificate_number IS '食品安全證號';
COMMENT ON COLUMN public.stores.store_type IS '店家類型：direct(直營) 或 franchise(加盟)';
COMMENT ON COLUMN public.stores.code IS '店家代碼：格式為 BBSSS (BB=品牌ID兩位數, SSS=流水號001-899，900為總部保留)';

-- 2. 創建函數：自動生成店家代碼
CREATE OR REPLACE FUNCTION public.generate_store_code(p_brand_id BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  brand_prefix TEXT;
  next_seq INTEGER;
  new_code TEXT;
BEGIN
  -- 生成品牌前綴（兩位數，例如 01, 02, 03...）
  brand_prefix := LPAD(p_brand_id::TEXT, 2, '0');

  -- 查找該品牌下最大的流水號
  SELECT COALESCE(
    MAX(
      CASE
        WHEN code ~ ('^' || brand_prefix || '[0-9]{3}$')
        THEN SUBSTRING(code FROM 3 FOR 3)::INTEGER
        ELSE 0
      END
    ), 0
  ) INTO next_seq
  FROM public.stores
  WHERE brand_id = p_brand_id;

  -- 流水號 +1
  next_seq := next_seq + 1;

  -- 檢查是否達到 900（總部保留號）
  IF next_seq >= 900 THEN
    RAISE EXCEPTION '該品牌的店家代碼已達上限（900 為總部保留）';
  END IF;

  -- 生成完整代碼（例如：01001, 01002, ...）
  new_code := brand_prefix || LPAD(next_seq::TEXT, 3, '0');

  RETURN new_code;
END;
$$;

COMMENT ON FUNCTION public.generate_store_code IS '自動生成店家代碼：格式為 BBSSS，BB 為品牌 ID，SSS 為流水號（001-899）';

-- 3. 創建觸發器函數：在插入新店家時自動生成 code
CREATE OR REPLACE FUNCTION public.trigger_generate_store_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- 如果 code 為空，自動生成
  IF NEW.code IS NULL OR NEW.code = '' THEN
    NEW.code := public.generate_store_code(NEW.brand_id);
  END IF;

  RETURN NEW;
END;
$$;

-- 4. 創建觸發器（如果不存在）
DROP TRIGGER IF EXISTS before_insert_store_code ON public.stores;

CREATE TRIGGER before_insert_store_code
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_generate_store_code();

COMMENT ON TRIGGER before_insert_store_code ON public.stores IS '在插入新店家時自動生成店家代碼';

-- 5. 更新現有記錄的 code（如果為空）
DO $$
DECLARE
  store_record RECORD;
BEGIN
  FOR store_record IN
    SELECT id, brand_id
    FROM public.stores
    WHERE code IS NULL OR code = ''
  LOOP
    UPDATE public.stores
    SET code = public.generate_store_code(store_record.brand_id)
    WHERE id = store_record.id;
  END LOOP;
END $$;
