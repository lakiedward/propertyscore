update public.scoring_versions
set is_active = false
where kind = 'online' and label = 'v2' and is_active;

insert into public.scoring_versions (kind, label, weights, params, is_active, activated_at, created_by)
select
  'online',
  'v3',
  v.weights,
  jsonb_set(
    v.params,
    '{noise}',
    v.params -> 'noise' || '{"scale_lden": [45, 75], "scale_lnight": [37, 65]}'::jsonb
  ),
  true,
  now(),
  null
from public.scoring_versions v
where v.kind = 'online' and v.label = 'v2';
