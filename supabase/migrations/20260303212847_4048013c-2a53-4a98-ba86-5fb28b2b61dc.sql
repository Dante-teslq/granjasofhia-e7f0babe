
-- Create audit_logs table (immutable log)
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  action TEXT NOT NULL, -- create, update, delete
  module TEXT NOT NULL, -- Estoque, Sangrias, Evidências, etc.
  usuario TEXT NOT NULL,
  item_description TEXT NOT NULL DEFAULT '',
  before_data JSONB,
  after_data JSONB,
  ip TEXT DEFAULT '0.0.0.0',
  device TEXT DEFAULT 'Desktop'
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only allow SELECT for anon/authenticated (read-only)
CREATE POLICY "Anyone can read audit logs"
ON public.audit_logs
FOR SELECT
USING (true);

-- Allow INSERT for anon/authenticated (system writes)
CREATE POLICY "Anyone can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (true);

-- NO UPDATE or DELETE policies = immutable

-- Create trigger function for evidencias_perdas auto-logging
CREATE OR REPLACE FUNCTION public.log_evidencias_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, module, usuario, item_description, before_data, after_data)
    VALUES ('create', 'Evidências', NEW.usuario, NEW.tipo_perda || ' x' || NEW.quantidade, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, module, usuario, item_description, before_data, after_data)
    VALUES ('update', 'Evidências', NEW.usuario, NEW.tipo_perda || ' x' || NEW.quantidade, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, module, usuario, item_description, before_data, after_data)
    VALUES ('delete', 'Evidências', OLD.usuario, OLD.tipo_perda || ' x' || OLD.quantidade, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach trigger to evidencias_perdas
CREATE TRIGGER trigger_log_evidencias
AFTER INSERT OR UPDATE OR DELETE ON public.evidencias_perdas
FOR EACH ROW
EXECUTE FUNCTION public.log_evidencias_changes();
