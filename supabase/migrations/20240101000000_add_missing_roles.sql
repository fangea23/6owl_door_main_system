-- 建立缺少的角色
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'report_viewer') THEN
    CREATE ROLE report_viewer;
  END IF;
  
  -- 如果該角色需要登入權限，請取消下面註解 (通常這種viewer角色不需要)
  -- ALTER ROLE report_viewer WITH LOGIN;
END
$$;

-- 授予基本權限 (視你的需求而定，為了讓 migration 通過，先給 usage)
GRANT USAGE ON SCHEMA public TO report_viewer;