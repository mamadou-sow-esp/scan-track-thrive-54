import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Sparkles, TrendingUp, ArrowRight, Scan } from "lucide-react";
import heroImg from "@/assets/hero-scan.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lexa — Scanne. Compte. Maîtrise." },
      { name: "description", content: "Scannez vos plats en photo et obtenez instantanément calories et macronutriments grâce à l'IA. Lexa, votre coach nutrition intelligent." },
      { property: "og:title", content: "Lexa — Scanne. Compte. Maîtrise." },
      { property: "og:description", content: "Scanner de calories IA. Photographiez, analysez, suivez." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-xl bg-background/60 border-b border-border/40">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center glow">
              <Scan className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">Lexa</span>
          </Link>
          <div className="flex items-center gap-3">
            <a href="#how" className="hidden sm:inline text-sm text-muted-foreground hover:text-foreground transition">Comment ça marche</a>
            <Link to="/" className="px-4 py-2 rounded-full text-sm font-medium gradient-primary text-primary-foreground hover:opacity-90 transition shadow-elegant">
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-xs font-medium text-accent">
              <Sparkles className="w-3.5 h-3.5" />
              Propulsé par l'IA Vision
            </div>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight">
              Scanne. <br />
              Compte. <br />
              <span className="gradient-text">Maîtrise.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
              Photographiez n'importe quel plat. Lexa identifie les ingrédients, estime les portions et calcule vos calories en un instant.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/" className="group inline-flex items-center gap-2 px-7 py-4 rounded-full gradient-primary text-primary-foreground font-semibold shadow-elegant hover:scale-105 transition-transform">
                Commencer gratuitement
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <a href="#how" className="px-7 py-4 rounded-full glass text-foreground font-medium hover:bg-card transition">
                Voir la démo
              </a>
            </div>
            <div className="flex items-center gap-6 pt-4">
              <div>
                <div className="font-mono-data text-2xl font-bold gradient-text">10k+</div>
                <div className="text-xs text-muted-foreground">Plats analysés</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div>
                <div className="font-mono-data text-2xl font-bold gradient-text">98%</div>
                <div className="text-xs text-muted-foreground">Précision IA</div>
              </div>
              <div className="w-px h-10 bg-border" />
              <div>
                <div className="font-mono-data text-2xl font-bold gradient-text">2s</div>
                <div className="text-xs text-muted-foreground">Temps d'analyse</div>
              </div>
            </div>
          </div>

          <div className="relative animate-float">
            <div className="absolute inset-0 gradient-primary blur-3xl opacity-30 rounded-full" />
            <img
              src={heroImg}
              alt="Téléphone scannant un plat avec l'IA Lexa"
              width={1280}
              height={1280}
              className="relative rounded-3xl w-full max-w-lg mx-auto"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-display text-4xl sm:text-5xl font-bold">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg">Trois étapes. Zéro friction.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Camera, title: "Photographier", desc: "Prenez une photo de votre plat ou importez-la depuis votre galerie.", num: "01" },
              { icon: Sparkles, title: "Analyser", desc: "L'IA identifie les ingrédients et estime portions, calories et macros.", num: "02" },
              { icon: TrendingUp, title: "Suivre", desc: "Visualisez votre journée et atteignez vos objectifs nutritionnels.", num: "03" },
            ].map((s) => (
              <div key={s.num} className="glass rounded-3xl p-8 hover:shadow-elegant transition group">
                <div className="font-mono-data text-xs text-accent mb-6">{s.num}</div>
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <s.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <h3 className="font-display text-2xl font-semibold mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { quote: "Lexa a transformé ma façon de manger. Je découvre enfin la vraie composition de mes repas.", name: "Aïssatou D.", role: "Utilisatrice" },
              { quote: "L'IA reconnaît même les plats sénégalais. Bluffant.", name: "Mamadou S.", role: "Coach sportif" },
              { quote: "L'app la plus élégante que j'ai installée cette année.", name: "Léa M.", role: "Diététicienne" },
            ].map((t) => (
              <div key={t.name} className="glass rounded-3xl p-6 space-y-4">
                <p className="text-foreground/90 leading-relaxed">"{t.quote}"</p>
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center glass rounded-[2rem] p-12 sm:p-16 relative overflow-hidden">
          <div className="absolute inset-0 gradient-primary opacity-10" />
          <div className="relative space-y-6">
            <h2 className="font-display text-4xl sm:text-5xl font-bold">
              Prêt à <span className="gradient-text">maîtriser</span> votre nutrition ?
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Rejoignez des milliers d'utilisateurs qui suivent leurs calories sans effort.
            </p>
            <Link to="/" className="inline-flex items-center gap-2 px-8 py-4 rounded-full gradient-primary text-primary-foreground font-semibold shadow-elegant hover:scale-105 transition-transform">
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
              <Scan className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-foreground">Lexa</span>
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
