create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 3 and 80),
  email        text not null check (char_length(email) <= 254 and email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  reason       text not null check (reason in ('profissional', 'freelance', 'outro')),
  subject      text check (subject is null or char_length(subject) between 5 and 100),
  message      text not null check (char_length(message) between 30 and 1000),
  ip           text,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  email_error  text
);

create index if not exists contact_messages_created_at_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_ip_created_at_idx on public.contact_messages (ip, created_at desc);

alter table public.contact_messages enable row level security;
revoke all on table public.contact_messages from anon, authenticated;
