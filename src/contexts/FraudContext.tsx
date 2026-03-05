import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { format } from "date-fns";

export type FraudAlertType =
  | "ajuste_elevado"
  | "fora_horario"
  | "frequencia_anormal"
  | "multiplas_alteracoes"
  | "comportamento_atipico";

export type FraudSeverity = "baixa" | "média" | "crítica";
export type FraudStatus = "ativo" | "analisado" | "resolvido";

export interface FraudAlert {
  id: string;
  type: FraudAlertType;
  severity: FraudSeverity;
  status: FraudStatus;
  message: string;
  operator: string;
  timestamp: string;
  link: string;
  analyst?: string;
  observation?: string;
  details?: Record<string, any>;
}

export interface UserRiskProfile {
  user: string;
  totalAdjustments: number;
  highAdjustments: number;
  afterHoursOps: number;
  multiEditCount: number;
  riskScore: number; // 0-100
  riskLevel: "baixo" | "médio" | "alto" | "crítico";
}

export interface FraudSettings {
  adjustmentThresholdPercent: number; // alert if adjustment > X% of stock
  maxAdjustmentsPerHour: number;
  maxEditsPerRecord: number;
}

interface FraudContextData {
  alerts: FraudAlert[];
  addAlert: (alert: Omit<FraudAlert, "id" | "timestamp">) => void;
  updateAlertStatus: (id: string, status: FraudStatus, analyst?: string, observation?: string) => void;
  userRiskProfiles: UserRiskProfile[];
  updateRiskProfile: (user: string, event: Partial<Pick<UserRiskProfile, "totalAdjustments" | "highAdjustments" | "afterHoursOps" | "multiEditCount">>) => void;
  fraudSettings: FraudSettings;
  updateFraudSettings: (s: Partial<FraudSettings>) => void;
  getAlertsInRange: (from: Date, to: Date) => FraudAlert[];
}

const FraudContext = createContext<FraudContextData | null>(null);

export const useFraud = () => {
  const ctx = useContext(FraudContext);
  if (!ctx) throw new Error("useFraud must be used within FraudProvider");
  return ctx;
};

const calcRiskLevel = (score: number): UserRiskProfile["riskLevel"] => {
  if (score >= 75) return "crítico";
  if (score >= 50) return "alto";
  if (score >= 25) return "médio";
  return "baixo";
};

const calcRiskScore = (p: Omit<UserRiskProfile, "riskScore" | "riskLevel">): number => {
  // Weighted score: high adjustments (30), after hours (25), multi edits (25), total (20)
  const s =
    Math.min(p.highAdjustments * 15, 30) +
    Math.min(p.afterHoursOps * 12, 25) +
    Math.min(p.multiEditCount * 8, 25) +
    Math.min(p.totalAdjustments * 2, 20);
  return Math.min(s, 100);
};

export const FraudProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [userRiskProfiles, setUserRiskProfiles] = useState<UserRiskProfile[]>([]);
  const [fraudSettings, setFraudSettings] = useState<FraudSettings>(() => {
    const saved = localStorage.getItem("fraudSettings");
    return saved ? JSON.parse(saved) : { adjustmentThresholdPercent: 5, maxAdjustmentsPerHour: 5, maxEditsPerRecord: 3 };
  });

  const addAlert = useCallback((alert: Omit<FraudAlert, "id" | "timestamp">) => {
    const newAlert: FraudAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: format(new Date(), "dd/MM/yyyy HH:mm"),
    };
    setAlerts((prev) => [newAlert, ...prev]);
  }, []);

  const updateAlertStatus = useCallback((id: string, status: FraudStatus, analyst?: string, observation?: string) => {
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status, ...(analyst && { analyst }), ...(observation && { observation }) } : a
      )
    );
  }, []);

  const updateRiskProfile = useCallback((user: string, event: Partial<Pick<UserRiskProfile, "totalAdjustments" | "highAdjustments" | "afterHoursOps" | "multiEditCount">>) => {
    setUserRiskProfiles((prev) => {
      const existing = prev.find((p) => p.user === user);
      if (existing) {
        return prev.map((p) => {
          if (p.user !== user) return p;
          const updated = {
            ...p,
            totalAdjustments: p.totalAdjustments + (event.totalAdjustments || 0),
            highAdjustments: p.highAdjustments + (event.highAdjustments || 0),
            afterHoursOps: p.afterHoursOps + (event.afterHoursOps || 0),
            multiEditCount: p.multiEditCount + (event.multiEditCount || 0),
          };
          const score = calcRiskScore(updated);
          return { ...updated, riskScore: score, riskLevel: calcRiskLevel(score) };
        });
      }
      const newProfile: UserRiskProfile = {
        user,
        totalAdjustments: event.totalAdjustments || 0,
        highAdjustments: event.highAdjustments || 0,
        afterHoursOps: event.afterHoursOps || 0,
        multiEditCount: event.multiEditCount || 0,
        riskScore: 0,
        riskLevel: "baixo",
      };
      const score = calcRiskScore(newProfile);
      return [...prev, { ...newProfile, riskScore: score, riskLevel: calcRiskLevel(score) }];
    });
  }, []);

  const updateFraudSettings = useCallback((s: Partial<FraudSettings>) => {
    setFraudSettings((prev) => {
      const updated = { ...prev, ...s };
      localStorage.setItem("fraudSettings", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getAlertsInRange = useCallback((from: Date, to: Date): FraudAlert[] => {
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    return alerts.filter((a) => {
      const parts = a.timestamp.split(" ")[0].split("/");
      const dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
      return dateStr >= fromStr && dateStr <= toStr;
    });
  }, [alerts]);

  return (
    <FraudContext.Provider value={{
      alerts, addAlert, updateAlertStatus,
      userRiskProfiles, updateRiskProfile,
      fraudSettings, updateFraudSettings,
      getAlertsInRange,
    }}>
      {children}
    </FraudContext.Provider>
  );
};
