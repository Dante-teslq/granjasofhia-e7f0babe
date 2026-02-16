import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { FileText, Search, Filter, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockLogs = [
  { id: 1, user: "Operador 1", action: "Registro de venda", produto: "Ovo Tipo A", antes: "120", depois: "40", data: "16/02/2026 08:32", ip: "192.168.1.10", device: "Desktop" },
  { id: 2, user: "Operador 2", action: "Ajuste de estoque", produto: "Ovo Caipira", antes: "40", depois: "38", data: "16/02/2026 09:15", ip: "192.168.1.22", device: "Tablet" },
  { id: 3, user: "Supervisor", action: "Aprovação de ajuste", produto: "Ovo Tipo B", antes: "—", depois: "—", data: "16/02/2026 10:45", ip: "192.168.1.5", device: "Desktop" },
  { id: 4, user: "Operador 3", action: "Registro de quebra", produto: "Ovo Tipo A", antes: "0", depois: "3", data: "16/02/2026 11:20", ip: "192.168.1.15", device: "Mobile" },
  { id: 5, user: "Operador 1", action: "Entrada de estoque", produto: "Ovo Tipo B", antes: "85", depois: "105", data: "16/02/2026 13:00", ip: "192.168.1.10", device: "Desktop" },
];

const AuditoriaPage = () => {
  const [search, setSearch] = useState("");

  const filtered = mockLogs.filter(
    (log) =>
      log.user.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.produto.toLowerCase().includes(search.toLowerCase())
  );

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
          <Badge variant="outline" className="w-fit border-primary/30 text-primary gap-1.5">
            <FileText className="w-3 h-3" />
            {mockLogs.length} registros
          </Badge>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por usuário, ação ou produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
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
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AuditoriaPage;
