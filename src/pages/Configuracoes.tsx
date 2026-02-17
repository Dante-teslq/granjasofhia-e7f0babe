import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";

const themes: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

const ConfiguracoesPage = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    } else {
      root.classList.toggle("dark", theme === "dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground text-sm mt-1">Preferências do sistema</p>
        </div>

        <div className="glass-card rounded-lg p-5 space-y-4">
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

        <div className="glass-card rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground">Outras Configurações</h3>
          <p className="text-muted-foreground text-xs mt-1">Em breve: produtos, notificações e preferências avançadas.</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ConfiguracoesPage;
