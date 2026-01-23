-- RLS Policies for MVP
-- Run this in Supabase SQL Editor to enable access

-- 1. PROFILES
-- Allow users to insert their own profile during signup
create policy "Enable insert for authenticated users only"
on public.profiles for insert
to authenticated
with check ( auth.uid() = id );

-- Allow users to read all profiles (needed for staff management etc)
create policy "Enable read access for all users"
on public.profiles for select
using ( true );

-- Allow users to update their own profile
create policy "Enable update for users based on id"
on public.profiles for update
using ( auth.uid() = id );

-- 2. EVENTS
-- Allow read access to everyone (including public attendees)
create policy "Enable read access for all users"
on public.events for select
using ( true );

-- Allow admins/employees to create events (Simplified: Allow all authenticated)
create policy "Enable insert for authenticated users only"
on public.events for insert
to authenticated
with check ( true );

-- Allow admins/employees to update events
create policy "Enable update for authenticated users only"
on public.events for update
to authenticated
using ( true );

-- 3. ATTENDEES (Access Logic)
-- Allow public to insert (Registration)
create policy "Enable insert for all users (including anon)"
on public.attendees for insert
to anon, authenticated
with check ( true );

-- Allow read for authenticated users (Staff/Admin) and maybe public (Portal)
create policy "Enable read access for all users"
on public.attendees for select
using ( true );

-- 4. CHECKINS
-- Allow authenticated users (Staff) to insert checkins
create policy "Enable insert for authenticated users only"
on public.checkins for insert
to authenticated
with check ( true );

create policy "Enable read access for all users"
on public.checkins for select
using ( true );

-- 5. EVENT MATERIALS
-- Allow read for all
create policy "Enable read access for all users"
on public.event_materials for select
using ( true );

-- 6. SURVEYS & ANSWERS
create policy "Enable read access for all users"
on public.surveys for select
using ( true );

create policy "Enable insert for all users"
on public.survey_answers for insert
to anon, authenticated
with check ( true );
