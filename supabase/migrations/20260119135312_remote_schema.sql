drop extension if exists "pg_net";

create schema if not exists "car_rental";

create schema if not exists "eip";

create schema if not exists "meeting_system";

create schema if not exists "payment_approval";

create schema if not exists "reviews_data";

create schema if not exists "service";

create schema if not exists "software_maintenance";

create extension if not exists "btree_gist" with schema "public";

create type "public"."app_role" as enum ('staff', 'unit_manager', 'accountant', 'audit_manager', 'cashier', 'boss', 'admin');


  create table "car_rental"."maintenance_records" (
    "id" uuid not null default gen_random_uuid(),
    "vehicle_id" uuid not null,
    "maintenance_type" character varying(50) not null,
    "maintenance_date" date not null,
    "mileage_at_maintenance" integer,
    "description" text not null,
    "items" jsonb,
    "cost" numeric(12,2),
    "vendor" character varying(200),
    "status" character varying(50) default 'scheduled'::character varying,
    "attachments" jsonb,
    "next_maintenance_date" date,
    "next_maintenance_mileage" integer,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid
      );


alter table "car_rental"."maintenance_records" enable row level security;


  create table "car_rental"."rental_requests" (
    "id" uuid not null default gen_random_uuid(),
    "requester_id" uuid not null,
    "requester_department" character varying(100),
    "requester_phone" character varying(50),
    "vehicle_id" uuid,
    "preferred_vehicle_type" character varying(50),
    "start_date" date not null,
    "end_date" date not null,
    "start_time" time without time zone,
    "end_time" time without time zone,
    "purpose" text not null,
    "destination" character varying(300),
    "estimated_mileage" integer,
    "status" character varying(50) default 'pending'::character varying,
    "reviewer_id" uuid,
    "reviewed_at" timestamp with time zone,
    "review_comment" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "car_rental"."rental_requests" enable row level security;


  create table "car_rental"."rentals" (
    "id" uuid not null default gen_random_uuid(),
    "request_id" uuid,
    "vehicle_id" uuid not null,
    "renter_id" uuid not null,
    "start_date" date not null,
    "end_date" date not null,
    "actual_start_time" timestamp with time zone,
    "actual_end_time" timestamp with time zone,
    "start_mileage" integer,
    "end_mileage" integer,
    "total_mileage" integer generated always as ((end_mileage - start_mileage)) stored,
    "status" character varying(50) default 'confirmed'::character varying,
    "pickup_checklist" jsonb,
    "return_checklist" jsonb,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "car_rental"."rentals" enable row level security;


  create table "car_rental"."vehicles" (
    "id" uuid not null default gen_random_uuid(),
    "plate_number" character varying(20) not null,
    "brand" character varying(100) not null,
    "model" character varying(100) not null,
    "year" integer not null,
    "color" character varying(50),
    "vehicle_type" character varying(50) not null,
    "seating_capacity" integer default 5,
    "fuel_type" character varying(50),
    "transmission" character varying(50),
    "status" character varying(50) default 'available'::character varying,
    "current_mileage" integer default 0,
    "insurance_expiry" date,
    "inspection_expiry" date,
    "purchase_date" date,
    "purchase_price" numeric(12,2),
    "location" character varying(200),
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid,
    "deleted_at" timestamp with time zone
      );


alter table "car_rental"."vehicles" enable row level security;


  create table "eip"."announcement_reads" (
    "id" uuid not null default gen_random_uuid(),
    "announcement_id" uuid,
    "user_id" uuid,
    "read_at" timestamp with time zone default now()
      );


alter table "eip"."announcement_reads" enable row level security;


  create table "eip"."announcements" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "content" text not null,
    "priority" text default 'normal'::text,
    "type" text default 'general'::text,
    "author_id" uuid,
    "target_departments" text[],
    "target_stores" text[],
    "require_read_confirmation" boolean default false,
    "expires_at" timestamp with time zone,
    "is_active" boolean default true,
    "attachments" jsonb,
    "published_at" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "eip"."announcements" enable row level security;


  create table "eip"."document_categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "parent_id" uuid,
    "icon" text default 'Folder'::text,
    "color" text default 'blue'::text,
    "display_order" integer default 0,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "eip"."document_categories" enable row level security;


  create table "eip"."document_favorites" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid,
    "user_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "eip"."document_favorites" enable row level security;


  create table "eip"."document_versions" (
    "id" uuid not null default gen_random_uuid(),
    "document_id" uuid,
    "version" integer not null,
    "title" text not null,
    "content" text,
    "file_url" text,
    "file_name" text,
    "changes_description" text,
    "created_by" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "eip"."document_versions" enable row level security;


  create table "eip"."documents" (
    "id" uuid not null default gen_random_uuid(),
    "category_id" uuid,
    "title" text not null,
    "description" text,
    "content" text,
    "file_url" text,
    "file_name" text,
    "file_size" bigint,
    "file_type" text,
    "version" integer default 1,
    "is_latest" boolean default true,
    "status" text default 'draft'::text,
    "tags" text[],
    "author_id" uuid,
    "published_at" timestamp with time zone,
    "view_count" integer default 0,
    "download_count" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "eip"."documents" enable row level security;


  create table "meeting_system"."bookings" (
    "id" uuid not null default gen_random_uuid(),
    "room_id" uuid,
    "user_id" uuid,
    "title" character varying(200) not null,
    "description" text,
    "booking_date" date not null,
    "start_time" time without time zone not null,
    "end_time" time without time zone not null,
    "period" tsrange generated always as (tsrange((booking_date + start_time), (booking_date + end_time), '[)'::text)) stored,
    "attendees_count" integer default 0,
    "booker_name" character varying(100) not null,
    "booker_email" character varying(200),
    "booker_phone" character varying(50),
    "status" character varying(20) default 'pending'::character varying,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "meeting_system"."bookings" enable row level security;


  create table "meeting_system"."rooms" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(100) not null,
    "location" character varying(100),
    "capacity" integer default 0,
    "amenities" text[] default '{}'::text[],
    "description" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "meeting_system"."rooms" enable row level security;


  create table "payment_approval"."bank_branches" (
    "id" bigint generated by default as identity not null,
    "bank_code" text,
    "bank_name" text,
    "branch_code" text,
    "branch_name" text,
    "zip_code" text,
    "address" text,
    "phone" text,
    "manager" text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now())
      );



  create table "payment_approval"."banks" (
    "bank_code" text not null,
    "bank_name" text not null
      );


alter table "payment_approval"."banks" enable row level security;


  create table "payment_approval"."branches" (
    "id" bigint generated by default as identity not null,
    "bank_code" text not null,
    "branch_code" text not null,
    "branch_name" text not null
      );


alter table "payment_approval"."branches" enable row level security;


  create table "payment_approval"."payment_requests" (
    "id" bigint generated by default as identity not null,
    "brand" text not null,
    "store" text not null,
    "payment_date" date not null,
    "payee_name" text not null,
    "content" text not null,
    "tax_type" text not null,
    "amount" numeric not null,
    "payment_method" text not null,
    "payment_method_other" text,
    "handling_fee" numeric default 0,
    "bank_name" text,
    "bank_code" text,
    "bank_branch" text,
    "branch_code" text,
    "account_number" text,
    "has_attachment" boolean default false,
    "attachment_desc" text,
    "has_invoice" text,
    "invoice_date" date,
    "remarks" text,
    "creator_name" text,
    "apply_date" date default CURRENT_DATE,
    "status" text default 'pending_approval'::text,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "current_step" integer default 1,
    "rejection_reason" text,
    "sign_manager_url" text,
    "sign_manager_at" timestamp with time zone,
    "sign_manager_by" uuid,
    "sign_accountant_url" text,
    "sign_accountant_at" timestamp with time zone,
    "sign_accountant_by" uuid,
    "sign_audit_url" text,
    "sign_audit_at" timestamp with time zone,
    "sign_audit_by" uuid,
    "sign_cashier_url" text,
    "sign_cashier_at" timestamp with time zone,
    "sign_cashier_by" uuid,
    "sign_boss_url" text,
    "sign_boss_at" timestamp with time zone,
    "sign_boss_by" uuid,
    "signature_url" text,
    "attachments" jsonb,
    "is_paper_received" boolean default false,
    "applicant_id" uuid default auth.uid(),
    "invoice_number" text,
    "has_voucher" boolean default false,
    "voucher_number" text
      );


alter table "payment_approval"."payment_requests" enable row level security;


  create table "public"."brands" (
    "id" bigint generated by default as identity not null,
    "name" text not null,
    "brand_id" text
      );



  create table "public"."departments" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(100) not null,
    "code" character varying(20),
    "description" text,
    "manager_id" uuid,
    "parent_department_id" uuid,
    "email" character varying(255),
    "phone" character varying(50),
    "location" character varying(200),
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid,
    "deleted_at" timestamp with time zone
      );


alter table "public"."departments" enable row level security;


  create table "public"."employees" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "employee_id" character varying(50) not null,
    "name" character varying(100) not null,
    "name_en" character varying(100),
    "email" character varying(255),
    "phone" character varying(50),
    "mobile" character varying(50),
    "extension" character varying(20),
    "department_id" uuid,
    "position" character varying(100),
    "job_title" character varying(100),
    "employee_type" character varying(50) default 'full-time'::character varying,
    "level" character varying(50),
    "supervisor_id" uuid,
    "hire_date" date,
    "contract_start_date" date,
    "contract_end_date" date,
    "probation_end_date" date,
    "resignation_date" date,
    "office_location" character varying(200),
    "work_location" character varying(200),
    "seat_number" character varying(50),
    "id_number" character varying(50),
    "passport_number" character varying(50),
    "birth_date" date,
    "gender" character varying(20),
    "nationality" character varying(50),
    "emergency_contact_name" character varying(100),
    "emergency_contact_phone" character varying(50),
    "emergency_contact_relationship" character varying(50),
    "bank_name" character varying(100),
    "bank_account" character varying(100),
    "status" character varying(50) default 'active'::character varying,
    "is_active" boolean default true,
    "role" character varying(50) default 'user'::character varying,
    "permissions" jsonb default '[]'::jsonb,
    "notes" text,
    "avatar_url" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "created_by" uuid,
    "deleted_at" timestamp with time zone
      );


alter table "public"."employees" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "email" text,
    "full_name" text,
    "role" character varying(50) default 'user'::character varying,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone default timezone('utc'::text, now()),
    "avatar_url" text
      );



  create table "public"."stores" (
    "id" bigint generated by default as identity not null,
    "brand_id" bigint not null,
    "name" text not null,
    "code" text,
    "is_active" boolean default true
      );



  create table "reviews_data"."brands" (
    "brand_id" bigint generated by default as identity not null,
    "name" text not null,
    "created_at" timestamp with time zone default now(),
    "code" text
      );



  create table "reviews_data"."places" (
    "id" bigint generated by default as identity not null,
    "place_id" text not null,
    "name" text,
    "description" text,
    "address" text,
    "main_category" text,
    "categories" jsonb,
    "rating" numeric,
    "review_count" integer,
    "review_keywords" jsonb,
    "reviews_per_rating" jsonb,
    "price_range" text,
    "phone" text,
    "website" text,
    "google_maps_link" text,
    "reviews_link" text,
    "cid" text,
    "data_id" text,
    "lat" double precision,
    "lng" double precision,
    "plus_code" text,
    "detailed_address" jsonb,
    "featured_image" text,
    "images" jsonb,
    "about" jsonb,
    "menu" jsonb,
    "reservations" jsonb,
    "order_online_links" jsonb,
    "competitors" jsonb,
    "opening_hours" jsonb,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "brand_id" bigint
      );


alter table "reviews_data"."places" enable row level security;


  create table "reviews_data"."reviews" (
    "review_id" text not null,
    "place_id" text not null,
    "rating" numeric,
    "review_link" text,
    "created_at" timestamp with time zone default now(),
    "published_at" text,
    "published_at_date" text,
    "review_text" text,
    "sentiment" text,
    "tags" text[]
      );



  create table "service"."ticket_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "ticket_id" uuid not null,
    "from_user_id" uuid,
    "to_user_id" uuid not null,
    "reason" text,
    "created_at" timestamp with time zone default now()
      );


alter table "service"."ticket_assignments" enable row level security;


  create table "service"."ticket_categories" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "description" text,
    "icon" text default 'Tool'::text,
    "color" text default 'blue'::text,
    "department" text,
    "sla_hours" integer default 24,
    "is_active" boolean default true,
    "display_order" integer default 0,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "service"."ticket_categories" enable row level security;


  create table "service"."ticket_comments" (
    "id" uuid not null default gen_random_uuid(),
    "ticket_id" uuid not null,
    "user_id" uuid not null,
    "comment" text not null,
    "is_internal" boolean default false,
    "attachments" jsonb,
    "created_at" timestamp with time zone default now()
      );


alter table "service"."ticket_comments" enable row level security;


  create table "service"."ticket_history" (
    "id" uuid not null default gen_random_uuid(),
    "ticket_id" uuid not null,
    "user_id" uuid,
    "action" text not null,
    "old_value" text,
    "new_value" text,
    "description" text,
    "created_at" timestamp with time zone default now()
      );


alter table "service"."ticket_history" enable row level security;


  create table "service"."tickets" (
    "id" uuid not null default gen_random_uuid(),
    "ticket_number" text not null,
    "category_id" uuid,
    "title" text not null,
    "description" text not null,
    "priority" text default 'normal'::text,
    "status" text default 'open'::text,
    "reporter_id" uuid not null,
    "reporter_store_id" uuid,
    "reporter_department" text,
    "reporter_phone" text,
    "location" text,
    "assignee_id" uuid,
    "assigned_at" timestamp with time zone,
    "started_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "due_at" timestamp with time zone,
    "is_overdue" boolean default false,
    "attachments" jsonb,
    "rating" integer,
    "feedback" text,
    "rated_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "service"."tickets" enable row level security;


  create table "software_maintenance"."audit_logs" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "action" text not null,
    "entity_type" text not null,
    "entity_id" uuid,
    "old_values" jsonb,
    "new_values" jsonb,
    "ip_address" text,
    "created_at" timestamp with time zone default now()
      );


alter table "software_maintenance"."audit_logs" enable row level security;


  create table "software_maintenance"."devices" (
    "id" uuid not null default gen_random_uuid(),
    "name" character varying(100) not null,
    "device_type" character varying(50) default 'desktop'::character varying,
    "serial_number" character varying(100),
    "mac_address" character varying(50),
    "ip_address" character varying(50),
    "location" character varying(200),
    "employee_id" uuid,
    "purchase_date" date,
    "status" character varying(20) default 'active'::character varying,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );



  create table "software_maintenance"."license_assignments" (
    "id" uuid not null default gen_random_uuid(),
    "license_id" uuid not null,
    "employee_id" uuid not null,
    "assigned_date" date default CURRENT_DATE,
    "unassigned_date" date,
    "computer_name" text,
    "computer_serial" text,
    "is_active" boolean default true,
    "notes" text,
    "assigned_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "device_id" uuid
      );


alter table "software_maintenance"."license_assignments" enable row level security;


  create table "software_maintenance"."licenses" (
    "id" uuid not null default gen_random_uuid(),
    "software_id" uuid,
    "license_key" text,
    "license_type" text not null,
    "quantity" integer default 1,
    "assigned_count" integer default 0,
    "purchase_date" date,
    "expiry_date" date,
    "purchase_price" numeric(10,2),
    "currency" text default 'TWD'::text,
    "purchase_from" text,
    "invoice_number" text,
    "order_number" text,
    "status" text default 'active'::text,
    "notes" text,
    "metadata" jsonb default '{}'::jsonb,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now(),
    "renewal_price" numeric(10,2),
    "vendor_contact" text,
    "license_model" text
      );


