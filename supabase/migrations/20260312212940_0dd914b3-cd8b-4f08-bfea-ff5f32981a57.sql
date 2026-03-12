CREATE POLICY "Anon can read PDVs for signup"
ON public.pontos_de_venda
FOR SELECT
TO anon
USING (true);