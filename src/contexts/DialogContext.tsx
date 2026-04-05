import { createContext, useContext, useState, ReactNode } from "react";

/**
 * DialogContext — gerencia quais dialogs globais estão abertos.
 * Ao guardar o estado FORA das páginas, os dialogs persistem durante a navegação.
 */
interface DialogState {
  novaTransferencia: boolean;
}

interface DialogContextData {
  dialogs: DialogState;
  openDialog: (name: keyof DialogState) => void;
  closeDialog: (name: keyof DialogState) => void;
  toggleDialog: (name: keyof DialogState) => void;
}

const DialogContext = createContext<DialogContextData | null>(null);

export const useDialogs = () => {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialogs must be used within DialogProvider");
  return ctx;
};

export const DialogProvider = ({ children }: { children: ReactNode }) => {
  const [dialogs, setDialogs] = useState<DialogState>({
    novaTransferencia: false,
  });

  const openDialog = (name: keyof DialogState) =>
    setDialogs((prev) => ({ ...prev, [name]: true }));

  const closeDialog = (name: keyof DialogState) =>
    setDialogs((prev) => ({ ...prev, [name]: false }));

  const toggleDialog = (name: keyof DialogState) =>
    setDialogs((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <DialogContext.Provider value={{ dialogs, openDialog, closeDialog, toggleDialog }}>
      {children}
    </DialogContext.Provider>
  );
};
