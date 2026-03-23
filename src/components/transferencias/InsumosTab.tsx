import { useState, useEffect } from "react";
import { Save, Trash2 } from "lucide-react";
import { format } from "date-fns";
import SangriasTable from "@/components/SangriasTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { useSangriasDB } from "@/hooks/useSangriasDB";
import { SangriaItem, STORES } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";
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
import DateRangePicker from "@/components/DateRangePicker";

const emptyRow = (): SangriaItem => ({
  id: crypto.randomUUID(),
  sangria: "",
  cartelasVazias: "",
  barbantes: "",
  notacoes: "",
  pontoVenda: "",
});

const InsumosTab = () => {
  const { currentRole, profile, isOperator, userPdvName } = useApp();
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
  const [editPDV, setEditPDV] = useState<string>(isOperator && userPdvName ? userPdvName : STORES[0]);

  const isAdmin = currentRole === "Administrador" || currentRole === "Admin";

  useEffect(() => {
    if (isOperator && userPdvName && selectedPDV !== userPdvName) {
      setSelectedPDV(userPdvName);
    }
  }, [isOperator, userPdvName, selectedPDV, setSelectedPDV]);

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

  const groupedByPDV = records.reduce<Record<string, SangriaItem[]>>((acc, item) => {
    const pdv = item.pontoVenda || "Sem PDV";
    if (!acc[pdv]) acc[pdv] = [];
    acc[pdv].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <DateRangePicker
          from={selectedDate}
          to={selectedDate}
          onChange={({ from }) => setSelectedDate(from)}
          align="start"
        />

        {isOperator && userPdvName ? (
          <div className="w-full sm:w-[200px] h-10 text-sm flex items-center px-3 rounded-md border border-input bg-muted/50 text-muted-foreground">
            {userPdvName}
          </div>
        ) : (
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
        )}

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

      {/* New entry form */}
      <div>
        <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-3 flex items-center gap-2">
          <Save className="w-4 h-4" /> Novo Registro
        </h3>
        <div className="glass-card p-4 space-y-3">
          {isOperator && userPdvName ? (
            <div className="w-full sm:w-[200px] h-10 text-sm flex items-center px-3 rounded-md border border-input bg-muted/50 text-muted-foreground">
              {userPdvName}
            </div>
          ) : (
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
          )}
          <SangriasTable items={editItems} onChange={setEditItems} />
          <div className="flex justify-end">
            <Button onClick={handleSave} className="gap-2 w-full sm:w-auto h-12 md:h-10">
              <Save className="w-4 h-4" />
              Salvar Registro
            </Button>
          </div>
        </div>
      </div>

      {/* Saved records history */}
      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : records.length > 0 ? (
        <div>
          <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider mb-3">Histórico de Registros ({records.length})</h3>
          <div className="space-y-4">
            {Object.entries(groupedByPDV).map(([pdv, items]) => (
              <div key={pdv}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{pdv}</p>
                <div className="glass-card overflow-hidden">
                  <SangriasTable items={items} onChange={() => {}} readOnly />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum registro para esta data.</p>
      )}
    </div>
  );
};

export default InsumosTab;
