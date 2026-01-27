-- ===================================================
-- 門店租約與保險管理表
-- 用於記錄門店的租約、租金、保險等資訊
-- 執行日期：2026-01-26
-- 已執行於 Supabase
-- ===================================================

-- ===================================================
-- 1. 門店租約表 (store_leases)
-- ===================================================

CREATE TABLE IF NOT EXISTS public.store_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,

  -- 房東資訊
  landlord_name TEXT NOT NULL,                    -- 房東姓名/公司名稱
  landlord_contact TEXT,                          -- 房東聯絡方式（Email）
  landlord_phone TEXT,                            -- 房東電話
  landlord_address TEXT,                          -- 房東地址

  -- 租約期間
  lease_start_date DATE NOT NULL,                 -- 租約起始日
  lease_end_date DATE NOT NULL,                   -- 租約結束日
  renewal_notice_days INTEGER DEFAULT 90,         -- 續約提醒天數（提前幾天通知）

  -- 租金資訊
  monthly_rent DECIMAL(12, 2) NOT NULL,           -- 月租金
  deposit DECIMAL(12, 2),                         -- 押金
  management_fee DECIMAL(12, 2) DEFAULT 0,        -- 管理費（月）
  other_fees DECIMAL(12, 2) DEFAULT 0,            -- 其他費用（月）
  payment_day INTEGER DEFAULT 1 CHECK (payment_day BETWEEN 1 AND 28), -- 每月付款日

  -- 物件資訊
  floor_area DECIMAL(10, 2),                      -- 坪數
  floor_number TEXT,                              -- 樓層
  property_address TEXT,                          -- 物件地址

  -- 合約檔案
  contract_file_url TEXT,                         -- 合約檔案 URL

  -- 狀態
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'terminated', 'pending_renewal')),

  -- 備註
  notes TEXT,

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_store_leases_store_code ON public.store_leases(store_code);
CREATE INDEX IF NOT EXISTS idx_store_leases_status ON public.store_leases(status);
CREATE INDEX IF NOT EXISTS idx_store_leases_end_date ON public.store_leases(lease_end_date);

-- 啟用 RLS
ALTER TABLE public.store_leases ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Users with store.view can view leases" ON public.store_leases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rbac.v_user_permissions
      WHERE user_id = auth.uid() AND permission_code = 'store.view'
    )
  );

CREATE POLICY "Users with store.edit can insert leases" ON public.store_leases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rbac.v_user_permissions
      WHERE user_id = auth.uid() AND permission_code = 'store.edit'
    )
  );

CREATE POLICY "Users with store.edit can update leases" ON public.store_leases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rbac.v_user_permissions
      WHERE user_id = auth.uid() AND permission_code = 'store.edit'
    )
  );

CREATE POLICY "Users with store.delete can delete leases" ON public.store_leases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM rbac.v_user_permissions
      WHERE user_id = auth.uid() AND permission_code = 'store.delete'
    )
  );

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_store_leases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_store_leases_updated_at ON public.store_leases;
CREATE TRIGGER trigger_store_leases_updated_at
  BEFORE UPDATE ON public.store_leases
  FOR EACH ROW
  EXECUTE FUNCTION update_store_leases_updated_at();

-- 註解
COMMENT ON TABLE public.store_leases IS '門店租約管理表';
COMMENT ON COLUMN public.store_leases.store_code IS '關聯門店代碼';
COMMENT ON COLUMN public.store_leases.monthly_rent IS '月租金（新台幣）';
COMMENT ON COLUMN public.store_leases.renewal_notice_days IS '租約到期前幾天提醒續約';


-- ===================================================
-- 2. 門店保險表 (store_insurances)
-- ===================================================

CREATE TABLE IF NOT EXISTS public.store_insurances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_code TEXT NOT NULL REFERENCES public.stores(code) ON DELETE CASCADE,

  -- 保險基本資訊
  insurance_type TEXT NOT NULL CHECK (insurance_type IN (
    'fire',                   -- 火災險
    'liability',              -- 公共意外責任險
    'theft',                  -- 竊盜險
    'equipment',              -- 設備綜合險
    'business_interruption',  -- 營業中斷險
    'employee',               -- 員工團體險
    'other'                   -- 其他
  )),
  insurance_name TEXT NOT NULL,                   -- 保險名稱（自訂）

  -- 保險公司資訊
  insurance_company TEXT NOT NULL,                -- 保險公司
  policy_number TEXT,                             -- 保單號碼
  agent_name TEXT,                                -- 業務員姓名
  agent_phone TEXT,                               -- 業務員電話

  -- 保險期間
  start_date DATE NOT NULL,                       -- 保險起始日
  end_date DATE NOT NULL,                         -- 保險結束日
  renewal_notice_days INTEGER DEFAULT 30,         -- 續保提醒天數

  -- 金額
  coverage_amount DECIMAL(14, 2),                 -- 保額
  premium DECIMAL(12, 2) NOT NULL,                -- 保費
  payment_frequency TEXT DEFAULT 'yearly' CHECK (payment_frequency IN ('monthly', 'quarterly', 'yearly')),

  -- 保單檔案
  policy_file_url TEXT,                           -- 保單檔案 URL

  -- 狀態
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_renewal')),

  -- 備註
  notes TEXT,

  -- 審計欄位
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_store_insurances_store_code ON public.store_insurances(store_code);
CREATE INDEX IF NOT EXISTS idx_store_insurances_type ON public.store_insurances(insurance_type);
CREATE INDEX IF NOT EXISTS idx_store_insurances_status ON public.store_insurances(status);
CREATE INDEX IF NOT EXISTS idx_store_insurances_end_date ON public.store_insurances(end_date);

