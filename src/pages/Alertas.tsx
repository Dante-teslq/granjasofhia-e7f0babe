import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import {
  ShieldAlert, Clock, TrendingUp, ExternalLink,
  Activity, Repeat, UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFraud } from "@/contexts/FraudContext";
import { useApp } from "@/contexts/AppContext";
import ActivityHistory from "@/components/alertas/ActivityHistory";
import AlertsHistory from "@/components/alertas/AlertsHistory";

const AlertasPage = () => {
  const navigate = useNavigate();
  const { dateRange } = useApp();
  const { alerts, userRiskProfiles, fraudSettings } = useFraud();

  const ruleSummary = [
    {
      icon: TrendingUp,
      label: `Ajustes acima de ${fraudSettings.adjustmentThresholdPercent}%`,
      count: alerts.filter((a) => a.type === "ajuste_elevado" && a.status === "ativo").length,
      link: "/estoque",
    },
    {
      icon: Clock,
      label: "Fora do horário operacional",
      count: alerts.filter((a) => a.type === "fora_horario" && a.status === "ativo").length,
      link: "/auditoria",
    },
    {
      icon: Activity,
      label: "Frequência anormal de ajustes",
      count: alerts.filter((a) => a.type === "frequencia_anormal" && a.status === "ativo").length,
      link: "/auditoria",
    },
    {
      icon: Repeat,
      label: "Múltiplas alterações no registro",
      count: alerts.filter((a) => a.type === "multiplas_alteracoes" && a.status === "ativo").length,
      link: "/estoque",
    },
    {
      icon: UserX,
      label: "Comportamento atípico",
      count: alerts.filter((a) => a.type === "comportamento_atipico" && a.status === "ativo").length,
      link: "/alertas",
    },
    {
      icon: ShieldAlert,
      label: "Usuários em risco alto/crítico",
      count: userRiskProfiles.filter((p) => p.riskLevel === "alto" || p.riskLevel === "crítico").length,
      link: "/alertas",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Alertas</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitoramento automático de dados e riscos operacionais
            </p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* Rule Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {ruleSummary.map((rule, i) => (
            <div
              key={i}
              onClick={() => navigate(rule.link)}
              className="glass-card p-3 md:p-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-2 mb-2">
                <rule.icon className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-medium text-foreground leading-tight">{rule.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-lg font-bold ${rule.count > 0 ? "text-destructive" : "text-success"}`}>{rule.count}</span>
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>

        {/* Risk Ranking */}
        <div className="glass-card p-4 md:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Ranking de Risco por Usuário
          </h3>
          <div className="space-y-2">
            {[...userRiskProfiles]
              .sort((a, b) => b.riskScore - a.riskScore)
              .map((profile, i) => {
                const riskColors: Record<string, string> = {
                  baixo: "bg-success/10 text-success",
                  médio: "bg-primary/10 text-primary",
                  alto: "bg-orange-500/10 text-orange-600",
                  crítico: "bg-destructive/10 text-destructive",
                };
                return (
                  <div key={profile.user} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-md bg-muted/30 border border-border">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {i + 1}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm font-medium text-foreground block truncate">{profile.user}</span>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground mt-0.5">
                          <span>Ajustes: {profile.totalAdjustments}</span>
                          <span>Elevados: {profile.highAdjustments}</span>
                          <span>Fora horário: {profile.afterHoursOps}</span>
                          <span>Multi-edits: {profile.multiEditCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pl-10 sm:pl-0 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{profile.riskScore}</p>
                        <p className="text-[10px] text-muted-foreground">score</p>
                      </div>
                      <Badge className={`text-[10px] whitespace-nowrap ${riskColors[profile.riskLevel]}`}>
                        {profile.riskLevel}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Activity History - records from all modules */}
        <ActivityHistory />

        {/* Alerts History - segregated by resolved/unresolved */}
        <AlertsHistory />
      </div>
    </DashboardLayout>
  );
};

export default AlertasPage;
