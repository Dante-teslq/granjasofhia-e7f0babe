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
  const { settings, dateRange } = useApp();

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
    { type: "warning", message: "Perdas acima de " + settings.lossLimitPercent + "% detectadas no produto Ovo Tipo A", time: "Há 2h", link: "/estoque" },
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
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-medium text-foreground">{entry.value}</span>
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
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{d.name}</p>
        <p className="text-xs text-muted-foreground">Quantidade: <span className="font-medium text-foreground">{d.value}</span></p>
        <p className="text-xs text-muted-foreground">Percentual: <span className="font-medium text-foreground">{pct}%</span></p>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard Executivo</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral operacional — Granja Sofhia</p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              onClick={() => navigate(stat.link)}
              className="glass-card rounded-lg p-5 cursor-pointer transition-all hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                {stat.trend && (
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.up ? "text-success" : "text-destructive"}`}>
                    {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.trend}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Movimentação Semanal</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weeklyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,88%)" />
                <XAxis dataKey="dia" tick={{ fontSize: 12, fill: "hsl(0,0%,45%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(0,0%,45%)" }} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(0,0%,90%)", opacity: 0.3 }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="vendas" name="Vendas" fill={CHART_COLORS.vendas} radius={[3, 3, 0, 0]} animationDuration={800} />
                <Bar dataKey="entradas" name="Entradas" fill={CHART_COLORS.entradas} radius={[3, 3, 0, 0]} animationDuration={800} animationBegin={200} />
                <Bar dataKey="perdas" name="Perdas" fill={CHART_COLORS.perdas} radius={[3, 3, 0, 0]} animationDuration={800} animationBegin={400} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Composição de Perdas</h3>
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
            <div className="flex justify-center gap-4 mt-2">
              {perdasData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                  {item.name}: {item.value}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="glass-card rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Alertas Inteligentes</h3>
            <button onClick={() => navigate("/alertas")} className="text-xs text-primary hover:underline font-medium">
              Ver todos
            </button>
          </div>
          <div className="space-y-3">
            {alerts.map((alert, i) => (
              <div
                key={i}
                onClick={() => navigate(alert.link)}
                className={`flex items-start gap-3 p-3 rounded-md border cursor-pointer transition-all hover:shadow-sm hover:-translate-y-0.5 ${
                  alert.type === "danger" ? "border-destructive/20 bg-destructive/5"
                    : alert.type === "warning" ? "border-primary/20 bg-primary/5"
                    : "border-border bg-muted/30"
                }`}
              >
                <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${
                  alert.type === "danger" ? "text-destructive" : alert.type === "warning" ? "text-primary" : "text-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{alert.message}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divergence + Ranking */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Índice de Divergência</h3>
            <div className="flex items-end gap-4">
              <span className="text-4xl font-bold text-primary">2.3%</span>
              <span className="text-xs text-muted-foreground pb-1">dentro do limite aceitável</span>
            </div>
            <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: "23%" }} />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
              <span>0%</span>
              <span className="text-destructive">Limite: {settings.lossLimitPercent}%</span>
              <span>10%</span>
            </div>
          </div>
          <div className="glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Ranking de Movimentação</h3>
            <div className="space-y-3">
              {[
                { name: "Operador 1", mov: 245, risk: "baixo" },
                { name: "Operador 2", mov: 198, risk: "baixo" },
                { name: "Operador 3", mov: 312, risk: "médio" },
              ].map((op, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">{i + 1}</div>
                    <span className="text-sm text-foreground">{op.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">{op.mov}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${op.risk === "baixo" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"}`}>{op.risk}</span>
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
