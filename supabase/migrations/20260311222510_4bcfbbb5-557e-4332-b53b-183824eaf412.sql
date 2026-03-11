
-- 1. Create pontos_de_venda table
CREATE TABLE public.pontos_de_venda (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  tipo TEXT NOT NULL DEFAULT 'loja' CHECK (tipo IN ('rota', 'deposito', 'loja')),
  permite_venda BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'ativo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create estoque_pdv table
CREATE TABLE public.estoque_pdv (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_codigo TEXT NOT NULL,
  produto_descricao TEXT NOT NULL DEFAULT '',
  pdv_id UUID NOT NULL REFERENCES public.pontos_de_venda(id) ON DELETE CASCADE,
  quantidade NUMERIC NOT NULL DEFAULT 0,
  quantidade_minima NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(produto_codigo, pdv_id)
);

-- 3. Create movimentacoes_estoque table
CREATE TABLE public.movimentacoes_estoque (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_codigo TEXT NOT NULL,
  produto_descricao TEXT NOT NULL DEFAULT '',
  quantidade NUMERIC NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida', 'transferencia', 'ajuste', 'venda')),
  pdv_origem_id UUID REFERENCES public.pontos_de_venda(id),
  pdv_destino_id UUID REFERENCES public.pontos_de_venda(id),
  usuario TEXT,
  observacao TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Add pdv_id to profiles for vendor binding
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pdv_id UUID REFERENCES public.pontos_de_venda(id);

-- 5. Enable RLS
ALTER TABLE public.pontos_de_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_pdv ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for pontos_de_venda
CREATE POLICY "Authenticated can read PDVs" ON public.pontos_de_venda
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage PDVs" ON public.pontos_de_venda
  FOR ALL TO authenticated USING (get_user_role(auth.uid()) = 'Admin')
  WITH CHECK (get_user_role(auth.uid()) = 'Admin');

-- 7. RLS Policies for estoque_pdv
CREATE POLICY "Authenticated can read estoque_pdv" ON public.estoque_pdv
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert estoque_pdv" ON public.estoque_pdv
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated can update estoque_pdv" ON public.estoque_pdv
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can delete estoque_pdv" ON public.estoque_pdv
  FOR DELETE TO authenticated USING (true);

-- 8. RLS Policies for movimentacoes_estoque
CREATE POLICY "Authenticated can read movimentacoes" ON public.movimentacoes_estoque
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert movimentacoes" ON public.movimentacoes_estoque
  FOR INSERT TO authenticated WITH CHECK (true);

-- 9. Updated_at triggers
CREATE TRIGGER update_pontos_de_venda_updated_at
  BEFORE UPDATE ON public.pontos_de_venda
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estoque_pdv_updated_at
  BEFORE UPDATE ON public.estoque_pdv
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 10. Enable realtime for estoque_pdv
ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_pdv;
ALTER PUBLICATION supabase_realtime ADD TABLE public.movimentacoes_estoque;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pontos_de_venda;
