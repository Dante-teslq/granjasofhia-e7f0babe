import { useEffect } from "react";
import { Save, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";
import SangriasTable from "@/components/SangriasTable";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/contexts/InventoryContext";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { toast } from "@/components/ui/sonner";

const SangriasPage = () => {
  const { sangriaItems, setSangriaItems, saveSangrias, lastSangriaSave, loadSangriasForDate } = useInventory();
  const { dateRange, currentRole } = useApp();
  const { addLog } = useAudit();

  useEffect(() => {
    loadSangriasForDate(dateRange.from);
  }, [dateRange.from, loadSangriasForDate]);

  const handleSave = () => {
    saveSangrias(dateRange.from);

    for (const item of sangriaItems) {
      if (!item.sangria) continue;
      addLog({
        action: "create",
        module: "Sangrias",
        usuario: currentRole,
        item_description: item.sangria,
        after_data: { cartelasVazias: item.cartelasVazias, barbantes: item.barbantes, notacoes: item.notacoes },
      });
    }

    toast.success("Sangrias salvas com sucesso!", {
      description: `Data: ${format(dateRange.from, "dd/MM/yyyy")} — Registro lançado.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        <div className="flex flex-col gap-3 md:gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Sangrias e Insumos</h1>
            <p className="text-muted-foreground text-xs md:text-sm mt-1">Controle diário de sangrias, cartelas e barbantes</p>
          </div>
        </div>
        <SangriasTable items={sangriaItems} onChange={setSangriaItems} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            {lastSangriaSave && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" />
                Último salvamento: {format(lastSangriaSave, "dd/MM/yyyy HH:mm")}
              </p>
            )}
          </div>
          <Button onClick={handleSave} className="gap-2 w-full sm:w-auto h-12 md:h-10">
            <Save className="w-4 h-4" />
            Salvar Registro
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SangriasPage;
