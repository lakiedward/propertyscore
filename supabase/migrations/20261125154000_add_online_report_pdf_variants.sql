create table private.online_report_pdf_variants (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.online_reports (id) on delete cascade,
  locale text not null check (locale in ('ro', 'en')),
  requested_at timestamptz not null default now(),
  storage_path text,
  failed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, locale),
  check (storage_path is null or failed_at is null)
);

alter table private.online_report_pdf_variants enable row level security;
revoke all on private.online_report_pdf_variants from public, anon, authenticated;

create index online_report_pdf_variants_pending_idx
  on private.online_report_pdf_variants (requested_at, report_id, locale)
  where storage_path is null and failed_at is null;

create trigger online_report_pdf_variants_set_updated_at
  before update on private.online_report_pdf_variants
  for each row execute function private.set_updated_at();

create function public.request_online_report_pdf_variant(
  p_report_id uuid,
  p_locale text,
  p_owner_id uuid default null,
  p_token text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_number bigint;
  v_variant private.online_report_pdf_variants%rowtype;
begin
  if p_locale is null or p_locale not in ('ro', 'en') then
    return null;
  end if;

  if p_token is null then
    select r.number into v_number
    from public.online_reports r
    where r.id = p_report_id and r.status = 'ready' and r.owner_id = p_owner_id;
  else
    select r.number into v_number
    from public.resolve_report_share_link(p_report_id, p_token) r;
  end if;

  if v_number is null then
    return null;
  end if;

  select * into v_variant
  from private.online_report_pdf_variants
  where report_id = p_report_id and locale = p_locale;

  if not found then
    insert into private.online_report_pdf_variants (report_id, locale)
    values (p_report_id, p_locale)
    on conflict (report_id, locale) do nothing;
  elsif v_variant.failed_at <= now() - interval '5 minutes' then
    update private.online_report_pdf_variants
    set requested_at = now(), failed_at = null
    where report_id = p_report_id and locale = p_locale
      and failed_at <= now() - interval '5 minutes';
  end if;

  select * into v_variant
  from private.online_report_pdf_variants
  where report_id = p_report_id and locale = p_locale;

  if v_variant.storage_path is not null then
    return jsonb_build_object('status', 'ready', 'path', v_variant.storage_path, 'number', v_number);
  elsif v_variant.failed_at is not null then
    return jsonb_build_object('status', 'unavailable');
  end if;
  return jsonb_build_object('status', 'pending');
end;
$$;

revoke all on function public.request_online_report_pdf_variant(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.request_online_report_pdf_variant(uuid, text, uuid, text)
  to service_role;
