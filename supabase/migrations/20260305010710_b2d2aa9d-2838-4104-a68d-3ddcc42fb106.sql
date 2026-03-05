
CREATE TABLE public.sangrias (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data date NOT NULL DEFAULT CURRENT_DATE,
  ponto_venda text NOT NULL,
  sangria text NOT NULL DEFAULT '',
  cartelas_vazias text NOT NULL DEFAULT '',
  barbantes text NOT NULL DEFAULT '',
  notacoes text NOT NULL DEFAULT '',
  usuario text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.sangrias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sangrias" ON public.sangrias FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sangrias" ON public.sangrias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sangrias" ON public.sangrias FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sangrias" ON public.sangrias FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_sangrias_updated_at BEFORE UPDATE ON public.sangrias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.sangrias;
