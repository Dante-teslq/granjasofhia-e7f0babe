import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { TrendingUp, TrendingDown, BarChart3, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const salesData: Record<string, Record<string, number[]>> = {
  "CEASA Timon": {
    "2022": [1676, 1729, 1951, 1831, 1649, 1634, 1735, 1681, 1669.5, 1715, 1715.5, 1804],
    "2023": [1712, 1781, 1950, 1711.5, 1574.5, 1509, 1549.5, 1529.5, 1531, 1555, 1470, 1565],
    "2024": [1567, 1738.5, 1936, 1515, 1645.5, 1608, 1601, 1601.5, 1445, 1651, 1570, 1755.5],
    "2025": [1788, 1567.5, 1869, 1862, 1672, 1462, 1603, 1609, 1502.75, 1650.5, 0, 0],
  },
  "Formosa": {
    "2022": [828.5, 824, 1026, 950, 792.5, 886, 816, 769.5, 777, 829, 768, 802],
    "2023": [775, 763, 978, 897, 726.5, 714, 687, 684.5, 674.5, 659, 762, 802],
    "2024": [707, 793, 869, 674.5, 741, 755, 772.5, 744.5, 648.5, 685.5, 703, 697.5],
    "2025": [786, 712, 748, 788.5, 717, 638, 679.5, 728, 678.5, 761, 0, 0],
  },
  "Parque Alvorada": {
    "2022": [0, 134, 233, 296.5, 292, 360, 465.5, 439.5, 435.5, 447, 432, 433.5],
    "2023": [475, 508, 567, 558, 496.5, 485, 514, 490.5, 507, 518, 534, 783],
    "2024": [707, 705, 788.5, 628.5, 723, 685, 643, 651, 602, 650, 706, 771],
    "2025": [868, 790, 866, 875.5, 875.5, 875.5, 803.5, 785, 718.5, 844.5, 0, 0],
  },
  "São Benedito": {
    "2022": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    "2023": [0, 0, 0, 0, 174.5, 284, 344, 365.5, 411, 478, 476.5, 535],
    "2024": [598, 612, 706, 534.5, 616, 614.5, 634, 536, 550, 557, 591, 608.5],
    "2025": [657.5, 564, 623, 634, 531, 540, 571.5, 570, 545.5, 618, 0, 0],
  },
  "Sofhia Balcão": {
    "2022": [1264, 1132, 1379, 1147.5, 1173.5, 1272.5, 1023.5, 1038, 1021.5, 1042, 1081, 972],
    "2023": [1147, 1105, 1460, 1336.5, 962.5, 909.5, 876.5, 859, 904.5, 851.5, 839, 895],
    "2024": [999, 1097, 1321, 896, 1152, 0, 0, 0, 0, 0, 0, 0],
    "2025": [1253, 1285, 1584.5, 1408, 1159, 1101, 1275.5, 1101.42, 0, 0, 0, 0],
  },
  "Rota Timon": {
    "2022": [1350, 1204, 1132, 1044, 862, 847.5, 881, 807.5, 777.5, 913.5, 896.5, 910],
    "2023": [1087, 850.5, 1078.5, 789.5, 871.5, 928.5, 959, 971, 838, 961, 999.5, 1041.5],
    "2024": [1084, 980.5, 900, 888.5, 1041, 0, 0, 0, 0, 0, 0, 0],
    "2025": [1423.5, 1519, 1283, 1450.5, 1479, 1334.5, 1694, 1346, 0, 0, 0, 0],
  },
};

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const years = ["2022", "2023", "2024", "2025"];
const storeNames = Object.keys(salesData);

const ApuracaoPage = () => {
  const [selectedStore, setSelectedStore] = useState(storeNames[0]);
  const [selectedYear, setSelectedYear] = useState("2025");

  const storeData = salesData[selectedStore] || {};
  const chartData = months.map((m, i) => ({
    mes: m,
    ...(Object.fromEntries(
      years.filter((y) => storeData[y]).map((y) => [y, storeData[y]?.[i] || 0])
    )),
  }));

  const currentYearData = storeData[selectedYear] || [];
  const prevYearData = storeData[String(Number(selectedYear) - 1)] || [];
  const totalCurrent = currentYearData.reduce((a, b) => a + b, 0);
  const totalPrev = prevYearData.reduce((a, b) => a + b, 0);
  const variation = totalPrev > 0 ? (((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(2) : "—";

  const exportCSV = () => {
    const headers = ["Mês", ...years];
    const rows = months.map((m, i) => [m, ...years.map((y) => storeData[y]?.[i]?.toString() || "0")]);
    const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `apuracao_${selectedStore}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Apuração de Vendas</h1>
            <p className="text-muted-foreground text-sm mt-1">Histórico mensal de vendas por loja — caixas com 360 cartelas</p>
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
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[200px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {storeNames.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Total {selectedYear}</p>
            <p className="text-2xl font-bold text-foreground">{totalCurrent.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</p>
            <p className="text-xs text-muted-foreground mt-1">caixas</p>
          </div>
          <div className="glass-card rounded-lg p-5">
            <p className="text-xs text-muted-foreground mb-1">Total {Number(selectedYear) - 1}</p>
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
            <h3 className="text-sm font-semibold text-foreground">Vendas Mensais — {selectedStore}</h3>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0,0%,88%)" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(0,0%,45%)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              {years.filter((y) => storeData[y]).map((y, i) => (
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

        {/* Table */}
        <div className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-foreground">
                  <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wider">Mês</th>
                  {years.filter((y) => storeData[y]).map((y) => (
                    <th key={y} className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">{y}</th>
                  ))}
                  <th className="px-4 py-3 text-center font-semibold text-xs uppercase tracking-wider">Var. %</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m, i) => {
                  const curr = storeData[selectedYear]?.[i] || 0;
                  const prev = storeData[String(Number(selectedYear) - 1)]?.[i] || 0;
                  const pct = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : "—";
                  return (
                    <tr key={m} className={`border-t border-border hover:bg-muted/30 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                      <td className="px-4 py-2.5 font-medium">{m}</td>
                      {years.filter((y) => storeData[y]).map((y) => (
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

export default ApuracaoPage;