-- 啟用 RLS
ALTER TABLE public.store_insurances ENABLE ROW LEVEL SECURITY;

-- RLS 政策
CREATE POLICY "Users with store.view can view insurances" ON public.store_insurances
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rbac.v_user_permissions
      WHERE user_id = auth.uid() AND permission_code = 'store.view'
    )
  );

CREATE POLICY "Users with store.edit can insert insurances" ON public.store_insurances
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM rbac.v_user_permissions
      WHERE user_id = auth.uid() AND permission_code = 'store.edit'
    )
  );

CREATE POLICY "Users with store.edit can update insurances" ON public.store_insurances
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM rbac.v_user_permissions
      WHERE user_id = auth.uid() AND permission_code = 'store.edit'
    )
  );

CREATE POLICY "Users with store.delete can delete insurances" ON public.store_insurances
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM rbac.v_user_permissions
      WHERE user_id = auth.uid() AND permission_code = 'store.delete'
    )
  );

-- 自動更新 updated_at
CREATE OR REPLACE FUNCTION update_store_insurances_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_store_insurances_updated_at ON public.store_insurances;
CREATE TRIGGER trigger_store_insurances_updated_at
  BEFORE UPDATE ON public.store_insurances
  FOR EACH ROW
  EXECUTE FUNCTION update_store_insurances_updated_at();

-- 註解
COMMENT ON TABLE public.store_insurances IS '門店保險管理表';
COMMENT ON COLUMN public.store_insurances.insurance_type IS '保險類型：fire=火險, liability=責任險, theft=竊盜險, equipment=設備險, business_interruption=營業中斷險, employee=員工團險, other=其他';
COMMENT ON COLUMN public.store_insurances.coverage_amount IS '保額（新台幣）';
COMMENT ON COLUMN public.store_insurances.premium IS '保費（新台幣）';


-- ===================================================
-- 3. 建立到期提醒 View
-- ===================================================

-- 租約到期提醒 View
CREATE OR REPLACE VIEW public.v_lease_expiry_alerts AS
SELECT
  l.id,
  l.store_code,
  s.name AS store_name,
  b.name AS brand_name,
  l.landlord_name,
  l.lease_end_date,
  l.monthly_rent,
  l.renewal_notice_days,
  l.status,
  (l.lease_end_date - CURRENT_DATE) AS days_until_expiry,
  CASE
    WHEN l.lease_end_date < CURRENT_DATE THEN 'expired'
    WHEN (l.lease_end_date - CURRENT_DATE) <= l.renewal_notice_days THEN 'warning'
    ELSE 'ok'
  END AS alert_level
FROM public.store_leases l
JOIN public.stores s ON l.store_code = s.code
JOIN public.brands b ON s.brand_id = b.id
WHERE l.status = 'active';

-- 保險到期提醒 View
CREATE OR REPLACE VIEW public.v_insurance_expiry_alerts AS
SELECT
  i.id,
  i.store_code,
  s.name AS store_name,
  b.name AS brand_name,
  i.insurance_type,
  i.insurance_name,
  i.insurance_company,
  i.end_date,
  i.premium,
  i.renewal_notice_days,
  i.status,
  (i.end_date - CURRENT_DATE) AS days_until_expiry,
  CASE
    WHEN i.end_date < CURRENT_DATE THEN 'expired'
    WHEN (i.end_date - CURRENT_DATE) <= i.renewal_notice_days THEN 'warning'
    ELSE 'ok'
  END AS alert_level
FROM public.store_insurances i
JOIN public.stores s ON i.store_code = s.code
JOIN public.brands b ON s.brand_id = b.id
WHERE i.status = 'active';

COMMENT ON VIEW public.v_lease_expiry_alerts IS '租約到期提醒視圖，用於顯示即將到期或已到期的租約';
COMMENT ON VIEW public.v_insurance_expiry_alerts IS '保險到期提醒視圖，用於顯示即將到期或已到期的保險';
