
-- 1. Add new columns to audit_logs
ALTER TABLE public.audit_logs 
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS entity text DEFAULT '',
  ADD COLUMN IF NOT EXISTS record_id uuid,
  ADD COLUMN IF NOT EXISTS user_agent text DEFAULT '';

-- Rename existing columns for consistency (ip -> keep as ip, usuario -> keep)
-- We keep backward compat by not dropping old columns

-- 2. Create record_history table for versioning
CREATE TABLE IF NOT EXISTS public.record_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  record_id uuid NOT NULL,
  version_number integer NOT NULL DEFAULT 1,
  data_snapshot jsonb NOT NULL,
  changed_by uuid,
  changed_by_name text DEFAULT '',
  changed_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create system_logs table for error tracking
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  module text DEFAULT '',
  details jsonb,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Enable RLS on new tables
ALTER TABLE public.record_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- 5. RLS for record_history: only admins can read, authenticated can insert
CREATE POLICY "Authenticated can insert record_history" ON public.record_history
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can read record_history" ON public.record_history
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Administrador'));

-- 6. RLS for system_logs: only admins can read, anyone can insert (for error logging)
CREATE POLICY "Anyone can insert system_logs" ON public.system_logs
  FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "Admins can read system_logs" ON public.system_logs
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Administrador'));

-- 7. Restrict audit_logs to admins only (replace existing permissive SELECT)
DROP POLICY IF EXISTS "Anyone can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (get_user_role(auth.uid()) IN ('Admin', 'Administrador', 'Auditor'));

-- 8. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_record_history_entity_record ON public.record_history(entity, record_id);
CREATE INDEX IF NOT EXISTS idx_record_history_changed_at ON public.record_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_record ON public.audit_logs(entity, record_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);
