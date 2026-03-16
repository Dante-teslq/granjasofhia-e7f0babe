
-- 1. Security helper: get user's PDV id
CREATE OR REPLACE FUNCTION public.get_user_pdv_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pdv_id FROM public.profiles WHERE user_id = _user_id LIMIT 1;
$$;

-- 2. Security helper: get user's PDV name (resolves through pontos_de_venda)
CREATE OR REPLACE FUNCTION public.get_user_pdv_name(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pv.nome 
  FROM public.profiles p
  JOIN public.pontos_de_venda pv ON pv.id = p.pdv_id
  WHERE p.user_id = _user_id
  LIMIT 1;
$$;

-- 3. Security helper: check if user is admin/supervisor (full access)
CREATE OR REPLACE FUNCTION public.is_admin_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = _user_id 
    AND cargo IN ('Admin', 'Administrador', 'Supervisor', 'Auditor')
  );
$$;

-- 4. Create security_logs table
CREATE TABLE IF NOT EXISTS public.security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  target_pdv text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert security_logs" ON public.security_logs
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can read security_logs" ON public.security_logs
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()));

-- =====================================================
-- 5. Replace RLS on estoque_registros (uses "loja" text)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read estoque" ON public.estoque_registros;
DROP POLICY IF EXISTS "Authenticated users can insert estoque" ON public.estoque_registros;
DROP POLICY IF EXISTS "Authenticated users can update estoque" ON public.estoque_registros;
DROP POLICY IF EXISTS "Authenticated users can delete estoque" ON public.estoque_registros;

CREATE POLICY "PDV-scoped read estoque_registros" ON public.estoque_registros
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()) OR loja = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped insert estoque_registros" ON public.estoque_registros
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()) OR loja = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped update estoque_registros" ON public.estoque_registros
  FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR loja = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped delete estoque_registros" ON public.estoque_registros
  FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR loja = public.get_user_pdv_name(auth.uid()));

-- =====================================================
-- 6. Replace RLS on sangrias (uses "ponto_venda" text)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read sangrias" ON public.sangrias;
DROP POLICY IF EXISTS "Authenticated users can insert sangrias" ON public.sangrias;
DROP POLICY IF EXISTS "Authenticated users can update sangrias" ON public.sangrias;
DROP POLICY IF EXISTS "Authenticated users can delete sangrias" ON public.sangrias;

CREATE POLICY "PDV-scoped read sangrias" ON public.sangrias
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped insert sangrias" ON public.sangrias
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped update sangrias" ON public.sangrias
  FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped delete sangrias" ON public.sangrias
  FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

-- =====================================================
-- 7. Replace RLS on vendas_diarias (uses "ponto_venda" text)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can read vendas_diarias" ON public.vendas_diarias;
DROP POLICY IF EXISTS "Authenticated users can insert vendas_diarias" ON public.vendas_diarias;
DROP POLICY IF EXISTS "Authenticated users can update vendas_diarias" ON public.vendas_diarias;
DROP POLICY IF EXISTS "Authenticated users can delete vendas_diarias" ON public.vendas_diarias;

CREATE POLICY "PDV-scoped read vendas_diarias" ON public.vendas_diarias
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped insert vendas_diarias" ON public.vendas_diarias
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped update vendas_diarias" ON public.vendas_diarias
  FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped delete vendas_diarias" ON public.vendas_diarias
  FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

-- =====================================================
-- 8. Replace RLS on evidencias_perdas (uses "ponto_de_venda" text)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can insert evidence" ON public.evidencias_perdas;
DROP POLICY IF EXISTS "Authenticated users can read evidence" ON public.evidencias_perdas;
DROP POLICY IF EXISTS "Anon can insert evidence" ON public.evidencias_perdas;
DROP POLICY IF EXISTS "Anon can read evidence" ON public.evidencias_perdas;
DROP POLICY IF EXISTS "Authenticated users can delete evidence" ON public.evidencias_perdas;
DROP POLICY IF EXISTS "Anon can delete evidence" ON public.evidencias_perdas;

CREATE POLICY "PDV-scoped read evidencias" ON public.evidencias_perdas
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_de_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped insert evidencias" ON public.evidencias_perdas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()) OR ponto_de_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped delete evidencias" ON public.evidencias_perdas
  FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_de_venda = public.get_user_pdv_name(auth.uid()));

-- =====================================================
-- 9. Replace RLS on vendas_registros (uses "ponto_venda" text)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can read vendas" ON public.vendas_registros;
DROP POLICY IF EXISTS "Anyone can insert vendas" ON public.vendas_registros;
DROP POLICY IF EXISTS "Anyone can update vendas" ON public.vendas_registros;
DROP POLICY IF EXISTS "Anyone can delete vendas" ON public.vendas_registros;

CREATE POLICY "PDV-scoped read vendas_registros" ON public.vendas_registros
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped insert vendas_registros" ON public.vendas_registros
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped update vendas_registros" ON public.vendas_registros
  FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

CREATE POLICY "PDV-scoped delete vendas_registros" ON public.vendas_registros
  FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR ponto_venda = public.get_user_pdv_name(auth.uid()));

-- =====================================================
-- 10. Replace RLS on estoque_pdv (uses "pdv_id" uuid)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can read estoque_pdv" ON public.estoque_pdv;
DROP POLICY IF EXISTS "Authenticated can insert estoque_pdv" ON public.estoque_pdv;
DROP POLICY IF EXISTS "Authenticated can update estoque_pdv" ON public.estoque_pdv;
DROP POLICY IF EXISTS "Authenticated can delete estoque_pdv" ON public.estoque_pdv;

CREATE POLICY "PDV-scoped read estoque_pdv" ON public.estoque_pdv
  FOR SELECT TO authenticated
  USING (public.is_admin_user(auth.uid()) OR pdv_id = public.get_user_pdv_id(auth.uid()));

CREATE POLICY "PDV-scoped insert estoque_pdv" ON public.estoque_pdv
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin_user(auth.uid()) OR pdv_id = public.get_user_pdv_id(auth.uid()));

CREATE POLICY "PDV-scoped update estoque_pdv" ON public.estoque_pdv
  FOR UPDATE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR pdv_id = public.get_user_pdv_id(auth.uid()));

CREATE POLICY "PDV-scoped delete estoque_pdv" ON public.estoque_pdv
  FOR DELETE TO authenticated
  USING (public.is_admin_user(auth.uid()) OR pdv_id = public.get_user_pdv_id(auth.uid()));

-- =====================================================
-- 11. Replace RLS on movimentacoes_estoque (uses pdv_origem_id / pdv_destino_id uuid)
-- =====================================================
DROP POLICY IF EXISTS "Authenticated can read movimentacoes" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "Authenticated can insert movimentacoes" ON public.movimentacoes_estoque;

CREATE POLICY "PDV-scoped read movimentacoes" ON public.movimentacoes_estoque
  FOR SELECT TO authenticated
  USING (
    public.is_admin_user(auth.uid()) 
    OR pdv_origem_id = public.get_user_pdv_id(auth.uid()) 
    OR pdv_destino_id = public.get_user_pdv_id(auth.uid())
  );

CREATE POLICY "PDV-scoped insert movimentacoes" ON public.movimentacoes_estoque
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_admin_user(auth.uid()) 
    OR pdv_origem_id = public.get_user_pdv_id(auth.uid()) 
    OR pdv_destino_id = public.get_user_pdv_id(auth.uid())
  );
