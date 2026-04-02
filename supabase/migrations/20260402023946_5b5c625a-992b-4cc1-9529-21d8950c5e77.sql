
-- =============================================
-- OMIE INTEGRATION — ENTERPRISE-GRADE SCHEMA
-- =============================================

-- 1. OMIE INTEGRATIONS (main config table)
CREATE TABLE public.omie_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text NOT NULL,
  company_id text,
  unit_id text,
  pdv_id uuid REFERENCES public.pontos_de_venda(id),
  omie_app_key text NOT NULL,
  omie_app_secret text NOT NULL,
  environment text NOT NULL DEFAULT 'production' CHECK (environment IN ('production', 'sandbox', 'homologation')),
  is_active boolean NOT NULL DEFAULT true,
  priority integer NOT NULL DEFAULT 0,
  inheritance_level text NOT NULL DEFAULT 'pdv' CHECK (inheritance_level IN ('company', 'unit', 'pdv')),
  customers_sync_mode text NOT NULL DEFAULT 'async' CHECK (customers_sync_mode IN ('sync', 'async')),
  products_sync_mode text NOT NULL DEFAULT 'async' CHECK (products_sync_mode IN ('sync', 'async')),
  orders_sync_mode text NOT NULL DEFAULT 'sync' CHECK (orders_sync_mode IN ('sync', 'async')),
  inventory_sync_mode text NOT NULL DEFAULT 'async' CHECK (inventory_sync_mode IN ('sync', 'async')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

ALTER TABLE public.omie_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage omie_integrations" ON public.omie_integrations
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_omie_integrations_updated_at
  BEFORE UPDATE ON public.omie_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_omie_integrations_pdv ON public.omie_integrations(pdv_id) WHERE is_active = true;
CREATE INDEX idx_omie_integrations_company ON public.omie_integrations(company_id) WHERE is_active = true;
CREATE INDEX idx_omie_integrations_unit ON public.omie_integrations(unit_id) WHERE is_active = true;

-- 2. OMIE INTEGRATION BINDINGS
CREATE TABLE public.omie_integration_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.omie_integrations(id) ON DELETE CASCADE,
  company_id text,
  unit_id text,
  pdv_id uuid REFERENCES public.pontos_de_venda(id),
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.omie_integration_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage omie_integration_bindings" ON public.omie_integration_bindings
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_omie_integration_bindings_updated_at
  BEFORE UPDATE ON public.omie_integration_bindings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_omie_bindings_pdv ON public.omie_integration_bindings(pdv_id);
CREATE INDEX idx_omie_bindings_integration ON public.omie_integration_bindings(integration_id);

-- 3. MAPPING TABLES

-- 3.1 Customer Map
CREATE TABLE public.omie_customer_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.omie_integrations(id) ON DELETE CASCADE,
  local_record_id uuid NOT NULL,
  local_record_type text NOT NULL DEFAULT 'customer',
  omie_record_id text,
  omie_code text,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'conflict', 'reconciled')),
  last_sync_at timestamptz,
  last_payload_hash text,
  source_of_truth text NOT NULL DEFAULT 'local' CHECK (source_of_truth IN ('local', 'omie', 'bidirectional')),
  conflict_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, local_record_id, local_record_type)
);

ALTER TABLE public.omie_customer_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read omie_customer_map" ON public.omie_customer_map
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage omie_customer_map" ON public.omie_customer_map
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_omie_customer_map_updated_at
  BEFORE UPDATE ON public.omie_customer_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_omie_customer_map_status ON public.omie_customer_map(sync_status);
CREATE INDEX idx_omie_customer_map_local ON public.omie_customer_map(local_record_id);
CREATE INDEX idx_omie_customer_map_omie ON public.omie_customer_map(omie_code);

-- 3.2 Product Map
CREATE TABLE public.omie_product_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.omie_integrations(id) ON DELETE CASCADE,
  local_record_id uuid NOT NULL,
  local_record_type text NOT NULL DEFAULT 'product',
  omie_record_id text,
  omie_code text,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'conflict', 'reconciled')),
  last_sync_at timestamptz,
  last_payload_hash text,
  source_of_truth text NOT NULL DEFAULT 'local' CHECK (source_of_truth IN ('local', 'omie', 'bidirectional')),
  conflict_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, local_record_id, local_record_type)
);

