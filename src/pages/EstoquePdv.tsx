import { useState } from "react";
import { Warehouse, Plus, Package, Search } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { usePontosDeVenda } from "@/hooks/usePontosDeVenda";
import { useEstoquePdv } from "@/hooks/useEstoquePdv";
import { useApp } from "@/contexts/AppContext";
import { PRODUCT_CATALOG } from "@/types/inventory";

const EstoquePdvPage = () => {
  const { profile } = useApp();
  const { pdvs, loading: loadingPdvs } = usePontosDeVenda();
  const [selectedPdvId, setSelectedPdvId] = useState<string>("");
  const { items, loading: loadingEstoque, upsertEstoque, registrarMovimentacao } = useEstoquePdv(selectedPdvId || undefined);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [formProduto, setFormProduto] = useState("");
  const [formCodigo, setFormCodigo] = useState("");
  const [formQtd, setFormQtd] = useState("");
  const [formTipo, setFormTipo] = useState<"entrada" | "ajuste">("entrada");
  const [formObs, setFormObs] = useState("");

  const filtered = items.filter(i =>
    i.produto_descricao.toLowerCase().includes(search.toLowerCase()) ||
    i.produto_codigo.includes(search)
  );

  const handleSelectProduct = (desc: string) => {
    setFormProduto(desc);
    const cat = PRODUCT_CATALOG.find(p => p.descricao === desc);
    if (cat) setFormCodigo(cat.codigo);
  };

  const handleAdd = async () => {
    if (!selectedPdvId || !formProduto || !formQtd) {
      toast.error("Selecione PDV, produto e quantidade.");
      return;
    }
    try {
      const currentItem = items.find(i => i.produto_codigo === formCodigo);
      const currentQtd = currentItem?.quantidade || 0;
      const newQtd = formTipo === "entrada" ? currentQtd + Number(formQtd) : Number(formQtd);

      await upsertEstoque(selectedPdvId, formCodigo, formProduto, newQtd);
      await registrarMovimentacao({
        produto_codigo: formCodigo,
        produto_descricao: formProduto,
        quantidade: Number(formQtd),
        tipo: formTipo,
        pdv_destino_id: selectedPdvId,
        usuario: profile?.nome || profile?.email || "Sistema",
        observacao: formObs,
      });
      toast.success(formTipo === "entrada" ? "Entrada registrada!" : "Ajuste realizado!");
      setShowAdd(false);
      setFormProduto(""); setFormCodigo(""); setFormQtd(""); setFormObs("");
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    }
  };

  const loading = loadingPdvs || loadingEstoque;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-10 space-y-6 max-w-[1400px] animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-foreground">Estoque por PDV</h1>
            <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider mt-1">Controle de estoque individual por ponto de venda</p>
          </div>
          {selectedPdvId && (
            <Button onClick={() => setShowAdd(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Entrada / Ajuste
            </Button>
          )}
        </div>

        {/* PDV Selector */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedPdvId} onValueChange={setSelectedPdvId}>
            <SelectTrigger className="w-full sm:w-[280px] h-10">
              <SelectValue placeholder="Selecione o ponto de venda" />
            </SelectTrigger>
            <SelectContent>
              {pdvs.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    {p.nome}
                    <Badge variant="outline" className="text-[9px] ml-1">{p.tipo}</Badge>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPdvId && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar produto..." className="pl-10 h-10" />
            </div>
          )}
        </div>

        {!selectedPdvId ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Warehouse className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Selecione um ponto de venda para visualizar o estoque</p>
          </div>
        ) : loading ? (
          <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Package className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Nenhum produto no estoque deste PDV</p>
            <Button variant="outline" onClick={() => setShowAdd(true)} className="mt-4 gap-2">
              <Plus className="w-4 h-4" /> Adicionar Primeiro Produto
            </Button>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.produto_codigo}</TableCell>
                      <TableCell className="font-medium">{item.produto_descricao}</TableCell>
                      <TableCell className="text-right font-bold">{item.quantidade}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.quantidade <= 0 ? "destructive" : item.quantidade < item.quantidade_minima ? "secondary" : "default"}>
                          {item.quantidade <= 0 ? "Sem estoque" : item.quantidade < item.quantidade_minima ? "Baixo" : "OK"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Add/Adjust Dialog */}
        <Dialog open={showAdd} onOpenChange={setShowAdd}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" /> Entrada / Ajuste de Estoque
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Tipo *</label>
                <Select value={formTipo} onValueChange={v => setFormTipo(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada (soma ao estoque)</SelectItem>
                    <SelectItem value="ajuste">Ajuste (define novo valor)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Produto *</label>
                <Select value={formProduto} onValueChange={handleSelectProduct}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_CATALOG.map(p => (
                      <SelectItem key={p.codigo} value={p.descricao}>{p.descricao}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Quantidade *</label>
                <Input type="number" min="0" value={formQtd} onChange={e => setFormQtd(e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Observação</label>
                <Input value={formObs} onChange={e => setFormObs(e.target.value)} placeholder="Opcional..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAdd(false)}>Cancelar</Button>
              <Button onClick={handleAdd} className="gap-2"><Plus className="w-4 h-4" /> Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default EstoquePdvPage;
