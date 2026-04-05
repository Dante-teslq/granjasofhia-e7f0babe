import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// =============================================
// OMIE GATEWAY — Enterprise Edge Function
// =============================================

const OMIE_API_BASE = "https://app.omie.com.br/api/v1";

// --- Types ---
interface OmieCredentials {
  app_key: string;
  app_secret: string;
  environment: string;
}

interface IntegrationResolution {
  integration_id: string;
  integration_name: string;
  environment: string;
  resolution_level: string;
}

interface OmieApiRequest {
  endpoint: string;
  method: string;
  params: Record<string, unknown>[];
}

// --- Supabase Admin Client ---
function getAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// --- Auth Helper ---
async function authenticateRequest(req: Request): Promise<{ userId: string; email: string }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new HttpError(401, "Token de autenticação não fornecido");
  }

  const token = authHeader.replace("Bearer ", "");

  // Use the admin client to validate the JWT — getUser() is the correct
  // Supabase JS v2 method; getClaims() does not exist in this SDK version.
  const admin = getAdminClient();
  const { data: { user }, error } = await admin.auth.admin.getUser(token);
  if (error || !user) {
    throw new HttpError(401, "Token inválido ou expirado");
  }

  return { userId: user.id, email: user.email || "" };
}

// --- Error Class ---
class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// =============================================
// SERVICE: resolveOmieIntegration
// =============================================
async function resolveOmieIntegration(
  pdvId: string,
  companyId?: string,
  unitId?: string
): Promise<IntegrationResolution> {
  const admin = getAdminClient();

  const { data, error } = await admin.rpc("resolve_omie_integration", {
    _pdv_id: pdvId,
    _company_id: companyId || null,
    _unit_id: unitId || null,
  });

  if (error) throw new HttpError(500, `Erro ao resolver integração: ${error.message}`);
  if (!data || data.length === 0) {
    throw new HttpError(404, `Nenhuma integração Omie ativa encontrada para o PDV ${pdvId}`);
  }

  const row = data[0];
  return {
    integration_id: row.integration_id,
    integration_name: row.integration_name,
    environment: row.environment,
    resolution_level: row.resolution_level,
  };
}

// =============================================
// SERVICE: getOmieCredentials
// =============================================
async function getOmieCredentials(integrationId: string): Promise<OmieCredentials> {
  const admin = getAdminClient();

  const { data, error } = await admin
    .from("omie_integrations")
    .select("omie_app_key, omie_app_secret, environment")
    .eq("id", integrationId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    throw new HttpError(404, "Integração não encontrada ou inativa");
  }

  return {
    app_key: data.omie_app_key,
    app_secret: data.omie_app_secret,
    environment: data.environment,
  };
}

