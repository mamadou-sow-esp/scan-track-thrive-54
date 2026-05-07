import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Flame, Apple, Activity } from "lucide-react";

export const Route = createFileRoute("/progress")({
  head: () => ({ meta: [{ title: "Lexa — Progrès" }] }),
  component: () => <AppShell><ProgressPage /></AppShell>,
});

type Range = "7j" | "30j" | "90j" | "tout";

interface DayData {
  date: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  logged: boolean;
}

function ProgressPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<Range>("7j");
  const [days, setDays] = useState<DayData[]>([]);
  const [calGoal, setCalGoal] = useState(2000);
  const [loading, setLoading] = useState(true);
  const [hovered, setHovered] = useState<DayData | null>(null);

  useEffect(() => {
    if (!user) return;
    const n = range === "7j" ? 7 : range === "30j" ? 30 : range === "90j" ? 90 : 180;
    const from = new Date();
    from.setDate(from.getDate() - n);

    Promise.all([
      supabase.from("user_goals").select("daily_calories").eq("user_id", user.id).maybeSingle(),
      supabase.from("meals").select("calories, proteins, carbs, fats, scanned_at")
        .eq("user_id", user.id)
        .gte("scanned_at", from.toISOString())
        .order("scanned_at", { ascending: true }),
    ]).then(([g, m]) => {
      if (g.data) setCalGoal(g.data.daily_calories);

      // Agréger par jour
      const map: Record<string, DayData> = {};
      for (let i = 0; i < n; i++) {
        const d = new Date(); d.setDate(d.getDate() - (n - 1 - i));
        const k = d.toISOString().slice(0, 10);
        map[k] = { date: k, calories: 0, proteins: 0, carbs: 0, fats: 0, logged: false };
      }
      (m.data ?? []).forEach((row) => {
        const k = (row.scanned_at as string).slice(0, 10);
        if (map[k]) {
          map[k].calories += row.calories;
          map[k].proteins += Number(row.proteins);
          map[k].carbs += Number(row.carbs);
          map[k].fats += Number(row.fats);
          map[k].logged = true;
        }
      });
      setDays(Object.values(map));
      setLoading(false);
    });
  }, [user, range]);

  const stats = useMemo(() => {
    const logged = days.filter(d => d.logged);
    const total = logged.reduce((s, d) => s + d.calories, 0);
    const avg = logged.length ? Math.round(total / logged.length) : 0;
    const goalDays = logged.filter(d => d.calories >= calGoal * 0.8).length;
    const streak = (() => {
      let s = 0;
      for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].logged) s++; else break;
      }
      return s;
    })();
    return { logged: logged.length, avg, goalDays, streak, total };
  }, [days, calGoal]);

  // Graphique calories
  const maxCal = Math.max(...days.map(d => d.calories), calGoal, 1);
  const chartDays = days.slice(-Math.min(days.length, range === "7j" ? 7 : range === "30j" ? 14 : 21));

  const ranges: { v: Range; label: string }[] = [
    { v: "7j", label: "7 jours" },
    { v: "30j", label: "30 jours" },
    { v: "90j", label: "90 jours" },
    { v: "tout", label: "Tout" },
  ];

  return (
    <div className="px-5 pt-6 space-y-6 pb-8">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Statistiques</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Progrès</h1>
      </header>

      {/* Sélecteur de période */}
      <div className="flex gap-2 bg-secondary rounded-xl p-1">
        {ranges.map(r => (
          <button key={r.v} onClick={() => setRange(r.v)}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition ${
              range === r.v ? "bg-gold text-gold-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}>
            {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground py-12">Chargement…</div>
      ) : (
        <>
          {/* Cards stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<Apple className="w-5 h-5" />}
              label="Jours loggés"
              value={stats.logged}
              sub={`sur ${days.length} jours`}
              pct={days.length ? stats.logged / days.length : 0}
            />
            <StatCard
              icon={<Flame className="w-5 h-5" />}
              label="Moy. calories"
              value={stats.avg}
              sub="kcal / jour"
              pct={calGoal ? stats.avg / calGoal : 0}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Objectif atteint"
              value={stats.goalDays}
              sub={`jours ≥ 80% objectif`}
              pct={stats.logged ? stats.goalDays / stats.logged : 0}
            />
            <StatCard
              icon={<Activity className="w-5 h-5" />}
              label="Streak actuel"
              value={stats.streak}
              sub="jours consécutifs"
              pct={Math.min(1, stats.streak / 7)}
            />
          </div>

          {/* Graphique calories */}
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-base font-semibold">Calories / jour</h2>
              {hovered && (
                <div className="text-right">
                  <div className="font-mono-data text-sm text-gold font-semibold">{Math.round(hovered.calories)} kcal</div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(hovered.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </div>
                </div>
              )}
            </div>

            {/* Ligne objectif + barres */}
            <div className="relative">
              <div className="flex items-end gap-1 h-36">
                {chartDays.map((d) => {
                  const h = d.calories ? Math.max(4, (d.calories / maxCal) * 144) : 0;
                  const goalH = (calGoal / maxCal) * 144;
                  const accomplished = d.logged && d.calories >= calGoal * 0.8;
                  const failed = d.logged && d.calories < calGoal * 0.8;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group"
                      onMouseEnter={() => setHovered(d)} onMouseLeave={() => setHovered(null)}
                      onTouchStart={() => setHovered(d)} onTouchEnd={() => setHovered(null)}>
                      <div className="relative w-full flex items-end justify-center" style={{ height: 144 }}>
                        {/* Ligne objectif */}
                        <div className="absolute left-0 right-0 border-t border-dashed border-gold/30"
                          style={{ bottom: goalH }} />
                        {/* Barre */}
                        <div
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            !d.logged ? "bg-secondary" :
                            accomplished ? "bg-[#4CAF50]" :
                            failed ? "bg-[#E53935]/70" : "bg-gold"
                          }`}
                          style={{ height: h }}
                        />
                      </div>
                      <span className="text-[8px] text-muted-foreground">
                        {new Date(d.date).toLocaleDateString("fr-FR", { day: "numeric" })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Légende */}
            <div className="flex gap-4 mt-3 pt-3 border-t border-border">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#4CAF50]" />
                <span className="text-[10px] text-muted-foreground">Objectif atteint</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-[#E53935]/70" />
                <span className="text-[10px] text-muted-foreground">En dessous</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm bg-secondary border border-border" />
                <span className="text-[10px] text-muted-foreground">Non loggé</span>
              </div>
            </div>
          </div>

          {/* Graphique macros moyen */}
          <div className="card-premium p-5">
            <h2 className="font-display text-base font-semibold mb-4">Moyenne macros</h2>
            {(() => {
              const logged = days.filter(d => d.logged);
              const n = logged.length || 1;
              const avgP = Math.round(logged.reduce((s, d) => s + d.proteins, 0) / n);
              const avgC = Math.round(logged.reduce((s, d) => s + d.carbs, 0) / n);
              const avgF = Math.round(logged.reduce((s, d) => s + d.fats, 0) / n);
              const total = avgP * 4 + avgC * 4 + avgF * 9 || 1;
              const macros = [
                { label: "Protéines", value: avgP, kcal: avgP * 4, color: "var(--protein)", pct: (avgP * 4 / total) * 100 },
                { label: "Glucides", value: avgC, kcal: avgC * 4, color: "var(--carb)", pct: (avgC * 4 / total) * 100 },
                { label: "Lipides", value: avgF, kcal: avgF * 9, color: "var(--fat)", pct: (avgF * 9 / total) * 100 },
              ];
              return (
                <div className="space-y-3">
                  {/* Barre empilée */}
                  <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                    {macros.map(m => (
                      <div key={m.label} style={{ width: `${m.pct}%`, backgroundColor: m.color }} className="rounded-full" />
                    ))}
                  </div>
                  {macros.map(m => (
                    <div key={m.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                        <span className="text-sm">{m.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono-data text-xs text-muted-foreground">{Math.round(m.pct)}%</span>
                        <span className="font-mono-data text-sm font-semibold" style={{ color: m.color }}>{m.value}g</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Message motivation */}
          {stats.streak >= 3 && (
            <div className="card-premium p-4 border-gold/30 bg-gold/5">
              <p className="text-sm text-gold font-semibold text-center">
                🔥 {stats.streak} jours de suite — continue comme ça !
              </p>
            </div>
          )}
          {stats.streak === 0 && (
            <div className="card-premium p-4">
              <p className="text-sm text-muted-foreground text-center">
                Scanner ton premier repas aujourd'hui pour démarrer ta streak !
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, pct }: {
  icon: React.ReactNode; label: string; value: number; sub: string; pct: number;
}) {
  const r = 22; const circ = 2 * Math.PI * r;
  const dash = Math.min(1, pct) * circ;
  return (
    <div className="card-premium p-4 flex items-center gap-3">
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 52 52" className="w-full h-full -rotate-90">
          <circle cx="26" cy="26" r={r} fill="none" stroke="var(--secondary)" strokeWidth="5" />
          <circle cx="26" cy="26" r={r} fill="none" stroke="var(--gold)" strokeWidth="5"
            strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-gold">
          {icon}
        </div>
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
        <div className="font-mono-data text-xl font-semibold mt-0.5">{value}</div>
        <div className="text-[10px] text-muted-foreground truncate">{sub}</div>
      </div>
    </div>
  );
}