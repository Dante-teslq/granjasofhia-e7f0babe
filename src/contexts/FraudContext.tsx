import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  riskScore: number;
  riskLevel: "baixo" | "médio" | "alto" | "crítico";
}

export interface FraudSettings {
  adjustmentThresholdPercent: number;
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
  const s =
    Math.min(p.highAdjustments * 15, 30) +
    Math.min(p.afterHoursOps * 12, 25) +
    Math.min(p.multiEditCount * 8, 25) +
    Math.min(p.totalAdjustments * 2, 20);
  return Math.min(s, 100);
};

const formatTimestamp = (isoStr: string): string => {
  const d = new Date(isoStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

export const FraudProvider = ({ children }: { children: ReactNode }) => {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [userRiskProfiles, setUserRiskProfiles] = useState<UserRiskProfile[]>([]);
  const [fraudSettings, setFraudSettings] = useState<FraudSettings>(() => {
    const saved = localStorage.getItem("fraudSettings");
    return saved ? JSON.parse(saved) : { adjustmentThresholdPercent: 5, maxAdjustmentsPerHour: 5, maxEditsPerRecord: 3 };
  });

  // Load alerts from DB on mount
  useEffect(() => {
    const loadAlerts = async () => {
      const { data } = await supabase
        .from("fraud_alerts")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) {
        setAlerts(
          data.map((row: any) => ({
            id: row.id,
            type: row.type as FraudAlertType,
            severity: row.severity as FraudSeverity,
            status: row.status as FraudStatus,
            message: row.message,
            operator: row.operator,
            timestamp: formatTimestamp(row.created_at),
            link: row.link,
            analyst: row.analyst || undefined,
            observation: row.observation || undefined,
            details: row.details || undefined,
          }))
        );
      }
    };

    const loadProfiles = async () => {
      const { data } = await supabase
        .from("user_risk_profiles")
        .select("*");
      if (data) {
        setUserRiskProfiles(
          data.map((row: any) => ({
            user: row.user_name,
            totalAdjustments: row.total_adjustments,
            highAdjustments: row.high_adjustments,
            afterHoursOps: row.after_hours_ops,
            multiEditCount: row.multi_edit_count,
            riskScore: Number(row.risk_score),
            riskLevel: row.risk_level as UserRiskProfile["riskLevel"],
          }))
        );
      }
    };

    loadAlerts();
    loadProfiles();
  }, []);

  const addAlert = useCallback(async (alert: Omit<FraudAlert, "id" | "timestamp">) => {
    const { data, error } = await supabase
      .from("fraud_alerts")
      .insert({
        type: alert.type,
        severity: alert.severity,
        status: alert.status,
        message: alert.message,
        operator: alert.operator,
        link: alert.link,
        analyst: alert.analyst || null,
        observation: alert.observation || null,
        details: alert.details || {},
      })
      .select()
      .single();

    if (data && !error) {
      const newAlert: FraudAlert = {
        id: data.id,
        type: data.type as FraudAlertType,
        severity: data.severity as FraudSeverity,
        status: data.status as FraudStatus,
        message: data.message,
        operator: data.operator,
        timestamp: formatTimestamp(data.created_at),
        link: data.link,
        analyst: data.analyst || undefined,
        observation: data.observation || undefined,
        details: data.details as Record<string, any> || undefined,
      };
      setAlerts((prev) => [newAlert, ...prev]);
    }
  }, []);

  const updateAlertStatus = useCallback(async (id: string, status: FraudStatus, analyst?: string, observation?: string) => {
    const updateData: any = { status };
    if (analyst) updateData.analyst = analyst;
    if (observation) updateData.observation = observation;

    const { error } = await supabase
      .from("fraud_alerts")
      .update(updateData)
      .eq("id", id);

    if (!error) {
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === id ? { ...a, status, ...(analyst && { analyst }), ...(observation && { observation }) } : a
        )
      );
    }
  }, []);

  const updateRiskProfile = useCallback(async (user: string, event: Partial<Pick<UserRiskProfile, "totalAdjustments" | "highAdjustments" | "afterHoursOps" | "multiEditCount">>) => {
    // First check if profile exists
    const { data: existing } = await supabase
      .from("user_risk_profiles")
      .select("*")
      .eq("user_name", user)
      .maybeSingle();

    if (existing) {
      const updated = {
        total_adjustments: existing.total_adjustments + (event.totalAdjustments || 0),
        high_adjustments: existing.high_adjustments + (event.highAdjustments || 0),
        after_hours_ops: existing.after_hours_ops + (event.afterHoursOps || 0),
        multi_edit_count: existing.multi_edit_count + (event.multiEditCount || 0),
      };
      const score = calcRiskScore({
        user,
        totalAdjustments: updated.total_adjustments,
        highAdjustments: updated.high_adjustments,
        afterHoursOps: updated.after_hours_ops,
        multiEditCount: updated.multi_edit_count,
      });
      const riskLevel = calcRiskLevel(score);

      await supabase
        .from("user_risk_profiles")
        .update({ ...updated, risk_score: score, risk_level: riskLevel, updated_at: new Date().toISOString() })
        .eq("id", existing.id);

      setUserRiskProfiles((prev) =>
        prev.map((p) =>
          p.user === user
            ? { ...p, totalAdjustments: updated.total_adjustments, highAdjustments: updated.high_adjustments, afterHoursOps: updated.after_hours_ops, multiEditCount: updated.multi_edit_count, riskScore: score, riskLevel }
            : p
        )
      );
    } else {
      const newProfile = {
        user_name: user,
        total_adjustments: event.totalAdjustments || 0,
        high_adjustments: event.highAdjustments || 0,
        after_hours_ops: event.afterHoursOps || 0,
        multi_edit_count: event.multiEditCount || 0,
        risk_score: 0,
        risk_level: "baixo",
      };
      const score = calcRiskScore({
        user,
        totalAdjustments: newProfile.total_adjustments,
        highAdjustments: newProfile.high_adjustments,
        afterHoursOps: newProfile.after_hours_ops,
        multiEditCount: newProfile.multi_edit_count,
      });
      newProfile.risk_score = score;
      newProfile.risk_level = calcRiskLevel(score);

      const { data } = await supabase
        .from("user_risk_profiles")
        .insert(newProfile)
        .select()
        .single();

      if (data) {
        setUserRiskProfiles((prev) => [
          ...prev,
          {
            user,
            totalAdjustments: newProfile.total_adjustments,
            highAdjustments: newProfile.high_adjustments,
            afterHoursOps: newProfile.after_hours_ops,
            multiEditCount: newProfile.multi_edit_count,
            riskScore: score,
            riskLevel: calcRiskLevel(score),
          },
        ]);
      }
    }
  }, []);

  const updateFraudSettings = useCallback((s: Partial<FraudSettings>) => {
    setFraudSettings((prev) => {
      const updated = { ...prev, ...s };
      localStorage.setItem("fraudSettings", JSON.stringify(updated));
      return updated;
    });
  }, []);

  const getAlertsInRange = useCallback((from: Date, to: Date): FraudAlert[] => {
    const fromStr = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}-${String(from.getDate()).padStart(2, "0")}`;
    const toStr = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, "0")}-${String(to.getDate()).padStart(2, "0")}`;
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
