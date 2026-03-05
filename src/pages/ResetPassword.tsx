import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { toast } from "@/components/ui/sonner";


const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for Supabase to process the recovery token from the URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && event === "SIGNED_IN")) {
        setSessionReady(true);
      }
    });

    // Check if there's already an active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    if (!sessionReady) {
      toast.error("Sessão de recuperação não encontrada. Solicite um novo link.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      if (error.message.includes("same_password") || error.message.includes("should be different")) {
        toast.error("A nova senha não pode ser igual à senha atual. Escolha uma senha diferente.");
      } else if (error.message.includes("session")) {
        toast.error("Sessão expirada. Solicite um novo link de recuperação.");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success("Senha redefinida com sucesso!");
      setTimeout(() => navigate("/login"), 1500);
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
          <h2 className="text-lg font-semibold text-center text-foreground">Redefinir Senha</h2>

          <form onSubmit={handleReset} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Nova senha</label>
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

              <div>
                <label className="text-sm font-medium text-foreground">Confirmar senha</label>
                <div className="relative mt-1">
                  <Input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 pr-10"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 gap-2" disabled={loading}>
                {loading ? "Redefinindo..." : (
                  <><KeyRound className="w-4 h-4" /> Redefinir Senha</>
                )}
              </Button>
            </form>
        </div>

        <p className="text-[10px] text-muted-foreground text-center">© 2026 Granja Sofhia</p>
      </div>
    </div>
  );
};

export default ResetPassword;
