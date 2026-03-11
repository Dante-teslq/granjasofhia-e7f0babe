import { useState } from "react";
import { Save, Trash2, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DashboardLayout from "@/components/DashboardLayout";
import SangriasTable from "@/components/SangriasTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { useSangriasDB } from "@/hooks/useSangriasDB";
import { SangriaItem, STORES } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const emptyRow = (): SangriaItem => ({
  id: crypto.randomUUID(),
  sangria: "",
  cartelasVazias: "",
  barbantes: "",
  notacoes: "",
  pontoVenda: "",
});

const SangriasPage = () => {
  const { currentRole, profile } = useApp();
  const { addLog } = useAudit();
  const {
    records,
    loading,
    selectedDate,
    setSelectedDate,
    selectedPDV,
    setSelectedPDV,
    saveItems,
    deleteByDate,
  } = useSangriasDB();

  const [editItems, setEditItems] = useState<SangriaItem[]>([emptyRow()]);
  const [editPDV, setEditPDV] = useState<string>(STORES[0]);

  const isAdmin = currentRole === "Administrador";

  const handleSave = async () => {
    if (!editPDV) {
      toast.error("Selecione um ponto de venda.");
      return;
    }
    await saveItems(editItems, editPDV, profile?.nome || currentRole);

    for (const item of editItems) {
      if (!item.cartelasVazias && !item.barbantes) continue;
      addLog({
        action: "create",
        module: "Insumos",
        usuario: profile?.nome || currentRole,
        item_description: `${editPDV} - insumos`,
        after_data: { cartelasVazias: item.cartelasVazias, barbantes: item.barbantes, notacoes: item.notacoes },
      });
    }

    toast.success("Insumos salvos com sucesso!", {
      description: `${editPDV} — ${format(selectedDate, "dd/MM/yyyy")}`,
    });
    setEditItems([emptyRow()]);
  };

  const handleDelete = async () => {
    await deleteByDate(format(selectedDate, "yyyy-MM-dd"), selectedPDV);
    addLog({
      action: "delete",
      module: "Insumos",
      usuario: profile?.nome || currentRole,
      item_description: `Insumos ${format(selectedDate, "dd/MM/yyyy")} ${selectedPDV !== "all" ? selectedPDV : "todos PDVs"}`,
    });
    toast.success("Registros excluídos com sucesso!");
  };

  // Group records by PDV
  const groupedByPDV = records.reduce<Record<string, SangriaItem[]>>((acc, item) => {
    const pdv = item.pontoVenda || "Sem PDV";
    if (!acc[pdv]) acc[pdv] = [];
    acc[pdv].push(item);
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        {/* Header */}
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Insumos</h1>
          <p className="text-muted-foreground text-xs md:text-sm mt-1">Controle diário de cartelas e barbantes por ponto de venda</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-full sm:w-[200px] justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(selectedDate, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => d && setSelectedDate(d)} locale={ptBR} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Select value={selectedPDV} onValueChange={setSelectedPDV}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Ponto de Venda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os PDVs</SelectItem>
              {STORES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {isAdmin && records.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-1.5">
                  <Trash2 className="w-4 h-4" />
                  Excluir Registros
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                   <AlertDialogDescription>
                    Excluir todos os registros de insumos de {format(selectedDate, "dd/MM/yyyy")}
                    {selectedPDV !== "all" ? ` — ${selectedPDV}` : " — todos os PDVs"}? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {/* Saved records grouped by PDV */}
        {loading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : records.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedByPDV).map(([pdv, items]) => (
              <div key={pdv} className="space-y-2">
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{pdv}</h3>
                <SangriasTable items={items} onChange={() => {}} readOnly />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nenhum registro para esta data.</p>
        )}

        {/* New entry form */}
        <div className="border-t border-border pt-4 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Novo Registro</h2>
          <Select value={editPDV} onValueChange={setEditPDV}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Selecione o PDV" />
            </SelectTrigger>
            <SelectContent>
              {STORES.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <SangriasTable items={editItems} onChange={setEditItems} />
          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2 w-full sm:w-auto h-12 md:h-10">
              <Save className="w-4 h-4" />
              Salvar Registro
            </Button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SangriasPage;
