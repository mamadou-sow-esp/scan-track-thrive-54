import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Sparkles, TrendingDown, Minus, TrendingUp, Clock } from "lucide-react";
import { calcTargets, type Sex, type Activity, type GoalType } from "@/lib/nutrition";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Lexa — Profil" }] }),
  component: () => <AppShell><Profile /></AppShell>,
});

function Profile() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState("");
  const [target, setTarget] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState<Sex>("male");
  const [activity, setActivity] = useState<Activity>("moderate");
  const [goalType, setGoalType] = useState<GoalType>("maintain");
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
        setTarget(p.data.target_weight_kg?.toString() ?? "");
        setHeight(p.data.height_cm?.toString() ?? "");
        setAge(p.data.age?.toString() ?? "");
        if (p.data.sex === "male" || p.data.sex === "female") setSex(p.data.sex);
        if (p.data.activity_level) setActivity(p.data.activity_level as Activity);
      }
      if (g.data) {
        setCalories(g.data.daily_calories.toString());
        setProteins(g.data.daily_proteins.toString());
        setCarbs(g.data.daily_carbs.toString());
        setFats(g.data.daily_fats.toString());
        if (g.data.goal_type === "lose" || g.data.goal_type === "maintain" || g.data.goal_type === "gain") {
          setGoalType(g.data.goal_type);
        }
      }
    });
  }, [user]);

  const autoCalc = () => {
    const w = Number(weight), h = Number(height), a = Number(age);
    if (!w || !h || !a) { toast.error("Renseigne poids, taille et âge."); return; }
    const t = calcTargets({ sex, weight: w, height: h, age: a, activity, goal: goalType });
    setCalories(String(t.daily_calories));
    setProteins(String(t.daily_proteins));
    setCarbs(String(t.daily_carbs));
    setFats(String(t.daily_fats));
    toast.success(`Objectifs calculés (TDEE ${t.tdee} kcal)`);
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await supabase.from("profiles").upsert({
        id: user.id,
        name: name || null,
        weight_kg: weight ? Number(weight) : null,
        target_weight_kg: target ? Number(target) : null,
        height_cm: height ? Number(height) : null,
        age: age ? Number(age) : null,
        sex, activity_level: activity,
      });
      await supabase.from("user_goals").upsert({
        user_id: user.id,
        daily_calories: Number(calories),
        daily_proteins: Number(proteins),
        daily_carbs: Number(carbs),
        daily_fats: Number(fats),
        goal_type: goalType,
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

  const goals: Array<{ v: GoalType; label: string; Icon: typeof TrendingDown }> = [
    { v: "lose", label: "Perdre", Icon: TrendingDown },
    { v: "maintain", label: "Maintenir", Icon: Minus },
    { v: "gain", label: "Prendre", Icon: TrendingUp },
  ];

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
        <div className="grid grid-cols-2 gap-3">
          <Selector label="Sexe" value={sex} onChange={(v) => setSex(v as Sex)}
            options={[{ v: "male", l: "Homme" }, { v: "female", l: "Femme" }]} />
          <Field label="Âge" value={age} onChange={setAge} type="number" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Poids (kg)" value={weight} onChange={setWeight} type="number" />
          <Field label="Taille (cm)" value={height} onChange={setHeight} type="number" />
          <Field label="Cible (kg)" value={target} onChange={setTarget} type="number" />
        </div>
        <Selector label="Niveau d'activité" value={activity} onChange={(v) => setActivity(v as Activity)}
          options={[
            { v: "sedentary", l: "Sédentaire" },
            { v: "light", l: "Léger" },
            { v: "moderate", l: "Modéré" },
            { v: "active", l: "Actif" },
            { v: "very_active", l: "Très actif" },
          ]} />
      </section>

      <section className="card-premium p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold">Objectif</h2>
        <div className="grid grid-cols-3 gap-2">
          {goals.map(({ v, label, Icon }) => (
            <button key={v} onClick={() => setGoalType(v)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border transition ${
                goalType === v ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground hover:border-foreground"
              }`}>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>

        <button onClick={autoCalc}
          className="w-full py-2.5 rounded-lg border border-gold/40 text-gold text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gold/5">
          <Sparkles className="w-4 h-4" /> Calculer automatiquement
        </button>

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

      <Link to="/history"
        className="w-full py-3 rounded-xl border border-border text-muted-foreground font-medium flex items-center justify-center gap-2 hover:text-foreground transition">
        <Clock className="w-4 h-4" /> Voir l'historique complet
      </Link>

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

function Selector({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg bg-input border border-border focus:border-gold outline-none transition">
        {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
