import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { TrendingUp, TrendingDown, BarChart3, Download, Plus, Edit2, Trash2, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { useApp } from "@/contexts/AppContext";
import { useVendasRegistros } from "@/hooks/useVendasRegistros";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const COLORS = ["hsl(0, 0%, 65%)", "hsl(40, 45%, 67%)", "hsl(40, 45%, 47%)", "hsl(40, 50%, 57%)"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} className="text-xs flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value?.toLocaleString("pt-BR")}</span>
        </p>
      ))}
    </div>
  );
};

const ApuracaoPage = () => {
  const { currentRole } = useApp();
  const isAdmin = currentRole === "Administrador";
  const { pontosVenda, anos, getStoreData, getRanking, getRankingByMonth, upsertRegistro, deleteRegistro, loading, registros } = useVendasRegistros();

  const [selectedStore, setSelectedStore] = useState("");
  const [selectedYear, setSelectedYear] = useState("");

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editStore, setEditStore] = useState("");
  const [editYear, setEditYear] = useState("");
  const [editMonth, setEditMonth] = useState(1);
  const [editValue, setEditValue] = useState("");
  const [rankingMonth, setRankingMonth] = useState(0); // 0 = all months

  // Auto-select first store/year when data loads
  const activeStore = selectedStore || pontosVenda[0] || "";
  const activeYear = selectedYear || anos[anos.length - 1] || "";

  const storeData = activeStore ? getStoreData(activeStore) : {};
  const storeYears = Object.keys(storeData).sort();

  const chartData = months.map((m, i) => ({
    mes: m,
    ...(Object.fromEntries(
      storeYears.map((y) => [y, storeData[y]?.[i] || 0])
    )),
  }));

  const currentYearData = storeData[activeYear] || new Array(12).fill(0);
  const prevYearData = storeData[String(Number(activeYear) - 1)] || new Array(12).fill(0);
  const totalCurrent = currentYearData.reduce((a: number, b: number) => a + b, 0);
  const totalPrev = prevYearData.reduce((a: number, b: number) => a + b, 0);
  const variation = totalPrev > 0 ? (((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(2) : "—";

  const ranking = rankingMonth === 0
    ? getRanking(Number(activeYear))
    : getRankingByMonth(Number(activeYear), rankingMonth);

  const exportCSV = () => {
    const headers = ["Mês", ...storeYears];
    const rows = months.map((m, i) => [m, ...storeYears.map((y) => storeData[y]?.[i]?.toString() || "0")]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apuracao_${activeStore}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const handleSaveEdit = async () => {
    const val = parseFloat(editValue);
    if (isNaN(val) || !editStore || !editYear) {
      toast.error("Preencha todos os campos corretamente.");
      return;
    }
    const { error } = await upsertRegistro(editStore, Number(editYear), editMonth, val);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Registro salvo com sucesso!");
      setEditOpen(false);
    }
  };

  const handleDeleteMonth = async (store: string, year: string, mes: number) => {
    const rec = registros.find(
      (r) => r.ponto_venda === store && r.ano === Number(year) && r.mes === mes
    );
    if (!rec) return;
    const { error } = await deleteRegistro(rec.id);
    if (error) {
      toast.error("Erro ao excluir.");
    } else {
      toast.success("Registro excluído!");
    }
  };


  const openEdit = (store: string, year: string, mes: number, currentVal: number) => {
    setEditStore(store);
    setEditYear(year);
    setEditMonth(mes);
    setEditValue(String(currentVal));
    setEditOpen(true);
  };

  if (loading && registros.length === 0) {
    return (
      <DashboardLayout>
        <div className="p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Carregando dados de apuração...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Apuração de Vendas</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Histórico mensal de vendas por loja — caixas com 360 cartelas</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <GlobalDateFilter />
            <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5 h-9">
              <Download className="w-3.5 h-3.5" /> CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={activeStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue placeholder="Ponto de venda" />
            </SelectTrigger>
            <SelectContent>
              {pontosVenda.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={activeYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {anos.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => openEdit(activeStore, activeYear, 1, 0)}
            >
              <Plus className="w-3.5 h-3.5" /> Novo Registro
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Total {activeYear}</p>
            <p className="text-2xl font-bold text-foreground">{totalCurrent.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground mt-1">caixas</p>
          </div>
          <div className="glass-card rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Total {Number(activeYear) - 1}</p>
            <p className="text-2xl font-bold text-foreground">{totalPrev.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground mt-1">caixas</p>
          </div>
          <div className="glass-card rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Variação</p>
            <div className="flex items-center gap-2">
              <p className={`text-2xl font-bold ${Number(variation) >= 0 ? "text-success" : "text-destructive"}`}>
                {variation}%
              </p>
              {Number(variation) >= 0 ? (
                <TrendingUp className="w-5 h-5 text-success" />
              ) : (
                <TrendingDown className="w-5 h-5 text-destructive" />
              )}
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="glass-card rounded-lg p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Vendas Mensais — {activeStore}</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,88%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {storeYears.map((y, i) => (
                <Bar
                  key={y}
                  dataKey={y}
                  name={y}
                  fill={COLORS[i % COLORS.length]}
                  radius={[3, 3, 0, 0]}
                  animationDuration={800}
                  animationBegin={i * 150}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Ranking */}
        {ranking.length > 0 && (
          <div className="glass-card rounded-lg p-5">
            <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Ranking de Pontos de Venda — {rankingMonth === 0 ? `Anual ${activeYear}` : `${months[rankingMonth - 1]}/${activeYear}`}
                </h3>
              </div>
              <Select value={String(rankingMonth)} onValueChange={(v) => setRankingMonth(Number(v))}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Todos os meses</SelectItem>
                  {months.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}/{activeYear}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {ranking.map((r, i) => {
                const maxTotal = ranking[0]?.total || 1;
                const pct = (r.total / maxTotal) * 100;
                return (
                  <div key={r.store} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right">{i + 1}º</span>
                    <span className="text-sm font-medium text-foreground w-36 truncate">{r.store}</span>
                    <div className="flex-1 h-5 bg-muted/30 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary/60 transition-all duration-700"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-foreground w-20 text-right">
                      {r.total.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Table */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-foreground">
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Mês</th>
                  {storeYears.map((y) => (
                    <th key={y} className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">{y}</th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Var. %</th>
                  {isAdmin && (
                    <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => {
                  const curr = storeData[activeYear]?.[i] || 0;
                  const prev = storeData[String(Number(activeYear) - 1)]?.[i] || 0;
                  const pct = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : "—";
                  return (
                    <tr key={m} className={`border-t border-border hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-2.5 font-medium">{m}</td>
                      {storeYears.map((y) => (
                        <td key={y} className="px-4 py-2.5 text-center text-muted-foreground">
                          {storeData[y]?.[i]?.toLocaleString("pt-BR", { minimumFractionDigits: 1 }) || "—"}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-center">
                        {pct !== "—" ? (
                          <Badge
                            variant="outline"
                            className={Number(pct) >= 0 ? "text-success border-success/30" : "text-destructive border-destructive/30"}
                          >
                            {Number(pct) >= 0 ? "+" : ""}{pct}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEdit(activeStore, activeYear, i + 1, curr)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            {curr > 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => handleDeleteMonth(activeStore, activeYear, i + 1)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Registro de Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Ponto de Venda</label>
              <Select value={editStore} onValueChange={setEditStore}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {pontosVenda.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Ano</label>
                <Input
                  type="number"
                  className="mt-1"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  min={2020}
                  max={2030}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Mês</label>
                <Select value={String(editMonth)} onValueChange={(v) => setEditMonth(Number(v))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {months.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Total (caixas)</label>
              <Input
                type="number"
                className="mt-1"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                step="0.5"
                min="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </DashboardLayout>
  );
};

export default ApuracaoPage;
