import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const LoginPage = () => {
  const [isSignup, setIsSignup] = useState(false);
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
      // Mark session persistence preference
      if (rememberMe) {
        localStorage.setItem("remember_login", "true");
      } else {
        localStorage.removeItem("remember_login");
      }
      // Always set session flag for current tab
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
      setIsSignup(false);
    }
    setLoading(false);
  };

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
          <h2 className="text-lg font-semibold text-center text-foreground">
            {isSignup ? "Criar Conta" : "Entrar"}
          </h2>

          <form onSubmit={isSignup ? handleSignup : handleLogin} className="space-y-4">
            {isSignup && (
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

            {!isSignup && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="h-2.5 w-2.5 rounded-[2px]"
                />
                <label htmlFor="remember" className="text-xs text-muted-foreground cursor-pointer select-none">
                  Manter login
                </label>
              </div>
            )}

            <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
              {loading ? "Aguarde..." : isSignup ? (
                <><UserPlus className="w-4 h-4" /> Criar Conta</>
              ) : (
                <><LogIn className="w-4 h-4" /> Entrar</>
              )}
            </Button>
          </form>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-sm text-primary hover:underline"
            >
              {isSignup ? "Já tem conta? Entrar" : "Não tem conta? Criar"}
            </button>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">© 2026 Granja Sofhia</p>
      </div>
    </div>
  );
};

export default LoginPage;
