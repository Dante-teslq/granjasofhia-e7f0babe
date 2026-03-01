import {
  Package, AlertTriangle, CheckCircle, ShieldAlert,
  ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { useInventory } from "@/contexts/InventoryContext";
import { useApp } from "@/contexts/AppContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const weeklyData = [
  { dia: "Seg", vendas: 85, perdas: 4, entradas: 30 },
  { dia: "Ter", vendas: 92, perdas: 6, entradas: 25 },
  { dia: "Qua", vendas: 78, perdas: 3, entradas: 40 },
  { dia: "Qui", vendas: 95, perdas: 8, entradas: 35 },
  { dia: "Sex", vendas: 110, perdas: 5, entradas: 20 },
  { dia: "Sáb", vendas: 130, perdas: 7, entradas: 50 },
  { dia: "Dom", vendas: 60, perdas: 2, entradas: 15 },
];

const CHART_COLORS = {
  vendas: "hsl(40, 45%, 57%)",
  entradas: "hsl(0, 0%, 65%)",
  perdas: "hsl(0, 65%, 51%)",
};

const Index = () => {
  const navigate = useNavigate();
  const { getStockInRange } = useInventory();
  const { dateRange } = useApp();

  // Use date range from global filter
  const allStockItems = getStockInRange(dateRange.from, dateRange.to);
  const totalTrincado = allStockItems.reduce((sum, item) => sum + item.trincado, 0);
  const totalQuebrado = allStockItems.reduce((sum, item) => sum + item.quebrado, 0);
  // Apenas quebrados são perdas definitivas; trincados são reclassificação
  const totalPerdas = totalQuebrado;
  const totalFaltas = allStockItems.reduce((sum, item) => sum + Math.abs(item.estoqueLoja - item.estoqueSistema), 0);

  const hasData = allStockItems.length > 0 && allStockItems.some(i => i.descricao);

  const perdasData = [
    { name: "Reclassificados (Trincados)", value: totalTrincado || 24, color: "hsl(40, 45%, 57%)" },
    { name: "Perdas (Quebrados)", value: totalQuebrado || 11, color: "hsl(0, 65%, 51%)" },
  ];
  const perdasTotal = perdasData.reduce((s, d) => s + d.value, 0);

  const alerts = [
    { type: "warning", message: "Ajuste manual acima do limite detectado no produto Ovo Tipo A", time: "Há 2h", link: "/alertas" },
    { type: "danger", message: "Ajuste manual sem justificativa pendente de aprovação", time: "Há 4h", link: "/auditoria" },
    { type: "info", message: "Movimentação fora do horário registrada por Operador 3", time: "Há 6h", link: "/alertas" },
  ];

  const stats = [
    { label: "Faltas Totais", value: hasData ? totalFaltas.toFixed(1) : "354", icon: Package, trend: "+3.2%", up: false, link: "/estoque" },
    { label: "Vendido Hoje", value: hasData ? "—" : "160", icon: CheckCircle, trend: "+12%", up: true, link: "/apuracao" },
    { label: "Perdas Hoje", value: hasData ? totalPerdas.toString() : "7", icon: AlertTriangle, trend: "-2.1%", up: false, link: "/estoque" },
    { label: "Alertas Ativos", value: "3", icon: ShieldAlert, trend: "", up: false, link: "/alertas" },
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
      <div className="p-6 lg:p-10 space-y-8 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">Dashboard Executivo</h1>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-2">Visão geral operacional — Granja Sofhia</p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => (
            <div
              key={stat.label}
              onClick={() => navigate(stat.link)}
              className="glass-card-interactive p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary">
                  <stat.icon className="w-5 h-5" />
                </div>
                {stat.trend && (
                  <span className={`text-xs font-bold flex items-center gap-0.5 px-3 py-1 rounded-full uppercase tracking-wide ${
                    stat.up
                      ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                      : "bg-red-100/80 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                  }`}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card p-6 lg:p-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Movimentação Semanal</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={weeklyData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.5} />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(0,0%,90%)", opacity: 0.15 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 16 }} />
                <Bar dataKey="vendas" name="Vendas" fill={CHART_COLORS.vendas} radius={[6, 6, 0, 0]} animationDuration={800} />
                <Bar dataKey="entradas" name="Entradas" fill={CHART_COLORS.entradas} radius={[6, 6, 0, 0]} animationDuration={800} animationBegin={200} />
                <Bar dataKey="perdas" name="Perdas" fill={CHART_COLORS.perdas} radius={[6, 6, 0, 0]} animationDuration={800} animationBegin={400} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card p-6 lg:p-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Composição de Perdas</h3>
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
            <div className="flex justify-center gap-4 mt-4">
              {perdasData.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  {item.name}: {item.value}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="glass-card p-6 lg:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Alertas Inteligentes</h3>
            <button onClick={() => navigate("/alertas")} className="text-xs text-primary hover:underline font-bold uppercase tracking-wide">
              Ver todos
            </button>
          </div>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                onClick={() => navigate(alert.link)}
                className={`group flex items-start gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border ${
                  alert.type === "danger"
                    ? "border-red-200/60 bg-red-50/60 hover:bg-red-50 dark:border-red-500/20 dark:bg-red-500/5 dark:hover:bg-red-500/10"
                    : alert.type === "warning"
                    ? "border-amber-200/60 bg-amber-50/60 hover:bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
                    : "border-slate-200/60 bg-slate-50/60 hover:bg-slate-50 dark:border-slate-700/30 dark:bg-slate-800/30 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
                  alert.type === "danger"
                    ? "bg-red-100/80 text-red-600 dark:bg-red-500/10 dark:text-red-400"
                    : alert.type === "warning"
                    ? "bg-amber-100/80 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                    : "bg-slate-100/80 text-slate-500 dark:bg-slate-700/50 dark:text-slate-400"
                }`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{alert.message}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divergence + Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 lg:p-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Índice de Divergência</h3>
            <div className="flex items-end gap-4">
              <span className="text-5xl font-extrabold tracking-tight text-primary">2.3%</span>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 pb-2">dentro do limite aceitável</span>
            </div>
            <div className="mt-6 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all" style={{ width: "23%" }} />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              <span>0%</span>
              <span className="text-red-500 dark:text-red-400">Limite: 5%</span>
              <span>10%</span>
            </div>
          </div>

          <div className="glass-card p-6 lg:p-8">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-6">Ranking de Movimentação</h3>
            <div className="space-y-2">
              {[
                { name: "Operador 1", mov: 245, risk: "baixo" },
                { name: "Operador 2", mov: 198, risk: "baixo" },
                { name: "Operador 3", mov: 312, risk: "médio" },
              ].map((op, i) => (
                <div key={i} className="group flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-sm">
                      {i + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{op.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{op.mov}</span>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                      op.risk === "baixo"
                        ? "bg-emerald-100/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                    }`}>{op.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
