
-- Allow authenticated users to delete evidence
CREATE POLICY "Authenticated users can delete evidence"
ON public.evidencias_perdas
FOR DELETE
TO authenticated
USING (true);

-- Allow anon to delete evidence (demo mode)
CREATE POLICY "Anon can delete evidence"
ON public.evidencias_perdas
FOR DELETE
TO anon
USING (true);
