import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

interface DivergenciaRow {
  id: string;
  produto_descricao: string;
  produto_codigo: string;
  divergencia: number;
  saldo_interno: number;
  saldo_omie: number;
  pdv_nome: string;
}

export default function DivergenciasOmie() {
  const [rows, setRows] = useState<DivergenciaRow[]>([]);
  const { toast } = useToast();

  const fetchData = async () => {
    // Fetch pending reconciliation records with their omie_conta pdv_nome
    const { data: reconcData } = await supabase
      .from("omie_reconciliacao")
      .select("id, produto_descricao, produto_codigo, divergencia, saldo_interno, saldo_omie, omie_conta_id")
      .eq("status", "pendente")
      .order("divergencia", { ascending: true })
      .limit(50);

    if (!reconcData || reconcData.length === 0) {
      setRows([]);
      return;
    }

    // Fetch omie_contas for pdv_nome
    const contaIds = [...new Set((reconcData as any[]).map((r) => r.omie_conta_id))];
    const { data: contasData } = await supabase
      .from("omie_contas")
      .select("id, pdv_nome")
      .in("id", contaIds);

    const contaMap: Record<string, string> = {};
    (contasData || []).forEach((c: any) => { contaMap[c.id] = c.pdv_nome; });

    const mapped = (reconcData as any[])
      .map((r) => ({
        id: r.id,
        produto_descricao: r.produto_descricao,
        produto_codigo: r.produto_codigo,
        divergencia: r.divergencia,
        saldo_interno: r.saldo_interno,
        saldo_omie: r.saldo_omie,
        pdv_nome: contaMap[r.omie_conta_id] || "—",
      }))
      .sort((a, b) => Math.abs(b.divergencia) - Math.abs(a.divergencia));

    setRows(mapped);
  };

  useEffect(() => { fetchData(); }, []);

  const marcarRevisado = async (id: string) => {
    const { error } = await supabase
      .from("omie_reconciliacao")
      .update({ status: "revisado", revisado_em: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast({ title: "Marcado como revisado" });
    }
  };

  if (rows.length === 0) return null;

  return (
    <div className="glass-card p-4 md:p-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-orange-600" />
        <h3 className="text-sm font-semibold text-foreground">Divergências Omie</h3>
        <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/30 text-[10px]">
          {rows.length}
        </Badge>
      </div>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground truncate">{r.produto_descricao}</span>
                <Badge variant="outline" className="text-[9px] shrink-0">{r.pdv_nome}</Badge>
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                <span>Interno: <strong className="text-foreground">{r.saldo_interno}</strong></span>
                <span>Omie: <strong className="text-foreground">{r.saldo_omie}</strong></span>
                <span className={`font-bold ${r.divergencia !== 0 ? "text-destructive" : "text-green-600"}`}>
                  Div: {r.divergencia > 0 ? "+" : ""}{r.divergencia}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => marcarRevisado(r.id)} title="Marcar como revisado" className="shrink-0">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
