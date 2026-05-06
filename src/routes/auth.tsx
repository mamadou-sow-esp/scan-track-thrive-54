import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Lexa — Connexion" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { name },
          },
        });
        if (error) throw error;
        toast.success("Compte créé. Vérifie ton email pour confirmer.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bienvenue !");
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition">
          <ArrowLeft className="w-4 h-4" /> Retour
        </Link>
        <div className="card-premium p-8 sm:p-10">
          <h1 className="font-display text-4xl font-semibold text-gold mb-2">Lexa</h1>
          <p className="text-muted-foreground mb-8">
            {mode === "signin" ? "Bon retour parmi nous." : "Crée ton compte gratuit."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Nom</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
                  className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-gold outline-none transition" />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-gold outline-none transition" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-2">Mot de passe</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full px-4 py-3 rounded-xl bg-input border border-border focus:border-gold outline-none transition" />
            </div>
            <button type="submit" disabled={busy}
              className="w-full py-3.5 rounded-xl bg-gold text-gold-foreground font-semibold shadow-gold hover:opacity-90 transition disabled:opacity-50">
              {busy ? "..." : mode === "signin" ? "Se connecter" : "Créer mon compte"}
            </button>
          </form>

          <button onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full mt-6 text-sm text-muted-foreground hover:text-foreground transition">
            {mode === "signin" ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
          </button>
        </div>
      </div>
    </div>
  );
}
