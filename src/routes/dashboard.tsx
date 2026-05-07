import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Flame, Footprints, Target, TrendingDown, TrendingUp, Minus, X } from "lucide-react";
import { stepsToKcal } from "@/lib/nutrition";
import { toast } from "sonner";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Lexa — Tableau de bord" }] }),
  component: () => <AppShell><Dashboard /></AppShell>,
});

interface Goals { daily_calories: number; daily_proteins: number; daily_carbs: number; daily_fats: number; goal_type: string | null; }
interface Profile { name: string | null; weight_kg: number | null; target_weight_kg: number | null; }
interface Ingredient { name: string; quantity_g: number; calories: number; }
interface Meal { id: string; meal_name: string; calories: number; proteins: number; carbs: number; fats: number; photo_url: string | null; scanned_at: string; ingredients: Ingredient[] | null; }

const todayISO = () => new Date().toISOString().slice(0, 10);

function Dashboard() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goals | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [steps, setSteps] = useState<number>(0);
  const [stepsInput, setStepsInput] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [weekScanned, setWeekScanned] = useState<Record<string, number>>({});
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);

  useEffect(() => {
    if (selectedMeal) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [selectedMeal]);

  const load = async () => {
    if (!user) return;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    // Semaine : lundi → dimanche
    const today = new Date();
    const dow = (today.getDay() + 6) % 7; // lundi = 0
    const weekStart = new Date(today); weekStart.setDate(today.getDate() - dow); weekStart.setHours(0,0,0,0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6); weekEnd.setHours(23,59,59,999);

    const [g, m, p, s, wm] = await Promise.all([
      supabase.from("user_goals").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("meals").select("*").eq("user_id", user.id)
        .gte("scanned_at", startOfDay.toISOString())
        .order("scanned_at", { ascending: false }),
      supabase.from("profiles").select("name, weight_kg, target_weight_kg").eq("id", user.id).maybeSingle(),
      supabase.from("daily_logs").select("steps").eq("user_id", user.id).eq("log_date", todayISO()).maybeSingle(),
      supabase.from("meals").select("calories, scanned_at").eq("user_id", user.id)
        .gte("scanned_at", weekStart.toISOString()).lte("scanned_at", weekEnd.toISOString()),
    ]);
    if (g.data) setGoals(g.data as Goals);
    if (m.data) setMeals(m.data as Meal[]);
    if (p.data) setProfile(p.data as Profile);
    if (s.data) { setSteps(s.data.steps); setStepsInput(String(s.data.steps)); }
    // Agréger calories par jour pour la semaine
    const map: Record<string, number> = {};
    (wm.data ?? []).forEach((row) => {
      const d = (row.scanned_at as string).slice(0, 10);
      map[d] = (map[d] ?? 0) + row.calories;
    });
    setWeekScanned(map);
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

  // Semaine affichée (lun → dim)
  const weekDays = useMemo(() => {
    const today = new Date();
    const dow = (today.getDay() + 6) % 7;
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(today.getDate() - dow + i); return d;
    });
  }, []);

  const todayStr = iso(new Date());
  const stepGoal = 10000;
  const stepsPct = Math.min(100, (steps / stepGoal) * 100);
  const r = 40; const circ = 2 * Math.PI * r;
  const dash = (stepsPct / 100) * circ;

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

      {/* Calendrier horizontal semaine */}
      <div className="flex justify-between items-center gap-1">
        {weekDays.map((d) => {
          const k = iso(d);
          const cal = weekScanned[k] ?? 0;
          const isPast = k < todayStr;
          const isToday = k === todayStr;
          const accomplished = isPast && cal >= (goals?.daily_calories ?? 2000) * 0.8;
          const failed = isPast && cal < (goals?.daily_calories ?? 2000) * 0.8;
          const dayLabel = d.toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 1).toUpperCase();

          let ringClass = "border-2 border-transparent";
          let textClass = "text-muted-foreground";
          if (accomplished) { ringClass = "border-2 border-[#4CAF50]"; textClass = "text-[#4CAF50]"; }
          else if (failed) { ringClass = "border-2 border-[#E53935]"; textClass = "text-[#E53935]"; }
          else if (isToday) { ringClass = "border-2 border-gold"; textClass = "text-gold"; }

          return (
            <div key={k} className="flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground uppercase">{dayLabel}</span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${ringClass} ${isToday ? "bg-gold/10" : ""}`}>
                <span className={`font-mono-data text-xs font-semibold ${textClass}`}>{d.getDate()}</span>
              </div>
            </div>
          );
        })}
      </div>

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

          {/* Steps donut + saisie */}
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <Footprints className="w-4 h-4 text-gold" />
              <span className="text-sm text-muted-foreground">Activité du jour</span>
              <span className="ml-auto font-mono-data text-xs text-gold">{burned} kcal</span>
            </div>
            <div className="flex items-center gap-5">
              {/* Donut SVG */}
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r={r} fill="none" stroke="var(--secondary)" strokeWidth="10" />
                  <circle cx="50" cy="50" r={r} fill="none" stroke="#C9A84C" strokeWidth="10"
                    strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
                    style={{ transition: "stroke-dasharray 0.5s ease" }} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-mono-data text-sm font-semibold text-gold">{steps.toLocaleString("fr-FR")}</span>
                  <span className="text-[9px] text-muted-foreground">/ {stepGoal.toLocaleString("fr-FR")}</span>
                </div>
              </div>
              {/* Input */}
              <div className="flex-1 space-y-2">
                <input type="number" inputMode="numeric" min={0}
                  value={stepsInput} onChange={(e) => setStepsInput(e.target.value)}
                  placeholder="Nombre de pas"
                  className="w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:border-gold outline-none transition font-mono-data text-sm"
                />
                <button onClick={saveSteps}
                  className="w-full py-2 rounded-lg bg-gold text-gold-foreground font-semibold text-sm">
                  Enregistrer
                </button>
              </div>
            </div>
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
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-xl font-semibold">Repas du jour</h2>
              {meals.length > 0 && (
                <span className="text-xs text-muted-foreground">{meals.length} repas · {totals.cal} kcal</span>
              )}
            </div>
            {meals.length === 0 ? (
              <div className="card-premium p-8 text-center space-y-2">
                <div className="text-3xl">🍽️</div>
                <p className="text-muted-foreground text-sm">Aucun repas scanné aujourd'hui.</p>
                <p className="text-xs text-muted-foreground">Scanner ton premier repas pour commencer !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meals.map((m) => (
                  <button key={m.id} onClick={() => setSelectedMeal(m)}
                    className="card-premium w-full text-left overflow-hidden hover:border-gold/40 transition group">
                    <div className="flex">
                      {/* Photo grande */}
                      {m.photo_url ? (
                        <img src={m.photo_url} alt={m.meal_name}
                          className="w-24 h-24 object-cover shrink-0 group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-24 h-24 bg-secondary shrink-0 flex items-center justify-center text-2xl">🍽️</div>
                      )}
                      {/* Infos */}
                      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                        <div>
                          <div className="font-semibold text-sm leading-tight truncate">{m.meal_name}</div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {new Date(m.scanned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        {/* Macros mini */}
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary" style={{ color: "var(--protein)" }}>
                            P {Math.round(m.proteins)}g
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary" style={{ color: "var(--carb)" }}>
                            G {Math.round(m.carbs)}g
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary" style={{ color: "var(--fat)" }}>
                            L {Math.round(m.fats)}g
                          </span>
                        </div>
                      </div>
                      {/* Calories */}
                      <div className="flex flex-col items-end justify-between p-3 shrink-0">
                        <span className="font-semibold text-gold text-lg">{m.calories}</span>
                        <span className="text-[10px] text-muted-foreground">kcal</span>
                      </div>
                    </div>
                    {/* Barre macros en bas */}
                    <div className="flex h-1 w-full">
                      {(() => {
                        const total = m.proteins * 4 + m.carbs * 4 + m.fats * 9 || 1;
                        return <>
                          <div style={{ width: `${(m.proteins * 4 / total) * 100}%`, backgroundColor: "var(--protein)" }} />
                          <div style={{ width: `${(m.carbs * 4 / total) * 100}%`, backgroundColor: "var(--carb)" }} />
                          <div style={{ width: `${(m.fats * 9 / total) * 100}%`, backgroundColor: "var(--fat)" }} />
                        </>;
                      })()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Modal détail repas */}
          {selectedMeal && (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
              onClick={() => setSelectedMeal(null)} style={{ touchAction: "none" }}>
              <div className="w-full max-w-md bg-card border border-border rounded-t-3xl animate-fade-up flex flex-col"
                style={{ maxHeight: "90dvh" }} onClick={(e) => e.stopPropagation()}>
                <div className="relative aspect-video shrink-0">
                  {selectedMeal.photo_url
                    ? <img src={selectedMeal.photo_url} alt={selectedMeal.meal_name} className="w-full h-full object-cover rounded-t-3xl" />
                    : <div className="w-full h-full bg-secondary rounded-t-3xl flex items-center justify-center text-4xl">🍽️</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent rounded-t-3xl" />
                  <button onClick={() => setSelectedMeal(null)}
                    className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                    <div>
                      <div className="font-display text-5xl font-bold text-white">{selectedMeal.calories}</div>
                      <div className="text-white/70 text-xs uppercase tracking-widest">kcal</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white/90 text-sm font-semibold">{selectedMeal.meal_name}</div>
                      <div className="text-white/60 text-[11px]">
                        {new Date(selectedMeal.scanned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="overflow-y-auto overscroll-contain flex-1 p-5 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Protéines", value: selectedMeal.proteins, color: "var(--protein)" },
                      { label: "Glucides", value: selectedMeal.carbs, color: "var(--carb)" },
                      { label: "Lipides", value: selectedMeal.fats, color: "var(--fat)" },
                    ].map((macro) => (
                      <div key={macro.label} className="bg-secondary rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{macro.label}</div>
                        <div className="text-lg font-semibold" style={{ color: macro.color }}>
                          {Math.round(macro.value)}<span className="text-xs">g</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                    <div>
                      <h3 className="font-display text-base font-semibold mb-3">Ingrédients</h3>
                      {selectedMeal.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                            <span>{ing.name}</span>
                            <span className="text-muted-foreground text-xs">{ing.quantity_g}g</span>
                          </div>
                          <span className="text-gold text-xs shrink-0">{ing.calories} kcal</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setSelectedMeal(null)}
                    className="w-full py-3 rounded-xl bg-gold text-gold-foreground font-semibold">
                    Fermer
                  </button>
                  <div className="h-2" />
                </div>
              </div>
            </div>
          )}
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