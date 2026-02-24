import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { format } from "date-fns";

export type AuditAction = "create" | "update" | "adjustment";

export interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: AuditAction;
  module: string;
  produto: string;
  antes: string;
  depois: string;
  ip: string;
  device: string;
}

interface AuditContextData {
  logs: AuditEntry[];
  addLog: (entry: Omit<AuditEntry, "id" | "timestamp" | "ip" | "device">) => void;
  getLogsInRange: (from: Date, to: Date) => AuditEntry[];
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

  const addLog = useCallback((entry: Omit<AuditEntry, "id" | "timestamp" | "ip" | "device">) => {
    const newEntry: AuditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: format(new Date(), "dd/MM/yyyy HH:mm:ss"),
      ip: "192.168.1.1",
      device: detectDevice(),
    };
    // Logs are append-only — no edit or delete exposed
    setLogs((prev) => [newEntry, ...prev]);
  }, []);

  const getLogsInRange = useCallback((from: Date, to: Date): AuditEntry[] => {
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    return logs.filter((log) => {
      // Parse dd/MM/yyyy from timestamp
      const parts = log.timestamp.split(" ")[0].split("/");
      const logDateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      return logDateStr >= fromStr && logDateStr <= toStr;
    });
  }, [logs]);

  return (
    <AuditContext.Provider value={{ logs, addLog, getLogsInRange }}>
      {children}
    </AuditContext.Provider>
  );
};
