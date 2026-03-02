
-- Create table for loss evidence records
CREATE TABLE public.evidencias_perdas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  ponto_de_venda TEXT NOT NULL,
  tipo_perda TEXT NOT NULL CHECK (tipo_perda IN ('Quebrado', 'Trincado')),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  usuario TEXT NOT NULL,
  justificativa TEXT NOT NULL,
  foto_url TEXT NOT NULL,
  foto_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evidencias_perdas ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to insert
CREATE POLICY "Authenticated users can insert evidence"
ON public.evidencias_perdas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow all authenticated users to read
CREATE POLICY "Authenticated users can read evidence"
ON public.evidencias_perdas
FOR SELECT
TO authenticated
USING (true);

-- Also allow anon for demo purposes (no auth setup yet)
CREATE POLICY "Anon can insert evidence"
ON public.evidencias_perdas
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Anon can read evidence"
ON public.evidencias_perdas
FOR SELECT
TO anon
USING (true);

-- Create storage bucket for evidence photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('evidencias', 'evidencias', true);

-- Allow public read access to evidence photos
CREATE POLICY "Public read access for evidencias"
ON storage.objects
FOR SELECT
USING (bucket_id = 'evidencias');

-- Allow anyone to upload evidence photos
CREATE POLICY "Anyone can upload evidencias"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'evidencias');
