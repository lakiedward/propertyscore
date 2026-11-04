insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'source-extracts',
  'source-extracts',
  false,
  1073741824,
  array['application/octet-stream']
);