ALTER TABLE public.omie_product_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read omie_product_map" ON public.omie_product_map
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage omie_product_map" ON public.omie_product_map
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_omie_product_map_updated_at
  BEFORE UPDATE ON public.omie_product_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_omie_product_map_status ON public.omie_product_map(sync_status);
CREATE INDEX idx_omie_product_map_local ON public.omie_product_map(local_record_id);
CREATE INDEX idx_omie_product_map_omie ON public.omie_product_map(omie_code);

-- 3.3 Order Map
CREATE TABLE public.omie_order_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.omie_integrations(id) ON DELETE CASCADE,
  local_record_id uuid NOT NULL,
  local_record_type text NOT NULL DEFAULT 'order',
  omie_record_id text,
  omie_code text,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'conflict', 'reconciled')),
  last_sync_at timestamptz,
  last_payload_hash text,
  source_of_truth text NOT NULL DEFAULT 'local' CHECK (source_of_truth IN ('local', 'omie', 'bidirectional')),
  conflict_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, local_record_id, local_record_type)
);

ALTER TABLE public.omie_order_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read omie_order_map" ON public.omie_order_map
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage omie_order_map" ON public.omie_order_map
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_omie_order_map_updated_at
  BEFORE UPDATE ON public.omie_order_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_omie_order_map_status ON public.omie_order_map(sync_status);
CREATE INDEX idx_omie_order_map_local ON public.omie_order_map(local_record_id);
CREATE INDEX idx_omie_order_map_omie ON public.omie_order_map(omie_code);

-- 3.4 Inventory Map
CREATE TABLE public.omie_inventory_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.omie_integrations(id) ON DELETE CASCADE,
  local_record_id uuid NOT NULL,
  local_record_type text NOT NULL DEFAULT 'inventory',
  omie_record_id text,
  omie_code text,
  sync_status text NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'error', 'conflict', 'reconciled')),
  last_sync_at timestamptz,
  last_payload_hash text,
  source_of_truth text NOT NULL DEFAULT 'local' CHECK (source_of_truth IN ('local', 'omie', 'bidirectional')),
  conflict_flag boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, local_record_id, local_record_type)
);

ALTER TABLE public.omie_inventory_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read omie_inventory_map" ON public.omie_inventory_map
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage omie_inventory_map" ON public.omie_inventory_map
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE TRIGGER update_omie_inventory_map_updated_at
  BEFORE UPDATE ON public.omie_inventory_map
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_omie_inventory_map_status ON public.omie_inventory_map(sync_status);
CREATE INDEX idx_omie_inventory_map_local ON public.omie_inventory_map(local_record_id);

-- 4. INTEGRATION LOGS
CREATE TABLE public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.omie_integrations(id),
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id text,
  operation_type text NOT NULL,
  source_module text,
  payload_sent jsonb,
  payload_response jsonb,
  http_status integer,
  provider_status text,
  execution_status text NOT NULL DEFAULT 'pending' CHECK (execution_status IN ('success', 'failed', 'pending', 'retrying', 'canceled')),
  error_code text,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  triggered_by_user_id uuid,
  triggered_by_context text,
  edge_function_name text,
  retry_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read integration_logs" ON public.integration_logs
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can insert integration_logs" ON public.integration_logs
  FOR INSERT TO public WITH CHECK (true);

CREATE INDEX idx_integration_logs_correlation ON public.integration_logs(correlation_id);
CREATE INDEX idx_integration_logs_entity ON public.integration_logs(entity_type, entity_id);
CREATE INDEX idx_integration_logs_status ON public.integration_logs(execution_status);
CREATE INDEX idx_integration_logs_integration ON public.integration_logs(integration_id);
CREATE INDEX idx_integration_logs_created ON public.integration_logs(created_at DESC);

-- 5. INTEGRATION QUEUE
CREATE TABLE public.integration_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES public.omie_integrations(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  operation_type text NOT NULL,
  payload_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'dead_letter')),
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  processed_at timestamptz,
  attempt_count integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 5,
  last_error text,
  correlation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read integration_queue" ON public.integration_queue
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage integration_queue" ON public.integration_queue
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Service can insert integration_queue" ON public.integration_queue
  FOR INSERT TO public WITH CHECK (true);

CREATE TRIGGER update_integration_queue_updated_at
  BEFORE UPDATE ON public.integration_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_integration_queue_status ON public.integration_queue(status, available_at) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_integration_queue_entity ON public.integration_queue(entity_type, entity_id);
CREATE INDEX idx_integration_queue_priority ON public.integration_queue(priority DESC, created_at ASC) WHERE status = 'pending';

