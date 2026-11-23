insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'online-report-pdfs',
  'online-report-pdfs',
  false,
  52428800,
  array['application/pdf']
);

create unique index online_reports_pdf_path_idx on public.online_reports (pdf_path)
  where pdf_path is not null;

comment on column public.online_reports.pdf_path is 'Path of the report PDF in the private online-report-pdfs bucket, <owner_id>/<report_id>.pdf; set by the worker in the same transaction that makes the report ready.';

create policy "Owners can read the PDFs of their online reports"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'online-report-pdfs'
    and exists (
      select 1
      from public.online_reports r
      where r.pdf_path = objects.name
        and r.owner_id = (select auth.uid())
    )
  );

create function private.online_report_pdf_path(p_report_id uuid)
returns text
language sql
stable
set search_path = ''
as $$
  select r.owner_id::text || '/' || r.id::text || '.pdf'
  from public.online_reports r
  where r.id = p_report_id;
$$;

revoke execute on function private.online_report_pdf_path(uuid) from public, anon, authenticated;

create function private.attach_online_report_pdf(p_report_id uuid, p_pdf_path text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_report public.online_reports%rowtype;
begin
  select r.* into v_report
  from public.online_reports r
  where r.id = p_report_id
  for update;

  if v_report.id is null then
    raise exception using errcode = 'P0001', message = 'report_not_found';
  end if;

  if v_report.status <> 'ready' then
    raise exception using errcode = 'P0001', message = 'report_not_ready';
  end if;

  if p_pdf_path is distinct from private.online_report_pdf_path(p_report_id) then
    raise exception using errcode = 'P0001', message = 'report_pdf_path_invalid';
  end if;

  update public.online_reports
  set pdf_path = p_pdf_path, claim_expires_at = null
  where id = p_report_id;
end;
$$;

revoke execute on function private.attach_online_report_pdf(uuid, text) from public, anon, authenticated;

create or replace function private.begin_online_report(p_report_id uuid)
returns table (snapshot_id uuid, cell_id uuid, city_slug text, latitude double precision, longitude double precision)
language plpgsql
set search_path = ''
as $$
declare
  v_report public.online_reports%rowtype;
  v_snapshot_id uuid;
  v_cell_id uuid;
  v_city_slug text;
begin
  select r.* into v_report
  from public.online_reports r
  where r.id = p_report_id
  for update;

  if v_report.id is null then
    raise exception using errcode = 'P0001', message = 'report_not_found';
  end if;

  if v_report.status = 'ready' then
    raise exception using errcode = 'P0001', message = 'report_already_ready';
  end if;

  if v_report.status = 'generating'
    and v_report.updated_at > now() - interval '15 minutes'
    and (v_report.claim_expires_at is null or v_report.claim_expires_at <= now()) then
    raise exception using errcode = 'P0001', message = 'report_in_progress';
  end if;

  v_snapshot_id := private.current_score_snapshot_id();
  if v_snapshot_id is null then
    raise exception using errcode = 'P0001', message = 'no_ready_snapshot';
  end if;

  select g.id, c.slug into v_cell_id, v_city_slug
  from public.score_snapshots s
  join public.scoring_versions v on v.id = s.scoring_version_id
  join private.grid_cells g
    on g.size_m = (v.params ->> 'cell_size_m')::integer
    and g.city_id = v_report.city_id
    and extensions.st_intersects(g.geometry, v_report.location)
  join private.cell_scores cs on cs.snapshot_id = s.id and cs.cell_id = g.id
  join public.cities c on c.id = g.city_id
  where s.id = v_snapshot_id
  order by g.cell_key
  limit 1;

  if v_cell_id is null then
    raise exception using errcode = 'P0001', message = 'outside_coverage';
  end if;

  update public.online_reports
  set status = 'generating', error_code = null
  where id = p_report_id;

  return query
  select v_snapshot_id, v_cell_id, v_city_slug, v_report.latitude, v_report.longitude;
end;
$$;
