import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PRODUCT_CATALOG } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";

export interface EstoqueDiarioItem {
  id: string;
  produto_codigo: string;
  produto_descricao: string;
  estoque_sistema: number;
  estoque_loja: number;
  trincado: number;
  quebrado: number;
  observacao: string;
}

export interface EstoqueDiario {
  id: string;
  pdv_id: string;
  data_conferencia: string;
  status: string;
  created_by: string | null;
  created_by_name: string;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export function useEstoqueDiario(pdvId: string | null, date: Date) {
  const [diario, setDiario] = useState<EstoqueDiario | null>(null);
  const [itens, setItens] = useState<EstoqueDiarioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const dateStr = format(date, "yyyy-MM-dd");

  const fetchDiario = useCallback(async () => {
    if (!pdvId) { setLoading(false); return; }
    setLoading(true);

    // Fetch header
    const { data: headers } = await supabase
      .from("estoque_diario")
      .select("*")
      .eq("pdv_id", pdvId)
      .eq("data_conferencia", dateStr)
      .limit(1);

    const header = headers?.[0] as EstoqueDiario | undefined;

    if (header) {
      setDiario(header);
      // Fetch items
      const { data: items } = await supabase
        .from("estoque_diario_itens")
        .select("*")
        .eq("estoque_diario_id", header.id)
        .order("produto_descricao");

      setItens(
        (items || []).map((i: any) => ({
          id: i.id,
          produto_codigo: i.produto_codigo,
          produto_descricao: i.produto_descricao,
          estoque_sistema: i.estoque_sistema,
          estoque_loja: i.estoque_loja,
          trincado: i.trincado,
          quebrado: i.quebrado,
          observacao: i.observacao,
        }))
      );
    } else {
      setDiario(null);
      // Pre-load catalog as empty items for the operator to fill
      setItens(
        PRODUCT_CATALOG.map((p) => ({
          id: crypto.randomUUID(),
          produto_codigo: p.codigo,
          produto_descricao: p.descricao,
          estoque_sistema: 0,
          estoque_loja: 0,
          trincado: 0,
          quebrado: 0,
          observacao: "",
        }))
      );
    }
    setLoading(false);
  }, [pdvId, dateStr]);

  useEffect(() => {
    fetchDiario();
  }, [fetchDiario]);

  const isClosed = diario?.status === "fechado";

  const saveAndClose = useCallback(
    async (userName: string, userId: string) => {
      if (!pdvId) return false;
      setSaving(true);

      try {
        // Check if already exists for this date+pdv
        if (diario && isClosed) {
          toast.error("Este fechamento já está concluído. Apenas administradores podem editar.");
          setSaving(false);
          return false;
        }

        // Validate items
        const validItens = itens.filter(
          (i) => i.estoque_sistema > 0 || i.estoque_loja > 0 || i.trincado > 0 || i.quebrado > 0
        );

        if (validItens.length === 0) {
          toast.error("Preencha ao menos uma mercadoria antes de salvar.");
          setSaving(false);
          return false;
        }

        let diarioId = diario?.id;

        if (!diarioId) {
          // Check duplicate
          const { data: existing } = await supabase
            .from("estoque_diario")
            .select("id, status")
            .eq("pdv_id", pdvId)
            .eq("data_conferencia", dateStr)
            .limit(1);

          if (existing && existing.length > 0) {
            toast.error("Já existe um fechamento para esta data e PDV.");
            setSaving(false);
            return false;
          }

          // Create header
          const { data: newHeader, error: headerError } = await supabase
            .from("estoque_diario")
            .insert({
              pdv_id: pdvId,
              data_conferencia: dateStr,
              status: "fechado",
              created_by: userId,
              created_by_name: userName,
            })
            .select()
            .single();

          if (headerError) {
            console.error("Erro ao criar fechamento:", headerError);
            toast.error("Erro ao criar fechamento.");
            setSaving(false);
            return false;
          }
          diarioId = newHeader.id;
        } else {
          // Update existing header to closed
          const { error: updateError } = await supabase
            .from("estoque_diario")
            .update({
              status: "fechado",
              updated_by: userId,
              updated_by_name: userName,
            })
            .eq("id", diarioId);

          if (updateError) {
            console.error("Erro ao atualizar fechamento:", updateError);
            toast.error("Erro ao atualizar fechamento.");
            setSaving(false);
            return false;
          }
        }

        // Delete old items and re-insert
        await supabase
          .from("estoque_diario_itens")
          .delete()
          .eq("estoque_diario_id", diarioId);

        const rows = validItens.map((i) => ({
          estoque_diario_id: diarioId!,
          produto_codigo: i.produto_codigo,
          produto_descricao: i.produto_descricao,
          estoque_sistema: i.estoque_sistema,
          estoque_loja: i.estoque_loja,
          trincado: i.trincado,
          quebrado: i.quebrado,
          observacao: i.observacao,
        }));

        const { error: itemsError } = await supabase
          .from("estoque_diario_itens")
          .insert(rows);

        if (itemsError) {
          console.error("Erro ao salvar itens:", itemsError);
          toast.error("Erro ao salvar itens do fechamento.");
          setSaving(false);
          return false;
        }

        // Also persist to estoque_registros for dashboard compatibility
        const { data: pdvData } = await supabase
          .from("pontos_de_venda")
          .select("nome")
          .eq("id", pdvId)
          .single();

        const storeName = pdvData?.nome || "";

        const registroRows = validItens.map((i) => ({
          data: dateStr,
          loja: storeName,
          codigo: i.produto_codigo,
          descricao: i.produto_descricao,
          estoque_sistema: i.estoque_sistema,
          estoque_loja: i.estoque_loja,
          trincado: i.trincado,
          quebrado: i.quebrado,
          obs: i.observacao || "",
          usuario: userName,
        }));

        await supabase
          .from("estoque_registros")
          .upsert(registroRows, { onConflict: "data,loja,codigo" });

        // Audit log
        await supabase.from("audit_logs").insert({
          action: diario ? "update" : "create",
          module: "Estoque",
          usuario: userName,
          item_description: `Fechamento diário ${storeName} em ${format(date, "dd/MM/yyyy")} — ${validItens.length} itens`,
          after_data: { diario_id: diarioId, itens_count: validItens.length, status: "fechado" },
        });

        toast.success("Fechamento salvo com sucesso!", {
          description: `${storeName} — ${format(date, "dd/MM/yyyy")} — ${validItens.length} mercadorias`,
        });

        await fetchDiario();
        setSaving(false);
        return true;
      } catch (err) {
        console.error(err);
        toast.error("Erro inesperado ao salvar.");
        setSaving(false);
        return false;
      }
    },
    [pdvId, dateStr, diario, isClosed, itens, date, fetchDiario]
  );

  // Admin: update items on a closed record
  const adminUpdate = useCallback(
    async (updatedItens: EstoqueDiarioItem[], userName: string, userId: string) => {
      if (!diario) return false;
      setSaving(true);

      const validItens = updatedItens.filter(
        (i) => i.estoque_sistema > 0 || i.estoque_loja > 0 || i.trincado > 0 || i.quebrado > 0
      );

      // Update header
      await supabase
        .from("estoque_diario")
        .update({ updated_by: userId, updated_by_name: userName })
        .eq("id", diario.id);

      // Delete and re-insert items
      await supabase
        .from("estoque_diario_itens")
        .delete()
        .eq("estoque_diario_id", diario.id);

      const rows = validItens.map((i) => ({
        estoque_diario_id: diario.id,
        produto_codigo: i.produto_codigo,
        produto_descricao: i.produto_descricao,
        estoque_sistema: i.estoque_sistema,
        estoque_loja: i.estoque_loja,
        trincado: i.trincado,
        quebrado: i.quebrado,
        observacao: i.observacao,
      }));

      const { error } = await supabase.from("estoque_diario_itens").insert(rows);

      if (error) {
        toast.error("Erro ao atualizar itens.");
        setSaving(false);
        return false;
      }

      // Also update estoque_registros
      const { data: pdvData } = await supabase
        .from("pontos_de_venda")
        .select("nome")
        .eq("id", diario.pdv_id)
        .single();

      const storeName = pdvData?.nome || "";

      const registroRows = validItens.map((i) => ({
        data: dateStr,
        loja: storeName,
        codigo: i.produto_codigo,
        descricao: i.produto_descricao,
        estoque_sistema: i.estoque_sistema,
        estoque_loja: i.estoque_loja,
        trincado: i.trincado,
        quebrado: i.quebrado,
        obs: i.observacao || "",
        usuario: userName,
      }));

      await supabase
        .from("estoque_registros")
        .upsert(registroRows, { onConflict: "data,loja,codigo" });

      await supabase.from("audit_logs").insert({
        action: "update",
        module: "Estoque",
        usuario: userName,
        item_description: `Edição admin do fechamento ${storeName} em ${format(date, "dd/MM/yyyy")}`,
        after_data: { diario_id: diario.id, itens_count: validItens.length },
      });

      toast.success("Fechamento atualizado pelo administrador.");
      await fetchDiario();
      setSaving(false);
      return true;
    },
    [diario, dateStr, date, fetchDiario]
  );

  const adminDelete = useCallback(
    async (userName: string) => {
      if (!diario) return false;

      const { error } = await supabase
        .from("estoque_diario")
        .delete()
        .eq("id", diario.id);

      if (error) {
        toast.error("Erro ao excluir fechamento.");
        return false;
      }

      // Also delete from estoque_registros
      const { data: pdvData } = await supabase
        .from("pontos_de_venda")
        .select("nome")
        .eq("id", diario.pdv_id)
        .single();

      await supabase
        .from("estoque_registros")
        .delete()
        .eq("data", dateStr)
        .eq("loja", pdvData?.nome || "");

      await supabase.from("audit_logs").insert({
        action: "delete",
        module: "Estoque",
        usuario: userName,
        item_description: `Exclusão do fechamento ${pdvData?.nome} em ${format(date, "dd/MM/yyyy")}`,
      });

      toast.success("Fechamento excluído.");
      await fetchDiario();
      return true;
    },
    [diario, dateStr, date, fetchDiario]
  );

  return {
    diario,
    itens,
    setItens,
    loading,
    saving,
    isClosed,
    saveAndClose,
    adminUpdate,
    adminDelete,
    refetch: fetchDiario,
  };
}
