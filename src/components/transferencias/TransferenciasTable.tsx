import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TransferenciaRecord } from "@/hooks/useTransferencias";

interface Props {
  records: TransferenciaRecord[];
  loading: boolean;
  onDelete: (id: string) => void;
  isAdmin: boolean;
}

const statusBadge = (status: string) => {
  if (status === "confirmado") return <Badge className="bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Confirmado</Badge>;
  return <Badge variant="outline" className="text-warning border-warning/40">Pendente</Badge>;
};

const TransferenciasTable = ({ records, loading, onDelete, isAdmin }: Props) => {
  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Destino</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Obs</TableHead>
              {isAdmin && <TableHead className="w-10"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Nenhuma transferência encontrada no período</TableCell>
              </TableRow>
            ) : (
              records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{r.produto_descricao}</div>
                    <div className="text-xs text-muted-foreground">Cód: {r.produto_codigo}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">{r.quantidade}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.origem_nome}</TableCell>
                  <TableCell className="text-sm">{r.destino_nome}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.usuario || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{r.observacao || "—"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TransferenciasTable;
