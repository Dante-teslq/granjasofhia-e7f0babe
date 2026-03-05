
-- Table for persisting stock records
CREATE TABLE public.estoque_registros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data date NOT NULL,
  loja text NOT NULL,
  codigo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  estoque_sistema numeric NOT NULL DEFAULT 0,
  estoque_loja numeric NOT NULL DEFAULT 0,
  trincado numeric NOT NULL DEFAULT 0,
  quebrado numeric NOT NULL DEFAULT 0,
  obs text NOT NULL DEFAULT '',
  usuario text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(data, loja, codigo)
);

-- Enable RLS
ALTER TABLE public.estoque_registros ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read estoque" ON public.estoque_registros
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert estoque" ON public.estoque_registros
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update estoque" ON public.estoque_registros
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete estoque" ON public.estoque_registros
  FOR DELETE TO authenticated USING (true);

-- Updated_at trigger
CREATE TRIGGER update_estoque_registros_updated_at
  BEFORE UPDATE ON public.estoque_registros
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.estoque_registros;
