import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/contexts/AppContext";

export interface IntegracaoOpcao {
  id: string;
  integration_name: string;
  pdv_id: string | null;
  pdv_nome: string | null;
}

export interface ComparacaoItem {
  produto_codigo: string;
  produto_descricao: string;
  saldo_sistema: number;
  saldo_omie: number;
  divergencia: number;
  /** ok | divergente | apenas_sistema | apenas_omie */
  situacao: "ok" | "divergente" | "apenas_sistema" | "apenas_omie";
}

export interface HistoricoItem {
  id: string;
  data: string;
  produto_codigo: string;
  produto_descricao: string;
  saldo_interno: number;
  saldo_omie: number;
  divergencia: number;
  status: string;
  revisado_por: string | null;
  revisado_em: string | null;
}


export function useOmieReconciliacao() {
  const { profile } = useApp();
  const { toast } = useToast();

  const [integracoes, setIntegracoes] = useState<IntegracaoOpcao[]>([]);
  const [loadingIntegracoes, setLoadingIntegracoes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [comparacao, setComparacao] = useState<ComparacaoItem[]>([]);
  const [historico, setHistorico] = useState<HistoricoItem[]>([]);
  const [integracaoAtiva, setIntegracaoAtiva] = useState<IntegracaoOpcao | null>(null);

  /** Carrega integrações ativas com o nome do PDV vinculado */
  const fetchIntegracoes = useCallback(async () => {
    setLoadingIntegracoes(true);
    const { data, error } = await supabase
      .from("omie_integrations")
      .select("id, integration_name, pdv_id, pontos_de_venda(nome)")
      .eq("is_active", true)
      .order("integration_name");

    if (!error && data) {
      setIntegracoes(
        (data as any[]).map((r) => ({
          id: r.id,
          integration_name: r.integration_name,
          pdv_id: r.pdv_id,
          pdv_nome: r.pontos_de_venda?.nome ?? null,
        }))
      );
    }
    setLoadingIntegracoes(false);
  }, []);

  /** Carrega o histórico de reconciliações salvas para a integração selecionada */
  const fetchHistorico = useCallback(async (integrationId: string) => {
    const { data } = await supabase
      .from("omie_reconciliacao")
      .select("id, data, produto_codigo, produto_descricao, saldo_interno, saldo_omie, divergencia, status, revisado_por, revisado_em")
      .eq("integration_id", integrationId)
      .order("data", { ascending: false })
      .order("divergencia", { ascending: true })
      .limit(200);
    setHistorico((data as HistoricoItem[]) || []);
  }, []);

  /**
   * Puxa posição de estoque do Omie para o PDV da integração,
   * compara com estoque_pdv do sistema e retorna as divergências.
   * Nenhum dado é alterado — apenas leitura.
   */
  const comparar = useCallback(async (integracao: IntegracaoOpcao) => {
    if (!integracao.pdv_id) {
      toast({ title: "Integração sem PDV vinculado", description: "Associe um PDV a esta integração antes de comparar.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setComparacao([]);
    setIntegracaoAtiva(integracao);

    try {
      // 1. Busca posição de estoque no Omie via omie-gateway
      // supabase.functions.invoke injeta o token da sessão atual automaticamente
      const { data: omieResult, error: invErr } = await supabase.functions.invoke(
        "omie-gateway/fetch-inventory",
        { body: { pdv_id: integracao.pdv_id, omie_params: { nPagina: 1, nRegPorPagina: 500 } } }
      );

      if (invErr) throw new Error(invErr.message);

      // 2. Busca estoque do sistema para o PDV
      const { data: estoqueData, error: estoqueError } = await supabase
        .from("estoque_pdv")
        .select("produto_codigo, produto_descricao, quantidade")
        .eq("pdv_id", integracao.pdv_id);

      if (estoqueError) throw new Error(estoqueError.message);

      // 3. Monta mapa do sistema: codigo → { descricao, quantidade }
      const sistemaMap = new Map<string, { descricao: string; quantidade: number }>();
      for (const r of (estoqueData || []) as any[]) {
        sistemaMap.set(r.produto_codigo, {
          descricao: r.produto_descricao,
          quantidade: Number(r.quantidade),
        });
      }

      // 4. Extrai lista de produtos do Omie
      // ListarPosEstoque retorna produto_estoque_lista com nCodProd, cCodIntProducao, cDescricao, nSaldo
      const omieData = omieResult?.data;
      const omieList: Array<{ codigo: string; descricao: string; saldo: number }> = [];

      const estoqueOmie =
        omieData?.produto_estoque_lista ||
        omieData?.listagem ||
        omieData?.produtos_estoque_lista ||
        [];

      for (const item of estoqueOmie as any[]) {
        // cCodIntProducao é o código interno — o mesmo que usamos no sistema
        const codigo = item.cCodIntProducao || item.nCodProd?.toString() || "";
        const descricao = item.cDescricao || "";
        const saldo = Number(item.nSaldo ?? item.quantidade ?? 0);
        if (codigo) omieList.push({ codigo, descricao, saldo });
      }

      // 5. Monta mapa do Omie
      const omieMap = new Map<string, { descricao: string; saldo: number }>();
      for (const item of omieList) {
        omieMap.set(item.codigo, { descricao: item.descricao, saldo: item.saldo });
      }

      // 6. Unifica todos os códigos encontrados em ambos os lados
      const allCodigos = new Set([...sistemaMap.keys(), ...omieMap.keys()]);
      const resultado: ComparacaoItem[] = [];

      for (const codigo of allCodigos) {
        const sistema = sistemaMap.get(codigo);
        const omie = omieMap.get(codigo);

        const saldoSistema = sistema?.quantidade ?? 0;
        const saldoOmie = omie?.saldo ?? 0;
        const divergencia = saldoSistema - saldoOmie;
        const descricao = sistema?.descricao || omie?.descricao || codigo;

        let situacao: ComparacaoItem["situacao"] = "ok";
        if (!omie) situacao = "apenas_sistema";
        else if (!sistema) situacao = "apenas_omie";
        else if (divergencia !== 0) situacao = "divergente";

        resultado.push({ produto_codigo: codigo, produto_descricao: descricao, saldo_sistema: saldoSistema, saldo_omie: saldoOmie, divergencia, situacao });
      }

      // Ordena: divergentes e só-sistema primeiro, depois ok
      resultado.sort((a, b) => {
        const order = { divergente: 0, apenas_sistema: 1, apenas_omie: 2, ok: 3 };
        if (order[a.situacao] !== order[b.situacao]) return order[a.situacao] - order[b.situacao];
        return Math.abs(b.divergencia) - Math.abs(a.divergencia);
      });

      setComparacao(resultado);

      const nDivergentes = resultado.filter((r) => r.situacao !== "ok").length;
      if (nDivergentes > 0) {
        toast({ title: `${nDivergentes} incompatibilidade(s) encontrada(s)`, variant: "destructive" });
      } else {
        toast({ title: "Estoque compatível — nenhuma divergência com o Omie" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao comparar com Omie", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  /**
   * Salva a revisão de um item na tabela omie_reconciliacao.
   * Não altera nenhum dado de estoque ou vendas — apenas registra que o usuário viu e anotou a divergência.
   */
  const salvarRevisao = useCallback(async (
    item: ComparacaoItem,
    integracaoId: string,
    pdvId: string,
    status: "revisado" | "ignorado"
  ) => {
    const revisorNome = profile?.nome || profile?.email || "Sistema";
    const hoje = new Date().toISOString().split("T")[0];

    const { error } = await supabase.from("omie_reconciliacao").upsert(
      {
        omie_conta_id: null,
        integration_id: integracaoId,
        pdv_id: pdvId,
        data: hoje,
        produto_codigo: item.produto_codigo,
        produto_descricao: item.produto_descricao,
        saldo_interno: item.saldo_sistema,
        saldo_omie: item.saldo_omie,
        divergencia: item.divergencia,
        status,
        revisado_por: revisorNome,
        revisado_em: new Date().toISOString(),
      } as any,
      { onConflict: "integration_id,data,produto_codigo" }
    );

    if (error) throw error;

    // Atualiza comparação local: marca o item como revisado/ignorado visualmente
    setComparacao((prev) =>
      prev.map((r) =>
        r.produto_codigo === item.produto_codigo
          ? { ...r, situacao: "ok" as const }
          : r
      )
    );
  }, [profile]);

  return {
    integracoes,
    loadingIntegracoes,
    fetchIntegracoes,
    fetchHistorico,
    historico,
    loading,
    comparacao,
    comparar,
    salvarRevisao,
    integracaoAtiva,
  };
}
