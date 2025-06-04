-- Create the referral_program table
create table if not exists public.referral_program (
  id uuid primary key default gen_random_uuid(),
  is_enabled boolean not null default false,
  reward_type text not null default 'percentage', -- 'percentage' or 'fixed'
  percentage float,
  fixed_amount float,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Add RLS policies
alter table public.referral_program enable row level security;

-- Allow admins to read and write
create policy "Allow admins to read referral program settings"
  on public.referral_program
  for select
  to authenticated
  using (
    exists(
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

create policy "Allow admins to insert referral program settings"
  on public.referral_program
  for insert
  to authenticated
  with check (
    exists(
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

create policy "Allow admins to update referral program settings"
  on public.referral_program
  for update
  to authenticated
  using (
    exists(
      select 1 from public.users
      where users.id = auth.uid() and users.is_admin = true
    )
  );

-- Create trigger to update updated_at column
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Create trigger on referral_program table
drop trigger if exists set_updated_at on public.referral_program;
create trigger set_updated_at
before update on public.referral_program
for each row
execute function public.handle_updated_at();

-- Add comment to table
comment on table public.referral_program is 'Settings for the referral program';
