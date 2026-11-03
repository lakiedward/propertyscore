update public.scoring_versions
set params = jsonb_set(params, '{education,register,plan_url}', 'null'::jsonb)
where kind = 'online' and label = 'v1';
