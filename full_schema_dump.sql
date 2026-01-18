


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "car_rental";


ALTER SCHEMA "car_rental" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "eip";


ALTER SCHEMA "eip" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "meeting_system";


ALTER SCHEMA "meeting_system" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "payment_approval";


ALTER SCHEMA "payment_approval" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE SCHEMA IF NOT EXISTS "reviews_data";


ALTER SCHEMA "reviews_data" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "service";


ALTER SCHEMA "service" OWNER TO "postgres";


CREATE SCHEMA IF NOT EXISTS "software_maintenance";


ALTER SCHEMA "software_maintenance" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "btree_gist" WITH SCHEMA "public";






CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'staff',
    'unit_manager',
    'accountant',
    'audit_manager',
    'cashier',
    'boss',
    'admin'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "car_rental"."get_current_employee_id"() RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT id FROM public.employees
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1
  );
END;
$$;


ALTER FUNCTION "car_rental"."get_current_employee_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "car_rental"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'hr')
    AND deleted_at IS NULL
  );
END;
$$;


ALTER FUNCTION "car_rental"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "car_rental"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "car_rental"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "eip"."get_unread_announcements_count"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM eip.announcements a
  WHERE a.is_active = true
  AND a.published_at <= NOW()
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
  AND NOT EXISTS (
    SELECT 1 FROM eip.announcement_reads ar
    WHERE ar.announcement_id = a.id AND ar.user_id = auth.uid()
  );
  RETURN unread_count;
END;
$$;


ALTER FUNCTION "eip"."get_unread_announcements_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "eip"."increment_document_download"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE eip.documents SET download_count = download_count + 1 WHERE id = p_document_id;
END;
$$;


ALTER FUNCTION "eip"."increment_document_download"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "eip"."increment_document_view"("p_document_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE eip.documents SET view_count = view_count + 1 WHERE id = p_document_id;
END;
$$;


ALTER FUNCTION "eip"."increment_document_view"("p_document_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "eip"."mark_announcement_as_read"("p_announcement_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO eip.announcement_reads (announcement_id, user_id)
  VALUES (p_announcement_id, auth.uid())
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "eip"."mark_announcement_as_read"("p_announcement_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 因為是 SECURITY DEFINER，這裡的查詢不會觸發 RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'hr')
  );
END;
$$;


ALTER FUNCTION "public"."check_is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_admin_or_hr"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees
    WHERE user_id = auth.uid() -- 對應 Schema 的 user_id
    AND role IN ('admin', 'hr') -- 對應 Schema 的 role
    AND deleted_at IS NULL      -- 對應 Schema 的 deleted_at (確保沒離職)
  );
END;
$$;


ALTER FUNCTION "public"."check_is_admin_or_hr"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_is_own_record"("record_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN record_user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."check_is_own_record"("record_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_license"("p_license_key" "text", "p_machine_id" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."deactivate_license"("p_license_key" "text", "p_machine_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  current_user_role VARCHAR;
  target_user_role VARCHAR;
BEGIN
  -- 檢查當前用戶是否為管理員
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_user_role NOT IN ('admin', 'hr') THEN
    RAISE EXCEPTION 'Permission denied: Only admin or hr can delete users';
  END IF;

  -- 檢查目標用戶角色（不能刪除其他管理員）
  SELECT role INTO target_user_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF target_user_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete admin users';
  END IF;

  -- 先將 employees 的 user_id 設為 NULL（解除關聯）
  UPDATE public.employees
  SET user_id = NULL
  WHERE user_id = target_user_id;

  -- 刪除 profiles 記錄
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 刪除 auth.users 記錄（需要 service_role 權限）
  -- 注意：這需要在 Supabase Dashboard 執行或使用 service_role key
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_full_info"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', row_to_json(p.*),
    'employee', row_to_json(e.*)
  ) INTO result
  FROM public.profiles p
  LEFT JOIN public.employees_with_details e ON p.id = e.user_id
  WHERE p.id = auth.uid();

  RETURN result;
END;
$$;


ALTER FUNCTION "public"."get_current_user_full_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_user_info"() RETURNS TABLE("user_id" "uuid", "email" character varying, "full_name" character varying, "auth_role" character varying, "employee_id" "uuid", "employee_code" character varying, "employee_name" character varying, "department_id" "uuid", "department_name" character varying, "position" character varying, "employee_role" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.user_email as email,
    u.full_name,
    u.auth_role,
    u.employee_id,
    u.employee_code,
    u.employee_name,
    u.department_id,
    u.department_name,
    u."position",
    u.employee_role
  FROM public.users_with_employee_info u
  WHERE u.user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."get_current_user_info"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_by_email"("p_email" character varying) RETURNS TABLE("id" "uuid", "employee_id" character varying, "name" character varying, "email" character varying, "department_name" character varying, "position" character varying, "status" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.employee_id,
    e.name,
    e.email,
    d.name as department_name,
    e.position,
    e.status
  FROM public.employees e
  LEFT JOIN public.departments d ON e.department_id = d.id
  WHERE e.email = p_email
    AND e.deleted_at IS NULL
    AND e.status = 'active';
END;
$$;


ALTER FUNCTION "public"."get_employee_by_email"("p_email" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_employee_by_user_id"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "employee_id" character varying, "name" character varying, "email" character varying, "department_id" "uuid", "department_name" character varying, "position" character varying, "role" character varying, "status" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.employee_id,
    e.name,
    e.email,
    e.department_id,
    d.name as department_name,
    e.position,
    e.role,
    e.status
  FROM public.employees e
  LEFT JOIN public.departments d ON e.department_id = d.id
  WHERE e.user_id = p_user_id
    AND e.deleted_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."get_employee_by_user_id"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_license_info"("p_license_key" "text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."get_license_info"("p_license_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_management_stats"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_profiles', (SELECT COUNT(*) FROM public.profiles),
    'total_employees', (SELECT COUNT(*) FROM public.employees WHERE deleted_at IS NULL),
    'active_employees', (SELECT COUNT(*) FROM public.employees WHERE status = 'active' AND deleted_at IS NULL),
    'total_departments', (SELECT COUNT(*) FROM public.departments WHERE deleted_at IS NULL),
    'active_departments', (SELECT COUNT(*) FROM public.departments WHERE is_active = true AND deleted_at IS NULL),
    'linked_accounts', (SELECT COUNT(*) FROM public.employees WHERE user_id IS NOT NULL AND deleted_at IS NULL),
    'unlinked_employees', (SELECT COUNT(*) FROM public.employees WHERE user_id IS NULL AND deleted_at IS NULL)
  ) INTO stats;

  RETURN stats;
END;
$$;


ALTER FUNCTION "public"."get_management_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_avatar_url"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  avatar_url TEXT;
BEGIN
  SELECT COALESCE(
    e.avatar_url,
    p.avatar_url
  ) INTO avatar_url
  FROM public.profiles p
  LEFT JOIN public.employees e ON p.id = e.user_id AND e.deleted_at IS NULL
  WHERE p.id = user_id;

  RETURN avatar_url;
END;
$$;


ALTER FUNCTION "public"."get_user_avatar_url"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_display_name"("user_id" "uuid") RETURNS character varying
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  display_name VARCHAR;
BEGIN
  SELECT COALESCE(
    e.name,
    p.full_name,
    p.email
  ) INTO display_name
  FROM public.profiles p
  LEFT JOIN public.employees e ON p.id = e.user_id AND e.deleted_at IS NULL
  WHERE p.id = user_id;

  RETURN display_name;
END;
$$;


ALTER FUNCTION "public"."get_user_display_name"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  existing_employee_id UUID;
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- 1. 準備資料
  user_email := NEW.email;
  -- 嘗試從 Metadata 抓名字，抓不到就用 Email 前綴
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1)
  );

  -- ==================================================================
  -- 新增：處理 employees 表格 (這是您原本缺少的關鍵部分)
  -- ==================================================================
  
  -- 2. 檢查 employees 表格是否已經有這個 Email 的資料？
  SELECT id INTO existing_employee_id
  FROM public.employees
  WHERE email = user_email
  AND (user_id IS NULL OR user_id = NEW.id); 

  IF existing_employee_id IS NOT NULL THEN
    -- A. [歸戶模式]：如果有舊資料 (HR 先建好的)，將新帳號綁定上去
    UPDATE public.employees
    SET 
      user_id = NEW.id,           -- 綁定 UUID
      status = 'active',          -- 啟用狀態
      name = COALESCE(name, user_full_name), -- 若原無名字則補上
      updated_at = NOW()
    WHERE id = existing_employee_id;
    
  ELSE
    -- B. [全新模式]：如果完全沒資料，就自動新增一筆
    INSERT INTO public.employees (
      user_id,
      email,
      employee_id,
      name,
      role,
      status,
      is_active,
      created_at
    )
    VALUES (
      NEW.id,
      user_email,
      'TEMP-' || substring(NEW.id::text from 1 for 8), -- 暫時員編
      user_full_name,
      'user',
      'active',
      true,
      NOW()
    );
  END IF;

  -- ==================================================================
  -- 原有的 profiles 邏輯 (保持不變，這部分是好的)
  -- ==================================================================
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 記錄錯誤但不阻擋流程，避免使用者無法註冊
    RAISE WARNING 'User creation handling error: %', SQLERRM;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_update"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.profiles
  set 
    email = new.email,
    -- 【升級版邏輯】
    -- 1. 先試著抓 full_name
    -- 2. 抓不到？試著抓 display_name
    -- 3. 都沒有？那就保留原本 profiles 裡的值 (full_name)
    full_name = COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'display_name', 
      full_name
    )
  where id = new.id;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_user_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."prevent_role_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- 如果嘗試修改 role 欄位
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- 檢查發起請求的人是否為 Admin/HR
    -- 注意：這裡我們直接檢查執行者的權限，若不是 Admin/HR 則擋下
    IF public.check_is_admin_or_hr() = false THEN
      RAISE EXCEPTION 'You are not authorized to change the user role.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."prevent_role_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_profile_to_employee"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- 如果 profiles.full_name 或 email 變更，同步到 employees
  UPDATE public.employees
  SET
    name = CASE
      WHEN NEW.full_name IS NOT NULL AND NEW.full_name != ''
      THEN NEW.full_name
      ELSE name
    END,
    email = CASE
      WHEN NEW.email IS NOT NULL AND NEW.email != ''
      THEN NEW.email
      ELSE email
    END,
    role = CASE
      WHEN NEW.role IS NOT NULL AND NEW.role != ''
      THEN NEW.role
      ELSE role
    END,
    updated_at = NOW()
  WHERE user_id = NEW.id
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_profile_to_employee"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_license"("p_license_key" "text", "p_machine_id" "text", "p_machine_name" "text" DEFAULT NULL::"text", "p_ip_address" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."verify_license"("p_license_key" "text", "p_machine_id" "text", "p_machine_name" "text", "p_ip_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "service"."assign_ticket"("p_ticket_id" "uuid", "p_assignee_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_old_assignee UUID;
BEGIN
  SELECT assignee_id INTO v_old_assignee FROM service.tickets WHERE id = p_ticket_id;
  UPDATE service.tickets
  SET assignee_id = p_assignee_id, assigned_at = NOW(), status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END, updated_at = NOW()
  WHERE id = p_ticket_id;
  INSERT INTO service.ticket_assignments (ticket_id, from_user_id, to_user_id, reason)
  VALUES (p_ticket_id, v_old_assignee, p_assignee_id, p_reason);
END;
$$;


ALTER FUNCTION "service"."assign_ticket"("p_ticket_id" "uuid", "p_assignee_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "service"."generate_ticket_number"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  date_prefix TEXT;
  sequence_num INTEGER;
  new_ticket_number TEXT;
BEGIN
  date_prefix := 'TK' || TO_CHAR(NEW.created_at, 'YYYYMMDD');
  SELECT COALESCE(MAX(SUBSTRING(ticket_number FROM 11)::INTEGER), 0) + 1
  INTO sequence_num
  FROM service.tickets -- 明確指定 schema
  WHERE ticket_number LIKE date_prefix || '%';
  
  new_ticket_number := date_prefix || LPAD(sequence_num::TEXT, 3, '0');
  NEW.ticket_number := new_ticket_number;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "service"."generate_ticket_number"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "service"."get_ticket_statistics"("p_user_id" "uuid" DEFAULT NULL::"uuid", "p_store_id" "uuid" DEFAULT NULL::"uuid", "p_start_date" timestamp without time zone DEFAULT NULL::timestamp without time zone, "p_end_date" timestamp without time zone DEFAULT NULL::timestamp without time zone) RETURNS TABLE("total_tickets" bigint, "open_tickets" bigint, "in_progress_tickets" bigint, "resolved_tickets" bigint, "closed_tickets" bigint, "overdue_tickets" bigint, "avg_resolution_hours" numeric, "avg_rating" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'open')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'closed')::BIGINT,
    COUNT(*) FILTER (WHERE is_overdue = true)::BIGINT,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::NUMERIC,
    AVG(rating)::NUMERIC
  FROM service.tickets
  WHERE (p_user_id IS NULL OR reporter_id = p_user_id OR assignee_id = p_user_id)
    AND (p_store_id IS NULL OR reporter_store_id = p_store_id)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$$;


ALTER FUNCTION "service"."get_ticket_statistics"("p_user_id" "uuid", "p_store_id" "uuid", "p_start_date" timestamp without time zone, "p_end_date" timestamp without time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "service"."log_ticket_history"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO service.ticket_history (ticket_id, user_id, action, new_value, description)
    VALUES (NEW.id, NEW.reporter_id, 'created', NEW.status, '工單已建立');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO service.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status, '狀態變更');
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO service.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'assigned', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT, '指派處理人員');
    END IF;
    IF OLD.priority != NEW.priority THEN
      INSERT INTO service.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority, NEW.priority, '優先度變更');
    END IF;
    IF OLD.rating IS NULL AND NEW.rating IS NOT NULL THEN
      INSERT INTO service.ticket_history (ticket_id, user_id, action, new_value, description)
      VALUES (NEW.id, NEW.reporter_id, 'rated', NEW.rating::TEXT, '服務評分');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "service"."log_ticket_history"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "service"."update_ticket_sla"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.due_at IS NULL AND NEW.category_id IS NOT NULL THEN
    SELECT created_at + (sla_hours || ' hours')::INTERVAL
    INTO NEW.due_at
    FROM service.ticket_categories
    WHERE id = NEW.category_id;
  END IF;
  IF NEW.due_at IS NOT NULL AND NOW() > NEW.due_at AND NEW.status NOT IN ('resolved', 'closed', 'cancelled') THEN
    NEW.is_overdue := true;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "service"."update_ticket_sla"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "software_maintenance"."check_if_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles  -- <--- 這裡修正了
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$;


ALTER FUNCTION "software_maintenance"."check_if_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "software_maintenance"."deactivate_license"("p_license_key" "text", "p_machine_id" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_license RECORD;
    v_activation RECORD;
BEGIN
    SELECT * INTO v_license FROM software_maintenance.licenses WHERE license_key = p_license_key;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'LICENSE_NOT_FOUND'
        );
    END IF;

    UPDATE software_maintenance.activations
    SET is_active = false, deactivated_at = NOW()
    WHERE license_id = v_license.id AND machine_id = p_machine_id AND is_active = true
    RETURNING * INTO v_activation;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACTIVATION_NOT_FOUND'
        );
    END IF;

    UPDATE software_maintenance.licenses
    SET current_activations = GREATEST(0, current_activations - 1)
    WHERE id = v_license.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', '授權已成功停用'
    );
