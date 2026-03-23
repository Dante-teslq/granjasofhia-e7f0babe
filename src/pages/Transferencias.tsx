import { useState } from "react";
import { ArrowRightLeft, Plus, Send, PackageCheck, ClipboardList } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/contexts/AppContext";
import GlobalDateFilter from "@/components/GlobalDateFilter";
import { useTransferencias } from "@/hooks/useTransferencias";
import TransferenciaStats from "@/components/transferencias/TransferenciaStats";
import TransferenciasTable from "@/components/transferencias/TransferenciasTable";
import RecebimentosTab from "@/components/transferencias/RecebimentosTab";
import NovaTransferenciaDialog from "@/components/transferencias/NovaTransferenciaDialog";
import InsumosTab from "@/components/transferencias/InsumosTab";

const TransferenciasPage = () => {
  const { profile, dateRange, isOperator, currentRole, session } = useApp();
  const isAdmin = currentRole === "Admin" || currentRole === "Administrador" || currentRole === "Supervisor";
  const { records, pdvList, loading, loadRecords, deleteRecord } = useTransferencias(dateRange);
  const [dialogOpen, setDialogOpen] = useState(false);

  const userName = profile?.nome || profile?.email || "";

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6 max-w-[1400px]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ArrowRightLeft className="w-6 h-6 text-primary" />
              Transferências de Estoque
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Movimentação flexível entre Granja, depósitos e pontos de venda
            </p>
          </div>
          <div className="flex items-center gap-2">
            <GlobalDateFilter />
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nova Transferência
            </Button>
          </div>
        </div>

        <TransferenciaStats records={records} />

        {/* Tabs */}
        <Tabs defaultValue="envios" className="w-full">
          <TabsList>
            <TabsTrigger value="envios" className="gap-1.5">
              <Send className="w-3.5 h-3.5" /> Envios
            </TabsTrigger>
            <TabsTrigger value="recebimentos" className="gap-1.5">
              <PackageCheck className="w-3.5 h-3.5" /> Recebimentos
            </TabsTrigger>
            <TabsTrigger value="insumos" className="gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Insumos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="envios" className="mt-4">
            <TransferenciasTable records={records} loading={loading} onDelete={deleteRecord} isAdmin={isAdmin} />
          </TabsContent>

          <TabsContent value="recebimentos" className="mt-4">
            <RecebimentosTab
              records={records}
              loading={loading}
              userId={session?.user?.id || ""}
              onConfirmed={loadRecords}
            />
          </TabsContent>
        </Tabs>

        <NovaTransferenciaDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          pdvList={pdvList}
          isOperator={isOperator}
          userPdvId={profile?.pdv_id || null}
          userName={userName}
          onSuccess={loadRecords}
        />
      </div>
    </DashboardLayout>
  );
};

export default TransferenciasPage;
