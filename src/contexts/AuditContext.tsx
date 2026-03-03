import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "adjustment";

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
  }) => {
    try {
      const { error } = await supabase.from("audit_logs").insert({
        action: entry.action,
        module: entry.module,
        usuario: entry.usuario,
        item_description: entry.item_description,
        before_data: entry.before_data || null,
        after_data: entry.after_data || null,
        ip: "192.168.1.1",
        device: detectDevice(),
      });
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao registrar log de auditoria:", err);
    }
  }, []);

  return (
    <AuditContext.Provider value={{ logs, loading, addLog, fetchLogs }}>
      {children}
    </AuditContext.Provider>
  );
};
