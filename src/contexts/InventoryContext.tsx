import { createContext, useContext, useState, type ReactNode, useCallback } from "react";
import { StockItem, SangriaItem, STORES, type StoreName } from "@/types/inventory";
import { format } from "date-fns";
import { persistStockToDB } from "@/hooks/useEstoquePersist";

// Key = "YYYY-MM-DD|StoreName"
type StockKey = string;
const makeKey = (date: Date, store: StoreName): StockKey =>
  `${format(date, "yyyy-MM-dd")}|${store}`;

// Key = "YYYY-MM-DD"
type SangriaKey = string;
const makeSangriaKey = (date: Date): SangriaKey => format(date, "yyyy-MM-dd");

interface InventoryData {
  currentStore: StoreName;
  setCurrentStore: (store: StoreName) => void;
  stockItems: StockItem[];
  sangriaItems: SangriaItem[];
  /** All saved stock entries, keyed by date+store */
  allSavedStock: Record<StockKey, StockItem[]>;
  /** Convenience: saved stock for the current date+store selection */
  savedStock: Record<StoreName, StockItem[]>;
  savedSangrias: SangriaItem[];
  setStockItems: (items: StockItem[]) => void;
  setSangriaItems: (items: SangriaItem[]) => void;
  saveStock: (date: Date) => void;
  saveSangrias: (date: Date) => void;
  loadStockForDate: (date: Date) => void;
  loadSangriasForDate: (date: Date) => void;
  lastStockSave: Date | null;
  lastSangriaSave: Date | null;
  /** Get aggregated stock across all stores for a date range */
  getStockInRange: (from: Date, to: Date) => StockItem[];
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

  // Persistent stores keyed by date+store and date
  const [allSavedStock, setAllSavedStock] = useState<Record<StockKey, StockItem[]>>({});
  const [allSavedSangrias, setAllSavedSangrias] = useState<Record<SangriaKey, SangriaItem[]>>({});

  const [lastStockSave, setLastStockSave] = useState<Date | null>(null);
  const [lastSangriaSave, setLastSangriaSave] = useState<Date | null>(null);

  const saveStock = useCallback((date: Date) => {
    const key = makeKey(date, currentStore);
    setAllSavedStock((prev) => ({ ...prev, [key]: [...stockItems] }));
    setLastStockSave(new Date());
    // Persist to database for reactive dashboard
    persistStockToDB(stockItems, date, currentStore);
  }, [stockItems, currentStore]);

  const saveSangrias = useCallback((date: Date) => {
    const key = makeSangriaKey(date);
    setAllSavedSangrias((prev) => ({ ...prev, [key]: [...sangriaItems] }));
    setLastSangriaSave(new Date());
  }, [sangriaItems]);

  const loadStockForDate = useCallback((date: Date) => {
    const key = makeKey(date, currentStore);
    const saved = allSavedStock[key];
    if (saved && saved.length > 0) {
      setStockItems(saved.map((s) => ({ ...s })));
    } else {
      setStockItems([emptyStockRow()]);
    }
  }, [currentStore, allSavedStock]);

  const loadSangriasForDate = useCallback((date: Date) => {
    const key = makeSangriaKey(date);
    const saved = allSavedSangrias[key];
    if (saved && saved.length > 0) {
      setSangriaItems(saved.map((s) => ({ ...s })));
    } else {
      setSangriaItems([{ id: crypto.randomUUID(), sangria: "", cartelasVazias: "", barbantes: "", notacoes: "" }]);
    }
  }, [allSavedSangrias]);

  // Build savedStock per-store for current date (used by dashboard)
  const savedStock = Object.fromEntries(
    STORES.map((s) => {
      // find latest entry for this store
      const entries = Object.entries(allSavedStock).filter(([k]) => k.endsWith(`|${s}`));
      const latest = entries.length > 0 ? entries[entries.length - 1][1] : [];
      return [s, latest];
    })
  ) as Record<StoreName, StockItem[]>;

  const savedSangrias = Object.values(allSavedSangrias).flat();

  // Aggregate stock items across all stores for a date range
  const getStockInRange = useCallback((from: Date, to: Date): StockItem[] => {
    const fromStr = format(from, "yyyy-MM-dd");
    const toStr = format(to, "yyyy-MM-dd");
    return Object.entries(allSavedStock)
      .filter(([key]) => {
        const dateStr = key.split("|")[0];
        return dateStr >= fromStr && dateStr <= toStr;
      })
      .flatMap(([, items]) => items);
  }, [allSavedStock]);

  return (
    <InventoryContext.Provider value={{
      currentStore, setCurrentStore,
      stockItems, sangriaItems, allSavedStock, savedStock, savedSangrias,
      setStockItems, setSangriaItems, saveStock, saveSangrias,
      loadStockForDate, loadSangriasForDate,
      lastStockSave, lastSangriaSave,
      getStockInRange,
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
