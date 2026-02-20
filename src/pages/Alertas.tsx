import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { AlertTriangle, ShieldAlert, Clock, TrendingUp, ExternalLink, CheckCircle, Eye, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/components/ui/sonner";
import { parse, isWithinInterval } from "date-fns";

type Severity = "baixa" | "média" | "crítica";
type AlertStatus = "ativo" | "analisado" | "resolvido";

interface AlertItem {
  id: number;
  severity: Severity;
  message: string;
  time: string;
  status: AlertStatus;
  link: string;
  operator?: string;
  analyst?: string;
  observation?: string;
}

const initialAlerts: AlertItem[] = [
  { id: 1, severity: "crítica", message: "Operador 3 registrou 8 quebras em 10 minutos — padrão atípico", time: "16/02/2026 11:20", status: "ativo", link: "/auditoria", operator: "Operador 3" },
  { id: 2, severity: "média", message: "Perdas totais atingiram 6.2% no produto Ovo Tipo A hoje", time: "16/02/2026 10:00", status: "ativo", link: "/estoque", operator: "—" },
  { id: 3, severity: "baixa", message: "Movimentação registrada às 05:45 — fora do horário padrão", time: "18/02/2026 05:45", status: "analisado", link: "/auditoria", operator: "Operador 1", analyst: "Supervisor João" },
  { id: 4, severity: "crítica", message: "Ajuste manual de -15 unidades sem justificativa ainda pendente", time: "19/02/2026 16:30", status: "ativo", link: "/estoque", operator: "Operador 2" },
  { id: 5, severity: "média", message: "Estoque divergente em GRANDE SOFHIA — CEASA", time: "20/02/2026 08:00", status: "ativo", link: "/estoque", operator: "Operador 1" },
];

const parseAlertDate = (dateStr: string): Date | null => {
  try {
    return parse(dateStr, "dd/MM/yyyy HH:mm", new Date());
  } catch {
    return null;
  }
};

const alertRules = [
  { icon: TrendingUp, label: "Ajustes acima de 5%", status: "ativo", count: 1, link: "/estoque" },
  { icon: AlertTriangle, label: "Perdas elevadas no dia", status: "ativo", count: 2, link: "/estoque" },
  { icon: Clock, label: "Movimentações fora do horário", status: "ativo", count: 1, link: "/auditoria" },
  { icon: ShieldAlert, label: "Comportamento atípico de usuário", status: "inativo", count: 0, link: "/usuarios" },
];

const severityColor: Record<Severity, string> = {
  crítica: "border-destructive/20 bg-destructive/5",
  média: "border-primary/20 bg-primary/5",
  baixa: "border-border bg-muted/20",
};

const severityIcon: Record<Severity, string> = {
  crítica: "text-destructive",
  média: "text-primary",
  baixa: "text-muted-foreground",
};

const statusBadge: Record<AlertStatus, { variant: "default" | "secondary" | "outline"; className: string }> = {
  ativo: { variant: "default", className: "bg-destructive text-destructive-foreground" },
  analisado: { variant: "default", className: "bg-primary text-primary-foreground" },
  resolvido: { variant: "default", className: "bg-success text-success-foreground" },
};

const AlertasPage = () => {
  const navigate = useNavigate();
  const { dateRange } = useApp();
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [filterSeverity, setFilterSeverity] = useState<string>("todos");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [resolveDialog, setResolveDialog] = useState<AlertItem | null>(null);
  const [resolveObs, setResolveObs] = useState("");
  const [resolveAction, setResolveAction] = useState<AlertStatus>("analisado");

  const filtered = useMemo(() => {
    const rangeFrom = new Date(dateRange.from);
    rangeFrom.setHours(0, 0, 0, 0);
    const rangeTo = new Date(dateRange.to);
    rangeTo.setHours(23, 59, 59, 999);

    return alerts.filter((a) => {
      // Date filter
      const alertDate = parseAlertDate(a.time);
      if (alertDate && !isWithinInterval(alertDate, { start: rangeFrom, end: rangeTo })) return false;

      if (filterSeverity !== "todos" && a.severity !== filterSeverity) return false;
      if (filterStatus !== "todos" && a.status !== filterStatus) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterStatus, dateRange]);

  const handleStatusChange = (alert: AlertItem, newStatus: AlertStatus) => {
    if (newStatus === "resolvido") {
      setResolveDialog(alert);
      setResolveAction("resolvido");
      setResolveObs("");
    } else {
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, status: newStatus, analyst: "Usuário atual" } : a))
      );
      toast.success(`Alerta marcado como "${newStatus}"`);
    }
  };

  const confirmResolve = () => {
    if (!resolveObs.trim()) {
      toast.error("Observação obrigatória ao resolver um alerta.");
      return;
    }
    if (!resolveDialog) return;
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === resolveDialog.id
          ? { ...a, status: resolveAction, observation: resolveObs, analyst: "Usuário atual" }
          : a
      )
    );
    toast.success("Alerta resolvido com sucesso!");
    setResolveDialog(null);
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alertas Inteligentes</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Monitoramento automático de anomalias e riscos operacionais
            </p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* Rules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {alertRules.map((rule, i) => (
            <div
              key={i}
              onClick={() => navigate(rule.link)}
              className="glass-card rounded-lg p-4 cursor-pointer transition-all hover:border-primary/40 hover:shadow-sm"
            >
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
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-foreground">{rule.count}</span>
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
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
              return (
                <div
                  key={alert.id}
                  className={`flex flex-col sm:flex-row sm:items-start gap-3 p-4 rounded-md border transition-colors ${severityColor[alert.severity]}`}
                >
                  <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${severityIcon[alert.severity]}`} />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm text-foreground">{alert.message}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{alert.time}</span>
                      {alert.operator && <span>• Operador: {alert.operator}</span>}
                      {alert.analyst && <span>• Analista: {alert.analyst}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant={sb.variant} className={`text-[10px] ${sb.className}`}>
                        {alert.status}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {alert.severity}
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(alert, "analisado")}
                          className="text-xs gap-1 h-7"
                        >
                          <Eye className="w-3 h-3" /> Analisar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(alert, "resolvido")}
                          className="text-xs gap-1 h-7 text-success hover:text-success"
                        >
                          <CheckCircle className="w-3 h-3" /> Resolver
                        </Button>
                      </>
                    )}
                    {alert.status === "analisado" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleStatusChange(alert, "resolvido")}
                        className="text-xs gap-1 h-7 text-success hover:text-success"
                      >
                        <CheckCircle className="w-3 h-3" /> Resolver
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigate(alert.link)}
                    >
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
            <p className="text-sm text-muted-foreground">{resolveDialog?.message}</p>
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
