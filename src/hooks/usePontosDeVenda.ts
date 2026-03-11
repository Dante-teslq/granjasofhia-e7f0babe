import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PontoDeVenda } from "@/types/inventory";

export function usePontosDeVenda() {
  const [pdvs, setPdvs] = useState<PontoDeVenda[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from("pontos_de_venda")
      .select("*")
      .eq("status", "ativo")
      .order("nome");
    if (!error && data) setPdvs(data as PontoDeVenda[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("pdvs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pontos_de_venda" }, () => fetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetch]);

  const pdvsVenda = pdvs.filter(p => p.permite_venda);
  const pdvsById = Object.fromEntries(pdvs.map(p => [p.id, p]));

  return { pdvs, pdvsVenda, pdvsById, loading, refetch: fetch };
}
