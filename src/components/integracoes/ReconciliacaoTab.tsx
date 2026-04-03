import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, EyeOff, RefreshCw } from "lucide-react";

interface ReconciliacaoRow {
  id: string;
  data: string;
  produto_codigo: string;
  produto_descricao: string;
  saldo_interno: number;
  saldo_omie: number;
  divergencia: number;
  status: string;
  revisado_por: string | null;
  revisado_em: string | null;
}

const statusBadge: Record<string, string> = {
  pendente: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30",
  revisado: "bg-green-500/10 text-green-700 border-green-500/30",
  ignorado: "bg-muted text-muted-foreground border-muted",
};

export default function ReconciliacaoTab() {
  const [rows, setRows] = useState<ReconciliacaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("omie_reconciliacao")
      .select("*")
      .order("data", { ascending: false })
      .order("divergencia", { ascending: true })
      .limit(200);
    if (!error) setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("omie_reconciliacao")
      .update({ status, revisado_em: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Marcado como ${status}` });
      setRows((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Reconciliação Omie</CardTitle>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Atualizar
        </Button>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum registro de reconciliação</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Saldo Interno</TableHead>
                  <TableHead className="text-right">Saldo Omie</TableHead>
                  <TableHead className="text-right">Divergência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{new Date(r.data).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-xs">
                      <div>{r.produto_descricao}</div>
                      <span className="text-muted-foreground">{r.produto_codigo}</span>
                    </TableCell>
                    <TableCell className="text-right text-xs">{r.saldo_interno}</TableCell>
                    <TableCell className="text-right text-xs">{r.saldo_omie}</TableCell>
                    <TableCell className={`text-right text-xs font-bold ${r.divergencia !== 0 ? "text-destructive" : "text-green-600"}`}>
                      {r.divergencia}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadge[r.status] || ""}>{r.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "pendente" && (
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(r.id, "revisado")} title="Marcar como revisado">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(r.id, "ignorado")} title="Ignorar">
                            <EyeOff className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
