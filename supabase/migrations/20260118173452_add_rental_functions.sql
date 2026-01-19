alter table "public"."employees" drop constraint "fk_employees_departments";

alter table "software_maintenance"."license_assignments" drop constraint "license_assignments_device_id_fkey";

alter table "car_rental"."rental_requests" drop constraint "rental_requests_requester_id_fkey";

alter table "car_rental"."rental_requests" drop constraint "rental_requests_reviewer_id_fkey";

alter table "car_rental"."rentals" drop constraint "rentals_renter_id_fkey";

drop function if exists "public"."deactivate_license"(p_license_key text, p_machine_id text);

drop function if exists "public"."verify_license"(p_license_key text, p_machine_id text, p_machine_name text, p_ip_address text);

alter table "car_rental"."rental_requests" drop column "requester_name";

alter table "car_rental"."rentals" drop column "renter_name";

select 1; 
-- CREATE INDEX prevent_overlapping_rentals ON car_rental.rentals USING gist (vehicle_id, tsrange((start_date)::timestamp without time zone, (end_date)::timestamp without time zone, '[]'::text));

alter table "car_rental"."rental_requests" add constraint "check_dates_logic" CHECK ((end_date > start_date)) not valid;

alter table "car_rental"."rental_requests" validate constraint "check_dates_logic";

alter table "car_rental"."rentals" add constraint "check_mileage_logic" CHECK ((end_mileage >= start_mileage)) not valid;

alter table "car_rental"."rentals" validate constraint "check_mileage_logic";

alter table "car_rental"."rentals" add constraint "prevent_overlapping_rentals" EXCLUDE USING gist (vehicle_id WITH =, tsrange((start_date)::timestamp without time zone, (end_date)::timestamp without time zone, '[]'::text) WITH &&);

alter table "car_rental"."rental_requests" add constraint "rental_requests_requester_id_fkey" FOREIGN KEY (requester_id) REFERENCES public.employees(id) not valid;

alter table "car_rental"."rental_requests" validate constraint "rental_requests_requester_id_fkey";

alter table "car_rental"."rental_requests" add constraint "rental_requests_reviewer_id_fkey" FOREIGN KEY (reviewer_id) REFERENCES public.employees(id) not valid;

alter table "car_rental"."rental_requests" validate constraint "rental_requests_reviewer_id_fkey";

alter table "car_rental"."rentals" add constraint "rentals_renter_id_fkey" FOREIGN KEY (renter_id) REFERENCES public.employees(id) not valid;

alter table "car_rental"."rentals" validate constraint "rentals_renter_id_fkey";

set check_function_bodies = off;

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


grant delete on table "car_rental"."maintenance_records" to "anon";

grant insert on table "car_rental"."maintenance_records" to "anon";

grant references on table "car_rental"."maintenance_records" to "anon";

grant select on table "car_rental"."maintenance_records" to "anon";

grant trigger on table "car_rental"."maintenance_records" to "anon";

grant truncate on table "car_rental"."maintenance_records" to "anon";

grant update on table "car_rental"."maintenance_records" to "anon";

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