END;
$$;


ALTER FUNCTION "software_maintenance"."deactivate_license"("p_license_key" "text", "p_machine_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "software_maintenance"."generate_license_key"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    v_key TEXT := '';
    v_i INTEGER;
    v_j INTEGER;
BEGIN
    FOR v_i IN 1..4 LOOP
        IF v_i > 1 THEN
            v_key := v_key || '-';
        END IF;
        FOR v_j IN 1..4 LOOP
            v_key := v_key || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
        END LOOP;
    END LOOP;
    RETURN v_key;
END;
$$;


ALTER FUNCTION "software_maintenance"."generate_license_key"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "software_maintenance"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role) -- <--- 這裡修正了
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "software_maintenance"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "software_maintenance"."update_assigned_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active THEN
        UPDATE software_maintenance.licenses
        SET assigned_count = assigned_count + 1
        WHERE id = NEW.license_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active AND NOT NEW.is_active THEN
            UPDATE software_maintenance.licenses
            SET assigned_count = GREATEST(0, assigned_count - 1)
            WHERE id = NEW.license_id;
        ELSIF NOT OLD.is_active AND NEW.is_active THEN
            UPDATE software_maintenance.licenses
            SET assigned_count = assigned_count + 1
            WHERE id = NEW.license_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.is_active THEN
        UPDATE software_maintenance.licenses
        SET assigned_count = GREATEST(0, assigned_count - 1)
        WHERE id = OLD.license_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "software_maintenance"."update_assigned_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "software_maintenance"."update_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "software_maintenance"."update_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "software_maintenance"."verify_license"("p_license_key" "text", "p_machine_id" "text", "p_machine_name" "text" DEFAULT NULL::"text", "p_ip_address" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_license RECORD;
    v_activation RECORD;
    v_result JSONB;
BEGIN
    SELECT l.*, p.name as product_name, p.version as product_version
    INTO v_license
    FROM software_maintenance.licenses l
    LEFT JOIN software_maintenance.products p ON l.product_id = p.id
    WHERE l.license_key = p_license_key;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'LICENSE_NOT_FOUND',
            'message', '授權碼不存在'
        );
    END IF;

    IF v_license.status != 'active' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'LICENSE_' || UPPER(v_license.status),
            'message', '授權碼狀態: ' || v_license.status
        );
    END IF;

    IF v_license.expires_at IS NOT NULL AND v_license.expires_at < NOW() THEN
        UPDATE software_maintenance.licenses SET status = 'expired' WHERE id = v_license.id;
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'LICENSE_EXPIRED',
            'message', '授權碼已過期'
        );
    END IF;

    SELECT * INTO v_activation
    FROM software_maintenance.activations
    WHERE license_id = v_license.id AND machine_id = p_machine_id AND is_active = true;

    IF FOUND THEN
        UPDATE software_maintenance.activations
        SET last_seen_at = NOW(), ip_address = COALESCE(p_ip_address, ip_address)
        WHERE id = v_activation.id;

        RETURN jsonb_build_object(
            'valid', true,
            'license_id', v_license.id,
            'product_name', v_license.product_name,
            'product_version', v_license.product_version,
            'license_type', v_license.license_type,
            'expires_at', v_license.expires_at,
            'activation_id', v_activation.id
        );
    END IF;

    IF v_license.current_activations >= v_license.max_activations THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'MAX_ACTIVATIONS_REACHED',
            'message', '已達到最大啟用數量限制',
            'max_activations', v_license.max_activations
        );
    END IF;

    INSERT INTO software_maintenance.activations (license_id, machine_id, machine_name, ip_address)
    VALUES (v_license.id, p_machine_id, p_machine_name, p_ip_address)
    RETURNING * INTO v_activation;

    UPDATE software_maintenance.licenses
    SET current_activations = current_activations + 1
    WHERE id = v_license.id;

    RETURN jsonb_build_object(
        'valid', true,
        'license_id', v_license.id,
        'product_name', v_license.product_name,
        'product_version', v_license.product_version,
        'license_type', v_license.license_type,
        'expires_at', v_license.expires_at,
        'activation_id', v_activation.id,
        'new_activation', true
    );
