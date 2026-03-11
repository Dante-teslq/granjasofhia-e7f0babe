import { useState } from "react";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { usePontosDeVenda } from "@/hooks/usePontosDeVenda";
import { useEstoquePdv } from "@/hooks/useEstoquePdv";
import { useMovimentacoes } from "@/hooks/useMovimentacoes";
import { useApp } from "@/contexts/AppContext";
import { PRODUCT_CATALOG } from "@/types/inventory";
import { format } from "date-fns";

const TransferenciasPage = () => {
  const { profile } = useApp();
  const { pdvs, pdvsById } = usePontosDeVenda();
  const { transferir } = useEstoquePdv();
  const { items: movimentacoes, loading: loadingMov } = useMovimentacoes(30);

  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [produto, setProduto] = useState("");
  const [codigo, setCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [obs, setObs] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSelectProduct = (desc: string) => {
    setProduto(desc);
    const cat = PRODUCT_CATALOG.find(p => p.descricao === desc);
    if (cat) setCodigo(cat.codigo);
  };

  const handleTransfer = async () => {
    if (!origemId || !destinoId || !produto || !quantidade) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (origemId === destinoId) {
      toast.error("Origem e destino devem ser diferentes.");
      return;
    }
    setSubmitting(true);
    try {
      await transferir({
        produto_codigo: codigo,
        produto_descricao: produto,
        quantidade: Number(quantidade),
        pdv_origem_id: origemId,
        pdv_destino_id: destinoId,
        usuario: profile?.nome || profile?.email || "Sistema",
        observacao: obs,
      });
      toast.success("Transferência realizada com sucesso!");
      setProduto(""); setCodigo(""); setQuantidade(""); setObs("");
    } catch (e: any) {
      toast.error(e.message);
    }
    setSubmitting(false);
  };

  const transferencias = movimentacoes.filter(m => m.tipo === "transferencia");

  const tipoLabel: Record<string, string> = {
    entrada: "Entrada",
    saida: "Saída",
    transferencia: "Transferência",
    ajuste: "Ajuste",
    venda: "Venda",
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 max-w-[1400px] animate-fade-in-up">
        <div>
          <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Transferências de Estoque</h1>
          <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Mova produtos entre pontos de venda</p>
        </div>

        {/* Transfer Form */}
        <div className="glass-card p-6 space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Nova Transferência</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Origem *</label>
              <Select value={origemId} onValueChange={setOrigemId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="PDV de origem" /></SelectTrigger>
                <SelectContent>
                  {pdvs.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end justify-center pb-2">
              <ArrowRight className="w-6 h-6 text-primary" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Destino *</label>
              <Select value={destinoId} onValueChange={setDestinoId}>
                <SelectTrigger className="h-10"><SelectValue placeholder="PDV de destino" /></SelectTrigger>
                <SelectContent>
                  {pdvs.filter(p => p.id !== origemId).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Produto *</label>
              <Select value={produto} onValueChange={handleSelectProduct}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATALOG.map(p => <SelectItem key={p.codigo} value={p.descricao}>{p.descricao}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Quantidade *</label>
              <Input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" className="h-10" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Observação</label>
              <Input value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." className="h-10" />
            </div>
          </div>
          <Button onClick={handleTransfer} disabled={submitting} className="gap-2">
            <ArrowLeftRight className="w-4 h-4" /> {submitting ? "Transferindo..." : "Confirmar Transferência"}
          </Button>
        </div>

        {/* History */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Histórico de Movimentações</h2>
          </div>
          {loadingMov ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
          ) : movimentacoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma movimentação registrada</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Obs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimentacoes.map(m => (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{format(new Date(m.created_at), "dd/MM/yy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={m.tipo === "transferencia" ? "default" : m.tipo === "entrada" ? "secondary" : "outline"} className="text-[10px]">
                          {tipoLabel[m.tipo] || m.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{m.produto_descricao}</TableCell>
                      <TableCell className="text-right font-bold">{m.quantidade}</TableCell>
                      <TableCell className="text-xs">{m.pdv_origem_id ? pdvsById[m.pdv_origem_id]?.nome || "—" : "—"}</TableCell>
                      <TableCell className="text-xs">{m.pdv_destino_id ? pdvsById[m.pdv_destino_id]?.nome || "—" : "—"}</TableCell>
                      <TableCell className="text-xs">{m.usuario || "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{m.observacao || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default TransferenciasPage;
