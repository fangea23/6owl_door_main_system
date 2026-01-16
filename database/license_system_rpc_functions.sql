-- ============================================================================
-- 授權系統 RPC 函數
-- ============================================================================
-- 注意：此文件創建授權系統所需的 RPC 函數
-- 所有對 profiles 的引用都使用 public.profiles

-- ============================================================================
-- 函數 1: 驗證授權碼
-- ============================================================================
-- 此函數用於驗證授權碼並記錄機器資訊
DROP FUNCTION IF EXISTS public.verify_license(TEXT, TEXT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.verify_license(
  p_license_key TEXT,
  p_machine_id TEXT,
  p_machine_name TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_license RECORD;
  v_device_count INTEGER;
  v_result JSON;
BEGIN
  -- 注意：此函數需要 software_maintenance schema 的表格
  -- 如果您尚未創建 software_maintenance.licenses 和 software_maintenance.devices 表
  -- 請先創建這些表格

  -- 檢查 software_maintenance.licenses 表是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'software_maintenance'
    AND table_name = 'licenses'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License system tables not yet created. Please run license system schema migration first.',
      'code', 'SCHEMA_NOT_READY'
    );
  END IF;

  -- 查詢授權資訊（從 software_maintenance.licenses）
  -- 注意：授權系統的 created_by 欄位應該引用 public.profiles(id)
  SELECT l.* INTO v_license
  FROM software_maintenance.licenses l
  WHERE l.license_key = p_license_key;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License key not found',
      'code', 'LICENSE_NOT_FOUND'
    );
  END IF;

  -- 檢查授權是否啟用
  IF v_license.status != 'active' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License is not active',
      'code', 'LICENSE_INACTIVE',
      'status', v_license.status
    );
  END IF;

  -- 檢查授權是否過期
  IF v_license.expiry_date IS NOT NULL AND v_license.expiry_date < CURRENT_DATE THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License has expired',
      'code', 'LICENSE_EXPIRED',
      'expiry_date', v_license.expiry_date
    );
  END IF;

  -- 檢查已啟用的裝置數量
  SELECT COUNT(*) INTO v_device_count
  FROM software_maintenance.devices
  WHERE license_id = v_license.id
    AND status = 'active';

  -- 檢查是否超過裝置限制
  IF v_license.max_devices IS NOT NULL AND v_device_count >= v_license.max_devices THEN
    -- 檢查此機器是否已經註冊
    IF NOT EXISTS (
      SELECT 1 FROM software_maintenance.devices
      WHERE license_id = v_license.id
        AND machine_id = p_machine_id
        AND status = 'active'
    ) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Maximum device limit reached',
        'code', 'DEVICE_LIMIT_REACHED',
        'max_devices', v_license.max_devices,
        'current_devices', v_device_count
      );
    END IF;
  END IF;

  -- 更新或插入裝置記錄
  INSERT INTO software_maintenance.devices (
    license_id,
    machine_id,
    machine_name,
    ip_address,
    status,
    last_verified_at,
    created_at,
    updated_at
  )
  VALUES (
    v_license.id,
    p_machine_id,
    p_machine_name,
    p_ip_address,
    'active',
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (license_id, machine_id)
  DO UPDATE SET
    machine_name = COALESCE(EXCLUDED.machine_name, software_maintenance.devices.machine_name),
    ip_address = COALESCE(EXCLUDED.ip_address, software_maintenance.devices.ip_address),
    last_verified_at = NOW(),
    updated_at = NOW(),
    status = 'active';

  -- 返回成功結果
  RETURN json_build_object(
    'success', true,
    'license_id', v_license.id,
    'license_key', v_license.license_key,
    'product_name', v_license.product_name,
    'expiry_date', v_license.expiry_date,
    'max_devices', v_license.max_devices,
    'current_devices', v_device_count + 1,
    'message', 'License verified successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'INTERNAL_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 函數 2: 停用授權
-- ============================================================================
-- 此函數用於停用特定機器的授權
DROP FUNCTION IF EXISTS public.deactivate_license(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.deactivate_license(
  p_license_key TEXT,
  p_machine_id TEXT
)
RETURNS JSON AS $$
DECLARE
  v_license_id INTEGER;
  v_device_count INTEGER;
BEGIN
  -- 檢查 software_maintenance.licenses 表是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'software_maintenance'
    AND table_name = 'licenses'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License system tables not yet created. Please run license system schema migration first.',
      'code', 'SCHEMA_NOT_READY'
    );
  END IF;

  -- 查詢授權 ID
  SELECT id INTO v_license_id
  FROM software_maintenance.licenses
  WHERE license_key = p_license_key;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License key not found',
      'code', 'LICENSE_NOT_FOUND'
    );
  END IF;

  -- 停用裝置
  UPDATE software_maintenance.devices
  SET
    status = 'inactive',
    updated_at = NOW()
  WHERE license_id = v_license_id
    AND machine_id = p_machine_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Device not found for this license',
      'code', 'DEVICE_NOT_FOUND'
    );
  END IF;

  -- 返回成功結果
  RETURN json_build_object(
    'success', true,
    'message', 'License deactivated successfully for this device'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'INTERNAL_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 函數 3: 獲取授權資訊
-- ============================================================================
-- 此函數用於獲取授權的詳細資訊，包括創建者資訊（從 public.profiles）
DROP FUNCTION IF EXISTS public.get_license_info(TEXT);
CREATE OR REPLACE FUNCTION public.get_license_info(p_license_key TEXT)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- 檢查表是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'software_maintenance'
    AND table_name = 'licenses'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License system tables not yet created.',
      'code', 'SCHEMA_NOT_READY'
    );
  END IF;

  -- 查詢授權資訊並關聯創建者資訊（從 public.profiles）
  SELECT json_build_object(
    'success', true,
    'license', json_build_object(
      'id', l.id,
      'license_key', l.license_key,
      'product_name', l.product_name,
      'status', l.status,
      'expiry_date', l.expiry_date,
      'max_devices', l.max_devices,
      'created_at', l.created_at
    ),
    'creator', json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email
    ),
    'devices', (
      SELECT json_agg(json_build_object(
        'machine_id', d.machine_id,
        'machine_name', d.machine_name,
        'ip_address', d.ip_address,
        'status', d.status,
        'last_verified_at', d.last_verified_at
      ))
      FROM software_maintenance.devices d
      WHERE d.license_id = l.id
    )
  ) INTO v_result
  FROM software_maintenance.licenses l
  LEFT JOIN public.profiles p ON l.created_by = p.id  -- 正確引用 public.profiles
  WHERE l.license_key = p_license_key;

  IF v_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License not found',
      'code', 'LICENSE_NOT_FOUND'
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'INTERNAL_ERROR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 授予權限
-- ============================================================================
-- 允許已認證用戶執行這些函數
GRANT EXECUTE ON FUNCTION public.verify_license TO authenticated;
GRANT EXECUTE ON FUNCTION public.deactivate_license TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_license_info TO authenticated;

-- ============================================================================
-- 完成！
-- ============================================================================
COMMENT ON FUNCTION public.verify_license IS '驗證授權碼並記錄機器資訊';
COMMENT ON FUNCTION public.deactivate_license IS '停用特定機器的授權';
COMMENT ON FUNCTION public.get_license_info IS '獲取授權詳細資訊（正確引用 public.profiles）';

-- 顯示完成訊息
DO $$
BEGIN
  RAISE NOTICE '===========================================';
  RAISE NOTICE '✅ 授權系統 RPC 函數已建立完成！';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '已建立的函數:';
  RAISE NOTICE '1. verify_license - 驗證授權碼';
  RAISE NOTICE '2. deactivate_license - 停用授權';
  RAISE NOTICE '3. get_license_info - 獲取授權資訊';
  RAISE NOTICE '===========================================';
  RAISE NOTICE '⚠️  注意：這些函數需要 software_maintenance schema 的表格';
  RAISE NOTICE '   如果表格尚未創建，函數會返回友善的錯誤訊息';
  RAISE NOTICE '   所有對 profiles 的引用都正確使用 public.profiles';
  RAISE NOTICE '===========================================';
END $$;
