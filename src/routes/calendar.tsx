import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, Plus, Trash2, X } from "lucide-react";
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
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  const scanImage = async (file: File) => {
    setScanning(true);
    try {
      // Convertir en base64 data URL (comme le scanner)
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke("scan-meal", {
        body: { image: dataUrl },
      });

      if (error) throw error;
      if (!data?.result) throw new Error("Aucune analyse retournée");

      const result = data.result;
      setForm(f => ({
        ...f,
        name: result.meal_name ?? f.name,
        calories: String(result.calories ?? ""),
        proteins: String(result.proteins ?? ""),
        carbs: String(result.carbs ?? ""),
        fats: String(result.fats ?? ""),
      }));
      toast.success("Plat analysé par Lexa ✨");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'analyser l'image");
    } finally {
      setScanning(false);
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
    scanImage(file);
  };

  const resetModal = () => {
    setShowAdd(false);
    setPhotoPreview(null);
    setScanning(false);
    setForm({ name: "", type: "dejeuner", calories: "", proteins: "", carbs: "", fats: "" });
  };

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
    else { toast.success("Repas planifié"); resetModal(); load(); }
  };

  const removePlanned = async (id: string) => {
    const { error } = await supabase.from("planned_meals").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="px-5 pt-8 space-y-6 animate-fade-up">
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
            const isPast = k < todayStr;
            const isToday = k === todayStr;
            const isFutureDay = k > todayStr;
            const isSel = k === selected;
            const hasPlan = planned.some((p) => p.planned_date === k);

            // Statut du jour
            const accomplished = isPast && cal > 0 && cal >= calGoal * 0.8; // >=80% objectif = vert
            const failed = isPast && (cal === 0 || cal < calGoal * 0.8);     // <80% = rouge
            const inProgress = isToday;                                        // aujourd'hui = or/progression

            // Couleur du cercle
            let ringColor = "";
            if (accomplished) ringColor = "ring-2 ring-[#4CAF50]";
            else if (failed) ringColor = "ring-2 ring-[#E53935]";
            else if (inProgress) ringColor = "ring-2 ring-gold";

            // Couleur du texte intérieur
            let textColor = "text-foreground";
            if (accomplished) textColor = "text-[#4CAF50]";
            else if (failed) textColor = "text-[#E53935]";
            else if (inProgress) textColor = "text-gold";
            if (isSel) textColor = "text-gold-foreground";

            return (
              <button key={i} onClick={() => setSelected(k)}
                className={`relative aspect-square rounded-full flex flex-col items-center justify-center text-xs transition
                  ${isSel ? "bg-gold" : "hover:bg-secondary"}
                  ${!isSel ? ringColor : ""}
                `}>
                <span className={`font-mono-data text-[11px] font-semibold ${isSel ? "text-gold-foreground" : textColor}`}>
                  {c.date.getDate()}
                </span>

                {/* Point plan futur */}
                {hasPlan && isFutureDay && (
                  <span className={`absolute bottom-1 w-1 h-1 rounded-full ${isSel ? "bg-gold-foreground" : "bg-gold"}`} />
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
              <button onClick={resetModal}><X className="w-5 h-5" /></button>
            </div>

            {/* Zone upload photo */}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            <button onClick={() => fileRef.current?.click()}
              className="w-full rounded-xl border-2 border-dashed border-border hover:border-gold transition overflow-hidden"
              disabled={scanning}>
              {photoPreview ? (
                <div className="relative">
                  <img src={photoPreview} alt="plat" className="w-full h-40 object-cover" />
                  {scanning && (
                    <div className="absolute inset-0 bg-background/70 flex flex-col items-center justify-center gap-2">
                      <Loader2 className="w-6 h-6 text-gold animate-spin" />
                      <span className="text-xs text-gold font-semibold">Lexa analyse ton plat…</span>
                    </div>
                  )}
                  {!scanning && (
                    <div className="absolute bottom-2 right-2 px-2 py-1 rounded-lg bg-background/80 text-[10px] text-gold font-semibold">
                      ✨ Analysé
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-muted-foreground">
                  <ImagePlus className="w-7 h-7" />
                  <span className="text-xs">Ajouter une photo — Lexa remplit les données</span>
                </div>
              )}
            </button>

            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nom du plat"
              className="w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:border-gold outline-none" />

            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:border-gold outline-none">
              <option value="petit-dej">Petit-déjeuner</option>
              <option value="dejeuner">Déjeuner</option>
              <option value="diner">Dîner</option>
              <option value="collation">Collation</option>
            </select>

            <div className="grid grid-cols-4 gap-2">
              {(["calories", "proteins", "carbs", "fats"] as const).map((k) => (
                <div key={k} className="relative">
                  <input type="number" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    placeholder={k === "calories" ? "kcal" : `${k.slice(0, 4)} g`}
                    className={`w-full px-2 py-2 rounded-lg bg-input border focus:border-gold outline-none font-mono-data text-sm transition
                      ${form[k] && !scanning ? "border-gold/50 text-gold" : "border-border"}`} />
                </div>
              ))}
            </div>

            <button onClick={addPlanned} disabled={!form.name || scanning}
              className="w-full py-3 rounded-xl bg-gold text-gold-foreground font-semibold disabled:opacity-50">
              {scanning ? "Analyse en cours…" : "Ajouter au calendrier"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}