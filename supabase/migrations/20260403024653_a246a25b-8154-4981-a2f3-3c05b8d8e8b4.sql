
-- Tabela de contas Omie (vinculação PDV ↔ App Omie)
CREATE TABLE public.omie_contas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdv_nome TEXT NOT NULL,
  omie_app_key TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.omie_contas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage omie_contas"
  ON public.omie_contas FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Authenticated can read omie_contas"
  ON public.omie_contas FOR SELECT TO authenticated
  USING (true);

-- Tabela de reconciliação Omie
CREATE TABLE public.omie_reconciliacao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  omie_conta_id UUID NOT NULL REFERENCES public.omie_contas(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  produto_codigo TEXT NOT NULL DEFAULT '',
  produto_descricao TEXT NOT NULL DEFAULT '',
  saldo_interno NUMERIC NOT NULL DEFAULT 0,
  saldo_omie NUMERIC NOT NULL DEFAULT 0,
  divergencia NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  revisado_por TEXT,
  revisado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.omie_reconciliacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage omie_reconciliacao"
  ON public.omie_reconciliacao FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Authenticated can read omie_reconciliacao"
  ON public.omie_reconciliacao FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can update omie_reconciliacao status"
  ON public.omie_reconciliacao FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_omie_contas_updated_at
  BEFORE UPDATE ON public.omie_contas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_omie_reconciliacao_updated_at
  BEFORE UPDATE ON public.omie_reconciliacao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
