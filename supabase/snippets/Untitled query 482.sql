-- 1. 解決 devices 對 employees 的關聯錯誤
-- 先嘗試移除可能存在的舊約束 (避免重複)
ALTER TABLE "software_maintenance"."devices" 
DROP CONSTRAINT IF EXISTS "fk_devices_employees";

-- 建立名稱精確為 fk_devices_employees 的 Foreign Key
ALTER TABLE "software_maintenance"."devices"
ADD CONSTRAINT "fk_devices_employees"
FOREIGN KEY ("employee_id") 
REFERENCES "public"."employees" ("id");


-- 2. 解決 license_assignments 對 employees 的關聯錯誤
ALTER TABLE "software_maintenance"."license_assignments" 
DROP CONSTRAINT IF EXISTS "fk_assignments_employees";

-- 建立名稱精確為 fk_assignments_employees 的 Foreign Key
ALTER TABLE "software_maintenance"."license_assignments"
ADD CONSTRAINT "fk_assignments_employees"
FOREIGN KEY ("employee_id") 
REFERENCES "public"."employees" ("id");