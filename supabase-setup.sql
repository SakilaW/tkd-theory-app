create table if not exists public.tkd_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  quiz_summary jsonb not null default '{"quizzes":0,"best":0,"last":null}'::jsonb,
  question_stats jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.tkd_progress enable row level security;

revoke all on public.tkd_progress from anon;
grant select, insert, update on public.tkd_progress to authenticated;

drop policy if exists "Users manage their own TKD progress" on public.tkd_progress;
create policy "Users manage their own TKD progress"
  on public.tkd_progress
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
