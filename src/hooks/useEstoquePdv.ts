import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EstoquePdv } from "@/types/inventory";

export function useEstoquePdv(pdvId?: string) {
  const [items, setItems] = useState<EstoquePdv[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    let query = supabase.from("estoque_pdv").select("*");
    if (pdvId) query = query.eq("pdv_id", pdvId);
    const { data, error } = await query.order("produto_descricao");
    if (!error && data) setItems(data as EstoquePdv[]);
    setLoading(false);
  }, [pdvId]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const channel = supabase
      .channel(`estoque-pdv-${pdvId || "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "estoque_pdv" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch, pdvId]);

  const updateQuantidade = async (id: string, quantidade: number) => {
    const { error } = await supabase.from("estoque_pdv").update({ quantidade } as any).eq("id", id);
    if (error) throw error;
  };

  const upsertEstoque = async (pdv_id: string, produto_codigo: string, produto_descricao: string, quantidade: number) => {
    const { error } = await supabase.from("estoque_pdv").upsert(
      { pdv_id, produto_codigo, produto_descricao, quantidade } as any,
      { onConflict: "produto_codigo,pdv_id" }
    );
    if (error) throw error;
  };

  const registrarMovimentacao = async (mov: {
    produto_codigo: string;
    produto_descricao: string;
    quantidade: number;
    tipo: string;
    pdv_origem_id?: string | null;
    pdv_destino_id?: string | null;
    usuario?: string;
    observacao?: string;
  }) => {
    const { error } = await supabase.from("movimentacoes_estoque").insert([mov] as any);
    if (error) throw error;
  };

  const transferir = async (params: {
    produto_codigo: string;
    produto_descricao: string;
    quantidade: number;
    pdv_origem_id: string;
    pdv_destino_id: string;
    usuario?: string;
    observacao?: string;
  }) => {
    // Check origin stock
    const { data: origemData } = await supabase
      .from("estoque_pdv")
      .select("quantidade")
      .eq("pdv_id", params.pdv_origem_id)
      .eq("produto_codigo", params.produto_codigo)
      .single();

    const origemQtd = origemData?.quantidade || 0;
    if (origemQtd < params.quantidade) {
      throw new Error(`Estoque insuficiente na origem. Disponível: ${origemQtd}`);
    }

    // Decrease origin
    await supabase.from("estoque_pdv").upsert(
      {
        pdv_id: params.pdv_origem_id,
        produto_codigo: params.produto_codigo,
        produto_descricao: params.produto_descricao,
        quantidade: origemQtd - params.quantidade,
      } as any,
      { onConflict: "produto_codigo,pdv_id" }
    );

    // Increase destination
    const { data: destData } = await supabase
      .from("estoque_pdv")
      .select("quantidade")
      .eq("pdv_id", params.pdv_destino_id)
      .eq("produto_codigo", params.produto_codigo)
      .single();

    const destQtd = destData?.quantidade || 0;
    await supabase.from("estoque_pdv").upsert(
      {
        pdv_id: params.pdv_destino_id,
        produto_codigo: params.produto_codigo,
        produto_descricao: params.produto_descricao,
        quantidade: destQtd + params.quantidade,
      } as any,
      { onConflict: "produto_codigo,pdv_id" }
    );

    // Record movement
    await registrarMovimentacao({
      produto_codigo: params.produto_codigo,
      produto_descricao: params.produto_descricao,
      quantidade: params.quantidade,
      tipo: "transferencia",
      pdv_origem_id: params.pdv_origem_id,
      pdv_destino_id: params.pdv_destino_id,
      usuario: params.usuario,
      observacao: params.observacao,
    });
  };

  return { items, loading, updateQuantidade, upsertEstoque, registrarMovimentacao, transferir, refetch: fetch };
}