END;
$$;


ALTER FUNCTION "software_maintenance"."verify_license"("p_license_key" "text", "p_machine_id" "text", "p_machine_name" "text", "p_ip_address" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "car_rental"."maintenance_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vehicle_id" "uuid" NOT NULL,
    "maintenance_type" character varying(50) NOT NULL,
    "maintenance_date" "date" NOT NULL,
    "mileage_at_maintenance" integer,
    "description" "text" NOT NULL,
    "items" "jsonb",
    "cost" numeric(12,2),
    "vendor" character varying(200),
    "status" character varying(50) DEFAULT 'scheduled'::character varying,
    "attachments" "jsonb",
    "next_maintenance_date" "date",
    "next_maintenance_mileage" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "car_rental"."maintenance_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "car_rental"."rental_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requester_id" "uuid" NOT NULL,
    "requester_name" character varying(100) NOT NULL,
    "requester_department" character varying(100),
    "requester_phone" character varying(50),
    "vehicle_id" "uuid",
    "preferred_vehicle_type" character varying(50),
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "purpose" "text" NOT NULL,
    "destination" character varying(300),
    "estimated_mileage" integer,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "reviewer_id" "uuid",
    "reviewed_at" timestamp with time zone,
    "review_comment" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rental_requests_dates_check" CHECK (("end_date" >= "start_date"))
);


ALTER TABLE "car_rental"."rental_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "car_rental"."rentals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "request_id" "uuid",
    "vehicle_id" "uuid" NOT NULL,
    "renter_id" "uuid" NOT NULL,
    "renter_name" character varying(100) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "actual_start_time" timestamp with time zone,
    "actual_end_time" timestamp with time zone,
    "start_mileage" integer,
    "end_mileage" integer,
    "total_mileage" integer GENERATED ALWAYS AS (("end_mileage" - "start_mileage")) STORED,
    "status" character varying(50) DEFAULT 'confirmed'::character varying,
    "pickup_checklist" "jsonb",
    "return_checklist" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "rentals_dates_check" CHECK (("end_date" >= "start_date")),
    CONSTRAINT "rentals_mileage_check" CHECK ((("end_mileage" IS NULL) OR ("start_mileage" IS NULL) OR ("end_mileage" >= "start_mileage")))
);


ALTER TABLE "car_rental"."rentals" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "car_rental"."vehicles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "plate_number" character varying(20) NOT NULL,
    "brand" character varying(100) NOT NULL,
    "model" character varying(100) NOT NULL,
    "year" integer NOT NULL,
    "color" character varying(50),
    "vehicle_type" character varying(50) NOT NULL,
    "seating_capacity" integer DEFAULT 5,
    "fuel_type" character varying(50),
    "transmission" character varying(50),
    "status" character varying(50) DEFAULT 'available'::character varying,
    "current_mileage" integer DEFAULT 0,
    "insurance_expiry" "date",
    "inspection_expiry" "date",
    "purchase_date" "date",
    "purchase_price" numeric(12,2),
    "location" character varying(200),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "vehicles_year_check" CHECK ((("year" >= 1900) AND (("year")::numeric <= (EXTRACT(year FROM "now"()) + (1)::numeric))))
);


ALTER TABLE "car_rental"."vehicles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "eip"."announcement_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "announcement_id" "uuid",
    "user_id" "uuid",
    "read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "eip"."announcement_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "eip"."announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text",
    "type" "text" DEFAULT 'general'::"text",
    "author_id" "uuid",
    "target_departments" "text"[],
    "target_stores" "text"[],
    "require_read_confirmation" boolean DEFAULT false,
    "expires_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "attachments" "jsonb",
    "published_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "announcements_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "announcements_type_check" CHECK (("type" = ANY (ARRAY['general'::"text", 'emergency'::"text", 'maintenance'::"text", 'event'::"text"])))
);


ALTER TABLE "eip"."announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "eip"."document_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "parent_id" "uuid",
    "icon" "text" DEFAULT 'Folder'::"text",
    "color" "text" DEFAULT 'blue'::"text",
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "eip"."document_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "eip"."document_favorites" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "eip"."document_favorites" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "eip"."document_versions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "document_id" "uuid",
    "version" integer NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "file_url" "text",
    "file_name" "text",
    "changes_description" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "eip"."document_versions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "eip"."documents" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "category_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "content" "text",
    "file_url" "text",
    "file_name" "text",
    "file_size" bigint,
    "file_type" "text",
    "version" integer DEFAULT 1,
    "is_latest" boolean DEFAULT true,
    "status" "text" DEFAULT 'draft'::"text",
    "tags" "text"[],
    "author_id" "uuid",
    "published_at" timestamp with time zone,
    "view_count" integer DEFAULT 0,
    "download_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "documents_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'published'::"text", 'archived'::"text"])))
);


ALTER TABLE "eip"."documents" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "meeting_system"."bookings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid",
    "user_id" "uuid",
    "title" character varying(200) NOT NULL,
    "description" "text",
    "booking_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "period" "tsrange" GENERATED ALWAYS AS ("tsrange"(("booking_date" + "start_time"), ("booking_date" + "end_time"), '[)'::"text")) STORED,
    "attendees_count" integer DEFAULT 0,
    "booker_name" character varying(100) NOT NULL,
    "booker_email" character varying(200),
    "booker_phone" character varying(50),
    "status" character varying(20) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_time_range" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "meeting_system"."bookings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "meeting_system"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "location" character varying(100),
    "capacity" integer DEFAULT 0,
    "amenities" "text"[] DEFAULT '{}'::"text"[],
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "meeting_system"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payment_approval"."bank_branches" (
    "id" bigint NOT NULL,
    "bank_code" "text",
    "bank_name" "text",
    "branch_code" "text",
    "branch_name" "text",
    "zip_code" "text",
    "address" "text",
    "phone" "text",
    "manager" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "payment_approval"."bank_branches" OWNER TO "postgres";


ALTER TABLE "payment_approval"."bank_branches" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "payment_approval"."bank_branches_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "payment_approval"."banks" (
    "bank_code" "text" NOT NULL,
    "bank_name" "text" NOT NULL
);


ALTER TABLE "payment_approval"."banks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "payment_approval"."branches" (
    "id" bigint NOT NULL,
    "bank_code" "text" NOT NULL,
    "branch_code" "text" NOT NULL,
    "branch_name" "text" NOT NULL
);


ALTER TABLE "payment_approval"."branches" OWNER TO "postgres";


ALTER TABLE "payment_approval"."branches" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "payment_approval"."branches_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "payment_approval"."brands" (
    "id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "code" "text"
);


ALTER TABLE "payment_approval"."brands" OWNER TO "postgres";


ALTER TABLE "payment_approval"."brands" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "payment_approval"."brands_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "payment_approval"."payment_requests" (
    "id" bigint NOT NULL,
    "brand" "text" NOT NULL,
    "store" "text" NOT NULL,
    "payment_date" "date" NOT NULL,
    "payee_name" "text" NOT NULL,
    "content" "text" NOT NULL,
    "tax_type" "text" NOT NULL,
    "amount" numeric NOT NULL,
    "payment_method" "text" NOT NULL,
    "payment_method_other" "text",
    "handling_fee" numeric DEFAULT 0,
    "bank_name" "text",
    "bank_code" "text",
    "bank_branch" "text",
    "branch_code" "text",
    "account_number" "text",
    "has_attachment" boolean DEFAULT false,
    "attachment_desc" "text",
    "has_invoice" "text",
    "invoice_date" "date",
    "remarks" "text",
    "creator_name" "text",
    "apply_date" "date" DEFAULT CURRENT_DATE,
    "status" "text" DEFAULT 'pending_approval'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "current_step" integer DEFAULT 1,
    "rejection_reason" "text",
    "sign_manager_url" "text",
    "sign_manager_at" timestamp with time zone,
    "sign_manager_by" "uuid",
    "sign_accountant_url" "text",
    "sign_accountant_at" timestamp with time zone,
    "sign_accountant_by" "uuid",
    "sign_audit_url" "text",
    "sign_audit_at" timestamp with time zone,
    "sign_audit_by" "uuid",
    "sign_cashier_url" "text",
    "sign_cashier_at" timestamp with time zone,
    "sign_cashier_by" "uuid",
    "sign_boss_url" "text",
    "sign_boss_at" timestamp with time zone,
    "sign_boss_by" "uuid",
    "signature_url" "text",
    "attachment_url" "text",
    "is_paper_received" boolean DEFAULT false,
    "applicant_id" "uuid" DEFAULT "auth"."uid"(),
    CONSTRAINT "payment_requests_amount_check" CHECK (("amount" >= (0)::numeric)),
    CONSTRAINT "payment_requests_has_invoice_check" CHECK (("has_invoice" = ANY (ARRAY['yes'::"text", 'no_yet'::"text", 'none'::"text"]))),
    CONSTRAINT "payment_requests_payment_method_check" CHECK (("payment_method" = ANY (ARRAY['transfer'::"text", 'cash'::"text", 'other'::"text"]))),
    CONSTRAINT "payment_requests_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'pending_unit_manager'::"text", 'pending_accountant'::"text", 'pending_audit_manager'::"text", 'pending_cashier'::"text", 'pending_boss'::"text", 'completed'::"text", 'rejected'::"text", 'revoked'::"text"]))),
    CONSTRAINT "payment_requests_tax_type_check" CHECK (("tax_type" = ANY (ARRAY['tax_included'::"text", 'tax_excluded'::"text"])))
);


