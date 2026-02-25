import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import {
  ShieldAlert, TrendingUp, Clock, Activity, Repeat, UserX,
  AlertTriangle, Percent,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useFraud } from "@/contexts/FraudContext";
import { useApp } from "@/contexts/AppContext";
import { toast } from "@/components/ui/sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

const AntifravdePage = () => {
  const { alerts, userRiskProfiles, fraudSettings, updateFraudSettings } = useFraud();
  const { dateRange } = useApp();

  const activeAlerts = alerts.filter((a) => a.status === "ativo");
  const resolvedAlerts = alerts.filter((a) => a.status === "resolvido");

  // Alert distribution by type
  const typeCounts = [
    { name: "Ajuste elevado", value: alerts.filter((a) => a.type === "ajuste_elevado").length, color: "hsl(0, 65%, 51%)" },
    { name: "Fora do horário", value: alerts.filter((a) => a.type === "fora_horario").length, color: "hsl(40, 45%, 57%)" },
    { name: "Frequência anormal", value: alerts.filter((a) => a.type === "frequencia_anormal").length, color: "hsl(280, 50%, 55%)" },
    { name: "Múltiplas alterações", value: alerts.filter((a) => a.type === "multiplas_alteracoes").length, color: "hsl(200, 60%, 50%)" },
    { name: "Comportamento atípico", value: alerts.filter((a) => a.type === "comportamento_atipico").length, color: "hsl(160, 50%, 45%)" },
  ];

  // Severity distribution
  const severityCounts = [
    { name: "Crítica", value: alerts.filter((a) => a.severity === "crítica").length, color: "hsl(0, 65%, 51%)" },
    { name: "Média", value: alerts.filter((a) => a.severity === "média").length, color: "hsl(40, 45%, 57%)" },
    { name: "Baixa", value: alerts.filter((a) => a.severity === "baixa").length, color: "hsl(0, 0%, 65%)" },
  ];

  // Risk bar chart
  const riskChartData = [...userRiskProfiles]
    .sort((a, b) => b.riskScore - a.riskScore)
    .map((p) => ({ name: p.user, score: p.riskScore }));

  const kpis = [
    { label: "Alertas Ativos", value: activeAlerts.length, icon: AlertTriangle, color: "text-destructive" },
    { label: "Alertas Resolvidos", value: resolvedAlerts.length, icon: ShieldAlert, color: "text-success" },
    { label: "Usuários em Risco", value: userRiskProfiles.filter((p) => p.riskLevel === "alto" || p.riskLevel === "crítico").length, icon: UserX, color: "text-orange-600" },
    { label: "Total de Alertas", value: alerts.length, icon: Activity, color: "text-primary" },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {payload.map((entry: any, i: number) => (
          <p key={i} className="text-xs text-muted-foreground">
            Score: <span className="font-medium text-foreground">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.[0]) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-foreground">{payload[0].name}</p>
        <p className="text-xs text-muted-foreground">Quantidade: <span className="font-medium text-foreground">{payload[0].value}</span></p>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Painel de Segurança</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Dashboard exclusivo — Indicadores de risco e monitoramento de dados
            </p>
          </div>
          <GlobalDateFilter />
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="glass-card rounded-lg p-5">
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Risk Score Bar */}
          <div className="lg:col-span-2 glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Score de Risco por Usuário</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={riskChartData} layout="vertical" barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,88%)" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="score" fill="hsl(0, 65%, 51%)" radius={[0, 4, 4, 0]} animationDuration={800} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Alert Type Pie */}
          <div className="glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Alertas por Tipo</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={typeCounts} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {typeCounts.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {typeCounts.map((t) => (
                <div key={t.name} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                    {t.name}
                  </div>
                  <span className="font-medium text-foreground">{t.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Severity + Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card rounded-lg p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Distribuição por Severidade</h3>
            <div className="space-y-3">
              {severityCounts.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
                  <span className="text-sm text-foreground flex-1">{s.name}</span>
                  <span className="text-sm font-bold text-foreground">{s.value}</span>
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full" style={{ background: s.color, width: `${alerts.length > 0 ? (s.value / alerts.length) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fraud Settings */}
          <div className="glass-card rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Limites de Segurança</h3>
            </div>
            <p className="text-xs text-muted-foreground">Defina os limites que disparam alertas automáticos</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Ajuste acima de (%)</label>
                  <Input
                    type="number" min={1} max={100}
                    defaultValue={fraudSettings.adjustmentThresholdPercent}
                    onBlur={(e) => {
                      const n = parseFloat(e.target.value);
                      if (!isNaN(n) && n > 0 && n <= 100) {
                        updateFraudSettings({ adjustmentThresholdPercent: n });
                        toast.success(`Limite de ajuste atualizado para ${n}%`);
                      }
                    }}
                    className="w-20"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Máx. ajustes/hora</label>
                  <Input
                    type="number" min={1} max={50}
                    defaultValue={fraudSettings.maxAdjustmentsPerHour}
                    onBlur={(e) => {
                      const n = parseInt(e.target.value);
                      if (!isNaN(n) && n > 0) {
                        updateFraudSettings({ maxAdjustmentsPerHour: n });
                        toast.success(`Máx. ajustes/hora atualizado para ${n}`);
                      }
                    }}
                    className="w-20"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-xs text-muted-foreground">Máx. edições/registro</label>
                  <Input
                    type="number" min={1} max={20}
                    defaultValue={fraudSettings.maxEditsPerRecord}
                    onBlur={(e) => {
                      const n = parseInt(e.target.value);
                      if (!isNaN(n) && n > 0) {
                        updateFraudSettings({ maxEditsPerRecord: n });
                        toast.success(`Máx. edições/registro atualizado para ${n}`);
                      }
                    }}
                    className="w-20"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Risk Table */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Detalhamento por Usuário</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-foreground">
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold">#</th>
                  <th className="px-4 py-3 text-left text-xs uppercase tracking-wider font-semibold">Usuário</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">Total Ajustes</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">Elevados</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">Fora Horário</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">Multi-edits</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">Score</th>
                  <th className="px-4 py-3 text-center text-xs uppercase tracking-wider font-semibold">Nível</th>
                </tr>
              </thead>
              <tbody>
                {[...userRiskProfiles].sort((a, b) => b.riskScore - a.riskScore).map((p, i) => {
                  const riskColors: Record<string, string> = {
                    baixo: "bg-success/10 text-success",
                    médio: "bg-primary/10 text-primary",
                    alto: "bg-orange-500/10 text-orange-600",
                    crítico: "bg-destructive/10 text-destructive",
                  };
                  return (
                    <tr key={p.user} className={`border-t border-border hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-2.5 font-medium">{i + 1}</td>
                      <td className="px-4 py-2.5 font-medium">{p.user}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{p.totalAdjustments}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{p.highAdjustments}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{p.afterHoursOps}</td>
                      <td className="px-4 py-2.5 text-center text-muted-foreground">{p.multiEditCount}</td>
                      <td className="px-4 py-2.5 text-center font-bold">{p.riskScore}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge className={`text-[10px] ${riskColors[p.riskLevel]}`}>{p.riskLevel}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AntifravdePage;
