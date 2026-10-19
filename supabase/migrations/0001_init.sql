-- OI Coach schema. All access goes through the Next.js server with the secret key,
-- so RLS is enabled with no policies (the publishable key can read nothing).

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  contest_name text,
  contest_date date,
  created_at timestamptz not null default now()
);

create table invites (
  code text primary key,
  created_by uuid references profiles on delete set null,
  used_by uuid references profiles on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

-- One row per problem; id is the Luogu pid (P1001, CF1A, AT_abc300_a ...).
create table problems (
  id text primary key,
  url text not null,
  title text,
  statement text,
  samples jsonb not null default '[]',
  time_limit int,
  memory_limit int,
  solution text,
  code text,
  blanks jsonb,
  key_points jsonb,
  ideas jsonb not null default '[]',
  brief text,
  stage text not null default 'new' check (stage in ('new', 'fetched', 'solved', 'ready')),
  created_by uuid references profiles on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index problems_ideas_idx on problems using gin (ideas jsonb_path_ops);

create table lists (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles on delete cascade,
  name text not null,
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'assigned')),
  due_date date,
  created_at timestamptz not null default now()
);

create table list_items (
  list_id uuid not null references lists on delete cascade,
  problem_id text not null references problems on delete cascade,
  position int not null,
  primary key (list_id, problem_id)
);

-- assigned = picked by the owner; otherwise the user saved a shared list by opening its link.
create table list_members (
  list_id uuid not null references lists on delete cascade,
  user_id uuid not null references profiles on delete cascade,
  assigned boolean not null default false,
  primary key (list_id, user_id)
);

create table attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  problem_id text not null references problems on delete cascade,
  list_id uuid references lists on delete set null,
  status text not null default 'active' check (status in ('active', 'done')),
  messages jsonb not null default '[]',
  found jsonb not null default '{}',
  hinted jsonb not null default '[]',
  hints_left int not null default 3,
  verdicts jsonb not null default '[]',
  rating text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index attempts_user_idx on attempts (user_id, updated_at desc);
create index attempts_problem_idx on attempts (problem_id);

create table trap_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  problem_id text not null references problems on delete cascade,
  point_id text not null,
  type text not null,
  name text not null,
  detail text not null,
  reason text not null check (reason in ('missed', 'hinted')),
  created_at timestamptz not null default now(),
  unique (user_id, problem_id, point_id)
);

create table recall_items (
  user_id uuid not null references profiles on delete cascade,
  problem_id text not null references problems on delete cascade,
  point_id text not null,
  stage int not null default 0,
  due_on date,
  created_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

create table idea_details (
  slug text primary key,
  intro jsonb not null,
  template text not null,
  traps jsonb not null,
  created_at timestamptz not null default now()
);

create table idea_summaries (
  user_id uuid not null references profiles on delete cascade,
  slug text not null,
  text text not null,
  feedback jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create table templates (
  user_id uuid not null references profiles on delete cascade,
  slug text not null,
  halflife real not null default 1,
  reviews int not null default 0,
  last_score int,
  last_reviewed_at timestamptz not null default now(),
  primary key (user_id, slug)
);

create table review_log (
  id bigserial primary key,
  user_id uuid not null references profiles on delete cascade,
  kind text not null check (kind in ('identify', 'recall', 'template')),
  ref text not null,
  correct boolean not null,
  at timestamptz not null default now()
);
create index review_log_user_idx on review_log (user_id, at desc);

alter table profiles enable row level security;
alter table invites enable row level security;
alter table problems enable row level security;
alter table lists enable row level security;
alter table list_items enable row level security;
alter table list_members enable row level security;
alter table attempts enable row level security;
alter table trap_cards enable row level security;
alter table recall_items enable row level security;
alter table idea_details enable row level security;
alter table idea_summaries enable row level security;
alter table templates enable row level security;
alter table review_log enable row level security;

-- New tables aren't exposed automatically on this project; only the server's role gets access.
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
