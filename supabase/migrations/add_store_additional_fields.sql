-- 新增：門店管理系統額外欄位
--
-- 新增欄位：
-- 1. opening_date - 開店日期
-- 2. closing_date - 關店日期（可選，用於記錄永久關閉的店舖）
-- 3. labor_insurance_number - 勞保證號
-- 4. health_insurance_number - 健保證號
-- 5. food_safety_certificate_number - 食品安全證號

ALTER TABLE public.stores
ADD COLUMN IF NOT EXISTS opening_date DATE,
ADD COLUMN IF NOT EXISTS closing_date DATE,
ADD COLUMN IF NOT EXISTS labor_insurance_number TEXT,
ADD COLUMN IF NOT EXISTS health_insurance_number TEXT,
ADD COLUMN IF NOT EXISTS food_safety_certificate_number TEXT;

-- 添加註解
COMMENT ON COLUMN public.stores.opening_date IS '開店日期';
COMMENT ON COLUMN public.stores.closing_date IS '關店日期（永久關閉時填寫）';
COMMENT ON COLUMN public.stores.labor_insurance_number IS '勞保證號';
COMMENT ON COLUMN public.stores.health_insurance_number IS '健保證號';
COMMENT ON COLUMN public.stores.food_safety_certificate_number IS '食品安全證號';

-- 說明：
-- opening_date: 記錄店舖開業日期
-- closing_date: 記錄店舖永久關閉日期（營運中的店舖此欄位為 NULL）
-- labor_insurance_number: 店舖的勞保證號碼
-- health_insurance_number: 店舖的健保證號碼
-- food_safety_certificate_number: 食品安全相關證照號碼
