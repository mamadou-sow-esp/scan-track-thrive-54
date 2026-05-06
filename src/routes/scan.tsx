import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Upload, Loader2, Check, RotateCcw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "Lexa — Scanner" }] }),
  component: () => <AppShell><ScanPage /></AppShell>,
});

interface ScanResult {
  meal_name: string;
  portion_g: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  ingredients: { name: string; quantity_g: number; calories: number }[];
  confidence: string;
  notes?: string;
}

function ScanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);

  const handleFile = (file: File) => {
    setResult(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setImageBase64(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("scan-meal", {
        body: { image: imageBase64 },
      });
      if (error) throw error;
      if (!data?.result) throw new Error("Aucune analyse retournée");
      setResult(data.result as ScanResult);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'analyse");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async () => {
    if (!result || !user || !imageBase64) return;
    setSaving(true);
    try {
      // Upload photo
      const blob = await (await fetch(imageBase64)).blob();
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("meals").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("meals").getPublicUrl(path);

      const { error } = await supabase.from("meals").insert({
        user_id: user.id,
        photo_url: pub.publicUrl,
        meal_name: result.meal_name,
        ingredients: result.ingredients,
        calories: result.calories,
        proteins: result.proteins,
        carbs: result.carbs,
        fats: result.fats,
        portion_g: result.portion_g,
        notes: result.notes ?? null,
      });
      if (error) throw error;
      toast.success("Repas ajouté à ton journal");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setImageBase64(null);
    setResult(null);
  };

  return (
    <div className="px-5 pt-8 space-y-6">
      <header>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Scanner</p>
        <h1 className="font-display text-3xl font-semibold mt-1">Analyse ton plat</h1>
      </header>

      {!preview && (
        <div className="card-premium p-8 space-y-4">
          <div className="aspect-square rounded-xl bg-secondary border border-border border-dashed flex items-center justify-center">
            <Camera className="w-12 h-12 text-muted-foreground" strokeWidth={1.25} />
          </div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full py-4 rounded-xl bg-gold text-gold-foreground font-semibold shadow-gold flex items-center justify-center gap-2">
            <Camera className="w-5 h-5" /> Prendre une photo
          </button>
          <button onClick={() => { if (fileRef.current) { fileRef.current.removeAttribute("capture"); fileRef.current.click(); fileRef.current.setAttribute("capture", "environment"); } }}
            className="w-full py-3 rounded-xl border border-border text-foreground font-medium flex items-center justify-center gap-2">
            <Upload className="w-4 h-4" /> Importer depuis la galerie
          </button>
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="card-premium overflow-hidden">
            <img src={preview} alt="Plat" className="w-full aspect-square object-cover" />
          </div>

          {!result && !analyzing && (
            <div className="flex gap-3">
              <button onClick={reset} className="flex-1 py-3 rounded-xl border border-border font-medium flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> Refaire
              </button>
              <button onClick={analyze} className="flex-[2] py-3 rounded-xl bg-gold text-gold-foreground font-semibold shadow-gold">
                Analyser
              </button>
            </div>
          )}

          {analyzing && (
            <div className="card-premium p-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto" />
              <p className="text-muted-foreground">Lexa analyse votre plat…</p>
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fade-up">
              <div className="card-premium p-6 space-y-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold">{result.meal_name}</h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Portion estimée · <span className="font-mono-data">{result.portion_g}g</span>
                    {result.confidence && <> · confiance {result.confidence}</>}
                  </p>
                </div>
                <div className="text-center py-4">
                  <div className="font-display text-6xl font-semibold text-gold">{result.calories}</div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mt-2">kcal</div>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-border">
                  <MacroPill label="Prot." value={result.proteins} color="var(--protein)" />
                  <MacroPill label="Gluc." value={result.carbs} color="var(--carb)" />
                  <MacroPill label="Lip." value={result.fats} color="var(--fat)" />
                </div>
              </div>

              {result.ingredients?.length > 0 && (
                <div className="card-premium p-5">
                  <h3 className="font-display text-lg font-semibold mb-3">Ingrédients détectés</h3>
                  <div className="space-y-2">
                    {result.ingredients.map((i, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                        <div>
                          <span className="text-foreground">{i.name}</span>
                          <span className="text-muted-foreground font-mono-data ml-2">{i.quantity_g}g</span>
                        </div>
                        <span className="font-mono-data text-gold">{i.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={reset} className="flex-1 py-3 rounded-xl border border-border font-medium flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Re-scanner
                </button>
                <button onClick={save} disabled={saving}
                  className="flex-[2] py-3 rounded-xl bg-gold text-gold-foreground font-semibold shadow-gold disabled:opacity-50 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> {saving ? "..." : "Ajouter au journal"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
      <div className="font-mono-data text-lg font-semibold" style={{ color }}>{Math.round(value)}g</div>
    </div>
  );
}
