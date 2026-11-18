alter type public.listing_status rename value 'published' to 'approved';
alter type public.listing_status add value 'pending_approval' after 'draft';
alter type public.listing_status add value 'rejected' after 'approved';
alter type public.listing_status add value 'blocked' after 'rejected';
