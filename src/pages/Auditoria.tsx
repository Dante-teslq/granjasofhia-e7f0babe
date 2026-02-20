import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { FileText, Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";

const mockLogs = [
  { id: 1, user: "Operador 1", action: "Registro de venda", produto: "Ovo Tipo A", antes: "120", depois: "40", data: "16/02/2026 08:32", ip: "192.168.1.10", device: "Desktop" },
  { id: 2, user: "Operador 2", action: "Ajuste de estoque", produto: "Ovo Caipira", antes: "40", depois: "38", data: "16/02/2026 09:15", ip: "192.168.1.22", device: "Tablet" },
  { id: 3, user: "Supervisor", action: "Aprovação de ajuste", produto: "Ovo Tipo B", antes: "—", depois: "—", data: "16/02/2026 10:45", ip: "192.168.1.5", device: "Desktop" },
  { id: 4, user: "Operador 3", action: "Registro de quebra", produto: "Ovo Tipo A", antes: "0", depois: "3", data: "16/02/2026 11:20", ip: "192.168.1.15", device: "Mobile" },
  { id: 5, user: "Operador 1", action: "Entrada de estoque", produto: "Ovo Tipo B", antes: "85", depois: "105", data: "16/02/2026 13:00", ip: "192.168.1.10", device: "Desktop" },
];

const AuditoriaPage = () => {
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("todos");
  const [filterAction, setFilterAction] = useState("todos");

  const filtered = mockLogs.filter((log) => {
    const matchSearch =
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.produto.toLowerCase().includes(search.toLowerCase());
    const matchUser = filterUser === "todos" || log.user === filterUser;
    const matchAction = filterAction === "todos" || log.action === filterAction;
    return matchSearch && matchUser && matchAction;
  });

  const uniqueUsers = [...new Set(mockLogs.map((l) => l.user))];
  const uniqueActions = [...new Set(mockLogs.map((l) => l.action))];

  const exportCSV = () => {
    const headers = ["Data/Hora", "Usuário", "Ação", "Produto", "Antes", "Depois", "IP", "Dispositivo"];
    const rows = filtered.map((l) => [l.data, l.user, l.action, l.produto, l.antes, l.depois, l.ip, l.device]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
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
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, 14, 22);

    autoTable(doc, {
      startY: 28,
      head: [["Data/Hora", "Usuário", "Ação", "Produto", "Antes", "Depois", "IP", "Dispositivo"]],
      body: filtered.map((l) => [l.data, l.user, l.action, l.produto, l.antes, l.depois, l.ip, l.device]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [180, 155, 100] },
    });

    doc.save(`auditoria_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success("PDF exportado com sucesso!");
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Log de Auditoria</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Registro imutável de todas as movimentações — somente leitura
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
              placeholder="Buscar por usuário, ação ou produto..."
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
              {uniqueActions.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-foreground">
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Data/Hora</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Usuário</th>
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Ação</th>
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
                    className={`border-t border-border transition-colors hover:bg-muted/30 ${
                      idx % 2 === 0 ? "" : "bg-muted/20"
                    }`}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{log.data}</td>
                    <td className="px-4 py-3 font-medium">{log.user}</td>
                    <td className="px-4 py-3">{log.action}</td>
                    <td className="px-4 py-3">{log.produto}</td>
                    <td className="px-4 py-3 text-center">{log.antes}</td>
                    <td className="px-4 py-3 text-center font-medium">{log.depois}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{log.ip}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{log.device}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Nenhum registro encontrado.
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
