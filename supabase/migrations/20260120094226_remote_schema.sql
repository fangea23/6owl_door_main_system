create sequence "payment_approval"."accountant_brands_id_seq";

create sequence "payment_approval"."payment_request_items_id_seq";

drop trigger if exists "check_role_change" on "public"."employees";

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

drop function if exists "public"."prevent_role_change"();


  create table "payment_approval"."accountant_brands" (
    "id" bigint not null default nextval('payment_approval.accountant_brands_id_seq'::regclass),
    "employee_id" uuid not null,
    "brand_id" bigint not null,
    "created_at" timestamp with time zone default now(),
    "created_by" uuid
      );


alter table "payment_approval"."accountant_brands" enable row level security;


  create table "payment_approval"."payment_request_items" (
    "id" bigint not null default nextval('payment_approval.payment_request_items_id_seq'::regclass),
    "request_id" bigint not null,
    "store_id" bigint,
    "store_name" text not null,
    "brand_name" text not null,
    "content" text not null,
    "tax_type" text not null,
    "amount" numeric(15,2) not null,
    "display_order" integer default 0,
    "created_at" timestamp with time zone default now()
      );


alter table "payment_approval"."payment_request_items" enable row level security;


  create table "public"."notifications" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "title" text not null,
    "message" text,
    "type" text not null default 'system'::text,
    "is_read" boolean not null default false,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
      );


alter table "public"."notifications" enable row level security;

alter table "payment_approval"."payment_requests" add column "is_multi_store" boolean default false;

alter table "payment_approval"."payment_requests" add column "item_count" integer default 1;

alter table "payment_approval"."payment_requests" add column "total_amount" numeric(15,2);

alter sequence "payment_approval"."accountant_brands_id_seq" owned by "payment_approval"."accountant_brands"."id";

alter sequence "payment_approval"."payment_request_items_id_seq" owned by "payment_approval"."payment_request_items"."id";

CREATE UNIQUE INDEX accountant_brands_employee_id_brand_id_key ON payment_approval.accountant_brands USING btree (employee_id, brand_id);

CREATE UNIQUE INDEX accountant_brands_pkey ON payment_approval.accountant_brands USING btree (id);

CREATE INDEX idx_accountant_brands_brand ON payment_approval.accountant_brands USING btree (brand_id);

CREATE INDEX idx_accountant_brands_employee ON payment_approval.accountant_brands USING btree (employee_id);

CREATE INDEX idx_payment_items_order ON payment_approval.payment_request_items USING btree (request_id, display_order);

CREATE INDEX idx_payment_items_request ON payment_approval.payment_request_items USING btree (request_id);

CREATE INDEX idx_payment_items_store ON payment_approval.payment_request_items USING btree (store_id);

CREATE UNIQUE INDEX payment_request_items_pkey ON payment_approval.payment_request_items USING btree (id);

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);

CREATE INDEX idx_notifications_is_read ON public.notifications USING btree (is_read) WHERE (is_read = false);

CREATE INDEX idx_notifications_user_id ON public.notifications USING btree (user_id);

CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

alter table "payment_approval"."accountant_brands" add constraint "accountant_brands_pkey" PRIMARY KEY using index "accountant_brands_pkey";

alter table "payment_approval"."payment_request_items" add constraint "payment_request_items_pkey" PRIMARY KEY using index "payment_request_items_pkey";

alter table "public"."notifications" add constraint "notifications_pkey" PRIMARY KEY using index "notifications_pkey";

alter table "payment_approval"."accountant_brands" add constraint "accountant_brands_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE not valid;

alter table "payment_approval"."accountant_brands" validate constraint "accountant_brands_brand_id_fkey";

alter table "payment_approval"."accountant_brands" add constraint "accountant_brands_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "payment_approval"."accountant_brands" validate constraint "accountant_brands_created_by_fkey";

alter table "payment_approval"."accountant_brands" add constraint "accountant_brands_employee_id_brand_id_key" UNIQUE using index "accountant_brands_employee_id_brand_id_key";

alter table "payment_approval"."accountant_brands" add constraint "accountant_brands_employee_id_fkey" FOREIGN KEY (employee_id) REFERENCES public.employees(id) ON DELETE CASCADE not valid;

