import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Flame, Footprints, Target, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { stepsToKcal } from "@/lib/nutrition";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Lexa — Tableau de bord" }] }),
  component: () => <AppShell><Dashboard /></AppShell>,
});

interface Goals { daily_calories: number; daily_proteins: number; daily_carbs: number; daily_fats: number; goal_type: string | null; }
interface Profile { name: string | null; weight_kg: number | null; target_weight_kg: number | null; }
interface Meal { id: string; meal_name: string; calories: number; proteins: number; carbs: number; fats: number; photo_url: string | null; scanned_at: string; }

const todayISO = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goals | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [steps, setSteps] = useState<number>(0);
  const [stepsInput, setStepsInput] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const [g, m, p, s] = await Promise.all([
      supabase.from("user_goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("meals").select("*").eq("user_id", user.id)
        .gte("scanned_at", startOfDay.toISOString())
        .order("scanned_at", { ascending: false }),
      supabase.from("profiles").select("name, weight_kg, target_weight_kg").eq("id", user.id).maybeSingle(),
      supabase.from("daily_logs").select("steps").eq("user_id", user.id).eq("log_date", todayISO()).maybeSingle(),
    ]);
    if (g.data) setGoals(g.data as Goals);
    if (m.data) setMeals(m.data as Meal[]);
    if (p.data) setProfile(p.data as Profile);
    if (s.data) { setSteps(s.data.steps); setStepsInput(String(s.data.steps)); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const totals = meals.reduce((a, m) => ({
    cal: a.cal + m.calories, p: a.p + Number(m.proteins),
    c: a.c + Number(m.carbs), f: a.f + Number(m.fats),
  }), { cal: 0, p: 0, c: 0, f: 0 });

  const calGoal = goals?.daily_calories ?? 2000;
  const burned = stepsToKcal(steps, profile?.weight_kg ?? null);
  const netRemaining = Math.max(0, calGoal - totals.cal + burned);
  const calPct = Math.min(100, Math.round((totals.cal / calGoal) * 100));

  const goalType = goals?.goal_type ?? "maintain";
  const GoalIcon = goalType === "lose" ? TrendingDown : goalType === "gain" ? TrendingUp : Minus;
  const goalLabel = goalType === "lose" ? "Perte de poids" : goalType === "gain" ? "Prise de masse" : "Maintien";

  const saveSteps = async () => {
    if (!user) return;
    const n = Math.max(0, Math.round(Number(stepsInput) || 0));
    const { error } = await supabase.from("daily_logs").upsert(
      { user_id: user.id, log_date: todayISO(), steps: n },
      { onConflict: "user_id,log_date" }
    );
    if (error) toast.error("Erreur d'enregistrement");
    else { setSteps(n); toast.success("Pas enregistrés"); }
  };

  // Weight progress
  const weightProgress = (() => {
    if (!profile?.weight_kg || !profile?.target_weight_kg) return null;
    const start = profile.weight_kg;
    const target = profile.target_weight_kg;
    const diff = Math.abs(start - target);
    return { start, target, diff };
  })();

  return (
    <div className="px-5 pt-8 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Aujourd'hui</p>
          <h1 className="font-display text-3xl font-semibold mt-1">Bonjour{profile?.name ? `, ${profile.name}` : ""}</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs">
          <GoalIcon className="w-3.5 h-3.5 text-gold" />
          <span className="text-muted-foreground">{goalLabel}</span>
        </div>
      </header>

      {loading ? (
        <div className="card-premium p-8 text-center text-muted-foreground">Chargement…</div>
      ) : (
        <>
          {/* Calories */}
          <div className="card-premium p-6">
            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-gold" />
                <span className="text-sm text-muted-foreground">Calories</span>
              </div>
              <span className="font-mono-data text-xs text-muted-foreground">{totals.cal} / {calGoal} kcal</span>
            </div>
            <div className="font-display text-5xl font-semibold text-gold mb-1">
              {netRemaining}
              <span className="text-base text-muted-foreground font-sans ml-2">restantes</span>
            </div>
            {burned > 0 && (
              <p className="text-xs text-muted-foreground mb-4 font-mono-data">+ {burned} kcal brûlées via activité</p>
            )}
            <div className="h-2 rounded-full bg-secondary overflow-hidden mt-3">
              <div className="h-full bg-gold transition-all duration-500" style={{ width: `${calPct}%` }} />
            </div>
          </div>

          {/* Macros */}
          <div className="grid grid-cols-3 gap-3">
            <MacroCard label="Protéines" value={totals.p} goal={goals?.daily_proteins ?? 100} color="var(--protein)" />
            <MacroCard label="Glucides" value={totals.c} goal={goals?.daily_carbs ?? 250} color="var(--carb)" />
            <MacroCard label="Lipides" value={totals.f} goal={goals?.daily_fats ?? 70} color="var(--fat)" />
          </div>

          {/* Steps tracker */}
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-gold" />
                <span className="text-sm text-muted-foreground">Activité du jour</span>
              </div>
              <span className="font-mono-data text-xs text-gold">{burned} kcal</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number" inputMode="numeric" min={0}
                value={stepsInput} onChange={(e) => setStepsInput(e.target.value)}
                placeholder="Nombre de pas"
                className="flex-1 px-3 py-2.5 rounded-lg bg-input border border-border focus:border-gold outline-none transition font-mono-data"
              />
              <button onClick={saveSteps}
                className="px-4 py-2.5 rounded-lg bg-gold text-gold-foreground font-semibold text-sm">
                Enregistrer
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Estimation auto : {steps.toLocaleString("fr-FR")} pas aujourd'hui</p>
          </div>

          {/* Weight progress */}
          {weightProgress && (
            <div className="card-premium p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gold" />
                  <span className="text-sm text-muted-foreground">Objectif poids</span>
                </div>
                <span className="font-mono-data text-xs text-muted-foreground">
                  {weightProgress.start} → {weightProgress.target} kg
                </span>
              </div>
              <div className="font-display text-2xl font-semibold">
                {weightProgress.diff.toFixed(1)} <span className="text-sm text-muted-foreground font-sans">kg à {goalType === "lose" ? "perdre" : goalType === "gain" ? "prendre" : "maintenir"}</span>
              </div>
            </div>
          )}

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
