create type public.form_version_status as enum ('draft', 'published', 'archived');

create type public.inspection_required_media as enum ('photo', 'video', 'none');

create table public.inspection_form_versions (
  id uuid primary key default gen_random_uuid(),
  version integer not null unique check (version > 0),
  status public.form_version_status not null default 'draft',
  points_good numeric(4, 2) not null default 10,
  points_acceptable numeric(4, 2) not null default 6.5,
  points_problem numeric(4, 2) not null default 3,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_form_versions_points_check check (
    points_good between 0 and 10
    and points_acceptable between 0 and 10
    and points_problem between 0 and 10
    and points_good >= points_acceptable
    and points_acceptable >= points_problem
  ),
  constraint inspection_form_versions_published_check check (
    status = 'draft' or published_at is not null
  )
);

create unique index inspection_form_versions_one_draft_idx
  on public.inspection_form_versions (status) where status = 'draft';
create unique index inspection_form_versions_one_published_idx
  on public.inspection_form_versions (status) where status = 'published';
create index inspection_form_versions_published_by_idx on public.inspection_form_versions (published_by);
create index inspection_form_versions_created_by_idx on public.inspection_form_versions (created_by);

create trigger inspection_form_versions_set_updated_at
  before update on public.inspection_form_versions
  for each row execute function private.set_updated_at();

