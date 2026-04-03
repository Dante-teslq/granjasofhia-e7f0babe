
ALTER TABLE public.omie_contas ADD CONSTRAINT omie_contas_app_key_unique UNIQUE (omie_app_key);
ALTER TABLE public.omie_reconciliacao ADD CONSTRAINT omie_reconciliacao_conta_data_produto_unique UNIQUE (omie_conta_id, data, produto_codigo);
