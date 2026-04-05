-- Tabelas base criadas originalmente pelo Lovable (fora do histórico de migrations)
-- Idempotente: usa IF NOT EXISTS e DROP IF EXISTS para re-execuções seguras

-- 1. pontos_de_venda
CREATE TABLE IF NOT EXISTS public.pontos_de_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'loja' CHECK (tipo IN ('rota', 'deposito', 'loja', 'granja')),
  permite_venda BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pontos_de_venda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read pontos_de_venda" ON public.pontos_de_venda;
CREATE POLICY "Authenticated can read pontos_de_venda"
  ON public.pontos_de_venda FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can manage pontos_de_venda" ON public.pontos_de_venda;
CREATE POLICY "Authenticated can manage pontos_de_venda"
  ON public.pontos_de_venda FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP TRIGGER IF EXISTS update_pontos_de_venda_updated_at ON public.pontos_de_venda;
CREATE TRIGGER update_pontos_de_venda_updated_at
  BEFORE UPDATE ON public.pontos_de_venda
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. estoque_pdv
CREATE TABLE IF NOT EXISTS public.estoque_pdv (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pdv_id UUID NOT NULL REFERENCES public.pontos_de_venda(id) ON DELETE CASCADE,
  produto_codigo TEXT NOT NULL,
  produto_descricao TEXT NOT NULL DEFAULT '',
  quantidade NUMERIC NOT NULL DEFAULT 0,
  quantidade_minima NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.estoque_pdv ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read estoque_pdv" ON public.estoque_pdv;
CREATE POLICY "Authenticated can read estoque_pdv"
  ON public.estoque_pdv FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert estoque_pdv" ON public.estoque_pdv;
CREATE POLICY "Authenticated can insert estoque_pdv"
  ON public.estoque_pdv FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update estoque_pdv" ON public.estoque_pdv;
CREATE POLICY "Authenticated can update estoque_pdv"
  ON public.estoque_pdv FOR UPDATE TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can delete estoque_pdv" ON public.estoque_pdv;
CREATE POLICY "Authenticated can delete estoque_pdv"
  ON public.estoque_pdv FOR DELETE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_estoque_pdv_updated_at ON public.estoque_pdv;
CREATE TRIGGER update_estoque_pdv_updated_at
  BEFORE UPDATE ON public.estoque_pdv
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. movimentacoes_estoque
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL,
  pdv_origem_id UUID REFERENCES public.pontos_de_venda(id),
  pdv_destino_id UUID REFERENCES public.pontos_de_venda(id),
  produto_codigo TEXT NOT NULL,
  produto_descricao TEXT NOT NULL DEFAULT '',
  quantidade NUMERIC NOT NULL,
  quantidade_recebida NUMERIC,
  divergencia NUMERIC,
  status TEXT NOT NULL DEFAULT 'pendente',
  usuario TEXT,
  observacao TEXT,
  observacao_recebimento TEXT,
  foto_recebimento TEXT,
  confirmado_por UUID,
  confirmado_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Authenticated can read movimentacoes"
  ON public.movimentacoes_estoque FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Authenticated can insert movimentacoes"
  ON public.movimentacoes_estoque FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Authenticated can update movimentacoes"
  ON public.movimentacoes_estoque FOR UPDATE TO authenticated USING (true);

DROP TRIGGER IF EXISTS update_movimentacoes_estoque_updated_at ON public.movimentacoes_estoque;
CREATE TRIGGER update_movimentacoes_estoque_updated_at
  BEFORE UPDATE ON public.movimentacoes_estoque
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Adicionar pdv_id em profiles (criado pelo Lovable fora das migrations)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pdv_id UUID REFERENCES public.pontos_de_venda(id);