create table public.inspection_form_categories (
  id uuid primary key default gen_random_uuid(),
  form_version_id uuid not null references public.inspection_form_versions (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_-]{1,40}$'),
  position smallint not null check (position >= 0),
  name_ro text not null check (char_length(btrim(name_ro)) between 1 and 60),
  name_en text not null default '' check (char_length(name_en) <= 60),
  icon text not null default 'clipboard-check' check (
    icon in (
      'building-2', 'droplets', 'zap', 'droplet', 'flame', 'door-open', 'thermometer',
      'paintbrush', 'users', 'file-text', 'shield', 'house', 'wrench', 'plug', 'wind', 'sun',
      'trees', 'car', 'key-round', 'clipboard-check'
    )
  ),
  weight smallint not null default 0 check (weight between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_form_categories_key_unique unique (form_version_id, key),
  constraint inspection_form_categories_position_unique unique (form_version_id, position)
    deferrable initially immediate
);

create trigger inspection_form_categories_set_updated_at
  before update on public.inspection_form_categories
  for each row execute function private.set_updated_at();

create table public.inspection_form_questions (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.inspection_form_categories (id) on delete cascade,
  form_version_id uuid not null references public.inspection_form_versions (id) on delete cascade,
  key text not null check (key ~ '^[a-z0-9_-]{1,40}$'),
  position smallint not null check (position >= 0),
  text_ro text not null default '' check (char_length(text_ro) <= 300),
  text_en text not null default '' check (char_length(text_en) <= 300),
  required_media public.inspection_required_media not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspection_form_questions_key_unique unique (form_version_id, key),
  constraint inspection_form_questions_position_unique unique (category_id, position)
    deferrable initially immediate
);

create index inspection_form_questions_form_version_id_idx
  on public.inspection_form_questions (form_version_id);

create trigger inspection_form_questions_set_updated_at
  before update on public.inspection_form_questions
  for each row execute function private.set_updated_at();

create table public.consent_versions (
  id uuid primary key default gen_random_uuid(),
  version numeric(4, 1) not null unique check (version > 0),
  status public.form_version_status not null default 'draft',
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_versions_published_check check (status = 'draft' or published_at is not null)
);

create unique index consent_versions_one_draft_idx
  on public.consent_versions (status) where status = 'draft';
create unique index consent_versions_one_published_idx
  on public.consent_versions (status) where status = 'published';
create index consent_versions_published_by_idx on public.consent_versions (published_by);
create index consent_versions_created_by_idx on public.consent_versions (created_by);

create trigger consent_versions_set_updated_at
  before update on public.consent_versions
  for each row execute function private.set_updated_at();

create table public.consent_sections (
  id uuid primary key default gen_random_uuid(),
  consent_version_id uuid not null references public.consent_versions (id) on delete cascade,
  position smallint not null check (position >= 0),
  title_ro text not null default '' check (char_length(title_ro) <= 120),
  title_en text not null default '' check (char_length(title_en) <= 120),
  text_ro text not null default '' check (char_length(text_ro) <= 3000),
  text_en text not null default '' check (char_length(text_en) <= 3000),
  check_ro text not null default '' check (char_length(check_ro) <= 200),
  check_en text not null default '' check (char_length(check_en) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consent_sections_position_unique unique (consent_version_id, position)
    deferrable initially immediate
);

create trigger consent_sections_set_updated_at
  before update on public.consent_sections
  for each row execute function private.set_updated_at();

create function private.form_version_is_draft(p_form_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.inspection_form_versions
    where inspection_form_versions.id = p_form_version_id
      and inspection_form_versions.status = 'draft'
  );
$$;

create function private.consent_version_is_draft(p_consent_version_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.consent_versions
    where consent_versions.id = p_consent_version_id
      and consent_versions.status = 'draft'
  );
$$;

create function private.refuse_published_form_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid := case when tg_op = 'DELETE' then old.form_version_id else new.form_version_id end;
begin
  if current_setting('app.form_publish_switch', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if not private.form_version_is_draft(version_id)
    or (tg_op = 'UPDATE' and old.form_version_id <> new.form_version_id) then
    raise exception using errcode = 'P0001', message = 'form_not_draft';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger inspection_form_categories_refuse_published_change
  before insert or update or delete on public.inspection_form_categories
  for each row execute function private.refuse_published_form_change();

create trigger inspection_form_questions_refuse_published_change
  before insert or update or delete on public.inspection_form_questions
  for each row execute function private.refuse_published_form_change();

create function private.set_question_form_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select inspection_form_categories.form_version_id into new.form_version_id
  from public.inspection_form_categories
  where inspection_form_categories.id = new.category_id;
  return new;
end;
$$;

create trigger inspection_form_questions_assign_form_version
  before insert or update of category_id on public.inspection_form_questions
  for each row execute function private.set_question_form_version();

create function private.refuse_published_consent_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid := case when tg_op = 'DELETE' then old.consent_version_id else new.consent_version_id end;
begin
  if current_setting('app.form_publish_switch', true) = 'on' then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if not private.consent_version_is_draft(version_id)
    or (tg_op = 'UPDATE' and old.consent_version_id <> new.consent_version_id) then
    raise exception using errcode = 'P0001', message = 'consent_not_draft';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger consent_sections_refuse_published_change
  before insert or update or delete on public.consent_sections
  for each row execute function private.refuse_published_consent_change();

alter table public.inspection_form_versions enable row level security;
alter table public.inspection_form_categories enable row level security;
alter table public.inspection_form_questions enable row level security;
alter table public.consent_versions enable row level security;
alter table public.consent_sections enable row level security;

revoke all on public.inspection_form_versions, public.inspection_form_categories,
  public.inspection_form_questions, public.consent_versions, public.consent_sections
  from anon, authenticated;

grant select on public.inspection_form_versions, public.inspection_form_categories,
  public.inspection_form_questions, public.consent_versions, public.consent_sections
  to authenticated;

grant update (name_ro, name_en, icon, weight) on public.inspection_form_categories to authenticated;
grant update (text_ro, text_en, required_media) on public.inspection_form_questions to authenticated;
grant update (title_ro, title_en, text_ro, text_en, check_ro, check_en)
  on public.consent_sections to authenticated;
grant update (points_good, points_acceptable, points_problem)
  on public.inspection_form_versions to authenticated;

create policy "Admins read every form version and inspectors read the published and archived ones"
  on public.inspection_form_versions for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or (
      coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
      and status <> 'draft'
    )
  );

create policy "Admins can change the points of the draft form"
  on public.inspection_form_versions for update to authenticated
  using (coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false) and status = 'draft')
  with check (coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false) and status = 'draft');

create policy "Form categories are readable by whoever can read their version"
  on public.inspection_form_categories for select to authenticated
  using (
    exists (
      select 1 from public.inspection_form_versions
      where inspection_form_versions.id = inspection_form_categories.form_version_id
    )
  );

create policy "Admins can edit the categories of the draft form"
  on public.inspection_form_categories for update to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    and exists (
      select 1 from public.inspection_form_versions
      where inspection_form_versions.id = inspection_form_categories.form_version_id
        and inspection_form_versions.status = 'draft'
    )
  )
  with check (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    and exists (
      select 1 from public.inspection_form_versions
      where inspection_form_versions.id = inspection_form_categories.form_version_id
        and inspection_form_versions.status = 'draft'
    )
  );

