-- ============================================================================
-- 公司車租借系統資料庫結構
-- ============================================================================
-- 在 Supabase Dashboard 執行此 SQL 來建立所需的表格
--
-- 使用 Schema: car_rental (隔離不同系統的資料)
-- ============================================================================

-- 1. 建立 Schema
CREATE SCHEMA IF NOT EXISTS car_rental;

-- 2. 設定搜尋路徑
SET search_path TO car_rental, public;

-- ============================================================================
-- 表格 1: vehicles (車輛管理)
-- ============================================================================
CREATE TABLE IF NOT EXISTS car_rental.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本資訊
  plate_number VARCHAR(20) UNIQUE NOT NULL,        -- 車牌號碼
  brand VARCHAR(100) NOT NULL,                     -- 品牌（如：Toyota）
  model VARCHAR(100) NOT NULL,                     -- 型號（如：Camry）
  year INTEGER NOT NULL,                           -- 年份
  color VARCHAR(50),                               -- 顏色

  -- 車輛規格
  vehicle_type VARCHAR(50) NOT NULL,               -- 車輛類型（sedan, suv, van, truck）
  seating_capacity INTEGER DEFAULT 5,              -- 座位數
  fuel_type VARCHAR(50),                           -- 燃料類型（gasoline, diesel, electric, hybrid）
  transmission VARCHAR(50),                        -- 變速箱（automatic, manual）

  -- 使用狀態
  status VARCHAR(50) DEFAULT 'available',          -- available, rented, maintenance, retired
  current_mileage INTEGER DEFAULT 0,               -- 當前里程數

  -- 保險與證件
  insurance_expiry DATE,                           -- 保險到期日
  inspection_expiry DATE,                          -- 驗車到期日

  -- 其他資訊
  purchase_date DATE,                              -- 購買日期
  purchase_price DECIMAL(12, 2),                   -- 購買價格
  location VARCHAR(200),                           -- 停放位置
  notes TEXT,                                      -- 備註

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- 軟刪除
  deleted_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT vehicles_year_check CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM NOW()) + 1)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON car_rental.vehicles(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON car_rental.vehicles(vehicle_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON car_rental.vehicles(plate_number) WHERE deleted_at IS NULL;

-- ============================================================================
-- 表格 2: rental_requests (租借申請)
-- ============================================================================
CREATE TABLE IF NOT EXISTS car_rental.rental_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 申請人資訊（關聯統一員工表）
  requester_id UUID NOT NULL REFERENCES public.employees(id),  -- 申請人（員工 ID）

  -- 租借需求
  vehicle_id UUID REFERENCES car_rental.vehicles(id),    -- 指定車輛（可為空，表示不指定）
  preferred_vehicle_type VARCHAR(50),                    -- 偏好車型

  -- 用車時間
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,

  -- 用車目的
  purpose TEXT NOT NULL,                                 -- 用車目的
  destination VARCHAR(300),                              -- 目的地
  estimated_mileage INTEGER,                             -- 預估里程

  -- 審核流程
  status VARCHAR(50) DEFAULT 'pending',                  -- pending, approved, rejected, cancelled
  reviewer_id UUID REFERENCES public.employees(id),      -- 審核者（員工 ID）
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_comment TEXT,                                   -- 審核意見

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT rental_requests_dates_check CHECK (end_date >= start_date)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_rental_requests_status ON car_rental.rental_requests(status);
CREATE INDEX IF NOT EXISTS idx_rental_requests_requester ON car_rental.rental_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_rental_requests_dates ON car_rental.rental_requests(start_date, end_date);

-- ============================================================================
-- 表格 3: rentals (實際租借記錄)
-- ============================================================================
CREATE TABLE IF NOT EXISTS car_rental.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯申請
  request_id UUID REFERENCES car_rental.rental_requests(id),

  -- 車輛與用戶（關聯統一員工表）
  vehicle_id UUID NOT NULL REFERENCES car_rental.vehicles(id),
  renter_id UUID NOT NULL REFERENCES public.employees(id),  -- 租借人（員工 ID）

  -- 租借時間
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  actual_start_time TIMESTAMP WITH TIME ZONE,            -- 實際取車時間
  actual_end_time TIMESTAMP WITH TIME ZONE,              -- 實際還車時間

  -- 里程紀錄
  start_mileage INTEGER,                                 -- 取車里程
  end_mileage INTEGER,                                   -- 還車里程
  total_mileage INTEGER GENERATED ALWAYS AS (end_mileage - start_mileage) STORED,

  -- 狀態
  status VARCHAR(50) DEFAULT 'confirmed',                -- confirmed, in_progress, completed, cancelled

  -- 檢查記錄
  pickup_checklist JSONB,                                -- 取車檢查清單
  return_checklist JSONB,                                -- 還車檢查清單

  -- 備註
  notes TEXT,

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT rentals_dates_check CHECK (end_date >= start_date),
  CONSTRAINT rentals_mileage_check CHECK (end_mileage IS NULL OR start_mileage IS NULL OR end_mileage >= start_mileage)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_rentals_vehicle ON car_rental.rentals(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_rentals_renter ON car_rental.rentals(renter_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON car_rental.rentals(status);
CREATE INDEX IF NOT EXISTS idx_rentals_dates ON car_rental.rentals(start_date, end_date);

-- ============================================================================
-- 表格 4: maintenance_records (維護保養記錄)
-- ============================================================================
CREATE TABLE IF NOT EXISTS car_rental.maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 車輛
  vehicle_id UUID NOT NULL REFERENCES car_rental.vehicles(id),

  -- 維護類型
  maintenance_type VARCHAR(50) NOT NULL,                 -- routine, repair, inspection, accident

  -- 維護資訊
  maintenance_date DATE NOT NULL,
  mileage_at_maintenance INTEGER,

  -- 詳細說明
  description TEXT NOT NULL,
  items JSONB,                                           -- 維護項目清單

  -- 費用
  cost DECIMAL(12, 2),
  vendor VARCHAR(200),                                   -- 維修廠商

  -- 狀態
  status VARCHAR(50) DEFAULT 'scheduled',                -- scheduled, in_progress, completed, cancelled

  -- 附件
  attachments JSONB,                                     -- 相關文件或照片連結

  -- 下次保養提醒
  next_maintenance_date DATE,
  next_maintenance_mileage INTEGER,

  -- 系統欄位
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON car_rental.maintenance_records(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_date ON car_rental.maintenance_records(maintenance_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_type ON car_rental.maintenance_records(maintenance_type);

-- ============================================================================
-- 觸發器：自動更新 updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION car_rental.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 刪除舊觸發器（如果存在）
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON car_rental.vehicles;
DROP TRIGGER IF EXISTS update_rental_requests_updated_at ON car_rental.rental_requests;
DROP TRIGGER IF EXISTS update_rentals_updated_at ON car_rental.rentals;
DROP TRIGGER IF EXISTS update_maintenance_updated_at ON car_rental.maintenance_records;

-- 創建新觸發器
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON car_rental.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION car_rental.update_updated_at_column();

CREATE TRIGGER update_rental_requests_updated_at
  BEFORE UPDATE ON car_rental.rental_requests
  FOR EACH ROW
  EXECUTE FUNCTION car_rental.update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at
  BEFORE UPDATE ON car_rental.rentals
  FOR EACH ROW
  EXECUTE FUNCTION car_rental.update_updated_at_column();

CREATE TRIGGER update_maintenance_updated_at
  BEFORE UPDATE ON car_rental.maintenance_records
  FOR EACH ROW
  EXECUTE FUNCTION car_rental.update_updated_at_column();

-- ============================================================================
-- Row Level Security (RLS) 設定
-- ============================================================================
-- 啟用 RLS
ALTER TABLE car_rental.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_rental.rental_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_rental.rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_rental.maintenance_records ENABLE ROW LEVEL SECURITY;

-- 輔助函數：獲取當前用戶的員工 ID
CREATE OR REPLACE FUNCTION car_rental.get_current_employee_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM public.employees
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 輔助函數：檢查當前用戶是否為管理員
CREATE OR REPLACE FUNCTION car_rental.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'hr')
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 政策：所有已登入用戶可讀取車輛資訊
DROP POLICY IF EXISTS "Anyone can view available vehicles" ON car_rental.vehicles;
CREATE POLICY "Anyone can view available vehicles"
  ON car_rental.vehicles FOR SELECT
  USING (auth.uid() IS NOT NULL AND deleted_at IS NULL);

-- 政策：管理員可完全管理車輛
DROP POLICY IF EXISTS "Admins can manage vehicles" ON car_rental.vehicles;
CREATE POLICY "Admins can manage vehicles"
  ON car_rental.vehicles FOR ALL
  USING (car_rental.is_admin());

-- 政策：用戶可查看自己的申請
DROP POLICY IF EXISTS "Users can view own rental requests" ON car_rental.rental_requests;
CREATE POLICY "Users can view own rental requests"
  ON car_rental.rental_requests FOR SELECT
  USING (requester_id = car_rental.get_current_employee_id());

-- 政策：用戶可創建申請
DROP POLICY IF EXISTS "Users can create rental requests" ON car_rental.rental_requests;
CREATE POLICY "Users can create rental requests"
  ON car_rental.rental_requests FOR INSERT
  WITH CHECK (requester_id = car_rental.get_current_employee_id());

-- 政策：管理員可查看所有申請
DROP POLICY IF EXISTS "Admins can view all rental requests" ON car_rental.rental_requests;
CREATE POLICY "Admins can view all rental requests"
  ON car_rental.rental_requests FOR SELECT
  USING (car_rental.is_admin());

-- 政策：管理員可審核申請
DROP POLICY IF EXISTS "Admins can review rental requests" ON car_rental.rental_requests;
CREATE POLICY "Admins can review rental requests"
  ON car_rental.rental_requests FOR UPDATE
  USING (car_rental.is_admin());

-- 政策：用戶可查看自己的租借記錄
DROP POLICY IF EXISTS "Users can view own rentals" ON car_rental.rentals;
CREATE POLICY "Users can view own rentals"
  ON car_rental.rentals FOR SELECT
  USING (renter_id = car_rental.get_current_employee_id());

-- 政策：管理員可完全管理租借記錄
DROP POLICY IF EXISTS "Admins can manage rentals" ON car_rental.rentals;
CREATE POLICY "Admins can manage rentals"
  ON car_rental.rentals FOR ALL
  USING (car_rental.is_admin());

-- 政策：所有人可查看維護記錄
DROP POLICY IF EXISTS "Anyone can view maintenance records" ON car_rental.maintenance_records;
CREATE POLICY "Anyone can view maintenance records"
  ON car_rental.maintenance_records FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 政策：管理員可管理維護記錄
DROP POLICY IF EXISTS "Admins can manage maintenance records" ON car_rental.maintenance_records;
CREATE POLICY "Admins can manage maintenance records"
  ON car_rental.maintenance_records FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM auth.users
      WHERE raw_user_meta_data->>'role' = 'admin'
    )
  );

-- ============================================================================
-- 示範資料 (可選)
-- ============================================================================
-- 插入測試車輛
INSERT INTO car_rental.vehicles (plate_number, brand, model, year, color, vehicle_type, seating_capacity, fuel_type, transmission, status, location)
VALUES
  ('ABC-1234', 'Toyota', 'Camry', 2022, 'White', 'sedan', 5, 'gasoline', 'automatic', 'available', '總公司停車場'),
  ('XYZ-5678', 'Honda', 'CR-V', 2021, 'Black', 'suv', 7, 'gasoline', 'automatic', 'available', '總公司停車場'),
  ('DEF-9012', 'Tesla', 'Model 3', 2023, 'Blue', 'sedan', 5, 'electric', 'automatic', 'available', '總公司停車場')
ON CONFLICT (plate_number) DO NOTHING;

-- ============================================================================
-- 完成！
-- ============================================================================
COMMENT ON SCHEMA car_rental IS '公司車租借系統 - 管理車輛、租借申請、租借記錄與維護保養';
