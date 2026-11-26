create function public.shared_report_pdf(p_report_id uuid, p_token text)
returns table (pdf_path text, number bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select r.pdf_path, r.number
  from public.report_share_links l
  join public.online_reports r on r.id = l.online_report_id
  where p_token ~ '^[0-9a-f]{48}$'
    and l.token_hash = extensions.digest(p_token, 'sha256')
    and l.online_report_id = p_report_id
    and l.revoked_at is null
    and (l.expires_at is null or l.expires_at > now())
    and r.status = 'ready'
    and r.pdf_path is not null;
$$;

comment on function public.shared_report_pdf(uuid, text) is 'PDF path of a ready report reached through an active share link; called only by the shared-report-pdf Edge Function with the secret key, which signs a short download URL for it.';

revoke all on function public.shared_report_pdf(uuid, text) from public, anon, authenticated;
grant execute on function public.shared_report_pdf(uuid, text) to service_role;
