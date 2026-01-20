drop policy "Admins can manage announcements" on "eip"."announcements";

drop policy "Admins can manage document categories" on "eip"."document_categories";

drop policy "Admins can manage all documents" on "eip"."documents";

drop policy "Admins can manage ticket categories" on "service"."ticket_categories";

drop policy "Users can create comments" on "service"."ticket_comments";

drop policy "Users can view related comments" on "service"."ticket_comments";

drop policy "Users can view related history" on "service"."ticket_history";

drop policy "Users can update related tickets" on "service"."tickets";

drop policy "Users can view related tickets" on "service"."tickets";

alter table "public"."employees" drop constraint "employees_status_check";

alter table "public"."employees" add constraint "employees_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'on_leave'::character varying, 'resigned'::character varying, 'terminated'::character varying])::text[]))) not valid;

alter table "public"."employees" validate constraint "employees_status_check";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.sync_employee_role_to_profile()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- 只有當員工有綁定帳號 (user_id 不為空) 且 角色真的有變動時才執行
  if new.user_id is not null and (old.role is distinct from new.role) then
    update public.profiles
    set role = new.role
    where id = new.user_id;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_profile_role_to_employee()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  -- 只有當角色真的有變動時才執行，避免無窮迴圈
  if (old.role is distinct from new.role) then
    update public.employees
    set role = new.role
    where user_id = new.id;
  end if;
  return new;
end;
$function$
;


  create policy "HR and admins can manage employees"
  on "public"."employees"
  as permissive
  for all
  to authenticated
using ((public.check_is_admin_or_hr() = true))
with check ((public.check_is_admin_or_hr() = true));



  create policy "Admins can manage announcements"
  on "eip"."announcements"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "Admins can manage document categories"
  on "eip"."document_categories"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "Admins can manage all documents"
  on "eip"."documents"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "Admins can manage ticket categories"
  on "service"."ticket_categories"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "Users can create comments"
  on "service"."ticket_comments"
  as permissive
  for insert
  to authenticated
with check ((EXISTS ( SELECT 1
   FROM service.tickets t
  WHERE ((t.id = ticket_comments.ticket_id) AND ((t.reporter_id = auth.uid()) OR (t.assignee_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))))))));



  create policy "Users can view related comments"
  on "service"."ticket_comments"
  as permissive
  for select
  to authenticated
using (((EXISTS ( SELECT 1
   FROM service.tickets t
  WHERE ((t.id = ticket_comments.ticket_id) AND ((t.reporter_id = auth.uid()) OR (t.assignee_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))))))) AND ((NOT is_internal) OR (EXISTS ( SELECT 1
   FROM service.tickets t
  WHERE ((t.id = ticket_comments.ticket_id) AND ((t.assignee_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))))))))));



  create policy "Users can view related history"
  on "service"."ticket_history"
  as permissive
  for select
  to authenticated
using ((EXISTS ( SELECT 1
   FROM service.tickets t
  WHERE ((t.id = ticket_history.ticket_id) AND ((t.reporter_id = auth.uid()) OR (t.assignee_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))))))));



  create policy "Users can update related tickets"
  on "service"."tickets"
  as permissive
  for update
  to authenticated
using (((reporter_id = auth.uid()) OR (assignee_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[])))))));



  create policy "Users can view related tickets"
  on "service"."tickets"
  as permissive
  for select
  to authenticated
using (((reporter_id = auth.uid()) OR (assignee_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[])))))));


CREATE TRIGGER on_employee_role_change AFTER UPDATE OF role ON public.employees FOR EACH ROW EXECUTE FUNCTION public.sync_employee_role_to_profile();

CREATE TRIGGER on_profile_role_change AFTER UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_employee();


