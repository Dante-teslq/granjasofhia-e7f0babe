import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { FileText, Search, Download, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useAudit, type AuditAction } from "@/contexts/AuditContext";
import { toast } from "@/components/ui/sonner";
import { format } from "date-fns";

const ACTION_LABELS: Record<AuditAction, string> = {
  create: "Criação",
  update: "Atualização",
  adjustment: "Ajuste",
};

const AuditoriaPage = () => {
  const { dateRange } = useApp();
  const { getLogsInRange } = useAudit();
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("todos");
  const [filterAction, setFilterAction] = useState("todos");

  const allLogs = useMemo(() => getLogsInRange(dateRange.from, dateRange.to), [dateRange, getLogsInRange]);

  const filtered = useMemo(() => {
    return allLogs.filter((log) => {
      const matchSearch =
        log.user.toLowerCase().includes(search.toLowerCase()) ||
        log.module.toLowerCase().includes(search.toLowerCase()) ||
        log.produto.toLowerCase().includes(search.toLowerCase());
      const matchUser = filterUser === "todos" || log.user === filterUser;
      const matchAction = filterAction === "todos" || log.action === filterAction;
      return matchSearch && matchUser && matchAction;
    });
  }, [allLogs, search, filterUser, filterAction]);

  const uniqueUsers = [...new Set(allLogs.map((l) => l.user))];

  const exportCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Ação", "Módulo", "Produto", "Antes", "Depois", "IP", "Dispositivo"];
    const rows = filtered.map((l) => [l.timestamp, l.user, ACTION_LABELS[l.action], l.module, l.produto, l.antes, l.depois, l.ip, l.device]);
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
      head: [["Data/Hora", "Usuário", "Ação", "Módulo", "Produto", "Antes", "Depois", "IP", "Dispositivo"]],
      body: filtered.map((l) => [l.timestamp, l.user, ACTION_LABELS[l.action], l.module, l.produto, l.antes, l.depois, l.ip, l.device]),
      styles: { fontSize: 8 },
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
              placeholder="Buscar por usuário, módulo ou produto..."
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
              <SelectItem value="adjustment">Ajuste</SelectItem>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-foreground">
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Data/Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Usuário</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Ação</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Módulo</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Produto</th>
                  <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Antes</th>
                  <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Depois</th>
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
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-3 font-medium">{log.user}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${
                        log.action === "create" ? "border-success/40 text-success" :
                        log.action === "update" ? "border-primary/40 text-primary" :
                        "border-destructive/40 text-destructive"
                      }`}>
                        {ACTION_LABELS[log.action]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{log.module}</td>
                    <td className="px-4 py-3">{log.produto}</td>
                    <td className="px-4 py-3 text-center text-xs text-muted-foreground">{log.antes}</td>
                    <td className="px-4 py-3 text-center text-xs font-medium">{log.depois}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{log.ip}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{log.device}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro encontrado. Salve dados no Estoque ou Sangrias para gerar logs.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditoriaPage;
