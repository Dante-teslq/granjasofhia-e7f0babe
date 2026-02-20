import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { StockItem, SangriaItem, STORES, StoreName } from "@/types/inventory";

interface InventoryData {
  currentStore: StoreName;
  setCurrentStore: (store: StoreName) => void;
  stockItems: StockItem[];
  sangriaItems: SangriaItem[];
  savedStock: Record<StoreName, StockItem[]>;
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

const emptyStockRow = (): StockItem => ({
  id: crypto.randomUUID(),
  descricao: "",
  codigo: "",
  estoqueSistema: 0,
  estoqueLoja: 0,
  trincado: 0,
  quebrado: 0,
  faltas: 0,
  obs: "",
});

export const InventoryProvider = ({ children }: { children: ReactNode }) => {
  const [currentStore, setCurrentStore] = useState<StoreName>("CEASA");
  const [stockItems, setStockItems] = useState<StockItem[]>([emptyStockRow()]);
  const [sangriaItems, setSangriaItems] = useState<SangriaItem[]>([
    { id: crypto.randomUUID(), sangria: "", cartelasVazias: "", barbantes: "", notacoes: "" },
  ]);
  const [savedStock, setSavedStock] = useState<Record<StoreName, StockItem[]>>(
    () => Object.fromEntries(STORES.map((s) => [s, []])) as Record<StoreName, StockItem[]>
  );
  const [savedSangrias, setSavedSangrias] = useState<SangriaItem[]>([]);
  const [lastStockSave, setLastStockSave] = useState<Date | null>(null);
  const [lastSangriaSave, setLastSangriaSave] = useState<Date | null>(null);

  const saveStock = useCallback(() => {
    setSavedStock((prev) => ({ ...prev, [currentStore]: [...stockItems] }));
    setLastStockSave(new Date());
  }, [stockItems, currentStore]);

  const saveSangrias = useCallback(() => {
    setSavedSangrias([...sangriaItems]);
    setLastSangriaSave(new Date());
  }, [sangriaItems]);

  return (
    <InventoryContext.Provider value={{
      currentStore, setCurrentStore,
      stockItems, sangriaItems, savedStock, savedSangrias,
      setStockItems, setSangriaItems, saveStock, saveSangrias,
      lastStockSave, lastSangriaSave,
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