ALTER TABLE "payment_approval"."payment_requests" OWNER TO "postgres";


ALTER TABLE "payment_approval"."payment_requests" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "payment_approval"."payment_requests_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "payment_approval"."stores" (
    "id" bigint NOT NULL,
    "brand_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "is_active" boolean DEFAULT true
);


ALTER TABLE "payment_approval"."stores" OWNER TO "postgres";


ALTER TABLE "payment_approval"."stores" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "payment_approval"."stores_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."brands" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."brands" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."departments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "code" character varying(20),
    "description" "text",
    "manager_id" "uuid",
    "parent_department_id" "uuid",
    "email" character varying(255),
    "phone" character varying(50),
    "location" character varying(200),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."departments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "employee_id" character varying(50) NOT NULL,
    "name" character varying(100) NOT NULL,
    "name_en" character varying(100),
    "email" character varying(255),
    "phone" character varying(50),
    "mobile" character varying(50),
    "extension" character varying(20),
    "department_id" "uuid",
    "position" character varying(100),
    "job_title" character varying(100),
    "employee_type" character varying(50) DEFAULT 'full-time'::character varying,
    "level" character varying(50),
    "supervisor_id" "uuid",
    "hire_date" "date",
    "contract_start_date" "date",
    "contract_end_date" "date",
    "probation_end_date" "date",
    "resignation_date" "date",
    "office_location" character varying(200),
    "work_location" character varying(200),
    "seat_number" character varying(50),
    "id_number" character varying(50),
    "passport_number" character varying(50),
    "birth_date" "date",
    "gender" character varying(20),
    "nationality" character varying(50),
    "emergency_contact_name" character varying(100),
    "emergency_contact_phone" character varying(50),
    "emergency_contact_relationship" character varying(50),
    "bank_name" character varying(100),
    "bank_account" character varying(100),
    "status" character varying(50) DEFAULT 'active'::character varying,
    "is_active" boolean DEFAULT true,
    "role" character varying(50) DEFAULT 'user'::character varying,
    "permissions" "jsonb" DEFAULT '[]'::"jsonb",
    "notes" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "deleted_at" timestamp with time zone,
    CONSTRAINT "employees_email_check" CHECK ((("email")::"text" ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::"text")),
    CONSTRAINT "employees_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('on_leave'::character varying)::"text", ('resigned'::character varying)::"text", ('terminated'::character varying)::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."employees_with_details" AS
 SELECT "e"."id",
    "e"."user_id",
    "e"."employee_id",
    "e"."name",
    "e"."name_en",
    "e"."email",
    "e"."phone",
    "e"."mobile",
    "e"."extension",
    "e"."department_id",
    "e"."position",
    "e"."job_title",
    "e"."employee_type",
    "e"."level",
    "e"."supervisor_id",
    "e"."hire_date",
    "e"."contract_start_date",
    "e"."contract_end_date",
    "e"."probation_end_date",
    "e"."resignation_date",
    "e"."office_location",
    "e"."work_location",
    "e"."seat_number",
    "e"."id_number",
    "e"."passport_number",
    "e"."birth_date",
    "e"."gender",
    "e"."nationality",
    "e"."emergency_contact_name",
    "e"."emergency_contact_phone",
    "e"."emergency_contact_relationship",
    "e"."bank_name",
    "e"."bank_account",
    "e"."status",
    "e"."is_active",
    "e"."role",
    "e"."permissions",
    "e"."notes",
    "e"."avatar_url",
    "e"."created_at",
    "e"."updated_at",
    "e"."created_by",
    "e"."deleted_at",
    "d"."name" AS "department_name",
    "d"."code" AS "department_code",
    "s"."name" AS "supervisor_name",
    "s"."employee_id" AS "supervisor_employee_id"
   FROM (("public"."employees" "e"
     LEFT JOIN "public"."departments" "d" ON ((("e"."department_id" = "d"."id") AND ("d"."deleted_at" IS NULL))))
     LEFT JOIN "public"."employees" "s" ON ((("e"."supervisor_id" = "s"."id") AND ("s"."deleted_at" IS NULL))))
  WHERE ("e"."deleted_at" IS NULL);


ALTER VIEW "public"."employees_with_details" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "role" character varying(50) DEFAULT 'user'::character varying,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "avatar_url" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "code" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."users_with_employee_info" AS
 SELECT "p"."id" AS "user_id",
    "p"."email" AS "user_email",
    "p"."full_name",
    "p"."avatar_url",
    "p"."role" AS "auth_role",
    "e"."id" AS "employee_id",
    "e"."employee_id" AS "employee_code",
    "e"."name" AS "employee_name",
    "e"."department_id",
    "d"."name" AS "department_name",
    "e"."position",
    "e"."job_title",
    "e"."status" AS "employee_status",
    "e"."role" AS "employee_role"
   FROM (("public"."profiles" "p"
     LEFT JOIN "public"."employees" "e" ON ((("p"."id" = "e"."user_id") AND ("e"."deleted_at" IS NULL))))
     LEFT JOIN "public"."departments" "d" ON ((("e"."department_id" = "d"."id") AND ("d"."deleted_at" IS NULL))));


ALTER VIEW "public"."users_with_employee_info" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "reviews_data"."brands" (
    "brand_id" bigint NOT NULL,
    "name" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "code" "text"
);


ALTER TABLE "reviews_data"."brands" OWNER TO "postgres";


ALTER TABLE "reviews_data"."brands" ALTER COLUMN "brand_id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "reviews_data"."brands_brand_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "reviews_data"."places" (
    "id" bigint NOT NULL,
    "place_id" "text" NOT NULL,
    "name" "text",
    "description" "text",
    "address" "text",
    "main_category" "text",
    "categories" "jsonb",
    "rating" numeric,
    "review_count" integer,
    "review_keywords" "jsonb",
    "reviews_per_rating" "jsonb",
    "price_range" "text",
    "phone" "text",
    "website" "text",
    "google_maps_link" "text",
    "reviews_link" "text",
    "cid" "text",
    "data_id" "text",
    "lat" double precision,
    "lng" double precision,
    "plus_code" "text",
    "detailed_address" "jsonb",
    "featured_image" "text",
    "images" "jsonb",
    "about" "jsonb",
    "menu" "jsonb",
    "reservations" "jsonb",
    "order_online_links" "jsonb",
    "competitors" "jsonb",
    "opening_hours" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "brand_id" bigint
);


ALTER TABLE "reviews_data"."places" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "reviews_data"."reviews" (
    "review_id" "text" NOT NULL,
    "place_id" "text" NOT NULL,
    "rating" numeric,
    "review_link" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "published_at" "text",
    "published_at_date" "text",
    "review_text" "text",
    "sentiment" "text",
    "tags" "text"[]
);


ALTER TABLE "reviews_data"."reviews" OWNER TO "postgres";


CREATE OR REPLACE VIEW "reviews_data"."full_reviews_view" AS
 SELECT "b"."brand_id",
    "b"."name" AS "brand_name",
    "p"."name" AS "place_name",
    "p"."rating" AS "place_rating",
    "p"."review_count",
    "r"."rating" AS "user_rating",
    "r"."review_text",
    "r"."published_at_date"
   FROM (("reviews_data"."reviews" "r"
     JOIN "reviews_data"."places" "p" ON (("r"."place_id" = "p"."place_id")))
     LEFT JOIN "reviews_data"."brands" "b" ON (("p"."brand_id" = "b"."brand_id")));


ALTER VIEW "reviews_data"."full_reviews_view" OWNER TO "postgres";


