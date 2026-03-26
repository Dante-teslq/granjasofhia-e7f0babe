
ALTER TABLE public.fechamento_diario_estoque ADD COLUMN IF NOT EXISTS total_perdas numeric NOT NULL DEFAULT 0;
