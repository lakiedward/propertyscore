create index listings_public_map_idx
  on public.listings (transaction, latitude, longitude)
  where status = 'approved';
