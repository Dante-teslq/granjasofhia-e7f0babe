import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { FileText, Search, Download, ShieldCheck, Loader2, History, Eye, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { toast } from "@/components/ui/sonner";
import { format } from "date-fns";
import { getRecordVersions } from "@/lib/recordHistory";

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  adjustment: "Ajuste",
  login: "Login",
  logout: "Logout",
};

const ACTION_COLORS: Record<string, string> = {
  create: "border-success/40 text-success",
  update: "border-primary/40 text-primary",
  delete: "border-destructive/40 text-destructive",
  adjustment: "border-warning/40 text-warning",
  login: "border-blue-400/40 text-blue-500",
  logout: "border-muted-foreground/40 text-muted-foreground",
};

const AuditoriaPage = () => {
  const { dateRange } = useApp();
  const { logs, loading, fetchLogs } = useAudit();
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("todos");
  const [filterAction, setFilterAction] = useState("todos");
  const [filterModule, setFilterModule] = useState("todos");

  // Version comparison dialog
  const [versionDialog, setVersionDialog] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [versions, setVersions] = useState<any[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);

  // Detail dialog
  const [detailDialog, setDetailDialog] = useState(false);
  const [detailLog, setDetailLog] = useState<any>(null);

  useEffect(() => {
    fetchLogs(dateRange.from, dateRange.to);
  }, [dateRange.from, dateRange.to, fetchLogs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.usuario.toLowerCase().includes(search.toLowerCase()) ||
        log.module.toLowerCase().includes(search.toLowerCase()) ||
        log.item_description.toLowerCase().includes(search.toLowerCase());
      const matchUser = filterUser === "todos" || log.usuario === filterUser;
      const matchAction = filterAction === "todos" || log.action === filterAction;
      const matchModule = filterModule === "todos" || log.module === filterModule;
      return matchSearch && matchUser && matchAction && matchModule;
    });
  }, [logs, search, filterUser, filterAction, filterModule]);

  const uniqueUsers = [...new Set(logs.map((l) => l.usuario))];
  const uniqueModules = [...new Set(logs.map((l) => l.module))];

  const formatBeforeAfter = (data: any): string => {
    if (!data) return "—";
    if (typeof data === "string") return data;
    try {
      return JSON.stringify(data, null, 0).slice(0, 120);
    } catch {
      return "—";
    }
  };

  const formatJSON = (data: any): string => {
    if (!data) return "—";
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return "—";
    }
  };

  const handleViewDetail = (log: any) => {
    setDetailLog(log);
    setDetailDialog(true);
  };

  const handleViewVersions = async (log: any) => {
    if (!log.record_id && !log.entity) {
      toast.info("Sem histórico de versões para este registro.");
      return;
    }
    setSelectedLog(log);
    setLoadingVersions(true);
    setVersionDialog(true);
    try {
      const v = await getRecordVersions(log.entity || log.module, log.record_id || log.id);
      setVersions(v);
    } catch {
      toast.error("Erro ao carregar versões.");
    } finally {
      setLoadingVersions(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Ação", "Módulo", "Descrição", "Antes", "Depois", "IP", "Dispositivo"];
    const rows = filtered.map((l) => [
      format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss"),
      l.usuario,
      ACTION_LABELS[l.action] || l.action,
      l.module,
      l.item_description,
      formatBeforeAfter(l.before_data),
      formatBeforeAfter(l.after_data),
      l.ip,
      l.device,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(14);
    doc.text("Log de Auditoria — Granja Sofhia", 14, 15);
    doc.setFontSize(9);
    doc.text(`Período: ${format(dateRange.from, "dd/MM/yyyy")} a ${format(dateRange.to, "dd/MM/yyyy")}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Data/Hora", "Usuário", "Ação", "Módulo", "Descrição", "Antes", "Depois", "IP", "Dispositivo"]],
      body: filtered.map((l) => [
        format(new Date(l.created_at), "dd/MM/yyyy HH:mm:ss"),
        l.usuario,
        ACTION_LABELS[l.action] || l.action,
        l.module,
        l.item_description,
        formatBeforeAfter(l.before_data),
        formatBeforeAfter(l.after_data),
        l.ip,
        l.device,
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [180, 155, 100] },
    });

    doc.save(`auditoria_${format(dateRange.from, "yyyy-MM-dd")}_${format(dateRange.to, "yyyy-MM-dd")}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  const isMobile = useIsMobile();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        <div className="flex flex-col gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Log de Auditoria</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              Registro imutável — somente leitura, sem edição ou exclusão
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="w-fit border-primary/30 text-primary gap-1.5">
              <FileText className="w-3 h-3" />
              {filtered.length} registros
            </Badge>
            <GlobalDateFilter />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-full md:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, módulo ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={filterUser} onValueChange={setFilterUser}>
              <SelectTrigger className="w-full sm:w-[150px] h-10 text-sm">
                <SelectValue placeholder="Usuário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Usuários</SelectItem>
                {uniqueUsers.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-full sm:w-[170px] h-10 text-sm">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas Ações</SelectItem>
                <SelectItem value="create">Criação</SelectItem>
                <SelectItem value="update">Atualização</SelectItem>
                <SelectItem value="delete">Exclusão</SelectItem>
                <SelectItem value="adjustment">Ajuste</SelectItem>
                <SelectItem value="login">Login</SelectItem>
                <SelectItem value="logout">Logout</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterModule} onValueChange={setFilterModule}>
              <SelectTrigger className="w-full sm:w-[170px] h-10 text-sm">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Módulos</SelectItem>
                {uniqueModules.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 h-10 flex-1 sm:flex-none">
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5 h-10 flex-1 sm:flex-none">
              <Download className="w-3.5 h-3.5" /> PDF
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando logs...</span>
            </div>
          ) : isMobile ? (
            <div className="divide-y divide-border">
              {filtered.map((log) => (
                <div key={log.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                    <Badge variant="outline" className={`text-xs ${ACTION_COLORS[log.action] || ""}`}>
                      {ACTION_LABELS[log.action] || log.action}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{log.item_description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{log.usuario}</span>
                    <span>•</span>
                    <span>{log.module}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleViewDetail(log)}>
                      <Eye className="w-3 h-3" /> Detalhe
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => handleViewVersions(log)}>
                      <History className="w-3 h-3" /> Versões
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && !loading && (
                <div className="px-4 py-8 text-center text-muted-foreground text-sm">
                  Nenhum registro encontrado no período selecionado.
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-foreground">
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Data/Hora</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Usuário</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Ação</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Módulo</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Descrição</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">IP</th>
                    <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Dispositivo</th>
                    <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((log, idx) => (
                    <tr
                      key={log.id}
                      className={`border-t border-border transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/20"}`}
                    >
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss")}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.usuario}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${ACTION_COLORS[log.action] || ""}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{log.module}</td>
                      <td className="px-4 py-3">{log.item_description}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{log.ip}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{log.device}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Ver detalhes" onClick={() => handleViewDetail(log)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Histórico de versões" onClick={() => handleViewVersions(log)}>
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                        Nenhum registro encontrado no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialog} onOpenChange={setDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" /> Detalhes do Registro
            </DialogTitle>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-muted-foreground">Usuário:</span> <strong>{detailLog.usuario}</strong></div>
                <div><span className="text-muted-foreground">Ação:</span> <Badge variant="outline" className={`text-xs ${ACTION_COLORS[detailLog.action] || ""}`}>{ACTION_LABELS[detailLog.action] || detailLog.action}</Badge></div>
                <div><span className="text-muted-foreground">Módulo:</span> {detailLog.module}</div>
                <div><span className="text-muted-foreground">Data:</span> {format(new Date(detailLog.created_at), "dd/MM/yyyy HH:mm:ss")}</div>
                <div><span className="text-muted-foreground">IP:</span> {detailLog.ip}</div>
                <div><span className="text-muted-foreground">Dispositivo:</span> {detailLog.device}</div>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Descrição:</p>
                <p className="font-medium">{detailLog.item_description}</p>
              </div>
              {detailLog.before_data && (
                <div>
                  <p className="text-muted-foreground mb-1 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Dados Anteriores:</p>
                  <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-48">{formatJSON(detailLog.before_data)}</pre>
                </div>
              )}
              {detailLog.after_data && (
                <div>
                  <p className="text-muted-foreground mb-1">Dados Novos:</p>
                  <pre className="bg-muted/50 p-3 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-48">{formatJSON(detailLog.after_data)}</pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Version History Dialog */}
      <Dialog open={versionDialog} onOpenChange={setVersionDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4" /> Histórico de Versões
            </DialogTitle>
          </DialogHeader>
          {loadingVersions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
            </div>
          ) : versions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma versão registrada para este registro.</p>
          ) : (
            <div className="space-y-3">
              {versions.map((v: any, idx: number) => (
                <div key={v.id} className={`border rounded-lg p-3 ${idx === 0 ? "border-primary/30 bg-primary/5" : "border-border"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant={idx === 0 ? "default" : "outline"} className="text-xs">
                      Versão {v.version_number} {idx === 0 && "(Atual)"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(v.changed_at), "dd/MM/yyyy HH:mm:ss")}
                    </span>
                  </div>
                  {v.changed_by_name && (
                    <p className="text-xs text-muted-foreground mb-1">Por: {v.changed_by_name}</p>
                  )}
                  <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto whitespace-pre-wrap max-h-32">
                    {formatJSON(v.data_snapshot)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AuditoriaPage;
