import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SyncResultado {
  total_sincronizados: number;
  por_pdv: Record<string, number>;
}

export function useOmieSyncAjustes() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<SyncResultado | null>(null);
  const { toast } = useToast();

  const sincronizar = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("omie-sync-ajustes");
      if (error) throw error;
      setResultado(data);
      toast({
        title: "Sincronização concluída",
        description: `${data?.total_sincronizados ?? 0} registros sincronizados.`,
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

  return { sincronizar, loading, resultado };
}
