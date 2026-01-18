-- 1. 刪除多餘且命名混亂的外鍵
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS fk_employees_department;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS fk_employees_departments;

-- 2. 確保保留一個標準命名的外鍵 (如果 employees_department_id_fkey 不存在，這行會建立它)
-- 先嘗試刪除舊的標準名稱以防萬一設定錯誤，再重新建立正確的
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_department_id_fkey;

ALTER TABLE public.employees
ADD CONSTRAINT employees_department_id_fkey
FOREIGN KEY (department_id) REFERENCES public.departments(id);