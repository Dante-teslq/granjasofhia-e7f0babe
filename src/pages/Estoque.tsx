import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Save, CheckCircle, Store, Camera, CalendarIcon, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StockTable from "@/components/StockTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import { useInventory } from "@/contexts/InventoryContext";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { useFraud } from "@/contexts/FraudContext";
import { STORES } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

const EstoquePage = () => {
  const { stockItems, setStockItems, saveStock, lastStockSave, currentStore, setCurrentStore, loadStockForDate, allSavedStock } = useInventory();
  const { currentRole, dateRange, setDateRange, settings, profile, isOperator, userPdvName } = useApp();
  const { addLog } = useAudit();
  const { fraudSettings, addAlert, updateRiskProfile } = useFraud();
  const prevStockRef = useRef<string | null>(null);

  const [evidenceDialog, setEvidenceDialog] = useState(false);
  const [evidenceJustification, setEvidenceJustification] = useState("");
  const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);

  const isAdmin = currentRole === "Administrador";
  const selectedDate = dateRange.from;

  // If operator, lock to their PDV
  useEffect(() => {
    if (isOperator && userPdvName && currentStore !== userPdvName) {
      setCurrentStore(userPdvName as any);
    }
  }, [isOperator, userPdvName, currentStore, setCurrentStore]);

  const setSelectedDate = (date: Date) => {
    setDateRange({ from: date, to: date });
  };

  useEffect(() => {
    loadStockForDate(selectedDate);
  }, [selectedDate, currentStore, loadStockForDate]);

  useEffect(() => {
    const key = `${format(selectedDate, "yyyy-MM-dd")}|${currentStore}`;
    const existing = allSavedStock[key];
    prevStockRef.current = existing ? JSON.stringify(existing) : null;
  }, [selectedDate, currentStore, allSavedStock]);

  const detectHighAdjustments = () => {
    const prevItems = prevStockRef.current ? JSON.parse(prevStockRef.current) : [];
    const highAdjustments: string[] = [];
    for (const item of stockItems) {
      if (!item.descricao) continue;
      const prevItem = prevItems.find((p: any) => p.codigo === item.codigo);
      if (prevItem && prevItem.estoqueSistema > 0) {
        const diff = Math.abs(item.estoqueSistema - prevItem.estoqueSistema);
        const pct = (diff / prevItem.estoqueSistema) * 100;
        if (pct > fraudSettings.adjustmentThresholdPercent) {
          highAdjustments.push(item.descricao);
        }
      }
    }
    return highAdjustments;
  };

  const executeSave = () => {
    // Validate all fields are filled
    for (const item of stockItems) {
      if (!item.descricao) {
        toast.error("Selecione o produto em todas as linhas antes de salvar.");
        return;
      }
      if (item.estoqueSistema === 0 && item.estoqueLoja === 0) {
        toast.error(`"${item.descricao}": Preencha o Estoque Sistema e o Estoque Loja.`);
        return;
      }
      if (!item.estoqueSistema && item.estoqueSistema !== 0) {
        toast.error(`"${item.descricao}": Preencha o campo Estoque Sistema.`);
        return;
      }
      if (!item.estoqueLoja && item.estoqueLoja !== 0) {
        toast.error(`"${item.descricao}": Preencha o campo Estoque Loja.`);
        return;
      }
      if (!item.obs.trim()) {
        toast.error(`"${item.descricao}": Preencha o campo de observação.`);
        return;
      }
      if ((currentRole === "Operador de Venda" || currentRole === "Operador de Depósito") && (item.trincado > 0 || item.quebrado > 0) && !item.obs.trim()) {
        toast.error(`"${item.descricao}": Operadores devem preencher a observação ao registrar perdas.`);
        return;
      }
    }

    if (stockItems.length === 0) {
      toast.error("Adicione pelo menos uma linha antes de salvar.");
      return;
    }

    const isNew = !prevStockRef.current;
    const prevItems = prevStockRef.current ? JSON.parse(prevStockRef.current) : [];

    const currentHour = new Date().getHours();
    const isAfterHours = currentHour < settings.operationStartHour || currentHour > settings.operationEndHour;

    if (isAfterHours) {
      addAlert({
        type: "fora_horario",
        severity: "média",
        status: "ativo",
        message: `Movimentação registrada às ${format(new Date(), "HH:mm")} — fora do horário padrão (${settings.operationStartHour}h-${settings.operationEndHour}h)`,
        operator: currentRole,
        link: "/auditoria",
      });
      updateRiskProfile(currentRole, { afterHoursOps: 1 });
    }

    for (const item of stockItems) {
      if (!item.descricao) continue;
      const prevItem = prevItems.find((p: any) => p.codigo === item.codigo);
      if (prevItem && prevItem.estoqueSistema > 0) {
        const diff = Math.abs(item.estoqueSistema - prevItem.estoqueSistema);
        const pct = (diff / prevItem.estoqueSistema) * 100;
        if (pct > fraudSettings.adjustmentThresholdPercent) {
          addAlert({
            type: "ajuste_elevado",
            severity: "crítica",
            status: "ativo",
            message: `Ajuste de ${pct.toFixed(1)}% no estoque de "${item.descricao}" (${prevItem.estoqueSistema} → ${item.estoqueSistema})`,
            operator: currentRole,
            link: "/estoque",
          });
          updateRiskProfile(currentRole, { highAdjustments: 1 });
        }
      }
    }

    updateRiskProfile(currentRole, { totalAdjustments: 1 });

    saveStock(selectedDate);

    for (const item of stockItems) {
      if (!item.descricao) continue;
      const action = isNew ? "create" : "update";
      const prevItem = prevItems.find((p: any) => p.codigo === item.codigo);
      addLog({
        action,
        module: "Estoque",
        usuario: profile?.nome || currentRole,
        item_description: `${item.descricao} (${currentStore})`,
        before_data: prevItem ? { estoqueSistema: prevItem.estoqueSistema, estoqueLoja: prevItem.estoqueLoja, quebrado: prevItem.quebrado, trincado: prevItem.trincado } : null,
        after_data: { estoqueSistema: item.estoqueSistema, estoqueLoja: item.estoqueLoja, quebrado: item.quebrado, trincado: item.trincado },
      });
    }

    toast.success("Estoque salvo com sucesso!", {
      description: `Loja: ${currentStore} — Data: ${format(selectedDate, "dd/MM/yyyy")}`,
    });
  };

  const handleSave = () => {
    if (prevStockRef.current) {
      const highAdj = detectHighAdjustments();
      if (highAdj.length > 0) {
        setEvidenceDialog(true);
        setEvidenceJustification("");
        setEvidencePhoto(null);
        return;
      }
    }
    executeSave();
  };

  const handleDeleteRecords = async () => {
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { error } = await supabase
      .from("estoque_registros")
      .delete()
      .eq("data", dateStr)
      .eq("loja", currentStore);

    if (error) {
      toast.error("Erro ao excluir registros.");
      return;
    }

    addLog({
      action: "delete",
      module: "Estoque",
      usuario: profile?.nome || currentRole,
      item_description: `Registros de ${currentStore} em ${format(selectedDate, "dd/MM/yyyy")} excluídos`,
    });

    // Clear local state
    loadStockForDate(selectedDate);
    toast.success("Registros excluídos com sucesso!", {
      description: `${currentStore} — ${format(selectedDate, "dd/MM/yyyy")}`,
    });
  };

  const confirmEvidenceSave = () => {
    if (!evidenceJustification.trim()) {
      toast.error("Justificativa obrigatória para ajustes elevados.");
      return;
    }
    if (!evidencePhoto) {
      toast.error("Foto obrigatória para ajustes elevados.");
      return;
    }
    setEvidenceDialog(false);
    executeSave();
    toast.info("Evidência registrada junto ao ajuste.");
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        <div className="flex flex-col gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Conferência de Estoque</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Controle diário por PDV — Estoque Sistema × Estoque Loja</p>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap">
            {/* Date Picker */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-[200px] justify-start text-left font-normal h-10 md:h-9")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  locale={ptBR}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {/* Store Selector */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Store className="w-4 h-4 text-primary shrink-0" />
              {isOperator && userPdvName ? (
                <div className="flex-1 sm:w-[180px] h-10 md:h-9 text-sm flex items-center px-3 rounded-md border border-input bg-muted/50 text-muted-foreground">
                  {userPdvName}
                </div>
              ) : (
                <Select value={currentStore} onValueChange={(v) => setCurrentStore(v as any)}>
                  <SelectTrigger className="flex-1 sm:w-[180px] h-10 md:h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Admin Delete */}
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="gap-1.5 h-10 md:h-9">
                    <Trash2 className="w-4 h-4" />
                    Excluir Registros
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Excluir todos os registros de estoque de <strong>{currentStore}</strong> em <strong>{format(selectedDate, "dd/MM/yyyy")}</strong>? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteRecords} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <StockTable items={stockItems} onChange={setStockItems} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            {lastStockSave && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" />
                Último salvamento: {format(lastStockSave, "dd/MM/yyyy HH:mm")}
              </p>
            )}
          </div>
          <Button onClick={handleSave} className="gap-2 w-full sm:w-auto h-12 md:h-10">
            <Save className="w-4 h-4" />
            Salvar Registro
          </Button>
        </div>
      </div>

      <Dialog open={evidenceDialog} onOpenChange={(o) => !o && setEvidenceDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-destructive" />
              Evidência Obrigatória
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Ajuste acima de {fraudSettings.adjustmentThresholdPercent}% detectado. Foto e justificativa são obrigatórias para prosseguir.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Justificativa *</label>
              <Textarea
                value={evidenceJustification}
                onChange={(e) => setEvidenceJustification(e.target.value)}
                placeholder="Explique o motivo do ajuste elevado..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Foto/Evidência *</label>
              <Input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => setEvidencePhoto(e.target.files?.[0] || null)}
              />
              {evidencePhoto && (
                <p className="text-xs text-success flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> {evidencePhoto.name}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvidenceDialog(false)}>Cancelar</Button>
            <Button onClick={confirmEvidenceSave}>Salvar com Evidência</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EstoquePage;
