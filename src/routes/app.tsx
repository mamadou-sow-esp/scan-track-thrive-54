import { createFileRoute, useNavigate, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Home, Camera, Clock, User } from "lucide-react";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;
  }

  const tabs = [
    { to: "/dashboard", icon: Home, label: "Accueil" },
    { to: "/scan", icon: Camera, label: "Scanner" },
    { to: "/history", icon: Clock, label: "Historique" },
    { to: "/profile", icon: User, label: "Profil" },
  ] as const;

  return (
    <div className="min-h-screen pb-24">
      <Outlet />
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-3">
          {tabs.map((t) => {
            const active = location.pathname === t.to;
            return (
              <Link key={t.to} to={t.to}
                className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-lg transition ${active ? "text-gold" : "text-muted-foreground hover:text-foreground"}`}>
                <t.icon className="w-5 h-5" strokeWidth={1.75} />
                <span className="text-[10px] font-medium tracking-wide">{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
