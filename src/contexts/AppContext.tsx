import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";

export type UserRole = "Operador" | "Supervisor" | "Administrador" | "Auditor" | "Admin" | "Vendedor";

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
  pdv_id: string | null;
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
  /** The PDV name linked to the user (null for admins/supervisors) */
  userPdvName: string | null;
  /** Whether the current user is restricted to a single PDV */
  isOperator: boolean;
}

const AppContext = createContext<AppContextData | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

const operatorAllowed = new Set(["/estoque", "/sangrias", "/evidencias", "/vendas-diarias"]);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [userPdvName, setUserPdvName] = useState<string | null>(null);

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
      const p = data as UserProfile;
      setProfile(p);
      // Fetch PDV name if pdv_id exists
      if (p.pdv_id) {
        const { data: pdvData } = await supabase
          .from("pontos_de_venda")
          .select("nome")
          .eq("id", p.pdv_id)
          .single();
        setUserPdvName(pdvData?.nome || null);
      } else {
        setUserPdvName(null);
      }
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.id) {
      await fetchProfile(session.user.id);
    }
  };

  useEffect(() => {
    const isRecoveryFlow = () => {
      if (typeof window === "undefined") return false;
      return window.location.pathname === "/reset-password" || window.location.hash.includes("type=recovery") || window.location.hash.includes("access_token=");
    };

    // Set up auth listener BEFORE getSession
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // During password recovery, preserve the session without interference
      if (_event === "PASSWORD_RECOVERY") {
        setSession(newSession);
        sessionStorage.setItem("session_active", "true");
        setLoading(false);
        return;
      }

      setSession(newSession);
      if (newSession?.user?.id) {
        // Defer to avoid Supabase deadlock
        setTimeout(() => fetchProfile(newSession.user.id), 0);
      } else {
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (currentSession) {
        // Keep recovery-link sessions valid even without remember/session flags (e.g., opened in another browser)
        const inRecoveryFlow = isRecoveryFlow();
        const rememberLogin = localStorage.getItem("remember_login");
        const sessionActive = sessionStorage.getItem("session_active");

        if (!inRecoveryFlow && !rememberLogin && !sessionActive) {
          // User didn't choose "remember me" and this is a new tab/browser session
          supabase.auth.signOut().then(() => {
            setSession(null);
            setProfile(null);
            setLoading(false);
          });
          return;
        }

        // Mark current tab as active
        sessionStorage.setItem("session_active", "true");

        setSession(currentSession);
        if (currentSession.user?.id) {
          fetchProfile(currentSession.user.id).finally(() => setLoading(false));
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }).catch(() => setLoading(false));

    // Safety timeout to prevent infinite loading
    const timeout = setTimeout(() => setLoading(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const currentRole: UserRole = profile?.cargo || "Operador";
  const isOperator = currentRole === "Operador" || currentRole === "Vendedor";

  const updateSettings = (partial: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const canAccess = (page: string) => {
    if (currentRole === "Administrador" || currentRole === "Admin") return true;
    if (currentRole === "Supervisor") return page !== "/antifraude";
    if (currentRole === "Auditor") return page !== "/configuracoes" && page !== "/usuarios" && page !== "/antifraude";
    return operatorAllowed.has(page);
  };

  const signOut = async () => {
    localStorage.removeItem("remember_login");
    sessionStorage.removeItem("session_active");
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  };

  return (
    <AppContext.Provider
      value={{ currentRole, session, profile, loading, dateRange, setDateRange, settings, updateSettings, canAccess, signOut, refreshProfile, userPdvName, isOperator }}
    >
      {children}
    </AppContext.Provider>
  );
};
