-- Run this entire script in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null check (char_length(customer_name) between 1 and 60),
  order_reference text,
  review_text text not null check (char_length(review_text) between 1 and 1200),
  packaging int not null check (packaging between 1 and 5),
  delivery int not null check (delivery between 1 and 5),
  pricing int not null check (pricing between 1 and 5),
  communication int not null check (communication between 1 and 5),
  photo_urls text[] not null default '{}',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.review_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.reviews enable row level security;
alter table public.review_admins enable row level security;

-- An administrator can read only their own allow-list entry. This also lets
-- the review-table policies verify the current user's admin membership.
create policy "Admins can read own admin record"
on public.review_admins for select
to authenticated
using (user_id = auth.uid());

-- Anyone can read approved reviews only.
create policy "Public can read approved reviews"
on public.reviews for select
to anon, authenticated
using (status = 'approved' or exists (
  select 1 from public.review_admins a where a.user_id = auth.uid()
));

-- Visitors can submit reviews, but every submission starts pending.
create policy "Anyone can submit pending reviews"
on public.reviews for insert
to anon, authenticated
with check (status = 'pending');

-- Only listed admins can change review status.
create policy "Admins can update reviews"
on public.reviews for update
to authenticated
using (exists (select 1 from public.review_admins a where a.user_id = auth.uid()))
with check (exists (select 1 from public.review_admins a where a.user_id = auth.uid()));

-- Create a public image bucket. Limit uploads to image formats and 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=5242880, allowed_mime_types=array['image/jpeg','image/png','image/webp'];

create policy "Visitors can upload review photos"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'review-photos');

create policy "Public can view review photos"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'review-photos');

-- IMPORTANT: After creating your admin user in Supabase Authentication,
-- copy that user's UUID and run:
-- insert into public.review_admins(user_id) values ('PASTE-ADMIN-USER-UUID-HERE');
