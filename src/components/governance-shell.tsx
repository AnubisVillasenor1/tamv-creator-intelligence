import type { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  ArrowUpRight,
  Blocks,
  Bot,
  Braces,
  Cable,
  CircleDot,
  FileClock,
  LayoutDashboard,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthStatus } from "@/components/auth-status";
import { TamvLogo } from "@/components/branding/TamvLogo";
const navigation = [
  { to: "/", label: "Centro de control", icon: LayoutDashboard },
  { to: "/projects", label: "Proyectos · IA", icon: Bot },
  { to: "/audit", label: "Registro de auditoría", icon: FileClock },
  { to: "/sdk", label: "SDK & API", icon: Braces },
  { to: "/marketplace", label: "Marketplace de skills", icon: Blocks },
  { to: "/models", label: "Modelos de IA", icon: Cable },
] as const;
export function GovernanceShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = navigation.find((item) => item.to === pathname)?.label ?? "Gobernanza TAMV";
  return (
    <div className="govern-shell">
      <aside className="govern-sidebar">
        <Link to="/" className="govern-brand" aria-label="TAMV ONLINE NETWORK — Creator Intelligence">
          <TamvLogo size={57} priority />
          <span>
            TAMV <small>ONLINE NETWORK · CREATOR INTELLIGENCE</small>
          </span>
        </Link>
        <div className="system-label">
          <CircleDot size={12} /> GOVERNANCE OS <span>v0.1</span>
        </div>
        <nav aria-label="Navegación principal">
          {navigation.map((item) => (
            <Button
              key={item.to}
              variant="ghost"
              asChild
              className={`govern-nav ${pathname === item.to ? "govern-nav-active" : ""}`}
            >
              <Link to={item.to}>
                <item.icon size={18} />
                {item.label}
                {pathname === item.to && <span className="nav-indicator" />}
              </Link>
            </Button>
          ))}
        </nav>
        <div className="govern-secondary">
          <span className="eyebrow">INFRAESTRUCTURA</span>
          <Button variant="ghost" asChild className="govern-nav">
            <Link to="/sovereignty">
              <ShieldCheck />
              Soberanía
            </Link>
          </Button>
          <Button variant="ghost" asChild className="govern-nav">
            <Link to="/hypercore">
              <Activity />
              Hypercore
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="govern-session">
          <div className="flex items-center gap-2 text-primary text-xs mb-4">
            <ShieldCheck size={14} /> Control humano · Fail closed
          </div>
          <AuthStatus />
        </div>
      </aside>
      <div className="govern-main">
        <header className="govern-topbar">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Workspace</span>
            <span className="text-muted-foreground">/</span>
            {current}
          </div>
          <div className="flex items-center gap-3">
            <span className="system-status">
              <span />
              TAMV ONLINE
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link to="/projects">
                <Bot size={14} /> Integrar proyecto
              </Link>
            </Button>
          </div>
        </header>
        <main className="govern-body">{children}</main>
        <footer className="govern-footer">
          <span>TAMV ONLINE NETWORK · Inteligencia con responsabilidad</span>
          <span>AGNÓSTICO DE SECTOR Y PROVEEDOR</span>
        </footer>
      </div>
    </div>
  );
}
