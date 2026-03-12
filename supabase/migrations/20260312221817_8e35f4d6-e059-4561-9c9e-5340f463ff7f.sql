
-- Tabela de alertas de fraude
CREATE TABLE public.fraud_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'baixa',
  status text NOT NULL DEFAULT 'ativo',
  message text NOT NULL DEFAULT '',
  operator text NOT NULL DEFAULT '',
  link text NOT NULL DEFAULT '',
  analyst text,
  observation text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.fraud_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read fraud_alerts" ON public.fraud_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert fraud_alerts" ON public.fraud_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update fraud_alerts" ON public.fraud_alerts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete fraud_alerts" ON public.fraud_alerts FOR DELETE TO authenticated USING (true);

-- Tabela de perfis de risco de usuários
CREATE TABLE public.user_risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL UNIQUE,
  total_adjustments integer NOT NULL DEFAULT 0,
  high_adjustments integer NOT NULL DEFAULT 0,
  after_hours_ops integer NOT NULL DEFAULT 0,
  multi_edit_count integer NOT NULL DEFAULT 0,
  risk_score numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'baixo',
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_risk_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read user_risk_profiles" ON public.user_risk_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert user_risk_profiles" ON public.user_risk_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update user_risk_profiles" ON public.user_risk_profiles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete user_risk_profiles" ON public.user_risk_profiles FOR DELETE TO authenticated USING (true);
