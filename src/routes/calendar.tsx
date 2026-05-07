import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Lexa — Calendrier" }] }),
  component: () => <AppShell><Calendar /></AppShell>,
});

const iso = (d: Date) => d.toISOString().slice(0, 10);

function Calendar() {
  const { user } = useAuth();
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState<string>(iso(new Date()));
  const [calGoal, setCalGoal] = useState(2000);
  const [scanned, setScanned] = useState<Record<string, number>>({});
  const [planned, setPlanned] = useState<Array<{ id: string; planned_date: string; meal_name: string; meal_type: string | null; calories: number; }>>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "dejeuner", calories: "", proteins: "", carbs: "", fats: "" });

  const monthStart = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth(), 1), [cursor]);
  const monthEnd = useMemo(() => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0), [cursor]);

  const load = async () => {
    if (!user) return;
    const start = iso(monthStart); const end = iso(monthEnd);
    const [g, m, p] = await Promise.all([
      supabase.from("user_goals").select("daily_calories").eq("user_id", user.id).maybeSingle(),
      supabase.from("meals").select("calories, scanned_at").eq("user_id", user.id)
        .gte("scanned_at", `${start}T00:00:00Z`).lte("scanned_at", `${end}T23:59:59Z`),
      supabase.from("planned_meals").select("*").eq("user_id", user.id)
        .gte("planned_date", start).lte("planned_date", end).order("planned_date"),
    ]);
    if (g.data) setCalGoal(g.data.daily_calories);
    const map: Record<string, number> = {};
    (m.data ?? []).forEach((row) => {
      const d = (row.scanned_at as string).slice(0, 10);
      map[d] = (map[d] ?? 0) + row.calories;
    });
    setScanned(map);
    setPlanned((p.data ?? []) as typeof planned);
  };

  useEffect(() => { load(); }, [user, cursor]);

  // Build calendar grid (Mon-Sun)
  const grid = useMemo(() => {
    const cells: Array<{ date: Date | null }> = [];
    const firstDow = (monthStart.getDay() + 6) % 7; // Mon=0
    for (let i = 0; i < firstDow; i++) cells.push({ date: null });
    for (let d = 1; d <= monthEnd.getDate(); d++) cells.push({ date: new Date(cursor.getFullYear(), cursor.getMonth(), d) });
    while (cells.length % 7 !== 0) cells.push({ date: null });
    return cells;
  }, [monthStart, monthEnd, cursor]);

  const monthLabel = cursor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const todayStr = iso(new Date());
  const selDate = new Date(selected);
  const isFuture = selDate >= new Date(todayStr);

  const dayPlanned = planned.filter((p) => p.planned_date === selected);
  const dayScanned = scanned[selected] ?? 0;

  const addPlanned = async () => {
    if (!user || !form.name) return;
    const { error } = await supabase.from("planned_meals").insert({
      user_id: user.id, planned_date: selected,
      meal_type: form.type, meal_name: form.name,
      calories: Number(form.calories) || 0,
      proteins: Number(form.proteins) || 0,
      carbs: Number(form.carbs) || 0,
      fats: Number(form.fats) || 0,
    });
    if (error) toast.error(error.message);
    else { toast.success("Repas planifié"); setShowAdd(false); setForm({ name: "", type: "dejeuner", calories: "", proteins: "", carbs: "", fats: "" }); load(); }
  };

  const removePlanned = async (id: string) => {
    const { error } = await supabase.from("planned_meals").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="px-5 pt-8 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Vue d'ensemble</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Calendrier</h1>
      </header>

      <div className="card-premium p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            className="p-2 rounded-lg hover:bg-secondary"><ChevronLeft className="w-4 h-4" /></button>
          <span className="font-display font-semibold capitalize">{monthLabel}</span>
          <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            className="p-2 rounded-lg hover:bg-secondary"><ChevronRight className="w-4 h-4" /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-[10px] text-muted-foreground uppercase tracking-widest mb-2">
          {["L","M","M","J","V","S","D"].map((d, i) => <div key={i} className="text-center">{d}</div>)}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {grid.map((c, i) => {
            if (!c.date) return <div key={i} />;
            const k = iso(c.date);
            const cal = scanned[k] ?? 0;
            const pct = calGoal ? Math.min(100, (cal / calGoal) * 100) : 0;
            const hasPlan = planned.some((p) => p.planned_date === k);
            const isSel = k === selected;
            const isToday = k === todayStr;
            return (
              <button key={i} onClick={() => setSelected(k)}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-xs transition ${
                  isSel ? "bg-gold text-gold-foreground" : isToday ? "bg-secondary text-foreground" : "hover:bg-secondary"
                }`}>
                <span className={`font-mono-data ${isSel ? "" : "text-foreground"}`}>{c.date.getDate()}</span>
                {cal > 0 && !isSel && (
                  <div className="absolute bottom-1 left-1 right-1 h-[3px] rounded-full bg-secondary overflow-hidden">
                    <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {hasPlan && (
                  <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${isSel ? "bg-gold-foreground" : "bg-gold"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="card-premium p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Sélection</p>
            <h2 className="font-display text-lg font-semibold capitalize">
              {selDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
            </h2>
          </div>
          {isFuture && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold text-gold-foreground text-xs font-semibold">
              <Plus className="w-3.5 h-3.5" /> Planifier
            </button>
          )}
        </div>

        <div className="text-sm text-muted-foreground mb-3 font-mono-data">
          {dayScanned} kcal scannées · objectif {calGoal} kcal
        </div>

        {dayPlanned.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {isFuture ? "Aucun repas planifié." : "Aucun repas prévu ce jour."}
          </p>
        ) : (
          <div className="space-y-2">
            {dayPlanned.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm">{p.meal_name}</div>
                  <div className="text-[11px] text-muted-foreground capitalize">{p.meal_type}</div>
                </div>
                <span className="font-mono-data text-gold text-sm">{p.calories}</span>
                <button onClick={() => removePlanned(p.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="card-premium p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Planifier un repas</h3>
              <button onClick={() => setShowAdd(false)}><X className="w-5 h-5" /></button>
            </div>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du plat"
              className="w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:border-gold outline-none" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:border-gold outline-none">
              <option value="petit-dej">Petit-déjeuner</option>
              <option value="dejeuner">Déjeuner</option>
              <option value="diner">Dîner</option>
              <option value="collation">Collation</option>
            </select>
            <div className="grid grid-cols-4 gap-2">
              {(["calories","proteins","carbs","fats"] as const).map((k) => (
                <input key={k} type="number" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                  placeholder={k === "calories" ? "kcal" : `${k.slice(0,4)} g`}
                  className="px-2 py-2 rounded-lg bg-input border border-border focus:border-gold outline-none font-mono-data text-sm" />
              ))}
            </div>
            <button onClick={addPlanned} disabled={!form.name}
              className="w-full py-3 rounded-xl bg-gold text-gold-foreground font-semibold disabled:opacity-50">
              Ajouter au calendrier
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
