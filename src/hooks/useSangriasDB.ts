import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SangriaItem, STORES } from "@/types/inventory";
import { format } from "date-fns";

export function useSangriasDB(externalDate?: Date) {
  const [records, setRecords] = useState<SangriaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedPDV, setSelectedPDV] = useState<string>("all");

  const activeDate = externalDate || selectedDate;
  const dateStr = format(activeDate, "yyyy-MM-dd");

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("sangrias")
      .select("*")
      .eq("data", dateStr)
      .order("created_at", { ascending: true });

    if (selectedPDV !== "all") {
      query = query.eq("ponto_venda", selectedPDV);
    }

    const { data } = await query;
    if (data) {
      setRecords(
        data.map((r: any) => ({
          id: r.id,
          sangria: r.sangria,
          cartelasVazias: r.cartelas_vazias,
          barbantes: r.barbantes,
          notacoes: r.notacoes,
          pontoVenda: r.ponto_venda,
        }))
      );
    }
    setLoading(false);
  }, [dateStr, selectedPDV]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("sangrias-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sangrias" }, () => {
        fetchRecords();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRecords]);

  const saveItems = async (items: SangriaItem[], pontoVenda: string, usuario: string) => {
    // Delete existing for this date + pdv, then insert
    await supabase.from("sangrias").delete().eq("data", dateStr).eq("ponto_venda", pontoVenda);

    const rows = items
      .filter((i) => i.sangria || i.cartelasVazias || i.barbantes || i.notacoes)
      .map((i) => ({
        data: dateStr,
        ponto_venda: pontoVenda,
        sangria: i.sangria,
        cartelas_vazias: i.cartelasVazias,
        barbantes: i.barbantes,
        notacoes: i.notacoes,
        usuario,
      }));

    if (rows.length > 0) {
      await supabase.from("sangrias").insert(rows);
    }
    await fetchRecords();
  };

  const deleteByDate = async (date: string, pdv?: string) => {
    let query = supabase.from("sangrias").delete().eq("data", date);
    if (pdv && pdv !== "all") {
      query = query.eq("ponto_venda", pdv);
    }
    await query;
    await fetchRecords();
  };

  return {
    records,
    loading,
    selectedDate,
    setSelectedDate,
    selectedPDV,
    setSelectedPDV,
    saveItems,
    deleteByDate,
    fetchRecords,
  };
}
