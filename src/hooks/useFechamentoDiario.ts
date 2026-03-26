import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays } from "date-fns";
import { PRODUCT_CATALOG } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";

export interface FechamentoDiarioItem {
  id: string;
  pdv_id: string;
  data: string;
  produto_codigo: string;
  produto_descricao: string;
  estoque_inicial: number;
  total_entradas: number;
  total_saidas: number;
  total_perdas: number;
  total_ajustes: number;
  estoque_final: number;
  status: string;
  fechado_em: string | null;
  fechado_por: string | null;
  reaberto_em: string | null;
  reaberto_por: string | null;
}

export function useFechamentoDiario(pdvId: string | null, date: Date) {
  const [items, setItems] = useState<FechamentoDiarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");

  /** Fetch confirmed transfers for the given PDV and date */
  const fetchMovements = useCallback(async (pdvId: string, dateStr: string) => {
    const dayStart = `${dateStr}T00:00:00`;
    const dayEnd = `${dateStr}T23:59:59`;

    // Fetch confirmed transfers where this PDV is origin or destination
    const { data: movements } = await supabase
      .from("movimentacoes_estoque")
      .select("produto_codigo, quantidade, quantidade_recebida, pdv_origem_id, pdv_destino_id, status")
      .eq("tipo", "transferencia")
      .eq("status", "confirmado")
      .gte("confirmado_em", dayStart)
      .lte("confirmado_em", dayEnd)
      .or(`pdv_origem_id.eq.${pdvId},pdv_destino_id.eq.${pdvId}`);

    // Build per-product entradas/saidas
    const entradas = new Map<string, number>();
    const saidas = new Map<string, number>();

    (movements || []).forEach((m: any) => {
      const qty = Number(m.quantidade_recebida ?? m.quantidade);
      if (m.pdv_destino_id === pdvId) {
        entradas.set(m.produto_codigo, (entradas.get(m.produto_codigo) || 0) + qty);
      }
      if (m.pdv_origem_id === pdvId) {
        saidas.set(m.produto_codigo, (saidas.get(m.produto_codigo) || 0) + Number(m.quantidade));
      }
    });

    return { entradas, saidas };
  }, []);

  /** Fetch losses from evidencias_perdas for PDV name and date */
  const fetchLosses = useCallback(async (pdvId: string, dateStr: string) => {
    // First get PDV name
    const { data: pdv } = await supabase
      .from("pontos_de_venda")
      .select("nome")
      .eq("id", pdvId)
      .single();

    if (!pdv) return new Map<string, number>();

    // Get losses for that PDV on that date
    const { data: losses } = await supabase
      .from("evidencias_perdas")
      .select("quantidade")
      .eq("ponto_de_venda", pdv.nome)
      .eq("data", dateStr);

    // Losses don't have product_codigo, so we aggregate as a total
    const totalLosses = (losses || []).reduce((sum: number, l: any) => sum + Number(l.quantidade), 0);

    // Return as a map with a special key for aggregate
    const map = new Map<string, number>();
    map.set("__aggregate__", totalLosses);
    return map;
  }, []);

  const fetchData = useCallback(async () => {
    if (!pdvId) { setLoading(false); return; }
    setLoading(true);

    const { data: rows } = await supabase
      .from("fechamento_diario_estoque")
      .select("*")
      .eq("pdv_id", pdvId)
      .eq("data", dateStr)
      .order("produto_descricao");

    // Fetch real movements for auto-consolidation
    const [{ entradas, saidas }, lossesMap] = await Promise.all([
      fetchMovements(pdvId, dateStr),
      fetchLosses(pdvId, dateStr),
    ]);

    const aggregateLosses = lossesMap.get("__aggregate__") || 0;

    if (rows && rows.length > 0) {
      // Update existing rows with real movement data
      setItems(rows.map((r: any) => {
        const autoEntradas = entradas.get(r.produto_codigo) || 0;
        const autoSaidas = saidas.get(r.produto_codigo) || 0;
        // Distribute aggregate losses proportionally or show on first item
        const estInicial = Number(r.estoque_inicial);
        const ajustes = Number(r.total_ajustes);
        const perdas = Number(r.total_perdas);
        const final_ = estInicial + autoEntradas - autoSaidas - perdas + ajustes;

        return {
          id: r.id,
          pdv_id: r.pdv_id,
          data: r.data,
          produto_codigo: r.produto_codigo,
          produto_descricao: r.produto_descricao,
          estoque_inicial: estInicial,
          total_entradas: autoEntradas,
          total_saidas: autoSaidas,
          total_perdas: perdas,
          total_ajustes: ajustes,
          estoque_final: r.status === "fechado" ? Number(r.estoque_final) : final_,
          status: r.status,
          fechado_em: r.fechado_em,
          fechado_por: r.fechado_por,
          reaberto_em: r.reaberto_em,
          reaberto_por: r.reaberto_por,
        };
      }));
    } else {
      // Try to inherit from previous day's closed records
      const prevDateStr = format(addDays(date, -1), "yyyy-MM-dd");
      const { data: prevRows } = await supabase
        .from("fechamento_diario_estoque")
        .select("*")
        .eq("pdv_id", pdvId)
        .eq("data", prevDateStr)
        .eq("status", "fechado");

      const prevMap = new Map<string, number>();
      if (prevRows) {
        prevRows.forEach((r: any) => {
          prevMap.set(r.produto_codigo, Number(r.estoque_final));
        });
      }

      // Build items from catalog with inherited initial stock and real movements
      setItems(
        PRODUCT_CATALOG.map((p) => {
          const inicial = prevMap.get(p.codigo) || 0;
          const autoEntradas = entradas.get(p.codigo) || 0;
          const autoSaidas = saidas.get(p.codigo) || 0;
          return {
            id: crypto.randomUUID(),
            pdv_id: pdvId,
            data: dateStr,
            produto_codigo: p.codigo,
            produto_descricao: p.descricao,
            estoque_inicial: inicial,
            total_entradas: autoEntradas,
            total_saidas: autoSaidas,
            total_perdas: 0,
            total_ajustes: 0,
            estoque_final: inicial + autoEntradas - autoSaidas,
            status: "aberto",
            fechado_em: null,
            fechado_por: null,
            reaberto_em: null,
            reaberto_por: null,
          };
        })
      );
    }
    setLoading(false);
  }, [pdvId, dateStr, date, fetchMovements, fetchLosses]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isClosed = items.length > 0 && items[0].status === "fechado";

  const updateItem = useCallback((idx: number, field: keyof FechamentoDiarioItem, value: number) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const updated = { ...item, [field]: value };
        updated.estoque_final = updated.estoque_inicial + updated.total_entradas - updated.total_saidas - updated.total_perdas + updated.total_ajustes;
        return updated;
      })
    );
  }, []);

  const closeDay = useCallback(async (userName: string, userId: string) => {
    if (!pdvId) return false;
    if (isClosed) {
      toast.error("Este dia já está fechado.");
      return false;
    }
    setSaving(true);

    try {
      // Recalculate finals
      const finalItems = items.map((item) => ({
        ...item,
        estoque_final: item.estoque_inicial + item.total_entradas - item.total_saidas - item.total_perdas + item.total_ajustes,
      }));

      // Delete existing open rows for this day/pdv
      await supabase
        .from("fechamento_diario_estoque")
        .delete()
        .eq("pdv_id", pdvId)
        .eq("data", dateStr)
        .eq("status", "aberto");

      // Insert all items as closed
      const rows = finalItems.map((item) => ({
        pdv_id: pdvId,
        data: dateStr,
        produto_codigo: item.produto_codigo,
        produto_descricao: item.produto_descricao,
        estoque_inicial: item.estoque_inicial,
        total_entradas: item.total_entradas,
        total_saidas: item.total_saidas,
        total_perdas: item.total_perdas,
        total_ajustes: item.total_ajustes,
        estoque_final: item.estoque_final,
        status: "fechado",
        fechado_em: new Date().toISOString(),
        fechado_por: userName,
        fechado_por_id: userId,
      }));

      const { error } = await supabase
        .from("fechamento_diario_estoque")
        .insert(rows);

      if (error) {
        console.error("Erro ao fechar dia:", error);
        toast.error("Erro ao fechar o dia.");
        setSaving(false);
        return false;
      }

      // Propagate to next day's initial stock
      await propagateToNextDay(pdvId, date, finalItems);

      // Audit log
      await supabase.from("audit_logs").insert({
        action: "create",
        module: "Fechamento Estoque",
        usuario: userName,
        item_description: `Fechamento diário ${format(date, "dd/MM/yyyy")} — ${finalItems.length} produtos`,
        after_data: { pdv_id: pdvId, data: dateStr, status: "fechado", items_count: finalItems.length },
      });

      toast.success("Dia fechado com sucesso!", {
        description: `Estoque do dia ${format(date, "dd/MM/yyyy")} fechado e propagado para o próximo dia.`,
      });

      await fetchData();
      setSaving(false);
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao fechar o dia.");
      setSaving(false);
      return false;
    }
  }, [pdvId, dateStr, date, items, isClosed, fetchData]);

  const reopenDay = useCallback(async (userName: string, userId: string) => {
    if (!pdvId || !isClosed) return false;
    setSaving(true);

    try {
      const { error } = await supabase
        .from("fechamento_diario_estoque")
        .update({
          status: "aberto",
          reaberto_em: new Date().toISOString(),
          reaberto_por: userName,
        })
        .eq("pdv_id", pdvId)
        .eq("data", dateStr);

      if (error) {
        toast.error("Erro ao reabrir o dia.");
        setSaving(false);
        return false;
      }

      await supabase.from("audit_logs").insert({
        action: "update",
        module: "Fechamento Estoque",
        usuario: userName,
        item_description: `Reabertura do dia ${format(date, "dd/MM/yyyy")}`,
        after_data: { pdv_id: pdvId, data: dateStr, status: "aberto" },
      });

      toast.success("Dia reaberto com sucesso.");
      await fetchData();
      setSaving(false);
      return true;
    } catch (err) {
      console.error(err);
      toast.error("Erro ao reabrir o dia.");
      setSaving(false);
      return false;
    }
  }, [pdvId, dateStr, date, isClosed, fetchData]);

  return {
    items,
    setItems,
    loading,
    saving,
    isClosed,
    updateItem,
    closeDay,
    reopenDay,
    refetch: fetchData,
  };
}

/** Propagate estoque_final to next day's estoque_inicial */
async function propagateToNextDay(
  pdvId: string,
  currentDate: Date,
  closedItems: FechamentoDiarioItem[]
) {
  const nextDateStr = format(addDays(currentDate, 1), "yyyy-MM-dd");

  const { data: nextRows } = await supabase
    .from("fechamento_diario_estoque")
    .select("id, produto_codigo")
    .eq("pdv_id", pdvId)
    .eq("data", nextDateStr);

  if (nextRows && nextRows.length > 0) {
    for (const item of closedItems) {
      const nextRow = nextRows.find((r: any) => r.produto_codigo === item.produto_codigo);
      if (nextRow) {
        await supabase
          .from("fechamento_diario_estoque")
          .update({ estoque_inicial: item.estoque_final })
          .eq("id", nextRow.id);
      }
    }
  }
}
