
-- Function to recalculate vendas_registros from vendas_diarias
CREATE OR REPLACE FUNCTION public.sync_vendas_diarias_to_registros()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ponto_venda text;
  _ano integer;
  _mes integer;
  _total numeric;
BEGIN
  -- Determine which ponto_venda/date to recalculate
  IF TG_OP = 'DELETE' THEN
    _ponto_venda := OLD.ponto_venda;
    _ano := EXTRACT(YEAR FROM OLD.data);
    _mes := EXTRACT(MONTH FROM OLD.data);
  ELSE
    _ponto_venda := NEW.ponto_venda;
    _ano := EXTRACT(YEAR FROM NEW.data);
    _mes := EXTRACT(MONTH FROM NEW.data);
  END IF;

  -- Calculate total quantidade for that PDV/year/month
  SELECT COALESCE(SUM(quantidade), 0) INTO _total
  FROM public.vendas_diarias
  WHERE ponto_venda = _ponto_venda
    AND EXTRACT(YEAR FROM data) = _ano
    AND EXTRACT(MONTH FROM data) = _mes;

  -- Upsert into vendas_registros
  INSERT INTO public.vendas_registros (ponto_venda, ano, mes, total_calculado, usuario)
  VALUES (_ponto_venda, _ano, _mes, _total, 'Sistema')
  ON CONFLICT (ponto_venda, ano, mes)
  DO UPDATE SET total_calculado = _total, updated_at = now();

  -- Also handle the old record if ponto_venda or date changed on UPDATE
  IF TG_OP = 'UPDATE' AND (OLD.ponto_venda != NEW.ponto_venda OR OLD.data != NEW.data) THEN
    SELECT COALESCE(SUM(quantidade), 0) INTO _total
    FROM public.vendas_diarias
    WHERE ponto_venda = OLD.ponto_venda
      AND EXTRACT(YEAR FROM data) = EXTRACT(YEAR FROM OLD.data)
      AND EXTRACT(MONTH FROM data) = EXTRACT(MONTH FROM OLD.data);

    INSERT INTO public.vendas_registros (ponto_venda, ano, mes, total_calculado, usuario)
    VALUES (OLD.ponto_venda, EXTRACT(YEAR FROM OLD.data)::integer, EXTRACT(MONTH FROM OLD.data)::integer, _total, 'Sistema')
    ON CONFLICT (ponto_venda, ano, mes)
    DO UPDATE SET total_calculado = _total, updated_at = now();
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on vendas_diarias
CREATE TRIGGER trg_sync_vendas_to_registros
AFTER INSERT OR UPDATE OR DELETE ON public.vendas_diarias
FOR EACH ROW EXECUTE FUNCTION public.sync_vendas_diarias_to_registros();
