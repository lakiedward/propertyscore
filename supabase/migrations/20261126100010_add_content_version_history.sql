create function private.consent_version_inspections(p_consent_version_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from (
    select inspections.id
    from public.inspections
    where inspections.consent_version_id = p_consent_version_id
    union
    select inspection_consents.inspection_id
    from public.inspection_consents
    where inspection_consents.consent_version_id = p_consent_version_id
  ) as used;
$$;

create function private.form_version_inspections(p_form_version_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from (
    select inspections.id
    from public.inspections
    where inspections.form_version_id = p_form_version_id
    union
    select inspection_answers.inspection_id
    from public.inspection_answers
    join public.inspection_form_questions as question
      on question.id = inspection_answers.question_id
    where question.form_version_id = p_form_version_id
    union
    select inspection_media.inspection_id
    from public.inspection_media
    join public.inspection_form_questions as question
      on question.id = inspection_media.question_id
    where question.form_version_id = p_form_version_id
  ) as used;
$$;

create function public.consent_version_usage()
returns table (consent_version_id uuid, inspection_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select consent_versions.id, private.consent_version_inspections(consent_versions.id)
  from public.consent_versions
  where consent_versions.status <> 'draft';
end;
$$;

create function public.inspection_form_version_usage()
returns table (form_version_id uuid, inspection_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  return query
  select inspection_form_versions.id,
    private.form_version_inspections(inspection_form_versions.id)
  from public.inspection_form_versions
  where inspection_form_versions.status <> 'draft';
end;
$$;

create function public.restore_consent_version(p_consent_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.consent_versions;
  draft_id uuid;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('consent_versions'));

  select * into source from public.consent_versions where id = p_consent_version_id;
  if not found or source.status = 'draft' then
    raise exception using errcode = 'P0001', message = 'version_not_found';
  end if;

  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.consent_versions where status = 'draft';
  perform set_config('app.form_publish_switch', 'off', true);

  insert into public.consent_versions (version, created_by)
  values (
    coalesce((select max(version) from public.consent_versions), 0.9) + 0.1,
    (select auth.uid())
  )
  returning id into draft_id;

  insert into public.consent_sections (
    consent_version_id, position, title_ro, title_en, text_ro, text_en, check_ro, check_en
  )
  select draft_id, position, title_ro, title_en, text_ro, text_en, check_ro, check_en
  from public.consent_sections
  where consent_version_id = source.id;

  return draft_id;
end;
$$;

create function public.restore_inspection_form_version(p_form_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  source public.inspection_form_versions;
  draft_id uuid;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));

  select * into source from public.inspection_form_versions where id = p_form_version_id;
  if not found or source.status = 'draft' then
    raise exception using errcode = 'P0001', message = 'version_not_found';
  end if;

  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.inspection_form_versions where status = 'draft';
  perform set_config('app.form_publish_switch', 'off', true);

  insert into public.inspection_form_versions (
    version, points_good, points_acceptable, points_problem, created_by
  )
  values (
    coalesce((select max(version) from public.inspection_form_versions), 0) + 1,
    source.points_good,
    source.points_acceptable,
    source.points_problem,
    (select auth.uid())
  )
  returning id into draft_id;

  with copied as (
    insert into public.inspection_form_categories (
      form_version_id, key, position, name_ro, name_en, icon, weight
    )
    select draft_id, key, position, name_ro, name_en, icon, weight
    from public.inspection_form_categories
    where form_version_id = source.id
    returning id, key
  )
  insert into public.inspection_form_questions (
    category_id, form_version_id, key, position, text_ro, text_en, required_media
  )
  select copied.id, draft_id, question.key, question.position, question.text_ro,
    question.text_en, question.required_media
  from public.inspection_form_questions as question
  join public.inspection_form_categories as category on category.id = question.category_id
  join copied on copied.key = category.key
  where question.form_version_id = source.id;

  return draft_id;
end;
$$;

create function public.delete_consent_version(p_consent_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.consent_versions;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('consent_versions'));

  select * into target from public.consent_versions where id = p_consent_version_id for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'version_not_found';
  end if;
  if target.status <> 'archived' then
    raise exception using errcode = 'P0001', message = 'version_not_archived';
  end if;
  if private.consent_version_inspections(target.id) > 0 then
    raise exception using errcode = 'P0001', message = 'version_in_use';
  end if;

  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.consent_versions where id = target.id;
  perform set_config('app.form_publish_switch', 'off', true);
end;
$$;

create function public.delete_inspection_form_version(p_form_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inspection_form_versions;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));

  select * into target
  from public.inspection_form_versions
  where id = p_form_version_id
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'version_not_found';
  end if;
  if target.status <> 'archived' then
    raise exception using errcode = 'P0001', message = 'version_not_archived';
  end if;
  if private.form_version_inspections(target.id) > 0 then
    raise exception using errcode = 'P0001', message = 'version_in_use';
  end if;

  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.inspection_form_versions where id = target.id;
  perform set_config('app.form_publish_switch', 'off', true);
end;
$$;

revoke execute on function
  private.consent_version_inspections(uuid),
  private.form_version_inspections(uuid)
  from public, anon, authenticated;

revoke execute on function
  public.consent_version_usage(),
  public.inspection_form_version_usage(),
  public.restore_consent_version(uuid),
  public.restore_inspection_form_version(uuid),
  public.delete_consent_version(uuid),
  public.delete_inspection_form_version(uuid)
  from public, anon;

grant execute on function
  public.consent_version_usage(),
  public.inspection_form_version_usage(),
  public.restore_consent_version(uuid),
  public.restore_inspection_form_version(uuid),
  public.delete_consent_version(uuid),
  public.delete_inspection_form_version(uuid)
  to authenticated;
