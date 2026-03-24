import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ShieldAlert, Clock, TrendingUp, ExternalLink,
  CheckCircle, Eye, MessageSquare, Activity, Repeat, UserX,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFraud, type FraudAlertType, type FraudSeverity, type FraudStatus } from "@/contexts/FraudContext";
import { useApp } from "@/contexts/AppContext";
import { useEstoqueData } from "@/hooks/useEstoqueData";
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

const AlertsHistory = () => {
  const navigate = useNavigate();
  const { dateRange } = useApp();
  const { alerts, updateAlertStatus } = useFraud();
  const estoque = useEstoqueData({ from: dateRange.from, to: dateRange.to });
  const [filterSeverity, setFilterSeverity] = useState<string>("todos");
  const [filterType, setFilterType] = useState<string>("todos");
  const [resolveDialog, setResolveDialog] = useState<string | null>(null);
  const [resolveObs, setResolveObs] = useState("");

  // Combine fraud alerts + stock alerts
  const allAlerts = useMemo(() => {
    const rangeFrom = new Date(dateRange.from);
    rangeFrom.setHours(0, 0, 0, 0);
    const rangeTo = new Date(dateRange.to);
    rangeTo.setHours(23, 59, 59, 999);

    const fraudFiltered = alerts.filter((a) => {
      const parts = a.timestamp.split(" ")[0].split("/");
      if (parts.length === 3) {
        const alertDate = new Date(+parts[2], +parts[1] - 1, +parts[0]);
        if (alertDate < rangeFrom || alertDate > rangeTo) return false;
      }
      return true;
    });

    const stockAlerts = (estoque.alertas || []).map((a: any) => ({
      id: a.id,
      type: "ajuste_elevado" as FraudAlertType,
      severity: a.severity as FraudSeverity,
      status: "ativo" as FraudStatus,
      message: a.message,
      operator: "Sistema",
      timestamp: "",
      link: a.link || "/estoque",
      analyst: undefined as string | undefined,
      observation: undefined as string | undefined,
      details: undefined as Record<string, any> | undefined,
      isStockAlert: true,
    }));

    return [...fraudFiltered, ...stockAlerts];
  }, [alerts, estoque.alertas, dateRange]);

  const applyFilters = (items: typeof allAlerts) => {
    return items.filter((a) => {
      if (filterSeverity !== "todos" && a.severity !== filterSeverity) return false;
      if (filterType !== "todos" && a.type !== filterType) return false;
      return true;
    });
  };

  const unresolvedAlerts = useMemo(() => {
    return applyFilters(allAlerts.filter((a) => a.status !== "resolvido"));
  }, [allAlerts, filterSeverity, filterType]);

  const resolvedAlerts = useMemo(() => {
    return applyFilters(allAlerts.filter((a) => a.status === "resolvido"));
  }, [allAlerts, filterSeverity, filterType]);

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

  const resolveAlert = allAlerts.find((a) => a.id === resolveDialog);

  const renderAlertItem = (alert: typeof allAlerts[0]) => {
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
            {alert.timestamp && <span>{alert.timestamp}</span>}
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
          {alert.status === "ativo" && !(alert as any).isStockAlert && (
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
  };

  return (
    <>
      <div className="glass-card p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-primary" />
            Histórico de Alertas
          </h3>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
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
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Severidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="média">Média</SelectItem>
                <SelectItem value="crítica">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="nao-resolvidos" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="nao-resolvidos" className="text-xs">
              Não Resolvidos ({unresolvedAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="resolvidos" className="text-xs">
              Resolvidos ({resolvedAlerts.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="nao-resolvidos" className="mt-4">
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {unresolvedAlerts.map(renderAlertItem)}
              {unresolvedAlerts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum alerta não resolvido encontrado.
                </p>
              )}
            </div>
          </TabsContent>
          <TabsContent value="resolvidos" className="mt-4">
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {resolvedAlerts.map(renderAlertItem)}
              {resolvedAlerts.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhum alerta resolvido encontrado.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
    </>
  );
};

export default AlertsHistory;
