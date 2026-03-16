import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addToSyncQueue } from "@/lib/offlineSync";
import { logSystemError } from "@/lib/systemLogger";

export type AuditAction = "create" | "update" | "delete" | "adjustment" | "login" | "logout";

export interface AuditEntry {
  id: string;
  created_at: string;
  action: string;
  module: string;
  usuario: string;
  item_description: string;
  before_data: any;
  after_data: any;
  ip: string;
  device: string;
  user_id?: string;
  entity?: string;
  record_id?: string;
  user_agent?: string;
}

interface AuditContextData {
  logs: AuditEntry[];
  loading: boolean;
  addLog: (entry: {
    action: AuditAction;
    module: string;
    usuario: string;
    item_description: string;
    before_data?: any;
    after_data?: any;
    entity?: string;
    record_id?: string;
    user_id?: string;
  }) => Promise<void>;
  fetchLogs: (from?: Date, to?: Date) => Promise<void>;
}

const AuditContext = createContext<AuditContextData | null>(null);

export const useAudit = () => {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error("useAudit must be used within AuditProvider");
  return ctx;
};

const detectDevice = (): string => {
  const ua = navigator.userAgent;
  if (/Mobi|Android/i.test(ua)) return "Mobile";
  if (/Tablet|iPad/i.test(ua)) return "Tablet";
  return "Desktop";
};

export const AuditProvider = ({ children }: { children: ReactNode }) => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async (from?: Date, to?: Date) => {
    setLoading(true);
    try {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (from) {
        query = query.gte("created_at", from.toISOString());
      }
      if (to) {
        const endOfDay = new Date(to);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs((data as AuditEntry[]) || []);
    } catch (err) {
      console.error("Erro ao carregar logs de auditoria:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const addLog = useCallback(async (entry: {
    action: AuditAction;
    module: string;
    usuario: string;
    item_description: string;
    before_data?: any;
    after_data?: any;
    entity?: string;
    record_id?: string;
    user_id?: string;
  }) => {
    const row = {
      action: entry.action,
      module: entry.module,
      usuario: entry.usuario,
      item_description: entry.item_description,
      before_data: entry.before_data || null,
      after_data: entry.after_data || null,
      ip: "0.0.0.0",
      device: detectDevice(),
      user_id: entry.user_id || null,
      entity: entry.entity || "",
      record_id: entry.record_id || null,
      user_agent: navigator.userAgent.slice(0, 255),
    };

    try {
      const { error } = await supabase.from("audit_logs").insert(row);
      if (error) throw error;
    } catch (err: any) {
      console.error("Erro ao registrar log de auditoria:", err);
      // Fallback: queue for offline sync
      try {
        await addToSyncQueue({ table: "audit_logs", action: "insert", payload: row });
      } catch (queueErr) {
        await logSystemError("AuditContext", "Falha ao enfileirar log offline", { row, error: err?.message });
      }
    }
  }, []);

  return (
    <AuditContext.Provider value={{ logs, loading, addLog, fetchLogs }}>
      {children}
    </AuditContext.Provider>
  );
};
