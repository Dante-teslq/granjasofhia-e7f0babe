import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Sun, Moon, Monitor, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/components/ui/sonner";

type Theme = "light" | "dark" | "system";

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

const ConfiguracoesPage = () => {
  const { settings, updateSettings } = useApp();
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (dark: boolean) => {
      root.classList.toggle("dark", dark);
      // Update mobile status bar color
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", dark ? "#121212" : "#F0F0F0");
    };

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(mq.matches);
      const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
      mq.addEventListener("change", handler);
      localStorage.setItem("theme", theme);
      return () => mq.removeEventListener("change", handler);
    } else {
      applyTheme(theme === "dark");
      localStorage.setItem("theme", theme);
    }
  }, [theme]);


  const handleHourChange = (field: "operationStartHour" | "operationEndHour", val: string) => {
    const n = parseInt(val);
    if (!isNaN(n) && n >= 0 && n <= 23) {
      updateSettings({ [field]: n });
      toast.success("Horário de operação atualizado!");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-[1400px] space-y-4 md:space-y-6">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Preferências do sistema</p>
        </div>

        {/* Theme */}
        <div className="glass-card p-4 md:p-6 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Aparência</h3>
          <p className="text-xs text-muted-foreground">Escolha o tema da interface</p>
          <div className="grid grid-cols-3 gap-3 max-w-sm">
            {themes.map((t) => (
              <button
                key={t.value}
                onClick={() => setTheme(t.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                  theme === t.value
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <t.icon className={`w-5 h-5 ${theme === t.value ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`text-xs font-medium ${theme === t.value ? "text-primary" : "text-muted-foreground"}`}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>


        {/* Operation Hours */}
        <div className="glass-card rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Horário Padrão de Operação</h3>
          </div>
          <p className="text-xs text-muted-foreground">Movimentações fora deste horário geram alertas automáticos</p>
          <div className="flex items-center gap-3 max-w-xs">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Início</label>
              <Input
                type="number"
                min={0}
                max={23}
                defaultValue={settings.operationStartHour}
                onBlur={(e) => handleHourChange("operationStartHour", e.target.value)}
                className="w-20"
              />
            </div>
            <span className="text-muted-foreground mt-5">—</span>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Fim</label>
              <Input
                type="number"
                min={0}
                max={23}
                defaultValue={settings.operationEndHour}
                onBlur={(e) => handleHourChange("operationEndHour", e.target.value)}
                className="w-20"
              />
            </div>
            <span className="text-sm text-muted-foreground mt-5">h</span>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ConfiguracoesPage;
