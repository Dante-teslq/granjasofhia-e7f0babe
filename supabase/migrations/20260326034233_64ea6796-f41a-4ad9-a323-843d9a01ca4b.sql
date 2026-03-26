
-- Table for daily stock closing with carry-over
CREATE TABLE public.fechamento_diario_estoque (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdv_id uuid NOT NULL REFERENCES public.pontos_de_venda(id) ON DELETE CASCADE,
  data date NOT NULL,
  produto_codigo text NOT NULL DEFAULT '',
  produto_descricao text NOT NULL DEFAULT '',
  estoque_inicial numeric NOT NULL DEFAULT 0,
  total_entradas numeric NOT NULL DEFAULT 0,
  total_saidas numeric NOT NULL DEFAULT 0,
  total_ajustes numeric NOT NULL DEFAULT 0,
  estoque_final numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberto',
  fechado_em timestamp with time zone,
  fechado_por text,
  fechado_por_id uuid,
  reaberto_em timestamp with time zone,
  reaberto_por text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(pdv_id, data, produto_codigo)
);

ALTER TABLE public.fechamento_diario_estoque ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "PDV-scoped read fechamento_diario"
  ON public.fechamento_diario_estoque FOR SELECT TO authenticated
  USING (is_admin_user(auth.uid()) OR pdv_id = get_user_pdv_id(auth.uid()));

CREATE POLICY "PDV-scoped insert fechamento_diario"
  ON public.fechamento_diario_estoque FOR INSERT TO authenticated
  WITH CHECK (is_admin_user(auth.uid()) OR pdv_id = get_user_pdv_id(auth.uid()));

CREATE POLICY "PDV-scoped update fechamento_diario"
  ON public.fechamento_diario_estoque FOR UPDATE TO authenticated
  USING (is_admin_user(auth.uid()) OR (pdv_id = get_user_pdv_id(auth.uid()) AND status = 'aberto'))
  WITH CHECK (is_admin_user(auth.uid()) OR (pdv_id = get_user_pdv_id(auth.uid()) AND status = 'aberto'));

CREATE POLICY "Admin-only delete fechamento_diario"
  ON public.fechamento_diario_estoque FOR DELETE TO authenticated
  USING (is_admin_user(auth.uid()));

-- Updated_at trigger
CREATE TRIGGER update_fechamento_diario_updated_at
  BEFORE UPDATE ON public.fechamento_diario_estoque
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
