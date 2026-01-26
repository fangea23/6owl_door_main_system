-- =============================================
-- 員工表新增品牌與門市關聯
-- 使用 BIGINT code 欄位連結
-- =============================================

-- 1. 在 employees 表新增 brand_id 和 store_id (BIGINT)
-- 這些欄位存儲的是 brands.code 和 stores.code 的整數版本
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS brand_id BIGINT,
ADD COLUMN IF NOT EXISTS store_id BIGINT;

-- 欄位註釋
COMMENT ON COLUMN public.employees.brand_id IS '品牌代碼 (BIGINT)：對應 brands.code 的整數值 (1-89 品牌, 90-99 供應商)';
COMMENT ON COLUMN public.employees.store_id IS '門市代碼 (BIGINT)：對應 stores.code 的整數值 (格式 BBSSS，如 1001, 2001)';

-- 2. 建立索引
CREATE INDEX IF NOT EXISTS idx_employees_brand_id ON public.employees(brand_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_store_id ON public.employees(store_id) WHERE deleted_at IS NULL;

-- 3. 建立函數：根據 brand code 取得品牌資訊
CREATE OR REPLACE FUNCTION public.get_brand_by_code(p_brand_code BIGINT)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  code TEXT,
  brand_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.code,
    b.brand_type
  FROM public.brands b
  WHERE b.code::BIGINT = p_brand_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 建立函數：根據 store code 取得門市資訊
CREATE OR REPLACE FUNCTION public.get_store_by_code(p_store_code BIGINT)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  code TEXT,
  brand_id UUID,
  brand_code BIGINT,
  brand_name VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.code,
    s.brand_id,
    b.code::BIGINT AS brand_code,
    b.name AS brand_name
  FROM public.stores s
  LEFT JOIN public.brands b ON s.brand_id = b.id
  WHERE s.code::BIGINT = p_store_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 更新 employees_with_details 視圖，加入品牌和門市資訊
DROP VIEW IF EXISTS public.employees_with_details;
CREATE OR REPLACE VIEW public.employees_with_details AS
SELECT
  e.*,
  d.name as department_name,
  d.code as department_code,
  s.name as supervisor_name,
  s.employee_id as supervisor_employee_id,
  b.name as brand_name,
  b.code as brand_code_text,
  st.name as store_name,
  st.code as store_code_text
FROM public.employees e
LEFT JOIN public.departments d ON e.department_id = d.id AND d.deleted_at IS NULL
LEFT JOIN public.employees s ON e.supervisor_id = s.id AND s.deleted_at IS NULL
LEFT JOIN public.brands b ON e.brand_id = b.code::BIGINT
LEFT JOIN public.stores st ON e.store_id = st.code::BIGINT
WHERE e.deleted_at IS NULL;

COMMENT ON VIEW public.employees_with_details IS '員工完整資訊視圖 - 含部門、主管、品牌、門市';
