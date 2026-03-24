import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Search, ShoppingCart, Package, ArrowRightLeft,
  Clipboard, DollarSign, Camera,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MODULE_ICONS: Record<string, typeof FileText> = {
  Estoque: Package,
  "Vendas Diárias": ShoppingCart,
  Transferências: ArrowRightLeft,
  Insumos: Clipboard,
  Apuração: DollarSign,
  Evidências: Camera,
  Sangrias: DollarSign,
};

const ACTION_LABELS: Record<string, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Exclusão",
  adjustment: "Ajuste",
};

const ACTION_COLORS: Record<string, string> = {
  create: "border-success/40 text-success",
  update: "border-primary/40 text-primary",
  delete: "border-destructive/40 text-destructive",
  adjustment: "border-warning/40 text-warning",
};

const ActivityHistory = () => {
  const { dateRange } = useApp();
  const { logs, loading, fetchLogs } = useAudit();
  const [search, setSearch] = useState("");
  const [filterModule, setFilterModule] = useState("todos");

  useEffect(() => {
    fetchLogs(dateRange.from, dateRange.to);
  }, [dateRange.from, dateRange.to, fetchLogs]);

  // Filter out login/logout, keep only operational logs
  const filtered = useMemo(() => {
    return logs
      .filter((log) => !["login", "logout"].includes(log.action))
      .filter((log) => {
        const matchSearch =
          log.usuario.toLowerCase().includes(search.toLowerCase()) ||
          log.item_description.toLowerCase().includes(search.toLowerCase()) ||
          log.module.toLowerCase().includes(search.toLowerCase());
        const matchModule = filterModule === "todos" || log.module === filterModule;
        return matchSearch && matchModule;
      });
  }, [logs, search, filterModule]);

  const modules = useMemo(() => {
    const set = new Set(logs.filter(l => !["login", "logout"].includes(l.action)).map((l) => l.module));
    return Array.from(set).sort();
  }, [logs]);

  if (loading) {
    return (
      <div className="glass-card p-6">
        <p className="text-sm text-muted-foreground text-center py-8">Carregando histórico...</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Histórico de Registros ({filtered.length})
        </h3>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-8 h-8 w-[180px] text-xs"
            />
          </div>
          <Select value={filterModule} onValueChange={setFilterModule}>
            <SelectTrigger className="w-[150px] h-8 text-xs">
              <SelectValue placeholder="Módulo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os módulos</SelectItem>
              {modules.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.slice(0, 100).map((log) => {
          const ModIcon = MODULE_ICONS[log.module] || FileText;
          return (
            <div
              key={log.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 rounded-md bg-muted/30 border border-border"
            >
              <ModIcon className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{log.item_description}</p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  <span>• {log.usuario}</span>
                  <span>• {log.device || "Desktop"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className={`text-[10px] ${ACTION_COLORS[log.action] || ""}`}>
                  {ACTION_LABELS[log.action] || log.action}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {log.module}
                </Badge>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum registro encontrado para o período selecionado.
          </p>
        )}
        {filtered.length > 100 && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Mostrando 100 de {filtered.length} registros. Use os filtros para refinar.
          </p>
        )}
      </div>
    </div>
  );
};

export default ActivityHistory;