alter table "payment_approval"."accountant_brands" validate constraint "accountant_brands_employee_id_fkey";

alter table "payment_approval"."payment_request_items" add constraint "payment_request_items_amount_check" CHECK ((amount > (0)::numeric)) not valid;

alter table "payment_approval"."payment_request_items" validate constraint "payment_request_items_amount_check";

alter table "payment_approval"."payment_request_items" add constraint "payment_request_items_request_id_fkey" FOREIGN KEY (request_id) REFERENCES payment_approval.payment_requests(id) ON DELETE CASCADE not valid;

alter table "payment_approval"."payment_request_items" validate constraint "payment_request_items_request_id_fkey";

alter table "payment_approval"."payment_request_items" add constraint "payment_request_items_store_id_fkey" FOREIGN KEY (store_id) REFERENCES public.stores(id) not valid;

alter table "payment_approval"."payment_request_items" validate constraint "payment_request_items_store_id_fkey";

alter table "payment_approval"."payment_request_items" add constraint "payment_request_items_tax_type_check" CHECK ((tax_type = ANY (ARRAY['tax_included'::text, 'tax_excluded'::text]))) not valid;

alter table "payment_approval"."payment_request_items" validate constraint "payment_request_items_tax_type_check";

alter table "payment_approval"."payment_request_items" add constraint "positive_amount" CHECK ((amount > (0)::numeric)) not valid;

alter table "payment_approval"."payment_request_items" validate constraint "positive_amount";

alter table "public"."notifications" add constraint "notifications_type_check" CHECK ((type = ANY (ARRAY['approval'::text, 'system'::text, 'alert'::text]))) not valid;

alter table "public"."notifications" validate constraint "notifications_type_check";

alter table "public"."notifications" add constraint "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."notifications" validate constraint "notifications_user_id_fkey";

alter table "public"."employees" add constraint "employees_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'on_leave'::character varying, 'resigned'::character varying, 'terminated'::character varying])::text[]))) not valid;

alter table "public"."employees" validate constraint "employees_status_check";

set check_function_bodies = off;

create or replace view "payment_approval"."accountant_pending_requests" as  SELECT pr.id,
    pr.brand,
    pr.store,
    pr.payment_date,
    pr.payee_name,
    pr.content,
    pr.tax_type,
    pr.amount,
    pr.payment_method,
    pr.payment_method_other,
    pr.handling_fee,
    pr.bank_name,
    pr.bank_code,
    pr.bank_branch,
    pr.branch_code,
    pr.account_number,
    pr.has_attachment,
    pr.attachment_desc,
    pr.has_invoice,
    pr.invoice_date,
    pr.remarks,
    pr.creator_name,
    pr.apply_date,
    pr.status,
    pr.created_at,
    pr.current_step,
    pr.rejection_reason,
    pr.sign_manager_url,
    pr.sign_manager_at,
    pr.sign_manager_by,
    pr.sign_accountant_url,
    pr.sign_accountant_at,
    pr.sign_accountant_by,
    pr.sign_audit_url,
    pr.sign_audit_at,
    pr.sign_audit_by,
    pr.sign_cashier_url,
    pr.sign_cashier_at,
    pr.sign_cashier_by,
    pr.sign_boss_url,
    pr.sign_boss_at,
    pr.sign_boss_by,
    pr.signature_url,
    pr.attachments,
    pr.is_paper_received,
    pr.applicant_id,
    pr.invoice_number,
    pr.has_voucher,
    pr.voucher_number,
    pr.is_multi_store,
    pr.total_amount,
    pr.item_count,
    ab.employee_id AS accountant_employee_id,
    e.name AS accountant_name
   FROM (((payment_approval.payment_requests pr
     JOIN public.brands b ON ((pr.brand = b.name)))
     JOIN payment_approval.accountant_brands ab ON ((b.id = ab.brand_id)))
     JOIN public.employees e ON ((ab.employee_id = e.id)))
  WHERE ((pr.status = 'pending_accountant'::text) AND (pr.current_step = 2));


CREATE OR REPLACE FUNCTION payment_approval.calculate_request_total(p_request_id bigint)
 RETURNS numeric
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO v_total
    FROM payment_approval.payment_request_items
    WHERE request_id = p_request_id;

    RETURN v_total;
END;
$function$
;

