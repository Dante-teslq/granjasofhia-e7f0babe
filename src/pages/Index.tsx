import { useState, useMemo, useEffect } from "react";
import {
  Package, AlertTriangle, ShieldAlert, ShoppingCart,
  TrendingUp, Trophy, AlertCircle, Heart, MapPin,
  ArrowRightLeft, Camera, BarChart3, Bell, ArrowUp, ArrowDown,
  Truck, Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useDashboardOperacional } from "@/hooks/useDashboardOperacional";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, ComposedChart,
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
  const [selectedPDV, setSelectedPDV] = useState<string>("all");

  const {
    loading, vendas, estoque, trendLine, stockHealth, rankings,
  } = useDashboardData({ from: dateRange.from, to: dateRange.to });

  const {
    loading: loadingOp, transfMetrics, evidMetrics, estoquePdvMetrics, alertasOperacionais,
  } = useDashboardOperacional({ from: dateRange.from, to: dateRange.to });

  // Fetch PDVs
  const [pdvOptions, setPdvOptions] = useState<string[]>([]);
  useEffect(() => {
    const fetchPDVs = async () => {
      const { data } = await supabase
        .from("pontos_de_venda")
        .select("nome")
        .eq("status", "ativo")
        .order("nome");
      if (data) setPdvOptions(data.map(d => d.nome));
    };
    fetchPDVs();
  }, []);

  // Filter by PDV
  const filteredVendas = useMemo(() => {
    if (selectedPDV === "all") return vendas;
    const filtered = vendas.records.filter(r => r.ponto_venda === selectedPDV);
    const today = format(new Date(), "yyyy-MM-dd");
    const vendasHoje = filtered.filter(r => r.data === today);
    const totalHoje = vendasHoje.reduce((s, r) => s + r.total, 0);
    const totalPeriodo = filtered.reduce((s, r) => s + r.total, 0);
    const qtdHoje = vendasHoje.reduce((s, r) => s + r.quantidade, 0);
    const qtdPeriodo = filtered.reduce((s, r) => s + r.quantidade, 0);
    const porProduto = Object.values(
      filtered.reduce((acc, r) => {
        if (!acc[r.produto]) acc[r.produto] = { produto: r.produto, quantidade: 0, total: 0 };
        acc[r.produto].quantidade += r.quantidade;
        acc[r.produto].total += r.total;
        return acc;
      }, {} as Record<string, { produto: string; quantidade: number; total: number }>)
    ).sort((a, b) => b.quantidade - a.quantidade);
    const porDia = Object.values(
      filtered.reduce((acc, r) => {
        if (!acc[r.data]) acc[r.data] = { data: r.data, total: 0, quantidade: 0 };
        acc[r.data].total += r.total;
        acc[r.data].quantidade += r.quantidade;
        return acc;
      }, {} as Record<string, { data: string; total: number; quantidade: number }>)
    ).sort((a, b) => a.data.localeCompare(b.data));
    return { ...vendas, records: filtered, totalHoje, totalPeriodo, qtdHoje, qtdPeriodo, porProduto, porDia, vendasHoje };
  }, [vendas, selectedPDV]);

  const filteredEstoque = useMemo(() => {
    if (selectedPDV === "all") return estoque;
    const filtered = estoque.records.filter(r => r.loja === selectedPDV);
    const totalFaltas = filtered.reduce((s, r) => s + Math.abs(r.estoque_loja - r.estoque_sistema), 0);
    const totalQuebrado = filtered.reduce((s, r) => s + r.quebrado, 0);
    const totalVendido = filtered.reduce((s, r) => s + r.estoque_loja, 0);
    const hasData = filtered.length > 0;
    const porProduto = Object.values(
      filtered.reduce((acc, r) => {
        if (!acc[r.descricao]) acc[r.descricao] = { descricao: r.descricao, estoque_sistema: 0, estoque_loja: 0, trincado: 0, quebrado: 0, faltas: 0 };
        acc[r.descricao].estoque_sistema += r.estoque_sistema;
        acc[r.descricao].estoque_loja += r.estoque_loja;
        acc[r.descricao].trincado += r.trincado;
        acc[r.descricao].quebrado += r.quebrado;
        acc[r.descricao].faltas += Math.abs(r.estoque_loja - r.estoque_sistema);
        return acc;
      }, {} as Record<string, any>)
    );
    const porDia = Object.values(
      filtered.reduce((acc, r) => {
        if (!acc[r.data]) acc[r.data] = { data: r.data, vendas: 0, perdas: 0, entradas: 0 };
        acc[r.data].vendas += r.estoque_loja;
        acc[r.data].perdas += r.quebrado;
        acc[r.data].entradas += r.estoque_sistema;
        return acc;
      }, {} as Record<string, any>)
    ).sort((a: any, b: any) => a.data.localeCompare(b.data));
    return { ...estoque, records: filtered, totalFaltas, totalQuebrado, totalVendido, hasData, porProduto, porDia };
  }, [estoque, selectedPDV]);

  const filteredRankings = useMemo(() => {
    const topVendidos = [...filteredVendas.porProduto].slice(0, 5);
    const topPerdas = [...filteredEstoque.porProduto]
      .sort((a: any, b: any) => b.quebrado - a.quebrado)
      .slice(0, 5)
      .filter((p: any) => p.quebrado > 0);
    return { topVendidos, topPerdas };
  }, [filteredVendas.porProduto, filteredEstoque.porProduto]);

  const filteredStockHealth = useMemo(() => {
    const MIN_THRESHOLD = 5;
    const WARN_THRESHOLD = 10;
    const latestByProduct = new Map<string, any>();
    filteredEstoque.records.forEach((r: any) => {
      const existing = latestByProduct.get(r.descricao);
      if (!existing || r.data > existing.data) latestByProduct.set(r.descricao, r);
    });
    let saudavel = 0, atencao = 0, critico = 0;
    latestByProduct.forEach(p => {
      if (p.estoque_loja <= MIN_THRESHOLD) critico++;
      else if (p.estoque_loja <= WARN_THRESHOLD) atencao++;
      else saudavel++;
    });
    return { saudavel, atencao, critico, total: saudavel + atencao + critico };
  }, [filteredEstoque.records]);

  // Chart data
  const vendasChartData = trendLine.map(d => ({
    dia: format(new Date(d.data + "T12:00:00"), "dd/MM", { locale: ptBR }),
    total: d.quantidade || 0,
    tendencia: d.tendencia || 0,
  }));

  const dailyChartData = filteredEstoque.porDia.slice(0, 14).map((d: any) => ({
    dia: format(new Date(d.data + "T12:00:00"), "dd/MM", { locale: ptBR }),
    estoque: d.vendas,
    entradas: d.entradas,
  }));

  const healthPieData = [
    { name: "Saudável", value: filteredStockHealth.saudavel, color: HEALTH_COLORS["Saudável"] },
    { name: "Atenção", value: filteredStockHealth.atencao, color: HEALTH_COLORS["Atenção"] },
    { name: "Crítico", value: filteredStockHealth.critico, color: HEALTH_COLORS["Crítico"] },
  ].filter(d => d.value > 0);

  // Perdas chart
  const perdasChartData = evidMetrics.perdasPorDia.map(d => ({
    dia: format(new Date(d.data + "T12:00:00"), "dd/MM", { locale: ptBR }),
    quantidade: d.quantidade,
  }));

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

  const isLoading = loading || loadingOp;

  return (
    <>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 md:space-y-8 max-w-[1400px] animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Dashboard Operacional</h1>
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1 md:mt-2">Gestão diária — Granja Sofhia</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedPDV} onValueChange={setSelectedPDV}>
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Todos os PDVs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os PDVs</SelectItem>
                {pdvOptions.map(pdv => (
                  <SelectItem key={pdv} value={pdv}>{pdv}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <GlobalDateFilter />
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-sm text-muted-foreground">Carregando dados...</div>
          </div>
        )}

        {/* ══════════════ BLOCO 1 — Resumo do Dia (6 Cards) ══════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4">
          {[
            { label: "Vendas Hoje", value: `${filteredVendas.qtdHoje.toLocaleString('pt-BR')}`, sub: "CARTELAS", icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10", link: "/vendas-diarias" },
            { label: "Estoque Atual", value: estoquePdvMetrics.totalItens.toLocaleString('pt-BR'), sub: "UNIDADES", icon: Package, color: "text-primary", bg: "bg-primary/10", link: "/estoque" },
            { label: "Perdas Hoje", value: evidMetrics.qtdHoje.toLocaleString('pt-BR'), sub: "UNIDADES", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", link: "/evidencias" },
            { label: "Transf. Enviadas", value: transfMetrics.enviadasHoje.toString(), sub: "HOJE", icon: ArrowUp, color: "text-blue-600", bg: "bg-blue-600/10", link: "/transferencias" },
            { label: "Transf. Recebidas", value: transfMetrics.recebidasHoje.toString(), sub: "HOJE", icon: ArrowDown, color: "text-emerald-600", bg: "bg-emerald-600/10", link: "/transferencias" },
            { label: "Alertas", value: alertasOperacionais.length.toString(), sub: "ATIVOS", icon: Bell, color: alertasOperacionais.length > 0 ? "text-destructive" : "text-muted-foreground", bg: alertasOperacionais.length > 0 ? "bg-destructive/10" : "bg-muted", link: "/alertas" },
          ].map((stat) => (
            <div
              key={stat.label}
              onClick={() => navigate(stat.link)}
              className="glass-card-interactive p-4 md:p-5"
            >
              <div className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl ${stat.bg} ${stat.color} mb-3`}>
                <stat.icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
              <p className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">{stat.value}</p>
              <p className="text-[9px] md:text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{stat.sub}</p>
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ══════════════ BLOCO 2 — Alertas Operacionais ══════════════ */}
        {alertasOperacionais.length > 0 && (
          <div className="glass-card p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Alertas Operacionais</h3>
              </div>
              <span className="text-xs font-bold text-destructive bg-destructive/10 px-2.5 py-1 rounded-full">
                {alertasOperacionais.length} {alertasOperacionais.length === 1 ? "alerta" : "alertas"}
              </span>
            </div>
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {alertasOperacionais.slice(0, 10).map((alerta) => (
                <div
                  key={alerta.id}
                  onClick={() => navigate(alerta.link)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${
                    alerta.severity === "critico"
                      ? "border-destructive/20 bg-destructive/5 hover:bg-destructive/10"
                      : "border-accent/20 bg-accent/5 hover:bg-accent/10"
                  }`}
                >
                  <AlertTriangle className={`w-4 h-4 shrink-0 ${alerta.severity === "critico" ? "text-destructive" : "text-accent"}`} />
                  <span className="text-sm text-foreground">{alerta.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════ BLOCO 3 — Desempenho Comercial ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Vendas com Tendência */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Vendas por Dia (CARTELAS)</h3>
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
                    <Bar dataKey="total" name="CARTELAS" fill="hsl(var(--primary))" radius={[6, 6, 6, 6]} animationDuration={800} />
                    <Line type="monotone" dataKey="tendencia" name="Tendência" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="6 3" dot={false} animationDuration={1000} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-primary inline-block" /> CARTELAS</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-destructive inline-block" style={{ borderTop: "2px dashed" }} /> Tendência</span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                Nenhuma venda registrada no período
              </div>
            )}
          </div>

          {/* Top 5 Mais Vendidos */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Trophy className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Top 5 Mais Vendidos</h3>
            </div>
            {filteredRankings.topVendidos.length > 0 ? (
              <div className="space-y-2">
                {filteredRankings.topVendidos.map((p, i) => {
                  const maxQtd = filteredRankings.topVendidos[0]?.quantidade || 1;
                  const pct = (p.quantidade / maxQtd) * 100;
                  return (
                    <div key={p.produto} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground truncate">{p.produto}</span>
                          <span className="text-xs font-bold text-foreground ml-2 shrink-0">{p.quantidade.toLocaleString('pt-BR')} CARTELAS</span>
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
        </div>

        {/* ══════════════ BLOCO 4 — Controle Operacional ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Saúde do Estoque */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <Heart className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Saúde do Estoque</h3>
            </div>
            {filteredStockHealth.total > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={healthPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} dataKey="value" animationDuration={800} strokeWidth={2} stroke="hsl(var(--card))">
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
                    { label: "Saudável", count: filteredStockHealth.saudavel, color: HEALTH_COLORS["Saudável"] },
                    { label: "Atenção", count: filteredStockHealth.atencao, color: HEALTH_COLORS["Atenção"] },
                    { label: "Crítico", count: filteredStockHealth.critico, color: HEALTH_COLORS["Crítico"] },
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
              <div className="flex items-center justify-center h-[140px] text-muted-foreground text-sm">
                Nenhum dado de estoque
              </div>
            )}
          </div>

          {/* Perdas — Evidências */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-destructive" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Perdas no Período</h3>
              </div>
              <button onClick={() => navigate("/evidencias")} className="text-xs text-primary hover:underline font-bold uppercase tracking-wide">
                Ver todas
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-lg md:text-xl font-extrabold text-foreground">{evidMetrics.qtdHoje}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Hoje</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-lg md:text-xl font-extrabold text-foreground">{evidMetrics.qtdPeriodo}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Período</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-center">
                <p className="text-xs md:text-sm font-bold text-foreground truncate">{evidMetrics.motivoMaisFrequente}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Motivo Top</p>
              </div>
            </div>
            {perdasChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={perdasChartData}>
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quantidade" name="Perdas" fill="hsl(var(--destructive))" radius={[4, 4, 4, 4]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
                Nenhuma perda registrada
              </div>
            )}
          </div>
        </div>

        {/* ── Transferências + Top Perdas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Transferências */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Transferências</h3>
              </div>
              <button onClick={() => navigate("/transferencias")} className="text-xs text-primary hover:underline font-bold uppercase tracking-wide">
                Ver todas
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <p className="text-lg font-extrabold text-foreground">{transfMetrics.pendentes}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Pendentes</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <p className="text-lg font-extrabold text-foreground">{transfMetrics.confirmadas}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">Confirmadas</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs font-bold text-foreground truncate">{transfMetrics.pdvMaisEnviou}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">+ Enviou</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs font-bold text-foreground truncate">{transfMetrics.pdvMaisRecebeu}</p>
                <p className="text-[9px] font-bold text-muted-foreground uppercase">+ Recebeu</p>
              </div>
            </div>
            {transfMetrics.recentes.length > 0 ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Últimas movimentações</p>
                {transfMetrics.recentes.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-foreground truncate block">{t.produto_descricao}</span>
                      <span className="text-[10px] text-muted-foreground">{t.origemNome} → {t.destinoNome}</span>
                    </div>
                    <div className="text-right shrink-0 ml-2">
                      <span className="font-bold text-foreground">{t.quantidade}</span>
                      <span className={`block text-[9px] font-bold uppercase ${t.status === "pendente" ? "text-accent" : "text-emerald-600"}`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[60px] text-muted-foreground text-sm">
                Nenhuma transferência no período
              </div>
            )}
          </div>

          {/* Top 5 Maiores Perdas */}
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Top 5 Maiores Perdas</h3>
            </div>
            {filteredRankings.topPerdas.length > 0 ? (
              <div className="space-y-2">
                {filteredRankings.topPerdas.map((p: any, i: number) => {
                  const maxQuebrado = filteredRankings.topPerdas[0]?.quebrado || 1;
                  const pct = (p.quebrado / maxQuebrado) * 100;
                  return (
                    <div key={p.descricao} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        i === 0 ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
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

        {/* ── Estoque: Top 5 Menores + Top 5 Maiores Saldos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <ArrowDown className="w-4 h-4 text-destructive" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Top 5 Menor Saldo</h3>
            </div>
            {estoquePdvMetrics.top5Menores.length > 0 ? (
              <div className="space-y-2">
                {estoquePdvMetrics.top5Menores.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${
                        p.quantidade <= 0 ? "bg-destructive text-destructive-foreground" : p.quantidade <= p.quantidade_minima ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
                      }`}>{i + 1}</span>
                      <span className="text-sm text-foreground truncate">{p.produto_descricao}</span>
                    </div>
                    <span className={`text-sm font-bold shrink-0 ml-2 ${p.quantidade <= 0 ? "text-destructive" : p.quantidade <= p.quantidade_minima ? "text-accent" : "text-foreground"}`}>
                      {p.quantidade}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">Sem dados de estoque</div>
            )}
          </div>

          <div className="glass-card p-4 md:p-6 lg:p-8">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <ArrowUp className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Top 5 Maior Saldo</h3>
            </div>
            {estoquePdvMetrics.top5Maiores.length > 0 ? (
              <div className="space-y-2">
                {estoquePdvMetrics.top5Maiores.map((p: any, i: number) => (
                  <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 bg-emerald-600/10 text-emerald-600">{i + 1}</span>
                      <span className="text-sm text-foreground truncate">{p.produto_descricao}</span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0 ml-2">{p.quantidade}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-[100px] text-muted-foreground text-sm">Sem dados de estoque</div>
            )}
          </div>
        </div>

        {/* ── Resumo Geral ── */}
        <div className="glass-card p-4 md:p-6 lg:p-8">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 md:mb-6">Resumo do Período</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: "Vendas Hoje (CARTELAS)", value: filteredVendas.qtdHoje.toLocaleString('pt-BR') },
              { label: "Vendas Período (CARTELAS)", value: filteredVendas.qtdPeriodo.toLocaleString('pt-BR') },
              { label: "Estoque Total", value: estoquePdvMetrics.totalItens.toLocaleString('pt-BR') },
              { label: "Produtos Zerados", value: estoquePdvMetrics.semEstoque.toString() },
              { label: "Perdas (Período)", value: evidMetrics.qtdPeriodo.toLocaleString('pt-BR') },
              { label: "Transf. Pendentes", value: transfMetrics.pendentes.toString() },
            ].map(item => (
              <div key={item.label} className="flex flex-col p-3 rounded-xl bg-muted/30 border border-border">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">{item.label}</span>
                <span className="text-lg font-bold text-foreground mt-1">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Index;
