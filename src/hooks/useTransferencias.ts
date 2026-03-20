import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PRODUCT_CATALOG } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";

export interface PdvOption {
  id: string;
  nome: string;
  tipo: string;
}

export interface TransferenciaRecord {
  id: string;
  created_at: string;
  produto_codigo: string;
  produto_descricao: string;
  quantidade: number;
  quantidade_recebida: number | null;
  divergencia: number | null;
  tipo: string;
  status: string;
  pdv_origem_id: string | null;
  pdv_destino_id: string | null;
  usuario: string | null;
  observacao: string | null;
  observacao_recebimento: string | null;
  foto_recebimento: string | null;
  confirmado_por: string | null;
  confirmado_em: string | null;
  origem_nome?: string;
  destino_nome?: string;
}

interface DateRange {
  from: Date;
  to: Date;
}

export function useTransferencias(dateRange: DateRange) {
  const [records, setRecords] = useState<TransferenciaRecord[]>([]);
  const [pdvList, setPdvList] = useState<PdvOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Load PDVs
  useEffect(() => {
    const loadPdvs = async () => {
      const { data } = await supabase
        .from("pontos_de_venda")
        .select("id, nome, tipo")
        .eq("status", "ativo")
        .order("nome");
      if (data) setPdvList(data);
    };
    loadPdvs();
  }, []);

  const loadRecords = useCallback(async () => {
    if (pdvList.length === 0) return;
    setLoading(true);
    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = format(dateRange.to, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("movimentacoes_estoque")
      .select("*")
      .eq("tipo", "transferencia")
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar transferências");
      setLoading(false);
      return;
    }

    const enriched = (data || []).map((r) => {
      const origem = pdvList.find((p) => p.id === r.pdv_origem_id);
      const destino = pdvList.find((p) => p.id === r.pdv_destino_id);
      return { ...r, origem_nome: origem?.nome || "—", destino_nome: destino?.nome || "—" };
    });

    setRecords(enriched);
    setLoading(false);
  }, [dateRange, pdvList]);

  useEffect(() => {
    if (pdvList.length > 0) loadRecords();
  }, [loadRecords]);

  const deleteRecord = async (id: string) => {
    const { error } = await supabase.from("movimentacoes_estoque").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir transferência");
      return;
    }
    toast.success("Transferência excluída");
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return { records, pdvList, loading, loadRecords, deleteRecord };
}
