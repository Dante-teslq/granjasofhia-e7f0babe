import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OmieIntegration {
  id: string;
  integration_name: string;
  company_id: string | null;
  unit_id: string | null;
  pdv_id: string | null;
  omie_app_key: string;
  omie_app_secret: string;
  environment: string;
  is_active: boolean;
  priority: number;
  inheritance_level: string;
  customers_sync_mode: string;
  products_sync_mode: string;
  orders_sync_mode: string;
  inventory_sync_mode: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // joined
  pdv_nome?: string;
}

export interface IntegrationLog {
  id: string;
  integration_id: string | null;
  correlation_id: string;
  entity_type: string;
  entity_id: string | null;
  operation_type: string;
  execution_status: string;
  error_message: string | null;
  http_status: number | null;
  started_at: string;
  finished_at: string | null;
  retry_count: number;
  created_at: string;
}

export interface IntegrationQueueItem {
  id: string;
  integration_id: string | null;
  entity_type: string;
  entity_id: string;
  operation_type: string;
  status: string;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
  priority: number;
  created_at: string;
}

export interface IntegrationFailure {
  id: string;
  queue_id: string | null;
  integration_id: string | null;
  entity_type: string;
  entity_id: string | null;
  failure_reason: string;
  is_resolved: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  created_at: string;
}

export function useOmieIntegrations() {
  const [integrations, setIntegrations] = useState<OmieIntegration[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [queue, setQueue] = useState<IntegrationQueueItem[]>([]);
  const [failures, setFailures] = useState<IntegrationFailure[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchIntegrations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("omie_integrations")
        .select("*, pontos_de_venda(nome)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setIntegrations(
        (data || []).map((d: any) => ({
          ...d,
          pdv_nome: d.pontos_de_venda?.nome || null,
        }))
      );
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchLogs = useCallback(async (integrationId?: string) => {
    const query = supabase
      .from("integration_logs")
      .select("id, integration_id, correlation_id, entity_type, entity_id, operation_type, execution_status, error_message, http_status, started_at, finished_at, retry_count, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (integrationId) query.eq("integration_id", integrationId);
    const { data } = await query;
    setLogs((data as IntegrationLog[]) || []);
  }, []);

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase
      .from("integration_queue")
      .select("id, integration_id, entity_type, entity_id, operation_type, status, attempt_count, max_attempts, last_error, priority, created_at")
      .in("status", ["pending", "processing", "dead_letter"])
      .order("created_at", { ascending: false })
      .limit(100);
    setQueue((data as IntegrationQueueItem[]) || []);
  }, []);

  const fetchFailures = useCallback(async () => {
    const { data } = await supabase
      .from("integration_failures")
      .select("id, queue_id, integration_id, entity_type, entity_id, failure_reason, is_resolved, resolved_at, resolution_notes, created_at")
      .eq("is_resolved", false)
      .order("created_at", { ascending: false })
      .limit(100);
    setFailures((data as IntegrationFailure[]) || []);
  }, []);

  const createIntegration = useCallback(async (data: Partial<OmieIntegration>) => {
    const { error } = await supabase.from("omie_integrations").insert(data as any);
    if (error) throw error;
    await fetchIntegrations();
  }, [fetchIntegrations]);

  const updateIntegration = useCallback(async (id: string, data: Partial<OmieIntegration>) => {
    const { error } = await supabase.from("omie_integrations").update(data as any).eq("id", id);
    if (error) throw error;
    await fetchIntegrations();
  }, [fetchIntegrations]);

  const deleteIntegration = useCallback(async (id: string) => {
    const { error } = await supabase.from("omie_integrations").delete().eq("id", id);
    if (error) throw error;
    await fetchIntegrations();
  }, [fetchIntegrations]);

  const testConnection = useCallback(async (integrationId: string) => {
    const { data, error } = await supabase.functions.invoke("omie-gateway/test-connection", {
      body: { integration_id: integrationId },
    });
    if (error) throw error;
    return data;
  }, []);

  const retryFailed = useCallback(async (failureId: string) => {
    const { data, error } = await supabase.functions.invoke("omie-gateway/retry-failed", {
      body: { failure_id: failureId },
    });
    if (error) throw error;
    return data;
  }, []);

  return {
    integrations,
    logs,
    queue,
    failures,
    loading,
    fetchIntegrations,
    fetchLogs,
    fetchQueue,
    fetchFailures,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    testConnection,
    retryFailed,
  };
}
