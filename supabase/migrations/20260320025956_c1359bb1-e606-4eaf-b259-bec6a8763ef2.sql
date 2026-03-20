
-- Add recebimento fields to movimentacoes_estoque
ALTER TABLE public.movimentacoes_estoque
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS quantidade_recebida numeric NULL,
  ADD COLUMN IF NOT EXISTS divergencia numeric NULL,
  ADD COLUMN IF NOT EXISTS observacao_recebimento text NULL,
  ADD COLUMN IF NOT EXISTS foto_recebimento text NULL,
  ADD COLUMN IF NOT EXISTS confirmado_por uuid NULL,
  ADD COLUMN IF NOT EXISTS confirmado_em timestamp with time zone NULL;

-- Update existing records to 'confirmado' (legacy data)
UPDATE public.movimentacoes_estoque SET status = 'confirmado' WHERE status = 'pendente';

-- Add RLS policy for UPDATE (operators can confirm receipts for their PDV)
CREATE POLICY "PDV-scoped update movimentacoes"
ON public.movimentacoes_estoque
FOR UPDATE
TO authenticated
USING (
  is_admin_user(auth.uid()) 
  OR pdv_destino_id = get_user_pdv_id(auth.uid())
  OR pdv_origem_id = get_user_pdv_id(auth.uid())
)
WITH CHECK (
  is_admin_user(auth.uid()) 
  OR pdv_destino_id = get_user_pdv_id(auth.uid())
  OR pdv_origem_id = get_user_pdv_id(auth.uid())
);

-- Create storage bucket for recebimento photos
INSERT INTO storage.buckets (id, name, public) VALUES ('recebimentos', 'recebimentos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for recebimentos bucket
CREATE POLICY "Authenticated can upload recebimento photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recebimentos');

CREATE POLICY "Anyone can view recebimento photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'recebimentos');

CREATE POLICY "Authenticated can delete own recebimento photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'recebimentos');
