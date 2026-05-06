import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/history")({
  head: () => ({ meta: [{ title: "Lexa — Historique" }] }),
  component: () => <AppShell><History /></AppShell>,
});

interface Meal { id: string; meal_name: string; calories: number; photo_url: string | null; scanned_at: string; }

function History() {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from("meals").select("*").eq("user_id", user.id)
      .order("scanned_at", { ascending: false }).limit(200)
      .then(({ data }) => {
        if (data) setMeals(data as Meal[]);
        setLoading(false);
      });
  }, [user]);

  // Group by day
  const groups = meals.reduce<Record<string, Meal[]>>((acc, m) => {
    const day = new Date(m.scanned_at).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    (acc[day] = acc[day] || []).push(m);
    return acc;
  }, {});

  return (
    <div className="px-5 pt-8 space-y-6">
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
                {list.map((m) => (
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
            </section>
          );
        })
      )}
    </div>
  );
}
