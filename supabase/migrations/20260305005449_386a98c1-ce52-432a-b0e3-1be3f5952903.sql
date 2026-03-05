
-- Create vendas_diarias table
CREATE TABLE public.vendas_diarias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL DEFAULT CURRENT_DATE,
  produto text NOT NULL,
  codigo_produto text NOT NULL DEFAULT '',
  ponto_venda text NOT NULL,
  quantidade numeric NOT NULL DEFAULT 0,
  valor_unitario numeric NOT NULL DEFAULT 0,
  total numeric GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
  forma_pagamento text NOT NULL DEFAULT 'Dinheiro',
  usuario text,
  observacao text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'aberto',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vendas_diarias ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can read vendas_diarias"
  ON public.vendas_diarias FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vendas_diarias"
  ON public.vendas_diarias FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update vendas_diarias"
  ON public.vendas_diarias FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete vendas_diarias"
  ON public.vendas_diarias FOR DELETE TO authenticated
  USING (true);

-- updated_at trigger
CREATE TRIGGER update_vendas_diarias_updated_at
  BEFORE UPDATE ON public.vendas_diarias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas_diarias;
