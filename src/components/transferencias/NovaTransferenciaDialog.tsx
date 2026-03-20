import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PRODUCT_CATALOG } from "@/types/inventory";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import type { PdvOption } from "@/hooks/useTransferencias";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdvList: PdvOption[];
  isOperator: boolean;
  userPdvId: string | null;
  userName: string;
  onSuccess: () => void;
}

const NovaTransferenciaDialog = ({ open, onOpenChange, pdvList, isOperator, userPdvId, userName, onSuccess }: Props) => {
  const [dataTransf, setDataTransf] = useState<Date>(new Date());
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");
  const [produtoCodigo, setProdutoCodigo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOperator && userPdvId) {
      setOrigemId(userPdvId);
    }
  }, [isOperator, userPdvId]);

  const resetForm = () => {
    setDataTransf(new Date());
    if (!isOperator) setOrigemId("");
    setDestinoId("");
    setProdutoCodigo("");
    setQuantidade("");
    setObservacao("");
  };

  const selectedProduct = PRODUCT_CATALOG.find((p) => p.codigo === produtoCodigo);

  const handleSave = async () => {
    if (!origemId || !destinoId || !produtoCodigo || !quantidade) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (origemId === destinoId) {
      toast.error("Origem e destino devem ser diferentes");
      return;
    }
    const qty = Number(quantidade);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantidade deve ser maior que zero");
      return;
    }

    setSaving(true);

    // Validate stock at origin
    const { data: hasStock } = await supabase.rpc("validate_transfer_stock", {
      _pdv_id: origemId,
      _produto_codigo: produtoCodigo,
      _quantidade: qty,
    });

    if (hasStock === false) {
      toast.error("Estoque insuficiente no local de origem para esta quantidade");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("movimentacoes_estoque").insert({
      tipo: "transferencia",
      status: "pendente",
      pdv_origem_id: origemId,
      pdv_destino_id: destinoId,
      produto_codigo: produtoCodigo,
      produto_descricao: selectedProduct?.descricao || "",
      quantidade: qty,
      observacao: observacao || null,
      usuario: userName,
    });

    setSaving(false);

    if (error) {
      toast.error("Erro ao registrar transferência");
      return;
    }

    toast.success("Transferência registrada como pendente");
    onOpenChange(false);
    resetForm();
    onSuccess();
  };

  // Group PDVs by type for better UX
  const granjas = pdvList.filter((p) => p.tipo === "granja");
  const depositos = pdvList.filter((p) => p.tipo === "deposito");
  const lojas = pdvList.filter((p) => p.tipo === "loja");
  const rotas = pdvList.filter((p) => p.tipo === "rota");

  const renderPdvOptions = (excludeId?: string) => {
    const groups = [
      { label: "Granja", items: granjas },
      { label: "Depósitos", items: depositos },
      { label: "Pontos de Venda", items: lojas },
      { label: "Rotas", items: rotas },
    ];

    return groups.flatMap((group) => {
      const filtered = group.items.filter((p) => p.id !== excludeId);
      if (filtered.length === 0) return [];
      return [
        <SelectItem key={`group-${group.label}`} value={`__group_${group.label}`} disabled className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          {group.label}
        </SelectItem>,
        ...filtered.map((p) => (
          <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
        )),
      ];
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Transferência</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Date */}
          <div>
            <label className="text-sm font-medium text-foreground">Data *</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataTransf && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dataTransf ? format(dataTransf, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dataTransf} onSelect={(d) => d && setDataTransf(d)} locale={ptBR} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {/* Origin */}
          <div>
            <label className="text-sm font-medium text-foreground">Origem *</label>
            <Select value={origemId} onValueChange={setOrigemId} disabled={isOperator}>
              <SelectTrigger><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
              <SelectContent>
                {renderPdvOptions()}
              </SelectContent>
            </Select>
          </div>

          {/* Destination */}
          <div>
            <label className="text-sm font-medium text-foreground">Destino *</label>
            <Select value={destinoId} onValueChange={setDestinoId}>
              <SelectTrigger><SelectValue placeholder="Selecione o destino" /></SelectTrigger>
              <SelectContent>
                {renderPdvOptions(origemId)}
              </SelectContent>
            </Select>
          </div>

          {/* Product */}
          <div>
            <label className="text-sm font-medium text-foreground">Produto *</label>
            <Select value={produtoCodigo} onValueChange={setProdutoCodigo}>
              <SelectTrigger><SelectValue placeholder="Selecione o produto" /></SelectTrigger>
              <SelectContent>
                {PRODUCT_CATALOG.map((p) => (
                  <SelectItem key={p.codigo} value={p.codigo}>{p.descricao}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div>
            <label className="text-sm font-medium text-foreground">Quantidade (cartelas) *</label>
            <Input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Ex: 10" />
          </div>

          {/* Responsible */}
          <div>
            <label className="text-sm font-medium text-foreground">Responsável</label>
            <Input value={userName} disabled className="bg-muted/50" />
          </div>

          {/* Observation */}
          <div>
            <label className="text-sm font-medium text-foreground">Observação</label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Observações opcionais..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : "Registrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NovaTransferenciaDialog;
