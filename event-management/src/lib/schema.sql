-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Manages User Roles)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  display_name text,
  role text check (role in ('admin', 'employee')) default 'employee',
  is_password_changed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EVENTS
create table public.events (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  venue_name text,
  address text,
  purpose text,
  capacity integer,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SUB EVENTS (e.g. Sessions, After-party)
create table public.sub_events (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  name text not null,
  start_time timestamp with time zone,
  end_time timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ATTENDEES
create table public.attendees (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  name text not null,
  email text,
  company text,
  ticket_type text,
  status text,
  category text check (category in ('general', 'vip')) default 'general',
  notes text,
  registered_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CHECKINS
create table public.checkins (
  id uuid default uuid_generate_v4() primary key,
  attendee_id uuid references public.attendees(id) on delete cascade not null,
  event_id uuid references public.events(id) on delete cascade not null,
  processed_by uuid references public.profiles(id),
  checked_in_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(attendee_id) -- Prevent double check-in
);

-- EVENT MATERIALS
create table public.event_materials (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  title text not null,
  url text not null,
  type text check (type in ('file', 'link')) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SURVEYS
create table public.surveys (
  id uuid default uuid_generate_v4() primary key,
  event_id uuid references public.events(id) on delete cascade not null,
  question_text text not null,
  type text check (type in ('text', 'rating', 'multiple_choice')) not null,
  options jsonb, -- For multiple choice options
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SURVEY ANSWERS
create table public.survey_answers (
  id uuid default uuid_generate_v4() primary key,
  survey_id uuid references public.surveys(id) on delete cascade not null,
  attendee_id uuid references public.attendees(id) on delete cascade, -- Optional if anonymous
  answer_text text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SECURITY POLICIES (RLS)
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.sub_events enable row level security;
alter table public.attendees enable row level security;
alter table public.checkins enable row level security;
alter table public.event_materials enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_answers enable row level security;

-- Policies (Simplified for MVP)
-- Allow read for everyone authenticated (or specific logic based on role)
-- Admin: All access
-- Employee: Read Events/Attendees, Create Checkins
-- Attendee: Read specific event/materials, Create Survey Answers

-- (Actual policy implementation needs SQL functions which I will omit for now to keep schema clean, 
--  but in production these should be strictly defined)
