-- The Vercel API forwards each learner's validated Supabase access token.
-- These policies enforce ownership even if a request reaches the Data API directly.
grant select, insert, update on table public.learning_profiles to authenticated;

create policy "Learners can read their own learning profile"
  on public.learning_profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Learners can create their own learning profile"
  on public.learning_profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Learners can update their own learning profile"
  on public.learning_profiles
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