alter table "software_maintenance"."licenses" enable row level security;


  create table "software_maintenance"."software" (
    "id" uuid not null default gen_random_uuid(),
    "vendor_id" uuid,
    "name" text not null,
    "category" text,
    "version" text,
    "description" text,
    "license_model" text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "software_maintenance"."software" enable row level security;


  create table "software_maintenance"."vendors" (
    "id" uuid not null default gen_random_uuid(),
    "name" text not null,
    "website" text,
    "support_email" text,
    "support_phone" text,
    "notes" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "software_maintenance"."vendors" enable row level security;

CREATE INDEX idx_maintenance_date ON car_rental.maintenance_records USING btree (maintenance_date);

CREATE INDEX idx_maintenance_type ON car_rental.maintenance_records USING btree (maintenance_type);

CREATE INDEX idx_maintenance_vehicle ON car_rental.maintenance_records USING btree (vehicle_id);

CREATE INDEX idx_rental_requests_dates ON car_rental.rental_requests USING btree (start_date, end_date);

CREATE INDEX idx_rental_requests_requester ON car_rental.rental_requests USING btree (requester_id);

CREATE INDEX idx_rental_requests_status ON car_rental.rental_requests USING btree (status);

CREATE INDEX idx_rentals_dates ON car_rental.rentals USING btree (start_date, end_date);

CREATE INDEX idx_rentals_renter ON car_rental.rentals USING btree (renter_id);

CREATE INDEX idx_rentals_status ON car_rental.rentals USING btree (status);

CREATE INDEX idx_rentals_vehicle ON car_rental.rentals USING btree (vehicle_id);

CREATE INDEX idx_vehicles_plate ON car_rental.vehicles USING btree (plate_number) WHERE (deleted_at IS NULL);

CREATE INDEX idx_vehicles_status ON car_rental.vehicles USING btree (status) WHERE (deleted_at IS NULL);

CREATE INDEX idx_vehicles_type ON car_rental.vehicles USING btree (vehicle_type) WHERE (deleted_at IS NULL);

CREATE UNIQUE INDEX maintenance_records_pkey ON car_rental.maintenance_records USING btree (id);

select 1; 
-- CREATE INDEX prevent_overlapping_rentals ON car_rental.rentals USING gist (vehicle_id, tsrange((start_date)::timestamp without time zone, (end_date)::timestamp without time zone, '[]'::text));

CREATE UNIQUE INDEX rental_requests_pkey ON car_rental.rental_requests USING btree (id);

CREATE UNIQUE INDEX rentals_pkey ON car_rental.rentals USING btree (id);

CREATE UNIQUE INDEX vehicles_pkey ON car_rental.vehicles USING btree (id);

CREATE UNIQUE INDEX vehicles_plate_number_key ON car_rental.vehicles USING btree (plate_number);

CREATE UNIQUE INDEX announcement_reads_announcement_id_user_id_key ON eip.announcement_reads USING btree (announcement_id, user_id);

CREATE UNIQUE INDEX announcement_reads_pkey ON eip.announcement_reads USING btree (id);

CREATE UNIQUE INDEX announcements_pkey ON eip.announcements USING btree (id);

CREATE UNIQUE INDEX document_categories_pkey ON eip.document_categories USING btree (id);

CREATE UNIQUE INDEX document_favorites_document_id_user_id_key ON eip.document_favorites USING btree (document_id, user_id);

CREATE UNIQUE INDEX document_favorites_pkey ON eip.document_favorites USING btree (id);

CREATE UNIQUE INDEX document_versions_pkey ON eip.document_versions USING btree (id);

CREATE UNIQUE INDEX documents_pkey ON eip.documents USING btree (id);

CREATE INDEX idx_announcement_reads_announcement ON eip.announcement_reads USING btree (announcement_id);

CREATE INDEX idx_announcement_reads_user ON eip.announcement_reads USING btree (user_id);

CREATE INDEX idx_announcements_active ON eip.announcements USING btree (is_active);

CREATE INDEX idx_announcements_published ON eip.announcements USING btree (published_at);

CREATE INDEX idx_documents_author ON eip.documents USING btree (author_id);

CREATE INDEX idx_documents_category ON eip.documents USING btree (category_id);

CREATE INDEX idx_documents_status ON eip.documents USING btree (status);

CREATE INDEX idx_documents_tags ON eip.documents USING gin (tags);

CREATE UNIQUE INDEX bookings_pkey ON meeting_system.bookings USING btree (id);

CREATE INDEX idx_bookings_room_date ON meeting_system.bookings USING btree (room_id, booking_date);

CREATE INDEX idx_bookings_user ON meeting_system.bookings USING btree (user_id);

CREATE INDEX idx_rooms_is_active ON meeting_system.rooms USING btree (is_active);

select 1; 
-- CREATE INDEX no_overlapping_bookings ON meeting_system.bookings USING gist (room_id, period) WHERE ((status)::text <> 'cancelled'::text);

CREATE UNIQUE INDEX rooms_pkey ON meeting_system.rooms USING btree (id);

CREATE UNIQUE INDEX bank_branches_pkey ON payment_approval.bank_branches USING btree (id);

CREATE UNIQUE INDEX banks_pkey ON payment_approval.banks USING btree (bank_code);

CREATE UNIQUE INDEX branches_pkey ON payment_approval.branches USING btree (id);

CREATE INDEX idx_bank_branches_code ON payment_approval.bank_branches USING btree (bank_code);

CREATE INDEX idx_payment_requests_brand ON payment_approval.payment_requests USING btree (brand);

CREATE INDEX idx_payment_requests_created_at ON payment_approval.payment_requests USING btree (created_at DESC);

CREATE INDEX idx_payment_requests_date ON payment_approval.payment_requests USING btree (payment_date);

CREATE INDEX idx_payment_requests_status ON payment_approval.payment_requests USING btree (status);

CREATE UNIQUE INDEX payment_requests_pkey ON payment_approval.payment_requests USING btree (id);

CREATE UNIQUE INDEX brands_name_key ON public.brands USING btree (name);

CREATE UNIQUE INDEX brands_pkey ON public.brands USING btree (id);

CREATE UNIQUE INDEX departments_code_key ON public.departments USING btree (code);

CREATE UNIQUE INDEX departments_name_key ON public.departments USING btree (name);

CREATE UNIQUE INDEX departments_pkey ON public.departments USING btree (id);

CREATE UNIQUE INDEX employees_email_key ON public.employees USING btree (email);

CREATE UNIQUE INDEX employees_employee_id_key ON public.employees USING btree (employee_id);

CREATE UNIQUE INDEX employees_pkey ON public.employees USING btree (id);

CREATE UNIQUE INDEX employees_user_id_key ON public.employees USING btree (user_id);

CREATE INDEX idx_departments_is_active ON public.departments USING btree (is_active) WHERE (deleted_at IS NULL);

CREATE INDEX idx_departments_parent ON public.departments USING btree (parent_department_id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_employees_department ON public.employees USING btree (department_id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_employees_email ON public.employees USING btree (email) WHERE (deleted_at IS NULL);

CREATE INDEX idx_employees_employee_id ON public.employees USING btree (employee_id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_employees_name ON public.employees USING btree (name) WHERE (deleted_at IS NULL);

CREATE INDEX idx_employees_status ON public.employees USING btree (status) WHERE (deleted_at IS NULL);

CREATE INDEX idx_employees_supervisor ON public.employees USING btree (supervisor_id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_employees_user_id ON public.employees USING btree (user_id) WHERE (deleted_at IS NULL);

CREATE INDEX idx_stores_brand_id ON public.stores USING btree (brand_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX stores_pkey ON public.stores USING btree (id);

CREATE UNIQUE INDEX brands_name_key ON reviews_data.brands USING btree (name);

CREATE UNIQUE INDEX brands_pkey ON reviews_data.brands USING btree (brand_id);

CREATE INDEX idx_places_lat_lng ON reviews_data.places USING btree (lat, lng);

CREATE INDEX idx_places_name ON reviews_data.places USING btree (name);

CREATE INDEX idx_places_rating ON reviews_data.places USING btree (rating);

CREATE INDEX idx_reviews_place_id ON reviews_data.reviews USING btree (place_id);

CREATE UNIQUE INDEX places_pkey ON reviews_data.places USING btree (place_id);

CREATE UNIQUE INDEX reviews_pkey ON reviews_data.reviews USING btree (review_id);

CREATE INDEX idx_ticket_comments_ticket ON service.ticket_comments USING btree (ticket_id);

CREATE INDEX idx_ticket_history_ticket ON service.ticket_history USING btree (ticket_id);

CREATE INDEX idx_tickets_assignee ON service.tickets USING btree (assignee_id);

CREATE INDEX idx_tickets_reporter ON service.tickets USING btree (reporter_id);

CREATE INDEX idx_tickets_status ON service.tickets USING btree (status);

CREATE UNIQUE INDEX ticket_assignments_pkey ON service.ticket_assignments USING btree (id);

CREATE UNIQUE INDEX ticket_categories_pkey ON service.ticket_categories USING btree (id);

CREATE UNIQUE INDEX ticket_comments_pkey ON service.ticket_comments USING btree (id);

CREATE UNIQUE INDEX ticket_history_pkey ON service.ticket_history USING btree (id);

CREATE UNIQUE INDEX tickets_pkey ON service.tickets USING btree (id);

CREATE UNIQUE INDEX tickets_ticket_number_key ON service.tickets USING btree (ticket_number);

CREATE UNIQUE INDEX audit_logs_pkey ON software_maintenance.audit_logs USING btree (id);

CREATE UNIQUE INDEX devices_pkey ON software_maintenance.devices USING btree (id);

CREATE INDEX idx_assignments_active ON software_maintenance.license_assignments USING btree (is_active);

CREATE INDEX idx_assignments_employee ON software_maintenance.license_assignments USING btree (employee_id);

CREATE INDEX idx_assignments_license ON software_maintenance.license_assignments USING btree (license_id);

CREATE INDEX idx_licenses_expiry ON software_maintenance.licenses USING btree (expiry_date);

CREATE INDEX idx_licenses_software ON software_maintenance.licenses USING btree (software_id);

CREATE INDEX idx_licenses_status ON software_maintenance.licenses USING btree (status);

CREATE INDEX idx_software_category ON software_maintenance.software USING btree (category);

CREATE INDEX idx_software_vendor ON software_maintenance.software USING btree (vendor_id);

CREATE UNIQUE INDEX license_assignments_license_id_employee_id_is_active_key ON software_maintenance.license_assignments USING btree (license_id, employee_id, is_active);

CREATE UNIQUE INDEX license_assignments_pkey ON software_maintenance.license_assignments USING btree (id);

CREATE UNIQUE INDEX licenses_pkey ON software_maintenance.licenses USING btree (id);

CREATE UNIQUE INDEX software_pkey ON software_maintenance.software USING btree (id);

CREATE UNIQUE INDEX uk_software_name ON software_maintenance.software USING btree (name);

CREATE UNIQUE INDEX vendors_name_key ON software_maintenance.vendors USING btree (name);

CREATE UNIQUE INDEX vendors_pkey ON software_maintenance.vendors USING btree (id);

alter table "car_rental"."maintenance_records" add constraint "maintenance_records_pkey" PRIMARY KEY using index "maintenance_records_pkey";

alter table "car_rental"."rental_requests" add constraint "rental_requests_pkey" PRIMARY KEY using index "rental_requests_pkey";

alter table "car_rental"."rentals" add constraint "rentals_pkey" PRIMARY KEY using index "rentals_pkey";

alter table "car_rental"."vehicles" add constraint "vehicles_pkey" PRIMARY KEY using index "vehicles_pkey";

alter table "eip"."announcement_reads" add constraint "announcement_reads_pkey" PRIMARY KEY using index "announcement_reads_pkey";

alter table "eip"."announcements" add constraint "announcements_pkey" PRIMARY KEY using index "announcements_pkey";

alter table "eip"."document_categories" add constraint "document_categories_pkey" PRIMARY KEY using index "document_categories_pkey";

alter table "eip"."document_favorites" add constraint "document_favorites_pkey" PRIMARY KEY using index "document_favorites_pkey";

alter table "eip"."document_versions" add constraint "document_versions_pkey" PRIMARY KEY using index "document_versions_pkey";

alter table "eip"."documents" add constraint "documents_pkey" PRIMARY KEY using index "documents_pkey";

alter table "meeting_system"."bookings" add constraint "bookings_pkey" PRIMARY KEY using index "bookings_pkey";

alter table "meeting_system"."rooms" add constraint "rooms_pkey" PRIMARY KEY using index "rooms_pkey";

alter table "payment_approval"."bank_branches" add constraint "bank_branches_pkey" PRIMARY KEY using index "bank_branches_pkey";

alter table "payment_approval"."banks" add constraint "banks_pkey" PRIMARY KEY using index "banks_pkey";

alter table "payment_approval"."branches" add constraint "branches_pkey" PRIMARY KEY using index "branches_pkey";

alter table "payment_approval"."payment_requests" add constraint "payment_requests_pkey" PRIMARY KEY using index "payment_requests_pkey";

alter table "public"."brands" add constraint "brands_pkey" PRIMARY KEY using index "brands_pkey";

alter table "public"."departments" add constraint "departments_pkey" PRIMARY KEY using index "departments_pkey";

alter table "public"."employees" add constraint "employees_pkey" PRIMARY KEY using index "employees_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."stores" add constraint "stores_pkey" PRIMARY KEY using index "stores_pkey";

alter table "reviews_data"."brands" add constraint "brands_pkey" PRIMARY KEY using index "brands_pkey";

alter table "reviews_data"."places" add constraint "places_pkey" PRIMARY KEY using index "places_pkey";

alter table "reviews_data"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "service"."ticket_assignments" add constraint "ticket_assignments_pkey" PRIMARY KEY using index "ticket_assignments_pkey";

alter table "service"."ticket_categories" add constraint "ticket_categories_pkey" PRIMARY KEY using index "ticket_categories_pkey";

alter table "service"."ticket_comments" add constraint "ticket_comments_pkey" PRIMARY KEY using index "ticket_comments_pkey";

alter table "service"."ticket_history" add constraint "ticket_history_pkey" PRIMARY KEY using index "ticket_history_pkey";

alter table "service"."tickets" add constraint "tickets_pkey" PRIMARY KEY using index "tickets_pkey";

alter table "software_maintenance"."audit_logs" add constraint "audit_logs_pkey" PRIMARY KEY using index "audit_logs_pkey";

alter table "software_maintenance"."devices" add constraint "devices_pkey" PRIMARY KEY using index "devices_pkey";

alter table "software_maintenance"."license_assignments" add constraint "license_assignments_pkey" PRIMARY KEY using index "license_assignments_pkey";

alter table "software_maintenance"."licenses" add constraint "licenses_pkey" PRIMARY KEY using index "licenses_pkey";

alter table "software_maintenance"."software" add constraint "software_pkey" PRIMARY KEY using index "software_pkey";

alter table "software_maintenance"."vendors" add constraint "vendors_pkey" PRIMARY KEY using index "vendors_pkey";

alter table "car_rental"."maintenance_records" add constraint "maintenance_records_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "car_rental"."maintenance_records" validate constraint "maintenance_records_created_by_fkey";

alter table "car_rental"."maintenance_records" add constraint "maintenance_records_vehicle_id_fkey" FOREIGN KEY (vehicle_id) REFERENCES car_rental.vehicles(id) not valid;

alter table "car_rental"."maintenance_records" validate constraint "maintenance_records_vehicle_id_fkey";

alter table "car_rental"."rental_requests" add constraint "check_dates_logic" CHECK ((end_date > start_date)) not valid;

alter table "car_rental"."rental_requests" validate constraint "check_dates_logic";

alter table "car_rental"."rental_requests" add constraint "rental_requests_dates_check" CHECK ((end_date >= start_date)) not valid;

alter table "car_rental"."rental_requests" validate constraint "rental_requests_dates_check";

alter table "car_rental"."rental_requests" add constraint "rental_requests_requester_id_fkey" FOREIGN KEY (requester_id) REFERENCES public.employees(id) not valid;

alter table "car_rental"."rental_requests" validate constraint "rental_requests_requester_id_fkey";

alter table "car_rental"."rental_requests" add constraint "rental_requests_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public.employees(id) not valid;

alter table "car_rental"."rental_requests" validate constraint "rental_requests_reviewer_id_fkey";

alter table "car_rental"."rental_requests" add constraint "rental_requests_vehicle_id_fkey" FOREIGN KEY (vehicle_id) REFERENCES car_rental.vehicles(id) not valid;

alter table "car_rental"."rental_requests" validate constraint "rental_requests_vehicle_id_fkey";

alter table "car_rental"."rentals" add constraint "check_mileage_logic" CHECK ((end_mileage >= start_mileage)) not valid;

alter table "car_rental"."rentals" validate constraint "check_mileage_logic";

alter table "car_rental"."rentals" add constraint "prevent_overlapping_rentals" EXCLUDE USING gist (vehicle_id WITH =, tsrange((start_date)::timestamp without time zone, (end_date)::timestamp without time zone, '[]'::text) WITH &&);

alter table "car_rental"."rentals" add constraint "rentals_dates_check" CHECK ((end_date >= start_date)) not valid;

alter table "car_rental"."rentals" validate constraint "rentals_dates_check";

alter table "car_rental"."rentals" add constraint "rentals_mileage_check" CHECK (((end_mileage IS NULL) OR (start_mileage IS NULL) OR (end_mileage >= start_mileage))) not valid;

alter table "car_rental"."rentals" validate constraint "rentals_mileage_check";

alter table "car_rental"."rentals" add constraint "rentals_renter_id_fkey" FOREIGN KEY (renter_id) REFERENCES public.employees(id) not valid;

alter table "car_rental"."rentals" validate constraint "rentals_renter_id_fkey";

alter table "car_rental"."rentals" add constraint "rentals_request_id_fkey" FOREIGN KEY (request_id) REFERENCES car_rental.rental_requests(id) not valid;

alter table "car_rental"."rentals" validate constraint "rentals_request_id_fkey";

alter table "car_rental"."rentals" add constraint "rentals_vehicle_id_fkey" FOREIGN KEY (vehicle_id) REFERENCES car_rental.vehicles(id) not valid;

alter table "car_rental"."rentals" validate constraint "rentals_vehicle_id_fkey";

alter table "car_rental"."vehicles" add constraint "vehicles_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "car_rental"."vehicles" validate constraint "vehicles_created_by_fkey";

alter table "car_rental"."vehicles" add constraint "vehicles_plate_number_key" UNIQUE using index "vehicles_plate_number_key";

alter table "car_rental"."vehicles" add constraint "vehicles_year_check" CHECK (((year >= 1900) AND ((year)::numeric <= (EXTRACT(year FROM now()) + (1)::numeric)))) not valid;

alter table "car_rental"."vehicles" validate constraint "vehicles_year_check";

alter table "eip"."announcement_reads" add constraint "announcement_reads_announcement_id_fkey" FOREIGN KEY (announcement_id) REFERENCES eip.announcements(id) ON DELETE CASCADE not valid;

alter table "eip"."announcement_reads" validate constraint "announcement_reads_announcement_id_fkey";

alter table "eip"."announcement_reads" add constraint "announcement_reads_announcement_id_user_id_key" UNIQUE using index "announcement_reads_announcement_id_user_id_key";

alter table "eip"."announcement_reads" add constraint "announcement_reads_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "eip"."announcement_reads" validate constraint "announcement_reads_user_id_fkey";

alter table "eip"."announcements" add constraint "announcements_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id) not valid;

alter table "eip"."announcements" validate constraint "announcements_author_id_fkey";

alter table "eip"."announcements" add constraint "announcements_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "eip"."announcements" validate constraint "announcements_priority_check";

alter table "eip"."announcements" add constraint "announcements_type_check" CHECK ((type = ANY (ARRAY['general'::text, 'emergency'::text, 'maintenance'::text, 'event'::text]))) not valid;

alter table "eip"."announcements" validate constraint "announcements_type_check";

alter table "eip"."document_categories" add constraint "document_categories_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES eip.document_categories(id) ON DELETE CASCADE not valid;

alter table "eip"."document_categories" validate constraint "document_categories_parent_id_fkey";

alter table "eip"."document_favorites" add constraint "document_favorites_document_id_fkey" FOREIGN KEY (document_id) REFERENCES eip.documents(id) ON DELETE CASCADE not valid;

alter table "eip"."document_favorites" validate constraint "document_favorites_document_id_fkey";

alter table "eip"."document_favorites" add constraint "document_favorites_document_id_user_id_key" UNIQUE using index "document_favorites_document_id_user_id_key";

alter table "eip"."document_favorites" add constraint "document_favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "eip"."document_favorites" validate constraint "document_favorites_user_id_fkey";

alter table "eip"."document_versions" add constraint "document_versions_created_by_fkey" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "eip"."document_versions" validate constraint "document_versions_created_by_fkey";

alter table "eip"."document_versions" add constraint "document_versions_document_id_fkey" FOREIGN KEY (document_id) REFERENCES eip.documents(id) ON DELETE CASCADE not valid;

alter table "eip"."document_versions" validate constraint "document_versions_document_id_fkey";

alter table "eip"."documents" add constraint "documents_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id) not valid;

alter table "eip"."documents" validate constraint "documents_author_id_fkey";

alter table "eip"."documents" add constraint "documents_category_id_fkey" FOREIGN KEY (category_id) REFERENCES eip.document_categories(id) ON DELETE SET NULL not valid;

alter table "eip"."documents" validate constraint "documents_category_id_fkey";

alter table "eip"."documents" add constraint "documents_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'archived'::text]))) not valid;

alter table "eip"."documents" validate constraint "documents_status_check";

alter table "meeting_system"."bookings" add constraint "bookings_room_id_fkey" FOREIGN KEY (room_id) REFERENCES meeting_system.rooms(id) ON DELETE SET NULL not valid;

alter table "meeting_system"."bookings" validate constraint "bookings_room_id_fkey";

alter table "meeting_system"."bookings" add constraint "bookings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "meeting_system"."bookings" validate constraint "bookings_user_id_fkey";

alter table "meeting_system"."bookings" add constraint "no_overlapping_bookings" EXCLUDE USING gist (room_id WITH =, period WITH &&) WHERE (((status)::text <> 'cancelled'::text));

alter table "meeting_system"."bookings" add constraint "valid_time_range" CHECK ((end_time > start_time)) not valid;

alter table "meeting_system"."bookings" validate constraint "valid_time_range";

alter table "payment_approval"."branches" add constraint "branches_bank_code_fkey" FOREIGN KEY (bank_code) REFERENCES payment_approval.banks(bank_code) not valid;

alter table "payment_approval"."branches" validate constraint "branches_bank_code_fkey";

alter table "payment_approval"."payment_requests" add constraint "payment_requests_amount_check" CHECK ((amount >= (0)::numeric)) not valid;

alter table "payment_approval"."payment_requests" validate constraint "payment_requests_amount_check";

alter table "payment_approval"."payment_requests" add constraint "payment_requests_applicant_id_fkey" FOREIGN KEY (applicant_id) REFERENCES auth.users(id) ON DELETE SET NULL not valid;

alter table "payment_approval"."payment_requests" validate constraint "payment_requests_applicant_id_fkey";

alter table "payment_approval"."payment_requests" add constraint "payment_requests_has_invoice_check" CHECK ((has_invoice = ANY (ARRAY['yes'::text, 'no_yet'::text, 'none'::text]))) not valid;

alter table "payment_approval"."payment_requests" validate constraint "payment_requests_has_invoice_check";

alter table "payment_approval"."payment_requests" add constraint "payment_requests_payment_method_check" CHECK ((payment_method = ANY (ARRAY['transfer'::text, 'cash'::text, 'other'::text]))) not valid;

alter table "payment_approval"."payment_requests" validate constraint "payment_requests_payment_method_check";

alter table "payment_approval"."payment_requests" add constraint "payment_requests_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending_unit_manager'::text, 'pending_accountant'::text, 'pending_audit_manager'::text, 'pending_cashier'::text, 'pending_boss'::text, 'completed'::text, 'rejected'::text, 'revoked'::text]))) not valid;

alter table "payment_approval"."payment_requests" validate constraint "payment_requests_status_check";

alter table "payment_approval"."payment_requests" add constraint "payment_requests_tax_type_check" CHECK ((tax_type = ANY (ARRAY['tax_included'::text, 'tax_excluded'::text]))) not valid;

alter table "payment_approval"."payment_requests" validate constraint "payment_requests_tax_type_check";

alter table "public"."brands" add constraint "brands_name_key" UNIQUE using index "brands_name_key";

alter table "public"."departments" add constraint "departments_code_key" UNIQUE using index "departments_code_key";

alter table "public"."departments" add constraint "departments_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."departments" validate constraint "departments_created_by_fkey";

alter table "public"."departments" add constraint "departments_name_key" UNIQUE using index "departments_name_key";

alter table "public"."departments" add constraint "departments_parent_department_id_fkey" FOREIGN KEY (parent_department_id) REFERENCES public.departments(id) not valid;

alter table "public"."departments" validate constraint "departments_parent_department_id_fkey";

alter table "public"."departments" add constraint "fk_departments_manager" FOREIGN KEY (manager_id) REFERENCES public.employees(id) not valid;

alter table "public"."departments" validate constraint "fk_departments_manager";

alter table "public"."employees" add constraint "employees_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."employees" validate constraint "employees_created_by_fkey";

alter table "public"."employees" add constraint "employees_department_id_fkey" FOREIGN KEY (department_id) REFERENCES public.departments(id) not valid;

alter table "public"."employees" validate constraint "employees_department_id_fkey";

alter table "public"."employees" add constraint "employees_email_check" CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)) not valid;

alter table "public"."employees" validate constraint "employees_email_check";

alter table "public"."employees" add constraint "employees_email_key" UNIQUE using index "employees_email_key";

alter table "public"."employees" add constraint "employees_employee_id_key" UNIQUE using index "employees_employee_id_key";

alter table "public"."employees" add constraint "employees_status_check" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'on_leave'::character varying, 'resigned'::character varying, 'terminated'::character varying])::text[]))) not valid;