// =============================================
// SERVICE: callOmieApi
// =============================================
async function callOmieApi(
  credentials: OmieCredentials,
  apiRequest: OmieApiRequest
): Promise<{ status: number; data: unknown; rawBody: string }> {
  const url = `${OMIE_API_BASE}/${apiRequest.endpoint}/`;

  const body = JSON.stringify({
    call: apiRequest.method,
    app_key: credentials.app_key,
    app_secret: credentials.app_secret,
    param: apiRequest.params,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const rawBody = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    parsed = { raw: rawBody };
  }

  return { status: response.status, data: parsed, rawBody };
}

// =============================================
// SERVICE: persistIntegrationLog
// =============================================
async function persistIntegrationLog(log: {
  integration_id?: string;
  correlation_id: string;
  entity_type: string;
  entity_id?: string;
  operation_type: string;
  source_module?: string;
  payload_sent?: unknown;
  payload_response?: unknown;
  http_status?: number;
  provider_status?: string;
  execution_status: string;
  error_code?: string;
  error_message?: string;
  started_at: string;
  finished_at?: string;
  triggered_by_user_id?: string;
  triggered_by_context?: string;
  edge_function_name?: string;
  retry_count?: number;
}) {
  const admin = getAdminClient();
  await admin.from("integration_logs").insert(log);
}

// =============================================
// SERVICE: createIdempotencyKey
// =============================================
function generateIdempotencyKey(
  integrationId: string,
  entityType: string,
  entityId: string,
  operationType: string
): string {
  return `${integrationId}:${entityType}:${entityId}:${operationType}`;
}

async function checkIdempotency(key: string): Promise<{ exists: boolean; status?: string }> {
  const admin = getAdminClient();
  const { data } = await admin
    .from("integration_idempotency_keys")
    .select("status")
    .eq("idempotency_key", key)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();

  if (data) return { exists: true, status: data.status };
  return { exists: false };
}

async function registerIdempotencyKey(params: {
  idempotency_key: string;
  integration_id: string;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  request_hash?: string;
  status: string;
}) {
  const admin = getAdminClient();
  await admin.from("integration_idempotency_keys").upsert(params, { onConflict: "idempotency_key" });
}

// =============================================
// SERVICE: computePayloadHash
// =============================================
async function computePayloadHash(payload: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// =============================================
// SERVICE: persistQueueItem
// =============================================
async function persistQueueItem(item: {
  integration_id: string;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  payload_snapshot: unknown;
  priority?: number;
  correlation_id?: string;
}) {
  const admin = getAdminClient();
  const { error } = await admin.from("integration_queue").insert({
    ...item,
    status: "pending",
    correlation_id: item.correlation_id || crypto.randomUUID(),
  });
  if (error) throw new HttpError(500, `Erro ao enfileirar operação: ${error.message}`);
}

// =============================================
// SERVICE: registerRecordMapping
// =============================================
async function registerRecordMapping(
  table: string,
  mapping: {
    integration_id: string;
    local_record_id: string;
    local_record_type: string;
    omie_record_id?: string;
    omie_code?: string;
    sync_status: string;
    last_payload_hash?: string;
    source_of_truth?: string;
  }
) {
  const admin = getAdminClient();
  const { error } = await admin.from(table).upsert(
    { ...mapping, last_sync_at: new Date().toISOString() },
    { onConflict: "integration_id,local_record_id,local_record_type" }
  );
  if (error) throw new HttpError(500, `Erro ao registrar mapeamento: ${error.message}`);
}

// =============================================
// SERVICE: auditIntegrationEvent
// =============================================
async function auditIntegrationEvent(event: {
  event_type: string;
  integration_id?: string;
  user_id?: string;
  old_value?: unknown;
  new_value?: unknown;
  metadata?: unknown;
}) {
  const admin = getAdminClient();
  await admin.from("integration_audit_events").insert(event);
}

// =============================================
// ROUTE HANDLERS
// =============================================

// --- Test Connection ---
async function handleTestConnection(body: Record<string, unknown>, userId: string) {
  const integrationId = body.integration_id as string;
  if (!integrationId) throw new HttpError(400, "integration_id é obrigatório");

  const correlationId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  try {
    const credentials = await getOmieCredentials(integrationId);

    // Simple test: list first page of clients
    const result = await callOmieApi(credentials, {
      endpoint: "geral/clientes",
      method: "ListarClientes",
      params: [{ pagina: 1, registros_por_pagina: 1 }],
    });

    const success = result.status === 200 && !(result.data as any)?.faultstring;

    await persistIntegrationLog({
      integration_id: integrationId,
      correlation_id: correlationId,
      entity_type: "system",
      operation_type: "test_connection",
      payload_sent: { method: "ListarClientes", params: { pagina: 1 } },
      payload_response: result.data,
      http_status: result.status,
      execution_status: success ? "success" : "failed",
      error_message: success ? undefined : (result.data as any)?.faultstring || "Falha na conexão",
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      triggered_by_user_id: userId,
      edge_function_name: "omie-gateway",
    });

    await auditIntegrationEvent({
      event_type: "test_connection",
      integration_id: integrationId,
      user_id: userId,
      new_value: { success, http_status: result.status },
    });

    return {
      success,
      message: success ? "Conexão com Omie estabelecida com sucesso" : "Falha na conexão com Omie",
      details: success
        ? { total_clientes: (result.data as any)?.total_de_registros }
        : { error: (result.data as any)?.faultstring || "Resposta inesperada" },
      correlation_id: correlationId,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
    await persistIntegrationLog({
      integration_id: integrationId,
      correlation_id: correlationId,
      entity_type: "system",
      operation_type: "test_connection",
      execution_status: "failed",
      error_message: errorMsg,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      triggered_by_user_id: userId,
      edge_function_name: "omie-gateway",
    });
    throw err;
  }
}

// --- Resolve Integration ---
async function handleResolveIntegration(body: Record<string, unknown>) {
  const pdvId = body.pdv_id as string;
  if (!pdvId) throw new HttpError(400, "pdv_id é obrigatório");

  const resolution = await resolveOmieIntegration(
    pdvId,
    body.company_id as string | undefined,
    body.unit_id as string | undefined
  );

  return {
    ...resolution,
    message: `Integração resolvida via ${resolution.resolution_level}`,
  };
}

// --- Sync Customer ---
async function handleSyncCustomer(body: Record<string, unknown>, userId: string) {
  const { pdv_id, customer_data, operation } = body as {
    pdv_id: string;
    customer_data: Record<string, unknown>;
    operation: "create" | "update";
  };

  if (!pdv_id || !customer_data) throw new HttpError(400, "pdv_id e customer_data são obrigatórios");

  const resolution = await resolveOmieIntegration(pdv_id);
  const credentials = await getOmieCredentials(resolution.integration_id);
  const correlationId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const entityId = (customer_data.local_id as string) || "";

  // Check idempotency
  const idemKey = generateIdempotencyKey(resolution.integration_id, "customer", entityId, operation || "create");
  const idemCheck = await checkIdempotency(idemKey);
  if (idemCheck.exists && idemCheck.status === "completed") {
    return { success: true, message: "Operação já processada (idempotência)", idempotency_key: idemKey };
  }

  await registerIdempotencyKey({
    idempotency_key: idemKey,
    integration_id: resolution.integration_id,
    entity_type: "customer",
    entity_id: entityId,
    operation_type: operation || "create",
    request_hash: await computePayloadHash(customer_data),
    status: "processing",
  });

  try {
    const omieMethod = operation === "update" ? "AlterarCliente" : "IncluirCliente";
    const result = await callOmieApi(credentials, {
      endpoint: "geral/clientes",
      method: omieMethod,
      params: [customer_data],
    });

    const success = result.status === 200 && !(result.data as any)?.faultstring;
    const omieCode = (result.data as any)?.codigo_cliente_omie?.toString();

    await persistIntegrationLog({
      integration_id: resolution.integration_id,
      correlation_id: correlationId,
      entity_type: "customer",
      entity_id: entityId,
      operation_type: `sync_customer_${operation || "create"}`,
      payload_sent: customer_data,
      payload_response: result.data,
      http_status: result.status,
      execution_status: success ? "success" : "failed",
      error_message: success ? undefined : (result.data as any)?.faultstring,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      triggered_by_user_id: userId,
      edge_function_name: "omie-gateway",
    });

    if (success && entityId) {
      await registerRecordMapping("omie_customer_map", {
        integration_id: resolution.integration_id,
        local_record_id: entityId,
        local_record_type: "customer",
        omie_record_id: omieCode,
        omie_code: omieCode,
        sync_status: "synced",
        last_payload_hash: await computePayloadHash(customer_data),
      });
    }

    await registerIdempotencyKey({
      idempotency_key: idemKey,
      integration_id: resolution.integration_id,
      entity_type: "customer",
      entity_id: entityId,
      operation_type: operation || "create",
      status: success ? "completed" : "failed",
    });

    return {
      success,
      omie_code: omieCode,
      correlation_id: correlationId,
      resolution_level: resolution.resolution_level,
      message: success ? "Cliente sincronizado com sucesso" : (result.data as any)?.faultstring,
    };
  } catch (err: unknown) {
    await registerIdempotencyKey({
      idempotency_key: idemKey,
      integration_id: resolution.integration_id,
      entity_type: "customer",
      entity_id: entityId,
      operation_type: operation || "create",
      status: "failed",
    });
    throw err;
  }
}

// --- Sync Product ---
async function handleSyncProduct(body: Record<string, unknown>, userId: string) {
  const { pdv_id, product_data, operation } = body as {
    pdv_id: string;
    product_data: Record<string, unknown>;
    operation: "create" | "update";
  };

  if (!pdv_id || !product_data) throw new HttpError(400, "pdv_id e product_data são obrigatórios");

  const resolution = await resolveOmieIntegration(pdv_id);
  const credentials = await getOmieCredentials(resolution.integration_id);
  const correlationId = crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const entityId = (product_data.local_id as string) || "";

  const idemKey = generateIdempotencyKey(resolution.integration_id, "product", entityId, operation || "create");
  const idemCheck = await checkIdempotency(idemKey);
  if (idemCheck.exists && idemCheck.status === "completed") {
    return { success: true, message: "Operação já processada (idempotência)", idempotency_key: idemKey };
  }

  await registerIdempotencyKey({
    idempotency_key: idemKey,
    integration_id: resolution.integration_id,
    entity_type: "product",
    entity_id: entityId,
    operation_type: operation || "create",
    request_hash: await computePayloadHash(product_data),
    status: "processing",
  });

  try {
    const omieMethod = operation === "update" ? "AlterarProduto" : "IncluirProduto";
    const result = await callOmieApi(credentials, {
      endpoint: "geral/produtos",
      method: omieMethod,
      params: [product_data],
    });

    const success = result.status === 200 && !(result.data as any)?.faultstring;
    const omieCode = (result.data as any)?.codigo_produto?.toString();

    await persistIntegrationLog({
      integration_id: resolution.integration_id,
      correlation_id: correlationId,
      entity_type: "product",
      entity_id: entityId,
      operation_type: `sync_product_${operation || "create"}`,
      payload_sent: product_data,
      payload_response: result.data,
      http_status: result.status,
      execution_status: success ? "success" : "failed",
      error_message: success ? undefined : (result.data as any)?.faultstring,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      triggered_by_user_id: userId,
      edge_function_name: "omie-gateway",
    });

    if (success && entityId) {
      await registerRecordMapping("omie_product_map", {
        integration_id: resolution.integration_id,
        local_record_id: entityId,
        local_record_type: "product",
        omie_record_id: omieCode,
        omie_code: omieCode,
        sync_status: "synced",
        last_payload_hash: await computePayloadHash(product_data),
      });
    }

    await registerIdempotencyKey({
      idempotency_key: idemKey,
      integration_id: resolution.integration_id,
      entity_type: "product",
      entity_id: entityId,
      operation_type: operation || "create",
      status: success ? "completed" : "failed",
    });

    return {
      success,
      omie_code: omieCode,
      correlation_id: correlationId,
      resolution_level: resolution.resolution_level,
      message: success ? "Produto sincronizado com sucesso" : (result.data as any)?.faultstring,
    };
  } catch (err: unknown) {
    await registerIdempotencyKey({
      idempotency_key: idemKey,
      integration_id: resolution.integration_id,
      entity_type: "product",
      entity_id: entityId,
      operation_type: operation || "create",
      status: "failed",
    });
    throw err;
  }
}

// --- Fetch from Omie ---
async function handleFetchFromOmie(body: Record<string, unknown>, userId: string, entityType: string) {
  const { pdv_id, omie_params } = body as {
    pdv_id: string;
    omie_params: Record<string, unknown>;
  };

  if (!pdv_id) throw new HttpError(400, "pdv_id é obrigatório");

  const resolution = await resolveOmieIntegration(pdv_id);
  const credentials = await getOmieCredentials(resolution.integration_id);
  const correlationId = crypto.randomUUID();
  const startedAt = new Date().toISOString();

  const endpointMap: Record<string, { endpoint: string; method: string }> = {
    customer: { endpoint: "geral/clientes", method: "ListarClientes" },
    product: { endpoint: "geral/produtos", method: "ListarProdutos" },
    order: { endpoint: "produtos/pedido", method: "ListarPedidos" },
    inventory: { endpoint: "estoque/consulta", method: "ListarPosEstoque" },
  };

  const config = endpointMap[entityType];
  if (!config) throw new HttpError(400, `Tipo de entidade inválido: ${entityType}`);

  const result = await callOmieApi(credentials, {
    endpoint: config.endpoint,
    method: config.method,
    params: [omie_params || { pagina: 1, registros_por_pagina: 50 }],
  });

  const success = result.status === 200 && !(result.data as any)?.faultstring;

  await persistIntegrationLog({
    integration_id: resolution.integration_id,
    correlation_id: correlationId,
    entity_type: entityType,
    operation_type: `fetch_${entityType}`,
    payload_sent: omie_params,
    payload_response: result.data,
    http_status: result.status,
    execution_status: success ? "success" : "failed",
    error_message: success ? undefined : (result.data as any)?.faultstring,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    triggered_by_user_id: userId,
    edge_function_name: "omie-gateway",
  });

  return {
    success,
    data: result.data,
    correlation_id: correlationId,
    integration: resolution.integration_name,
    resolution_level: resolution.resolution_level,
  };
}

// --- Enqueue for async processing ---
async function handleEnqueue(body: Record<string, unknown>, userId: string) {
  const { pdv_id, entity_type, entity_id, operation_type, payload } = body as {
    pdv_id: string;
    entity_type: string;
    entity_id: string;
    operation_type: string;
    payload: Record<string, unknown>;
  };

  if (!pdv_id || !entity_type || !entity_id || !operation_type) {
    throw new HttpError(400, "pdv_id, entity_type, entity_id e operation_type são obrigatórios");
  }

  const resolution = await resolveOmieIntegration(pdv_id);

  await persistQueueItem({
    integration_id: resolution.integration_id,
    entity_type,
    entity_id,
    operation_type,
    payload_snapshot: payload || {},
    priority: (body.priority as number) || 0,
  });

  await auditIntegrationEvent({
    event_type: "enqueue_operation",
    integration_id: resolution.integration_id,
    user_id: userId,
    new_value: { entity_type, entity_id, operation_type },
  });

  return { success: true, message: "Operação enfileirada com sucesso" };
}

// --- Process Queue ---
async function handleProcessQueue(userId: string) {
  const admin = getAdminClient();
  const now = new Date().toISOString();

  // Fetch pending items
  const { data: items, error } = await admin
    .from("integration_queue")
    .select("*")
    .eq("status", "pending")
    .lte("available_at", now)
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) throw new HttpError(500, `Erro ao buscar fila: ${error.message}`);
  if (!items || items.length === 0) return { processed: 0, message: "Nenhum item na fila" };

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    // Lock the item
    await admin
      .from("integration_queue")
      .update({ status: "processing", locked_at: now })
      .eq("id", item.id)
      .eq("status", "pending");

    try {
      const credentials = await getOmieCredentials(item.integration_id);
      const correlationId = item.correlation_id || crypto.randomUUID();
      const startedAt = new Date().toISOString();

      // Determine API call based on entity_type and operation_type
      const apiConfig = resolveApiConfig(item.entity_type, item.operation_type);

      const result = await callOmieApi(credentials, {
        endpoint: apiConfig.endpoint,
        method: apiConfig.method,
        params: [item.payload_snapshot],
      });

      const success = result.status === 200 && !(result.data as any)?.faultstring;

      await persistIntegrationLog({
        integration_id: item.integration_id,
        correlation_id: correlationId,
        entity_type: item.entity_type,
        entity_id: item.entity_id,
        operation_type: item.operation_type,
        payload_sent: item.payload_snapshot,
        payload_response: result.data,
        http_status: result.status,
        execution_status: success ? "success" : "failed",
        error_message: success ? undefined : (result.data as any)?.faultstring,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        triggered_by_user_id: userId,
        edge_function_name: "omie-gateway",
        retry_count: item.attempt_count,
      });

      if (success) {
        await admin
          .from("integration_queue")
          .update({ status: "success", processed_at: new Date().toISOString() })
          .eq("id", item.id);
        processed++;
      } else {
        throw new Error((result.data as any)?.faultstring || "Falha no processamento");
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Erro desconhecido";
      const newAttempt = (item.attempt_count || 0) + 1;
      const isDead = newAttempt >= (item.max_attempts || 5);

      // Exponential backoff: 30s, 2min, 8min, 32min, 2h
      const backoffSeconds = Math.pow(4, newAttempt - 1) * 30;
      const nextAvailable = new Date(Date.now() + backoffSeconds * 1000).toISOString();

      await admin
        .from("integration_queue")
        .update({
          status: isDead ? "dead_letter" : "pending",
          attempt_count: newAttempt,
          last_error: errorMsg,
          locked_at: null,
          available_at: isDead ? undefined : nextAvailable,
        })
        .eq("id", item.id);

      if (isDead) {
        await admin.from("integration_failures").insert({
          queue_id: item.id,
          integration_id: item.integration_id,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          failure_reason: `Máximo de tentativas atingido (${item.max_attempts || 5})`,
          technical_details: { last_error: errorMsg, attempts: newAttempt },
        });
      }

      failed++;
    }
  }

  return { processed, failed, total: items.length, message: `Processados: ${processed}, Falhas: ${failed}` };
}

// --- Retry Failed ---
async function handleRetryFailed(body: Record<string, unknown>, userId: string) {
  const { queue_id, failure_id } = body as { queue_id?: string; failure_id?: string };

  if (!queue_id && !failure_id) throw new HttpError(400, "queue_id ou failure_id é obrigatório");

  const admin = getAdminClient();

  if (failure_id) {
    // Resolve failure and reset queue item
    const { data: failure } = await admin
      .from("integration_failures")
      .select("queue_id")
      .eq("id", failure_id)
      .single();

    if (!failure) throw new HttpError(404, "Falha não encontrada");

    await admin
      .from("integration_failures")
      .update({ is_resolved: true, resolved_by: userId, resolved_at: new Date().toISOString(), resolution_notes: "Reenvio manual" })
      .eq("id", failure_id);

    await admin
      .from("integration_queue")
      .update({ status: "pending", attempt_count: 0, locked_at: null, available_at: new Date().toISOString() })
      .eq("id", failure.queue_id);
  } else if (queue_id) {
    await admin
      .from("integration_queue")
      .update({ status: "pending", attempt_count: 0, locked_at: null, available_at: new Date().toISOString() })
      .eq("id", queue_id);
  }

  await auditIntegrationEvent({
    event_type: "retry_operation",
    user_id: userId,
    new_value: { queue_id, failure_id },
  });

  return { success: true, message: "Operação reenfileirada para reprocessamento" };
}

// --- Helper: resolve API config from entity/operation ---
function resolveApiConfig(entityType: string, operationType: string): { endpoint: string; method: string } {
  const configs: Record<string, Record<string, { endpoint: string; method: string }>> = {
    customer: {
      create: { endpoint: "geral/clientes", method: "IncluirCliente" },
      update: { endpoint: "geral/clientes", method: "AlterarCliente" },
      fetch: { endpoint: "geral/clientes", method: "ListarClientes" },
    },
    product: {
      create: { endpoint: "geral/produtos", method: "IncluirProduto" },
      update: { endpoint: "geral/produtos", method: "AlterarProduto" },
      fetch: { endpoint: "geral/produtos", method: "ListarProdutos" },
    },
    order: {
      create: { endpoint: "produtos/pedido", method: "IncluirPedido" },
      update: { endpoint: "produtos/pedido", method: "AlterarPedidoVenda" },
      fetch: { endpoint: "produtos/pedido", method: "ListarPedidos" },
    },
    inventory: {
      fetch: { endpoint: "estoque/consulta", method: "ListarPosEstoque" },
      sync: { endpoint: "estoque/ajuste", method: "IncluirAjusteEstoque" },
    },
  };

  const entityConfigs = configs[entityType];
  if (!entityConfigs) throw new HttpError(400, `Tipo de entidade não suportado: ${entityType}`);

  const config = entityConfigs[operationType];
  if (!config) throw new HttpError(400, `Operação '${operationType}' não suportada para ${entityType}`);

  return config;
}

// =============================================
// MAIN ROUTER
// =============================================
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.split("/").filter(Boolean);
    const route = path[path.length - 1] || "";

    // Authenticate
    const { userId } = await authenticateRequest(req);

    // Parse body
    let body: Record<string, unknown> = {};
    if (req.method === "POST") {
      body = await req.json();
    }

    let result: unknown;

    switch (route) {
      case "test-connection":
        result = await handleTestConnection(body, userId);
        break;
      case "resolve-integration":
        result = await handleResolveIntegration(body);
        break;
      case "sync-customer":
        result = await handleSyncCustomer(body, userId);
        break;
      case "sync-product":
        result = await handleSyncProduct(body, userId);
        break;
      case "fetch-customer":
        result = await handleFetchFromOmie(body, userId, "customer");
        break;
      case "fetch-product":
        result = await handleFetchFromOmie(body, userId, "product");
        break;
      case "fetch-order":
        result = await handleFetchFromOmie(body, userId, "order");
        break;
      case "fetch-inventory":
        result = await handleFetchFromOmie(body, userId, "inventory");
        break;
      case "enqueue":
        result = await handleEnqueue(body, userId);
        break;
      case "process-queue":
        result = await handleProcessQueue(userId);
        break;
      case "retry-failed":
        result = await handleRetryFailed(body, userId);
        break;
      default:
        throw new HttpError(404, `Rota não encontrada: ${route}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err: unknown) {
    const status = err instanceof HttpError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Erro interno do servidor";

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