ALTER TABLE "reviews_data"."places" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "reviews_data"."places_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "service"."ticket_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "from_user_id" "uuid",
    "to_user_id" "uuid" NOT NULL,
    "reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "service"."ticket_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "service"."ticket_categories" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "icon" "text" DEFAULT 'Tool'::"text",
    "color" "text" DEFAULT 'blue'::"text",
    "department" "text",
    "sla_hours" integer DEFAULT 24,
    "is_active" boolean DEFAULT true,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "service"."ticket_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "service"."ticket_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "comment" "text" NOT NULL,
    "is_internal" boolean DEFAULT false,
    "attachments" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "service"."ticket_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "service"."ticket_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "service"."ticket_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "service"."tickets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "ticket_number" "text" NOT NULL,
    "category_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "priority" "text" DEFAULT 'normal'::"text",
    "status" "text" DEFAULT 'open'::"text",
    "reporter_id" "uuid" NOT NULL,
    "reporter_store_id" "uuid",
    "reporter_department" "text",
    "reporter_phone" "text",
    "location" "text",
    "assignee_id" "uuid",
    "assigned_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "due_at" timestamp with time zone,
    "is_overdue" boolean DEFAULT false,
    "attachments" "jsonb",
    "rating" integer,
    "feedback" "text",
    "rated_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tickets_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'normal'::"text", 'high'::"text", 'urgent'::"text"]))),
    CONSTRAINT "tickets_rating_check" CHECK ((("rating" >= 1) AND ("rating" <= 5))),
    CONSTRAINT "tickets_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'assigned'::"text", 'in_progress'::"text", 'pending'::"text", 'resolved'::"text", 'closed'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "service"."tickets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "software_maintenance"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "old_values" "jsonb",
    "new_values" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "software_maintenance"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "software_maintenance"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(100) NOT NULL,
    "device_type" character varying(50) DEFAULT 'desktop'::character varying,
    "serial_number" character varying(100),
    "mac_address" character varying(50),
    "ip_address" character varying(50),
    "location" character varying(200),
    "employee_id" "uuid",
    "purchase_date" "date",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "software_maintenance"."devices" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "software_maintenance"."license_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "license_id" "uuid" NOT NULL,
    "employee_id" "uuid" NOT NULL,
    "assigned_date" "date" DEFAULT CURRENT_DATE,
    "unassigned_date" "date",
    "computer_name" "text",
    "computer_serial" "text",
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "assigned_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "device_id" "uuid"
);


ALTER TABLE "software_maintenance"."license_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "software_maintenance"."licenses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "software_id" "uuid",
    "license_key" "text",
    "license_type" "text" NOT NULL,
    "quantity" integer DEFAULT 1,
    "assigned_count" integer DEFAULT 0,
    "purchase_date" "date",
    "expiry_date" "date",
    "purchase_price" numeric(10,2),
    "currency" "text" DEFAULT 'TWD'::"text",
    "purchase_from" "text",
    "invoice_number" "text",
    "order_number" "text",
    "status" "text" DEFAULT 'active'::"text",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "renewal_price" numeric(10,2),
    "vendor_contact" "text",
    "license_model" "text",
    CONSTRAINT "licenses_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'expired'::"text", 'cancelled'::"text", 'pending'::"text"])))
);


ALTER TABLE "software_maintenance"."licenses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "software_maintenance"."software" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid",
    "name" "text" NOT NULL,
    "category" "text",
    "version" "text",
    "description" "text",
    "license_model" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "software_license_model_check" CHECK (("license_model" = ANY (ARRAY['subscription'::"text", 'perpetual'::"text", 'volume'::"text", 'oem'::"text", 'free'::"text"])))
);


ALTER TABLE "software_maintenance"."software" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "software_maintenance"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "website" "text",
    "support_email" "text",
    "support_phone" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "software_maintenance"."vendors" OWNER TO "postgres";


CREATE OR REPLACE VIEW "software_maintenance"."license_summary" AS
 SELECT "l"."id" AS "license_id",
    "s"."name" AS "software_name",
    "s"."category",
    "v"."name" AS "vendor_name",
    "l"."license_type",
    "l"."quantity",
    "l"."assigned_count",
    ("l"."quantity" - "l"."assigned_count") AS "available_count",
    "l"."expiry_date",
        CASE
            WHEN ("l"."expiry_date" IS NULL) THEN NULL::integer
            WHEN ("l"."expiry_date" < CURRENT_DATE) THEN 0
            ELSE ("l"."expiry_date" - CURRENT_DATE)
        END AS "days_until_expiry",
    "l"."status"
   FROM (("software_maintenance"."licenses" "l"
     LEFT JOIN "software_maintenance"."software" "s" ON (("l"."software_id" = "s"."id")))
     LEFT JOIN "software_maintenance"."vendors" "v" ON (("s"."vendor_id" = "v"."id")));


ALTER VIEW "software_maintenance"."license_summary" OWNER TO "postgres";


ALTER TABLE ONLY "car_rental"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "car_rental"."rental_requests"
    ADD CONSTRAINT "rental_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "car_rental"."rentals"
    ADD CONSTRAINT "rentals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "car_rental"."vehicles"
    ADD CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "car_rental"."vehicles"
    ADD CONSTRAINT "vehicles_plate_number_key" UNIQUE ("plate_number");



ALTER TABLE ONLY "eip"."announcement_reads"
    ADD CONSTRAINT "announcement_reads_announcement_id_user_id_key" UNIQUE ("announcement_id", "user_id");



ALTER TABLE ONLY "eip"."announcement_reads"
    ADD CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "eip"."announcements"
    ADD CONSTRAINT "announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "eip"."document_categories"
    ADD CONSTRAINT "document_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "eip"."document_favorites"
    ADD CONSTRAINT "document_favorites_document_id_user_id_key" UNIQUE ("document_id", "user_id");



ALTER TABLE ONLY "eip"."document_favorites"
    ADD CONSTRAINT "document_favorites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "eip"."document_versions"
    ADD CONSTRAINT "document_versions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "eip"."documents"
    ADD CONSTRAINT "documents_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "meeting_system"."bookings"
    ADD CONSTRAINT "bookings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "meeting_system"."bookings"
    ADD CONSTRAINT "no_overlapping_bookings" EXCLUDE USING "gist" ("room_id" WITH =, "period" WITH &&) WHERE ((("status")::"text" <> 'cancelled'::"text"));



ALTER TABLE ONLY "meeting_system"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payment_approval"."bank_branches"
    ADD CONSTRAINT "bank_branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payment_approval"."banks"
    ADD CONSTRAINT "banks_pkey" PRIMARY KEY ("bank_code");



ALTER TABLE ONLY "payment_approval"."branches"
    ADD CONSTRAINT "branches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payment_approval"."brands"
    ADD CONSTRAINT "brands_name_key" UNIQUE ("name");



ALTER TABLE ONLY "payment_approval"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payment_approval"."payment_requests"
    ADD CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "payment_approval"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_employee_id_key" UNIQUE ("employee_id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "reviews_data"."brands"
    ADD CONSTRAINT "brands_name_key" UNIQUE ("name");



ALTER TABLE ONLY "reviews_data"."brands"
    ADD CONSTRAINT "brands_pkey" PRIMARY KEY ("brand_id");



ALTER TABLE ONLY "reviews_data"."places"
    ADD CONSTRAINT "places_pkey" PRIMARY KEY ("place_id");



ALTER TABLE ONLY "reviews_data"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("review_id");



ALTER TABLE ONLY "service"."ticket_assignments"
    ADD CONSTRAINT "ticket_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "service"."ticket_categories"
    ADD CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "service"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "service"."ticket_history"
    ADD CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "service"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "service"."tickets"
    ADD CONSTRAINT "tickets_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "software_maintenance"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "software_maintenance"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "software_maintenance"."license_assignments"
    ADD CONSTRAINT "license_assignments_license_id_employee_id_is_active_key" UNIQUE ("license_id", "employee_id", "is_active");



ALTER TABLE ONLY "software_maintenance"."license_assignments"
    ADD CONSTRAINT "license_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "software_maintenance"."licenses"
    ADD CONSTRAINT "licenses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "software_maintenance"."software"
    ADD CONSTRAINT "software_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "software_maintenance"."software"
    ADD CONSTRAINT "uk_software_name" UNIQUE ("name");



ALTER TABLE ONLY "software_maintenance"."vendors"
    ADD CONSTRAINT "vendors_name_key" UNIQUE ("name");



ALTER TABLE ONLY "software_maintenance"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_maintenance_date" ON "car_rental"."maintenance_records" USING "btree" ("maintenance_date");



CREATE INDEX "idx_maintenance_type" ON "car_rental"."maintenance_records" USING "btree" ("maintenance_type");



CREATE INDEX "idx_maintenance_vehicle" ON "car_rental"."maintenance_records" USING "btree" ("vehicle_id");



CREATE INDEX "idx_rental_requests_dates" ON "car_rental"."rental_requests" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_rental_requests_requester" ON "car_rental"."rental_requests" USING "btree" ("requester_id");



CREATE INDEX "idx_rental_requests_status" ON "car_rental"."rental_requests" USING "btree" ("status");



CREATE INDEX "idx_rentals_dates" ON "car_rental"."rentals" USING "btree" ("start_date", "end_date");



CREATE INDEX "idx_rentals_renter" ON "car_rental"."rentals" USING "btree" ("renter_id");



CREATE INDEX "idx_rentals_status" ON "car_rental"."rentals" USING "btree" ("status");



CREATE INDEX "idx_rentals_vehicle" ON "car_rental"."rentals" USING "btree" ("vehicle_id");



CREATE INDEX "idx_vehicles_plate" ON "car_rental"."vehicles" USING "btree" ("plate_number") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_vehicles_status" ON "car_rental"."vehicles" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_vehicles_type" ON "car_rental"."vehicles" USING "btree" ("vehicle_type") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_announcement_reads_announcement" ON "eip"."announcement_reads" USING "btree" ("announcement_id");



CREATE INDEX "idx_announcement_reads_user" ON "eip"."announcement_reads" USING "btree" ("user_id");



CREATE INDEX "idx_announcements_active" ON "eip"."announcements" USING "btree" ("is_active");



CREATE INDEX "idx_announcements_published" ON "eip"."announcements" USING "btree" ("published_at");



CREATE INDEX "idx_documents_author" ON "eip"."documents" USING "btree" ("author_id");



CREATE INDEX "idx_documents_category" ON "eip"."documents" USING "btree" ("category_id");



