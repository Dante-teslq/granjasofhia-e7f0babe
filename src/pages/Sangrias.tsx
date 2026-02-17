import { Save, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import DashboardLayout from "@/components/DashboardLayout";
import SangriasTable from "@/components/SangriasTable";
import { Button } from "@/components/ui/button";
import { useInventory } from "@/contexts/InventoryContext";
import { toast } from "@/components/ui/sonner";

const SangriasPage = () => {
  const { sangriaItems, setSangriaItems, saveSangrias, lastSangriaSave } = useInventory();

  const handleSave = () => {
    saveSangrias();
    toast.success("Sangrias salvas com sucesso!", {
      description: "Registro de insumos lançado.",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sangrias e Insumos</h1>
          <p className="text-muted-foreground text-sm mt-1">Controle de sangrias, cartelas e barbantes</p>
        </div>
        <SangriasTable items={sangriaItems} onChange={setSangriaItems} />
        <div className="flex items-center justify-between">
          <div>
            {lastSangriaSave && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-success" />
                Último salvamento: {format(lastSangriaSave, "dd/MM/yyyy HH:mm")}
              </p>
            )}
          </div>
          <Button onClick={handleSave} className="gap-2">
            <Save className="w-4 h-4" />
            Salvar Registro
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SangriasPage;