create or replace view "payment_approval"."payment_requests_with_items" as  SELECT pr.id,
    pr.brand,
    pr.store,
    pr.payment_date,
    pr.payee_name,
    pr.content,
    pr.tax_type,
    pr.amount,
    pr.payment_method,
    pr.payment_method_other,
    pr.handling_fee,
    pr.bank_name,
    pr.bank_code,
    pr.bank_branch,
    pr.branch_code,
    pr.account_number,
    pr.has_attachment,
    pr.attachment_desc,
    pr.has_invoice,
    pr.invoice_date,
    pr.remarks,
    pr.creator_name,
    pr.apply_date,
    pr.status,
    pr.created_at,
    pr.current_step,
    pr.rejection_reason,
    pr.sign_manager_url,
    pr.sign_manager_at,
    pr.sign_manager_by,
    pr.sign_accountant_url,
    pr.sign_accountant_at,
    pr.sign_accountant_by,
    pr.sign_audit_url,
    pr.sign_audit_at,
    pr.sign_audit_by,
    pr.sign_cashier_url,
    pr.sign_cashier_at,
    pr.sign_cashier_by,
    pr.sign_boss_url,
    pr.sign_boss_at,
    pr.sign_boss_by,
    pr.signature_url,
    pr.attachments,
    pr.is_paper_received,
    pr.applicant_id,
    pr.invoice_number,
    pr.has_voucher,
    pr.voucher_number,
    pr.is_multi_store,
    pr.total_amount,
    pr.item_count,
    COALESCE(json_agg(json_build_object('id', pri.id, 'store_name', pri.store_name, 'brand_name', pri.brand_name, 'content', pri.content, 'tax_type', pri.tax_type, 'amount', pri.amount, 'display_order', pri.display_order) ORDER BY pri.display_order) FILTER (WHERE (pri.id IS NOT NULL)), '[]'::json) AS items
   FROM (payment_approval.payment_requests pr
     LEFT JOIN payment_approval.payment_request_items pri ON ((pr.id = pri.request_id)))
  GROUP BY pr.id;


CREATE OR REPLACE FUNCTION payment_approval.update_request_totals()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- 更新主表的總金額和明細筆數
    UPDATE payment_approval.payment_requests
    SET 
        total_amount = payment_approval.calculate_request_total(
            CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.request_id 
                ELSE NEW.request_id 
            END
        ),
        item_count = (
            SELECT COUNT(*) 
            FROM payment_approval.payment_request_items
            WHERE request_id = CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.request_id 
                ELSE NEW.request_id 
            END
        )
    WHERE id = CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.request_id 
        ELSE NEW.request_id 
    END;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$function$
;

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

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$
;

grant delete on table "payment_approval"."accountant_brands" to "anon";

grant insert on table "payment_approval"."accountant_brands" to "anon";

grant references on table "payment_approval"."accountant_brands" to "anon";

grant select on table "payment_approval"."accountant_brands" to "anon";

grant trigger on table "payment_approval"."accountant_brands" to "anon";

grant truncate on table "payment_approval"."accountant_brands" to "anon";

grant update on table "payment_approval"."accountant_brands" to "anon";

grant delete on table "payment_approval"."accountant_brands" to "authenticated";

grant insert on table "payment_approval"."accountant_brands" to "authenticated";

grant references on table "payment_approval"."accountant_brands" to "authenticated";

grant select on table "payment_approval"."accountant_brands" to "authenticated";

grant trigger on table "payment_approval"."accountant_brands" to "authenticated";

grant truncate on table "payment_approval"."accountant_brands" to "authenticated";

grant update on table "payment_approval"."accountant_brands" to "authenticated";

grant delete on table "payment_approval"."accountant_brands" to "service_role";

grant insert on table "payment_approval"."accountant_brands" to "service_role";

grant references on table "payment_approval"."accountant_brands" to "service_role";

grant select on table "payment_approval"."accountant_brands" to "service_role";

grant trigger on table "payment_approval"."accountant_brands" to "service_role";

grant truncate on table "payment_approval"."accountant_brands" to "service_role";

grant update on table "payment_approval"."accountant_brands" to "service_role";

grant delete on table "payment_approval"."payment_request_items" to "anon";

grant insert on table "payment_approval"."payment_request_items" to "anon";