CREATE INDEX "idx_documents_status" ON "eip"."documents" USING "btree" ("status");



CREATE INDEX "idx_documents_tags" ON "eip"."documents" USING "gin" ("tags");



CREATE INDEX "idx_bookings_room_date" ON "meeting_system"."bookings" USING "btree" ("room_id", "booking_date");



CREATE INDEX "idx_bookings_user" ON "meeting_system"."bookings" USING "btree" ("user_id");



CREATE INDEX "idx_rooms_is_active" ON "meeting_system"."rooms" USING "btree" ("is_active");



CREATE INDEX "idx_bank_branches_code" ON "payment_approval"."bank_branches" USING "btree" ("bank_code");



CREATE INDEX "idx_payment_requests_brand" ON "payment_approval"."payment_requests" USING "btree" ("brand");



CREATE INDEX "idx_payment_requests_created_at" ON "payment_approval"."payment_requests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_payment_requests_date" ON "payment_approval"."payment_requests" USING "btree" ("payment_date");



CREATE INDEX "idx_payment_requests_status" ON "payment_approval"."payment_requests" USING "btree" ("status");



CREATE INDEX "idx_stores_brand_id" ON "payment_approval"."stores" USING "btree" ("brand_id");



CREATE INDEX "idx_brands_name" ON "public"."brands" USING "btree" ("name");



CREATE INDEX "idx_departments_is_active" ON "public"."departments" USING "btree" ("is_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_departments_parent" ON "public"."departments" USING "btree" ("parent_department_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_department" ON "public"."employees" USING "btree" ("department_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_email" ON "public"."employees" USING "btree" ("email") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_employee_id" ON "public"."employees" USING "btree" ("employee_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_name" ON "public"."employees" USING "btree" ("name") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_status" ON "public"."employees" USING "btree" ("status") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_supervisor" ON "public"."employees" USING "btree" ("supervisor_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_employees_user_id" ON "public"."employees" USING "btree" ("user_id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_stores_brand_id" ON "public"."stores" USING "btree" ("brand_id");



CREATE INDEX "idx_stores_is_active" ON "public"."stores" USING "btree" ("is_active");



CREATE INDEX "idx_stores_name" ON "public"."stores" USING "btree" ("name");



CREATE INDEX "idx_places_lat_lng" ON "reviews_data"."places" USING "btree" ("lat", "lng");



CREATE INDEX "idx_places_name" ON "reviews_data"."places" USING "btree" ("name");



CREATE INDEX "idx_places_rating" ON "reviews_data"."places" USING "btree" ("rating");



CREATE INDEX "idx_reviews_place_id" ON "reviews_data"."reviews" USING "btree" ("place_id");



CREATE INDEX "idx_ticket_comments_ticket" ON "service"."ticket_comments" USING "btree" ("ticket_id");



CREATE INDEX "idx_ticket_history_ticket" ON "service"."ticket_history" USING "btree" ("ticket_id");



CREATE INDEX "idx_tickets_assignee" ON "service"."tickets" USING "btree" ("assignee_id");



CREATE INDEX "idx_tickets_reporter" ON "service"."tickets" USING "btree" ("reporter_id");



CREATE INDEX "idx_tickets_status" ON "service"."tickets" USING "btree" ("status");



CREATE INDEX "idx_assignments_active" ON "software_maintenance"."license_assignments" USING "btree" ("is_active");



CREATE INDEX "idx_assignments_employee" ON "software_maintenance"."license_assignments" USING "btree" ("employee_id");



CREATE INDEX "idx_assignments_license" ON "software_maintenance"."license_assignments" USING "btree" ("license_id");



CREATE INDEX "idx_licenses_expiry" ON "software_maintenance"."licenses" USING "btree" ("expiry_date");



CREATE INDEX "idx_licenses_software" ON "software_maintenance"."licenses" USING "btree" ("software_id");



CREATE INDEX "idx_licenses_status" ON "software_maintenance"."licenses" USING "btree" ("status");



CREATE INDEX "idx_software_category" ON "software_maintenance"."software" USING "btree" ("category");



CREATE INDEX "idx_software_vendor" ON "software_maintenance"."software" USING "btree" ("vendor_id");



CREATE OR REPLACE TRIGGER "update_maintenance_updated_at" BEFORE UPDATE ON "car_rental"."maintenance_records" FOR EACH ROW EXECUTE FUNCTION "car_rental"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rental_requests_updated_at" BEFORE UPDATE ON "car_rental"."rental_requests" FOR EACH ROW EXECUTE FUNCTION "car_rental"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_rentals_updated_at" BEFORE UPDATE ON "car_rental"."rentals" FOR EACH ROW EXECUTE FUNCTION "car_rental"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vehicles_updated_at" BEFORE UPDATE ON "car_rental"."vehicles" FOR EACH ROW EXECUTE FUNCTION "car_rental"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "check_role_change" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."prevent_role_change"();



CREATE OR REPLACE TRIGGER "sync_profile_to_employee_trigger" AFTER UPDATE ON "public"."profiles" FOR EACH ROW WHEN ((("old"."full_name" IS DISTINCT FROM "new"."full_name") OR ("old"."email" IS DISTINCT FROM "new"."email") OR (("old"."role")::"text" IS DISTINCT FROM ("new"."role")::"text"))) EXECUTE FUNCTION "public"."sync_profile_to_employee"();



CREATE OR REPLACE TRIGGER "update_brands_updated_at" BEFORE UPDATE ON "public"."brands" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_departments_updated_at" BEFORE UPDATE ON "public"."departments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_stores_updated_at" BEFORE UPDATE ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "check_ticket_sla" BEFORE INSERT OR UPDATE ON "service"."tickets" FOR EACH ROW EXECUTE FUNCTION "service"."update_ticket_sla"();



CREATE OR REPLACE TRIGGER "log_ticket_changes" AFTER INSERT OR UPDATE ON "service"."tickets" FOR EACH ROW EXECUTE FUNCTION "service"."log_ticket_history"();



CREATE OR REPLACE TRIGGER "set_ticket_number" BEFORE INSERT ON "service"."tickets" FOR EACH ROW WHEN (("new"."ticket_number" IS NULL)) EXECUTE FUNCTION "service"."generate_ticket_number"();



CREATE OR REPLACE TRIGGER "assignments_updated_at" BEFORE UPDATE ON "software_maintenance"."license_assignments" FOR EACH ROW EXECUTE FUNCTION "software_maintenance"."update_updated_at"();



CREATE OR REPLACE TRIGGER "licenses_updated_at" BEFORE UPDATE ON "software_maintenance"."licenses" FOR EACH ROW EXECUTE FUNCTION "software_maintenance"."update_updated_at"();



CREATE OR REPLACE TRIGGER "software_updated_at" BEFORE UPDATE ON "software_maintenance"."software" FOR EACH ROW EXECUTE FUNCTION "software_maintenance"."update_updated_at"();



CREATE OR REPLACE TRIGGER "update_license_assigned_count" AFTER INSERT OR DELETE OR UPDATE ON "software_maintenance"."license_assignments" FOR EACH ROW EXECUTE FUNCTION "software_maintenance"."update_assigned_count"();



CREATE OR REPLACE TRIGGER "vendors_updated_at" BEFORE UPDATE ON "software_maintenance"."vendors" FOR EACH ROW EXECUTE FUNCTION "software_maintenance"."update_updated_at"();



ALTER TABLE ONLY "car_rental"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "car_rental"."maintenance_records"
    ADD CONSTRAINT "maintenance_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "car_rental"."vehicles"("id");



ALTER TABLE ONLY "car_rental"."rental_requests"
    ADD CONSTRAINT "rental_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "car_rental"."rental_requests"
    ADD CONSTRAINT "rental_requests_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "car_rental"."rental_requests"
    ADD CONSTRAINT "rental_requests_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "car_rental"."vehicles"("id");



ALTER TABLE ONLY "car_rental"."rentals"
    ADD CONSTRAINT "rentals_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "car_rental"."rentals"
    ADD CONSTRAINT "rentals_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "car_rental"."rental_requests"("id");



ALTER TABLE ONLY "car_rental"."rentals"
    ADD CONSTRAINT "rentals_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "car_rental"."vehicles"("id");



ALTER TABLE ONLY "car_rental"."vehicles"
    ADD CONSTRAINT "vehicles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "eip"."announcement_reads"
    ADD CONSTRAINT "announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "eip"."announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "eip"."announcement_reads"
    ADD CONSTRAINT "announcement_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "eip"."announcements"
    ADD CONSTRAINT "announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "eip"."document_categories"
    ADD CONSTRAINT "document_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "eip"."document_categories"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "eip"."document_favorites"
    ADD CONSTRAINT "document_favorites_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "eip"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "eip"."document_favorites"
    ADD CONSTRAINT "document_favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "eip"."document_versions"
    ADD CONSTRAINT "document_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "eip"."document_versions"
    ADD CONSTRAINT "document_versions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "eip"."documents"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "eip"."documents"
    ADD CONSTRAINT "documents_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "eip"."documents"
    ADD CONSTRAINT "documents_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "eip"."document_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "meeting_system"."bookings"
    ADD CONSTRAINT "bookings_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "meeting_system"."rooms"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "meeting_system"."bookings"
    ADD CONSTRAINT "bookings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "payment_approval"."branches"
    ADD CONSTRAINT "branches_bank_code_fkey" FOREIGN KEY ("bank_code") REFERENCES "payment_approval"."banks"("bank_code");



ALTER TABLE ONLY "payment_approval"."payment_requests"
    ADD CONSTRAINT "payment_requests_applicant_id_fkey" FOREIGN KEY ("applicant_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "payment_approval"."stores"
    ADD CONSTRAINT "stores_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "payment_approval"."brands"("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "departments_parent_department_id_fkey" FOREIGN KEY ("parent_department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."departments"
    ADD CONSTRAINT "fk_departments_manager" FOREIGN KEY ("manager_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "fk_employees_department" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "fk_employees_departments" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "reviews_data"."places"
    ADD CONSTRAINT "fk_places_brand" FOREIGN KEY ("brand_id") REFERENCES "reviews_data"."brands"("brand_id");



ALTER TABLE ONLY "reviews_data"."reviews"
    ADD CONSTRAINT "fk_reviews_place" FOREIGN KEY ("place_id") REFERENCES "reviews_data"."places"("place_id") ON DELETE CASCADE;



ALTER TABLE ONLY "service"."ticket_assignments"
    ADD CONSTRAINT "ticket_assignments_from_user_id_fkey" FOREIGN KEY ("from_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "service"."ticket_assignments"
    ADD CONSTRAINT "ticket_assignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "service"."ticket_assignments"
    ADD CONSTRAINT "ticket_assignments_to_user_id_fkey" FOREIGN KEY ("to_user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "service"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "service"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "service"."ticket_history"
    ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "service"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "service"."ticket_history"
    ADD CONSTRAINT "ticket_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "service"."tickets"
    ADD CONSTRAINT "tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "service"."tickets"
    ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service"."ticket_categories"("id");



ALTER TABLE ONLY "service"."tickets"
    ADD CONSTRAINT "tickets_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "service"."tickets"
    ADD CONSTRAINT "tickets_reporter_store_id_fkey" FOREIGN KEY ("reporter_store_id") REFERENCES "public"."stores"("id");



ALTER TABLE ONLY "software_maintenance"."license_assignments"
    ADD CONSTRAINT "fk_assignments_device" FOREIGN KEY ("device_id") REFERENCES "software_maintenance"."devices"("id");



ALTER TABLE ONLY "software_maintenance"."license_assignments"
    ADD CONSTRAINT "fk_assignments_employees" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "software_maintenance"."audit_logs"
    ADD CONSTRAINT "fk_audit_logs_user_id" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "software_maintenance"."devices"
    ADD CONSTRAINT "fk_devices_employees" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "software_maintenance"."license_assignments"
    ADD CONSTRAINT "fk_license_assignments_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "software_maintenance"."licenses"
    ADD CONSTRAINT "fk_licenses_created_by" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "software_maintenance"."license_assignments"
    ADD CONSTRAINT "license_assignments_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "software_maintenance"."devices"("id");



ALTER TABLE ONLY "software_maintenance"."license_assignments"
    ADD CONSTRAINT "license_assignments_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "software_maintenance"."licenses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "software_maintenance"."licenses"
    ADD CONSTRAINT "licenses_software_id_fkey" FOREIGN KEY ("software_id") REFERENCES "software_maintenance"."software"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "software_maintenance"."software"
    ADD CONSTRAINT "software_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "software_maintenance"."vendors"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can manage maintenance records" ON "car_rental"."maintenance_records" USING (("auth"."uid"() IN ( SELECT "users"."id"
   FROM "auth"."users"
  WHERE (("users"."raw_user_meta_data" ->> 'role'::"text") = 'admin'::"text"))));



CREATE POLICY "Admins can manage rentals" ON "car_rental"."rentals" USING ("car_rental"."is_admin"());



CREATE POLICY "Admins can manage vehicles" ON "car_rental"."vehicles" USING ("car_rental"."is_admin"());



CREATE POLICY "Anyone can view available vehicles" ON "car_rental"."vehicles" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("deleted_at" IS NULL)));



CREATE POLICY "Anyone can view maintenance records" ON "car_rental"."maintenance_records" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can view own rentals" ON "car_rental"."rentals" FOR SELECT USING (("renter_id" = "car_rental"."get_current_employee_id"()));



ALTER TABLE "car_rental"."maintenance_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "car_rental"."rental_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "car_rental"."rentals" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "car_rental"."vehicles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can manage all documents" ON "eip"."documents" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"]))))));



CREATE POLICY "Admins can manage announcements" ON "eip"."announcements" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"]))))));



CREATE POLICY "Admins can manage document categories" ON "eip"."document_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"]))))));



