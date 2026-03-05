import { supabase } from "@/integrations/supabase/client";
import { StockItem, type StoreName } from "@/types/inventory";
import { format } from "date-fns";

/**
 * Persists stock items to the estoque_registros table.
 * Uses upsert on (data, loja, codigo) unique constraint.
 */
export async function persistStockToDB(
  items: StockItem[],
  date: Date,
  store: StoreName,
  usuario?: string
) {
  const dateStr = format(date, "yyyy-MM-dd");
  const validItems = items.filter((item) => item.descricao);

  if (validItems.length === 0) return;

  const rows = validItems.map((item) => ({
    data: dateStr,
    loja: store,
    codigo: item.codigo,
    descricao: item.descricao,
    estoque_sistema: item.estoqueSistema,
    estoque_loja: item.estoqueLoja,
    trincado: item.trincado,
    quebrado: item.quebrado,
    obs: item.obs || "",
    usuario: usuario || null,
  }));

  const { error } = await supabase
    .from("estoque_registros")
    .upsert(rows, { onConflict: "data,loja,codigo" });

  if (error) {
    console.error("Erro ao persistir estoque:", error);
  }
}
