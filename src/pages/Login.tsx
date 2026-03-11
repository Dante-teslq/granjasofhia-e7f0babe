import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { LogIn, UserPlus, Eye, EyeOff, ArrowLeft, Mail } from "lucide-react";
import { toast } from "@/components/ui/sonner";

type View = "login" | "signup" | "forgot";

const LoginPage = () => {
  const [view, setView] = useState<View>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

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
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nome },
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

  const title = view === "signup" ? "Criar Conta" : view === "forgot" ? "Recuperar Senha" : "Entrar";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary/30 shadow-xl">
            <img src="/logo.jpg" alt="Granja Sofhia" className="w-full h-full object-cover" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold font-serif text-foreground">Granja Sofhia</h1>
            <p className="text-xs text-muted-foreground mt-1">Controle Operacional</p>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 space-y-5">
          <h2 className="text-lg font-semibold text-center text-foreground">{title}</h2>

          {/* === FORGOT PASSWORD VIEW === */}
          {view === "forgot" && (
            <>
              <p className="text-xs text-muted-foreground text-center">
                Informe seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@granja.com"
                    className="h-11 mt-1"
                    required
                  />
                </div>
                <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                  {loading ? "Enviando..." : (
                    <><Mail className="w-4 h-4" /> Enviar link</>
                  )}
                </Button>
              </form>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView("login")}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" /> Voltar ao login
                </button>
              </div>
            </>
          )}

          {/* === LOGIN / SIGNUP VIEW === */}
          {view !== "forgot" && (
            <>
              <form onSubmit={view === "signup" ? handleSignup : handleLogin} className="space-y-4">
                {view === "signup" && (
                  <div>
                    <label className="text-sm font-medium text-foreground">Nome</label>
                    <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome completo" className="h-11 mt-1" />
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@granja.com" className="h-11 mt-1" required />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Senha</label>
                  <div className="relative mt-1">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-11 pr-10"
                      required
                      minLength={6}
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {view === "login" && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="remember"
                        checked={rememberMe}
                        onCheckedChange={(checked) => setRememberMe(checked === true)}
                        className="h-3.5 w-3.5 rounded-full border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <label htmlFor="remember" className="text-sm font-medium text-muted-foreground cursor-pointer select-none leading-none">
                        Manter login
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setView("forgot")}
                      className="text-[11px] text-primary hover:underline font-medium"
                    >
                      Esqueceu a senha?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                  {loading ? "Aguarde..." : view === "signup" ? (
                    <><UserPlus className="w-4 h-4" /> Criar Conta</>
                  ) : (
                    <><LogIn className="w-4 h-4" /> Entrar</>
                  )}
                </Button>
              </form>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView(view === "signup" ? "login" : "signup")}
                  className="text-sm text-primary hover:underline"
                >
                  {view === "signup" ? "Já tem conta? Entrar" : "Não tem conta? Criar"}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-[10px] text-muted-foreground text-center">© 2026 Granja Sofhia</p>
      </div>
    </div>
  );
};

export default LoginPage;
