import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Save, CheckCircle } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import StockTable from "@/components/StockTable";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useInventory } from "@/contexts/InventoryContext";
import { toast } from "@/components/ui/sonner";

const EstoquePage = () => {
  const [date, setDate] = useState<Date>(new Date());
  const { stockItems, setStockItems, saveStock, lastStockSave } = useInventory();

  const handleSave = () => {
    saveStock();
    toast.success("Estoque salvo com sucesso!", {
      description: `Registro do dia ${format(date, "dd/MM/yyyy")} lançado.`,
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-[1400px]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Estoque Diário</h1>
            <p className="text-muted-foreground text-sm mt-1">Controle detalhado de estoque</p>
          </div>
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 w-fit">
                  <CalendarIcon className="w-4 h-4" />
                  {format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
              </PopoverContent>
            </Popover>
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
    </DashboardLayout>
  );
};

export default EstoquePage;
