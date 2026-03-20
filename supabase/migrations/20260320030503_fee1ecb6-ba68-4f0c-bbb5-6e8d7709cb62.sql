
-- 1. Update check constraint to allow 'granja' type
ALTER TABLE public.pontos_de_venda DROP CONSTRAINT pontos_de_venda_tipo_check;
ALTER TABLE public.pontos_de_venda ADD CONSTRAINT pontos_de_venda_tipo_check 
  CHECK (tipo = ANY (ARRAY['rota','deposito','loja','granja']));

-- 2. Add "Granja" as a ponto de venda
INSERT INTO public.pontos_de_venda (nome, tipo, permite_venda, status)
SELECT 'Granja', 'granja', false, 'ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.pontos_de_venda WHERE nome = 'Granja');

-- 3. Add DELETE policy for movimentacoes_estoque
CREATE POLICY "PDV-scoped delete movimentacoes"
ON public.movimentacoes_estoque
FOR DELETE
TO authenticated
USING (is_admin_user(auth.uid()) OR pdv_origem_id = get_user_pdv_id(auth.uid()));

-- 4. Validate stock availability
CREATE OR REPLACE FUNCTION public.validate_transfer_stock(
  _pdv_id uuid,
  _produto_codigo text,
  _quantidade numeric
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT quantidade >= _quantidade 
     FROM public.estoque_pdv 
     WHERE pdv_id = _pdv_id AND produto_codigo = _produto_codigo),
    false
  );
$$;

-- 5. Confirm transfer function (updates stock)
CREATE OR REPLACE FUNCTION public.confirm_transfer(
  _transfer_id uuid,
  _quantidade_recebida numeric,
  _confirmado_por uuid,
  _observacao_recebimento text DEFAULT NULL,
  _foto_recebimento text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _transfer RECORD;
  _divergencia numeric;
BEGIN
  SELECT * INTO _transfer FROM public.movimentacoes_estoque WHERE id = _transfer_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transferência não encontrada'; END IF;
  IF _transfer.status != 'pendente' THEN RAISE EXCEPTION 'Transferência já foi processada'; END IF;

  _divergencia := _quantidade_recebida - _transfer.quantidade;

  UPDATE public.movimentacoes_estoque SET
    status = 'confirmado',
    quantidade_recebida = _quantidade_recebida,
    divergencia = _divergencia,
    confirmado_por = _confirmado_por,
    confirmado_em = now(),
    observacao_recebimento = _observacao_recebimento,
    foto_recebimento = _foto_recebimento
  WHERE id = _transfer_id;

  -- Decrease origin stock
  INSERT INTO public.estoque_pdv (pdv_id, produto_codigo, produto_descricao, quantidade)
  VALUES (_transfer.pdv_origem_id, _transfer.produto_codigo, _transfer.produto_descricao, -_transfer.quantidade)
  ON CONFLICT (pdv_id, produto_codigo) 
  DO UPDATE SET quantidade = estoque_pdv.quantidade - _transfer.quantidade, updated_at = now();

  -- Increase destination stock
  INSERT INTO public.estoque_pdv (pdv_id, produto_codigo, produto_descricao, quantidade)
  VALUES (_transfer.pdv_destino_id, _transfer.produto_codigo, _transfer.produto_descricao, _quantidade_recebida)
  ON CONFLICT (pdv_id, produto_codigo) 
  DO UPDATE SET quantidade = estoque_pdv.quantidade + _quantidade_recebida, updated_at = now();

  -- Audit log
  INSERT INTO public.audit_logs (action, module, usuario, item_description, after_data)
  VALUES (
    'update', 'Transferências',
    COALESCE((SELECT nome FROM public.profiles WHERE user_id = _confirmado_por), 'Sistema'),
    'Confirmação: ' || _transfer.produto_descricao || ' x' || _quantidade_recebida,
    jsonb_build_object(
      'transfer_id', _transfer_id,
      'produto', _transfer.produto_descricao,
      'quantidade_enviada', _transfer.quantidade,
      'quantidade_recebida', _quantidade_recebida,
      'divergencia', _divergencia,
      'origem_id', _transfer.pdv_origem_id,
      'destino_id', _transfer.pdv_destino_id
    )
  );
END;
$$;

-- 6. Audit trigger on transfer creation
CREATE OR REPLACE FUNCTION public.log_transferencia_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'transferencia' THEN
    INSERT INTO public.audit_logs (action, module, usuario, item_description, after_data)
    VALUES (
      'create', 'Transferências',
      COALESCE(NEW.usuario, 'Sistema'),
      NEW.produto_descricao || ' x' || NEW.quantidade,
      jsonb_build_object(
        'transfer_id', NEW.id,
        'produto_codigo', NEW.produto_codigo,
        'produto_descricao', NEW.produto_descricao,
        'quantidade', NEW.quantidade,
        'origem_id', NEW.pdv_origem_id,
        'destino_id', NEW.pdv_destino_id,
        'status', NEW.status
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_transferencia_create
AFTER INSERT ON public.movimentacoes_estoque
FOR EACH ROW
EXECUTE FUNCTION public.log_transferencia_create();

-- 7. Unique constraint on estoque_pdv for upsert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estoque_pdv_pdv_id_produto_codigo_key'
  ) THEN
    ALTER TABLE public.estoque_pdv ADD CONSTRAINT estoque_pdv_pdv_id_produto_codigo_key UNIQUE (pdv_id, produto_codigo);
  END IF;
END $$;