grant references on table "payment_approval"."payment_request_items" to "anon";

grant select on table "payment_approval"."payment_request_items" to "anon";

grant trigger on table "payment_approval"."payment_request_items" to "anon";

grant truncate on table "payment_approval"."payment_request_items" to "anon";

grant update on table "payment_approval"."payment_request_items" to "anon";

grant delete on table "payment_approval"."payment_request_items" to "authenticated";

grant insert on table "payment_approval"."payment_request_items" to "authenticated";

grant references on table "payment_approval"."payment_request_items" to "authenticated";

grant select on table "payment_approval"."payment_request_items" to "authenticated";

grant trigger on table "payment_approval"."payment_request_items" to "authenticated";

grant truncate on table "payment_approval"."payment_request_items" to "authenticated";

grant update on table "payment_approval"."payment_request_items" to "authenticated";

grant delete on table "payment_approval"."payment_request_items" to "service_role";

grant insert on table "payment_approval"."payment_request_items" to "service_role";

grant references on table "payment_approval"."payment_request_items" to "service_role";

grant select on table "payment_approval"."payment_request_items" to "service_role";

grant trigger on table "payment_approval"."payment_request_items" to "service_role";

grant truncate on table "payment_approval"."payment_request_items" to "service_role";

grant update on table "payment_approval"."payment_request_items" to "service_role";

grant delete on table "public"."notifications" to "anon";

grant insert on table "public"."notifications" to "anon";

grant references on table "public"."notifications" to "anon";

grant select on table "public"."notifications" to "anon";

grant trigger on table "public"."notifications" to "anon";

grant truncate on table "public"."notifications" to "anon";

grant update on table "public"."notifications" to "anon";

grant delete on table "public"."notifications" to "authenticated";

grant insert on table "public"."notifications" to "authenticated";

grant references on table "public"."notifications" to "authenticated";

grant select on table "public"."notifications" to "authenticated";

grant trigger on table "public"."notifications" to "authenticated";

grant truncate on table "public"."notifications" to "authenticated";

grant update on table "public"."notifications" to "authenticated";

grant delete on table "public"."notifications" to "service_role";

grant insert on table "public"."notifications" to "service_role";

grant references on table "public"."notifications" to "service_role";

grant select on table "public"."notifications" to "service_role";

grant trigger on table "public"."notifications" to "service_role";

grant truncate on table "public"."notifications" to "service_role";

grant update on table "public"."notifications" to "service_role";


  create policy "會計可以查看自己負責的品牌"
  on "payment_approval"."accountant_brands"
  as permissive
  for select
  to public
using ((employee_id IN ( SELECT employees.id
   FROM public.employees
  WHERE (employees.user_id = auth.uid()))));



  create policy "管理員可以管理會計品牌"
  on "payment_approval"."accountant_brands"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.user_id = auth.uid()) AND ((employees.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "所有人可以查看付款明細"
  on "payment_approval"."payment_request_items"
  as permissive
  for select
  to public
using (true);



  create policy "申請人可以新增付款明細"
  on "payment_approval"."payment_request_items"
  as permissive
  for insert
  to public
with check ((request_id IN ( SELECT payment_requests.id
   FROM payment_approval.payment_requests
  WHERE (payment_requests.applicant_id = auth.uid()))));



  create policy "HR and admins can manage employees"
  on "public"."employees"
  as permissive
  for all
  to authenticated
using ((public.check_is_admin_or_hr() = true))
with check ((public.check_is_admin_or_hr() = true));



  create policy "System can insert notifications"
  on "public"."notifications"
  as permissive
  for insert
  to public
with check (true);



  create policy "Users can delete their own notifications"
  on "public"."notifications"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own notifications"
  on "public"."notifications"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own notifications"
  on "public"."notifications"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



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


CREATE TRIGGER trg_update_request_totals AFTER INSERT OR DELETE OR UPDATE ON payment_approval.payment_request_items FOR EACH ROW EXECUTE FUNCTION payment_approval.update_request_totals();

CREATE TRIGGER on_employee_role_change AFTER UPDATE OF role ON public.employees FOR EACH ROW EXECUTE FUNCTION public.sync_employee_role_to_profile();

CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER on_profile_role_change AFTER UPDATE OF role ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.sync_profile_role_to_employee();


