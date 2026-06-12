-- Migration 002: messages table
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.sessions(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant', 'system')),
  content     text not null,
  citations   jsonb default '[]'::jsonb,
  created_at  timestamptz not null default now()
);

-- RLS (inherit via session ownership)
alter table public.messages enable row level security;

create policy "Users can manage messages in their sessions"
  on public.messages
  for all
  using (
    auth.uid() = (
      select user_id from public.sessions where id = session_id
    )
  )
  with check (
    auth.uid() = (
      select user_id from public.sessions where id = session_id
    )
  );

-- Indexes
create index if not exists idx_messages_session_id on public.messages(session_id);
create index if not exists idx_messages_created_at on public.messages(created_at);
