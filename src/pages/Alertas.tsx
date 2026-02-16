import DashboardLayout from "@/components/DashboardLayout";
import { AlertTriangle, ShieldAlert, Clock, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const alertRules = [
  { icon: TrendingUp, label: "Ajustes acima de 5%", status: "ativo", count: 1 },
  { icon: AlertTriangle, label: "Perdas elevadas no dia", status: "ativo", count: 2 },
  { icon: Clock, label: "Movimentações fora do horário", status: "ativo", count: 1 },
  { icon: ShieldAlert, label: "Comportamento atípico de usuário", status: "inativo", count: 0 },
];

const recentAlerts = [
  { severity: "alta", message: "Operador 3 registrou 8 quebras em 10 minutos — padrão atípico", time: "16/02/2026 11:20", status: "pendente" },
  { severity: "média", message: "Perdas totais atingiram 6.2% no produto Ovo Tipo A hoje", time: "16/02/2026 10:00", status: "visto" },
  { severity: "baixa", message: "Movimentação registrada às 05:45 — fora do horário padrão", time: "16/02/2026 05:45", status: "visto" },
  { severity: "alta", message: "Ajuste manual de -15 unidades sem justificativa ainda pendente", time: "15/02/2026 16:30", status: "pendente" },
];

const AlertasPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alertas Inteligentes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitoramento automático de anomalias e riscos operacionais
          </p>
        </div>

        {/* Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {alertRules.map((rule, i) => (
            <div key={i} className="glass-card rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <rule.icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-foreground">{rule.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <Badge
                  variant={rule.status === "ativo" ? "default" : "secondary"}
                  className={rule.status === "ativo" ? "bg-primary text-primary-foreground" : ""}
                >
                  {rule.status}
                </Badge>
                <span className="text-lg font-bold text-foreground">{rule.count}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Alerts */}
        <div className="glass-card rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Alertas Recentes</h3>
          <div className="space-y-3">
            {recentAlerts.map((alert, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 p-3 rounded-md border ${
                  alert.severity === "alta"
                    ? "border-destructive/20 bg-destructive/5"
                    : alert.severity === "média"
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-muted/20"
                }`}
              >
                <AlertTriangle
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    alert.severity === "alta"
                      ? "text-destructive"
                      : alert.severity === "média"
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">{alert.time}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        alert.status === "pendente"
                          ? "border-primary/30 text-primary"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {alert.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AlertasPage;
