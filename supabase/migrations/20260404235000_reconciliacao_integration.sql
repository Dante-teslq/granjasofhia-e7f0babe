-- Adaptar omie_reconciliacao para usar omie_integrations (novo sistema)
-- omie_conta_id vira nullable para compatibilidade retroativa

ALTER TABLE public.omie_reconciliacao
  ALTER COLUMN omie_conta_id DROP NOT NULL;

ALTER TABLE public.omie_reconciliacao
  ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES public.omie_integrations(id) ON DELETE SET NULL;

ALTER TABLE public.omie_reconciliacao
  ADD COLUMN IF NOT EXISTS pdv_id UUID REFERENCES public.pontos_de_venda(id) ON DELETE SET NULL;

-- Constraint de unicidade para upsert por integração+data+produto
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'omie_reconciliacao_integration_data_produto_key'
  ) THEN
    ALTER TABLE public.omie_reconciliacao
      ADD CONSTRAINT omie_reconciliacao_integration_data_produto_key
      UNIQUE (integration_id, data, produto_codigo);
  END IF;
END $$;
