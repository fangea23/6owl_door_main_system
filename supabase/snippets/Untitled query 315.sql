-- ================================================================
-- 強制重命名 Constraint (修復 PGRST200 找不到關聯的問題)
-- ================================================================

-- 1. 修復 [設備] 對 [員工] 的關聯 (devices -> employees)
-- 前端 Hint: !fk_devices_employees
ALTER TABLE "software_maintenance"."devices" 
DROP CONSTRAINT IF EXISTS "fk_devices_employees";

-- 嘗試刪除系統預設名稱 (如果存在)
ALTER TABLE "software_maintenance"."devices" 
DROP CONSTRAINT IF EXISTS "devices_employee_id_fkey";

ALTER TABLE "software_maintenance"."devices"
ADD CONSTRAINT "fk_devices_employees"
FOREIGN KEY ("employee_id") 
REFERENCES "public"."employees" ("id");


-- 2. 修復 [授權分配] 對 [員工] 的關聯 (license_assignments -> employees)
-- 前端 Hint: !fk_assignments_employees
ALTER TABLE "software_maintenance"."license_assignments" 
DROP CONSTRAINT IF EXISTS "fk_assignments_employees";

ALTER TABLE "software_maintenance"."license_assignments" 
DROP CONSTRAINT IF EXISTS "license_assignments_employee_id_fkey";

ALTER TABLE "software_maintenance"."license_assignments"
ADD CONSTRAINT "fk_assignments_employees"
FOREIGN KEY ("employee_id") 
REFERENCES "public"."employees" ("id");


-- 3. 修復 [授權分配] 對 [設備] 的關聯 (license_assignments -> devices)
-- 前端 Hint: !fk_assignments_device
ALTER TABLE "software_maintenance"."license_assignments" 
DROP CONSTRAINT IF EXISTS "fk_assignments_device";

ALTER TABLE "software_maintenance"."license_assignments" 
DROP CONSTRAINT IF EXISTS "license_assignments_device_id_fkey";

ALTER TABLE "software_maintenance"."license_assignments"
ADD CONSTRAINT "fk_assignments_device"
FOREIGN KEY ("device_id") 
REFERENCES "software_maintenance"."devices" ("id");


-- 4. 關鍵一步：通知 API 重讀架構
NOTIFY pgrst, 'reload';