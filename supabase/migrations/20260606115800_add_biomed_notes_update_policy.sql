drop policy if exists biomed_notes_anon_update on public.biomed_notes;

create policy biomed_notes_anon_update
on public.biomed_notes
for update
to anon, authenticated
using (true)
with check (
  length(coalesce(text, '')) between 1 and 4000
  and length(coalesce(page, '')) between 1 and 200
  and length(coalesce(author, '')) < 60
  and kind in ('note', 'question', 'answer')
  and status in ('open', 'resolved')
);
