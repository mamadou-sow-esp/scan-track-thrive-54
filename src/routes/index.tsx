import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-scan.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lexa — Scanne. Compte. Maîtrise." },
      { name: "description", content: "Scanner de calories IA premium. Photographiez vos plats, obtenez calories et macros instantanément." },
      { property: "og:title", content: "Lexa — Scanne. Compte. Maîtrise." },
      { property: "og:description", content: "Scanner de calories IA. Photographiez. Analysez. Suivez." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="font-display font-bold text-2xl tracking-tight text-gold">Lexa</span>
          </Link>
          <div className="flex items-center gap-4">
            <a href="#how" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition">Comment ça marche</a>
            <Link to="/auth" className="px-5 py-2 rounded-xl text-sm font-semibold bg-gold text-gold-foreground hover:opacity-90 transition shadow-gold">
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-card text-xs font-medium text-gold">
              <Sparkles className="w-3.5 h-3.5" />
              Propulsé par l'IA Vision
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[1.05] tracking-tight">
              Scanne.<br />
              Compte.<br />
              <span className="text-gold italic">Maîtrise.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Photographiez n'importe quel plat. Lexa identifie les ingrédients, estime les portions et calcule vos calories en un instant.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/auth" className="group inline-flex items-center gap-2 px-7 py-4 rounded-2xl bg-gold text-gold-foreground font-semibold shadow-gold hover:opacity-90 transition">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#how" className="px-7 py-4 rounded-2xl border border-border bg-card text-foreground font-medium hover:bg-secondary transition">
                Voir la démo
              </a>
            </div>
            <div className="flex items-center gap-8 pt-4">
              {[
                { v: "10k+", l: "Plats analysés" },
                { v: "98%", l: "Précision IA" },
                { v: "2s", l: "Temps d'analyse" },
              ].map((s) => (
                <div key={s.l}>
                  <div className="font-mono-data text-2xl font-medium text-gold">{s.v}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gold blur-[120px] opacity-15 rounded-full" />
            <img
              src={heroImg}
              alt="Smartphone scannant un plat avec Lexa"
              width={1024}
              height={1024}
              className="relative rounded-3xl w-full max-w-lg mx-auto"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <h2 className="font-display text-4xl sm:text-5xl font-semibold">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg">Trois étapes. Zéro friction.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Camera, title: "Photographier", desc: "Prenez une photo de votre plat ou importez-la depuis votre galerie.", num: "01" },
              { icon: Sparkles, title: "Analyser", desc: "L'IA identifie les ingrédients et estime portions, calories et macros.", num: "02" },
              { icon: TrendingUp, title: "Suivre", desc: "Visualisez votre journée et atteignez vos objectifs nutritionnels.", num: "03" },
            ].map((s) => (
              <div key={s.num} className="card-premium p-8 hover:border-gold/40 transition group">
                <div className="font-mono-data text-xs text-gold mb-6 tracking-wider">{s.num}</div>
                <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center mb-6">
                  <s.icon className="w-5 h-5 text-gold" strokeWidth={1.5} />
                </div>
                <h3 className="font-display text-2xl font-semibold mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-20 px-6 border-t border-border">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { quote: "Lexa a transformé ma façon de manger.", name: "Aïssatou D.", role: "Utilisatrice" },
            { quote: "L'IA reconnaît même les plats sénégalais. Bluffant.", name: "Mamadou S.", role: "Coach sportif" },
            { quote: "L'app la plus élégante installée cette année.", name: "Léa M.", role: "Diététicienne" },
          ].map((t) => (
            <div key={t.name} className="card-premium p-6 space-y-4">
              <p className="text-foreground/90 leading-relaxed font-display italic">"{t.quote}"</p>
              <div>
                <div className="font-semibold text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center card-premium p-12 sm:p-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gold opacity-[0.04]" />
          <div className="relative space-y-6">
            <h2 className="font-display text-4xl sm:text-5xl font-semibold">
              Prêt à <span className="text-gold italic">maîtriser</span> votre nutrition&nbsp;?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Rejoignez des milliers d'utilisateurs qui suivent leurs calories sans effort.
            </p>
            <Link to="/auth" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gold text-gold-foreground font-semibold shadow-gold hover:opacity-90 transition">
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-gold">Lexa</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-foreground transition">Confidentialité</a>
            <a href="#" className="hover:text-foreground transition">Conditions</a>
            <a href="#" className="hover:text-foreground transition">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
