import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { Home, Camera, CalendarDays, BarChart2, User, ChevronLeft } from "lucide-react";

const BACK_ROUTES: Record<string, { label: string; to: string }> = {
  "/history": { label: "Historique", to: "/dashboard" },
  "/calendar": { label: "Agenda", to: "/dashboard" },
  "/progress": { label: "Progrès", to: "/dashboard" },
  "/profile": { label: "Profil", to: "/dashboard" },
};

export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  const tabs = [
    { to: "/dashboard", icon: Home, label: "Accueil" },
    { to: "/calendar", icon: CalendarDays, label: "Agenda" },
    { to: "/scan", icon: Camera, label: "Scanner" },
    { to: "/progress", icon: BarChart2, label: "Progrès" },
    { to: "/profile", icon: User, label: "Profil" },
  ] as const;

  const backRoute = BACK_ROUTES[location.pathname];

  return (
    <div className="min-h-screen max-w-md mx-auto" style={{ paddingBottom: "80px" }}>
      {backRoute && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border/50 animate-slide-down">
          <div className="max-w-md mx-auto flex items-center px-4 py-3 gap-2">
            <Link to={backRoute.to}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition btn-press">
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Retour</span>
            </Link>
            <span className="text-muted-foreground/40 mx-1">·</span>
            <span className="text-sm font-semibold text-foreground">{backRoute.label}</span>
          </div>
        </div>
      )}

      {children}

      <nav style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        backgroundColor: "var(--background)",
        borderTop: "1px solid var(--border)",
      }}>
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-3">
          {tabs.map((t) => {
            const active = location.pathname === t.to;
            return (
              <Link key={t.to} to={t.to}
                className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition btn-press ${
                  active ? "text-gold" : "text-muted-foreground hover:text-foreground"
                }`}>
                <t.icon className={`w-5 h-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} strokeWidth={active ? 2 : 1.75} />
                <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}