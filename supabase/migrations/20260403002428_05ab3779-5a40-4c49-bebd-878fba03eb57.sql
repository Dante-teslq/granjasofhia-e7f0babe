
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_omie bigint NOT NULL UNIQUE,
  nome text NOT NULL DEFAULT '',
  preco numeric NOT NULL DEFAULT 0,
  estoque numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read produtos" ON public.produtos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage produtos" ON public.produtos
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Service can upsert produtos" ON public.produtos
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Service can update produtos" ON public.produtos
  FOR UPDATE TO public
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
