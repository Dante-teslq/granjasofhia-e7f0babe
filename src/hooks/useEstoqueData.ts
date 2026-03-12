import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, isValid } from "date-fns";

export interface EstoqueRecord {
  id: string;
  data: string;
  loja: string;
  codigo: string;
  descricao: string;
  estoque_sistema: number;
  estoque_loja: number;
  trincado: number;
  quebrado: number;
  obs: string;
  usuario: string | null;
  created_at: string;
  updated_at: string;
}

interface UseEstoqueDataOptions {
  from?: Date;
  to?: Date;
}

export function useEstoqueData({ from, to }: UseEstoqueDataOptions = {}) {
  const [records, setRecords] = useState<EstoqueRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Stabilize date strings to prevent unnecessary refetches
  const fromStr = from && isValid(from) ? format(from, "yyyy-MM-dd") : undefined;
  const toStr = to && isValid(to) ? format(to, "yyyy-MM-dd") : undefined;

  const fetchData = useCallback(async () => {
    let query = supabase.from("estoque_registros").select("*");

    if (fromStr) {
      query = query.gte("data", fromStr);
    }
    if (toStr) {
      query = query.lte("data", toStr);
    }

    const { data, error } = await query.order("data", { ascending: true });
    if (!error && data) {
      setRecords(data as EstoqueRecord[]);
    }
    setLoading(false);
  }, [fromStr, toStr]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("estoque-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "estoque_registros" },
        () => {
          // Re-fetch all data on any change
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchData]);

  // Computed metrics
  const metrics = useMemo(() => {
    const validRecords = records.filter((r) => r.descricao);
    const totalFaltas = validRecords.reduce(
      (sum, r) => sum + Math.abs(r.estoque_loja - r.estoque_sistema),
      0
    );
    const totalTrincado = validRecords.reduce((sum, r) => sum + r.trincado, 0);
    const totalQuebrado = validRecords.reduce((sum, r) => sum + r.quebrado, 0);
    const totalPerdas = totalQuebrado;
    const totalVendido = validRecords.reduce((sum, r) => sum + r.estoque_loja, 0);
    const totalEstoqueSistema = validRecords.reduce(
      (sum, r) => sum + r.estoque_sistema,
      0
    );
    const hasData = validRecords.length > 0;

    // Products with high loss rate (quebrado > 10% of estoque_sistema)
    const produtosEmRisco = validRecords.filter(
      (r) => r.estoque_sistema > 0 && r.quebrado / r.estoque_sistema > 0.1
    );

    // Products below minimum (estoque_loja < 5)
    const produtosAbaixoMinimo = validRecords.filter(
      (r) => r.estoque_loja > 0 && r.estoque_loja < 5
    );

    // Unique products count
    const uniqueProducts = new Set(validRecords.map((r) => r.codigo)).size;

    // Unique stores
    const uniqueStores = new Set(validRecords.map((r) => r.loja)).size;

    // Group by product for chart
    const porProduto = Object.values(
      validRecords.reduce(
        (acc, r) => {
          if (!acc[r.descricao]) {
            acc[r.descricao] = {
              descricao: r.descricao,
              estoque_sistema: 0,
              estoque_loja: 0,
              trincado: 0,
              quebrado: 0,
              faltas: 0,
            };
          }
          acc[r.descricao].estoque_sistema += r.estoque_sistema;
          acc[r.descricao].estoque_loja += r.estoque_loja;
          acc[r.descricao].trincado += r.trincado;
          acc[r.descricao].quebrado += r.quebrado;
          acc[r.descricao].faltas += Math.abs(
            r.estoque_loja - r.estoque_sistema
          );
          return acc;
        },
        {} as Record<
          string,
          {
            descricao: string;
            estoque_sistema: number;
            estoque_loja: number;
            trincado: number;
            quebrado: number;
            faltas: number;
          }
        >
      )
    );

    // Group by date for daily chart
    const porDia = Object.values(
      validRecords.reduce(
        (acc, r) => {
          if (!acc[r.data]) {
            acc[r.data] = {
              data: r.data,
              vendas: 0,
              perdas: 0,
              entradas: 0,
            };
          }
          acc[r.data].vendas += r.estoque_loja;
          acc[r.data].perdas += r.quebrado;
          acc[r.data].entradas += r.estoque_sistema;
          return acc;
        },
        {} as Record<
          string,
          { data: string; vendas: number; perdas: number; entradas: number }
        >
      )
    ).sort((a, b) => a.data.localeCompare(b.data));

    // Group by store
    const porLoja = Object.values(
      validRecords.reduce(
        (acc, r) => {
          if (!acc[r.loja]) {
            acc[r.loja] = { loja: r.loja, total: 0, faltas: 0, perdas: 0 };
          }
          acc[r.loja].total += r.estoque_loja;
          acc[r.loja].faltas += Math.abs(r.estoque_loja - r.estoque_sistema);
          acc[r.loja].perdas += r.quebrado;
          return acc;
        },
        {} as Record<
          string,
          { loja: string; total: number; faltas: number; perdas: number }
        >
      )
    );

    // Smart alerts
    const alertas: Array<{
      id: string;
      severity: "crítica" | "média" | "baixa";
      message: string;
      link: string;
    }> = [];

    for (const p of porProduto) {
      if (p.estoque_sistema > 0 && p.quebrado / p.estoque_sistema > 0.1) {
        alertas.push({
          id: `risco-${p.descricao}`,
          severity: "crítica",
          message: `${p.descricao}: taxa de perda de ${((p.quebrado / p.estoque_sistema) * 100).toFixed(1)}%`,
          link: "/estoque",
        });
      }
      if (p.faltas > 0 && p.estoque_sistema > 0 && p.faltas / p.estoque_sistema > 0.15) {
        alertas.push({
          id: `falta-${p.descricao}`,
          severity: "média",
          message: `${p.descricao}: divergência de ${((p.faltas / p.estoque_sistema) * 100).toFixed(1)}% no estoque`,
          link: "/estoque",
        });
      }
    }

    const divergencePercent =
      hasData && totalVendido > 0 ? (totalFaltas / totalVendido) * 100 : 0;

    return {
      records: validRecords,
      totalFaltas,
      totalTrincado,
      totalQuebrado,
      totalPerdas,
      totalVendido,
      totalEstoqueSistema,
      hasData,
      produtosEmRisco,
      produtosAbaixoMinimo,
      uniqueProducts,
      uniqueStores,
      porProduto,
      porDia,
      porLoja,
      alertas,
      divergencePercent,
    };
  }, [records]);

  return { ...metrics, loading, refetch: fetchData };
}
