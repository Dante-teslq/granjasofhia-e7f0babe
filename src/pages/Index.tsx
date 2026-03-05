import {
  Package, AlertTriangle, CheckCircle, ShieldAlert,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { useApp } from "@/contexts/AppContext";
import { useFraud } from "@/contexts/FraudContext";
import { useEstoqueData } from "@/hooks/useEstoqueData";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CHART_COLORS = {
  vendas: "hsl(40, 45%, 57%)",
  entradas: "hsl(0, 0%, 65%)",
  perdas: "hsl(0, 65%, 51%)",
};

const Index = () => {
  const navigate = useNavigate();
  const { dateRange } = useApp();
  const { getAlertsInRange } = useFraud();

  // Reactive DB data with realtime subscription
  const {
    totalFaltas, totalTrincado, totalQuebrado, totalPerdas, totalVendido,
    hasData, porDia, porProduto, alertas: dbAlertas,
    divergencePercent, loading, records,
  } = useEstoqueData({ from: dateRange.from, to: dateRange.to });

  const alertsInRange = getAlertsInRange(dateRange.from, dateRange.to);
  const activeAlerts = alertsInRange.filter(a => a.status === "ativo");

  // Merge DB-computed alerts with fraud context alerts
  const allAlerts = [
    ...dbAlertas.map(a => ({ ...a, timestamp: "", status: "ativo" as const })),
    ...activeAlerts,
  ];

  // Daily chart data from DB
  const dailyChartData = porDia.slice(0, 14).map(d => ({
    dia: format(new Date(d.data + "T12:00:00"), "dd/MM", { locale: ptBR }),
    vendas: d.vendas,
    perdas: d.perdas,
    entradas: d.entradas,
  }));

  // Perdas pie chart
  const perdasData = [
    { name: "Reclassificados (Trincados)", value: totalTrincado, color: "hsl(40, 45%, 57%)" },
    { name: "Perdas (Quebrados)", value: totalQuebrado, color: "hsl(0, 65%, 51%)" },
  ];
  const perdasTotal = perdasData.reduce((s, d) => s + d.value, 0);

  const stats = [
    { label: "Faltas Totais", value: hasData ? totalFaltas.toFixed(1) : "0", icon: Package, trend: "", up: false, link: "/estoque" },
    { label: "Vendido no Período", value: hasData ? totalVendido.toString() : "0", icon: CheckCircle, trend: "", up: true, link: "/apuracao" },
    { label: "Perdas no Período", value: hasData ? totalPerdas.toString() : "0", icon: AlertTriangle, trend: "", up: false, link: "/estoque" },
    { label: "Alertas Ativos", value: (allAlerts.length).toString(), icon: ShieldAlert, trend: "", up: false, link: "/alertas" },
  ];

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-none rounded-xl p-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
        <p className="text-sm font-bold text-slate-900 dark:text-white mb-2">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs flex items-center gap-2 py-0.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: entry.color }} />
            <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
            <span className="font-semibold text-slate-900 dark:text-white">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    const d = payload[0];
    const pct = perdasTotal > 0 ? ((d.value / perdasTotal) * 100).toFixed(1) : "0";
    return (
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-none rounded-xl p-4 shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)]">
        <p className="text-sm font-bold text-slate-900 dark:text-white">{d.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Quantidade: <span className="font-semibold text-slate-900 dark:text-white">{d.value}</span></p>
        <p className="text-xs text-slate-500 dark:text-slate-400">Percentual: <span className="font-semibold text-slate-900 dark:text-white">{pct}%</span></p>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 max-w-[1400px] animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard Executivo</h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 md:mt-2">Visão geral operacional — Granja Sofhia</p>
          </div>
          <GlobalDateFilter />
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-sm text-muted-foreground">Carregando dados...</div>
          </div>
        )}

        {/* Stats Cards */}
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
              </div>
              <p className="text-xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1 md:mt-1.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 glass-card p-4 md:p-6 lg:p-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 md:mb-6">Movimentação no Período</h3>
            {dailyChartData.length > 0 && hasData ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyChartData} barGap={6}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(0,0%,90%)", opacity: 0.15 }} />
                  <Bar dataKey="vendas" name="Vendas" fill={CHART_COLORS.vendas} radius={[6, 6, 6, 6]} animationDuration={800} />
                  <Bar dataKey="entradas" name="Entradas" fill={CHART_COLORS.entradas} radius={[6, 6, 6, 6]} animationDuration={800} animationBegin={200} />
                  <Bar dataKey="perdas" name="Perdas" fill={CHART_COLORS.perdas} radius={[6, 6, 6, 6]} animationDuration={800} animationBegin={400} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Nenhum registro encontrado no período selecionado
              </div>
            )}
          </div>

          <div className="glass-card p-4 md:p-6 lg:p-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 md:mb-6">Composição de Perdas</h3>
            {perdasTotal > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={perdasData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      animationDuration={800}
                    >
                      {perdasData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} stroke={entry.color} strokeWidth={2} className="transition-opacity hover:opacity-80" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col md:flex-row justify-center gap-2 md:gap-4 mt-4">
                  {perdasData.map((item) => (
                    <div key={item.name} className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      {item.name}: {item.value}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                Sem perdas registradas
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        <div className="glass-card p-4 md:p-6 lg:p-8">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alertas no Período</h3>
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
                    ? "border-red-200/60 bg-red-50/60 hover:bg-red-50 dark:border-red-500/20 dark:bg-red-500/5 dark:hover:bg-red-500/10"
                    : alert.severity === "média"
                    ? "border-amber-200/60 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
                    : "border-slate-200/60 bg-slate-50/60 hover:bg-slate-50 dark:border-slate-700/30 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className={`flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-xl shrink-0 ${
                  alert.severity === "crítica"
                    ? "bg-red-100/80 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    : alert.severity === "média"
                    ? "bg-amber-100/80 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    : "bg-slate-100/80 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.message}</p>
                  {"timestamp" in alert && alert.timestamp && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{alert.timestamp}</p>
                  )}
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum alerta ativo no período selecionado.</p>
            )}
          </div>
        </div>

        {/* Divergence + Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 md:mb-6">Índice de Divergência</h3>
            <div className="flex items-end gap-4">
              <span className="text-3xl md:text-5xl font-extrabold tracking-tight text-primary">
                {divergencePercent.toFixed(1)}%
              </span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 pb-1 md:pb-2">
                {divergencePercent <= 5 ? "dentro do limite aceitável" : "acima do limite!"}
              </span>
            </div>
            <div className="mt-4 md:mt-6 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${divergencePercent > 5 ? "bg-gradient-to-r from-red-500 to-red-400" : "bg-gradient-to-r from-primary to-primary/70"}`}
                style={{ width: `${Math.min(divergencePercent * 10, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>0%</span>
              <span className="text-red-500 dark:text-red-400">Limite: 5%</span>
              <span>10%</span>
            </div>
          </div>

          <div className="glass-card p-4 md:p-6 lg:p-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 md:mb-6">Resumo do Período</h3>
            {hasData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-sm text-muted-foreground">Itens registrados</span>
                  <span className="text-sm font-bold text-foreground">{records.length}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-sm text-muted-foreground">Total trincados</span>
                  <span className="text-sm font-bold text-foreground">{totalTrincado}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                  <span className="text-sm text-muted-foreground">Total quebrados</span>
                  <span className="text-sm font-bold text-foreground">{totalQuebrado}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[150px] text-muted-foreground text-sm">
                Nenhum dado registrado no período
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
