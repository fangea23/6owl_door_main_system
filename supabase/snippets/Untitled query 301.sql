ALTER TABLE public.employees
ADD CONSTRAINT fk_employees_department
FOREIGN KEY (department_id)
REFERENCES public.departments (id);