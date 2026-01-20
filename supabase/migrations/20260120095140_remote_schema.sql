drop policy "Admins can manage announcements" on "eip"."announcements";

drop policy "Admins can manage document categories" on "eip"."document_categories";

drop policy "Admins can manage all documents" on "eip"."documents";

drop policy "管理員可以管理會計品牌" on "payment_approval"."accountant_brands";

drop policy "Admins can manage ticket categories" on "service"."ticket_categories";

drop policy "Users can create comments" on "service"."ticket_comments";

drop policy "Users can view related comments" on "service"."ticket_comments";

drop policy "Users can view related history" on "service"."ticket_history";

drop policy "Users can update related tickets" on "service"."tickets";

drop policy "Users can view related tickets" on "service"."tickets";

alter table "public"."employees" drop constraint "employees_status_check";

drop view if exists "payment_approval"."accountant_pending_requests";

drop view if exists "payment_approval"."payment_requests_with_items";

alter table "public"."employees" add constraint "employees_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'on_leave'::character varying, 'resigned'::character varying, 'terminated'::character varying])::text[]))) not valid;

alter table "public"."employees" validate constraint "employees_status_check";

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



  create policy "管理員可以管理會計品牌"
  on "payment_approval"."accountant_brands"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.user_id = auth.uid()) AND ((employees.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



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



