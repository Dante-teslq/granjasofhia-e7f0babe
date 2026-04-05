-- Seed PDVs: Rota Timon, Rota Externo, Depósito Sofhia
INSERT INTO public.pontos_de_venda (nome, tipo, permite_venda, status)
SELECT 'Rota Timon', 'rota', true, 'ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.pontos_de_venda WHERE nome = 'Rota Timon');

INSERT INTO public.pontos_de_venda (nome, tipo, permite_venda, status)
SELECT 'Rota Externo', 'rota', true, 'ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.pontos_de_venda WHERE nome = 'Rota Externo');

INSERT INTO public.pontos_de_venda (nome, tipo, permite_venda, status)
SELECT 'Depósito Sofhia', 'deposito', false, 'ativo'
WHERE NOT EXISTS (SELECT 1 FROM public.pontos_de_venda WHERE nome = 'Depósito Sofhia');
