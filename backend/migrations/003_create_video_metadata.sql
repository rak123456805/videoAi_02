-- Migration 003: video_metadata table
create table if not exists public.video_metadata (
  id               uuid primary key default gen_random_uuid(),
  session_id       uuid references public.sessions(id) on delete cascade,
  video_id         text not null,        -- "A", "B", "C"…
  url              text not null,
  platform         text not null,        -- youtube | instagram | twitter | tiktok
  title            text,
  creator          text,
  follower_count   bigint default 0,
  views            bigint default 0,
  likes            bigint default 0,
  comments         bigint default 0,
  engagement_rate  numeric(10, 4) default 0,
  hashtags         text[] default '{}',
  upload_date      date,
  duration_seconds int default 0,
  thumbnail_url    text,
  transcript_ready boolean default false,
  created_at       timestamptz not null default now()
);

alter table public.video_metadata enable row level security;

create policy "Users can manage their video metadata"
  on public.video_metadata
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

-- Unique constraint: one entry per video per session
create unique index if not exists idx_video_metadata_unique
  on public.video_metadata(session_id, video_id);

create index if not exists idx_video_metadata_session_id
  on public.video_metadata(session_id);