alter table "public"."employees" validate constraint "employees_status_check";

alter table "public"."employees" add constraint "employees_supervisor_id_fkey" FOREIGN KEY (supervisor_id) REFERENCES public.employees(id) not valid;

alter table "public"."employees" validate constraint "employees_supervisor_id_fkey";

alter table "public"."employees" add constraint "employees_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."employees" validate constraint "employees_user_id_fkey";

alter table "public"."employees" add constraint "employees_user_id_key" UNIQUE using index "employees_user_id_key";

alter table "public"."employees" add constraint "fk_employees_department" FOREIGN KEY (department_id) REFERENCES public.departments(id) not valid;

alter table "public"."employees" validate constraint "fk_employees_department";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."stores" add constraint "stores_brand_id_fkey" FOREIGN KEY (brand_id) REFERENCES public.brands(id) not valid;

alter table "public"."stores" validate constraint "stores_brand_id_fkey";

alter table "reviews_data"."brands" add constraint "brands_name_key" UNIQUE using index "brands_name_key";

alter table "reviews_data"."places" add constraint "fk_places_brand" FOREIGN KEY (brand_id) REFERENCES reviews_data.brands(brand_id) not valid;

alter table "reviews_data"."places" validate constraint "fk_places_brand";

alter table "reviews_data"."reviews" add constraint "fk_reviews_place" FOREIGN KEY (place_id) REFERENCES reviews_data.places(place_id) ON DELETE CASCADE not valid;

alter table "reviews_data"."reviews" validate constraint "fk_reviews_place";

alter table "service"."ticket_assignments" add constraint "ticket_assignments_from_user_id_fkey" FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) not valid;

alter table "service"."ticket_assignments" validate constraint "ticket_assignments_from_user_id_fkey";

alter table "service"."ticket_assignments" add constraint "ticket_assignments_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES service.tickets(id) ON DELETE CASCADE not valid;

alter table "service"."ticket_assignments" validate constraint "ticket_assignments_ticket_id_fkey";

alter table "service"."ticket_assignments" add constraint "ticket_assignments_to_user_id_fkey" FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) not valid;

alter table "service"."ticket_assignments" validate constraint "ticket_assignments_to_user_id_fkey";

alter table "service"."ticket_comments" add constraint "ticket_comments_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES service.tickets(id) ON DELETE CASCADE not valid;

alter table "service"."ticket_comments" validate constraint "ticket_comments_ticket_id_fkey";

alter table "service"."ticket_comments" add constraint "ticket_comments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "service"."ticket_comments" validate constraint "ticket_comments_user_id_fkey";

alter table "service"."ticket_history" add constraint "ticket_history_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES service.tickets(id) ON DELETE CASCADE not valid;

alter table "service"."ticket_history" validate constraint "ticket_history_ticket_id_fkey";

alter table "service"."ticket_history" add constraint "ticket_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "service"."ticket_history" validate constraint "ticket_history_user_id_fkey";

alter table "service"."tickets" add constraint "tickets_assignee_id_fkey" FOREIGN KEY (assignee_id) REFERENCES public.profiles(id) not valid;

alter table "service"."tickets" validate constraint "tickets_assignee_id_fkey";

alter table "service"."tickets" add constraint "tickets_category_id_fkey" FOREIGN KEY (category_id) REFERENCES service.ticket_categories(id) not valid;

alter table "service"."tickets" validate constraint "tickets_category_id_fkey";

alter table "service"."tickets" add constraint "tickets_priority_check" CHECK ((priority = ANY (ARRAY['low'::text, 'normal'::text, 'high'::text, 'urgent'::text]))) not valid;

alter table "service"."tickets" validate constraint "tickets_priority_check";

alter table "service"."tickets" add constraint "tickets_rating_check" CHECK (((rating >= 1) AND (rating <= 5))) not valid;

alter table "service"."tickets" validate constraint "tickets_rating_check";

alter table "service"."tickets" add constraint "tickets_reporter_id_fkey" FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) not valid;

alter table "service"."tickets" validate constraint "tickets_reporter_id_fkey";

alter table "service"."tickets" add constraint "tickets_status_check" CHECK ((status = ANY (ARRAY['open'::text, 'assigned'::text, 'in_progress'::text, 'pending'::text, 'resolved'::text, 'closed'::text, 'cancelled'::text]))) not valid;

alter table "service"."tickets" validate constraint "tickets_status_check";

alter table "service"."tickets" add constraint "tickets_ticket_number_key" UNIQUE using index "tickets_ticket_number_key";

alter table "software_maintenance"."audit_logs" add constraint "fk_audit_logs_user_id" FOREIGN KEY (user_id) REFERENCES public.profiles(id) not valid;

alter table "software_maintenance"."audit_logs" validate constraint "fk_audit_logs_user_id";

alter table "software_maintenance"."devices" add constraint "fk_devices_employees" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "software_maintenance"."devices" validate constraint "fk_devices_employees";

alter table "software_maintenance"."license_assignments" add constraint "fk_assignments_device" FOREIGN KEY (device_id) REFERENCES software_maintenance.devices(id) not valid;

alter table "software_maintenance"."license_assignments" validate constraint "fk_assignments_device";

alter table "software_maintenance"."license_assignments" add constraint "fk_assignments_employees" FOREIGN KEY (employee_id) REFERENCES public.employees(id) not valid;

alter table "software_maintenance"."license_assignments" validate constraint "fk_assignments_employees";

alter table "software_maintenance"."license_assignments" add constraint "fk_license_assignments_assigned_by" FOREIGN KEY (assigned_by) REFERENCES public.profiles(id) not valid;

alter table "software_maintenance"."license_assignments" validate constraint "fk_license_assignments_assigned_by";

alter table "software_maintenance"."license_assignments" add constraint "license_assignments_license_id_employee_id_is_active_key" UNIQUE using index "license_assignments_license_id_employee_id_is_active_key";

alter table "software_maintenance"."license_assignments" add constraint "license_assignments_license_id_fkey" FOREIGN KEY (license_id) REFERENCES software_maintenance.licenses(id) ON DELETE CASCADE not valid;

alter table "software_maintenance"."license_assignments" validate constraint "license_assignments_license_id_fkey";

alter table "software_maintenance"."licenses" add constraint "fk_licenses_created_by" FOREIGN KEY (created_by) REFERENCES public.profiles(id) not valid;

alter table "software_maintenance"."licenses" validate constraint "fk_licenses_created_by";

alter table "software_maintenance"."licenses" add constraint "licenses_software_id_fkey" FOREIGN KEY (software_id) REFERENCES software_maintenance.software(id) ON DELETE SET NULL not valid;

alter table "software_maintenance"."licenses" validate constraint "licenses_software_id_fkey";

alter table "software_maintenance"."licenses" add constraint "licenses_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'expired'::text, 'cancelled'::text, 'pending'::text]))) not valid;

alter table "software_maintenance"."licenses" validate constraint "licenses_status_check";

alter table "software_maintenance"."software" add constraint "software_license_model_check" CHECK ((license_model = ANY (ARRAY['subscription'::text, 'perpetual'::text, 'volume'::text, 'oem'::text, 'free'::text]))) not valid;

alter table "software_maintenance"."software" validate constraint "software_license_model_check";

alter table "software_maintenance"."software" add constraint "software_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES software_maintenance.vendors(id) ON DELETE SET NULL not valid;

alter table "software_maintenance"."software" validate constraint "software_vendor_id_fkey";

alter table "software_maintenance"."software" add constraint "uk_software_name" UNIQUE using index "uk_software_name";

alter table "software_maintenance"."vendors" add constraint "vendors_name_key" UNIQUE using index "vendors_name_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION car_rental.get_current_employee_id()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN (
    SELECT id FROM public.employees
    WHERE user_id = auth.uid()
    AND deleted_at IS NULL
    LIMIT 1
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION car_rental.is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'hr')
    AND deleted_at IS NULL
  );
