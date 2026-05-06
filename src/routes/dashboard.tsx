import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Flame } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Lexa — Tableau de bord" }] }),
  component: () => <AppShell><Dashboard /></AppShell>,
});

interface Goals { daily_calories: number; daily_proteins: number; daily_carbs: number; daily_fats: number; }
interface Meal { id: string; meal_name: string; calories: number; proteins: number; carbs: number; fats: number; photo_url: string | null; scanned_at: string; }

function Dashboard() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goals | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    Promise.all([
      supabase.from("user_goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("meals").select("*").eq("user_id", user.id)
        .gte("scanned_at", startOfDay.toISOString())
        .order("scanned_at", { ascending: false }),
    ]).then(([g, m]) => {
      if (g.data) setGoals(g.data);
      if (m.data) setMeals(m.data as Meal[]);
      setLoading(false);
    });
  }, [user]);

  const totals = meals.reduce(
    (a, m) => ({
      cal: a.cal + m.calories,
      p: a.p + Number(m.proteins),
      c: a.c + Number(m.carbs),
      f: a.f + Number(m.fats),
    }),
    { cal: 0, p: 0, c: 0, f: 0 }
  );

  const calGoal = goals?.daily_calories ?? 2000;
  const calPct = Math.min(100, Math.round((totals.cal / calGoal) * 100));

  return (
    <div className="px-5 pt-8 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Aujourd'hui</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Bonjour</h1>
      </header>

      {loading ? (
        <div className="card-premium p-8 text-center text-muted-foreground">Chargement…</div>
      ) : (
        <>
          <div className="card-premium p-6">
            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-gold" />
                <span className="text-sm text-muted-foreground">Calories</span>
              </div>
              <span className="font-mono-data text-xs text-muted-foreground">{totals.cal} / {calGoal} kcal</span>
            </div>
            <div className="font-display text-5xl font-semibold text-gold mb-4">
              {Math.max(0, calGoal - totals.cal)}
              <span className="text-base text-muted-foreground font-sans ml-2">restantes</span>
            </div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-gold transition-all duration-500" style={{ width: `${calPct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MacroCard label="Protéines" value={totals.p} goal={goals?.daily_proteins ?? 100} color="var(--protein)" />
            <MacroCard label="Glucides" value={totals.c} goal={goals?.daily_carbs ?? 250} color="var(--carb)" />
            <MacroCard label="Lipides" value={totals.f} goal={goals?.daily_fats ?? 70} color="var(--fat)" />
          </div>

          <Link to="/scan"
            className="flex items-center justify-center gap-3 w-full py-5 rounded-2xl bg-gold text-gold-foreground font-semibold shadow-gold hover:opacity-90 transition">
            <Camera className="w-5 h-5" strokeWidth={2} />
            Scanner mon repas
          </Link>

          <section>
            <h2 className="font-display text-xl font-semibold mb-3">Repas du jour</h2>
            {meals.length === 0 ? (
              <div className="card-premium p-8 text-center text-muted-foreground text-sm">
                Aucun repas scanné aujourd'hui.
              </div>
            ) : (
              <div className="space-y-2">
                {meals.map((m) => (
                  <div key={m.id} className="card-premium p-3 flex items-center gap-3">
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.meal_name} className="w-14 h-14 rounded-xl object-cover" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-secondary" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{m.meal_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(m.scanned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    <div className="font-mono-data text-gold font-semibold">{m.calories}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function MacroCard({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min(100, (value / goal) * 100);
  return (
    <div className="card-premium p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">{label}</div>
      <div className="font-mono-data text-xl font-semibold">{Math.round(value)}<span className="text-xs text-muted-foreground">g</span></div>
      <div className="h-1 rounded-full bg-secondary overflow-hidden mt-3">
        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-[10px] text-muted-foreground mt-1.5 font-mono-data">/ {goal}g</div>
    </div>
  );
}
