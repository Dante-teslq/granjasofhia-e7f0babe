import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isValid } from "date-fns";

export interface VendaDiaria {
  id: string;
  data: string;
  produto: string;
  codigo_produto: string;
  ponto_venda: string;
  quantidade: number;
  valor_unitario: number;
  total: number;
  forma_pagamento: string;
  usuario: string | null;
  observacao: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface UseVendasDiariasOptions {
  from?: Date;
  to?: Date;
}

export function useVendasDiarias({ from, to }: UseVendasDiariasOptions = {}) {
  const [records, setRecords] = useState<VendaDiaria[]>([]);
  const [loading, setLoading] = useState(true);

  // Stabilize date strings to prevent unnecessary refetches
  const fromStr = from && isValid(from) ? format(from, "yyyy-MM-dd") : undefined;
  const toStr = to && isValid(to) ? format(to, "yyyy-MM-dd") : undefined;

  const fetchData = useCallback(async () => {
    let query = supabase.from("vendas_diarias").select("*");
    if (fromStr) query = query.gte("data", fromStr);
    if (toStr) query = query.lte("data", toStr);
    const { data, error } = await query.order("created_at", { ascending: false });
    if (!error && data) setRecords(data as VendaDiaria[]);
    setLoading(false);
  }, [fromStr, toStr]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("vendas-diarias-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "vendas_diarias" }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  const metrics = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const vendasHoje = records.filter(r => r.data === today);
    const totalHoje = vendasHoje.reduce((s, r) => s + r.total, 0);
    const totalPeriodo = records.reduce((s, r) => s + r.total, 0);
    const qtdHoje = vendasHoje.reduce((s, r) => s + r.quantidade, 0);
    const qtdPeriodo = records.reduce((s, r) => s + r.quantidade, 0);

    // Product ranking
    const porProduto = Object.values(
      records.reduce((acc, r) => {
        if (!acc[r.produto]) acc[r.produto] = { produto: r.produto, quantidade: 0, total: 0 };
        acc[r.produto].quantidade += r.quantidade;
        acc[r.produto].total += r.total;
        return acc;
      }, {} as Record<string, { produto: string; quantidade: number; total: number }>)
    ).sort((a, b) => b.total - a.total);

    // Daily totals
    const porDia = Object.values(
      records.reduce((acc, r) => {
        if (!acc[r.data]) acc[r.data] = { data: r.data, total: 0, quantidade: 0 };
        acc[r.data].total += r.total;
        acc[r.data].quantidade += r.quantidade;
        return acc;
      }, {} as Record<string, { data: string; total: number; quantidade: number }>)
    ).sort((a, b) => a.data.localeCompare(b.data));

    const diaFechado = vendasHoje.length > 0 && vendasHoje.every(r => r.status === "fechado");

    return { totalHoje, totalPeriodo, qtdHoje, qtdPeriodo, porProduto, porDia, diaFechado, vendasHoje };
  }, [records]);

  // CRUD operations
  const addVenda = async (venda: {
    data: string; produto: string; codigo_produto: string; ponto_venda: string;
    quantidade: number; valor_unitario: number; forma_pagamento: string;
    usuario?: string; observacao?: string;
  }) => {
    const { error } = await supabase.from("vendas_diarias").insert([venda] as any);
    if (error) throw error;
  };

  const updateVenda = async (id: string, updates: Partial<VendaDiaria>) => {
    const { error } = await supabase.from("vendas_diarias").update(updates as any).eq("id", id);
    if (error) throw error;
  };

  const deleteVenda = async (id: string) => {
    const { error } = await supabase.from("vendas_diarias").delete().eq("id", id);
    if (error) throw error;
  };

  const fecharDia = async (date: string) => {
    const { error } = await supabase
      .from("vendas_diarias")
      .update({ status: "fechado" } as any)
      .eq("data", date)
      .eq("status", "aberto");
    if (error) throw error;
  };

  return { records, loading, ...metrics, addVenda, updateVenda, deleteVenda, fecharDia, refetch: fetchData };
}
