create type public.inspection_answer as enum ('good', 'acceptable', 'problem', 'not_applicable');

create type public.inspection_media_kind as enum ('photo', 'video');

alter table public.inspections
  add column form_version_id uuid references public.inspection_form_versions (id) on delete restrict,
  add column consent_version_id uuid references public.consent_versions (id) on delete restrict,
  add column started_at timestamptz,
  add column submitted_at timestamptz,
  add column score numeric(3, 1) check (score between 0 and 10),
  add column category_scores jsonb,
  add column completion_confirmed_by text check (char_length(btrim(completion_confirmed_by)) between 1 and 120);

alter table public.inspections drop constraint inspections_assignment_check;

alter table public.inspections add constraint inspections_assignment_check check (
  (status = 'inspector_assigned') = (inspector_id is not null and status <> 'cancelled')
  or status in ('in_progress', 'completed', 'book_ready', 'cancelled')
);

alter table public.inspections add constraint inspections_started_check check (
  status <> 'in_progress'
  or (inspector_id is not null and form_version_id is not null and started_at is not null)
);

alter table public.inspections add constraint inspections_submitted_check check (
  status <> 'completed' or submitted_at is not null
);

create index inspections_form_version_id_idx on public.inspections (form_version_id);
create index inspections_consent_version_id_idx on public.inspections (consent_version_id);

create table public.inspection_consents (
  inspection_id uuid primary key references public.inspections (id) on delete cascade,
  consent_version_id uuid not null references public.consent_versions (id) on delete restrict,
  language text not null check (language in ('ro', 'en')),
  signer_name text not null check (char_length(btrim(signer_name)) between 1 and 120),
  signer_role text not null default 'owner' check (signer_role in ('owner')),
  signature_path text not null,
  sections_snapshot jsonb not null,
  signed_at timestamptz not null default now(),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inspection_consents_consent_version_id_idx on public.inspection_consents (consent_version_id);
create index inspection_consents_created_by_idx on public.inspection_consents (created_by);

create table public.inspection_answers (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  question_id uuid not null references public.inspection_form_questions (id) on delete restrict,
  answer public.inspection_answer,
  note text not null default '' check (char_length(note) <= 2000),
  answered_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_answers_question_unique unique (inspection_id, question_id)
);

create index inspection_answers_question_id_idx on public.inspection_answers (question_id);
create index inspection_answers_answered_by_idx on public.inspection_answers (answered_by);

create trigger inspection_answers_set_updated_at
  before update on public.inspection_answers
  for each row execute function private.set_updated_at();

create table public.inspection_media (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  question_id uuid not null references public.inspection_form_questions (id) on delete restrict,
  kind public.inspection_media_kind not null,
  path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index inspection_media_inspection_question_idx
  on public.inspection_media (inspection_id, question_id);
create index inspection_media_question_id_idx on public.inspection_media (question_id);
create index inspection_media_created_by_idx on public.inspection_media (created_by);

alter table public.inspection_consents enable row level security;
alter table public.inspection_answers enable row level security;
alter table public.inspection_media enable row level security;

revoke all on public.inspection_consents, public.inspection_answers, public.inspection_media
  from anon, authenticated;

grant select on public.inspection_consents, public.inspection_answers, public.inspection_media
  to authenticated;

create policy "Assigned inspectors and admins read the signed consent"
  on public.inspection_consents for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or exists (
      select 1 from public.inspections
      where inspections.id = inspection_consents.inspection_id
        and inspections.inspector_id = (select auth.uid())
    )
  );

create policy "Assigned inspectors and admins read the answers"
  on public.inspection_answers for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or exists (
      select 1 from public.inspections
      where inspections.id = inspection_answers.inspection_id
        and inspections.inspector_id = (select auth.uid())
    )
  );

