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
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark transition-colors duration-500">
      <div className="p-4 md:p-6 lg:p-10 space-y-8 md:space-y-12 max-w-[1600px] mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 border-b border-border/50 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-8 bg-primary rounded-full" />
              <p className="text-[10px] md:text-xs font-bold text-primary uppercase tracking-[0.2em]">Gestão Operacional — Granja Sofhia</p>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
              Dashboard <span className="text-gradient-gold">Inteligente</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="glass-card p-1 flex items-center gap-2">
              <Select value={selectedPDV} onValueChange={setSelectedPDV}>
                <SelectTrigger className="w-[200px] h-10 border-none bg-transparent focus:ring-0">
                  <MapPin className="w-4 h-4 mr-2 text-primary" />
                  <SelectValue placeholder="Todos os PDVs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os PDVs</SelectItem>
                  {pdvOptions.map(pdv => (
                    <SelectItem key={pdv} value={pdv}>{pdv}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="w-px h-6 bg-border/50" />
              <GlobalDateFilter />
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="fixed inset-0 bg-background/20 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="glass-card p-8 flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <p className="text-sm font-bold text-muted-foreground animate-pulse">Sincronizando dados...</p>
            </div>
          </div>
        )}

        {/* ══════════════ BLOCO 1 — Resumo do Dia (6 Cards) ══════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
          {[
            { label: "Vendas Hoje", value: filteredVendas.qtdHoje.toLocaleString('pt-BR'), sub: "CARTELAS", icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10", link: "/vendas-diarias" },
            { label: "Estoque Atual", value: estoquePdvMetrics.totalItens.toLocaleString('pt-BR'), sub: "UNIDADES", icon: Package, color: "text-primary", bg: "bg-primary/10", link: "/estoque" },
            { label: "Perdas Hoje", value: evidMetrics.qtdHoje.toLocaleString('pt-BR'), sub: "UNIDADES", icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10", link: "/evidencias" },
            { label: "Transf. Enviadas", value: transfMetrics.enviadasHoje.toString(), sub: "HOJE", icon: ArrowUp, color: "text-blue-500", bg: "bg-blue-500/10", link: "/transferencias" },
            { label: "Transf. Recebidas", value: transfMetrics.recebidasHoje.toString(), sub: "HOJE", icon: ArrowDown, color: "text-emerald-500", bg: "bg-emerald-500/10", link: "/transferencias" },
            { label: "Alertas Ativos", value: alertasOperacionais.length.toString(), sub: "ESTADO", icon: Bell, color: alertasOperacionais.length > 0 ? "text-destructive" : "text-muted-foreground", bg: alertasOperacionais.length > 0 ? "bg-destructive/10" : "bg-muted", link: "/alertas" },
          ].map((stat) => (
            <div
              key={stat.label}
              onClick={() => navigate(stat.link)}
              className="glass-card-interactive p-6 flex flex-col group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} transition-transform group-hover:scale-110 duration-300`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <ArrowRightLeft className="w-4 h-4 text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-black tracking-tight text-foreground">{stat.value}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.sub}</p>
              </div>
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground group-hover:text-primary transition-colors">{stat.label}</p>
              </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Vendas com Tendência */}
          <div className="glass-card p-6 md:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Fluxo de Vendas</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Unidades por dia</p>
                </div>
              </div>
              <button 
                onClick={() => navigate("/vendas-diarias")} 
                className="text-xs font-bold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors border border-primary/20"
              >
                Detalhes
              </button>
            </div>
            {vendasChartData.length > 0 ? (
              <div className="flex-1 w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={vendasChartData} barGap={8}>
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} vertical={false} />
                    <XAxis dataKey="dia" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} axisLine={false} tickLine={false} dx={-10} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.1 }} />
                    <Bar dataKey="total" name="CARTELAS" fill="url(#barGradient)" radius={[6, 6, 0, 0]} animationDuration={1000} />
                    <Line type="monotone" dataKey="tendencia" name="Tendência" stroke="hsl(var(--destructive))" strokeWidth={3} strokeDasharray="8 4" dot={false} animationDuration={1500} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 h-[260px] text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Sem vendas registradas</p>
              </div>
            )}
          </div>

          {/* Top 5 Mais Vendidos */}
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Trophy className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Produtos Estrela</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Top 5 em demanda</p>
              </div>
            </div>
            {filteredRankings.topVendidos.length > 0 ? (
              <div className="space-y-6 mt-4">
                {filteredRankings.topVendidos.map((p, i) => {
                  const maxQtd = filteredRankings.topVendidos[0]?.quantidade || 1;
                  const pct = (p.quantidade / maxQtd) * 100;
                  return (
                    <div key={p.produto} className="group relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                            i === 0 ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-muted text-muted-foreground"
                          }`}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{p.produto}</span>
                        </div>
                        <span className="text-sm font-black text-foreground">{p.quantidade.toLocaleString('pt-BR')} <span className="text-[10px] text-muted-foreground font-bold">UN</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden backdrop-blur-sm">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ease-out ${
                            i === 0 ? "bg-gradient-to-r from-primary to-accent" : "bg-muted-foreground/30"
                          }`}
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <Trophy className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Aguardando dados de performance</p>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════ BLOCO 4 — Controle Operacional ══════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Saúde do Estoque */}
          <div className="glass-card p-6 md:p-8 flex flex-col">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-lg bg-primary/10">
                <Heart className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Saúde do Estoque</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Monitoramento de níveis</p>
              </div>
            </div>
            {filteredStockHealth.total > 0 ? (
              <div className="flex flex-col md:flex-row items-center gap-10 flex-1">
                <div className="relative w-[180px] h-[180px] group">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={healthPieData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        dataKey="value" 
                        paddingAngle={5}
                        animationDuration={1000} 
                        stroke="none"
                      >
                        {healthPieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-foreground">{filteredStockHealth.total}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Itens</span>
                  </div>
                </div>
                <div className="flex-1 space-y-3 w-full">
                  {[
                    { label: "Nível Saudável", count: filteredStockHealth.saudavel, color: HEALTH_COLORS["Saudável"], desc: "Estoque otimizado" },
                    { label: "Atenção Mínima", count: filteredStockHealth.atencao, color: HEALTH_COLORS["Atenção"], desc: "Próximo ao limite" },
                    { label: "Nível Crítico", count: filteredStockHealth.critico, color: HEALTH_COLORS["Crítico"], desc: "Risco de ruptura" },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between p-4 rounded-xl bg-muted/20 border border-border/50 group hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: item.color }} />
                        <div>
                          <span className="text-sm text-foreground font-bold block">{item.label}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">{item.desc}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-foreground">{item.count}</span>
                        <span className="text-[10px] text-muted-foreground font-bold ml-1">PROD</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[220px] text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <Heart className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Sem dados operacionais</p>
              </div>
            )}
          </div>

          {/* Perdas — Evidências */}
          <div className="glass-card p-6 md:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <Camera className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Registro de Perdas</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Controle de qualidade</p>
                </div>
              </div>
              <button 
                onClick={() => navigate("/evidencias")} 
                className="text-xs font-bold text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-full transition-colors border border-destructive/20"
              >
                Auditar
              </button>
            </div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {[
                { label: "Hoje", value: evidMetrics.qtdHoje, icon: AlertCircle, color: "text-destructive" },
                { label: "No Período", value: evidMetrics.qtdPeriodo, icon: BarChart3, color: "text-foreground" },
                { label: "Frequente", value: evidMetrics.motivoMaisFrequente, icon: Bell, color: "text-primary" },
              ].map((stat, i) => (
                <div key={i} className="p-4 rounded-xl bg-muted/20 border border-border/50 transition-transform hover:scale-[1.02]">
                  <p className={`text-xl font-black ${stat.color} truncate`}>{stat.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1 tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
            {perdasChartData.length > 0 ? (
              <div className="flex-1 min-h-[140px]">
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={perdasChartData}>
                    <defs>
                      <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.8} />
                        <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="quantidade" name="Perdas" fill="url(#lossGradient)" radius={[4, 4, 0, 0]} animationDuration={1200} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 h-[140px] text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <ShieldAlert className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Nenhuma ocorrência registrada</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Transferências + Top Perdas ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Transferências */}
          <div className="glass-card p-6 md:p-8 flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Truck className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Logística</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Fluxo entre unidades</p>
                </div>
              </div>
              <button 
                onClick={() => navigate("/transferencias")} 
                className="text-xs font-bold text-blue-500 hover:bg-blue-500/10 px-3 py-1.5 rounded-full transition-colors border border-blue-500/20"
              >
                Monitorar
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: "Pendentes", value: transfMetrics.pendentes, color: "text-orange-500", bg: "bg-orange-500/10" },
                { label: "Confirmadas", value: transfMetrics.confirmadas, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              ].map((item, i) => (
                <div key={i} className={`p-4 rounded-xl ${item.bg} border border-white/10 flex flex-col items-center justify-center`}>
                  <p className={`text-2xl font-black ${item.color}`}>{item.value}</p>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase mt-1">{item.label}</p>
                </div>
              ))}
            </div>
            {transfMetrics.recentes.length > 0 ? (
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[250px] pr-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Movimentações Recentes</p>
                {transfMetrics.recentes.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/10 border border-border/50 hover:bg-muted/20 transition-colors group">
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-sm text-foreground truncate block group-hover:text-primary transition-colors">{t.produto_descricao}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">{t.origemNome} <ArrowRightLeft className="w-2.5 h-2.5 inline mx-1" /> {t.destinoNome}</span>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <span className="font-black text-foreground">{t.quantidade}</span>
                      <span className={`block text-[9px] font-black uppercase tracking-tighter ${t.status === "pendente" ? "text-orange-500" : "text-emerald-500"}`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[120px] text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <Truck className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Nenhuma transferência em curso</p>
              </div>
            )}
          </div>

          {/* Top 5 Maiores Perdas */}
          <div className="glass-card p-6 md:p-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Alertas de Perda</h3>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Maiores quebras por SKU</p>
              </div>
            </div>
            {filteredRankings.topPerdas.length > 0 ? (
              <div className="space-y-6">
                {filteredRankings.topPerdas.map((p: any, i: number) => {
                  const maxQuebrado = filteredRankings.topPerdas[0]?.quebrado || 1;
                  const pct = (p.quebrado / maxQuebrado) * 100;
                  return (
                    <div key={p.descricao} className="group relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <span className={`flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-black ${
                            i === 0 ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-muted text-muted-foreground"
                          }`}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-bold text-foreground group-hover:text-red-500 transition-colors uppercase truncate max-w-[180px]">{p.descricao}</span>
                        </div>
                        <span className="text-sm font-black text-red-500">{p.quebrado} <span className="text-[9px] font-bold opacity-70">UN</span></span>
                      </div>
                      <div className="h-2 rounded-full bg-muted/50 overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            i === 0 ? "bg-red-500" : "bg-muted-foreground/30"
                          }`}
                          style={{ width: `${pct}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[260px] text-muted-foreground border-2 border-dashed border-border rounded-2xl">
                <ShieldAlert className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm font-medium">Controle de qualidade intacto</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Resumo Geral ── */}
        <div className="glass-card-gold p-8 border-none overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform group-hover:scale-110 duration-500">
            <BarChart3 className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-primary uppercase tracking-[0.2em] mb-8">Performance Consolidada</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {[
                { label: "Vendas Hoje", value: filteredVendas.qtdHoje.toLocaleString('pt-BR'), unit: "CART" },
                { label: "Vendas Ciclo", value: filteredVendas.qtdPeriodo.toLocaleString('pt-BR'), unit: "CART" },
                { label: "Estoque Total", value: estoquePdvMetrics.totalItens.toLocaleString('pt-BR'), unit: "UN" },
                { label: "Rupturas", value: estoquePdvMetrics.semEstoque.toString(), unit: "SKU" },
                { label: "Perdas Totais", value: evidMetrics.qtdPeriodo.toLocaleString('pt-BR'), unit: "UN" },
                { label: "Pendências", value: transfMetrics.pendentes.toString(), unit: "LOG" },
              ].map((item, i) => (
                <div key={i} className="flex flex-col p-6 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-md border border-white/20">
                  <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">{item.label}</span>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-2xl font-black text-foreground">{item.value}</span>
                    <span className="text-[9px] font-bold text-primary">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
