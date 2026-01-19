drop trigger if exists "update_brands_updated_at" on "public"."brands";

drop trigger if exists "update_stores_updated_at" on "public"."stores";

drop policy "Allow authenticated users to delete brands" on "public"."brands";

drop policy "Allow authenticated users to insert brands" on "public"."brands";

drop policy "Allow authenticated users to read brands" on "public"."brands";

drop policy "Allow authenticated users to update brands" on "public"."brands";

drop policy "Allow authenticated users to delete stores" on "public"."stores";

drop policy "Allow authenticated users to insert stores" on "public"."stores";

drop policy "Allow authenticated users to read stores" on "public"."stores";

drop policy "Allow authenticated users to update stores" on "public"."stores";

drop policy "Admins can manage announcements" on "eip"."announcements";

drop policy "Admins can manage document categories" on "eip"."document_categories";

drop policy "Admins can manage all documents" on "eip"."documents";

drop policy "Admins can manage ticket categories" on "service"."ticket_categories";

drop policy "Users can create comments" on "service"."ticket_comments";

drop policy "Users can view related comments" on "service"."ticket_comments";

drop policy "Users can view related history" on "service"."ticket_history";

drop policy "Users can update related tickets" on "service"."tickets";

drop policy "Users can view related tickets" on "service"."tickets";

revoke delete on table "payment_approval"."brands" from "anon";

revoke insert on table "payment_approval"."brands" from "anon";

revoke references on table "payment_approval"."brands" from "anon";

revoke select on table "payment_approval"."brands" from "anon";

revoke trigger on table "payment_approval"."brands" from "anon";

revoke truncate on table "payment_approval"."brands" from "anon";

revoke update on table "payment_approval"."brands" from "anon";

revoke delete on table "payment_approval"."brands" from "authenticated";

revoke insert on table "payment_approval"."brands" from "authenticated";

revoke references on table "payment_approval"."brands" from "authenticated";

revoke select on table "payment_approval"."brands" from "authenticated";

revoke trigger on table "payment_approval"."brands" from "authenticated";

revoke truncate on table "payment_approval"."brands" from "authenticated";

revoke update on table "payment_approval"."brands" from "authenticated";

revoke delete on table "payment_approval"."brands" from "service_role";

revoke insert on table "payment_approval"."brands" from "service_role";

revoke references on table "payment_approval"."brands" from "service_role";

revoke select on table "payment_approval"."brands" from "service_role";

revoke trigger on table "payment_approval"."brands" from "service_role";

revoke truncate on table "payment_approval"."brands" from "service_role";

revoke update on table "payment_approval"."brands" from "service_role";

revoke delete on table "payment_approval"."stores" from "anon";

revoke insert on table "payment_approval"."stores" from "anon";

revoke references on table "payment_approval"."stores" from "anon";

revoke select on table "payment_approval"."stores" from "anon";

revoke trigger on table "payment_approval"."stores" from "anon";

revoke truncate on table "payment_approval"."stores" from "anon";

revoke update on table "payment_approval"."stores" from "anon";

revoke delete on table "payment_approval"."stores" from "authenticated";

revoke insert on table "payment_approval"."stores" from "authenticated";

revoke references on table "payment_approval"."stores" from "authenticated";

revoke select on table "payment_approval"."stores" from "authenticated";

revoke trigger on table "payment_approval"."stores" from "authenticated";

revoke truncate on table "payment_approval"."stores" from "authenticated";

revoke update on table "payment_approval"."stores" from "authenticated";

revoke delete on table "payment_approval"."stores" from "service_role";

revoke insert on table "payment_approval"."stores" from "service_role";

revoke references on table "payment_approval"."stores" from "service_role";

revoke select on table "payment_approval"."stores" from "service_role";

revoke trigger on table "payment_approval"."stores" from "service_role";

revoke truncate on table "payment_approval"."stores" from "service_role";

revoke update on table "payment_approval"."stores" from "service_role";

alter table "payment_approval"."brands" drop constraint "brands_name_key";

alter table "payment_approval"."stores" drop constraint "stores_brand_id_fkey";

alter table "service"."tickets" drop constraint "tickets_reporter_store_id_fkey";

alter table "public"."employees" drop constraint "employees_status_check";

alter table "public"."stores" drop constraint "stores_brand_id_fkey";

alter table "payment_approval"."brands" drop constraint "brands_pkey";

alter table "payment_approval"."stores" drop constraint "stores_pkey";

drop index if exists "payment_approval"."brands_name_key";

drop index if exists "payment_approval"."brands_pkey";

drop index if exists "payment_approval"."idx_stores_brand_id";

drop index if exists "payment_approval"."stores_pkey";

drop index if exists "public"."idx_brands_name";

drop index if exists "public"."idx_stores_is_active";

drop index if exists "public"."idx_stores_name";

drop table "payment_approval"."brands";

drop table "payment_approval"."stores";

alter table "public"."brands" drop column "code";

alter table "public"."brands" drop column "created_at";

alter table "public"."brands" drop column "updated_at";

alter table "public"."brands" add column "brand_id" text;

alter table "public"."brands" alter column "id" drop default;

alter table "public"."brands" alter column "id" add generated by default as identity;

alter table "public"."brands" alter column "id" set data type bigint using "id"::bigint;

alter table "public"."brands" disable row level security;

alter table "public"."stores" drop column "created_at";

alter table "public"."stores" drop column "updated_at";

alter table "public"."stores" alter column "brand_id" set data type bigint using "brand_id"::bigint;

alter table "public"."stores" alter column "id" drop default;

alter table "public"."stores" alter column "id" add generated by default as identity;

alter table "public"."stores" alter column "id" set data type bigint using "id"::bigint;

alter table "public"."stores" disable row level security;

CREATE UNIQUE INDEX brands_name_key ON public.brands USING btree (name);

alter table "public"."brands" add constraint "brands_name_key" UNIQUE using index "brands_name_key";

alter table "public"."employees" add constraint "employees_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'on_leave'::character varying, 'resigned'::character varying, 'terminated'::character varying])::text[]))) not valid;

alter table "public"."employees" validate constraint "employees_status_check";

alter table "public"."stores" add constraint "stores_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES public.brands(id) not valid;

alter table "public"."stores" validate constraint "stores_brand_id_fkey";


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



