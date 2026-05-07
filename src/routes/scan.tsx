import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import { AppShell } from "@/components/app-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Camera, Check, FlipHorizontal, ImagePlus, RotateCcw, X, Zap } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/scan")({
  head: () => ({ meta: [{ title: "Lexa — Scanner" }] }),
  component: () => <AppShell><ScanPage /></AppShell>,
});

interface ScanResult {
  meal_name: string; portion_g: number; calories: number;
  proteins: number; carbs: number; fats: number;
  ingredients: { name: string; quantity_g: number; calories: number }[];
  confidence: string; notes?: string;
}
interface HistoryMeal { id: string; meal_name: string; calories: number; photo_url: string | null; scanned_at: string; }

type PageState = "camera" | "preview" | "scanning" | "result";

function ScanPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState<PageState>("camera");
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryMeal[]>([]);
  const [scanLine, setScanLine] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scanAnimRef = useRef<number | null>(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
    } catch { toast.error("Caméra non disponible — utilise l'import"); }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (state === "camera") startCamera();
    else stopCamera();
    return () => stopCamera();
  }, [state, startCamera, stopCamera]);

  useEffect(() => {
    if (state !== "scanning") { if (scanAnimRef.current) cancelAnimationFrame(scanAnimRef.current); return; }
    let start: number | null = null;
    const duration = 1800;
    const animate = (ts: number) => {
      if (!start) start = ts;
      const elapsed = (ts - start) % (duration * 2);
      const pct = elapsed < duration ? (elapsed / duration) * 100 : 100 - ((elapsed - duration) / duration) * 100;
      setScanLine(pct);
      scanAnimRef.current = requestAnimationFrame(animate);
    };
    scanAnimRef.current = requestAnimationFrame(animate);
    return () => { if (scanAnimRef.current) cancelAnimationFrame(scanAnimRef.current); };
  }, [state]);

  useEffect(() => {
    if (!user) return;
    supabase.from("meals").select("id, meal_name, calories, photo_url, scanned_at")
      .eq("user_id", user.id).order("scanned_at", { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setHistory(data as HistoryMeal[]); });
  }, [user, result]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")!.drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl); setImageBase64(dataUrl); setState("preview");
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl); setImageBase64(dataUrl); setState("preview");
    };
    reader.readAsDataURL(file);
  };

  const analyze = async () => {
    if (!imageBase64) return;
    setState("scanning");
    try {
      const { data, error } = await supabase.functions.invoke("scan-meal", { body: { image: imageBase64 } });
      if (error) throw error;
      if (!data?.result) throw new Error("Aucune analyse retournée");
      setResult(data.result as ScanResult);
      setState("result");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'analyse");
      setState("preview");
    }
  };

  const save = async () => {
    if (!result || !user || !imageBase64) return;
    setSaving(true);
    try {
      const blob = await (await fetch(imageBase64)).blob();
      const path = `${user.id}/${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("meals").upload(path, blob, { contentType: "image/jpeg" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("meals").getPublicUrl(path);
      const { error } = await supabase.from("meals").insert({
        user_id: user.id, photo_url: pub.publicUrl,
        meal_name: result.meal_name, ingredients: result.ingredients,
        calories: result.calories, proteins: result.proteins,
        carbs: result.carbs, fats: result.fats,
        portion_g: result.portion_g, notes: result.notes ?? null,
      });
      if (error) throw error;
      toast.success("Repas ajouté à ton journal ✨");
      navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally { setSaving(false); }
  };

  const reset = () => { setPreview(null); setImageBase64(null); setResult(null); setState("camera"); };

  return (
    <div className="flex flex-col h-full">
      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileRef} type="file" accept="image/*" hidden
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />

      {/* ── CAMÉRA ── */}
      {state === "camera" && (
        <div className="flex flex-col flex-1">
          <div className="px-5 pt-8 pb-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Scanner</p>
            <h1 className="font-display text-3xl font-semibold mt-1">Analyse ton plat</h1>
          </div>

          <div className="mx-5 rounded-2xl overflow-hidden relative bg-black aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
            {[
              "top-3 left-3 border-r-0 border-b-0 rounded-tl-md",
              "top-3 right-3 border-l-0 border-b-0 rounded-tr-md",
              "bottom-3 left-3 border-r-0 border-t-0 rounded-bl-md",
              "bottom-3 right-3 border-l-0 border-t-0 rounded-br-md",
            ].map((cls, i) => (
              <div key={i} className={`absolute w-6 h-6 border-2 border-gold ${cls}`} />
            ))}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <span className="px-3 py-1 rounded-full bg-black/50 text-white text-[11px] backdrop-blur-sm">
                Centre ton plat dans le cadre
              </span>
            </div>
          </div>

          <div className="px-5 py-5 flex items-center justify-between gap-4">
            <button onClick={() => fileRef.current?.click()}
              className="w-14 h-14 rounded-2xl border border-border flex items-center justify-center hover:border-gold transition">
              <ImagePlus className="w-5 h-5 text-muted-foreground" />
            </button>
            <button onClick={capture}
              className="w-20 h-20 rounded-full bg-gold shadow-gold flex items-center justify-center hover:opacity-90 transition active:scale-95">
              <Camera className="w-8 h-8 text-gold-foreground" />
            </button>
            <button onClick={() => setFacingMode(f => f === "environment" ? "user" : "environment")}
              className="w-14 h-14 rounded-2xl border border-border flex items-center justify-center hover:border-gold transition">
              <FlipHorizontal className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {history.length > 0 && (
            <div className="px-5 pb-6">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Récents</p>
              <div className="flex gap-3 overflow-x-auto pb-1">
                {history.map((m) => (
                  <div key={m.id} className="shrink-0 w-20">
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.meal_name} className="w-20 h-20 rounded-xl object-cover border border-border" />
                      : <div className="w-20 h-20 rounded-xl bg-secondary border border-border" />}
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">{m.meal_name}</p>
                    <p className="text-[10px] font-mono-data text-gold">{m.calories} kcal</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PREVIEW ── */}
      {state === "preview" && preview && (
        <div className="flex flex-col flex-1 px-5 pt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-semibold">Vérifier la photo</h1>
            <button onClick={reset} className="p-2 rounded-xl border border-border"><X className="w-4 h-4" /></button>
          </div>
          <div className="rounded-2xl overflow-hidden aspect-square">
            <img src={preview} alt="Plat" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-3.5 rounded-xl border border-border font-medium flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Reprendre
            </button>
            <button onClick={analyze}
              className="flex-[2] py-3.5 rounded-xl bg-gold text-gold-foreground font-semibold shadow-gold flex items-center justify-center gap-2">
              <Zap className="w-4 h-4" /> Analyser
            </button>
          </div>
        </div>
      )}

      {/* ── SCANNING ── */}
      {state === "scanning" && preview && (
        <div className="flex flex-col flex-1 px-5 pt-8 space-y-4">
          <h1 className="font-display text-2xl font-semibold">Analyse en cours…</h1>
          <div className="rounded-2xl overflow-hidden aspect-square relative">
            <img src={preview} alt="Plat" className="w-full h-full object-cover" />
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <div className="absolute inset-0 bg-black/30" />
              <div className="absolute left-0 right-0 h-0.5 bg-gold shadow-[0_0_12px_3px_rgba(201,168,76,0.8)]"
                style={{ top: `${scanLine}%`, transition: "top 0.016s linear" }} />
              <div className="absolute left-0 right-0 top-0 bg-gold/5" style={{ height: `${scanLine}%` }} />
            </div>
            <div className="absolute bottom-4 left-0 right-0 flex justify-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                <span className="text-white text-xs font-semibold">Lexa analyse ton plat…</span>
              </div>
            </div>
          </div>
          <div className="card-premium p-4 space-y-3">
            {["Détection des aliments", "Estimation des portions", "Calcul des calories"].map((step, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
                </div>
                <span className="text-muted-foreground">{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── RÉSULTAT ── */}
      {state === "result" && result && (
        <div className="flex flex-col flex-1 px-5 pt-8 space-y-4 pb-6 overflow-y-auto animate-fade-up">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-semibold">{result.meal_name}</h1>
            <button onClick={reset} className="p-2 rounded-xl border border-border"><X className="w-4 h-4" /></button>
          </div>

          <div className="rounded-2xl overflow-hidden aspect-video relative">
            {preview && <img src={preview} alt="Plat" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <div className="font-display text-5xl font-bold text-white">{result.calories}</div>
                <div className="text-white/70 text-xs uppercase tracking-widest">kcal</div>
              </div>
              <div className="text-right">
                <div className="text-white/70 text-[11px]">Portion ~{result.portion_g}g</div>
                <div className={`text-[11px] font-semibold mt-0.5 ${result.confidence === "high" ? "text-[#4CAF50]" : result.confidence === "medium" ? "text-gold" : "text-[#E53935]"}`}>
                  confiance {result.confidence}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Protéines", value: result.proteins, color: "var(--protein)" },
              { label: "Glucides", value: result.carbs, color: "var(--carb)" },
              { label: "Lipides", value: result.fats, color: "var(--fat)" },
            ].map((m) => (
              <div key={m.label} className="card-premium p-4 text-center">
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{m.label}</div>
                <div className="font-mono-data text-xl font-semibold" style={{ color: m.color }}>
                  {Math.round(m.value)}<span className="text-xs">g</span>
                </div>
              </div>
            ))}
          </div>

          {result.ingredients?.length > 0 && (
            <div className="card-premium p-5">
              <h3 className="font-display text-base font-semibold mb-3">Ingrédients détectés</h3>
              <div className="space-y-2">
                {result.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-b border-border last:border-0">
                    <div>
                      <span>{ing.name}</span>
                      <span className="text-muted-foreground font-mono-data ml-2 text-xs">{ing.quantity_g}g</span>
                    </div>
                    <span className="font-mono-data text-gold text-xs">{ing.calories} kcal</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.notes && <p className="text-xs text-muted-foreground px-1">{result.notes}</p>}

          <div className="flex gap-3">
            <button onClick={reset}
              className="flex-1 py-3.5 rounded-xl border border-border font-medium flex items-center justify-center gap-2">
              <RotateCcw className="w-4 h-4" /> Re-scanner
            </button>
            <button onClick={save} disabled={saving}
              className="flex-[2] py-3.5 rounded-xl bg-gold text-gold-foreground font-semibold shadow-gold disabled:opacity-50 flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {saving ? "Enregistrement…" : "Ajouter au journal"}
            </button>
          </div>

          {history.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Récemment scannés</p>
              <div className="space-y-2">
                {history.slice(0, 5).map((m) => (
                  <div key={m.id} className="card-premium p-3 flex items-center gap-3">
                    {m.photo_url
                      ? <img src={m.photo_url} alt={m.meal_name} className="w-12 h-12 rounded-xl object-cover" />
                      : <div className="w-12 h-12 rounded-xl bg-secondary" />}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{m.meal_name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(m.scanned_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </div>
                    </div>
                    <span className="font-mono-data text-gold text-sm">{m.calories}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}