create policy "Form questions are readable by whoever can read their version"
  on public.inspection_form_questions for select to authenticated
  using (
    exists (
      select 1 from public.inspection_form_versions
      where inspection_form_versions.id = inspection_form_questions.form_version_id
    )
  );

create policy "Admins can edit the questions of the draft form"
  on public.inspection_form_questions for update to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    and exists (
      select 1 from public.inspection_form_versions
      where inspection_form_versions.id = inspection_form_questions.form_version_id
        and inspection_form_versions.status = 'draft'
    )
  )
  with check (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    and exists (
      select 1 from public.inspection_form_versions
      where inspection_form_versions.id = inspection_form_questions.form_version_id
        and inspection_form_versions.status = 'draft'
    )
  );

create policy "Admins read every consent version and inspectors read the published and archived ones"
  on public.consent_versions for select to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    or (
      coalesce(((select auth.jwt()) -> 'user_roles') ? 'inspector', false)
      and status <> 'draft'
    )
  );

create policy "Consent sections are readable by whoever can read their version"
  on public.consent_sections for select to authenticated
  using (
    exists (
      select 1 from public.consent_versions
      where consent_versions.id = consent_sections.consent_version_id
    )
  );

create policy "Admins can edit the sections of the draft consent"
  on public.consent_sections for update to authenticated
  using (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    and exists (
      select 1 from public.consent_versions
      where consent_versions.id = consent_sections.consent_version_id
        and consent_versions.status = 'draft'
    )
  )
  with check (
    coalesce(((select auth.jwt()) -> 'user_roles') ? 'admin', false)
    and exists (
      select 1 from public.consent_versions
      where consent_versions.id = consent_sections.consent_version_id
        and consent_versions.status = 'draft'
    )
  );

create function private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not private.has_role('admin') then
    raise exception using errcode = '42501', message = 'forbidden';
  end if;
end;
$$;

create function private.lock_form_draft(p_form_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.inspection_form_versions
  where inspection_form_versions.id = p_form_version_id
    and inspection_form_versions.status = 'draft'
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'form_not_draft';
  end if;
end;
$$;

create function private.renumber_form(p_form_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  set constraints public.inspection_form_categories_position_unique, public.inspection_form_questions_position_unique
    deferred;

  update public.inspection_form_categories as category
  set position = ordered.new_position
  from (
    select id, (row_number() over (order by position, created_at) - 1)::smallint as new_position
    from public.inspection_form_categories
    where form_version_id = p_form_version_id
  ) as ordered
  where category.id = ordered.id and category.position <> ordered.new_position;

  update public.inspection_form_questions as question
  set position = ordered.new_position
  from (
    select id,
      (row_number() over (partition by category_id order by position, created_at) - 1)::smallint
        as new_position
    from public.inspection_form_questions
    where form_version_id = p_form_version_id
  ) as ordered
  where question.id = ordered.id and question.position <> ordered.new_position;
end;
$$;

create function public.create_inspection_form_draft()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.inspection_form_versions;
  draft_id uuid;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));

  if exists (select 1 from public.inspection_form_versions where status = 'draft') then
    raise exception using errcode = 'P0001', message = 'form_draft_exists';
  end if;

  select * into published from public.inspection_form_versions where status = 'published';

  insert into public.inspection_form_versions (
    version, points_good, points_acceptable, points_problem, created_by
  )
  values (
    coalesce((select max(version) from public.inspection_form_versions), 0) + 1,
    coalesce(published.points_good, 10),
    coalesce(published.points_acceptable, 6.5),
    coalesce(published.points_problem, 3),
    (select auth.uid())
  )
  returning id into draft_id;

  if published.id is not null then
    with copied as (
      insert into public.inspection_form_categories (
        form_version_id, key, position, name_ro, name_en, icon, weight
      )
      select draft_id, key, position, name_ro, name_en, icon, weight
      from public.inspection_form_categories
      where form_version_id = published.id
      returning id, key
    )
    insert into public.inspection_form_questions (
      category_id, form_version_id, key, position, text_ro, text_en, required_media
    )
    select copied.id, draft_id, question.key, question.position, question.text_ro,
      question.text_en, question.required_media
    from public.inspection_form_questions as question
    join public.inspection_form_categories as source
      on source.id = question.category_id
    join copied on copied.key = source.key
    where question.form_version_id = published.id;
  end if;

  return draft_id;
