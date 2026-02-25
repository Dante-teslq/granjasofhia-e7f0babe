import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import {
  AlertTriangle, ShieldAlert, Clock, TrendingUp, ExternalLink,
  CheckCircle, Eye, MessageSquare, Activity, Repeat, UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useFraud, type FraudAlertType, type FraudSeverity, type FraudStatus } from "@/contexts/FraudContext";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/components/ui/sonner";

const typeLabels: Record<FraudAlertType, { label: string; icon: typeof AlertTriangle }> = {
  ajuste_elevado: { label: "Ajuste elevado", icon: TrendingUp },
  fora_horario: { label: "Fora do horário", icon: Clock },
  frequencia_anormal: { label: "Frequência anormal", icon: Activity },
  multiplas_alteracoes: { label: "Múltiplas alterações", icon: Repeat },
  comportamento_atipico: { label: "Comportamento atípico", icon: UserX },
};

const severityColor: Record<FraudSeverity, string> = {
  crítica: "border-destructive/20 bg-destructive/5",
  média: "border-primary/20 bg-primary/5",
  baixa: "border-border bg-muted/20",
};

const severityIcon: Record<FraudSeverity, string> = {
  crítica: "text-destructive",
  média: "text-primary",
  baixa: "text-muted-foreground",
};

const statusBadge: Record<FraudStatus, { variant: "default" | "secondary" | "outline"; className: string }> = {
  ativo: { variant: "default", className: "bg-destructive text-destructive-foreground" },
  analisado: { variant: "default", className: "bg-primary text-primary-foreground" },
  resolvido: { variant: "default", className: "bg-success text-success-foreground" },
};

const AlertasPage = () => {
  const navigate = useNavigate();
  const { dateRange } = useApp();
  const { alerts, updateAlertStatus, userRiskProfiles, fraudSettings } = useFraud();
  const [filterSeverity, setFilterSeverity] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterType, setFilterType] = useState<string>("todos");
  const [resolveDialog, setResolveDialog] = useState<string | null>(null);
  const [resolveObs, setResolveObs] = useState("");

  const filtered = useMemo(() => {
    const rangeFrom = new Date(dateRange.from);
    rangeFrom.setHours(0, 0, 0, 0);
    const rangeTo = new Date(dateRange.to);
    rangeTo.setHours(23, 59, 59, 999);

    return alerts.filter((a) => {
      // Date filter
      const parts = a.timestamp.split(" ")[0].split("/");
      if (parts.length === 3) {
        const alertDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
        if (alertDate < rangeFrom || alertDate > rangeTo) return false;
      }
      if (filterSeverity !== "todos" && a.severity !== filterSeverity) return false;
      if (filterStatus !== "todos" && a.status !== filterStatus) return false;
      if (filterType !== "todos" && a.type !== filterType) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterStatus, filterType, dateRange]);

  const handleStatusChange = (alertId: string, newStatus: FraudStatus) => {
    if (newStatus === "resolvido") {
      setResolveDialog(alertId);
      setResolveObs("");
    } else {
      updateAlertStatus(alertId, newStatus, "Usuário atual");
      toast.success(`Alerta marcado como "${newStatus}"`);
    }
  };

  const confirmResolve = () => {
    if (!resolveObs.trim()) {
      toast.error("Observação obrigatória ao resolver um alerta.");
      return;
    }
    if (!resolveDialog) return;
    updateAlertStatus(resolveDialog, "resolvido", "Usuário atual", resolveObs);
    toast.success("Alerta resolvido com sucesso!");
    setResolveDialog(null);
  };

  // Rule summary cards
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

  const resolveAlert = alerts.find((a) => a.id === resolveDialog);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alertas Antifraude</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitoramento automático de dados e riscos operacionais
            </p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* Rule Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ruleSummary.map((rule, i) => (
            <div
              key={i}
              onClick={() => navigate(rule.link)}
              className="glass-card rounded-lg p-3 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm"
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
        <div className="glass-card rounded-lg p-5">
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
                  <div key={profile.user} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{profile.user}</span>
                        <div className="flex gap-3 text-[10px] text-muted-foreground mt-0.5">
                          <span>Ajustes: {profile.totalAdjustments}</span>
                          <span>Elevados: {profile.highAdjustments}</span>
                          <span>Fora horário: {profile.afterHoursOps}</span>
                          <span>Multi-edits: {profile.multiEditCount}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">{profile.riskScore}</p>
                        <p className="text-[10px] text-muted-foreground">score</p>
                      </div>
                      <Badge className={`text-[10px] ${riskColors[profile.riskLevel]}`}>
                        {profile.riskLevel}
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              {Object.entries(typeLabels).map(([key, { label }]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Severidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="média">Média</SelectItem>
              <SelectItem value="crítica">Crítica</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[150px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="analisado">Analisado</SelectItem>
              <SelectItem value="resolvido">Resolvido</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Alerts List */}
        <div className="glass-card rounded-lg p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Alertas ({filtered.length})
          </h3>
          <div className="space-y-3">
            {filtered.map((alert) => {
              const sb = statusBadge[alert.status];
              const typeInfo = typeLabels[alert.type];
              const TypeIcon = typeInfo?.icon || AlertTriangle;
              return (
                <div
                  key={alert.id}
                  className={`flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-md border transition-colors ${severityColor[alert.severity]}`}
                >
                  <TypeIcon className={`w-4 h-4 mt-0.5 shrink-0 ${severityIcon[alert.severity]}`} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{alert.timestamp}</span>
                      {alert.operator && alert.operator !== "—" && <span>• Operador: {alert.operator}</span>}
                      {alert.analyst && <span>• Analista: {alert.analyst}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant={sb.variant} className={`text-[10px] ${sb.className}`}>
                        {alert.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {typeInfo?.label || alert.type}
                      </Badge>
                      {alert.observation && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" /> {alert.observation}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {alert.status === "ativo" && (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleStatusChange(alert.id, "analisado")} className="text-xs gap-1 h-7">
                          <Eye className="w-3 h-3" /> Analisar
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleStatusChange(alert.id, "resolvido")} className="text-xs gap-1 h-7 text-success hover:text-success">
                          <CheckCircle className="w-3 h-3" /> Resolver
                        </Button>
                      </>
                    )}
                    {alert.status === "analisado" && (
                      <Button variant="ghost" size="sm" onClick={() => handleStatusChange(alert.id, "resolvido")} className="text-xs gap-1 h-7 text-success hover:text-success">
                        <CheckCircle className="w-3 h-3" /> Resolver
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => navigate(alert.link)}>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum alerta encontrado para o período selecionado.</p>
            )}
          </div>
        </div>

        {/* Resolve Dialog */}
        <Dialog open={!!resolveDialog} onOpenChange={(o) => !o && setResolveDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolver Alerta</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{resolveAlert?.message}</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observação obrigatória *</label>
              <Textarea
                value={resolveObs}
                onChange={(e) => setResolveObs(e.target.value)}
                placeholder="Descreva a análise e resolução do problema..."
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancelar</Button>
              <Button onClick={confirmResolve}>Confirmar Resolução</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AlertasPage;
