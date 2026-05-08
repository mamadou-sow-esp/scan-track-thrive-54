import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Lexa — Historique" }] }),
  component: () => <AppShell><History /></AppShell>,
});

interface Ingredient { name: string; quantity_g: number; calories: number; }
interface Meal {
  id: string; meal_name: string; calories: number; proteins: number;
  carbs: number; fats: number; portion_g: number; notes: string | null;
  photo_url: string | null; scanned_at: string;
  ingredients: Ingredient[] | null;
}

function History() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Meal | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bloquer le scroll quand le modal est ouvert
  useEffect(() => {
    if (selected) {
      document.documentElement.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
    }
    return () => { document.documentElement.style.overflow = ""; };
  }, [selected]);

  const load = () => {
    if (!user) return;
    // Cache court pour l'historique
    const cacheKey = "lexa_history_v1";
    try {
      const raw = sessionStorage.getItem(cacheKey);
      if (raw) {
        const { data, ts } = JSON.parse(raw);
        if (Date.now() - ts < 30000) { setMeals(data); setLoading(false); return; }
      }
    } catch {}

    supabase.from("meals").select("*").eq("user_id", user.id)
      .order("scanned_at", { ascending: false }).limit(200)
      .then(({ data }) => {
        if (data) {
          setMeals(data as Meal[]);
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ data, ts: Date.now() })); } catch {}
        }
        setLoading(false);
      });
  };

  useEffect(() => { load(); }, [user]);

  const deleteMeal = async (id: string) => {
    setDeleting(true);
    const { error } = await supabase.from("meals").delete().eq("id", id);
    if (error) toast.error("Erreur lors de la suppression");
    else {
      toast.success("Repas supprimé");
      try { sessionStorage.removeItem("lexa_history_v1"); sessionStorage.removeItem("lexa_dashboard_v1"); } catch {}
      setSelected(null); load();
    }
    setDeleting(false);
  };

  const groups = meals.reduce<Record<string, Meal[]>>((acc, m) => {
    const day = new Date(m.scanned_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    (acc[day] = acc[day] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="px-5 pt-8 space-y-6 pb-6 animate-fade-up">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Journal</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Historique</h1>
      </header>

      {loading ? (
        <div className="text-muted-foreground text-center py-12">Chargement…</div>
      ) : meals.length === 0 ? (
        <div className="card-premium p-8 text-center text-muted-foreground">Aucun repas enregistré.</div>
      ) : (
        Object.entries(groups).map(([day, list]) => {
          const total = list.reduce((s, m) => s + m.calories, 0);
          return (
            <section key={day}>
              <div className="flex items-baseline justify-between mb-3 px-1">
                <h2 className="font-display text-lg font-semibold capitalize">{day}</h2>
                <span className="font-mono-data text-sm text-gold">{total} kcal</span>
              </div>
              <div className="space-y-2">
                {list.map((m, idx) => (
                  <button key={m.id} onClick={() => setSelected(m)}
                    className={`card-premium p-3 flex items-center gap-3 w-full text-left hover:border-gold/40 transition btn-press animate-fade-up stagger-${Math.min(idx + 1, 6)}`}>
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.meal_name} loading="lazy" decoding="async" className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      : <div className="w-14 h-14 rounded-xl bg-secondary shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{m.meal_name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {new Date(m.scanned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        {m.portion_g ? ` · ${m.portion_g}g` : ""}
                      </div>
                      {/* Mini macros */}
                      <div className="flex gap-2 mt-1.5">
                        <span className="text-[10px] font-mono-data" style={{ color: "var(--protein)" }}>P {Math.round(m.proteins)}g</span>
                        <span className="text-[10px] font-mono-data" style={{ color: "var(--carb)" }}>G {Math.round(m.carbs)}g</span>
                        <span className="text-[10px] font-mono-data" style={{ color: "var(--fat)" }}>L {Math.round(m.fats)}g</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono-data text-gold font-semibold">{m.calories}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })
      )}

      {/* ── MODAL DÉTAIL ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
          style={{ touchAction: "none" }}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-t-3xl animate-modal-up flex flex-col"
            style={{ maxHeight: "90dvh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photo header — fixe, ne scrolle pas */}
            <div className="relative shrink-0" style={{ height: "220px" }}>
              {selected.photo_url
                ? <img src={selected.photo_url} alt={selected.meal_name} loading="lazy" decoding="async" className="w-full h-full object-cover rounded-t-3xl" />
                : <div className="w-full h-full bg-secondary rounded-t-3xl" />}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-t-3xl" />
              <button onClick={() => setSelected(null)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <div className="font-display text-4xl font-bold text-white leading-none">{selected.calories}</div>
                  <div className="text-white/70 text-xs uppercase tracking-widest mt-0.5">kcal</div>
                </div>
                <div className="text-right">
                  <div className="text-white/90 text-sm font-semibold max-w-[160px] text-right">{selected.meal_name}</div>
                  {selected.portion_g > 0 && (
                    <div className="text-white/60 text-[11px]">~{selected.portion_g}g</div>
                  )}
                </div>
              </div>
            </div>

            {/* Contenu scrollable */}
            <div className="overflow-y-auto overscroll-contain flex-1 p-5 space-y-5 pb-8">
              <p className="text-xs text-muted-foreground capitalize">
                {new Date(selected.scanned_at).toLocaleDateString("fr-FR", {
                  weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit"
                })}
              </p>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Protéines", value: selected.proteins, color: "var(--protein)" },
                  { label: "Glucides", value: selected.carbs, color: "var(--carb)" },
                  { label: "Lipides", value: selected.fats, color: "var(--fat)" },
                ].map((m) => (
                  <div key={m.label} className="bg-secondary rounded-xl p-3 text-center">
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{m.label}</div>
                    <div className="font-mono-data text-lg font-semibold" style={{ color: m.color }}>
                      {Math.round(m.value)}<span className="text-xs">g</span>
                    </div>
                  </div>
                ))}
              </div>

              {selected.ingredients && selected.ingredients.length > 0 && (
                <div>
                  <h3 className="font-display text-base font-semibold mb-3">Ingrédients</h3>
                  <div className="space-y-1">
                    {selected.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
                          <span>{ing.name}</span>
                          <span className="text-muted-foreground font-mono-data text-xs">{ing.quantity_g}g</span>
                        </div>
                        <span className="font-mono-data text-gold text-xs shrink-0">{ing.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selected.notes && (
                <div className="bg-secondary rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">{selected.notes}</p>
                </div>
              )}

              <button onClick={() => deleteMeal(selected.id)} disabled={deleting}
                className="w-full py-3 rounded-xl border border-destructive/40 text-destructive font-medium flex items-center justify-center gap-2 hover:bg-destructive/5 transition disabled:opacity-50">
                <Trash2 className="w-4 h-4" />
                {deleting ? "Suppression…" : "Supprimer ce repas"}
              </button>

              {/* Espace pour la safe area iOS */}
              <div className="h-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}