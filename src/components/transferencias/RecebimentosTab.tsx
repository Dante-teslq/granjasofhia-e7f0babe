import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import type { TransferenciaRecord } from "@/hooks/useTransferencias";

interface Props {
  records: TransferenciaRecord[];
  loading: boolean;
  userId: string;
  onConfirmed: () => void;
}

const RecebimentosTab = ({ records, loading, userId, onConfirmed }: Props) => {
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [selected, setSelected] = useState<TransferenciaRecord | null>(null);
  const [qtdRecebida, setQtdRecebida] = useState("");
  const [obsRecebimento, setObsRecebimento] = useState("");
  const [confirming, setConfirming] = useState(false);

  const pendentes = records.filter((r) => r.status === "pendente");
  const confirmados = records.filter((r) => r.status === "confirmado");

  const openConfirm = (record: TransferenciaRecord) => {
    setSelected(record);
    setQtdRecebida(String(record.quantidade));
    setObsRecebimento("");
    setConfirmDialog(true);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    const qty = Number(qtdRecebida);
    if (isNaN(qty) || qty < 0) {
      toast.error("Informe a quantidade recebida");
      return;
    }

    setConfirming(true);
    const { error } = await supabase.rpc("confirm_transfer", {
      _transfer_id: selected.id,
      _quantidade_recebida: qty,
      _confirmado_por: userId,
      _observacao_recebimento: obsRecebimento || null,
      _foto_recebimento: null,
    });
    setConfirming(false);

    if (error) {
      toast.error(error.message || "Erro ao confirmar recebimento");
      return;
    }

    toast.success("Recebimento confirmado com sucesso!");
    setConfirmDialog(false);
    onConfirmed();
  };

  return (
    <div className="space-y-6">
      {/* Pending */}
      <div>
        <h3 className="text-sm font-bold text-warning uppercase tracking-wider mb-3 flex items-center gap-2">
          <PackageCheck className="w-4 h-4" /> Pendentes de Confirmação ({pendentes.length})
        </h3>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Envio</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Qtd Enviada</TableHead>
                  <TableHead>Enviado por</TableHead>
                  <TableHead className="w-32">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                  </TableRow>
                ) : pendentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum recebimento pendente</TableCell>
                  </TableRow>
                ) : (
                  pendentes.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{r.origem_nome}</TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{r.produto_descricao}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono">{r.quantidade}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.usuario || "—"}</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => openConfirm(r)} className="gap-1">
                          <PackageCheck className="w-3.5 h-3.5" /> Confirmar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Confirmed history */}
      {confirmados.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-3">Recebimentos Confirmados ({confirmados.length})</h3>
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Envio</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Enviada</TableHead>
                    <TableHead>Recebida</TableHead>
                    <TableHead>Divergência</TableHead>
                    <TableHead>Confirmado em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {confirmados.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-sm">{r.origem_nome}</TableCell>
                      <TableCell className="text-sm font-medium">{r.produto_descricao}</TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono">{r.quantidade}</Badge></TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono">{r.quantidade_recebida}</Badge></TableCell>
                      <TableCell>
                        {r.divergencia !== null && r.divergencia !== 0 ? (
                          <Badge variant="destructive" className="font-mono">{r.divergencia > 0 ? "+" : ""}{r.divergencia}</Badge>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {r.confirmado_em ? format(new Date(r.confirmado_em), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Recebimento</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <p><span className="font-medium">Produto:</span> {selected.produto_descricao}</p>
                <p><span className="font-medium">Origem:</span> {selected.origem_nome}</p>
                <p><span className="font-medium">Quantidade enviada:</span> {selected.quantidade}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Quantidade recebida *</label>
                <Input type="number" min="0" value={qtdRecebida} onChange={(e) => setQtdRecebida(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Observação do recebimento</label>
                <Textarea value={obsRecebimento} onChange={(e) => setObsRecebimento(e.target.value)} placeholder="Opcional..." rows={2} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(false)}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming ? "Confirmando..." : "Confirmar Recebimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecebimentosTab;