END;
$function$
;

create or replace view "car_rental"."rental_requests_view" as  SELECT r.id,
    r.requester_id,
    r.requester_department,
    r.requester_phone,
    r.vehicle_id,
    r.preferred_vehicle_type,
    r.start_date,
    r.end_date,
    r.start_time,
    r.end_time,
    r.purpose,
    r.destination,
    r.estimated_mileage,
    r.status,
    r.reviewer_id,
    r.reviewed_at,
    r.review_comment,
    r.created_at,
    r.updated_at,
        CASE
            WHEN (v.id IS NOT NULL) THEN json_build_object('id', v.id, 'plate_number', v.plate_number, 'brand', v.brand, 'model', v.model, 'vehicle_type', v.vehicle_type, 'color', v.color)
            ELSE NULL::json
        END AS vehicle,
        CASE
            WHEN (req.id IS NOT NULL) THEN json_build_object('id', req.id, 'employee_id', req.employee_id, 'name', req.name, 'email', req.email, 'phone', req.phone, 'position', req."position", 'department', ( SELECT json_build_object('id', d.id, 'name', d.name) AS json_build_object
               FROM public.departments d
              WHERE (d.id = req.department_id)))
            ELSE NULL::json
        END AS requester,
        CASE
            WHEN (rev.id IS NOT NULL) THEN json_build_object('id', rev.id, 'employee_id', rev.employee_id, 'name', rev.name)
            ELSE NULL::json
        END AS reviewer
   FROM (((car_rental.rental_requests r
     LEFT JOIN car_rental.vehicles v ON ((r.vehicle_id = v.id)))
     LEFT JOIN public.employees req ON ((r.requester_id = req.id)))
     LEFT JOIN public.employees rev ON ((r.reviewer_id = rev.id)));


create or replace view "car_rental"."rentals_view" as  SELECT rt.id,
    rt.request_id,
    rt.vehicle_id,
    rt.renter_id,
    rt.start_date,
    rt.end_date,
    rt.actual_start_time,
    rt.actual_end_time,
    rt.start_mileage,
    rt.end_mileage,
    rt.total_mileage,
    rt.status,
    rt.pickup_checklist,
    rt.return_checklist,
    rt.notes,
    rt.created_at,
    rt.updated_at,
        CASE
            WHEN (v.id IS NOT NULL) THEN json_build_object('id', v.id, 'plate_number', v.plate_number, 'brand', v.brand, 'model', v.model, 'vehicle_type', v.vehicle_type, 'color', v.color)
            ELSE NULL::json
        END AS vehicle,
        CASE
            WHEN (rr.id IS NOT NULL) THEN json_build_object('id', rr.id, 'purpose', rr.purpose, 'destination', rr.destination, 'estimated_mileage', rr.estimated_mileage)
            ELSE NULL::json
        END AS request,
        CASE
            WHEN (emp.id IS NOT NULL) THEN json_build_object('id', emp.id, 'employee_id', emp.employee_id, 'name', emp.name, 'email', emp.email, 'position', emp."position", 'department', ( SELECT json_build_object('id', d.id, 'name', d.name) AS json_build_object
               FROM public.departments d
              WHERE (d.id = emp.department_id)))
            ELSE NULL::json
        END AS renter
   FROM (((car_rental.rentals rt
     LEFT JOIN car_rental.vehicles v ON ((rt.vehicle_id = v.id)))
     LEFT JOIN car_rental.rental_requests rr ON ((rt.request_id = rr.id)))
     LEFT JOIN public.employees emp ON ((rt.renter_id = emp.id)));


