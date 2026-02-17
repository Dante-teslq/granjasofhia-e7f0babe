import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { StockItem, SangriaItem } from "@/types/inventory";

interface InventoryData {
  stockItems: StockItem[];
  sangriaItems: SangriaItem[];
  savedStock: StockItem[];
  savedSangrias: SangriaItem[];
  setStockItems: (items: StockItem[]) => void;
  setSangriaItems: (items: SangriaItem[]) => void;
  saveStock: () => void;
  saveSangrias: () => void;
  lastStockSave: Date | null;
  lastSangriaSave: Date | null;
}

const InventoryContext = createContext<InventoryData | null>(null);

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error("useInventory must be used within InventoryProvider");
  return ctx;
};

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [stockItems, setStockItems] = useState<StockItem[]>([
    { id: crypto.randomUUID(), descricao: "", codigo: "", estoqueInicial: 0, entradas: 0, quantVendida: 0, trincado: 0, quebrado: 0, obs: "" },
  ]);
  const [sangriaItems, setSangriaItems] = useState<SangriaItem[]>([
    { id: crypto.randomUUID(), sangria: "", cartelasVazias: "", barbantes: "", notacoes: "" },
  ]);
  const [savedStock, setSavedStock] = useState<StockItem[]>([]);
  const [savedSangrias, setSavedSangrias] = useState<SangriaItem[]>([]);
  const [lastStockSave, setLastStockSave] = useState<Date | null>(null);
  const [lastSangriaSave, setLastSangriaSave] = useState<Date | null>(null);

  const saveStock = useCallback(() => {
    setSavedStock([...stockItems]);
    setLastStockSave(new Date());
  }, [stockItems]);

  const saveSangrias = useCallback(() => {
    setSavedSangrias([...sangriaItems]);
    setLastSangriaSave(new Date());
  }, [sangriaItems]);

  return (
    <InventoryContext.Provider value={{
      stockItems, sangriaItems, savedStock, savedSangrias,
      setStockItems, setSangriaItems, saveStock, saveSangrias,
      lastStockSave, lastSangriaSave,
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
