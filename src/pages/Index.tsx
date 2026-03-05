import {
  Package, AlertTriangle, ShieldAlert, ShoppingCart, DollarSign,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Trophy, AlertCircle, Heart,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { useApp } from "@/contexts/AppContext";
import { useFraud } from "@/contexts/FraudContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Area, ComposedChart,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const HEALTH_COLORS = {
  Saudável: "hsl(142, 40%, 45%)",
  Atenção: "hsl(44, 91%, 52%)",
  Crítico: "hsl(0, 65%, 51%)",
};

const Index = () => {
  const navigate = useNavigate();
  const { dateRange } = useApp();
  const { getAlertsInRange } = useFraud();

  const {
    loading, vendas, estoque, comparison, trendLine,
    stockHealth, rankings,
  } = useDashboardData({ from: dateRange.from, to: dateRange.to });

  const alertsInRange = getAlertsInRange(dateRange.from, dateRange.to);
  const activeAlerts = alertsInRange.filter(a => a.status === "ativo");
  const allAlerts = [
    ...estoque.alertas.map(a => ({ ...a, timestamp: "", status: "ativo" as const })),
    ...activeAlerts,
  ];

  const VariationBadge = ({ value }: { value: number }) => {
    if (value === 0) return null;
    const isUp = value > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-[10px] md:text-xs font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
        {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        {Math.abs(value).toFixed(1)}%
      </span>
    );
  };

  const stats = [
    { label: "Vendas Hoje", value: `R$ ${vendas.totalHoje.toFixed(2)}`, icon: ShoppingCart, link: "/vendas-diarias", variation: comparison.vendasHojeVar },
    { label: "Vendas no Período", value: `R$ ${vendas.totalPeriodo.toFixed(2)}`, icon: DollarSign, link: "/vendas-diarias", variation: comparison.vendasPeriodoVar },
    { label: "Faltas Totais", value: estoque.hasData ? estoque.totalFaltas.toFixed(1) : "0", icon: Package, link: "/estoque", variation: comparison.faltasVar, invertColor: true },
    { label: "Alertas Ativos", value: allAlerts.length.toString(), icon: ShieldAlert, link: "/alertas", variation: 0 },
  ];

  // Chart data
  const vendasChartData = trendLine.map(d => ({
    dia: format(new Date(d.data + "T12:00:00"), "dd/MM", { locale: ptBR }),
    total: d.total,
    anterior: d.anterior,
    tendencia: d.tendencia,
    isBest: d.isBest,
  }));

  // Estoque daily chart
  const dailyChartData = estoque.porDia.slice(0, 14).map(d => ({
    dia: format(new Date(d.data + "T12:00:00"), "dd/MM", { locale: ptBR }),
    estoque: d.vendas,
    entradas: d.entradas,
  }));

  // Stock health pie data
  const healthPieData = [
    { name: "Saudável", value: stockHealth.saudavel, color: HEALTH_COLORS["Saudável"] },
    { name: "Atenção", value: stockHealth.atencao, color: HEALTH_COLORS["Atenção"] },
    { name: "Crítico", value: stockHealth.critico, color: HEALTH_COLORS["Crítico"] },
  ].filter(d => d.value > 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl p-4 shadow-lg">
        <p className="text-sm font-bold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: entry.color || entry.stroke }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">{typeof entry.value === 'number' ? entry.value.toLocaleString('pt-BR') : entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 max-w-[1400px] animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Dashboard Executivo</h1>
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1 md:mt-2">Visão estratégica — Granja Sofhia</p>
          </div>
          <GlobalDateFilter />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-sm text-muted-foreground">Carregando dados...</div>
          </div>
        )}

        {/* Stats Cards with Variation */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              onClick={() => navigate(stat.link)}
              className="glass-card-interactive p-4 md:p-6"
            >
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 text-primary">
                  <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
                </div>
                <VariationBadge value={stat.invertColor ? -stat.variation : stat.variation} />
              </div>
              <p className="text-xl md:text-3xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1 md:mt-1.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row: Vendas com Tendência + Movimentação de Estoque */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Vendas com Tendência */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Vendas com Tendência</h3>
              </div>
              <button onClick={() => navigate("/vendas-diarias")} className="text-xs text-primary hover:underline font-bold uppercase tracking-wide">
                Ver todas
              </button>
            </div>
            {vendasChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={vendasChartData} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                    <Bar dataKey="total" name="Atual (R$)" fill="hsl(var(--primary))" radius={[6, 6, 6, 6]} animationDuration={800} />
                    <Bar dataKey="anterior" name="Anterior (R$)" fill="hsl(var(--muted-foreground))" opacity={0.3} radius={[6, 6, 6, 6]} animationDuration={800} animationBegin={200} />
                    <Line type="monotone" dataKey="tendencia" name="Tendência" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="6 3" dot={false} animationDuration={1000} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary inline-block" /> Atual</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-muted-foreground/30 inline-block" /> Anterior</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-destructive inline-block" style={{ borderTop: "2px dashed" }} /> Tendência</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Nenhuma venda registrada no período
              </div>
            )}
          </div>

          {/* Movimentação de Estoque */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 md:mb-6">Movimentação de Estoque</h3>
            {dailyChartData.length > 0 && estoque.hasData ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyChartData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                  <Bar dataKey="estoque" name="Estoque Loja" fill="hsl(40, 45%, 57%)" radius={[6, 6, 6, 6]} animationDuration={800} />
                  <Bar dataKey="entradas" name="Estoque Sistema" fill="hsl(0, 0%, 65%)" radius={[6, 6, 6, 6]} animationDuration={800} animationBegin={200} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Nenhum registro encontrado no período
              </div>
            )}
          </div>
        </div>

        {/* Saúde do Estoque + Divergência */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Saúde do Estoque */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Heart className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Saúde do Estoque</h3>
            </div>
            {stockHealth.total > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-[160px] h-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={healthPieData}
                        cx="50%" cy="50%"
                        innerRadius={45} outerRadius={70}
                        dataKey="value"
                        animationDuration={800}
                        strokeWidth={2}
                        stroke="hsl(var(--card))"
                      >
                        {healthPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 w-full">
                  {[
                    { label: "Saudável", count: stockHealth.saudavel, color: HEALTH_COLORS["Saudável"], icon: "✓" },
                    { label: "Atenção", count: stockHealth.atencao, color: HEALTH_COLORS["Atenção"], icon: "!" },
                    { label: "Crítico", count: stockHealth.critico, color: HEALTH_COLORS["Crítico"], icon: "✕" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                        <span className="text-sm text-foreground font-medium">{item.label}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground">{item.count} {item.count === 1 ? "produto" : "produtos"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
                Nenhum dado de estoque no período
              </div>
            )}
          </div>

          {/* Divergência */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 md:mb-6">Índice de Divergência</h3>
            <div className="flex items-end gap-4">
              <span className="text-3xl md:text-5xl font-extrabold tracking-tight text-primary">
                {estoque.divergencePercent.toFixed(1)}%
              </span>
              <span className="text-xs font-medium text-muted-foreground pb-1 md:pb-2">
                {estoque.divergencePercent <= 5 ? "dentro do limite aceitável" : "acima do limite!"}
              </span>
            </div>
            <div className="mt-4 md:mt-6 h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${estoque.divergencePercent > 5 ? "bg-gradient-to-r from-destructive to-destructive/70" : "bg-gradient-to-r from-primary to-primary/70"}`}
                style={{ width: `${Math.min(estoque.divergencePercent * 10, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>0%</span>
              <span className="text-destructive">Limite: 5%</span>
              <span>10%</span>
            </div>
          </div>
        </div>

        {/* Rankings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Top Vendidos */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Trophy className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Top 5 Mais Vendidos</h3>
            </div>
            {rankings.topVendidos.length > 0 ? (
              <div className="space-y-2">
                {rankings.topVendidos.map((p, i) => {
                  const maxTotal = rankings.topVendidos[0]?.total || 1;
                  const pct = (p.total / maxTotal) * 100;
                  return (
                    <div key={p.produto} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{p.produto}</span>
                          <span className="text-xs font-bold text-foreground ml-2 shrink-0">R$ {p.total.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                Nenhuma venda no período
              </div>
            )}
          </div>

          {/* Top Perdas */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Top 5 Maiores Perdas</h3>
            </div>
            {rankings.topPerdas.length > 0 ? (
              <div className="space-y-2">
                {rankings.topPerdas.map((p, i) => {
                  const maxQuebrado = rankings.topPerdas[0]?.quebrado || 1;
                  const pct = (p.quebrado / maxQuebrado) * 100;
                  return (
                    <div key={p.descricao} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i === 0 ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{p.descricao}</span>
                          <span className="text-xs font-bold text-destructive ml-2 shrink-0">{p.quebrado} un.</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-destructive/60 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                Nenhuma perda registrada no período
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="glass-card p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Alertas no Período</h3>
            <button onClick={() => navigate("/alertas")} className="text-xs text-primary hover:underline font-bold uppercase tracking-wide">
              Ver todos
            </button>
          </div>
          <div className="space-y-3">
            {allAlerts.length > 0 ? allAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                onClick={() => navigate(alert.link)}
                className={`group flex items-start gap-3 md:gap-4 p-3 md:p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  alert.severity === "crítica"
                    ? "border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                    : alert.severity === "média"
                    ? "border-warning/20 bg-warning/5 hover:bg-warning/10"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl shrink-0 ${
                  alert.severity === "crítica"
                    ? "bg-destructive/10 text-destructive"
                    : alert.severity === "média"
                    ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{alert.message}</p>
                  {"timestamp" in alert && alert.timestamp && (
                    <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum alerta ativo no período selecionado.</p>
            )}
          </div>
        </div>

        {/* Resumo do Período */}
        <div className="glass-card p-4 md:p-6 lg:p-8">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 md:mb-6">Resumo do Período</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Itens de estoque", value: estoque.records.length.toString() },
              { label: "Produtos únicos", value: estoque.uniqueProducts.toString() },
              { label: "Vendas hoje (un.)", value: vendas.qtdHoje.toString() },
              { label: "Vendas período (un.)", value: vendas.qtdPeriodo.toString() },
            ].map(item => (
              <div key={item.label} className="flex flex-col p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-lg font-bold text-foreground mt-1">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
