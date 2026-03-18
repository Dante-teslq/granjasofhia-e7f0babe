
-- Fix DELETE policy to include both 'Admin' and 'Administrador'
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (is_admin_user(auth.uid()));

-- Fix UPDATE policy to include both 'Admin' and 'Administrador'
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING ((auth.uid() = user_id) OR is_admin_user(auth.uid()))
WITH CHECK ((auth.uid() = user_id) OR is_admin_user(auth.uid()));
