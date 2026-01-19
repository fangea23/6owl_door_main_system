-- 建立函數：當 profile role 改變，同步更新 employee
create or replace function sync_profile_role_to_employee()
returns trigger as $$
begin
  -- 只有當角色真的有變動時才執行，避免無窮迴圈
  if (old.role is distinct from new.role) then
    update public.employees
    set role = new.role
    where user_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- 建立觸發器
create trigger on_profile_role_change
after update of role on public.profiles
for each row execute function sync_profile_role_to_employee();