CREATE POLICY "Anyone can view active announcements" ON "eip"."announcements" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Anyone can view active document categories" ON "eip"."document_categories" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Anyone can view published documents" ON "eip"."documents" FOR SELECT TO "authenticated" USING (("status" = 'published'::"text"));



CREATE POLICY "Authors can manage their documents" ON "eip"."documents" TO "authenticated" USING (("author_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own favorites" ON "eip"."document_favorites" TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage their own read records" ON "eip"."announcement_reads" TO "authenticated" USING (("user_id" = "auth"."uid"()));



ALTER TABLE "eip"."announcement_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "eip"."announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "eip"."document_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "eip"."document_favorites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "eip"."document_versions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "eip"."documents" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "meeting_system"."bookings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "meeting_system"."rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "使用者可修改自己的預約" ON "meeting_system"."bookings" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "使用者可新增預約" ON "meeting_system"."bookings" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "僅管理員可修改會議室" ON "meeting_system"."rooms" TO "authenticated" USING ((("auth"."jwt"() ->> 'email'::"text") = 'fangea23@gmail.com'::"text")) WITH CHECK ((("auth"."jwt"() ->> 'email'::"text") = 'fangea23@gmail.com'::"text"));



CREATE POLICY "公開讀取會議室" ON "meeting_system"."rooms" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "讀取所有預約" ON "meeting_system"."bookings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert requests" ON "payment_approval"."payment_requests" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to select requests" ON "payment_approval"."payment_requests" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update requests" ON "payment_approval"."payment_requests" FOR UPDATE TO "authenticated" USING (true);



CREATE POLICY "Allow public read access on banks" ON "payment_approval"."banks" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Allow public read access on branches" ON "payment_approval"."branches" FOR SELECT TO "authenticated", "anon" USING (true);



ALTER TABLE "payment_approval"."banks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "payment_approval"."branches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "payment_approval"."payment_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow authenticated users to delete brands" ON "public"."brands" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to delete stores" ON "public"."stores" FOR DELETE TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to insert brands" ON "public"."brands" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to insert stores" ON "public"."stores" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Allow authenticated users to read brands" ON "public"."brands" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to read stores" ON "public"."stores" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update brands" ON "public"."brands" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow authenticated users to update stores" ON "public"."stores" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Anyone can view active departments" ON "public"."departments" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND ("is_active" = true) AND ("deleted_at" IS NULL)));



CREATE POLICY "Enable read access for authenticated users" ON "public"."departments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Enable read access for authenticated users" ON "public"."employees" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "HR and admins can manage departments" ON "public"."departments" USING (("public"."check_is_admin_or_hr"() = true));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



ALTER TABLE "public"."brands" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."departments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Allow public read access" ON "reviews_data"."places" FOR SELECT USING (true);



ALTER TABLE "reviews_data"."places" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admins can manage ticket categories" ON "service"."ticket_categories" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"]))))));



CREATE POLICY "Anyone can create tickets" ON "service"."tickets" FOR INSERT TO "authenticated" WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Anyone can view active ticket categories" ON "service"."ticket_categories" FOR SELECT TO "authenticated" USING (("is_active" = true));



CREATE POLICY "Users can create comments" ON "service"."ticket_comments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "service"."tickets" "t"
  WHERE (("t"."id" = "ticket_comments"."ticket_id") AND (("t"."reporter_id" = "auth"."uid"()) OR ("t"."assignee_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"]))))))))));



CREATE POLICY "Users can update related tickets" ON "service"."tickets" FOR UPDATE TO "authenticated" USING ((("reporter_id" = "auth"."uid"()) OR ("assignee_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"])))))));



CREATE POLICY "Users can view related comments" ON "service"."ticket_comments" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "service"."tickets" "t"
  WHERE (("t"."id" = "ticket_comments"."ticket_id") AND (("t"."reporter_id" = "auth"."uid"()) OR ("t"."assignee_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"]))))))))) AND ((NOT "is_internal") OR (EXISTS ( SELECT 1
   FROM "service"."tickets" "t"
  WHERE (("t"."id" = "ticket_comments"."ticket_id") AND (("t"."assignee_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"]))))))))))));