CREATE OR REPLACE FUNCTION car_rental.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION eip.get_unread_announcements_count()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unread_count
  FROM eip.announcements a
  WHERE a.is_active = true
  AND a.published_at <= NOW()
  AND (a.expires_at IS NULL OR a.expires_at > NOW())
  AND NOT EXISTS (
    SELECT 1 FROM eip.announcement_reads ar
    WHERE ar.announcement_id = a.id AND ar.user_id = auth.uid()
  );
  RETURN unread_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION eip.increment_document_download(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE eip.documents SET download_count = download_count + 1 WHERE id = p_document_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION eip.increment_document_view(p_document_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE eip.documents SET view_count = view_count + 1 WHERE id = p_document_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION eip.mark_announcement_as_read(p_announcement_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO eip.announcement_reads (announcement_id, user_id)
  VALUES (p_announcement_id, auth.uid())
  ON CONFLICT (announcement_id, user_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.approve_rental_request(p_request_id uuid, p_reviewer_id uuid, p_review_comment text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_vehicle_status TEXT;
  v_rental_id UUID;
BEGIN
  -- A. 鎖定並檢查申請單
  SELECT * INTO v_request 
  FROM car_rental.rental_requests 
  WHERE id = p_request_id 
  FOR UPDATE;

  IF v_request.id IS NULL THEN
    RAISE EXCEPTION '找不到該申請單';
  END IF;

  IF v_request.status != 'pending' THEN
    RAISE EXCEPTION '操作失敗：該申請單狀態已變更（可能已被取消或審核）。';
  END IF;

  -- B. 鎖定並檢查車輛
  SELECT status INTO v_vehicle_status
  FROM car_rental.vehicles
  WHERE id = v_request.vehicle_id
  FOR UPDATE;

  IF v_vehicle_status != 'available' THEN
    RAISE EXCEPTION '操作失敗：該車輛目前狀態不可用（%），請選擇其他車輛。', v_vehicle_status;
  END IF;

  -- C. 更新申請單狀態 -> approved
  UPDATE car_rental.rental_requests
  SET status = 'approved',
      reviewer_id = p_reviewer_id,
      reviewed_at = NOW(),
      review_comment = p_review_comment
  WHERE id = p_request_id;

  -- D. 建立租借記錄 (Rentals)
  INSERT INTO car_rental.rentals (
    request_id,
    vehicle_id,
    renter_id,
    start_date,
    end_date,
    status
  ) VALUES (
    p_request_id,
    v_request.vehicle_id,
    v_request.requester_id,
    v_request.start_date,
    v_request.end_date,
    'confirmed'
  ) RETURNING id INTO v_rental_id;

  -- E. 更新車輛狀態 -> rented
  UPDATE car_rental.vehicles
  SET status = 'rented'
  WHERE id = v_request.vehicle_id;

  -- F. 回傳成功
  RETURN jsonb_build_object('success', true, 'rental_id', v_rental_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cancel_approved_request(p_request_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_request RECORD;
  v_vehicle_id UUID;
BEGIN
  -- 1. 鎖定申請單
  SELECT * INTO v_request 
  FROM car_rental.rental_requests 
  WHERE id = p_request_id 
  FOR UPDATE;

  -- 檢查是否存在
  IF v_request.id IS NULL THEN
    RAISE EXCEPTION '找不到該申請單';
  END IF;

  -- 檢查狀態
  IF v_request.status != 'approved' THEN
    RAISE EXCEPTION '只能取消狀態為 approved 的申請單';
  END IF;

  v_vehicle_id := v_request.vehicle_id;

  -- 2. 更新申請單狀態 -> cancelled
  UPDATE car_rental.rental_requests
  SET status = 'cancelled'
  WHERE id = p_request_id;

  -- 3. 刪除該筆尚未開始的租借紀錄 (Rentals)
  -- 注意：我們只刪除 status='confirmed' (未取車) 的紀錄
  DELETE FROM car_rental.rentals 
  WHERE request_id = p_request_id AND status = 'confirmed';

  -- 4. 釋放車輛 (Vehicles) -> 改回 available
  UPDATE car_rental.vehicles
  SET status = 'available'
  WHERE id = v_vehicle_id;

  RETURN jsonb_build_object('success', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- 因為是 SECURITY DEFINER，這裡的查詢不會觸發 RLS
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('admin', 'hr')
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_is_admin_or_hr()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.employees
    WHERE user_id = auth.uid() -- 對應 Schema 的 user_id
    AND role IN ('admin', 'hr') -- 對應 Schema 的 role
    AND deleted_at IS NULL      -- 對應 Schema 的 deleted_at (確保沒離職)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_is_own_record(record_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN record_user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.delete_user_by_admin(target_user_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  current_user_role VARCHAR;
  target_user_role VARCHAR;
BEGIN
  -- 檢查當前用戶是否為管理員
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF current_user_role NOT IN ('admin', 'hr') THEN
    RAISE EXCEPTION 'Permission denied: Only admin or hr can delete users';
  END IF;

  -- 檢查目標用戶角色（不能刪除其他管理員）
  SELECT role INTO target_user_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF target_user_role = 'admin' THEN
    RAISE EXCEPTION 'Cannot delete admin users';
  END IF;

  -- 先將 employees 的 user_id 設為 NULL（解除關聯）
  UPDATE public.employees
  SET user_id = NULL
  WHERE user_id = target_user_id;

  -- 刪除 profiles 記錄
  DELETE FROM public.profiles WHERE id = target_user_id;

  -- 刪除 auth.users 記錄（需要 service_role 權限）
  -- 注意：這需要在 Supabase Dashboard 執行或使用 service_role key
  DELETE FROM auth.users WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'message', 'User deleted successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$function$
;

create or replace view "public"."employees_with_details" as  SELECT e.id,
    e.user_id,
    e.employee_id,
    e.name,
    e.name_en,
    e.email,
    e.phone,
    e.mobile,
    e.extension,
    e.department_id,
    e."position",
    e.job_title,
    e.employee_type,
    e.level,
    e.supervisor_id,
    e.hire_date,
    e.contract_start_date,
    e.contract_end_date,
    e.probation_end_date,
    e.resignation_date,
    e.office_location,
    e.work_location,
    e.seat_number,
    e.id_number,
    e.passport_number,
    e.birth_date,
    e.gender,
    e.nationality,
    e.emergency_contact_name,
    e.emergency_contact_phone,
    e.emergency_contact_relationship,
    e.bank_name,
    e.bank_account,
    e.status,
    e.is_active,
    e.role,
    e.permissions,
    e.notes,
    e.avatar_url,
    e.created_at,
    e.updated_at,
    e.created_by,
    e.deleted_at,
    d.name AS department_name,
    d.code AS department_code,
    s.name AS supervisor_name,
    s.employee_id AS supervisor_employee_id
   FROM ((public.employees e
     LEFT JOIN public.departments d ON (((e.department_id = d.id) AND (d.deleted_at IS NULL))))
     LEFT JOIN public.employees s ON (((e.supervisor_id = s.id) AND (s.deleted_at IS NULL))))
  WHERE (e.deleted_at IS NULL);


CREATE OR REPLACE FUNCTION public.get_current_user_full_info()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'profile', row_to_json(p.*),
    'employee', row_to_json(e.*)
  ) INTO result
  FROM public.profiles p
  LEFT JOIN public.employees_with_details e ON p.id = e.user_id
  WHERE p.id = auth.uid();

  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_current_user_info()
 RETURNS TABLE(user_id uuid, email character varying, full_name character varying, auth_role character varying, employee_id uuid, employee_code character varying, employee_name character varying, department_id uuid, department_name character varying, "position" character varying, employee_role character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    u.user_id,
    u.user_email as email,
    u.full_name,
    u.auth_role,
    u.employee_id,
    u.employee_code,
    u.employee_name,
    u.department_id,
    u.department_name,
    u."position",
    u.employee_role
  FROM public.users_with_employee_info u
  WHERE u.user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_by_email(p_email character varying)
 RETURNS TABLE(id uuid, employee_id character varying, name character varying, email character varying, department_name character varying, "position" character varying, status character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.employee_id,
    e.name,
    e.email,
    d.name as department_name,
    e.position,
    e.status
  FROM public.employees e
  LEFT JOIN public.departments d ON e.department_id = d.id
  WHERE e.email = p_email
    AND e.deleted_at IS NULL
    AND e.status = 'active';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_by_user_id(p_user_id uuid)
 RETURNS TABLE(id uuid, employee_id character varying, name character varying, email character varying, department_id uuid, department_name character varying, "position" character varying, role character varying, status character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.employee_id,
    e.name,
    e.email,
    e.department_id,
    d.name as department_name,
    e.position,
    e.role,
    e.status
  FROM public.employees e
  LEFT JOIN public.departments d ON e.department_id = d.id
  WHERE e.user_id = p_user_id
    AND e.deleted_at IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_license_info(p_license_key text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_result JSON;
BEGIN
  -- 檢查表是否存在
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'software_maintenance'
    AND table_name = 'licenses'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License system tables not yet created.',
      'code', 'SCHEMA_NOT_READY'
    );
  END IF;

  -- 查詢授權資訊並關聯創建者資訊（從 public.profiles）
  SELECT json_build_object(
    'success', true,
    'license', json_build_object(
      'id', l.id,
      'license_key', l.license_key,
      'product_name', l.product_name,
      'status', l.status,
      'expiry_date', l.expiry_date,
      'max_devices', l.max_devices,
      'created_at', l.created_at
    ),
    'creator', json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'email', p.email
    ),
    'devices', (
      SELECT json_agg(json_build_object(
        'machine_id', d.machine_id,
        'machine_name', d.machine_name,
        'ip_address', d.ip_address,
        'status', d.status,
        'last_verified_at', d.last_verified_at
      ))
      FROM software_maintenance.devices d
      WHERE d.license_id = l.id
    )
  ) INTO v_result
  FROM software_maintenance.licenses l
  LEFT JOIN public.profiles p ON l.created_by = p.id  -- 正確引用 public.profiles
  WHERE l.license_key = p_license_key;

  IF v_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'License not found',
      'code', 'LICENSE_NOT_FOUND'
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'code', 'INTERNAL_ERROR'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_management_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  stats JSON;
BEGIN
  SELECT json_build_object(
    'total_profiles', (SELECT COUNT(*) FROM public.profiles),
    'total_employees', (SELECT COUNT(*) FROM public.employees WHERE deleted_at IS NULL),
    'active_employees', (SELECT COUNT(*) FROM public.employees WHERE status = 'active' AND deleted_at IS NULL),
    'total_departments', (SELECT COUNT(*) FROM public.departments WHERE deleted_at IS NULL),
    'active_departments', (SELECT COUNT(*) FROM public.departments WHERE is_active = true AND deleted_at IS NULL),
    'linked_accounts', (SELECT COUNT(*) FROM public.employees WHERE user_id IS NOT NULL AND deleted_at IS NULL),
    'unlinked_employees', (SELECT COUNT(*) FROM public.employees WHERE user_id IS NULL AND deleted_at IS NULL)
  ) INTO stats;

  RETURN stats;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_avatar_url(user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  avatar_url TEXT;
BEGIN
  SELECT COALESCE(
    e.avatar_url,
    p.avatar_url
  ) INTO avatar_url
  FROM public.profiles p
  LEFT JOIN public.employees e ON p.id = e.user_id AND e.deleted_at IS NULL
  WHERE p.id = user_id;

  RETURN avatar_url;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_user_display_name(user_id uuid)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  display_name VARCHAR;
BEGIN
  SELECT COALESCE(
    e.name,
    p.full_name,
    p.email
  ) INTO display_name
  FROM public.profiles p
  LEFT JOIN public.employees e ON p.id = e.user_id AND e.deleted_at IS NULL
  WHERE p.id = user_id;

  RETURN display_name;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  existing_employee_id UUID;
  user_full_name TEXT;
  user_email TEXT;
BEGIN
  -- 1. 準備資料
  user_email := NEW.email;
  -- 嘗試從 Metadata 抓名字，抓不到就用 Email 前綴
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1)
  );

  -- ==================================================================
  -- 新增：處理 employees 表格 (這是您原本缺少的關鍵部分)
  -- ==================================================================
  
  -- 2. 檢查 employees 表格是否已經有這個 Email 的資料？
  SELECT id INTO existing_employee_id
  FROM public.employees
  WHERE email = user_email
  AND (user_id IS NULL OR user_id = NEW.id); 

  IF existing_employee_id IS NOT NULL THEN
    -- A. [歸戶模式]：如果有舊資料 (HR 先建好的)，將新帳號綁定上去
    UPDATE public.employees
    SET 
      user_id = NEW.id,           -- 綁定 UUID
      status = 'active',          -- 啟用狀態
      name = COALESCE(name, user_full_name), -- 若原無名字則補上
      updated_at = NOW()
    WHERE id = existing_employee_id;
    
  ELSE
    -- B. [全新模式]：如果完全沒資料，就自動新增一筆
    INSERT INTO public.employees (
      user_id,
      email,
      employee_id,
      name,
      role,
      status,
      is_active,
      created_at
    )
    VALUES (
      NEW.id,
      user_email,
      'TEMP-' || substring(NEW.id::text from 1 for 8), -- 暫時員編
      user_full_name,
      'user',
      'active',
      true,
      NOW()
    );
  END IF;

  -- ==================================================================
  -- 原有的 profiles 邏輯 (保持不變，這部分是好的)
  -- ==================================================================
  INSERT INTO public.profiles (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role = COALESCE(EXCLUDED.role, public.profiles.role),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- 記錄錯誤但不阻擋流程，避免使用者無法註冊
    RAISE WARNING 'User creation handling error: %', SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_user_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  update public.profiles
  set 
    email = new.email,
    -- 【升級版邏輯】
    -- 1. 先試著抓 full_name
    -- 2. 抓不到？試著抓 display_name
    -- 3. 都沒有？那就保留原本 profiles 裡的值 (full_name)
    full_name = COALESCE(
      new.raw_user_meta_data->>'full_name', 
      new.raw_user_meta_data->>'display_name', 
      full_name
    )
  where id = new.id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_role_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- 如果嘗試修改 role 欄位
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- 檢查發起請求的人是否為 Admin/HR
    -- 注意：這裡我們直接檢查執行者的權限，若不是 Admin/HR 則擋下
    IF public.check_is_admin_or_hr() = false THEN
      RAISE EXCEPTION 'You are not authorized to change the user role.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_profile_to_employee()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- 如果 profiles.full_name 或 email 變更，同步到 employees
  UPDATE public.employees
  SET
    name = CASE
      WHEN NEW.full_name IS NOT NULL AND NEW.full_name != ''
      THEN NEW.full_name
      ELSE name
    END,
    email = CASE
      WHEN NEW.email IS NOT NULL AND NEW.email != ''
      THEN NEW.email
      ELSE email
    END,
    role = CASE
      WHEN NEW.role IS NOT NULL AND NEW.role != ''
      THEN NEW.role
      ELSE role
    END,
    updated_at = NOW()
  WHERE user_id = NEW.id
    AND deleted_at IS NULL;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

create or replace view "public"."users_with_employee_info" as  SELECT p.id AS user_id,
    p.email AS user_email,
    p.full_name,
    p.avatar_url,
    p.role AS auth_role,
    e.id AS employee_id,
    e.employee_id AS employee_code,
    e.name AS employee_name,
    e.department_id,
    d.name AS department_name,
    e."position",
    e.job_title,
    e.status AS employee_status,
    e.role AS employee_role
   FROM ((public.profiles p
     LEFT JOIN public.employees e ON (((p.id = e.user_id) AND (e.deleted_at IS NULL))))
     LEFT JOIN public.departments d ON (((e.department_id = d.id) AND (d.deleted_at IS NULL))));


create or replace view "reviews_data"."full_reviews_view" as  SELECT b.brand_id,
    b.name AS brand_name,
    p.name AS place_name,
    p.rating AS place_rating,
    p.review_count,
    r.rating AS user_rating,
    r.review_text,
    r.published_at_date
   FROM ((reviews_data.reviews r
     JOIN reviews_data.places p ON ((r.place_id = p.place_id)))
     LEFT JOIN reviews_data.brands b ON ((p.brand_id = b.brand_id)));


CREATE OR REPLACE FUNCTION service.assign_ticket(p_ticket_id uuid, p_assignee_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_old_assignee UUID;
BEGIN
  SELECT assignee_id INTO v_old_assignee FROM service.tickets WHERE id = p_ticket_id;
  UPDATE service.tickets
  SET assignee_id = p_assignee_id, assigned_at = NOW(), status = CASE WHEN status = 'open' THEN 'assigned' ELSE status END, updated_at = NOW()
  WHERE id = p_ticket_id;
  INSERT INTO service.ticket_assignments (ticket_id, from_user_id, to_user_id, reason)
  VALUES (p_ticket_id, v_old_assignee, p_assignee_id, p_reason);
END;
$function$
;

CREATE OR REPLACE FUNCTION service.generate_ticket_number()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  date_prefix TEXT;
  sequence_num INTEGER;
  new_ticket_number TEXT;
BEGIN
  date_prefix := 'TK' || TO_CHAR(NEW.created_at, 'YYYYMMDD');
  SELECT COALESCE(MAX(SUBSTRING(ticket_number FROM 11)::INTEGER), 0) + 1
  INTO sequence_num
  FROM service.tickets -- 明確指定 schema
  WHERE ticket_number LIKE date_prefix || '%';
  
  new_ticket_number := date_prefix || LPAD(sequence_num::TEXT, 3, '0');
  NEW.ticket_number := new_ticket_number;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION service.get_ticket_statistics(p_user_id uuid DEFAULT NULL::uuid, p_store_id uuid DEFAULT NULL::uuid, p_start_date timestamp without time zone DEFAULT NULL::timestamp without time zone, p_end_date timestamp without time zone DEFAULT NULL::timestamp without time zone)
 RETURNS TABLE(total_tickets bigint, open_tickets bigint, in_progress_tickets bigint, resolved_tickets bigint, closed_tickets bigint, overdue_tickets bigint, avg_resolution_hours numeric, avg_rating numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'open')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'in_progress')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'resolved')::BIGINT,
    COUNT(*) FILTER (WHERE status = 'closed')::BIGINT,
    COUNT(*) FILTER (WHERE is_overdue = true)::BIGINT,
    AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)::NUMERIC,
    AVG(rating)::NUMERIC
  FROM service.tickets
  WHERE (p_user_id IS NULL OR reporter_id = p_user_id OR assignee_id = p_user_id)
    AND (p_store_id IS NULL OR reporter_store_id = p_store_id)
    AND (p_start_date IS NULL OR created_at >= p_start_date)
    AND (p_end_date IS NULL OR created_at <= p_end_date);
END;
$function$
;

CREATE OR REPLACE FUNCTION service.log_ticket_history()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO service.ticket_history (ticket_id, user_id, action, new_value, description)
    VALUES (NEW.id, NEW.reporter_id, 'created', NEW.status, '工單已建立');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != NEW.status THEN
      INSERT INTO service.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'status_changed', OLD.status, NEW.status, '狀態變更');
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      INSERT INTO service.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'assigned', OLD.assignee_id::TEXT, NEW.assignee_id::TEXT, '指派處理人員');
    END IF;
    IF OLD.priority != NEW.priority THEN
      INSERT INTO service.ticket_history (ticket_id, user_id, action, old_value, new_value, description)
      VALUES (NEW.id, auth.uid(), 'priority_changed', OLD.priority, NEW.priority, '優先度變更');
    END IF;
    IF OLD.rating IS NULL AND NEW.rating IS NOT NULL THEN
      INSERT INTO service.ticket_history (ticket_id, user_id, action, new_value, description)
      VALUES (NEW.id, NEW.reporter_id, 'rated', NEW.rating::TEXT, '服務評分');
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION service.update_ticket_sla()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.due_at IS NULL AND NEW.category_id IS NOT NULL THEN
    SELECT created_at + (sla_hours || ' hours')::INTERVAL
    INTO NEW.due_at
    FROM service.ticket_categories
    WHERE id = NEW.category_id;
  END IF;
  IF NEW.due_at IS NOT NULL AND NOW() > NEW.due_at AND NEW.status NOT IN ('resolved', 'closed', 'cancelled') THEN
    NEW.is_overdue := true;
  END IF;
  RETURN NEW;
END;
$function$
;

create or replace view "software_maintenance"."assignment_details" as  SELECT la.id,
    la.license_id,
    la.employee_id,
    la.assigned_date,
    la.unassigned_date,
    la.computer_name,
    la.computer_serial,
    la.is_active,
    la.notes,
    la.assigned_by,
    la.created_at,
    la.updated_at,
    la.device_id,
    e.name AS employee_name,
    e.employee_id AS employee_code,
    dp.name AS department_name,
    l.license_key,
    s.name AS software_name,
    s.category AS software_category
   FROM ((((software_maintenance.license_assignments la
     LEFT JOIN public.employees e ON ((la.employee_id = e.id)))
     LEFT JOIN public.departments dp ON ((e.department_id = dp.id)))
     LEFT JOIN software_maintenance.licenses l ON ((la.license_id = l.id)))
     LEFT JOIN software_maintenance.software s ON ((l.software_id = s.id)));


CREATE OR REPLACE FUNCTION software_maintenance.check_if_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles  -- <--- 這裡修正了
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION software_maintenance.deactivate_license(p_license_key text, p_machine_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_license RECORD;
    v_activation RECORD;
BEGIN
    SELECT * INTO v_license FROM software_maintenance.licenses WHERE license_key = p_license_key;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'LICENSE_NOT_FOUND'
        );
    END IF;

    UPDATE software_maintenance.activations
    SET is_active = false, deactivated_at = NOW()
    WHERE license_id = v_license.id AND machine_id = p_machine_id AND is_active = true
    RETURNING * INTO v_activation;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'ACTIVATION_NOT_FOUND'
        );
    END IF;

    UPDATE software_maintenance.licenses
    SET current_activations = GREATEST(0, current_activations - 1)
    WHERE id = v_license.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', '授權已成功停用'
    );
END;
$function$
;

create or replace view "software_maintenance"."device_details" as  SELECT d.id,
    d.name,
    d.device_type,
    d.serial_number,
    d.mac_address,
    d.ip_address,
    d.location,
    d.employee_id,
    d.purchase_date,
    d.status,
    d.notes,
    d.created_at,
    d.updated_at,
    e.name AS employee_name,
    e.employee_id AS employee_code,
    dp.name AS department_name
   FROM ((software_maintenance.devices d
     LEFT JOIN public.employees e ON ((d.employee_id = e.id)))
     LEFT JOIN public.departments dp ON ((e.department_id = dp.id)));


CREATE OR REPLACE FUNCTION software_maintenance.generate_license_key()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    v_key TEXT := '';
    v_i INTEGER;
    v_j INTEGER;
BEGIN
    FOR v_i IN 1..4 LOOP
        IF v_i > 1 THEN
            v_key := v_key || '-';
        END IF;
        FOR v_j IN 1..4 LOOP
            v_key := v_key || SUBSTR(v_chars, FLOOR(RANDOM() * LENGTH(v_chars) + 1)::INTEGER, 1);
        END LOOP;
    END LOOP;
    RETURN v_key;
END;
$function$
;

CREATE OR REPLACE FUNCTION software_maintenance.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role) -- <--- 這裡修正了
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$function$
;

create or replace view "software_maintenance"."license_summary" as  SELECT l.id AS license_id,
    s.name AS software_name,
    s.category,
    v.name AS vendor_name,
    l.license_type,
    l.quantity,
    l.assigned_count,
    (l.quantity - l.assigned_count) AS available_count,
    l.expiry_date,
        CASE
            WHEN (l.expiry_date IS NULL) THEN NULL::integer
            WHEN (l.expiry_date < CURRENT_DATE) THEN 0
            ELSE (l.expiry_date - CURRENT_DATE)
        END AS days_until_expiry,
    l.status
   FROM ((software_maintenance.licenses l
     LEFT JOIN software_maintenance.software s ON ((l.software_id = s.id)))
     LEFT JOIN software_maintenance.vendors v ON ((s.vendor_id = v.id)));


CREATE OR REPLACE FUNCTION software_maintenance.update_assigned_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.is_active THEN
        UPDATE software_maintenance.licenses
        SET assigned_count = assigned_count + 1
        WHERE id = NEW.license_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_active AND NOT NEW.is_active THEN
            UPDATE software_maintenance.licenses
            SET assigned_count = GREATEST(0, assigned_count - 1)
            WHERE id = NEW.license_id;
        ELSIF NOT OLD.is_active AND NEW.is_active THEN
            UPDATE software_maintenance.licenses
            SET assigned_count = assigned_count + 1
            WHERE id = NEW.license_id;
        END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.is_active THEN
        UPDATE software_maintenance.licenses
        SET assigned_count = GREATEST(0, assigned_count - 1)
        WHERE id = OLD.license_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION software_maintenance.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION software_maintenance.verify_license(p_license_key text, p_machine_id text, p_machine_name text DEFAULT NULL::text, p_ip_address text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_license RECORD;
    v_activation RECORD;
    v_result JSONB;
BEGIN
    SELECT l.*, p.name as product_name, p.version as product_version
    INTO v_license
    FROM software_maintenance.licenses l
    LEFT JOIN software_maintenance.products p ON l.product_id = p.id
    WHERE l.license_key = p_license_key;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'LICENSE_NOT_FOUND',
            'message', '授權碼不存在'
        );
    END IF;

    IF v_license.status != 'active' THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'LICENSE_' || UPPER(v_license.status),
            'message', '授權碼狀態: ' || v_license.status
        );
    END IF;

    IF v_license.expires_at IS NOT NULL AND v_license.expires_at < NOW() THEN
        UPDATE software_maintenance.licenses SET status = 'expired' WHERE id = v_license.id;
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'LICENSE_EXPIRED',
            'message', '授權碼已過期'
        );
    END IF;

    SELECT * INTO v_activation
    FROM software_maintenance.activations
    WHERE license_id = v_license.id AND machine_id = p_machine_id AND is_active = true;

    IF FOUND THEN
        UPDATE software_maintenance.activations
        SET last_seen_at = NOW(), ip_address = COALESCE(p_ip_address, ip_address)
        WHERE id = v_activation.id;

        RETURN jsonb_build_object(
            'valid', true,
            'license_id', v_license.id,
            'product_name', v_license.product_name,
            'product_version', v_license.product_version,
            'license_type', v_license.license_type,
            'expires_at', v_license.expires_at,
            'activation_id', v_activation.id
        );
    END IF;

    IF v_license.current_activations >= v_license.max_activations THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'MAX_ACTIVATIONS_REACHED',
            'message', '已達到最大啟用數量限制',
            'max_activations', v_license.max_activations
        );
    END IF;

    INSERT INTO software_maintenance.activations (license_id, machine_id, machine_name, ip_address)
    VALUES (v_license.id, p_machine_id, p_machine_name, p_ip_address)
    RETURNING * INTO v_activation;

    UPDATE software_maintenance.licenses
    SET current_activations = current_activations + 1
    WHERE id = v_license.id;

    RETURN jsonb_build_object(
        'valid', true,
        'license_id', v_license.id,
        'product_name', v_license.product_name,
        'product_version', v_license.product_version,
        'license_type', v_license.license_type,
        'expires_at', v_license.expires_at,
        'activation_id', v_activation.id,
        'new_activation', true
    );
END;
$function$
;

grant delete on table "car_rental"."maintenance_records" to "anon";

grant insert on table "car_rental"."maintenance_records" to "anon";

grant references on table "car_rental"."maintenance_records" to "anon";

grant select on table "car_rental"."maintenance_records" to "anon";

grant trigger on table "car_rental"."maintenance_records" to "anon";

grant truncate on table "car_rental"."maintenance_records" to "anon";

grant update on table "car_rental"."maintenance_records" to "anon";

grant delete on table "car_rental"."maintenance_records" to "authenticated";

grant insert on table "car_rental"."maintenance_records" to "authenticated";

grant references on table "car_rental"."maintenance_records" to "authenticated";

grant select on table "car_rental"."maintenance_records" to "authenticated";

grant trigger on table "car_rental"."maintenance_records" to "authenticated";

grant truncate on table "car_rental"."maintenance_records" to "authenticated";

grant update on table "car_rental"."maintenance_records" to "authenticated";

grant delete on table "car_rental"."maintenance_records" to "service_role";

grant insert on table "car_rental"."maintenance_records" to "service_role";

grant references on table "car_rental"."maintenance_records" to "service_role";

grant select on table "car_rental"."maintenance_records" to "service_role";

grant trigger on table "car_rental"."maintenance_records" to "service_role";

grant truncate on table "car_rental"."maintenance_records" to "service_role";

grant update on table "car_rental"."maintenance_records" to "service_role";

grant delete on table "car_rental"."rental_requests" to "anon";

grant insert on table "car_rental"."rental_requests" to "anon";

grant references on table "car_rental"."rental_requests" to "anon";

grant select on table "car_rental"."rental_requests" to "anon";

grant trigger on table "car_rental"."rental_requests" to "anon";

grant truncate on table "car_rental"."rental_requests" to "anon";

grant update on table "car_rental"."rental_requests" to "anon";

grant delete on table "car_rental"."rental_requests" to "authenticated";

grant insert on table "car_rental"."rental_requests" to "authenticated";

grant references on table "car_rental"."rental_requests" to "authenticated";

grant select on table "car_rental"."rental_requests" to "authenticated";

grant trigger on table "car_rental"."rental_requests" to "authenticated";

grant truncate on table "car_rental"."rental_requests" to "authenticated";

grant update on table "car_rental"."rental_requests" to "authenticated";

grant delete on table "car_rental"."rental_requests" to "service_role";

grant insert on table "car_rental"."rental_requests" to "service_role";

grant references on table "car_rental"."rental_requests" to "service_role";

grant select on table "car_rental"."rental_requests" to "service_role";

grant trigger on table "car_rental"."rental_requests" to "service_role";

grant truncate on table "car_rental"."rental_requests" to "service_role";

grant update on table "car_rental"."rental_requests" to "service_role";

grant delete on table "car_rental"."rentals" to "anon";

grant insert on table "car_rental"."rentals" to "anon";

grant references on table "car_rental"."rentals" to "anon";

grant select on table "car_rental"."rentals" to "anon";

grant trigger on table "car_rental"."rentals" to "anon";

grant truncate on table "car_rental"."rentals" to "anon";

grant update on table "car_rental"."rentals" to "anon";

grant delete on table "car_rental"."rentals" to "authenticated";

grant insert on table "car_rental"."rentals" to "authenticated";

grant references on table "car_rental"."rentals" to "authenticated";

grant select on table "car_rental"."rentals" to "authenticated";

grant trigger on table "car_rental"."rentals" to "authenticated";

grant truncate on table "car_rental"."rentals" to "authenticated";

grant update on table "car_rental"."rentals" to "authenticated";

grant delete on table "car_rental"."rentals" to "service_role";

grant insert on table "car_rental"."rentals" to "service_role";

grant references on table "car_rental"."rentals" to "service_role";

grant select on table "car_rental"."rentals" to "service_role";

grant trigger on table "car_rental"."rentals" to "service_role";

grant truncate on table "car_rental"."rentals" to "service_role";

grant update on table "car_rental"."rentals" to "service_role";

grant delete on table "car_rental"."vehicles" to "anon";

grant insert on table "car_rental"."vehicles" to "anon";

grant references on table "car_rental"."vehicles" to "anon";

grant select on table "car_rental"."vehicles" to "anon";

grant trigger on table "car_rental"."vehicles" to "anon";

grant truncate on table "car_rental"."vehicles" to "anon";

grant update on table "car_rental"."vehicles" to "anon";

grant delete on table "car_rental"."vehicles" to "authenticated";

grant insert on table "car_rental"."vehicles" to "authenticated";

grant references on table "car_rental"."vehicles" to "authenticated";

grant select on table "car_rental"."vehicles" to "authenticated";

grant trigger on table "car_rental"."vehicles" to "authenticated";

grant truncate on table "car_rental"."vehicles" to "authenticated";

grant update on table "car_rental"."vehicles" to "authenticated";

grant delete on table "car_rental"."vehicles" to "service_role";

grant insert on table "car_rental"."vehicles" to "service_role";

grant references on table "car_rental"."vehicles" to "service_role";

grant select on table "car_rental"."vehicles" to "service_role";

grant trigger on table "car_rental"."vehicles" to "service_role";

grant truncate on table "car_rental"."vehicles" to "service_role";

grant update on table "car_rental"."vehicles" to "service_role";

grant delete on table "eip"."announcement_reads" to "anon";

grant insert on table "eip"."announcement_reads" to "anon";

grant references on table "eip"."announcement_reads" to "anon";

grant select on table "eip"."announcement_reads" to "anon";

grant trigger on table "eip"."announcement_reads" to "anon";

grant truncate on table "eip"."announcement_reads" to "anon";

grant update on table "eip"."announcement_reads" to "anon";

grant delete on table "eip"."announcement_reads" to "authenticated";

grant insert on table "eip"."announcement_reads" to "authenticated";

grant references on table "eip"."announcement_reads" to "authenticated";

grant select on table "eip"."announcement_reads" to "authenticated";

grant trigger on table "eip"."announcement_reads" to "authenticated";

grant truncate on table "eip"."announcement_reads" to "authenticated";

grant update on table "eip"."announcement_reads" to "authenticated";

grant delete on table "eip"."announcement_reads" to "service_role";

grant insert on table "eip"."announcement_reads" to "service_role";

grant references on table "eip"."announcement_reads" to "service_role";

grant select on table "eip"."announcement_reads" to "service_role";

grant trigger on table "eip"."announcement_reads" to "service_role";

grant truncate on table "eip"."announcement_reads" to "service_role";

grant update on table "eip"."announcement_reads" to "service_role";

grant delete on table "eip"."announcements" to "anon";

grant insert on table "eip"."announcements" to "anon";

grant references on table "eip"."announcements" to "anon";

grant select on table "eip"."announcements" to "anon";

grant trigger on table "eip"."announcements" to "anon";

grant truncate on table "eip"."announcements" to "anon";

grant update on table "eip"."announcements" to "anon";

grant delete on table "eip"."announcements" to "authenticated";

grant insert on table "eip"."announcements" to "authenticated";

grant references on table "eip"."announcements" to "authenticated";

grant select on table "eip"."announcements" to "authenticated";

grant trigger on table "eip"."announcements" to "authenticated";

grant truncate on table "eip"."announcements" to "authenticated";

grant update on table "eip"."announcements" to "authenticated";

grant delete on table "eip"."announcements" to "service_role";

grant insert on table "eip"."announcements" to "service_role";

grant references on table "eip"."announcements" to "service_role";

grant select on table "eip"."announcements" to "service_role";

grant trigger on table "eip"."announcements" to "service_role";

grant truncate on table "eip"."announcements" to "service_role";

grant update on table "eip"."announcements" to "service_role";

grant delete on table "eip"."document_categories" to "anon";

grant insert on table "eip"."document_categories" to "anon";

grant references on table "eip"."document_categories" to "anon";

grant select on table "eip"."document_categories" to "anon";

grant trigger on table "eip"."document_categories" to "anon";

grant truncate on table "eip"."document_categories" to "anon";

grant update on table "eip"."document_categories" to "anon";

grant delete on table "eip"."document_categories" to "authenticated";

grant insert on table "eip"."document_categories" to "authenticated";

grant references on table "eip"."document_categories" to "authenticated";

grant select on table "eip"."document_categories" to "authenticated";

grant trigger on table "eip"."document_categories" to "authenticated";

grant truncate on table "eip"."document_categories" to "authenticated";

grant update on table "eip"."document_categories" to "authenticated";

grant delete on table "eip"."document_categories" to "service_role";

grant insert on table "eip"."document_categories" to "service_role";

grant references on table "eip"."document_categories" to "service_role";

grant select on table "eip"."document_categories" to "service_role";

grant trigger on table "eip"."document_categories" to "service_role";

grant truncate on table "eip"."document_categories" to "service_role";

grant update on table "eip"."document_categories" to "service_role";

grant delete on table "eip"."document_favorites" to "anon";

grant insert on table "eip"."document_favorites" to "anon";

grant references on table "eip"."document_favorites" to "anon";

grant select on table "eip"."document_favorites" to "anon";

grant trigger on table "eip"."document_favorites" to "anon";

grant truncate on table "eip"."document_favorites" to "anon";

grant update on table "eip"."document_favorites" to "anon";

grant delete on table "eip"."document_favorites" to "authenticated";

grant insert on table "eip"."document_favorites" to "authenticated";

grant references on table "eip"."document_favorites" to "authenticated";

grant select on table "eip"."document_favorites" to "authenticated";

grant trigger on table "eip"."document_favorites" to "authenticated";

grant truncate on table "eip"."document_favorites" to "authenticated";

grant update on table "eip"."document_favorites" to "authenticated";

grant delete on table "eip"."document_favorites" to "service_role";

grant insert on table "eip"."document_favorites" to "service_role";

grant references on table "eip"."document_favorites" to "service_role";

grant select on table "eip"."document_favorites" to "service_role";

grant trigger on table "eip"."document_favorites" to "service_role";

grant truncate on table "eip"."document_favorites" to "service_role";

grant update on table "eip"."document_favorites" to "service_role";

grant delete on table "eip"."document_versions" to "anon";

grant insert on table "eip"."document_versions" to "anon";

grant references on table "eip"."document_versions" to "anon";

grant select on table "eip"."document_versions" to "anon";

grant trigger on table "eip"."document_versions" to "anon";

grant truncate on table "eip"."document_versions" to "anon";

grant update on table "eip"."document_versions" to "anon";

grant delete on table "eip"."document_versions" to "authenticated";

grant insert on table "eip"."document_versions" to "authenticated";

grant references on table "eip"."document_versions" to "authenticated";

grant select on table "eip"."document_versions" to "authenticated";

grant trigger on table "eip"."document_versions" to "authenticated";

grant truncate on table "eip"."document_versions" to "authenticated";

grant update on table "eip"."document_versions" to "authenticated";

grant delete on table "eip"."document_versions" to "service_role";

grant insert on table "eip"."document_versions" to "service_role";

grant references on table "eip"."document_versions" to "service_role";

grant select on table "eip"."document_versions" to "service_role";

grant trigger on table "eip"."document_versions" to "service_role";

grant truncate on table "eip"."document_versions" to "service_role";

grant update on table "eip"."document_versions" to "service_role";

grant delete on table "eip"."documents" to "anon";

grant insert on table "eip"."documents" to "anon";

grant references on table "eip"."documents" to "anon";

grant select on table "eip"."documents" to "anon";

grant trigger on table "eip"."documents" to "anon";

grant truncate on table "eip"."documents" to "anon";

grant update on table "eip"."documents" to "anon";

grant delete on table "eip"."documents" to "authenticated";

grant insert on table "eip"."documents" to "authenticated";

grant references on table "eip"."documents" to "authenticated";

grant select on table "eip"."documents" to "authenticated";

grant trigger on table "eip"."documents" to "authenticated";

grant truncate on table "eip"."documents" to "authenticated";

grant update on table "eip"."documents" to "authenticated";

grant delete on table "eip"."documents" to "service_role";

grant insert on table "eip"."documents" to "service_role";

grant references on table "eip"."documents" to "service_role";

grant select on table "eip"."documents" to "service_role";

grant trigger on table "eip"."documents" to "service_role";

grant truncate on table "eip"."documents" to "service_role";

grant update on table "eip"."documents" to "service_role";

grant delete on table "meeting_system"."bookings" to "anon";

grant insert on table "meeting_system"."bookings" to "anon";

grant references on table "meeting_system"."bookings" to "anon";

grant select on table "meeting_system"."bookings" to "anon";

grant trigger on table "meeting_system"."bookings" to "anon";

grant truncate on table "meeting_system"."bookings" to "anon";

grant update on table "meeting_system"."bookings" to "anon";

grant delete on table "meeting_system"."bookings" to "authenticated";

grant insert on table "meeting_system"."bookings" to "authenticated";

grant references on table "meeting_system"."bookings" to "authenticated";

grant select on table "meeting_system"."bookings" to "authenticated";

grant trigger on table "meeting_system"."bookings" to "authenticated";

grant truncate on table "meeting_system"."bookings" to "authenticated";

grant update on table "meeting_system"."bookings" to "authenticated";

grant delete on table "meeting_system"."bookings" to "service_role";

grant insert on table "meeting_system"."bookings" to "service_role";

grant references on table "meeting_system"."bookings" to "service_role";

grant select on table "meeting_system"."bookings" to "service_role";

grant trigger on table "meeting_system"."bookings" to "service_role";

grant truncate on table "meeting_system"."bookings" to "service_role";

grant update on table "meeting_system"."bookings" to "service_role";

grant delete on table "meeting_system"."rooms" to "anon";

grant insert on table "meeting_system"."rooms" to "anon";

grant references on table "meeting_system"."rooms" to "anon";

grant select on table "meeting_system"."rooms" to "anon";

grant trigger on table "meeting_system"."rooms" to "anon";

grant truncate on table "meeting_system"."rooms" to "anon";

grant update on table "meeting_system"."rooms" to "anon";

grant delete on table "meeting_system"."rooms" to "authenticated";

grant insert on table "meeting_system"."rooms" to "authenticated";

grant references on table "meeting_system"."rooms" to "authenticated";

grant select on table "meeting_system"."rooms" to "authenticated";

grant trigger on table "meeting_system"."rooms" to "authenticated";

grant truncate on table "meeting_system"."rooms" to "authenticated";

grant update on table "meeting_system"."rooms" to "authenticated";

grant delete on table "meeting_system"."rooms" to "service_role";

grant insert on table "meeting_system"."rooms" to "service_role";

grant references on table "meeting_system"."rooms" to "service_role";

grant select on table "meeting_system"."rooms" to "service_role";

grant trigger on table "meeting_system"."rooms" to "service_role";

grant truncate on table "meeting_system"."rooms" to "service_role";

grant update on table "meeting_system"."rooms" to "service_role";

grant delete on table "payment_approval"."bank_branches" to "anon";

grant insert on table "payment_approval"."bank_branches" to "anon";

grant references on table "payment_approval"."bank_branches" to "anon";

grant select on table "payment_approval"."bank_branches" to "anon";

grant trigger on table "payment_approval"."bank_branches" to "anon";

grant truncate on table "payment_approval"."bank_branches" to "anon";

grant update on table "payment_approval"."bank_branches" to "anon";

grant delete on table "payment_approval"."bank_branches" to "authenticated";

grant insert on table "payment_approval"."bank_branches" to "authenticated";

grant references on table "payment_approval"."bank_branches" to "authenticated";

grant select on table "payment_approval"."bank_branches" to "authenticated";

grant trigger on table "payment_approval"."bank_branches" to "authenticated";

grant truncate on table "payment_approval"."bank_branches" to "authenticated";

grant update on table "payment_approval"."bank_branches" to "authenticated";

grant delete on table "payment_approval"."bank_branches" to "service_role";

grant insert on table "payment_approval"."bank_branches" to "service_role";

grant references on table "payment_approval"."bank_branches" to "service_role";

grant select on table "payment_approval"."bank_branches" to "service_role";

grant trigger on table "payment_approval"."bank_branches" to "service_role";

grant truncate on table "payment_approval"."bank_branches" to "service_role";

grant update on table "payment_approval"."bank_branches" to "service_role";

grant delete on table "payment_approval"."banks" to "anon";

grant insert on table "payment_approval"."banks" to "anon";

grant references on table "payment_approval"."banks" to "anon";

grant select on table "payment_approval"."banks" to "anon";

grant trigger on table "payment_approval"."banks" to "anon";

grant truncate on table "payment_approval"."banks" to "anon";

grant update on table "payment_approval"."banks" to "anon";

grant delete on table "payment_approval"."banks" to "authenticated";

grant insert on table "payment_approval"."banks" to "authenticated";

grant references on table "payment_approval"."banks" to "authenticated";

grant select on table "payment_approval"."banks" to "authenticated";

grant trigger on table "payment_approval"."banks" to "authenticated";

grant truncate on table "payment_approval"."banks" to "authenticated";

grant update on table "payment_approval"."banks" to "authenticated";

grant delete on table "payment_approval"."banks" to "service_role";

grant insert on table "payment_approval"."banks" to "service_role";

grant references on table "payment_approval"."banks" to "service_role";

grant select on table "payment_approval"."banks" to "service_role";

grant trigger on table "payment_approval"."banks" to "service_role";

grant truncate on table "payment_approval"."banks" to "service_role";

grant update on table "payment_approval"."banks" to "service_role";

grant delete on table "payment_approval"."branches" to "anon";

grant insert on table "payment_approval"."branches" to "anon";

grant references on table "payment_approval"."branches" to "anon";

grant select on table "payment_approval"."branches" to "anon";

grant trigger on table "payment_approval"."branches" to "anon";

grant truncate on table "payment_approval"."branches" to "anon";

grant update on table "payment_approval"."branches" to "anon";

grant delete on table "payment_approval"."branches" to "authenticated";

grant insert on table "payment_approval"."branches" to "authenticated";

grant references on table "payment_approval"."branches" to "authenticated";

grant select on table "payment_approval"."branches" to "authenticated";

grant trigger on table "payment_approval"."branches" to "authenticated";

grant truncate on table "payment_approval"."branches" to "authenticated";

grant update on table "payment_approval"."branches" to "authenticated";

grant delete on table "payment_approval"."branches" to "service_role";

grant insert on table "payment_approval"."branches" to "service_role";

grant references on table "payment_approval"."branches" to "service_role";

grant select on table "payment_approval"."branches" to "service_role";

grant trigger on table "payment_approval"."branches" to "service_role";

grant truncate on table "payment_approval"."branches" to "service_role";

grant update on table "payment_approval"."branches" to "service_role";

grant delete on table "payment_approval"."payment_requests" to "anon";

grant insert on table "payment_approval"."payment_requests" to "anon";

grant references on table "payment_approval"."payment_requests" to "anon";

grant select on table "payment_approval"."payment_requests" to "anon";

grant trigger on table "payment_approval"."payment_requests" to "anon";

grant truncate on table "payment_approval"."payment_requests" to "anon";

grant update on table "payment_approval"."payment_requests" to "anon";

grant delete on table "payment_approval"."payment_requests" to "authenticated";

grant insert on table "payment_approval"."payment_requests" to "authenticated";

grant references on table "payment_approval"."payment_requests" to "authenticated";

grant select on table "payment_approval"."payment_requests" to "authenticated";

grant trigger on table "payment_approval"."payment_requests" to "authenticated";

grant truncate on table "payment_approval"."payment_requests" to "authenticated";

grant update on table "payment_approval"."payment_requests" to "authenticated";

grant delete on table "payment_approval"."payment_requests" to "service_role";

grant insert on table "payment_approval"."payment_requests" to "service_role";

grant references on table "payment_approval"."payment_requests" to "service_role";

grant select on table "payment_approval"."payment_requests" to "service_role";

grant trigger on table "payment_approval"."payment_requests" to "service_role";

grant truncate on table "payment_approval"."payment_requests" to "service_role";

grant update on table "payment_approval"."payment_requests" to "service_role";

grant delete on table "public"."brands" to "anon";

grant insert on table "public"."brands" to "anon";

grant references on table "public"."brands" to "anon";

grant select on table "public"."brands" to "anon";

grant trigger on table "public"."brands" to "anon";

grant truncate on table "public"."brands" to "anon";

grant update on table "public"."brands" to "anon";

grant delete on table "public"."brands" to "authenticated";

grant insert on table "public"."brands" to "authenticated";

grant references on table "public"."brands" to "authenticated";

grant select on table "public"."brands" to "authenticated";

grant trigger on table "public"."brands" to "authenticated";

grant truncate on table "public"."brands" to "authenticated";

grant update on table "public"."brands" to "authenticated";

grant delete on table "public"."brands" to "service_role";

grant insert on table "public"."brands" to "service_role";

grant references on table "public"."brands" to "service_role";

grant select on table "public"."brands" to "service_role";

grant trigger on table "public"."brands" to "service_role";

grant truncate on table "public"."brands" to "service_role";

grant update on table "public"."brands" to "service_role";

grant delete on table "public"."departments" to "anon";

grant insert on table "public"."departments" to "anon";

grant references on table "public"."departments" to "anon";

grant select on table "public"."departments" to "anon";

grant trigger on table "public"."departments" to "anon";

grant truncate on table "public"."departments" to "anon";

grant update on table "public"."departments" to "anon";

grant delete on table "public"."departments" to "authenticated";

grant insert on table "public"."departments" to "authenticated";

grant references on table "public"."departments" to "authenticated";

grant select on table "public"."departments" to "authenticated";

grant trigger on table "public"."departments" to "authenticated";

grant truncate on table "public"."departments" to "authenticated";

grant update on table "public"."departments" to "authenticated";

grant delete on table "public"."departments" to "service_role";

grant insert on table "public"."departments" to "service_role";

grant references on table "public"."departments" to "service_role";

grant select on table "public"."departments" to "service_role";

grant trigger on table "public"."departments" to "service_role";

grant truncate on table "public"."departments" to "service_role";

grant update on table "public"."departments" to "service_role";

grant delete on table "public"."employees" to "anon";

grant insert on table "public"."employees" to "anon";

grant references on table "public"."employees" to "anon";

grant select on table "public"."employees" to "anon";

grant trigger on table "public"."employees" to "anon";

grant truncate on table "public"."employees" to "anon";

grant update on table "public"."employees" to "anon";

grant delete on table "public"."employees" to "authenticated";

grant insert on table "public"."employees" to "authenticated";

grant references on table "public"."employees" to "authenticated";

grant select on table "public"."employees" to "authenticated";

grant trigger on table "public"."employees" to "authenticated";

grant truncate on table "public"."employees" to "authenticated";

grant update on table "public"."employees" to "authenticated";

grant delete on table "public"."employees" to "service_role";

grant insert on table "public"."employees" to "service_role";

grant references on table "public"."employees" to "service_role";

grant select on table "public"."employees" to "service_role";

grant trigger on table "public"."employees" to "service_role";

grant truncate on table "public"."employees" to "service_role";

grant update on table "public"."employees" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."stores" to "anon";

grant insert on table "public"."stores" to "anon";

grant references on table "public"."stores" to "anon";

grant select on table "public"."stores" to "anon";

grant trigger on table "public"."stores" to "anon";

grant truncate on table "public"."stores" to "anon";

grant update on table "public"."stores" to "anon";

grant delete on table "public"."stores" to "authenticated";

grant insert on table "public"."stores" to "authenticated";

grant references on table "public"."stores" to "authenticated";

grant select on table "public"."stores" to "authenticated";

grant trigger on table "public"."stores" to "authenticated";

grant truncate on table "public"."stores" to "authenticated";

grant update on table "public"."stores" to "authenticated";

grant delete on table "public"."stores" to "service_role";

grant insert on table "public"."stores" to "service_role";

grant references on table "public"."stores" to "service_role";

grant select on table "public"."stores" to "service_role";

grant trigger on table "public"."stores" to "service_role";

grant truncate on table "public"."stores" to "service_role";

grant update on table "public"."stores" to "service_role";

grant delete on table "reviews_data"."brands" to "anon";

grant insert on table "reviews_data"."brands" to "anon";

grant references on table "reviews_data"."brands" to "anon";

grant select on table "reviews_data"."brands" to "anon";

grant trigger on table "reviews_data"."brands" to "anon";

grant truncate on table "reviews_data"."brands" to "anon";

grant update on table "reviews_data"."brands" to "anon";

grant delete on table "reviews_data"."brands" to "authenticated";

grant insert on table "reviews_data"."brands" to "authenticated";

grant references on table "reviews_data"."brands" to "authenticated";

grant select on table "reviews_data"."brands" to "authenticated";

grant trigger on table "reviews_data"."brands" to "authenticated";

grant truncate on table "reviews_data"."brands" to "authenticated";

grant update on table "reviews_data"."brands" to "authenticated";

grant select on table "reviews_data"."brands" to "report_viewer";

grant delete on table "reviews_data"."brands" to "service_role";

grant insert on table "reviews_data"."brands" to "service_role";

grant references on table "reviews_data"."brands" to "service_role";

grant select on table "reviews_data"."brands" to "service_role";

grant trigger on table "reviews_data"."brands" to "service_role";

grant truncate on table "reviews_data"."brands" to "service_role";

grant update on table "reviews_data"."brands" to "service_role";

grant delete on table "reviews_data"."places" to "anon";

grant insert on table "reviews_data"."places" to "anon";

grant references on table "reviews_data"."places" to "anon";

grant select on table "reviews_data"."places" to "anon";

grant trigger on table "reviews_data"."places" to "anon";

grant truncate on table "reviews_data"."places" to "anon";

grant update on table "reviews_data"."places" to "anon";

grant delete on table "reviews_data"."places" to "authenticated";

grant insert on table "reviews_data"."places" to "authenticated";

grant references on table "reviews_data"."places" to "authenticated";

grant select on table "reviews_data"."places" to "authenticated";

grant trigger on table "reviews_data"."places" to "authenticated";

grant truncate on table "reviews_data"."places" to "authenticated";

grant update on table "reviews_data"."places" to "authenticated";

grant select on table "reviews_data"."places" to "report_viewer";

grant delete on table "reviews_data"."places" to "service_role";

grant insert on table "reviews_data"."places" to "service_role";

grant references on table "reviews_data"."places" to "service_role";

grant select on table "reviews_data"."places" to "service_role";

grant trigger on table "reviews_data"."places" to "service_role";

grant truncate on table "reviews_data"."places" to "service_role";

grant update on table "reviews_data"."places" to "service_role";

grant delete on table "reviews_data"."reviews" to "anon";

grant insert on table "reviews_data"."reviews" to "anon";

grant references on table "reviews_data"."reviews" to "anon";

grant select on table "reviews_data"."reviews" to "anon";

grant trigger on table "reviews_data"."reviews" to "anon";

grant truncate on table "reviews_data"."reviews" to "anon";

grant update on table "reviews_data"."reviews" to "anon";

grant delete on table "reviews_data"."reviews" to "authenticated";

grant insert on table "reviews_data"."reviews" to "authenticated";

grant references on table "reviews_data"."reviews" to "authenticated";

grant select on table "reviews_data"."reviews" to "authenticated";

grant trigger on table "reviews_data"."reviews" to "authenticated";

grant truncate on table "reviews_data"."reviews" to "authenticated";

grant update on table "reviews_data"."reviews" to "authenticated";

grant select on table "reviews_data"."reviews" to "report_viewer";

grant delete on table "reviews_data"."reviews" to "service_role";

grant insert on table "reviews_data"."reviews" to "service_role";

grant references on table "reviews_data"."reviews" to "service_role";

grant select on table "reviews_data"."reviews" to "service_role";

grant trigger on table "reviews_data"."reviews" to "service_role";

grant truncate on table "reviews_data"."reviews" to "service_role";

grant update on table "reviews_data"."reviews" to "service_role";

grant delete on table "service"."ticket_assignments" to "anon";

grant insert on table "service"."ticket_assignments" to "anon";

grant references on table "service"."ticket_assignments" to "anon";

grant select on table "service"."ticket_assignments" to "anon";

grant trigger on table "service"."ticket_assignments" to "anon";

grant truncate on table "service"."ticket_assignments" to "anon";

grant update on table "service"."ticket_assignments" to "anon";

grant delete on table "service"."ticket_assignments" to "authenticated";

grant insert on table "service"."ticket_assignments" to "authenticated";

grant references on table "service"."ticket_assignments" to "authenticated";

grant select on table "service"."ticket_assignments" to "authenticated";

grant trigger on table "service"."ticket_assignments" to "authenticated";

grant truncate on table "service"."ticket_assignments" to "authenticated";

grant update on table "service"."ticket_assignments" to "authenticated";

grant delete on table "service"."ticket_assignments" to "service_role";

grant insert on table "service"."ticket_assignments" to "service_role";

grant references on table "service"."ticket_assignments" to "service_role";

grant select on table "service"."ticket_assignments" to "service_role";

grant trigger on table "service"."ticket_assignments" to "service_role";

grant truncate on table "service"."ticket_assignments" to "service_role";

grant update on table "service"."ticket_assignments" to "service_role";

grant delete on table "service"."ticket_categories" to "anon";

grant insert on table "service"."ticket_categories" to "anon";

grant references on table "service"."ticket_categories" to "anon";

grant select on table "service"."ticket_categories" to "anon";

grant trigger on table "service"."ticket_categories" to "anon";

grant truncate on table "service"."ticket_categories" to "anon";

grant update on table "service"."ticket_categories" to "anon";

grant delete on table "service"."ticket_categories" to "authenticated";

grant insert on table "service"."ticket_categories" to "authenticated";

grant references on table "service"."ticket_categories" to "authenticated";

grant select on table "service"."ticket_categories" to "authenticated";

grant trigger on table "service"."ticket_categories" to "authenticated";

grant truncate on table "service"."ticket_categories" to "authenticated";

grant update on table "service"."ticket_categories" to "authenticated";

grant delete on table "service"."ticket_categories" to "service_role";

grant insert on table "service"."ticket_categories" to "service_role";

grant references on table "service"."ticket_categories" to "service_role";

grant select on table "service"."ticket_categories" to "service_role";

grant trigger on table "service"."ticket_categories" to "service_role";

grant truncate on table "service"."ticket_categories" to "service_role";

grant update on table "service"."ticket_categories" to "service_role";

grant delete on table "service"."ticket_comments" to "anon";

grant insert on table "service"."ticket_comments" to "anon";

grant references on table "service"."ticket_comments" to "anon";

grant select on table "service"."ticket_comments" to "anon";

grant trigger on table "service"."ticket_comments" to "anon";

grant truncate on table "service"."ticket_comments" to "anon";

grant update on table "service"."ticket_comments" to "anon";

grant delete on table "service"."ticket_comments" to "authenticated";

grant insert on table "service"."ticket_comments" to "authenticated";

grant references on table "service"."ticket_comments" to "authenticated";

grant select on table "service"."ticket_comments" to "authenticated";

grant trigger on table "service"."ticket_comments" to "authenticated";

grant truncate on table "service"."ticket_comments" to "authenticated";

grant update on table "service"."ticket_comments" to "authenticated";

grant delete on table "service"."ticket_comments" to "service_role";

grant insert on table "service"."ticket_comments" to "service_role";

grant references on table "service"."ticket_comments" to "service_role";

grant select on table "service"."ticket_comments" to "service_role";

grant trigger on table "service"."ticket_comments" to "service_role";

grant truncate on table "service"."ticket_comments" to "service_role";

grant update on table "service"."ticket_comments" to "service_role";

grant delete on table "service"."ticket_history" to "anon";

grant insert on table "service"."ticket_history" to "anon";

grant references on table "service"."ticket_history" to "anon";

grant select on table "service"."ticket_history" to "anon";

grant trigger on table "service"."ticket_history" to "anon";

grant truncate on table "service"."ticket_history" to "anon";

grant update on table "service"."ticket_history" to "anon";

grant delete on table "service"."ticket_history" to "authenticated";

grant insert on table "service"."ticket_history" to "authenticated";

grant references on table "service"."ticket_history" to "authenticated";

grant select on table "service"."ticket_history" to "authenticated";

grant trigger on table "service"."ticket_history" to "authenticated";

grant truncate on table "service"."ticket_history" to "authenticated";

grant update on table "service"."ticket_history" to "authenticated";

grant delete on table "service"."ticket_history" to "service_role";

grant insert on table "service"."ticket_history" to "service_role";

grant references on table "service"."ticket_history" to "service_role";

grant select on table "service"."ticket_history" to "service_role";

grant trigger on table "service"."ticket_history" to "service_role";

grant truncate on table "service"."ticket_history" to "service_role";

grant update on table "service"."ticket_history" to "service_role";

grant delete on table "service"."tickets" to "anon";

grant insert on table "service"."tickets" to "anon";

grant references on table "service"."tickets" to "anon";

grant select on table "service"."tickets" to "anon";

grant trigger on table "service"."tickets" to "anon";

grant truncate on table "service"."tickets" to "anon";

grant update on table "service"."tickets" to "anon";

grant delete on table "service"."tickets" to "authenticated";

grant insert on table "service"."tickets" to "authenticated";

grant references on table "service"."tickets" to "authenticated";

grant select on table "service"."tickets" to "authenticated";

grant trigger on table "service"."tickets" to "authenticated";

grant truncate on table "service"."tickets" to "authenticated";

grant update on table "service"."tickets" to "authenticated";

grant delete on table "service"."tickets" to "service_role";

grant insert on table "service"."tickets" to "service_role";

grant references on table "service"."tickets" to "service_role";

grant select on table "service"."tickets" to "service_role";

grant trigger on table "service"."tickets" to "service_role";

grant truncate on table "service"."tickets" to "service_role";

grant update on table "service"."tickets" to "service_role";

grant delete on table "software_maintenance"."audit_logs" to "anon";

grant insert on table "software_maintenance"."audit_logs" to "anon";

grant references on table "software_maintenance"."audit_logs" to "anon";

grant select on table "software_maintenance"."audit_logs" to "anon";

grant trigger on table "software_maintenance"."audit_logs" to "anon";

grant truncate on table "software_maintenance"."audit_logs" to "anon";

grant update on table "software_maintenance"."audit_logs" to "anon";

grant delete on table "software_maintenance"."audit_logs" to "authenticated";

grant insert on table "software_maintenance"."audit_logs" to "authenticated";

grant references on table "software_maintenance"."audit_logs" to "authenticated";

grant select on table "software_maintenance"."audit_logs" to "authenticated";

grant trigger on table "software_maintenance"."audit_logs" to "authenticated";

grant truncate on table "software_maintenance"."audit_logs" to "authenticated";

grant update on table "software_maintenance"."audit_logs" to "authenticated";

grant delete on table "software_maintenance"."audit_logs" to "service_role";

grant insert on table "software_maintenance"."audit_logs" to "service_role";

grant references on table "software_maintenance"."audit_logs" to "service_role";

grant select on table "software_maintenance"."audit_logs" to "service_role";

grant trigger on table "software_maintenance"."audit_logs" to "service_role";

grant truncate on table "software_maintenance"."audit_logs" to "service_role";

grant update on table "software_maintenance"."audit_logs" to "service_role";

grant delete on table "software_maintenance"."devices" to "anon";

grant insert on table "software_maintenance"."devices" to "anon";

grant references on table "software_maintenance"."devices" to "anon";

grant select on table "software_maintenance"."devices" to "anon";

grant trigger on table "software_maintenance"."devices" to "anon";

grant truncate on table "software_maintenance"."devices" to "anon";

grant update on table "software_maintenance"."devices" to "anon";

grant delete on table "software_maintenance"."devices" to "authenticated";

grant insert on table "software_maintenance"."devices" to "authenticated";

grant references on table "software_maintenance"."devices" to "authenticated";

grant select on table "software_maintenance"."devices" to "authenticated";

grant trigger on table "software_maintenance"."devices" to "authenticated";

grant truncate on table "software_maintenance"."devices" to "authenticated";

grant update on table "software_maintenance"."devices" to "authenticated";

grant delete on table "software_maintenance"."devices" to "service_role";

grant insert on table "software_maintenance"."devices" to "service_role";

grant references on table "software_maintenance"."devices" to "service_role";

grant select on table "software_maintenance"."devices" to "service_role";

grant trigger on table "software_maintenance"."devices" to "service_role";

grant truncate on table "software_maintenance"."devices" to "service_role";

grant update on table "software_maintenance"."devices" to "service_role";

grant delete on table "software_maintenance"."license_assignments" to "anon";

grant insert on table "software_maintenance"."license_assignments" to "anon";

grant references on table "software_maintenance"."license_assignments" to "anon";

grant select on table "software_maintenance"."license_assignments" to "anon";

grant trigger on table "software_maintenance"."license_assignments" to "anon";

grant truncate on table "software_maintenance"."license_assignments" to "anon";

grant update on table "software_maintenance"."license_assignments" to "anon";

grant delete on table "software_maintenance"."license_assignments" to "authenticated";

grant insert on table "software_maintenance"."license_assignments" to "authenticated";

grant references on table "software_maintenance"."license_assignments" to "authenticated";

grant select on table "software_maintenance"."license_assignments" to "authenticated";

grant trigger on table "software_maintenance"."license_assignments" to "authenticated";

grant truncate on table "software_maintenance"."license_assignments" to "authenticated";

grant update on table "software_maintenance"."license_assignments" to "authenticated";

grant delete on table "software_maintenance"."license_assignments" to "service_role";

grant insert on table "software_maintenance"."license_assignments" to "service_role";

grant references on table "software_maintenance"."license_assignments" to "service_role";

grant select on table "software_maintenance"."license_assignments" to "service_role";

grant trigger on table "software_maintenance"."license_assignments" to "service_role";

grant truncate on table "software_maintenance"."license_assignments" to "service_role";

grant update on table "software_maintenance"."license_assignments" to "service_role";

grant delete on table "software_maintenance"."licenses" to "anon";

grant insert on table "software_maintenance"."licenses" to "anon";

grant references on table "software_maintenance"."licenses" to "anon";

grant select on table "software_maintenance"."licenses" to "anon";

grant trigger on table "software_maintenance"."licenses" to "anon";

grant truncate on table "software_maintenance"."licenses" to "anon";

grant update on table "software_maintenance"."licenses" to "anon";

grant delete on table "software_maintenance"."licenses" to "authenticated";

grant insert on table "software_maintenance"."licenses" to "authenticated";

grant references on table "software_maintenance"."licenses" to "authenticated";

grant select on table "software_maintenance"."licenses" to "authenticated";

grant trigger on table "software_maintenance"."licenses" to "authenticated";

grant truncate on table "software_maintenance"."licenses" to "authenticated";

grant update on table "software_maintenance"."licenses" to "authenticated";

grant delete on table "software_maintenance"."licenses" to "service_role";

grant insert on table "software_maintenance"."licenses" to "service_role";

grant references on table "software_maintenance"."licenses" to "service_role";

grant select on table "software_maintenance"."licenses" to "service_role";

grant trigger on table "software_maintenance"."licenses" to "service_role";

grant truncate on table "software_maintenance"."licenses" to "service_role";

grant update on table "software_maintenance"."licenses" to "service_role";

grant delete on table "software_maintenance"."software" to "anon";

grant insert on table "software_maintenance"."software" to "anon";

grant references on table "software_maintenance"."software" to "anon";

grant select on table "software_maintenance"."software" to "anon";

grant trigger on table "software_maintenance"."software" to "anon";

grant truncate on table "software_maintenance"."software" to "anon";

grant update on table "software_maintenance"."software" to "anon";

grant delete on table "software_maintenance"."software" to "authenticated";

grant insert on table "software_maintenance"."software" to "authenticated";

grant references on table "software_maintenance"."software" to "authenticated";

grant select on table "software_maintenance"."software" to "authenticated";

grant trigger on table "software_maintenance"."software" to "authenticated";

grant truncate on table "software_maintenance"."software" to "authenticated";

grant update on table "software_maintenance"."software" to "authenticated";

grant delete on table "software_maintenance"."software" to "service_role";

grant insert on table "software_maintenance"."software" to "service_role";

grant references on table "software_maintenance"."software" to "service_role";

grant select on table "software_maintenance"."software" to "service_role";

grant trigger on table "software_maintenance"."software" to "service_role";

grant truncate on table "software_maintenance"."software" to "service_role";

grant update on table "software_maintenance"."software" to "service_role";

grant delete on table "software_maintenance"."vendors" to "anon";

grant insert on table "software_maintenance"."vendors" to "anon";

grant references on table "software_maintenance"."vendors" to "anon";

grant select on table "software_maintenance"."vendors" to "anon";

grant trigger on table "software_maintenance"."vendors" to "anon";

grant truncate on table "software_maintenance"."vendors" to "anon";

grant update on table "software_maintenance"."vendors" to "anon";

grant delete on table "software_maintenance"."vendors" to "authenticated";

grant insert on table "software_maintenance"."vendors" to "authenticated";

grant references on table "software_maintenance"."vendors" to "authenticated";

grant select on table "software_maintenance"."vendors" to "authenticated";

grant trigger on table "software_maintenance"."vendors" to "authenticated";

grant truncate on table "software_maintenance"."vendors" to "authenticated";

grant update on table "software_maintenance"."vendors" to "authenticated";

grant delete on table "software_maintenance"."vendors" to "service_role";

grant insert on table "software_maintenance"."vendors" to "service_role";

grant references on table "software_maintenance"."vendors" to "service_role";

grant select on table "software_maintenance"."vendors" to "service_role";

grant trigger on table "software_maintenance"."vendors" to "service_role";

grant truncate on table "software_maintenance"."vendors" to "service_role";

grant update on table "software_maintenance"."vendors" to "service_role";


  create policy "Admins can manage maintenance records"
  on "car_rental"."maintenance_records"
  as permissive
  for all
  to public
using ((auth.uid() IN ( SELECT users.id
   FROM auth.users
  WHERE ((users.raw_user_meta_data ->> 'role'::text) = 'admin'::text))));



  create policy "Anyone can view maintenance records"
  on "car_rental"."maintenance_records"
  as permissive
  for select
  to public
using ((auth.uid() IS NOT NULL));



  create policy "Allow authenticated users to insert requests"
  on "car_rental"."rental_requests"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to select requests"
  on "car_rental"."rental_requests"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to update requests"
  on "car_rental"."rental_requests"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Users see own requests, Admins see all"
  on "car_rental"."rental_requests"
  as permissive
  for select
  to public
using (((auth.uid() = requester_id) OR (EXISTS ( SELECT 1
   FROM public.employees
  WHERE ((employees.user_id = auth.uid()) AND ((employees.role)::text = 'admin'::text))))));



  create policy "Admins can manage rentals"
  on "car_rental"."rentals"
  as permissive
  for all
  to public
using (car_rental.is_admin());



  create policy "Users can view own rentals"
  on "car_rental"."rentals"
  as permissive
  for select
  to public
using ((renter_id = car_rental.get_current_employee_id()));



  create policy "Admins can manage vehicles"
  on "car_rental"."vehicles"
  as permissive
  for all
  to public
using (car_rental.is_admin());



  create policy "Anyone can view available vehicles"
  on "car_rental"."vehicles"
  as permissive
  for select
  to public
using (((auth.uid() IS NOT NULL) AND (deleted_at IS NULL)));



  create policy "Users can manage their own read records"
  on "eip"."announcement_reads"
  as permissive
  for all
  to authenticated
using ((user_id = auth.uid()));



  create policy "Admins can manage announcements"
  on "eip"."announcements"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "Anyone can view active announcements"
  on "eip"."announcements"
  as permissive
  for select
  to authenticated
using ((is_active = true));



  create policy "Admins can manage document categories"
  on "eip"."document_categories"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "Anyone can view active document categories"
  on "eip"."document_categories"
  as permissive
  for select
  to authenticated
using ((is_active = true));



  create policy "Users can manage their own favorites"
  on "eip"."document_favorites"
  as permissive
  for all
  to authenticated
using ((user_id = auth.uid()));



  create policy "Admins can manage all documents"
  on "eip"."documents"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "Anyone can view published documents"
  on "eip"."documents"
  as permissive
  for select
  to authenticated
using ((status = 'published'::text));



  create policy "Authors can manage their documents"
  on "eip"."documents"
  as permissive
  for all
  to authenticated
using ((author_id = auth.uid()));



  create policy "使用者可修改自己的預約"
  on "meeting_system"."bookings"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id));



  create policy "使用者可新增預約"
  on "meeting_system"."bookings"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "讀取所有預約"
  on "meeting_system"."bookings"
  as permissive
  for select
  to authenticated
