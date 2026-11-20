-- Private storage for the site owner's OpenAI key.
-- The key is only read by the admin-ai Edge Function using the service-role key.
create table if not exists public.admin_ai_secrets (
  id integer primary key check (id = 1),
  api_key text not null,
  updated_at timestamptz not null default now()
);

alter table public.admin_ai_secrets enable row level security;
revoke all on table public.admin_ai_secrets from anon, authenticated;
grant all on table public.admin_ai_secrets to service_role;
