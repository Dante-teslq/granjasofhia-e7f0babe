
-- Create the updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Table for sales records
CREATE TABLE public.vendas_registros (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ponto_venda text NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL CHECK (mes >= 1 AND mes <= 12),
  total_calculado numeric NOT NULL DEFAULT 0,
  dados_customizados jsonb DEFAULT '{}'::jsonb,
  usuario text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(ponto_venda, ano, mes)
);

-- Enable RLS
ALTER TABLE public.vendas_registros ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can read vendas" ON public.vendas_registros FOR SELECT USING (true);
CREATE POLICY "Anyone can insert vendas" ON public.vendas_registros FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update vendas" ON public.vendas_registros FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete vendas" ON public.vendas_registros FOR DELETE USING (true);

-- Updated_at trigger
CREATE TRIGGER update_vendas_registros_updated_at
  BEFORE UPDATE ON public.vendas_registros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger
CREATE OR REPLACE FUNCTION public.log_vendas_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (action, module, usuario, item_description, before_data, after_data)
    VALUES ('create', 'Apuração', COALESCE(NEW.usuario, 'Sistema'), NEW.ponto_venda || ' ' || NEW.mes || '/' || NEW.ano || ' = ' || NEW.total_calculado, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (action, module, usuario, item_description, before_data, after_data)
    VALUES ('update', 'Apuração', COALESCE(NEW.usuario, 'Sistema'), NEW.ponto_venda || ' ' || NEW.mes || '/' || NEW.ano || ' = ' || NEW.total_calculado, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (action, module, usuario, item_description, before_data, after_data)
    VALUES ('delete', 'Apuração', COALESCE(OLD.usuario, 'Sistema'), OLD.ponto_venda || ' ' || OLD.mes || '/' || OLD.ano, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_log_vendas
  AFTER INSERT OR UPDATE OR DELETE ON public.vendas_registros
  FOR EACH ROW EXECUTE FUNCTION public.log_vendas_changes();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendas_registros;

-- Seed existing static data
INSERT INTO public.vendas_registros (ponto_venda, ano, mes, total_calculado) VALUES
('CEASA Timon', 2022, 1, 1676), ('CEASA Timon', 2022, 2, 1729), ('CEASA Timon', 2022, 3, 1951), ('CEASA Timon', 2022, 4, 1831), ('CEASA Timon', 2022, 5, 1649), ('CEASA Timon', 2022, 6, 1634), ('CEASA Timon', 2022, 7, 1735), ('CEASA Timon', 2022, 8, 1681), ('CEASA Timon', 2022, 9, 1669.5), ('CEASA Timon', 2022, 10, 1715), ('CEASA Timon', 2022, 11, 1715.5), ('CEASA Timon', 2022, 12, 1804),
('CEASA Timon', 2023, 1, 1712), ('CEASA Timon', 2023, 2, 1781), ('CEASA Timon', 2023, 3, 1950), ('CEASA Timon', 2023, 4, 1711.5), ('CEASA Timon', 2023, 5, 1574.5), ('CEASA Timon', 2023, 6, 1509), ('CEASA Timon', 2023, 7, 1549.5), ('CEASA Timon', 2023, 8, 1529.5), ('CEASA Timon', 2023, 9, 1531), ('CEASA Timon', 2023, 10, 1555), ('CEASA Timon', 2023, 11, 1470), ('CEASA Timon', 2023, 12, 1565),
('CEASA Timon', 2024, 1, 1567), ('CEASA Timon', 2024, 2, 1738.5), ('CEASA Timon', 2024, 3, 1936), ('CEASA Timon', 2024, 4, 1515), ('CEASA Timon', 2024, 5, 1645.5), ('CEASA Timon', 2024, 6, 1608), ('CEASA Timon', 2024, 7, 1601), ('CEASA Timon', 2024, 8, 1601.5), ('CEASA Timon', 2024, 9, 1445), ('CEASA Timon', 2024, 10, 1651), ('CEASA Timon', 2024, 11, 1570), ('CEASA Timon', 2024, 12, 1755.5),
('CEASA Timon', 2025, 1, 1788), ('CEASA Timon', 2025, 2, 1567.5), ('CEASA Timon', 2025, 3, 1869), ('CEASA Timon', 2025, 4, 1862), ('CEASA Timon', 2025, 5, 1672), ('CEASA Timon', 2025, 6, 1462), ('CEASA Timon', 2025, 7, 1603), ('CEASA Timon', 2025, 8, 1609), ('CEASA Timon', 2025, 9, 1502.75), ('CEASA Timon', 2025, 10, 1650.5),
('Formosa', 2022, 1, 828.5), ('Formosa', 2022, 2, 824), ('Formosa', 2022, 3, 1026), ('Formosa', 2022, 4, 950), ('Formosa', 2022, 5, 792.5), ('Formosa', 2022, 6, 886), ('Formosa', 2022, 7, 816), ('Formosa', 2022, 8, 769.5), ('Formosa', 2022, 9, 777), ('Formosa', 2022, 10, 829), ('Formosa', 2022, 11, 768), ('Formosa', 2022, 12, 802),
('Formosa', 2023, 1, 775), ('Formosa', 2023, 2, 763), ('Formosa', 2023, 3, 978), ('Formosa', 2023, 4, 897), ('Formosa', 2023, 5, 726.5), ('Formosa', 2023, 6, 714), ('Formosa', 2023, 7, 687), ('Formosa', 2023, 8, 684.5), ('Formosa', 2023, 9, 674.5), ('Formosa', 2023, 10, 659), ('Formosa', 2023, 11, 762), ('Formosa', 2023, 12, 802),
('Formosa', 2024, 1, 707), ('Formosa', 2024, 2, 793), ('Formosa', 2024, 3, 869), ('Formosa', 2024, 4, 674.5), ('Formosa', 2024, 5, 741), ('Formosa', 2024, 6, 755), ('Formosa', 2024, 7, 772.5), ('Formosa', 2024, 8, 744.5), ('Formosa', 2024, 9, 648.5), ('Formosa', 2024, 10, 685.5), ('Formosa', 2024, 11, 703), ('Formosa', 2024, 12, 697.5),
('Formosa', 2025, 1, 786), ('Formosa', 2025, 2, 712), ('Formosa', 2025, 3, 748), ('Formosa', 2025, 4, 788.5), ('Formosa', 2025, 5, 717), ('Formosa', 2025, 6, 638), ('Formosa', 2025, 7, 679.5), ('Formosa', 2025, 8, 728), ('Formosa', 2025, 9, 678.5), ('Formosa', 2025, 10, 761),
('Parque Alvorada', 2022, 2, 134), ('Parque Alvorada', 2022, 3, 233), ('Parque Alvorada', 2022, 4, 296.5), ('Parque Alvorada', 2022, 5, 292), ('Parque Alvorada', 2022, 6, 360), ('Parque Alvorada', 2022, 7, 465.5), ('Parque Alvorada', 2022, 8, 439.5), ('Parque Alvorada', 2022, 9, 435.5), ('Parque Alvorada', 2022, 10, 447), ('Parque Alvorada', 2022, 11, 432), ('Parque Alvorada', 2022, 12, 433.5),
('Parque Alvorada', 2023, 1, 475), ('Parque Alvorada', 2023, 2, 508), ('Parque Alvorada', 2023, 3, 567), ('Parque Alvorada', 2023, 4, 558), ('Parque Alvorada', 2023, 5, 496.5), ('Parque Alvorada', 2023, 6, 485), ('Parque Alvorada', 2023, 7, 514), ('Parque Alvorada', 2023, 8, 490.5), ('Parque Alvorada', 2023, 9, 507), ('Parque Alvorada', 2023, 10, 518), ('Parque Alvorada', 2023, 11, 534), ('Parque Alvorada', 2023, 12, 783),
('Parque Alvorada', 2024, 1, 707), ('Parque Alvorada', 2024, 2, 705), ('Parque Alvorada', 2024, 3, 788.5), ('Parque Alvorada', 2024, 4, 628.5), ('Parque Alvorada', 2024, 5, 723), ('Parque Alvorada', 2024, 6, 685), ('Parque Alvorada', 2024, 7, 643), ('Parque Alvorada', 2024, 8, 651), ('Parque Alvorada', 2024, 9, 602), ('Parque Alvorada', 2024, 10, 650), ('Parque Alvorada', 2024, 11, 706), ('Parque Alvorada', 2024, 12, 771),
('Parque Alvorada', 2025, 1, 868), ('Parque Alvorada', 2025, 2, 790), ('Parque Alvorada', 2025, 3, 866), ('Parque Alvorada', 2025, 4, 875.5), ('Parque Alvorada', 2025, 5, 875.5), ('Parque Alvorada', 2025, 6, 875.5), ('Parque Alvorada', 2025, 7, 803.5), ('Parque Alvorada', 2025, 8, 785), ('Parque Alvorada', 2025, 9, 718.5), ('Parque Alvorada', 2025, 10, 844.5),
('São Benedito', 2023, 5, 174.5), ('São Benedito', 2023, 6, 284), ('São Benedito', 2023, 7, 344), ('São Benedito', 2023, 8, 365.5), ('São Benedito', 2023, 9, 411), ('São Benedito', 2023, 10, 478), ('São Benedito', 2023, 11, 476.5), ('São Benedito', 2023, 12, 535),
('São Benedito', 2024, 1, 598), ('São Benedito', 2024, 2, 612), ('São Benedito', 2024, 3, 706), ('São Benedito', 2024, 4, 534.5), ('São Benedito', 2024, 5, 616), ('São Benedito', 2024, 6, 614.5), ('São Benedito', 2024, 7, 634), ('São Benedito', 2024, 8, 536), ('São Benedito', 2024, 9, 550), ('São Benedito', 2024, 10, 557), ('São Benedito', 2024, 11, 591), ('São Benedito', 2024, 12, 608.5),
('São Benedito', 2025, 1, 657.5), ('São Benedito', 2025, 2, 564), ('São Benedito', 2025, 3, 623), ('São Benedito', 2025, 4, 634), ('São Benedito', 2025, 5, 531), ('São Benedito', 2025, 6, 540), ('São Benedito', 2025, 7, 571.5), ('São Benedito', 2025, 8, 570), ('São Benedito', 2025, 9, 545.5), ('São Benedito', 2025, 10, 618),
('Sofhia Balcão', 2022, 1, 1264), ('Sofhia Balcão', 2022, 2, 1132), ('Sofhia Balcão', 2022, 3, 1379), ('Sofhia Balcão', 2022, 4, 1147.5), ('Sofhia Balcão', 2022, 5, 1173.5), ('Sofhia Balcão', 2022, 6, 1272.5), ('Sofhia Balcão', 2022, 7, 1023.5), ('Sofhia Balcão', 2022, 8, 1038), ('Sofhia Balcão', 2022, 9, 1021.5), ('Sofhia Balcão', 2022, 10, 1042), ('Sofhia Balcão', 2022, 11, 1081), ('Sofhia Balcão', 2022, 12, 972),
('Sofhia Balcão', 2023, 1, 1147), ('Sofhia Balcão', 2023, 2, 1105), ('Sofhia Balcão', 2023, 3, 1460), ('Sofhia Balcão', 2023, 4, 1336.5), ('Sofhia Balcão', 2023, 5, 962.5), ('Sofhia Balcão', 2023, 6, 909.5), ('Sofhia Balcão', 2023, 7, 876.5), ('Sofhia Balcão', 2023, 8, 859), ('Sofhia Balcão', 2023, 9, 904.5), ('Sofhia Balcão', 2023, 10, 851.5), ('Sofhia Balcão', 2023, 11, 839), ('Sofhia Balcão', 2023, 12, 895),
('Sofhia Balcão', 2024, 1, 999), ('Sofhia Balcão', 2024, 2, 1097), ('Sofhia Balcão', 2024, 3, 1321), ('Sofhia Balcão', 2024, 4, 896), ('Sofhia Balcão', 2024, 5, 1152),
('Sofhia Balcão', 2025, 1, 1253), ('Sofhia Balcão', 2025, 2, 1285), ('Sofhia Balcão', 2025, 3, 1584.5), ('Sofhia Balcão', 2025, 4, 1408), ('Sofhia Balcão', 2025, 5, 1159), ('Sofhia Balcão', 2025, 6, 1101), ('Sofhia Balcão', 2025, 7, 1275.5), ('Sofhia Balcão', 2025, 8, 1101.42);
