import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Lexa — Profil" }] }),
  component: () => <AppShell><Profile /></AppShell>,
});

function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [calories, setCalories] = useState("2000");
  const [proteins, setProteins] = useState("100");
  const [carbs, setCarbs] = useState("250");
  const [fats, setFats] = useState("70");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("user_goals").select("*").eq("user_id", user.id).maybeSingle(),
    ]).then(([p, g]) => {
      if (p.data) {
        setName(p.data.name ?? "");
        setWeight(p.data.weight_kg?.toString() ?? "");
        setHeight(p.data.height_cm?.toString() ?? "");
        setAge(p.data.age?.toString() ?? "");
      }
      if (g.data) {
        setCalories(g.data.daily_calories.toString());
        setProteins(g.data.daily_proteins.toString());
        setCarbs(g.data.daily_carbs.toString());
        setFats(g.data.daily_fats.toString());
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await supabase.from("profiles").upsert({
        id: user.id,
        name: name || null,
        weight_kg: weight ? Number(weight) : null,
        height_cm: height ? Number(height) : null,
        age: age ? Number(age) : null,
      });
      await supabase.from("user_goals").upsert({
        user_id: user.id,
        daily_calories: Number(calories),
        daily_proteins: Number(proteins),
        daily_carbs: Number(carbs),
        daily_fats: Number(fats),
      }, { onConflict: "user_id" });
      toast.success("Profil enregistré");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="px-5 pt-8 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Compte</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1">{user?.email}</p>
      </header>

      <section className="card-premium p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Informations</h2>
        <Field label="Nom" value={name} onChange={setName} />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Poids (kg)" value={weight} onChange={setWeight} type="number" />
          <Field label="Taille (cm)" value={height} onChange={setHeight} type="number" />
          <Field label="Âge" value={age} onChange={setAge} type="number" />
        </div>
      </section>

      <section className="card-premium p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Objectifs journaliers</h2>
        <Field label="Calories (kcal)" value={calories} onChange={setCalories} type="number" />
        <div className="grid grid-cols-3 gap-3">
          <Field label="Prot. (g)" value={proteins} onChange={setProteins} type="number" />
          <Field label="Gluc. (g)" value={carbs} onChange={setCarbs} type="number" />
          <Field label="Lip. (g)" value={fats} onChange={setFats} type="number" />
        </div>
      </section>

      <button onClick={save} disabled={busy}
        className="w-full py-3.5 rounded-xl bg-gold text-gold-foreground font-semibold shadow-gold disabled:opacity-50">
        {busy ? "..." : "Enregistrer"}
      </button>

      <button onClick={handleSignOut}
        className="w-full py-3 rounded-xl border border-border text-muted-foreground font-medium flex items-center justify-center gap-2 hover:text-destructive hover:border-destructive transition">
        <LogOut className="w-4 h-4" /> Se déconnecter
      </button>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:border-gold outline-none transition font-mono-data" />
    </div>
  );
}
