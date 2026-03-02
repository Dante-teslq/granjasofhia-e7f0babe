import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "Operador" | "Supervisor" | "Administrador" | "Auditor";

interface AppSettings {
  lossLimitPercent: number;
  operationStartHour: number;
  operationEndHour: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

interface AppContextData {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  canAccess: (page: string) => boolean;
}

const AppContext = createContext<AppContextData | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

const operatorAllowed = new Set(["/estoque", "/sangrias", "/evidencias"]);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    return (localStorage.getItem("currentRole") as UserRole) || "Administrador";
  });

  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(),
    to: new Date(),
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem("appSettings");
    return saved
      ? JSON.parse(saved)
      : { lossLimitPercent: 5, operationStartHour: 6, operationEndHour: 22 };
  });

  useEffect(() => {
    localStorage.setItem("currentRole", currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem("appSettings", JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const canAccess = (page: string) => {
    if (currentRole === "Administrador") return true;
    if (currentRole === "Supervisor") return page !== "/antifraude";
    if (currentRole === "Auditor") return page !== "/configuracoes" && page !== "/usuarios" && page !== "/antifraude";
    // Operador
    return operatorAllowed.has(page);
  };

  return (
    <AppContext.Provider
      value={{ currentRole, setCurrentRole, dateRange, setDateRange, settings, updateSettings, canAccess }}
    >
      {children}
    </AppContext.Provider>
  );
};
