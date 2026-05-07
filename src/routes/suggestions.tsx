import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, Loader2, Library } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/suggestions")({
  head: () => ({ meta: [{ title: "Lexa — Suggestions" }] }),
  component: () => <AppShell><Suggestions /></AppShell>,
});

interface Suggestion {
  meal_name: string; meal_type?: string;
  calories: number; proteins: number; carbs: number; fats: number;
  description?: string; ingredients?: string[];
}

const LIBRARY: Suggestion[] = [
  { meal_name: "Bowl poulet quinoa", meal_type: "dejeuner", calories: 520, proteins: 42, carbs: 55, fats: 14, description: "Riche en protéines, parfait pour récupération.", ingredients: ["Poulet", "Quinoa", "Avocat", "Tomate"] },
  { meal_name: "Saumon riz brocoli", meal_type: "diner", calories: 580, proteins: 38, carbs: 48, fats: 22, description: "Oméga-3 et fibres pour un dîner équilibré.", ingredients: ["Saumon", "Riz brun", "Brocoli", "Citron"] },
  { meal_name: "Porridge fruits rouges", meal_type: "petit-dej", calories: 380, proteins: 18, carbs: 60, fats: 8, description: "Énergie longue durée pour la matinée.", ingredients: ["Flocons d'avoine", "Lait amande", "Myrtilles", "Miel"] },
  { meal_name: "Salade thon œuf", meal_type: "dejeuner", calories: 420, proteins: 35, carbs: 18, fats: 24, description: "Léger, riche en protéines maigres.", ingredients: ["Thon", "Œufs", "Salade", "Olives"] },
  { meal_name: "Wrap dinde avocat", meal_type: "dejeuner", calories: 480, proteins: 30, carbs: 42, fats: 20, description: "Pratique et complet pour le midi." },
  { meal_name: "Yaourt grec amandes", meal_type: "collation", calories: 220, proteins: 18, carbs: 14, fats: 10, description: "Collation protéinée idéale après-midi." },
];

function Suggestions() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"ai" | "lib">("ai");
  const [aiList, setAiList] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState<number>(0);
  const [goalType, setGoalType] = useState<string>("maintain");

  useEffect(() => {
    if (!user) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    Promise.all([
      supabase.from("user_goals").select("daily_calories, goal_type").eq("user_id", user.id).maybeSingle(),
      supabase.from("meals").select("calories").eq("user_id", user.id).gte("scanned_at", start.toISOString()),
    ]).then(([g, m]) => {
      const goal = g.data?.daily_calories ?? 2000;
      const consumed = (m.data ?? []).reduce((s, r) => s + r.calories, 0);
      setRemaining(Math.max(200, goal - consumed));
      setGoalType(g.data?.goal_type ?? "maintain");
    });
  }, [user]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-meals", {
        body: { remaining_calories: remaining, goal_type: goalType, dietary_prefs: "aucune" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAiList(data?.suggestions ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const list = tab === "ai" ? aiList : LIBRARY;

  return (
    <div className="px-5 pt-8 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Inspiration</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Suggestions</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono-data">{remaining} kcal restantes</p>
      </header>

      <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary">
        <button onClick={() => setTab("ai")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
            tab === "ai" ? "bg-background text-gold shadow-sm" : "text-muted-foreground"
          }`}>
          <Sparkles className="w-4 h-4" /> IA
        </button>
        <button onClick={() => setTab("lib")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
            tab === "lib" ? "bg-background text-gold shadow-sm" : "text-muted-foreground"
          }`}>
          <Library className="w-4 h-4" /> Bibliothèque
        </button>
      </div>

      {tab === "ai" && (
        <button onClick={generate} disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gold text-gold-foreground font-semibold shadow-gold disabled:opacity-50 flex items-center justify-center gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</> : <><Sparkles className="w-4 h-4" /> Générer 4 idées personnalisées</>}
        </button>
      )}

      <div className="space-y-3">
        {list.length === 0 && tab === "ai" ? (
          <div className="card-premium p-8 text-center text-sm text-muted-foreground">
            Lance l'IA pour des suggestions adaptées à ton objectif.
          </div>
        ) : (
          list.map((s, i) => (
            <div key={i} className="card-premium p-5 space-y-3">
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold">{s.meal_name}</h3>
                  {s.meal_type && <p className="text-[11px] uppercase tracking-widest text-muted-foreground mt-0.5">{s.meal_type}</p>}
                </div>
                <span className="font-mono-data text-gold font-semibold whitespace-nowrap">{s.calories} kcal</span>
              </div>
              {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
              <div className="flex gap-4 text-xs font-mono-data text-muted-foreground">
                <span><span className="text-foreground">{s.proteins}g</span> prot.</span>
                <span><span className="text-foreground">{s.carbs}g</span> gluc.</span>
                <span><span className="text-foreground">{s.fats}g</span> lip.</span>
              </div>
              {s.ingredients && s.ingredients.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {s.ingredients.map((ing, j) => (
                    <span key={j} className="px-2 py-1 rounded-full bg-secondary text-[11px] text-muted-foreground">{ing}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
