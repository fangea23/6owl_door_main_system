-- =========================================
-- 將 brands 和 stores 表從 payment_approval schema 遷移到 public schema
-- =========================================

-- 步驟 1: 在 public schema 中創建 brands 表
CREATE TABLE IF NOT EXISTS public.brands (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 步驟 2: 在 public schema 中創建 stores 表
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 步驟 3: 複製數據從 payment_approval.brands 到 public.brands（如果原表存在）
INSERT INTO public.brands (id, name, created_at, updated_at)
SELECT id, name,
       COALESCE(created_at, NOW()),
       COALESCE(updated_at, NOW())
FROM payment_approval.brands
ON CONFLICT (id) DO NOTHING;

-- 步驟 4: 複製數據從 payment_approval.stores 到 public.stores（如果原表存在）
INSERT INTO public.stores (id, name, brand_id, is_active, created_at, updated_at)
SELECT id, name, brand_id,
       COALESCE(is_active, true),
       COALESCE(created_at, NOW()),
       COALESCE(updated_at, NOW())
FROM payment_approval.stores
ON CONFLICT (id) DO NOTHING;

-- 步驟 5: 創建索引以提升查詢性能
CREATE INDEX IF NOT EXISTS idx_stores_brand_id ON public.stores(brand_id);
CREATE INDEX IF NOT EXISTS idx_stores_is_active ON public.stores(is_active);
CREATE INDEX IF NOT EXISTS idx_brands_name ON public.brands(name);
CREATE INDEX IF NOT EXISTS idx_stores_name ON public.stores(name);

-- 步驟 6: 啟用 Row Level Security (RLS)
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 步驟 7: 創建 RLS 策略（允許已認證用戶讀取）
CREATE POLICY "Allow authenticated users to read brands"
    ON public.brands FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to read stores"
    ON public.stores FOR SELECT
    TO authenticated
    USING (true);

-- 步驟 8: 創建 RLS 策略（允許已認證用戶新增）
CREATE POLICY "Allow authenticated users to insert brands"
    ON public.brands FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to insert stores"
    ON public.stores FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 步驟 9: 創建 RLS 策略（允許已認證用戶更新）
CREATE POLICY "Allow authenticated users to update brands"
    ON public.brands FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update stores"
    ON public.stores FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 步驟 10: 創建 RLS 策略（允許已認證用戶刪除）
CREATE POLICY "Allow authenticated users to delete brands"
    ON public.brands FOR DELETE
    TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to delete stores"
    ON public.stores FOR DELETE
    TO authenticated
    USING (true);

-- 步驟 11: 創建自動更新 updated_at 的觸發器函數（如果不存在）
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 步驟 12: 為 brands 表添加觸發器
DROP TRIGGER IF EXISTS update_brands_updated_at ON public.brands;
CREATE TRIGGER update_brands_updated_at
    BEFORE UPDATE ON public.brands
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 步驟 13: 為 stores 表添加觸發器
DROP TRIGGER IF EXISTS update_stores_updated_at ON public.stores;
CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- 清理舊表（可選，請謹慎執行）
-- 在確認新表運作正常後，取消註解以下語句來刪除舊表
-- =========================================

-- DROP TABLE IF EXISTS payment_approval.stores CASCADE;
-- DROP TABLE IF EXISTS payment_approval.brands CASCADE;

-- =========================================
-- 驗證數據遷移
-- =========================================

-- 檢查 brands 數據
SELECT 'Brands in public schema:' as info, COUNT(*) as count FROM public.brands;

-- 檢查 stores 數據
SELECT 'Stores in public schema:' as info, COUNT(*) as count FROM public.stores;

-- 檢查關聯關係
SELECT
    b.name as brand_name,
    COUNT(s.id) as store_count
FROM public.brands b
LEFT JOIN public.stores s ON s.brand_id = b.id
GROUP BY b.id, b.name
ORDER BY b.name;
