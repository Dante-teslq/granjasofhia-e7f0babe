-- Fix: create profiles for auth.users that have no matching profile row
-- This happens when a user is created via Supabase dashboard (no signup trigger)
INSERT INTO public.profiles (user_id, nome, email, cargo, status)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
  u.email,
  'Administrador',
  'ativo'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