CREATE POLICY "Users can view related history" ON "service"."ticket_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "service"."tickets" "t"
  WHERE (("t"."id" = "ticket_history"."ticket_id") AND (("t"."reporter_id" = "auth"."uid"()) OR ("t"."assignee_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
           FROM "public"."profiles"
          WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"]))))))))));



CREATE POLICY "Users can view related tickets" ON "service"."tickets" FOR SELECT TO "authenticated" USING ((("reporter_id" = "auth"."uid"()) OR ("assignee_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND (("profiles"."role")::"text" = ANY (ARRAY[('admin'::character varying)::"text", ('hr'::character varying)::"text"])))))));



ALTER TABLE "service"."ticket_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "service"."ticket_categories" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "service"."ticket_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "service"."ticket_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "service"."tickets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "Admin can manage assignments" ON "software_maintenance"."license_assignments" USING (("software_maintenance"."check_if_admin"() = true));



CREATE POLICY "Admin can manage licenses" ON "software_maintenance"."licenses" USING (("software_maintenance"."check_if_admin"() = true));



CREATE POLICY "Admin can manage software" ON "software_maintenance"."software" USING (("software_maintenance"."check_if_admin"() = true));



CREATE POLICY "Admin can manage vendors" ON "software_maintenance"."vendors" USING (("software_maintenance"."check_if_admin"() = true));



CREATE POLICY "Admin can view audit logs" ON "software_maintenance"."audit_logs" FOR SELECT USING (("software_maintenance"."check_if_admin"() = true));



CREATE POLICY "Allow all access" ON "software_maintenance"."devices" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can view assignments" ON "software_maintenance"."license_assignments" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view licenses" ON "software_maintenance"."licenses" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view software" ON "software_maintenance"."software" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can view vendors" ON "software_maintenance"."vendors" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "software_maintenance"."audit_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "software_maintenance"."license_assignments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "software_maintenance"."licenses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "software_maintenance"."software" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "software_maintenance"."vendors" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "payment_approval" TO "anon";
GRANT USAGE ON SCHEMA "payment_approval" TO "authenticated";
GRANT USAGE ON SCHEMA "payment_approval" TO "service_role";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "report_viewer";



GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey16_out"("public"."gbtreekey16") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey2_out"("public"."gbtreekey2") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey32_out"("public"."gbtreekey32") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey4_out"("public"."gbtreekey4") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey8_out"("public"."gbtreekey8") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_in"("cstring") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "anon";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbtreekey_var_out"("public"."gbtreekey_var") TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "postgres";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "anon";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cash_dist"("money", "money") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_admin_or_hr"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_admin_or_hr"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_admin_or_hr"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_is_own_record"("record_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."check_is_own_record"("record_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_is_own_record"("record_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "postgres";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "anon";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."date_dist"("date", "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."deactivate_license"("p_license_key" "text", "p_machine_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."deactivate_license"("p_license_key" "text", "p_machine_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_license"("p_license_key" "text", "p_machine_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_by_admin"("target_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "postgres";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "anon";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float4_dist"(real, real) TO "service_role";



GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "postgres";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."float8_dist"(double precision, double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_consistent"("internal", bit, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bit_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_consistent"("internal", boolean, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_same"("public"."gbtreekey2", "public"."gbtreekey2", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bool_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bpchar_consistent"("internal", character, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_consistent"("internal", "bytea", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_bytea_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_consistent"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_distance"("internal", "money", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_cash_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_consistent"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_distance"("internal", "date", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_date_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_consistent"("internal", "anyenum", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_enum_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_consistent"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_distance"("internal", real, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_consistent"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_distance"("internal", double precision, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_float8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_consistent"("internal", "inet", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_inet_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_consistent"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_distance"("internal", smallint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_same"("public"."gbtreekey4", "public"."gbtreekey4", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int2_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_consistent"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_distance"("internal", integer, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int4_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_consistent"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_distance"("internal", bigint, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_int8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_consistent"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_distance"("internal", interval, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_intv_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_consistent"("internal", "macaddr8", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad8_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_consistent"("internal", "macaddr", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_macad_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_consistent"("internal", numeric, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_numeric_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_consistent"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_distance"("internal", "oid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_same"("public"."gbtreekey8", "public"."gbtreekey8", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_oid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_consistent"("internal", "text", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_same"("public"."gbtreekey_var", "public"."gbtreekey_var", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_text_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_consistent"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_distance"("internal", time without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_time_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_timetz_consistent"("internal", time with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_consistent"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_distance"("internal", timestamp without time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_same"("public"."gbtreekey16", "public"."gbtreekey16", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_ts_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_consistent"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_tstz_distance"("internal", timestamp with time zone, smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_compress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_consistent"("internal", "uuid", smallint, "oid", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_penalty"("internal", "internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_picksplit"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_same"("public"."gbtreekey32", "public"."gbtreekey32", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_uuid_union"("internal", "internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_decompress"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "postgres";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "anon";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "authenticated";
GRANT ALL ON FUNCTION "public"."gbt_var_fetch"("internal") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_full_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_full_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_full_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_user_info"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_user_info"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_user_info"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_by_email"("p_email" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_by_email"("p_email" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_by_email"("p_email" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_employee_by_user_id"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_employee_by_user_id"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_employee_by_user_id"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_license_info"("p_license_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_license_info"("p_license_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_license_info"("p_license_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_management_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_management_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_management_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_avatar_url"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_avatar_url"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_avatar_url"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_display_name"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_display_name"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_display_name"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "anon";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int2_dist"(smallint, smallint) TO "service_role";



GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "postgres";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "anon";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int4_dist"(integer, integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "postgres";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."int8_dist"(bigint, bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "postgres";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "anon";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."interval_dist"(interval, interval) TO "service_role";



GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "postgres";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "anon";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."oid_dist"("oid", "oid") TO "service_role";



GRANT ALL ON FUNCTION "public"."prevent_role_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."prevent_role_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."prevent_role_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_profile_to_employee"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_profile_to_employee"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_profile_to_employee"() TO "service_role";



GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."time_dist"(time without time zone, time without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."ts_dist"(timestamp without time zone, timestamp without time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "postgres";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."tstz_dist"(timestamp with time zone, timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_license"("p_license_key" "text", "p_machine_id" "text", "p_machine_name" "text", "p_ip_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_license"("p_license_key" "text", "p_machine_id" "text", "p_machine_name" "text", "p_ip_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_license"("p_license_key" "text", "p_machine_id" "text", "p_machine_name" "text", "p_ip_address" "text") TO "service_role";












GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "car_rental"."maintenance_records" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "car_rental"."rental_requests" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "car_rental"."rentals" TO "authenticated";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "car_rental"."vehicles" TO "authenticated";









GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "meeting_system"."bookings" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "meeting_system"."bookings" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "meeting_system"."bookings" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "meeting_system"."rooms" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "meeting_system"."rooms" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "meeting_system"."rooms" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "payment_approval"."bank_branches" TO "anon";
GRANT ALL ON TABLE "payment_approval"."bank_branches" TO "authenticated";
GRANT ALL ON TABLE "payment_approval"."bank_branches" TO "service_role";



GRANT ALL ON SEQUENCE "payment_approval"."bank_branches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "payment_approval"."bank_branches_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "payment_approval"."banks" TO "anon";
GRANT ALL ON TABLE "payment_approval"."banks" TO "authenticated";
GRANT ALL ON TABLE "payment_approval"."banks" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "payment_approval"."branches" TO "anon";
GRANT ALL ON TABLE "payment_approval"."branches" TO "authenticated";
GRANT ALL ON TABLE "payment_approval"."branches" TO "service_role";



GRANT ALL ON SEQUENCE "payment_approval"."branches_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "payment_approval"."branches_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "payment_approval"."brands" TO "anon";
GRANT ALL ON TABLE "payment_approval"."brands" TO "authenticated";
GRANT ALL ON TABLE "payment_approval"."brands" TO "service_role";



GRANT ALL ON SEQUENCE "payment_approval"."brands_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "payment_approval"."brands_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "payment_approval"."payment_requests" TO "anon";
GRANT ALL ON TABLE "payment_approval"."payment_requests" TO "authenticated";
GRANT ALL ON TABLE "payment_approval"."payment_requests" TO "service_role";



GRANT ALL ON SEQUENCE "payment_approval"."payment_requests_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "payment_approval"."payment_requests_id_seq" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "payment_approval"."stores" TO "anon";
GRANT ALL ON TABLE "payment_approval"."stores" TO "authenticated";
GRANT ALL ON TABLE "payment_approval"."stores" TO "service_role";



GRANT ALL ON SEQUENCE "payment_approval"."stores_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "payment_approval"."stores_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."brands" TO "anon";
GRANT ALL ON TABLE "public"."brands" TO "authenticated";
GRANT ALL ON TABLE "public"."brands" TO "service_role";



GRANT ALL ON TABLE "public"."departments" TO "anon";
GRANT ALL ON TABLE "public"."departments" TO "authenticated";
GRANT ALL ON TABLE "public"."departments" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."employees_with_details" TO "anon";
GRANT ALL ON TABLE "public"."employees_with_details" TO "authenticated";
GRANT ALL ON TABLE "public"."employees_with_details" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."users_with_employee_info" TO "anon";
GRANT ALL ON TABLE "public"."users_with_employee_info" TO "authenticated";
GRANT ALL ON TABLE "public"."users_with_employee_info" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."brands" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."brands" TO "authenticated";
GRANT SELECT ON TABLE "reviews_data"."brands" TO "report_viewer";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."brands" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."places" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."places" TO "authenticated";
GRANT SELECT ON TABLE "reviews_data"."places" TO "report_viewer";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."places" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."reviews" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."reviews" TO "authenticated";
GRANT SELECT ON TABLE "reviews_data"."reviews" TO "report_viewer";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "reviews_data"."reviews" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."audit_logs" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."audit_logs" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."audit_logs" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."devices" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."devices" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."devices" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."license_assignments" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."license_assignments" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."license_assignments" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."licenses" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."licenses" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."licenses" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."software" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."software" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."software" TO "service_role";



GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."vendors" TO "anon";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."vendors" TO "authenticated";
GRANT SELECT,INSERT,REFERENCES,DELETE,TRIGGER,TRUNCATE,UPDATE ON TABLE "software_maintenance"."vendors" TO "service_role";












ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































