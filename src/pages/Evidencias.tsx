import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Camera, Upload, Save, CheckCircle, Search, Filter, ImageIcon, X, Calendar, MapPin, User, AlertTriangle,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/contexts/AppContext";
import { useAudit } from "@/contexts/AuditContext";
import { STORES } from "@/types/inventory";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

interface EvidenciaRecord {
  id: string;
  data: string;
  ponto_de_venda: string;
  tipo_perda: string;
  quantidade: number;
  usuario: string;
  justificativa: string;
  foto_url: string;
  created_at: string;
}

const EvidenciasPage = () => {
  const { currentRole, dateRange } = useApp();
  const { addLog } = useAudit();

  // Form state
  const [pontoDeVenda, setPontoDeVenda] = useState<string>(STORES[0]);
  const [tipoPerda, setTipoPerda] = useState<string>("Quebrado");
  const [quantidade, setQuantidade] = useState<string>("");
  const [justificativa, setJustificativa] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Gallery state
  const [records, setRecords] = useState<EvidenciaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterPdv, setFilterPdv] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const [selectedImage, setSelectedImage] = useState<EvidenciaRecord | null>(null);

  // Load records
  const fetchRecords = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("evidencias_perdas")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterPdv !== "all") {
        query = query.eq("ponto_de_venda", filterPdv);
      }
      if (filterUser !== "all") {
        query = query.eq("usuario", filterUser);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRecords((data as EvidenciaRecord[]) || []);
    } catch (err: any) {
      console.error("Erro ao carregar evidências:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [filterPdv, filterUser]);

  // Handle photo selection
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFoto(file);
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFotoPreview(null);
    }
  };

  const clearForm = () => {
    setPontoDeVenda(STORES[0]);
    setTipoPerda("Quebrado");
    setQuantidade("");
    setJustificativa("");
    setFoto(null);
    setFotoPreview(null);
  };

  const handleSave = async () => {
    if (!justificativa.trim()) {
      toast.error("Justificativa é obrigatória.");
      return;
    }
    if (!foto) {
      toast.error("Foto é obrigatória.");
      return;
    }
    const qty = parseInt(quantidade);
    if (!qty || qty <= 0) {
      toast.error("Quantidade deve ser maior que zero.");
      return;
    }

    setSaving(true);
    try {
      // Upload photo
      const fileExt = foto.name.split(".").pop();
      const filePath = `${format(new Date(), "yyyy-MM-dd")}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("evidencias")
        .upload(filePath, foto, { contentType: foto.type });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("evidencias")
        .getPublicUrl(filePath);

      // Insert record
      const { error: insertError } = await supabase
        .from("evidencias_perdas")
        .insert({
          data: format(dateRange.from, "yyyy-MM-dd"),
          ponto_de_venda: pontoDeVenda,
          tipo_perda: tipoPerda,
          quantidade: qty,
          usuario: currentRole,
          justificativa: justificativa.trim(),
          foto_url: urlData.publicUrl,
          foto_path: filePath,
        });

      if (insertError) throw insertError;

      // Audit log
      addLog({
        user: currentRole,
        action: "create",
        module: "Evidências",
        produto: `${tipoPerda} x${qty}`,
        antes: "—",
        depois: `PDV:${pontoDeVenda} | Qtd:${qty} | Tipo:${tipoPerda}`,
      });

      toast.success("Evidência registrada com sucesso!", {
        description: `${tipoPerda} x${qty} — ${pontoDeVenda}`,
      });

      clearForm();
      fetchRecords();
    } catch (err: any) {
      console.error("Erro ao salvar evidência:", err);
      toast.error("Erro ao salvar evidência. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  const isAdmin = currentRole === "Administrador";
  const uniqueUsers = [...new Set(records.map((r) => r.usuario))];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px]">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Evidências de Perdas</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registro fotográfico de ovos quebrados e trincados vinculado ao estoque
          </p>
        </div>

        {/* Form */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              Novo Registro de Perda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Data */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" /> Data
                </label>
                <Input
                  value={format(dateRange.from, "dd/MM/yyyy")}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                />
              </div>

              {/* PDV */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Ponto de Venda
                </label>
                <Select value={pontoDeVenda} onValueChange={setPontoDeVenda}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STORES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Tipo de Perda
                </label>
                <Select value={tipoPerda} onValueChange={setTipoPerda}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Quebrado">Quebrado</SelectItem>
                    <SelectItem value="Trincado">Trincado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quantidade */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  Quantidade
                </label>
                <Input
                  type="number"
                  min="1"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Justificativa */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Justificativa *
              </label>
              <Textarea
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                placeholder="Descreva o motivo da perda, circunstâncias e providências tomadas..."
                rows={3}
              />
            </div>

            {/* Upload */}
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Foto da Evidência *
              </label>
              <div className="flex items-start gap-4">
                <label className="flex flex-col items-center justify-center w-40 h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                  <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">Clique ou arraste</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </label>
                {fotoPreview && (
                  <div className="relative">
                    <img
                      src={fotoPreview}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-xl border border-border"
                    />
                    <button
                      onClick={() => { setFoto(null); setFotoPreview(null); }}
                      className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* User + Save */}
            <div className="flex items-center justify-between pt-2 border-t border-border/50">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="w-4 h-4" />
                Responsável: <span className="font-semibold text-foreground">{currentRole}</span>
              </div>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <>Salvando...</>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Evidência
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gallery - Admin view */}
        <Card className="glass-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
                  <ImageIcon className="w-5 h-5 text-primary" />
                </div>
                Galeria de Evidências
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={filterPdv} onValueChange={setFilterPdv}>
                  <SelectTrigger className="w-[160px] h-9 text-sm">
                    <Filter className="w-3.5 h-3.5 mr-1" />
                    <SelectValue placeholder="PDV" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os PDVs</SelectItem>
                    {STORES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isAdmin && (
                  <Select value={filterUser} onValueChange={setFilterUser}>
                    <SelectTrigger className="w-[160px] h-9 text-sm">
                      <User className="w-3.5 h-3.5 mr-1" />
                      <SelectValue placeholder="Usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {uniqueUsers.map((u) => (
                        <SelectItem key={u} value={u}>{u}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Carregando...</p>
            ) : records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma evidência registrada ainda.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {records.map((rec) => (
                  <div
                    key={rec.id}
                    className="group rounded-xl border border-border/50 overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 cursor-pointer bg-card"
                    onClick={() => setSelectedImage(rec)}
                  >
                    <div className="aspect-[4/3] overflow-hidden bg-muted">
                      <img
                        src={rec.foto_url}
                        alt="Evidência"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                          rec.tipo_perda === "Quebrado"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-amber-100/80 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}>
                          {rec.tipo_perda}
                        </span>
                        <span className="text-xs font-semibold text-foreground">x{rec.quantidade}</span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{rec.ponto_de_venda}</p>
                      <p className="text-[11px] text-muted-foreground/70">
                        {format(new Date(rec.created_at), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Image detail dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" />
              Detalhes da Evidência
            </DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <div className="space-y-4">
              <img
                src={selectedImage.foto_url}
                alt="Evidência ampliada"
                className="w-full rounded-xl border border-border max-h-[400px] object-contain bg-muted"
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Data</span>
                  <p className="font-medium text-foreground">{format(new Date(selectedImage.data), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">PDV</span>
                  <p className="font-medium text-foreground">{selectedImage.ponto_de_venda}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Tipo</span>
                  <p className={`font-bold ${selectedImage.tipo_perda === "Quebrado" ? "text-destructive" : "text-amber-600"}`}>
                    {selectedImage.tipo_perda}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Quantidade</span>
                  <p className="font-bold text-foreground">{selectedImage.quantidade}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Usuário</span>
                  <p className="font-medium text-foreground">{selectedImage.usuario}</p>
                </div>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Registro</span>
                  <p className="font-medium text-foreground">{format(new Date(selectedImage.created_at), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Justificativa</span>
                <p className="text-sm text-foreground mt-1 p-3 rounded-lg bg-muted/50">
                  {selectedImage.justificativa}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EvidenciasPage;
