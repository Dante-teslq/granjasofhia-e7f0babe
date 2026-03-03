import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

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

interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string;
  cargo: UserRole;
  status: string;
}

interface AppContextData {
  currentRole: UserRole;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;
  canAccess: (page: string) => boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AppContext = createContext<AppContextData | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

const operatorAllowed = new Set(["/estoque", "/sangrias", "/evidencias"]);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

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
    localStorage.setItem("appSettings", JSON.stringify(settings));
  }, [settings]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    if (data) {
      setProfile(data as UserProfile);
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    // Set up auth listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user?.id) {
        // Defer to avoid Supabase deadlock
        setTimeout(() => fetchProfile(newSession.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession?.user?.id) {
        fetchProfile(currentSession.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const currentRole: UserRole = profile?.cargo || "Operador";

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const canAccess = (page: string) => {
    if (currentRole === "Administrador") return true;
    if (currentRole === "Supervisor") return page !== "/antifraude";
    if (currentRole === "Auditor") return page !== "/configuracoes" && page !== "/usuarios" && page !== "/antifraude";
    return operatorAllowed.has(page);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AppContext.Provider
      value={{ currentRole, session, profile, loading, dateRange, setDateRange, settings, updateSettings, canAccess, signOut, refreshProfile }}
    >
      {children}
    </AppContext.Provider>
  );
};
