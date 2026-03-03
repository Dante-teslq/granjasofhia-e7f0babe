import { useState, useMemo, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { FileText, Search, Download, ShieldCheck, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { toast } from "@/components/ui/sonner";
import { format } from "date-fns";

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  adjustment: "Ajuste",
};

const AuditoriaPage = () => {
  const { dateRange } = useApp();
  const { logs, loading, fetchLogs } = useAudit();
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("todos");
  const [filterAction, setFilterAction] = useState("todos");
  const [filterModule, setFilterModule] = useState("todos");

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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Log de Auditoria</h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
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
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, módulo ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-[150px] h-10 text-sm">
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
            <SelectTrigger className="w-[170px] h-10 text-sm">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas Ações</SelectItem>
              <SelectItem value="create">Criação</SelectItem>
              <SelectItem value="update">Atualização</SelectItem>
              <SelectItem value="delete">Exclusão</SelectItem>
              <SelectItem value="adjustment">Ajuste</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[170px] h-10 text-sm">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos Módulos</SelectItem>
              {uniqueModules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 h-10">
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1.5 h-10">
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
                        <Badge variant="outline" className={`text-xs ${
                          log.action === "create" ? "border-success/40 text-success" :
                          log.action === "update" ? "border-primary/40 text-primary" :
                          log.action === "delete" ? "border-destructive/40 text-destructive" :
                          "border-warning/40 text-warning"
                        }`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{log.module}</td>
                      <td className="px-4 py-3">{log.item_description}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{log.ip}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{log.device}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && !loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
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
    </DashboardLayout>
  );
};

export default AuditoriaPage;
