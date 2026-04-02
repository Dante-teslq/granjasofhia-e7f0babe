
# Plano de Integração Omie — Enterprise-Grade

Devido à escala do projeto, a implementação será dividida em **4 fases** sequenciais. Cada fase será entregue completa antes de iniciar a próxima.

---

## FASE 1 — Fundação (Banco + Infraestrutura Core)

### 1.1 Migração de banco — Tabelas estruturais
- `omie_integrations` — cadastro de integrações Omie (app_key/secret criptografados, environment, herança company/unit/pdv)
- `omie_integration_bindings` — vínculos explícitos integração ↔ PDV/unidade/empresa
- `omie_customer_map`, `omie_product_map`, `omie_order_map`, `omie_inventory_map` — mapeamentos local ↔ Omie
- `integration_logs` — logs completos por operação
- `integration_queue` — fila de processamento assíncrono com dead-letter
- `integration_failures` — falhas detalhadas
- `integration_audit_events` — auditoria de mudanças administrativas
- `integration_idempotency_keys` — controle anti-duplicidade
- RLS policies restritivas (admin-only para integrações, PDV-scoped para operacional)
- Índices otimizados para queries por status, entidade e integração

### 1.2 Edge Functions — Serviços base
- `omie-gateway/index.ts` — Edge Function única com roteamento interno, contendo:
  - `resolveOmieIntegration()` — resolução automática PDV → unit → company
  - `getOmieCredentials()` — busca segura de credenciais via service role
  - `callOmieApi()` — chamada HTTP padronizada à API Omie
  - `persistIntegrationLog()` — registro de log
  - `createIdempotencyKey()` / `comparePayloadHash()` — anti-duplicidade
  - `validateSyncPreconditions()` — validações pré-envio
  - Rotas: `test-connection`, `resolve-integration`

---

## FASE 2 — Fluxos de Sync (Clientes + Produtos)

### 2.1 Edge Functions de sync
- Rotas no `omie-gateway`: `sync-customer`, `fetch-customer`, `sync-product`, `fetch-product`
- Lógica de create/update com verificação de mapeamento
- Persistência de logs, mapeamentos e idempotency keys
- Tratamento de erros técnicos e funcionais

### 2.2 Processamento de fila
- Rota `process-queue` — worker que busca itens pendentes e processa
- Retry com backoff exponencial
- Dead-letter queue para falhas persistentes
- Rota `retry-failed-sync` — reprocessamento manual

---

## FASE 3 — Fluxos de Sync (Pedidos + Estoque) + Reconciliação

### 3.1 Edge Functions adicionais
- Rotas: `sync-order`, `fetch-order`, `sync-inventory`, `fetch-inventory`
- `reconcile-record` — reconciliação manual de conflitos

### 3.2 Expansão da fila
- Suporte a modos sync/async configuráveis por entidade e integração

---

## FASE 4 — Painel Administrativo + Status Operacional no Frontend

### 4.1 Painel administrativo (`/integracoes`)
- Cadastro/edição/ativação de integrações Omie
- Vinculação a PDVs/unidades
- Teste de conexão com feedback visual
- Visualização de logs, fila, falhas e mapeamentos
- Cards de resumo (sucesso/falha/pendente)
- Botões de reprocessar e reconciliar
- Indicação visual de ambiente (produção/sandbox)

### 4.2 Status de sync no frontend operacional
- Badge de status por registro (sincronizado, pendente, erro, etc.)
- Data da última tentativa, integração usada, código Omie
- Ação de reenvio quando permitido

### 4.3 Sidebar e rotas
- Nova entrada "Integrações" na sidebar (admin-only)
- Rota protegida por permissão

---

## Notas técnicas
- **Credenciais**: app_key e app_secret serão armazenados na tabela `omie_integrations` com acesso restrito via RLS (apenas service role / admin). As Edge Functions acessam via service role key.
- **Segurança**: Frontend nunca toca na API Omie. Tudo passa por Edge Functions autenticadas.
- **Escalabilidade**: Estrutura preparada para novos ERPs (campo `provider` nas tabelas) e novos módulos sem retrabalho.

---

**Aguardo sua aprovação para iniciar pela Fase 1.**
