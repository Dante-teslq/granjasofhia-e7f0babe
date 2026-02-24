import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Save, CheckCircle, Store, Camera } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import StockTable from "@/components/StockTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/contexts/InventoryContext";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { useFraud } from "@/contexts/FraudContext";
import { STORES } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";

const EstoquePage = () => {
  const { stockItems, setStockItems, saveStock, lastStockSave, currentStore, setCurrentStore, loadStockForDate, allSavedStock } = useInventory();
  const { currentRole, dateRange, settings } = useApp();
  const { addLog } = useAudit();
  const { fraudSettings, addAlert, updateRiskProfile } = useFraud();
  const prevStockRef = useRef<string | null>(null);

  const [evidenceDialog, setEvidenceDialog] = useState(false);
  const [evidenceJustification, setEvidenceJustification] = useState("");
  const [evidencePhoto, setEvidencePhoto] = useState<File | null>(null);

  useEffect(() => {
    loadStockForDate(dateRange.from);
  }, [dateRange.from, currentStore, loadStockForDate]);

  useEffect(() => {
    const key = `${format(dateRange.from, "yyyy-MM-dd")}|${currentStore}`;
    const existing = allSavedStock[key];
    prevStockRef.current = existing ? JSON.stringify(existing) : null;
  }, [dateRange.from, currentStore, allSavedStock]);

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
    for (const item of stockItems) {
      if (!item.descricao) continue;
      if (currentRole === "Operador") {
        if ((item.trincado > 0 || item.quebrado > 0) && !item.obs.trim()) {
          toast.error(`"${item.descricao}": Operadores devem preencher a observação ao registrar perdas.`);
          return;
        }
      }
    }

    const isNew = !prevStockRef.current;
    const prevItems = prevStockRef.current ? JSON.parse(prevStockRef.current) : [];

    // Check for fraud signals
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

    // Check high adjustments
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

    saveStock(dateRange.from);

    // Audit log
    for (const item of stockItems) {
      if (!item.descricao) continue;
      const action = isNew ? "create" : "update";
      const prevItem = prevItems.find((p: any) => p.codigo === item.codigo);
      addLog({
        user: currentRole,
        action,
        module: "Estoque",
        produto: item.descricao,
        antes: prevItem ? `Sist:${prevItem.estoqueSistema} Loja:${prevItem.estoqueLoja} Qbr:${prevItem.quebrado}` : "—",
        depois: `Sist:${item.estoqueSistema} Loja:${item.estoqueLoja} Qbr:${item.quebrado}`,
      });
    }

    toast.success("Estoque salvo com sucesso!", {
      description: `Loja: ${currentStore} — Data: ${format(dateRange.from, "dd/MM/yyyy")}`,
    });
  };

  const handleSave = () => {
    // Check if evidence required for high adjustments
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
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Conferência de Estoque</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle diário por PDV — Estoque Sistema × Estoque Loja</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-primary" />
              <Select value={currentStore} onValueChange={(v) => setCurrentStore(v as any)}>
                <SelectTrigger className="w-[180px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <GlobalDateFilter />
          </div>
        </div>
        <StockTable items={stockItems} onChange={setStockItems} />
        <div className="flex items-center justify-between">
          <div>
            {lastStockSave && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" />
                Último salvamento: {format(lastStockSave, "dd/MM/yyyy HH:mm")}
              </p>
            )}
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Registro
          </Button>
        </div>
      </div>

      {/* Evidence Dialog for High Adjustments */}
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
