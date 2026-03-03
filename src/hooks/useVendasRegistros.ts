import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VendaRegistro {
  id: string;
  ponto_venda: string;
  ano: number;
  mes: number;
  total_calculado: number;
  dados_customizados: Record<string, unknown>;
  usuario: string | null;
  created_at: string;
  updated_at: string;
}

export function useVendasRegistros() {
  const [registros, setRegistros] = useState<VendaRegistro[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("vendas_registros")
      .select("*")
      .order("ponto_venda")
      .order("ano")
      .order("mes");
    if (!error && data) setRegistros(data as VendaRegistro[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("vendas_registros_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "vendas_registros" },
        () => {
          fetchAll();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const upsertRegistro = async (
    ponto_venda: string,
    ano: number,
    mes: number,
    total_calculado: number,
    usuario?: string
  ) => {
    const { error } = await supabase
      .from("vendas_registros")
      .upsert(
        { ponto_venda, ano, mes, total_calculado, usuario: usuario || null },
        { onConflict: "ponto_venda,ano,mes" }
      );
    return { error };
  };

  const deleteRegistro = async (id: string) => {
    const { error } = await supabase
      .from("vendas_registros")
      .delete()
      .eq("id", id);
    return { error };
  };

  const addPontoVenda = async (nome: string) => {
    // Just insert month 1 with 0 to create the store
    const { error } = await supabase
      .from("vendas_registros")
      .insert({ ponto_venda: nome, ano: new Date().getFullYear(), mes: 1, total_calculado: 0 });
    return { error };
  };

  // Derived data
  const pontosVenda = [...new Set(registros.map((r) => r.ponto_venda))].sort();
  const currentYear = new Date().getFullYear();
  const baseYears = Array.from({ length: currentYear - 2022 + 1 }, (_, i) => 2022 + i);
  const dataYears = [...new Set(registros.map((r) => r.ano))];
  const anos = [...new Set([...baseYears, ...dataYears])].sort();

  const getStoreYearData = (store: string, year: number): number[] => {
    const result = new Array(12).fill(0);
    registros
      .filter((r) => r.ponto_venda === store && r.ano === year)
      .forEach((r) => {
        result[r.mes - 1] = Number(r.total_calculado);
      });
    return result;
  };

  const getStoreData = (store: string): Record<string, number[]> => {
    const storeAnos = [...new Set(registros.filter((r) => r.ponto_venda === store).map((r) => r.ano))].sort();
    const result: Record<string, number[]> = {};
    storeAnos.forEach((y) => {
      result[String(y)] = getStoreYearData(store, y);
    });
    return result;
  };

  // Ranking: total per store for a given year
  const getRanking = (year: number) => {
    const map = new Map<string, number>();
    registros
      .filter((r) => r.ano === year && Number(r.total_calculado) > 0)
      .forEach((r) => {
        map.set(r.ponto_venda, (map.get(r.ponto_venda) || 0) + Number(r.total_calculado));
      });
    return [...map.entries()]
      .map(([store, total]) => ({ store, total }))
      .sort((a, b) => b.total - a.total);
  };

  // Ranking by specific month and year
  const getRankingByMonth = (year: number, month: number) => {
    const map = new Map<string, number>();
    registros
      .filter((r) => r.ano === year && r.mes === month && Number(r.total_calculado) > 0)
      .forEach((r) => {
        map.set(r.ponto_venda, Number(r.total_calculado));
      });
    return [...map.entries()]
      .map(([store, total]) => ({ store, total }))
      .sort((a, b) => b.total - a.total);
  };

  return {
    registros,
    loading,
    pontosVenda,
    anos: anos.map(String),
    getStoreData,
    getStoreYearData,
    getRanking,
    getRankingByMonth,
    upsertRegistro,
    deleteRegistro,
    addPontoVenda,
    refetch: fetchAll,
  };
}
