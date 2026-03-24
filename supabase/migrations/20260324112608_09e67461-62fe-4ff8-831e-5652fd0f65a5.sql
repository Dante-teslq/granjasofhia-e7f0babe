
-- Create estoque_diario header table
CREATE TABLE public.estoque_diario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pdv_id uuid NOT NULL REFERENCES public.pontos_de_venda(id),
  data_conferencia date NOT NULL,
  status text NOT NULL DEFAULT 'aberto',
  created_by uuid REFERENCES auth.users(id),
  created_by_name text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES auth.users(id),
  updated_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pdv_id, data_conferencia)
);

-- Create estoque_diario_itens table
CREATE TABLE public.estoque_diario_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estoque_diario_id uuid NOT NULL REFERENCES public.estoque_diario(id) ON DELETE CASCADE,
  produto_codigo text NOT NULL DEFAULT '',
  produto_descricao text NOT NULL DEFAULT '',
  estoque_sistema numeric NOT NULL DEFAULT 0,
  estoque_loja numeric NOT NULL DEFAULT 0,
  trincado numeric NOT NULL DEFAULT 0,
  quebrado numeric NOT NULL DEFAULT 0,
  observacao text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estoque_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_diario_itens ENABLE ROW LEVEL SECURITY;

-- Helper function: check if a estoque_diario record belongs to user's PDV
CREATE OR REPLACE FUNCTION public.get_diario_pdv_id(_diario_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pdv_id FROM public.estoque_diario WHERE id = _diario_id LIMIT 1;
$$;

-- Helper function: check if estoque_diario is open
CREATE OR REPLACE FUNCTION public.is_diario_open(_diario_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.estoque_diario WHERE id = _diario_id AND status = 'aberto'
  );
$$;

-- RLS for estoque_diario: SELECT
CREATE POLICY "PDV-scoped read estoque_diario"
ON public.estoque_diario FOR SELECT TO authenticated
USING (is_admin_user(auth.uid()) OR pdv_id = get_user_pdv_id(auth.uid()));

-- RLS for estoque_diario: INSERT (operators can only insert for their PDV)
CREATE POLICY "PDV-scoped insert estoque_diario"
ON public.estoque_diario FOR INSERT TO authenticated
WITH CHECK (is_admin_user(auth.uid()) OR pdv_id = get_user_pdv_id(auth.uid()));

-- RLS for estoque_diario: UPDATE (only admins can update closed records, operators can update only open ones for their PDV)
CREATE POLICY "PDV-scoped update estoque_diario"
ON public.estoque_diario FOR UPDATE TO authenticated
USING (
  is_admin_user(auth.uid()) 
  OR (pdv_id = get_user_pdv_id(auth.uid()) AND status = 'aberto')
)
WITH CHECK (
  is_admin_user(auth.uid()) 
  OR (pdv_id = get_user_pdv_id(auth.uid()) AND status = 'aberto')
);

-- RLS for estoque_diario: DELETE (only admins)
CREATE POLICY "Admin-only delete estoque_diario"
ON public.estoque_diario FOR DELETE TO authenticated
USING (is_admin_user(auth.uid()));

-- RLS for estoque_diario_itens: SELECT
CREATE POLICY "PDV-scoped read estoque_diario_itens"
ON public.estoque_diario_itens FOR SELECT TO authenticated
USING (
  is_admin_user(auth.uid()) 
  OR get_diario_pdv_id(estoque_diario_id) = get_user_pdv_id(auth.uid())
);

-- RLS for estoque_diario_itens: INSERT (only if diario is open OR admin)
CREATE POLICY "Insert estoque_diario_itens"
ON public.estoque_diario_itens FOR INSERT TO authenticated
WITH CHECK (
  is_admin_user(auth.uid()) 
  OR (get_diario_pdv_id(estoque_diario_id) = get_user_pdv_id(auth.uid()) AND is_diario_open(estoque_diario_id))
);

-- RLS for estoque_diario_itens: UPDATE (only if diario is open OR admin)
CREATE POLICY "Update estoque_diario_itens"
ON public.estoque_diario_itens FOR UPDATE TO authenticated
USING (
  is_admin_user(auth.uid()) 
  OR (get_diario_pdv_id(estoque_diario_id) = get_user_pdv_id(auth.uid()) AND is_diario_open(estoque_diario_id))
)
WITH CHECK (
  is_admin_user(auth.uid()) 
  OR (get_diario_pdv_id(estoque_diario_id) = get_user_pdv_id(auth.uid()) AND is_diario_open(estoque_diario_id))
);

-- RLS for estoque_diario_itens: DELETE (only admins OR operator if diario is open)
CREATE POLICY "Delete estoque_diario_itens"
ON public.estoque_diario_itens FOR DELETE TO authenticated
USING (
  is_admin_user(auth.uid()) 
  OR (get_diario_pdv_id(estoque_diario_id) = get_user_pdv_id(auth.uid()) AND is_diario_open(estoque_diario_id))
);

-- Updated_at trigger for estoque_diario
CREATE TRIGGER update_estoque_diario_updated_at
  BEFORE UPDATE ON public.estoque_diario
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for estoque_diario_itens
CREATE TRIGGER update_estoque_diario_itens_updated_at
  BEFORE UPDATE ON public.estoque_diario_itens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
