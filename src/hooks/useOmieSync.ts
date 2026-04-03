import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useOmieSync() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const syncProdutos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("omie-sync");
      if (error) throw error;
      toast({
        title: "Sincronização concluída",
        description: `${data?.upserted ?? 0} produtos sincronizados de ${data?.total_omie ?? 0} encontrados.`,
      });
      return data;
    } catch (err: any) {
      toast({
        title: "Erro na sincronização",
        description: err.message,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { syncProdutos, loading };
}