-- 6. INTEGRATION FAILURES
CREATE TABLE public.integration_failures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_id uuid REFERENCES public.integration_queue(id),
  integration_id uuid REFERENCES public.omie_integrations(id),
  entity_type text NOT NULL,
  entity_id text,
  failure_reason text NOT NULL,
  technical_details jsonb,
  provider_response jsonb,
  is_resolved boolean NOT NULL DEFAULT false,
  resolved_by uuid,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read integration_failures" ON public.integration_failures
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage integration_failures" ON public.integration_failures
  FOR ALL TO authenticated
  USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));
CREATE POLICY "Service can insert integration_failures" ON public.integration_failures
  FOR INSERT TO public WITH CHECK (true);

CREATE INDEX idx_integration_failures_unresolved ON public.integration_failures(is_resolved) WHERE is_resolved = false;
CREATE INDEX idx_integration_failures_entity ON public.integration_failures(entity_type, entity_id);

-- 7. INTEGRATION AUDIT EVENTS
CREATE TABLE public.integration_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  integration_id uuid REFERENCES public.omie_integrations(id),
  user_id uuid,
  old_value jsonb,
  new_value jsonb,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_audit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read integration_audit_events" ON public.integration_audit_events
  FOR SELECT TO authenticated USING (is_admin_user(auth.uid()));
CREATE POLICY "Service can insert integration_audit_events" ON public.integration_audit_events
  FOR INSERT TO public WITH CHECK (true);

CREATE INDEX idx_integration_audit_integration ON public.integration_audit_events(integration_id);
CREATE INDEX idx_integration_audit_created ON public.integration_audit_events(created_at DESC);

-- 8. INTEGRATION IDEMPOTENCY KEYS
CREATE TABLE public.integration_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text NOT NULL,
  integration_id uuid REFERENCES public.omie_integrations(id),
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  operation_type text NOT NULL,
  request_hash text,
  response_hash text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  UNIQUE(idempotency_key)
);

ALTER TABLE public.integration_idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read integration_idempotency_keys" ON public.integration_idempotency_keys
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service can insert integration_idempotency_keys" ON public.integration_idempotency_keys
  FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "Service can update integration_idempotency_keys" ON public.integration_idempotency_keys
  FOR UPDATE TO public USING (true) WITH CHECK (true);

CREATE INDEX idx_idempotency_key ON public.integration_idempotency_keys(idempotency_key);
CREATE INDEX idx_idempotency_entity ON public.integration_idempotency_keys(entity_type, entity_id);

-- 9. HELPER FUNCTION: Resolve integration for a PDV
CREATE OR REPLACE FUNCTION public.resolve_omie_integration(_pdv_id uuid, _company_id text DEFAULT NULL, _unit_id text DEFAULT NULL)
RETURNS TABLE(
  integration_id uuid,
  integration_name text,
  environment text,
  resolution_level text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Try PDV-level
  RETURN QUERY
  SELECT oi.id, oi.integration_name, oi.environment, 'pdv'::text
  FROM public.omie_integrations oi
  WHERE oi.pdv_id = _pdv_id AND oi.is_active = true AND oi.inheritance_level = 'pdv'
  ORDER BY oi.priority DESC
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 2. Try binding-level (PDV binding)
  RETURN QUERY
  SELECT oi.id, oi.integration_name, oi.environment, 'pdv_binding'::text
  FROM public.omie_integration_bindings oib
  JOIN public.omie_integrations oi ON oi.id = oib.integration_id
  WHERE oib.pdv_id = _pdv_id AND oi.is_active = true
  ORDER BY oi.priority DESC
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 3. Try unit-level
  IF _unit_id IS NOT NULL THEN
    RETURN QUERY
    SELECT oi.id, oi.integration_name, oi.environment, 'unit'::text
    FROM public.omie_integrations oi
    WHERE oi.unit_id = _unit_id AND oi.is_active = true AND oi.inheritance_level = 'unit'
    ORDER BY oi.priority DESC
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 4. Try company-level
  IF _company_id IS NOT NULL THEN
    RETURN QUERY
    SELECT oi.id, oi.integration_name, oi.environment, 'company'::text
    FROM public.omie_integrations oi
    WHERE oi.company_id = _company_id AND oi.is_active = true AND oi.inheritance_level = 'company'
    ORDER BY oi.priority DESC
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- Nothing found — return empty
  RETURN;
END;
$$;