using (true);



  create policy "僅管理員可修改會議室"
  on "meeting_system"."rooms"
  as permissive
  for all
  to authenticated
using (((auth.jwt() ->> 'email'::text) = 'fangea23@gmail.com'::text))
with check (((auth.jwt() ->> 'email'::text) = 'fangea23@gmail.com'::text));



  create policy "公開讀取會議室"
  on "meeting_system"."rooms"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow public read access on banks"
  on "payment_approval"."banks"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Allow public read access on branches"
  on "payment_approval"."branches"
  as permissive
  for select
  to anon, authenticated
using (true);



  create policy "Allow authenticated users to insert requests"
  on "payment_approval"."payment_requests"
  as permissive
  for insert
  to authenticated
with check (true);



  create policy "Allow authenticated users to select requests"
  on "payment_approval"."payment_requests"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Allow authenticated users to update requests"
  on "payment_approval"."payment_requests"
  as permissive
  for update
  to authenticated
using (true);



  create policy "Anyone can view active departments"
  on "public"."departments"
  as permissive
  for select
  to public
using (((auth.uid() IS NOT NULL) AND (is_active = true) AND (deleted_at IS NULL)));



  create policy "Enable read access for authenticated users"
  on "public"."departments"
  as permissive
  for select
  to authenticated
