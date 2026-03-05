import { useMemo } from "react";
import { useEstoqueData } from "./useEstoqueData";
import { useVendasDiarias } from "./useVendasDiarias";
import { differenceInDays, subDays, format } from "date-fns";

interface UseDashboardDataOptions {
  from: Date;
  to: Date;
}

export function useDashboardData({ from, to }: UseDashboardDataOptions) {
  const rangeDays = Math.max(differenceInDays(to, from), 1);
  const prevFrom = subDays(from, rangeDays);
  const prevTo = subDays(to, rangeDays);

  // Current period
  const estoque = useEstoqueData({ from, to });
  const vendas = useVendasDiarias({ from, to });

  // Previous period for comparison
  const estoquePrev = useEstoqueData({ from: prevFrom, to: prevTo });
  const vendasPrev = useVendasDiarias({ from: prevFrom, to: prevTo });

  const loading = estoque.loading || vendas.loading;

  const comparison = useMemo(() => {
    const calcVariation = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");

    // Vendas ontem para comparação com hoje
    const vendasOntem = vendasPrev.records.filter(r => r.data === yesterday);
    const totalOntem = vendasOntem.reduce((s, r) => s + r.total, 0);

    return {
      vendasHojeVar: calcVariation(vendas.totalHoje, totalOntem),
      vendasPeriodoVar: calcVariation(vendas.totalPeriodo, vendasPrev.totalPeriodo),
      faltasVar: calcVariation(estoque.totalFaltas, estoquePrev.totalFaltas),
    };
  }, [vendas, vendasPrev, estoque, estoquePrev]);

  // Vendas por dia com destaque do melhor dia
  const vendasChartEnhanced = useMemo(() => {
    const current = vendas.porDia;
    const prev = vendasPrev.porDia;

    // Build previous period map by offset
    const prevMap = new Map<number, number>();
    prev.forEach((d, i) => prevMap.set(i, d.total));

    let maxTotal = 0;
    let maxIdx = -1;
    current.forEach((d, i) => {
      if (d.total > maxTotal) { maxTotal = d.total; maxIdx = i; }
    });

    return current.map((d, i) => ({
      ...d,
      anterior: prevMap.get(i) || 0,
      isBest: i === maxIdx && maxTotal > 0,
    }));
  }, [vendas.porDia, vendasPrev.porDia]);

  // Trend line (simple linear regression)
  const trendLine = useMemo(() => {
    const data = vendasChartEnhanced;
    if (data.length < 2) return [];
    const n = data.length;
    const sumX = data.reduce((s, _, i) => s + i, 0);
    const sumY = data.reduce((s, d) => s + d.total, 0);
    const sumXY = data.reduce((s, d, i) => s + i * d.total, 0);
    const sumX2 = data.reduce((s, _, i) => s + i * i, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return data.map((d, i) => ({
      ...d,
      tendencia: Math.max(0, Math.round(intercept + slope * i)),
    }));
  }, [vendasChartEnhanced]);

  // Stock health classification
  const stockHealth = useMemo(() => {
    const MIN_THRESHOLD = 5;
    const WARN_THRESHOLD = 10;

    // Group by product (latest record per product)
    const latestByProduct = new Map<string, { descricao: string; estoque_loja: number; estoque_sistema: number }>();
    estoque.records.forEach(r => {
      const existing = latestByProduct.get(r.descricao);
      if (!existing || r.data > (existing as any).data) {
        latestByProduct.set(r.descricao, { descricao: r.descricao, estoque_loja: r.estoque_loja, estoque_sistema: r.estoque_sistema });
      }
    });

    let saudavel = 0, atencao = 0, critico = 0;
    const details: Array<{ descricao: string; status: string; estoque: number }> = [];

    latestByProduct.forEach(p => {
      if (p.estoque_loja <= MIN_THRESHOLD) {
        critico++;
        details.push({ descricao: p.descricao, status: "Crítico", estoque: p.estoque_loja });
      } else if (p.estoque_loja <= WARN_THRESHOLD) {
        atencao++;
        details.push({ descricao: p.descricao, status: "Atenção", estoque: p.estoque_loja });
      } else {
        saudavel++;
        details.push({ descricao: p.descricao, status: "Saudável", estoque: p.estoque_loja });
      }
    });

    return { saudavel, atencao, critico, details, total: saudavel + atencao + critico };
  }, [estoque.records]);

  // Rankings
  const rankings = useMemo(() => {
    // Top 5 most sold products
    const topVendidos = [...vendas.porProduto].slice(0, 5);

    // Top 5 products with most loss (quebrado)
    const porProdutoPerda = [...estoque.porProduto]
      .sort((a, b) => b.quebrado - a.quebrado)
      .slice(0, 5)
      .filter(p => p.quebrado > 0);

    return { topVendidos, topPerdas: porProdutoPerda };
  }, [vendas.porProduto, estoque.porProduto]);

  return {
    loading,
    // Current metrics
    vendas,
    estoque,
    // Comparisons
    comparison,
    // Enhanced charts
    trendLine,
    vendasChartEnhanced,
    // Stock health
    stockHealth,
    // Rankings
    rankings,
  };
}
