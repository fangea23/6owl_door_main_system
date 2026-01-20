-- ============================================
-- 付款簽核系統功能增強
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
    brand_id BIGINT NOT NULL REFERENCES payment_approval.brands(id) ON DELETE CASCADE,
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
COMMENT ON COLUMN payment_approval.accountant_brands.employee_id IS '會計員工ID (關聯 employees 表)';
COMMENT ON COLUMN payment_approval.accountant_brands.brand_id IS '負責的品牌ID (關聯 brands 表)';

-- ============================================
-- 功能二：多門店付款
-- ============================================

-- 創建付款申請明細表
CREATE TABLE IF NOT EXISTS payment_approval.payment_request_items (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES payment_approval.payment_requests(id) ON DELETE CASCADE,

    -- 門店資訊
    store_id BIGINT REFERENCES payment_approval.stores(id),
    store_name TEXT NOT NULL,           -- 冗餘存儲，避免門店刪除後找不到
    brand_name TEXT NOT NULL,           -- 冗餘存儲品牌名稱

    -- 付款資訊
    content TEXT NOT NULL,              -- 付款內容說明
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
COMMENT ON COLUMN payment_request_items.request_id IS '關聯的付款申請ID';
COMMENT ON COLUMN payment_request_items.store_name IS '門店名稱（冗餘儲存）';
COMMENT ON COLUMN payment_request_items.brand_name IS '品牌名稱（冗餘儲存）';
COMMENT ON COLUMN payment_request_items.content IS '本筆付款的內容說明';
COMMENT ON COLUMN payment_request_items.tax_type IS '稅別：tax_included(含稅) 或 tax_excluded(未稅)';
COMMENT ON COLUMN payment_request_items.amount IS '本筆付款金額';
COMMENT ON COLUMN payment_request_items.display_order IS '顯示順序（用於排序）';

-- ============================================
-- 修改現有 payment_requests 表
-- ============================================

-- 添加新欄位以支援多門店功能
ALTER TABLE payment_approval.payment_requests
    ADD COLUMN IF NOT EXISTS is_multi_store BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS item_count INTEGER DEFAULT 1;

-- 添加註解
COMMENT ON COLUMN payment_approval.payment_requests.is_multi_store IS '是否為多門店付款申請';
COMMENT ON COLUMN payment_approval.payment_requests.total_amount IS '總金額（多門店時使用）';
COMMENT ON COLUMN payment_approval.payment_requests.item_count IS '明細筆數';

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
JOIN payment_approval.brands b ON pr.brand = b.name
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
-- 插入範例資料（可選）
-- ============================================

-- 範例：設定六扇門會計（需要先知道會計的 employee_id）
-- 假設有一位六扇門的會計，employee_id 為 '...'
-- INSERT INTO payment_approval.accountant_brands (employee_id, brand_id)
-- SELECT
--     e.id as employee_id,
--     b.id as brand_id
-- FROM public.employees e
-- CROSS JOIN payment_approval.brands b
-- WHERE e.role = 'accountant'
--     AND e.name LIKE '%六扇門%'  -- 根據實際情況調整
--     AND b.name = '六扇門';

-- ============================================
-- 權限設定（RLS）
-- ============================================

-- 啟用 RLS
ALTER TABLE payment_approval.accountant_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_approval.payment_request_items ENABLE ROW LEVEL SECURITY;

-- 會計可以查看自己負責的品牌
CREATE POLICY "會計可以查看自己負責的品牌"
    ON payment_approval.accountant_brands
    FOR SELECT
    USING (
        employee_id IN (
            SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
    );

-- 管理員和HR可以管理會計品牌分配
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

-- 所有人都可以查看付款明細
CREATE POLICY "所有人可以查看付款明細"
    ON payment_approval.payment_request_items
    FOR SELECT
    USING (true);

-- 申請人可以新增明細
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

COMMENT ON FUNCTION payment_approval.calculate_request_total IS '計算付款申請的總金額（所有明細加總）';

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

COMMENT ON TRIGGER trg_update_request_totals ON payment_approval.payment_request_items IS '自動更新付款申請的總金額和明細筆數';

-- ============================================
-- 完成
-- ============================================

-- 顯示創建結果
DO $$
BEGIN
    RAISE NOTICE '✅ 付款簽核系統功能增強完成！';
    RAISE NOTICE '   1. 會計品牌分流表已創建';
    RAISE NOTICE '   2. 多門店付款明細表已創建';
    RAISE NOTICE '   3. 相關視圖和函數已創建';
    RAISE NOTICE '   4. RLS 權限已設定';
    RAISE NOTICE '';
    RAISE NOTICE '📝 下一步：';
    RAISE NOTICE '   1. 在管理介面中為會計分配負責品牌';
    RAISE NOTICE '   2. 修改前端表單以支援多門店輸入';
    RAISE NOTICE '   3. 更新 Dashboard 顯示邏輯';
END $$;