using (true);



  create policy "HR and admins can manage departments"
  on "public"."departments"
  as permissive
  for all
  to public
using ((public.check_is_admin_or_hr() = true));



  create policy "Enable read access for authenticated users"
  on "public"."employees"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Users can insert own profile"
  on "public"."profiles"
  as permissive
  for insert
  to authenticated
with check ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can update own profile"
  on "public"."profiles"
  as permissive
  for update
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Users can view own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((( SELECT auth.uid() AS uid) = id));



  create policy "Allow public read access"
  on "reviews_data"."places"
  as permissive
  for select
  to public
using (true);



  create policy "Admins can manage ticket categories"
  on "service"."ticket_categories"
  as permissive
  for all
  to authenticated
using ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND ((profiles.role)::text = ANY ((ARRAY['admin'::character varying, 'hr'::character varying])::text[]))))));



  create policy "Anyone can view active ticket categories"
  on "service"."ticket_categories"
  as permissive
  for select
  to authenticated
using ((is_active = true));



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



  create policy "Anyone can create tickets"
  on "service"."tickets"
  as permissive
  for insert
  to authenticated
with check ((reporter_id = auth.uid()));



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



  create policy "Admin can view audit logs"
  on "software_maintenance"."audit_logs"
  as permissive
  for select
  to public
