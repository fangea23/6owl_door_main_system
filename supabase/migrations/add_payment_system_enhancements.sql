-- ============================================
-- 付款簽核系統功能增強 (修正版：Brands/Stores 位於 Public)
-- 1. 會計品牌分流功能
-- 2. 多門店付款功能
-- ============================================

-- ============================================
-- 功能一：會計品牌分流
-- ============================================

-- 創建會計負責品牌關聯表
CREATE TABLE IF NOT EXISTS payment_approval.accountant_brands (
    id BIGSERIAL PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    
    -- 修正：指向 public.brands
    brand_id BIGINT NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- 確保同一個會計不會重複負責同一個品牌
    UNIQUE(employee_id, brand_id)
);

-- 創建索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_accountant_brands_employee ON payment_approval.accountant_brands(employee_id);
CREATE INDEX IF NOT EXISTS idx_accountant_brands_brand ON payment_approval.accountant_brands(brand_id);

-- 添加註解
COMMENT ON TABLE payment_approval.accountant_brands IS '會計負責品牌關聯表：記錄每位會計負責處理哪些品牌的付款申請';
COMMENT ON COLUMN payment_approval.accountant_brands.employee_id IS '會計員工ID (關聯 public.employees 表)';
COMMENT ON COLUMN payment_approval.accountant_brands.brand_id IS '負責的品牌ID (關聯 public.brands 表)';

-- ============================================
-- 功能二：多門店付款
-- ============================================

-- 創建付款申請明細表
CREATE TABLE IF NOT EXISTS payment_approval.payment_request_items (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES payment_approval.payment_requests(id) ON DELETE CASCADE,

    -- 修正：指向 public.stores
    store_id BIGINT REFERENCES public.stores(id),
    
    store_name TEXT NOT NULL,            -- 冗餘存儲，避免門店刪除後找不到
    brand_name TEXT NOT NULL,            -- 冗餘存儲品牌名稱

    -- 付款資訊
    content TEXT NOT NULL,               -- 付款內容說明
    tax_type TEXT NOT NULL CHECK (tax_type IN ('tax_included', 'tax_excluded')),  -- 稅別
    amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),  -- 付款金額

    -- 元數據
    display_order INTEGER DEFAULT 0,    -- 顯示順序
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 確保金額為正數
    CONSTRAINT positive_amount CHECK (amount > 0)
);

-- 創建索引
CREATE INDEX IF NOT EXISTS idx_payment_items_request ON payment_approval.payment_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_store ON payment_approval.payment_request_items(store_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_order ON payment_approval.payment_request_items(request_id, display_order);

-- 添加註解
COMMENT ON TABLE payment_approval.payment_request_items IS '付款申請明細表：支援一次申請多個門店的付款';

-- ============================================
-- 修改現有 payment_requests 表
-- ============================================

-- 添加新欄位以支援多門店功能
ALTER TABLE payment_approval.payment_requests
    ADD COLUMN IF NOT EXISTS is_multi_store BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 1;

COMMENT ON COLUMN payment_approval.payment_requests.is_multi_store IS '是否為多門店付款申請';
COMMENT ON COLUMN payment_approval.payment_requests.total_amount IS '總金額（多門店時使用）';

-- ============================================
-- 創建視圖：會計工作台
-- ============================================

-- 會計可以看到自己負責品牌的待簽核案件
CREATE OR REPLACE VIEW payment_approval.accountant_pending_requests AS
SELECT
    pr.*,
    ab.employee_id as accountant_employee_id,
    e.name as accountant_name
FROM payment_approval.payment_requests pr
-- 修正：JOIN public.brands
JOIN public.brands b ON pr.brand = b.name
JOIN payment_approval.accountant_brands ab ON b.id = ab.brand_id
JOIN public.employees e ON ab.employee_id = e.id
WHERE pr.status = 'pending_accountant'
    AND pr.current_step = 2;

COMMENT ON VIEW payment_approval.accountant_pending_requests IS '會計工作台視圖：顯示各會計負責品牌的待簽核案件';

-- ============================================
-- 創建視圖：付款申請完整資訊（含明細）
-- ============================================

CREATE OR REPLACE VIEW payment_approval.payment_requests_with_items AS
SELECT
    pr.*,
    COALESCE(
        json_agg(
            json_build_object(
                'id', pri.id,
                'store_name', pri.store_name,
                'brand_name', pri.brand_name,
                'content', pri.content,
                'tax_type', pri.tax_type,
                'amount', pri.amount,
                'display_order', pri.display_order
            ) ORDER BY pri.display_order
        ) FILTER (WHERE pri.id IS NOT NULL),
        '[]'::json
    ) as items
FROM payment_approval.payment_requests pr
LEFT JOIN payment_approval.payment_request_items pri ON pr.id = pri.request_id
GROUP BY pr.id;

COMMENT ON VIEW payment_approval.payment_requests_with_items IS '付款申請完整視圖：包含所有明細資訊';

-- ============================================
-- 權限設定（RLS）
-- ============================================

-- 啟用 RLS
ALTER TABLE payment_approval.accountant_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_approval.payment_request_items ENABLE ROW LEVEL SECURITY;

-- 1. 會計可以查看自己負責的品牌
DROP POLICY IF EXISTS "會計可以查看自己負責的品牌" ON payment_approval.accountant_brands;
CREATE POLICY "會計可以查看自己負責的品牌"
    ON payment_approval.accountant_brands
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );

-- 2. 管理員和HR可以管理會計品牌分配
DROP POLICY IF EXISTS "管理員可以管理會計品牌" ON payment_approval.accountant_brands;
CREATE POLICY "管理員可以管理會計品牌"
    ON payment_approval.accountant_brands
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.employees
            WHERE user_id = auth.uid()
            AND role IN ('admin', 'hr')
        )
    );

-- 3. 所有人都可以查看付款明細
DROP POLICY IF EXISTS "所有人可以查看付款明細" ON payment_approval.payment_request_items;
CREATE POLICY "所有人可以查看付款明細"
    ON payment_approval.payment_request_items
    FOR SELECT
    USING (true);

-- 4. 申請人可以新增明細
DROP POLICY IF EXISTS "申請人可以新增付款明細" ON payment_approval.payment_request_items;
CREATE POLICY "申請人可以新增付款明細"
    ON payment_approval.payment_request_items
    FOR INSERT
    WITH CHECK (
        request_id IN (
            SELECT id FROM payment_approval.payment_requests
            WHERE applicant_id = auth.uid()
        )
    );

-- ============================================
-- 函數：計算申請總金額
-- ============================================

CREATE OR REPLACE FUNCTION payment_approval.calculate_request_total(p_request_id BIGINT)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM payment_approval.payment_request_items
    WHERE request_id = p_request_id;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 觸發器：自動更新總金額
-- ============================================

CREATE OR REPLACE FUNCTION payment_approval.update_request_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- 更新主表的總金額和明細筆數
    UPDATE payment_approval.payment_requests
    SET 
        total_amount = payment_approval.calculate_request_total(
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.request_id 
                ELSE NEW.request_id 
            END
        ),
        item_count = (
            SELECT COUNT(*) 
            FROM payment_approval.payment_request_items
            WHERE request_id = CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.request_id 
                ELSE NEW.request_id 
            END
        )
    WHERE id = CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.request_id 
        ELSE NEW.request_id 
    END;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- 創建觸發器
DROP TRIGGER IF EXISTS trg_update_request_totals ON payment_approval.payment_request_items;
CREATE TRIGGER trg_update_request_totals
    AFTER INSERT OR UPDATE OR DELETE
    ON payment_approval.payment_request_items
    FOR EACH ROW
    EXECUTE FUNCTION payment_approval.update_request_totals();

-- ============================================
-- 完成訊息
-- ============================================
DO $$
BEGIN
    RAISE NOTICE '✅ 修正版腳本執行完成！';
    RAISE NOTICE '   - 已連結 public.brands';
    RAISE NOTICE '   - 已連結 public.stores';
END $$;