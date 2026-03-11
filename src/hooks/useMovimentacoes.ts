import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MovimentacaoEstoque } from "@/types/inventory";

export function useMovimentacoes(limit = 50) {
  const [items, setItems] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("movimentacoes_estoque")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!error && data) setItems(data as MovimentacaoEstoque[]);
    setLoading(false);
  }, [limit]);

  useEffect(() => { fetch(); }, [fetch]);

  useEffect(() => {
    const channel = supabase
      .channel("movimentacoes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "movimentacoes_estoque" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  return { items, loading, refetch: fetch };
}
