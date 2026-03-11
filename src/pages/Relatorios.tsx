import { useState, useMemo } from "react";
import { FileText, DollarSign, ShoppingCart, TrendingUp, Package } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useApp } from "@/contexts/AppContext";
import { usePontosDeVenda } from "@/hooks/usePontosDeVenda";
import { useVendasDiarias } from "@/hooks/useVendasDiarias";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(var(--primary))", "hsl(40, 45%, 57%)", "hsl(142, 40%, 45%)",
  "hsl(0, 65%, 51%)", "hsl(200, 60%, 50%)", "hsl(280, 50%, 55%)",
];

const RelatoriosPage = () => {
  const { dateRange } = useApp();
  const { pdvs, pdvsById } = usePontosDeVenda();
  const { records, loading } = useVendasDiarias({ from: dateRange.from, to: dateRange.to });

  const [filterPdv, setFilterPdv] = useState("all");
  const [filterProduto, setFilterProduto] = useState("all");

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterPdv !== "all" && r.ponto_venda !== filterPdv) return false;
      if (filterProduto !== "all" && r.produto !== filterProduto) return false;
      return true;
    });
  }, [records, filterPdv, filterProduto]);

  const totalFaturamento = filtered.reduce((s, r) => s + r.total, 0);
  const totalQtd = filtered.reduce((s, r) => s + r.quantidade, 0);
  const uniqueProducts = [...new Set(records.map(r => r.produto))];
  const uniquePdvs = [...new Set(records.map(r => r.ponto_venda))];

  // By PDV
  const vendasPorPdv = useMemo(() => {
    const map: Record<string, { pdv: string; total: number; qtd: number }> = {};
    filtered.forEach(r => {
      if (!map[r.ponto_venda]) map[r.ponto_venda] = { pdv: r.ponto_venda, total: 0, qtd: 0 };
      map[r.ponto_venda].total += r.total;
      map[r.ponto_venda].qtd += r.quantidade;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  // By Product
  const vendasPorProduto = useMemo(() => {
    const map: Record<string, { produto: string; total: number; qtd: number }> = {};
    filtered.forEach(r => {
      if (!map[r.produto]) map[r.produto] = { produto: r.produto, total: 0, qtd: 0 };
      map[r.produto].total += r.total;
      map[r.produto].qtd += r.quantidade;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl p-3 shadow-lg">
        <p className="text-sm font-bold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs">
            <span className="text-muted-foreground">{entry.name}: </span>
            <span className="font-semibold text-foreground">R$ {entry.value?.toLocaleString('pt-BR')}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 max-w-[1400px] animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Relatórios de Vendas</h1>
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Análise completa por período, PDV e produto</p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <Select value={filterPdv} onValueChange={setFilterPdv}>
            <SelectTrigger className="w-[200px] h-10"><SelectValue placeholder="PDV" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os PDVs</SelectItem>
              {uniquePdvs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterProduto} onValueChange={setFilterProduto}>
            <SelectTrigger className="w-[200px] h-10"><SelectValue placeholder="Produto" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Produtos</SelectItem>
              {uniqueProducts.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[
            { label: "Faturamento Total", value: `R$ ${totalFaturamento.toFixed(2)}`, icon: DollarSign },
            { label: "Quantidade Vendida", value: totalQtd.toString(), icon: ShoppingCart },
            { label: "PDVs Ativos", value: vendasPorPdv.length.toString(), icon: TrendingUp },
            { label: "Produtos Vendidos", value: vendasPorProduto.length.toString(), icon: Package },
          ].map(stat => (
            <div key={stat.label} className="glass-card p-4 md:p-6">
              <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 text-primary mb-3">
                <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <p className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* By PDV Bar Chart */}
          <div className="glass-card p-4 md:p-6">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Vendas por PDV</h3>
            {vendasPorPdv.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={vendasPorPdv}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="pdv" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Total (R$)" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </div>

          {/* By Product Pie */}
          <div className="glass-card p-4 md:p-6">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4">Produtos Mais Vendidos</h3>
            {vendasPorProduto.length > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-4">
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={vendasPorProduto.slice(0, 6)} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="total" strokeWidth={2} stroke="hsl(var(--card))">
                      {vendasPorProduto.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 w-full">
                  {vendasPorProduto.slice(0, 6).map((p, i) => (
                    <div key={p.produto} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-foreground truncate max-w-[150px]">{p.produto}</span>
                      </div>
                      <span className="font-bold text-foreground">R$ {p.total.toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">Sem dados</div>
            )}
          </div>
        </div>

        {/* Detail Table */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Detalhamento de Vendas ({filtered.length} registros)</h2>
          </div>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>PDV</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Vendedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 100).map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{format(new Date(r.data + "T12:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell className="font-medium text-sm">{r.produto}</TableCell>
                      <TableCell className="text-xs">{r.ponto_venda}</TableCell>
                      <TableCell className="text-right">{r.quantidade}</TableCell>
                      <TableCell className="text-right font-bold">R$ {r.total.toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{r.usuario || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default RelatoriosPage;
