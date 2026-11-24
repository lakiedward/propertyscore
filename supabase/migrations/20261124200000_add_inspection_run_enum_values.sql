alter type public.inspection_status add value if not exists 'in_progress' before 'completed';

alter type public.inspection_event_kind add value if not exists 'started';

alter type public.inspection_event_kind add value if not exists 'submitted';
