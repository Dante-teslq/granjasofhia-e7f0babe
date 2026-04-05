import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, UserPlus, Eye, EyeOff, ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type View = "login" | "signup" | "forgot";

interface PdvOption {
  id: string;
  nome: string;
}

const LoginPage = () => {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [pdvId, setPdvId] = useState("");
  const [pdvList, setPdvList] = useState<PdvOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    supabase
      .from("pontos_de_venda")
      .select("id, nome")
      .eq("status", "ativo")
      .order("nome")
      .then(({ data }) => {
        if (data) setPdvList(data);
      });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "Email ou senha inválidos." : error.message);
    } else {
      if (rememberMe) {
        localStorage.setItem("remember_login", "true");
      } else {
        localStorage.removeItem("remember_login");
      }
      sessionStorage.setItem("session_active", "true");
    }
    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("Informe seu nome.");
      return;
    }
    if (!pdvId) {
      toast.error("Selecione o ponto de venda.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome, pdv_id: pdvId },
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      setView("login");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Informe seu e-mail.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
    }
    setLoading(false);
  };

  const title = view === "signup" ? "Criar Conta" : view === "forgot" ? "Recuperar Senha" : "Acesso Restrito";

  return (
    <div className="min-h-screen bg-mesh-light dark:bg-mesh-dark flex items-center justify-center p-4 transition-colors duration-500">
      <div className="w-full max-w-[400px] space-y-8 animate-fade-in-up">
        <div className="flex flex-col items-center gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-500" />
            <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-white dark:ring-black shadow-2xl transition-transform duration-500 group-hover:scale-105">
              <img src="/logo.jpg" alt="Granja Sofhia" className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="text-center space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Granja <span className="text-gradient-gold">Sofhia</span>
            </h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Sistema de Gestão de Ovos</p>
          </div>
        </div>

        <div className="glass-card p-8 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
          
          <div className="flex flex-col items-center gap-1">
            <ShieldCheck className="w-5 h-5 text-primary mb-1" />
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground font-medium text-center">Identifique-se para continuar</p>
          </div>

          {/* === FORGOT PASSWORD VIEW === */}
          {view === "forgot" && (
            <div className="space-y-6 animate-slide-up">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Informe seu e-mail e enviaremos um link seguro para redefinir sua senha de acesso.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">E-mail Corporativo</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@granjasofhia.com.br"
                    className="h-12 bg-white/50 dark:bg-black/20 border-border/50 focus:ring-primary/20 focus:border-primary"
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-12 gap-2 font-bold shadow-lg shadow-primary/20" disabled={loading}>
                  {loading ? "Processando..." : (
                    <><Mail className="w-4 h-4" /> Enviar link de recuperação</>
                  )}
                </Button>
              </form>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-bold"
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar ao início
                </button>
              </div>
            </div>
          )}

          {/* === LOGIN / SIGNUP VIEW === */}
          {view !== "forgot" && (
            <div className="animate-slide-up">
              <form onSubmit={view === "signup" ? handleSignup : handleLogin} className="space-y-5">
                {view === "signup" && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Nome Completo</label>
                      <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome" className="h-12 bg-white/50 dark:bg-black/20 border-border/50" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">Unidade / PDV *</label>
                      <Select value={pdvId} onValueChange={setPdvId}>
                        <SelectTrigger className="h-12 bg-white/50 dark:bg-black/20 border-border/50 cursor-pointer">
                          <SelectValue placeholder="Selecione sua unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {pdvList.map((pdv) => (
                            <SelectItem key={pdv.id} value={pdv.id}>{pdv.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider ml-1">E-mail Corporativo</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="usuario@granjasofhia.com.br" className="h-12 bg-white/50 dark:bg-black/20 border-border/50" required />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">Senha de Segurança</label>
                    {view === "login" && (
                      <button type="button" onClick={() => setView("forgot")} className="text-[10px] text-primary hover:underline font-bold uppercase tracking-wider">
                        Esqueceu?
                      </button>
                    )}
                  </div>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-12 pr-12 bg-white/50 dark:bg-black/20 border-border/50"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {view === "login" && (
                  <div className="flex items-center gap-2 px-1">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                      className="h-4 w-4 rounded-md border-border/50 data-[state=checked]:bg-primary"
                    />
                    <label htmlFor="remember" className="text-xs font-bold text-muted-foreground cursor-pointer select-none">
                      Lembrar minha sessão neste dispositivo
                    </label>
                  </div>
                )}

                <Button type="submit" className="w-full h-12 gap-2 font-bold shadow-xl shadow-primary/10 transition-all hover:scale-[1.02]" disabled={loading}>
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : view === "signup" ? (
                    <><UserPlus className="w-4 h-4" /> Registrar Colaborador</>
                  ) : (
                    <><LogIn className="w-4 h-4" /> Confirmar Acesso</>
                  )}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/50 text-center">
                <button
                  type="button"
                  onClick={() => setView(view === "signup" ? "login" : "signup")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors font-bold uppercase tracking-widest"
                >
                  {view === "signup" ? "Já possui conta? Acessar agora" : "Novo colaborador? Solicitar acesso"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center gap-2">
          <p className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-[0.4em]">© 2026 Grupo Granja Sofhia</p>
          <div className="w-1 h-1 bg-primary rounded-full mt-2" />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