create policy "Assigned inspectors and admins read the media"
  on public.inspection_media for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or exists (
      select 1 from public.inspections
      where inspections.id = inspection_media.inspection_id
        and inspections.inspector_id = (select auth.uid())
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'inspection-media',
  'inspection-media',
  false,
  52428800,
  array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'video/webm']
);

create policy "Assigned inspectors and admins read inspection files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'inspection-media'
    and (
      coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
      or exists (
        select 1 from public.inspections
        where inspections.id::text = (storage.foldername(name))[1]
          and inspections.inspector_id = (select auth.uid())
      )
    )
  );

create policy "Assigned inspectors upload files to their open inspections"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'inspection-media'
    and exists (
      select 1 from public.inspections
      where inspections.id::text = (storage.foldername(name))[1]
        and inspections.inspector_id = (select auth.uid())
        and (
          (inspections.status = 'inspector_assigned' and (storage.foldername(name))[2] = 'signature')
          or (inspections.status = 'in_progress' and (storage.foldername(name))[2] = 'question')
        )
    )
  );

create policy "Assigned inspectors delete unregistered files of their open inspections"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'inspection-media'
    and not exists (
      select 1 from public.inspection_media
      where inspection_media.path = objects.name
    )
    and exists (
      select 1 from public.inspections
      where inspections.id::text = (storage.foldername(name))[1]
        and inspections.inspector_id = (select auth.uid())
        and (
          (inspections.status = 'inspector_assigned' and (storage.foldername(name))[2] = 'signature')
          or (inspections.status = 'in_progress' and (storage.foldername(name))[2] = 'question')
        )
    )
  );

create or replace function private.inspector_is_free(
  p_inspector_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_exclude_inspection_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.inspector_weekly_hours as hours
      where hours.inspector_id = p_inspector_id
        and hours.weekday = extract(isodow from p_starts_at at time zone 'Europe/Bucharest')
        and (p_starts_at at time zone 'Europe/Bucharest')::date
          = (p_ends_at at time zone 'Europe/Bucharest')::date
        and hours.starts_at <= (p_starts_at at time zone 'Europe/Bucharest')::time
        and hours.ends_at >= (p_ends_at at time zone 'Europe/Bucharest')::time
    )
    and not exists (
      select 1
      from public.inspector_exceptions as exception
      where exception.inspector_id = p_inspector_id
        and exception.starts_at < p_ends_at
        and exception.ends_at > p_starts_at
    )
    and not exists (
      select 1
      from public.inspections as booked
      where booked.inspector_id = p_inspector_id
        and booked.status in ('inspector_assigned', 'in_progress', 'completed', 'book_ready')
        and booked.id is distinct from p_exclude_inspection_id
        and booked.starts_at < p_ends_at + interval '30 minutes'
        and booked.ends_at > p_starts_at - interval '30 minutes'
    );
$$;

create function private.lock_assigned_inspection(p_inspection_id uuid)
returns public.inspections
language plpgsql
security definer
set search_path = ''
as $$
declare
  found public.inspections;
begin
  if (select auth.uid()) is null or not private.has_role('inspector') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
  select * into found from public.inspections where inspections.id = p_inspection_id for update;
  if found.id is null or found.inspector_id is distinct from (select auth.uid()) then
    raise exception using errcode = 'P0001', message = 'inspection_not_found';
  end if;
  return found;
end;
$$;

