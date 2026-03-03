
-- Drop the restrictive update policy
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Allow admins to update any profile
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (
  auth.uid() = user_id 
  OR public.get_user_role(auth.uid()) = 'Administrador'
)
WITH CHECK (
  auth.uid() = user_id 
  OR public.get_user_role(auth.uid()) = 'Administrador'
);
