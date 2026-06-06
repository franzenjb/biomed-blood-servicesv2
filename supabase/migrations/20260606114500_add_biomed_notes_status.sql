alter table public.biomed_notes
  add column if not exists status text not null default 'open';

alter table public.biomed_notes
  add constraint biomed_notes_status_check
  check (status in ('open', 'resolved'))
  not valid;

alter table public.biomed_notes
  validate constraint biomed_notes_status_check;
