import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface UseDashboardOperacionalOptions {
  from: Date;
  to: Date;
}

export function useDashboardOperacional({ from, to }: UseDashboardOperacionalOptions) {
  const fromStr = format(from, "yyyy-MM-dd");
  const toStr = format(to, "yyyy-MM-dd");
  const today = format(new Date(), "yyyy-MM-dd");

  // Transferências
  const [transferencias, setTransferencias] = useState<any[]>([]);
  const [loadingTransf, setLoadingTransf] = useState(true);

  // Evidências de perdas
  const [evidencias, setEvidencias] = useState<any[]>([]);
  const [loadingEvid, setLoadingEvid] = useState(true);

  // Estoque PDV (saldo atual)
  const [estoquePdv, setEstoquePdv] = useState<any[]>([]);
  const [loadingEstPdv, setLoadingEstPdv] = useState(true);

  // PDVs
  const [pdvs, setPdvs] = useState<any[]>([]);

  const fetchAll = useCallback(async () => {
    const [transfRes, evidRes, estPdvRes, pdvRes] = await Promise.all([
      supabase
        .from("movimentacoes_estoque")
        .select("*")
        .gte("created_at", `${fromStr}T00:00:00`)
        .lte("created_at", `${toStr}T23:59:59`)
        .order("created_at", { ascending: false }),
      supabase
        .from("evidencias_perdas")
        .select("*")
        .gte("data", fromStr)
        .lte("data", toStr)
        .order("created_at", { ascending: false }),
      supabase
        .from("estoque_pdv")
        .select("*"),
      supabase
        .from("pontos_de_venda")
        .select("id, nome")
        .eq("status", "ativo"),
    ]);

    if (transfRes.data) setTransferencias(transfRes.data);
    setLoadingTransf(false);
    if (evidRes.data) setEvidencias(evidRes.data);
    setLoadingEvid(false);
    if (estPdvRes.data) setEstoquePdv(estPdvRes.data);
    setLoadingEstPdv(false);
    if (pdvRes.data) setPdvs(pdvRes.data);
  }, [fromStr, toStr]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    const ch1 = supabase
      .channel("dash-transf-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes_estoque" }, () => fetchAll())
      .subscribe();
    const ch2 = supabase
      .channel("dash-evid-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "evidencias_perdas" }, () => fetchAll())
      .subscribe();
    const ch3 = supabase
      .channel("dash-estpdv-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "estoque_pdv" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [fetchAll]);

  const pdvMap = useMemo(() => {
    const m = new Map<string, string>();
    pdvs.forEach(p => m.set(p.id, p.nome));
    return m;
  }, [pdvs]);

  // ── Transferências métricas ──
  const transfMetrics = useMemo(() => {
    const hoje = transferencias.filter(t => t.created_at?.startsWith(today));
    const enviadasHoje = hoje.filter(t => t.tipo === "transferencia").length;
    const recebidasHoje = hoje.filter(t => t.status === "confirmado" && t.tipo === "transferencia").length;
    const pendentes = transferencias.filter(t => t.status === "pendente");
    const confirmadas = transferencias.filter(t => t.status === "confirmado");
    const totalTransferidas = transferencias
      .filter(t => t.tipo === "transferencia")
      .reduce((s, t) => s + (t.quantidade || 0), 0);

    // PDV que mais enviou/recebeu
    const enviosPorPdv = new Map<string, number>();
    const recebimentosPorPdv = new Map<string, number>();
    transferencias.filter(t => t.tipo === "transferencia").forEach(t => {
      const orig = pdvMap.get(t.pdv_origem_id) || "Desconhecido";
      const dest = pdvMap.get(t.pdv_destino_id) || "Desconhecido";
      enviosPorPdv.set(orig, (enviosPorPdv.get(orig) || 0) + t.quantidade);
      recebimentosPorPdv.set(dest, (recebimentosPorPdv.get(dest) || 0) + (t.quantidade_recebida || t.quantidade));
    });

    let pdvMaisEnviou = "-";
    let pdvMaisRecebeu = "-";
    let maxEnvio = 0, maxReceb = 0;
    enviosPorPdv.forEach((v, k) => { if (v > maxEnvio) { maxEnvio = v; pdvMaisEnviou = k; } });
    recebimentosPorPdv.forEach((v, k) => { if (v > maxReceb) { maxReceb = v; pdvMaisRecebeu = k; } });

    // Produtos mais transferidos
    const prodTransf = new Map<string, number>();
    transferencias.filter(t => t.tipo === "transferencia").forEach(t => {
      prodTransf.set(t.produto_descricao, (prodTransf.get(t.produto_descricao) || 0) + t.quantidade);
    });
    const topProdutosTransf = [...prodTransf.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([produto, qtd]) => ({ produto, quantidade: qtd }));

    // Recentes
    const recentes = transferencias.slice(0, 5).map(t => ({
      ...t,
      origemNome: pdvMap.get(t.pdv_origem_id) || "-",
      destinoNome: pdvMap.get(t.pdv_destino_id) || "-",
    }));

    return {
      enviadasHoje, recebidasHoje, pendentes: pendentes.length,
      confirmadas: confirmadas.length, totalTransferidas,
      pdvMaisEnviou, pdvMaisRecebeu, topProdutosTransf, recentes,
    };
  }, [transferencias, today, pdvMap]);

  // ── Evidências de perdas métricas ──
  const evidMetrics = useMemo(() => {
    const perdasHoje = evidencias.filter(e => e.data === today);
    const qtdHoje = perdasHoje.reduce((s, e) => s + e.quantidade, 0);
    const qtdPeriodo = evidencias.reduce((s, e) => s + e.quantidade, 0);

    // Motivo mais frequente
    const motivos = new Map<string, number>();
    evidencias.forEach(e => {
      motivos.set(e.tipo_perda, (motivos.get(e.tipo_perda) || 0) + e.quantidade);
    });
    let motivoMaisFrequente = "-";
    let maxMotivo = 0;
    motivos.forEach((v, k) => { if (v > maxMotivo) { maxMotivo = v; motivoMaisFrequente = k; } });

    // Produto com maior perda
    const prodPerda = new Map<string, number>();
    evidencias.forEach(e => {
      prodPerda.set(e.tipo_perda, (prodPerda.get(e.tipo_perda) || 0) + e.quantidade);
    });

    // Perdas por dia (últimos 7 dias)
    const porDia = new Map<string, number>();
    evidencias.forEach(e => {
      porDia.set(e.data, (porDia.get(e.data) || 0) + e.quantidade);
    });
    const perdasPorDia = [...porDia.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, qtd]) => ({ data, quantidade: qtd }));

    return {
      qtdHoje, qtdPeriodo, motivoMaisFrequente,
      perdasPorDia, registrosRecentes: evidencias.slice(0, 5),
    };
  }, [evidencias, today]);

  // ── Estoque PDV métricas (saldo atual) ──
  const estoquePdvMetrics = useMemo(() => {
    const totalItens = estoquePdv.reduce((s, e) => s + e.quantidade, 0);
    const semEstoque = estoquePdv.filter(e => e.quantidade <= 0);
    const estoqueBaixo = estoquePdv.filter(e => e.quantidade > 0 && e.quantidade <= e.quantidade_minima);
    const top5Menores = [...estoquePdv]
      .filter(e => e.quantidade >= 0)
      .sort((a, b) => a.quantidade - b.quantidade)
      .slice(0, 5);
    const top5Maiores = [...estoquePdv]
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);

    return {
      totalItens, semEstoque: semEstoque.length,
      estoqueBaixo: estoqueBaixo.length,
      top5Menores, top5Maiores,
      produtosUnicos: estoquePdv.length,
    };
  }, [estoquePdv]);

  // ── Alertas operacionais ──
  const alertasOperacionais = useMemo(() => {
    const alertas: Array<{ id: string; severity: "critico" | "atencao" | "info"; message: string; link: string }> = [];

    // Produtos sem estoque
    estoquePdv.filter(e => e.quantidade <= 0).forEach(e => {
      alertas.push({
        id: `sem-estoque-${e.id}`,
        severity: "critico",
        message: `${e.produto_descricao} sem estoque`,
        link: "/estoque",
      });
    });

    // Estoque baixo
    estoquePdv.filter(e => e.quantidade > 0 && e.quantidade <= e.quantidade_minima).forEach(e => {
      alertas.push({
        id: `baixo-${e.id}`,
        severity: "atencao",
        message: `${e.produto_descricao} com estoque baixo (${e.quantidade})`,
        link: "/estoque",
      });
    });

    // Transferências pendentes
    transferencias.filter(t => t.status === "pendente").forEach(t => {
      alertas.push({
        id: `transf-pend-${t.id}`,
        severity: "atencao",
        message: `Transferência pendente: ${t.produto_descricao} x${t.quantidade}`,
        link: "/transferencias",
      });
    });

    return alertas;
  }, [estoquePdv, transferencias]);

  return {
    loading: loadingTransf || loadingEvid || loadingEstPdv,
    transfMetrics,
    evidMetrics,
    estoquePdvMetrics,
    alertasOperacionais,
    pdvMap,
  };
}