using ((software_maintenance.check_if_admin() = true));



  create policy "Allow all access"
  on "software_maintenance"."devices"
  as permissive
  for all
  to public
using (true)
with check (true);



  create policy "Admin can manage assignments"
  on "software_maintenance"."license_assignments"
  as permissive
  for all
  to public
using ((software_maintenance.check_if_admin() = true));



  create policy "Authenticated users can view assignments"
  on "software_maintenance"."license_assignments"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Admin can manage licenses"
  on "software_maintenance"."licenses"
  as permissive
  for all
  to public
using ((software_maintenance.check_if_admin() = true));



  create policy "Authenticated users can view licenses"
  on "software_maintenance"."licenses"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Admin can manage software"
  on "software_maintenance"."software"
  as permissive
  for all
  to public
using ((software_maintenance.check_if_admin() = true));



  create policy "Authenticated users can view software"
  on "software_maintenance"."software"
  as permissive
  for select
  to authenticated
using (true);



  create policy "Admin can manage vendors"
  on "software_maintenance"."vendors"
  as permissive
  for all
  to public
using ((software_maintenance.check_if_admin() = true));



  create policy "Authenticated users can view vendors"
  on "software_maintenance"."vendors"
  as permissive
  for select
  to authenticated
using (true);


CREATE TRIGGER update_maintenance_updated_at BEFORE UPDATE ON car_rental.maintenance_records FOR EACH ROW EXECUTE FUNCTION car_rental.update_updated_at_column();

CREATE TRIGGER update_rental_requests_updated_at BEFORE UPDATE ON car_rental.rental_requests FOR EACH ROW EXECUTE FUNCTION car_rental.update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON car_rental.rentals FOR EACH ROW EXECUTE FUNCTION car_rental.update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON car_rental.vehicles FOR EACH ROW EXECUTE FUNCTION car_rental.update_updated_at_column();

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER check_role_change BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.prevent_role_change();

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER sync_profile_to_employee_trigger AFTER UPDATE ON public.profiles FOR EACH ROW WHEN (((old.full_name IS DISTINCT FROM new.full_name) OR (old.email IS DISTINCT FROM new.email) OR ((old.role)::text IS DISTINCT FROM (new.role)::text))) EXECUTE FUNCTION public.sync_profile_to_employee();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER check_ticket_sla BEFORE INSERT OR UPDATE ON service.tickets FOR EACH ROW EXECUTE FUNCTION service.update_ticket_sla();

CREATE TRIGGER log_ticket_changes AFTER INSERT OR UPDATE ON service.tickets FOR EACH ROW EXECUTE FUNCTION service.log_ticket_history();

CREATE TRIGGER set_ticket_number BEFORE INSERT ON service.tickets FOR EACH ROW WHEN ((new.ticket_number IS NULL)) EXECUTE FUNCTION service.generate_ticket_number();

CREATE TRIGGER assignments_updated_at BEFORE UPDATE ON software_maintenance.license_assignments FOR EACH ROW EXECUTE FUNCTION software_maintenance.update_updated_at();

CREATE TRIGGER update_license_assigned_count AFTER INSERT OR DELETE OR UPDATE ON software_maintenance.license_assignments FOR EACH ROW EXECUTE FUNCTION software_maintenance.update_assigned_count();

CREATE TRIGGER licenses_updated_at BEFORE UPDATE ON software_maintenance.licenses FOR EACH ROW EXECUTE FUNCTION software_maintenance.update_updated_at();

CREATE TRIGGER software_updated_at BEFORE UPDATE ON software_maintenance.software FOR EACH ROW EXECUTE FUNCTION software_maintenance.update_updated_at();

CREATE TRIGGER vendors_updated_at BEFORE UPDATE ON software_maintenance.vendors FOR EACH ROW EXECUTE FUNCTION software_maintenance.update_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_auth_user_updated AFTER UPDATE ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();


  create policy "Allow all updates"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'signatures'::text));



  create policy "Allow all uploads"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'signatures'::text));



  create policy "Allow public uploads 1mt4rzk_0"
  on "storage"."objects"
  as permissive
  for insert
  to anon, authenticated
with check ((bucket_id = 'attachments'::text));



  create policy "Allow public uploads 1mt4rzk_1"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'attachments'::text));



  create policy "Allow public uploads 1mt4rzk_2"
  on "storage"."objects"
  as permissive
  for update
  to anon, authenticated
using ((bucket_id = 'attachments'::text));



  create policy "Give me public access"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'signatures'::text));