end;
$$;

create function public.discard_inspection_form_draft(p_form_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  perform private.lock_form_draft(p_form_version_id);
  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.inspection_form_versions where id = p_form_version_id;
  perform set_config('app.form_publish_switch', 'off', true);
end;
$$;

create function public.add_inspection_form_category(
  p_form_version_id uuid,
  p_name_ro text,
  p_name_en text,
  p_icon text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_id uuid;
begin
  perform private.require_admin();
  perform private.lock_form_draft(p_form_version_id);

  insert into public.inspection_form_categories (
    form_version_id, key, position, name_ro, name_en, icon, weight
  )
  values (
    p_form_version_id,
    'c-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    coalesce(
      (select max(position) + 1 from public.inspection_form_categories
       where form_version_id = p_form_version_id),
      0
    ),
    btrim(coalesce(p_name_ro, '')),
    btrim(coalesce(p_name_en, '')),
    coalesce(p_icon, 'clipboard-check'),
    0
  )
  returning id into category_id;

  return category_id;
exception
  when check_violation then
    raise exception using errcode = 'P0001', message = 'form_item_invalid';
end;
$$;

create function public.remove_inspection_form_category(p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
begin
  perform private.require_admin();
  select form_version_id into version_id
  from public.inspection_form_categories where id = p_category_id;
  if version_id is null then
    raise exception using errcode = 'P0001', message = 'form_item_not_found';
  end if;
  perform private.lock_form_draft(version_id);
  delete from public.inspection_form_categories where id = p_category_id;
  perform private.renumber_form(version_id);
end;
$$;

create function public.add_inspection_form_question(
  p_category_id uuid,
  p_text_ro text,
  p_text_en text,
  p_required_media public.inspection_required_media
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  question_id uuid;
begin
  perform private.require_admin();
  select form_version_id into version_id
  from public.inspection_form_categories where id = p_category_id;
  if version_id is null then
    raise exception using errcode = 'P0001', message = 'form_item_not_found';
  end if;
  perform private.lock_form_draft(version_id);

  insert into public.inspection_form_questions (
    category_id, key, position, text_ro, text_en, required_media
  )
  values (
    p_category_id,
    'q-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
    coalesce(
      (select max(position) + 1 from public.inspection_form_questions
       where category_id = p_category_id),
      0
    ),
    btrim(coalesce(p_text_ro, '')),
    btrim(coalesce(p_text_en, '')),
    coalesce(p_required_media, 'none')
  )
  returning id into question_id;

  return question_id;
exception
  when check_violation then
    raise exception using errcode = 'P0001', message = 'form_item_invalid';
end;
$$;

create function public.remove_inspection_form_question(p_question_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
begin
  perform private.require_admin();
  select form_version_id into version_id
  from public.inspection_form_questions where id = p_question_id;
  if version_id is null then
    raise exception using errcode = 'P0001', message = 'form_item_not_found';
  end if;
  perform private.lock_form_draft(version_id);
  delete from public.inspection_form_questions where id = p_question_id;
  perform private.renumber_form(version_id);
end;
$$;

create function public.reorder_inspection_form_categories(
  p_form_version_id uuid,
  p_category_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  perform private.lock_form_draft(p_form_version_id);

  if (
    select coalesce(array_agg(id order by id), '{}')
    from public.inspection_form_categories where form_version_id = p_form_version_id
  ) is distinct from (
    select coalesce(array_agg(id order by id), '{}') from unnest(p_category_ids) as id
  ) then
    raise exception using errcode = 'P0001', message = 'form_items_changed';
  end if;

  set constraints public.inspection_form_categories_position_unique deferred;
  update public.inspection_form_categories as category
  set position = (ordered.ordinality - 1)::smallint
  from unnest(p_category_ids) with ordinality as ordered (id, ordinality)
  where category.id = ordered.id;
end;
$$;

create function public.reorder_inspection_form_questions(
  p_category_id uuid,
  p_question_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
begin
  perform private.require_admin();
  select form_version_id into version_id
  from public.inspection_form_categories where id = p_category_id;
  if version_id is null then
    raise exception using errcode = 'P0001', message = 'form_item_not_found';
  end if;
  perform private.lock_form_draft(version_id);

  if (
    select coalesce(array_agg(id order by id), '{}')
    from public.inspection_form_questions where category_id = p_category_id
  ) is distinct from (
    select coalesce(array_agg(id order by id), '{}') from unnest(p_question_ids) as id
  ) then
    raise exception using errcode = 'P0001', message = 'form_items_changed';
  end if;

  set constraints public.inspection_form_questions_position_unique deferred;
  update public.inspection_form_questions as question
  set position = (ordered.ordinality - 1)::smallint
  from unnest(p_question_ids) with ordinality as ordered (id, ordinality)
  where question.id = ordered.id;
end;
$$;

create function public.move_inspection_form_question(p_question_id uuid, p_category_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
  target_version_id uuid;
begin
  perform private.require_admin();
  select form_version_id into version_id
  from public.inspection_form_questions where id = p_question_id;
  select form_version_id into target_version_id
  from public.inspection_form_categories where id = p_category_id;
  if version_id is null or target_version_id is null or version_id <> target_version_id then
    raise exception using errcode = 'P0001', message = 'form_item_not_found';
  end if;
  perform private.lock_form_draft(version_id);

  set constraints public.inspection_form_questions_position_unique deferred;
  update public.inspection_form_questions
  set category_id = p_category_id,
    position = coalesce(
      (select max(position) + 1 from public.inspection_form_questions
       where category_id = p_category_id),
      0
    )
  where id = p_question_id;
  perform private.renumber_form(version_id);
end;
$$;

create function public.publish_inspection_form(p_form_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('inspection_form_versions'));
  perform private.lock_form_draft(p_form_version_id);

  if not exists (
    select 1 from public.inspection_form_categories where form_version_id = p_form_version_id
  ) then
    raise exception using errcode = 'P0001', message = 'form_category_empty';
  end if;
  if (
    select sum(weight) from public.inspection_form_categories
    where form_version_id = p_form_version_id
  ) <> 100 then
    raise exception using errcode = 'P0001', message = 'form_weights_invalid';
  end if;
  if exists (
    select 1 from public.inspection_form_categories as category
    where category.form_version_id = p_form_version_id
      and not exists (
        select 1 from public.inspection_form_questions
        where inspection_form_questions.category_id = category.id
      )
  ) then
    raise exception using errcode = 'P0001', message = 'form_category_empty';
  end if;
  if exists (
    select 1 from public.inspection_form_questions
    where form_version_id = p_form_version_id and btrim(text_ro) = ''
  ) then
    raise exception using errcode = 'P0001', message = 'form_question_empty';
  end if;
  if exists (
    select 1 from public.inspection_form_categories
    where form_version_id = p_form_version_id and btrim(name_en) = ''
  ) or exists (
    select 1 from public.inspection_form_questions
    where form_version_id = p_form_version_id and btrim(text_en) = ''
  ) then
    raise exception using errcode = 'P0001', message = 'form_translation_missing';
  end if;

  update public.inspection_form_versions
  set status = 'archived', archived_at = now()
  where status = 'published';

  update public.inspection_form_versions
  set status = 'published', published_at = now(), published_by = (select auth.uid())
  where id = p_form_version_id;
end;
$$;

create function private.lock_consent_draft(p_consent_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from public.consent_versions
  where consent_versions.id = p_consent_version_id and consent_versions.status = 'draft'
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'consent_not_draft';
  end if;
end;
$$;

create function private.renumber_consent(p_consent_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  set constraints public.consent_sections_position_unique deferred;
  update public.consent_sections as section
  set position = ordered.new_position
  from (
    select id, (row_number() over (order by position, created_at) - 1)::smallint as new_position
    from public.consent_sections
    where consent_version_id = p_consent_version_id
  ) as ordered
  where section.id = ordered.id and section.position <> ordered.new_position;
end;
$$;

create function public.create_consent_draft()
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  published public.consent_versions;
  draft_id uuid;
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('consent_versions'));

  if exists (select 1 from public.consent_versions where status = 'draft') then
    raise exception using errcode = 'P0001', message = 'consent_draft_exists';
  end if;

  select * into published from public.consent_versions where status = 'published';

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
  where consent_version_id = published.id;

  return draft_id;
end;
$$;

create function public.discard_consent_draft(p_consent_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  perform private.lock_consent_draft(p_consent_version_id);
  perform set_config('app.form_publish_switch', 'on', true);
  delete from public.consent_versions where id = p_consent_version_id;
  perform set_config('app.form_publish_switch', 'off', true);
end;
$$;

create function public.add_consent_section(p_consent_version_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  section_id uuid;
begin
  perform private.require_admin();
  perform private.lock_consent_draft(p_consent_version_id);

  insert into public.consent_sections (consent_version_id, position)
  values (
    p_consent_version_id,
    coalesce(
      (select max(position) + 1 from public.consent_sections
       where consent_version_id = p_consent_version_id),
      0
    )
  )
  returning id into section_id;

  return section_id;
end;
$$;

create function public.remove_consent_section(p_section_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  version_id uuid;
begin
  perform private.require_admin();
  select consent_version_id into version_id from public.consent_sections where id = p_section_id;
  if version_id is null then
    raise exception using errcode = 'P0001', message = 'consent_item_not_found';
  end if;
  perform private.lock_consent_draft(version_id);
  delete from public.consent_sections where id = p_section_id;
  perform private.renumber_consent(version_id);
end;
$$;

create function public.publish_consent_version(p_consent_version_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_admin();
  perform pg_advisory_xact_lock(hashtext('consent_versions'));
  perform private.lock_consent_draft(p_consent_version_id);

  if not exists (
    select 1 from public.consent_sections where consent_version_id = p_consent_version_id
  ) then
    raise exception using errcode = 'P0001', message = 'consent_empty';
  end if;
  if exists (
    select 1 from public.consent_sections
    where consent_version_id = p_consent_version_id
      and (
        btrim(title_ro) = '' or btrim(text_ro) = '' or btrim(check_ro) = ''
        or btrim(title_en) = '' or btrim(text_en) = '' or btrim(check_en) = ''
      )
  ) then
    raise exception using errcode = 'P0001', message = 'consent_translation_missing';
  end if;

  update public.consent_versions
  set status = 'archived', archived_at = now()
  where status = 'published';

  update public.consent_versions
  set status = 'published', published_at = now(), published_by = (select auth.uid())
  where id = p_consent_version_id;
end;
$$;

revoke execute on function
  private.form_version_is_draft(uuid),
  private.consent_version_is_draft(uuid),
  private.require_admin(),
  private.lock_form_draft(uuid),
  private.renumber_form(uuid),
  private.lock_consent_draft(uuid),
  private.renumber_consent(uuid),
  private.set_question_form_version(),
  private.refuse_published_form_change(),
  private.refuse_published_consent_change()
  from public, anon, authenticated;


revoke execute on function
  public.create_inspection_form_draft(),
  public.discard_inspection_form_draft(uuid),
  public.add_inspection_form_category(uuid, text, text, text),
  public.remove_inspection_form_category(uuid),
  public.add_inspection_form_question(uuid, text, text, public.inspection_required_media),
  public.remove_inspection_form_question(uuid),
  public.reorder_inspection_form_categories(uuid, uuid[]),
  public.reorder_inspection_form_questions(uuid, uuid[]),
  public.move_inspection_form_question(uuid, uuid),
  public.publish_inspection_form(uuid),
  public.create_consent_draft(),
  public.discard_consent_draft(uuid),
  public.add_consent_section(uuid),
  public.remove_consent_section(uuid),
  public.publish_consent_version(uuid)
  from public, anon;

grant execute on function
  public.create_inspection_form_draft(),
  public.discard_inspection_form_draft(uuid),
  public.add_inspection_form_category(uuid, text, text, text),
  public.remove_inspection_form_category(uuid),
  public.add_inspection_form_question(uuid, text, text, public.inspection_required_media),
  public.remove_inspection_form_question(uuid),
  public.reorder_inspection_form_categories(uuid, uuid[]),
  public.reorder_inspection_form_questions(uuid, uuid[]),
  public.move_inspection_form_question(uuid, uuid),
  public.publish_inspection_form(uuid),
  public.create_consent_draft(),
  public.discard_consent_draft(uuid),
  public.add_consent_section(uuid),
  public.remove_consent_section(uuid),
  public.publish_consent_version(uuid)
  to authenticated;
