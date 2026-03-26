
-- Fix: Allow operators to delete their own PDV's OPEN records (needed for closeDay flow)
DROP POLICY IF EXISTS "Admin-only delete fechamento_diario" ON public.fechamento_diario_estoque;

CREATE POLICY "PDV-scoped delete fechamento_diario"
ON public.fechamento_diario_estoque
FOR DELETE
TO authenticated
USING (
  is_admin_user(auth.uid()) 
  OR (
    pdv_id = get_user_pdv_id(auth.uid()) 
    AND status = 'aberto'
  )
);