create function private.inspection_category_scores(p_inspection_id uuid)
returns table (
  category_id uuid,
  key text,
  weight smallint,
  answered integer,
  total integer,
  score numeric
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    category.id,
    category.key,
    category.weight,
    count(answer.answer)::integer,
    count(question.id)::integer,
    avg(
      case answer.answer
        when 'good' then version.points_good
        when 'acceptable' then version.points_acceptable
        when 'problem' then version.points_problem
      end
    )
  from public.inspections
  join public.inspection_form_versions as version on version.id = inspections.form_version_id
  join public.inspection_form_categories as category on category.form_version_id = version.id
  left join public.inspection_form_questions as question on question.category_id = category.id
  left join public.inspection_answers as answer
    on answer.inspection_id = inspections.id and answer.question_id = question.id
  where inspections.id = p_inspection_id
  group by category.id, category.key, category.weight, category.position
  order by category.position;
$$;

create function private.inspection_total_score(p_inspection_id uuid)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select round(sum(scores.weight * scores.score) / nullif(sum(scores.weight), 0), 1)
  from private.inspection_category_scores(p_inspection_id) as scores
  where scores.score is not null;
$$;

create function private.inspection_missing_media(p_inspection_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
  from public.inspections
  join public.inspection_form_questions as question
    on question.form_version_id = inspections.form_version_id
  left join public.inspection_answers as answer
    on answer.inspection_id = inspections.id and answer.question_id = question.id
  where inspections.id = p_inspection_id
    and question.required_media <> 'none'
    and answer.answer is distinct from 'not_applicable'
    and not exists (
      select 1 from public.inspection_media as media
      where media.inspection_id = inspections.id
        and media.question_id = question.id
        and media.kind::text = question.required_media::text
    );
$$;

create function public.start_inspection(
  p_inspection_id uuid,
  p_signer_name text,
  p_language text,
  p_signature_path text,
  p_accepted_section_ids uuid[],
  p_latitude double precision default null,
  p_longitude double precision default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inspections;
  form_id uuid;
  consent_id uuid;
  local_start timestamp;
begin
  target := private.lock_assigned_inspection(p_inspection_id);

  local_start := target.starts_at at time zone 'Europe/Bucharest';
  if target.status <> 'inspector_assigned'
    or now() < target.starts_at - interval '60 minutes'
    or (now() at time zone 'Europe/Bucharest')::date <> local_start::date then
    raise exception using errcode = 'P0001', message = 'inspection_not_startable';
  end if;

  select id into form_id from public.inspection_form_versions where status = 'published';
  select id into consent_id from public.consent_versions where status = 'published';
  if form_id is null or consent_id is null then
    raise exception using errcode = 'P0001', message = 'form_not_published';
  end if;

  if coalesce(p_language, '') not in ('ro', 'en')
    or char_length(btrim(coalesce(p_signer_name, ''))) not between 1 and 120
    or (
      select coalesce(array_agg(id order by id), '{}') from public.consent_sections
      where consent_version_id = consent_id
    ) is distinct from (
      select coalesce(array_agg(distinct id order by id), '{}') from unnest(p_accepted_section_ids) as id
    ) then
    raise exception using errcode = 'P0001', message = 'consent_incomplete';
  end if;

  if p_signature_path is null
    or p_signature_path not like p_inspection_id::text || '/signature/%'
    or not exists (
      select 1 from storage.objects
      where objects.bucket_id = 'inspection-media' and objects.name = p_signature_path
    ) then
    raise exception using errcode = 'P0001', message = 'signature_missing';
  end if;

  insert into public.inspection_consents (
    inspection_id, consent_version_id, language, signer_name, signature_path, sections_snapshot,
    latitude, longitude, created_by
  )
  select
    p_inspection_id,
    consent_id,
    p_language,
    btrim(p_signer_name),
    p_signature_path,
    jsonb_agg(
      jsonb_build_object(
        'title', case when p_language = 'en' then sections.title_en else sections.title_ro end,
        'text', case when p_language = 'en' then sections.text_en else sections.text_ro end,
        'check', case when p_language = 'en' then sections.check_en else sections.check_ro end,
        'accepted', true
      )
      order by sections.position
    ),
    p_latitude,
    p_longitude,
    (select auth.uid())
  from public.consent_sections as sections
  where sections.consent_version_id = consent_id;

  update public.inspections
  set status = 'in_progress',
    form_version_id = form_id,
    consent_version_id = consent_id,
    started_at = now()
  where id = p_inspection_id;

  insert into public.inspection_events (inspection_id, kind, actor_id, details)
  values (
    p_inspection_id,
    'started',
    (select auth.uid()),
    jsonb_build_object('consent_version_id', consent_id, 'language', p_language)
  );
end;
$$;

create function public.save_inspection_answer(
  p_inspection_id uuid,
  p_question_id uuid,
  p_answer public.inspection_answer default null,
  p_note text default ''
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inspections;
begin
  target := private.lock_assigned_inspection(p_inspection_id);
  if target.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'inspection_not_in_progress';
  end if;
  if not exists (
    select 1 from public.inspection_form_questions
    where id = p_question_id and form_version_id = target.form_version_id
  ) then
    raise exception using errcode = 'P0001', message = 'question_not_in_form';
  end if;
  if char_length(coalesce(p_note, '')) > 2000 then
    raise exception using errcode = 'P0001', message = 'note_too_long';
  end if;

  insert into public.inspection_answers (inspection_id, question_id, answer, note, answered_by)
  values (p_inspection_id, p_question_id, p_answer, coalesce(p_note, ''), (select auth.uid()))
  on conflict (inspection_id, question_id) do update
  set answer = coalesce(excluded.answer, inspection_answers.answer),
    note = excluded.note,
    answered_by = excluded.answered_by;
end;
$$;

create function public.add_inspection_media(
  p_inspection_id uuid,
  p_question_id uuid,
  p_kind public.inspection_media_kind,
  p_path text,
  p_mime_type text,
  p_size_bytes bigint
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inspections;
  media_id uuid;
  existing integer;
  stored_type text;
  stored_size bigint;
begin
  target := private.lock_assigned_inspection(p_inspection_id);
  if target.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'inspection_not_in_progress';
  end if;
  if not exists (
    select 1 from public.inspection_form_questions
    where id = p_question_id and form_version_id = target.form_version_id
  ) then
    raise exception using errcode = 'P0001', message = 'question_not_in_form';
  end if;
  select objects.metadata ->> 'mimetype', (objects.metadata ->> 'size')::bigint
  into stored_type, stored_size
  from storage.objects
  where objects.bucket_id = 'inspection-media'
    and objects.name = p_path
    and p_path like p_inspection_id::text || '/question/%';
  if not found then
    raise exception using errcode = 'P0001', message = 'media_missing';
  end if;
  stored_type := coalesce(stored_type, p_mime_type);
  if stored_type is null
    or (p_kind = 'photo' and stored_type not like 'image/%')
    or (p_kind = 'video' and stored_type not like 'video/%') then
    raise exception using errcode = 'P0001', message = 'media_type_invalid';
  end if;

  select count(*) into existing from public.inspection_media
  where inspection_id = p_inspection_id and question_id = p_question_id and kind = p_kind;
  if (p_kind = 'photo' and existing >= 10) or (p_kind = 'video' and existing >= 3) then
    raise exception using errcode = 'P0001', message = 'media_limit_reached';
  end if;

  insert into public.inspection_media (
    inspection_id, question_id, kind, path, mime_type, size_bytes, created_by
  )
  values (
    p_inspection_id,
    p_question_id,
    p_kind,
    p_path,
    stored_type,
    coalesce(stored_size, p_size_bytes),
    (select auth.uid())
  )
  returning id into media_id;

  return media_id;
end;
$$;

create function public.remove_inspection_media(p_media_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  media public.inspection_media;
  target public.inspections;
begin
  select * into media from public.inspection_media where id = p_media_id;
  if media.id is null then
    raise exception using errcode = 'P0001', message = 'media_missing';
  end if;
  target := private.lock_assigned_inspection(media.inspection_id);
  if target.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'inspection_not_in_progress';
  end if;
  delete from public.inspection_media where id = p_media_id;
  return media.path;
end;
$$;

create function public.inspection_progress(p_inspection_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  target public.inspections;
begin
  select * into target from public.inspections where id = p_inspection_id;
  if target.id is null
    or not (
      target.inspector_id = (select auth.uid())
      or private.has_role('admin')
    ) then
    raise exception using errcode = 'P0001', message = 'inspection_not_found';
  end if;

  return jsonb_build_object(
    'answered', coalesce((select sum(answered) from private.inspection_category_scores(p_inspection_id)), 0),
    'total', coalesce((select sum(total) from private.inspection_category_scores(p_inspection_id)), 0),
    'photos', (select count(*) from public.inspection_media where inspection_id = p_inspection_id and kind = 'photo'),
    'videos', (select count(*) from public.inspection_media where inspection_id = p_inspection_id and kind = 'video'),
    'missing_media', coalesce(private.inspection_missing_media(p_inspection_id), 0),
    'score', private.inspection_total_score(p_inspection_id),
    'categories', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'category_id', scores.category_id,
            'answered', scores.answered,
            'total', scores.total,
            'score', round(scores.score, 1)
          )
        )
        from private.inspection_category_scores(p_inspection_id) as scores
      ),
      '[]'::jsonb
    )
  );
end;
$$;

create function public.submit_inspection(p_inspection_id uuid, p_owner_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.inspections;
begin
  target := private.lock_assigned_inspection(p_inspection_id);
  if target.status <> 'in_progress' then
    raise exception using errcode = 'P0001', message = 'inspection_not_in_progress';
  end if;
  if char_length(btrim(coalesce(p_owner_name, ''))) not between 1 and 120 then
    raise exception using errcode = 'P0001', message = 'owner_name_required';
  end if;
  if exists (
    select 1 from private.inspection_category_scores(p_inspection_id) as scores
    where scores.answered < scores.total
  ) or private.inspection_missing_media(p_inspection_id) > 0 then
    raise exception using errcode = 'P0001', message = 'inspection_incomplete';
  end if;

  update public.inspections
  set status = 'completed',
    submitted_at = now(),
    score = private.inspection_total_score(p_inspection_id),
    category_scores = (
      select jsonb_agg(
        jsonb_build_object(
          'key', scores.key,
          'weight', scores.weight,
          'score', round(scores.score, 1)
        )
      )
      from private.inspection_category_scores(p_inspection_id) as scores
    ),
    completion_confirmed_by = btrim(p_owner_name)
  where id = p_inspection_id;

  insert into public.inspection_events (inspection_id, kind, actor_id, details)
  values (
    p_inspection_id,
    'submitted',
    (select auth.uid()),
    jsonb_build_object('score', (select score from public.inspections where id = p_inspection_id))
  );
end;
$$;

create function public.inspector_workspace(p_inspection_id uuid)
returns table (
  id uuid,
  number integer,
  status public.inspection_status,
  starts_at timestamptz,
  ends_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  score numeric,
  form_version_id uuid,
  consent_version_id uuid,
  address_text text,
  city_name text,
  property_type public.listing_property_type,
  area_m2 numeric,
  floor smallint,
  building_floors smallint,
  year_built smallint,
  access_name text,
  access_phone text,
  inspector_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    inspections.id,
    inspections.number,
    inspections.status,
    inspections.starts_at,
    inspections.ends_at,
    inspections.started_at,
    inspections.submitted_at,
    inspections.score,
    inspections.form_version_id,
    inspections.consent_version_id,
    properties.address_text,
    cities.name,
    properties.property_type,
    properties.area_m2,
    properties.floor,
    properties.building_floors,
    properties.year_built,
    inspections.access_name,
    inspections.access_phone,
    profiles.full_name
  from public.inspections
  join public.properties on properties.id = inspections.property_id
  join public.cities on cities.id = properties.city_id
  left join public.profiles on profiles.id = inspections.inspector_id
  where inspections.id = p_inspection_id
    and inspections.inspector_id = (select auth.uid())
    and private.has_role('inspector')
    and inspections.status <> 'cancelled';
$$;

drop function public.inspector_agenda(timestamptz, timestamptz);

create function public.inspector_agenda(p_from timestamptz, p_to timestamptz)
returns table (
  id uuid,
  number integer,
  status public.inspection_status,
  starts_at timestamptz,
  ends_at timestamptz,
  address_text text,
  city_name text,
  latitude double precision,
  longitude double precision,
  property_type public.listing_property_type,
  area_m2 numeric,
  floor smallint,
  building_floors smallint,
  year_built smallint,
  access_name text,
  access_phone text,
  access_tags text[],
  access_notes text,
  answered_count integer,
  question_count integer,
  submitted_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    inspections.id,
    inspections.number,
    inspections.status,
    inspections.starts_at,
    inspections.ends_at,
    properties.address_text,
    cities.name,
    properties.latitude,
    properties.longitude,
    properties.property_type,
    properties.area_m2,
    properties.floor,
    properties.building_floors,
    properties.year_built,
    inspections.access_name,
    inspections.access_phone,
    inspections.access_tags,
    inspections.access_notes,
    (
      select count(*)::integer from public.inspection_answers
      where inspection_answers.inspection_id = inspections.id and inspection_answers.answer is not null
    ),
    (
      select count(*)::integer from public.inspection_form_questions
      where inspection_form_questions.form_version_id = coalesce(
        inspections.form_version_id,
        (select id from public.inspection_form_versions where status = 'published')
      )
    ),
    inspections.submitted_at
  from public.inspections
  join public.properties on properties.id = inspections.property_id
  join public.cities on cities.id = properties.city_id
  where inspections.inspector_id = (select auth.uid())
    and private.has_role('inspector')
    and inspections.status <> 'cancelled'
    and (
      (inspections.starts_at < p_to and inspections.ends_at > p_from)
      or inspections.status = 'in_progress'
    )
  order by inspections.starts_at;
$$;

create function private.refuse_deactivating_busy_inspector()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.is_active and not new.is_active and exists (
    select 1 from public.inspections
    where inspections.inspector_id = new.user_id and inspections.status = 'in_progress'
  ) then
    raise exception using errcode = 'P0001', message = 'inspector_has_open_inspection';
  end if;
  return new;
end;
$$;

create trigger inspector_profiles_refuse_deactivating_busy_inspector
  before update of is_active on public.inspector_profiles
  for each row execute function private.refuse_deactivating_busy_inspector();

revoke execute on function
  private.refuse_deactivating_busy_inspector(),
  private.lock_assigned_inspection(uuid),
  private.inspection_category_scores(uuid),
  private.inspection_total_score(uuid),
  private.inspection_missing_media(uuid)
  from public, anon, authenticated;

revoke execute on function
  public.start_inspection(uuid, text, text, text, uuid[], double precision, double precision),
  public.save_inspection_answer(uuid, uuid, public.inspection_answer, text),
  public.add_inspection_media(uuid, uuid, public.inspection_media_kind, text, text, bigint),
  public.remove_inspection_media(uuid),
  public.inspection_progress(uuid),
  public.submit_inspection(uuid, text),
  public.inspector_workspace(uuid),
  public.inspector_agenda(timestamptz, timestamptz)
  from public, anon;

grant execute on function
  public.start_inspection(uuid, text, text, text, uuid[], double precision, double precision),
  public.save_inspection_answer(uuid, uuid, public.inspection_answer, text),
  public.add_inspection_media(uuid, uuid, public.inspection_media_kind, text, text, bigint),
  public.remove_inspection_media(uuid),
  public.inspection_progress(uuid),
  public.submit_inspection(uuid, text),
  public.inspector_workspace(uuid),
  public.inspector_agenda(timestamptz, timestamptz)
  to authenticated;
