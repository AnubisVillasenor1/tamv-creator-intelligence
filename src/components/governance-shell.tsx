import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Command,
  GraduationCap,
  HeartHandshake,
  Menu,
  Moon,
  Search,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AuthStatus } from "@/components/auth-status";
import { TamvLogo } from "@/components/branding/TamvLogo";
import { workspaceNavigation } from "@/lib/workspace-navigation";

export function GovernanceShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current =
    workspaceNavigation.find((item) => item.to === pathname)?.label ?? "TAMV Workspace";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [theme, setTheme] = useState("dark");
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(pathname);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("tamv.workspace.theme");
      if (saved === "light" || saved === "dark") {
        setTheme(saved);
        document.documentElement.dataset["workspaceTheme"] = saved;
      }
    } catch {
      /* Browser preferences may be disabled. */
    }
  }, []);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      setMenuOpen(false);
      setSearchOpen(false);
      main.current?.focus();
      previousPath.current = pathname;
    }
  }, [pathname]);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset["workspaceTheme"] = next;
    try {
      localStorage.setItem("tamv.workspace.theme", next);
    } catch {
      /* Preference remains usable without storage. */
    }
  }
  function navigation() {
    return (
      <>
        <nav aria-label="Navegación principal">
          {["Crear", "Conectar", "Gobernar", "Aprender"].map((group) => (
            <div className="nav-group" key={group}>
              <span className="nav-group-label">{group}</span>
              {workspaceNavigation
                .filter((item) => item.group === group)
                .map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    aria-current={pathname === item.to ? "page" : undefined}
                    className={`govern-nav ${pathname === item.to ? "govern-nav-active" : ""}`}
                    onClick={() => setMenuOpen(false)}
                  >
                    <item.icon size={18} aria-hidden="true" />
                    <span>{item.label}</span>
                    {pathname === item.to && <span className="nav-indicator" />}
                  </Link>
                ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-trust">
          <ShieldCheck size={18} />
          <div>
            <strong>El control es tuyo</strong>
            <p>Nada se publica automáticamente.</p>
          </div>
        </div>
        <div className="govern-session">
          <AuthStatus />
        </div>
      </>
    );
  }
  return (
    <div className="govern-shell">
      <a href="#workspace-content" className="skip-link">
        Saltar al contenido
      </a>
      <aside className="govern-sidebar">
        <Link to="/" className="govern-brand" aria-label="TAMV — Inicio">
          <TamvLogo size={48} priority />
          <span>
            TAMV<small>CREATOR INTELLIGENCE</small>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-monogram">T</span>
          <div>
            <strong>Tu espacio creativo</strong>
            <span>Personal · Gobernado</span>
          </div>
        </div>
        {navigation()}
      </aside>
      <div className="govern-main">
        <header className="govern-topbar">
          <div className="tamv-matrix-banner" role="img" aria-label="TAMV ONLINE NETWORK, identidad visual de matriz digital">
            <div className="matrix-code matrix-code-left" aria-hidden="true">010101 001101 101001 010010 110101 001011 101100</div>
            <div className="matrix-banner-core">
              <span className="matrix-signal" aria-hidden="true" />
              <span className="matrix-banner-name">TAMV ONLINE NETWORK</span>
              <span className="matrix-banner-subtitle">TECNOLOGÍA AVANZADA MEXICANA VERSÁTIL</span>
            </div>
            <div className="matrix-code matrix-code-right" aria-hidden="true">101010 110010 001101 101011 010101 111000 010110</div>
          </div>
          <div className="topbar-location">
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
              <DialogTrigger asChild>
                <Button
                  className="mobile-menu-button"
                  variant="ghost"
                  size="icon"
                  aria-label="Abrir navegación"
                >
                  <Menu />
                </Button>
              </DialogTrigger>
              <DialogContent className="mobile-navigation">
                <DialogTitle>Tu espacio TAMV</DialogTitle>
                <DialogDescription>Crear, conectar y gobernar.</DialogDescription>
                {navigation()}
              </DialogContent>
            </Dialog>
            <span className="breadcrumb-root">
              Workspace <span>/</span>
            </span>
            <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <Dialog
              open={searchOpen}
              onOpenChange={(open) => {
                setSearchOpen(open);
                if (!open) setQuery("");
              }}
            >
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="workspace-search"
                  aria-label="Buscar herramientas"
                >
                  <Search size={16} />
                  <span>Buscar herramientas</span>
                  <Command size={13} />
                </Button>
              </DialogTrigger>
              <DialogContent className="command-dialog">
                <DialogTitle>¿Qué quieres hacer?</DialogTitle>
                <DialogDescription>
                  Encuentra una herramienta de tu espacio de trabajo.
                </DialogDescription>
                <label className="sr-only" htmlFor="workspace-search">
                  Buscar herramientas
                </label>
                <input
                  id="workspace-search"
                  className="field"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Audio, redes sociales, auditoría…"
                />
                <div className="command-results">
                  {workspaceNavigation
                    .filter((item) =>
                      `${item.label} ${item.description}`
                        .toLocaleLowerCase("es")
                        .includes(query.toLocaleLowerCase("es")),
                    )
                    .map((item) => (
                      <Link key={item.to} to={item.to} onClick={() => setSearchOpen(false)}>
                        <item.icon size={20} />
                        <div>
                          <strong>{item.label}</strong>
                          <p>{item.description}</p>
                        </div>
                        <ArrowUpRight size={16} />
                      </Link>
                    ))}
                </div>
                {!workspaceNavigation.some((item) =>
                  `${item.label} ${item.description}`
                    .toLocaleLowerCase("es")
                    .includes(query.toLocaleLowerCase("es")),
                ) && <p role="status">No hay coincidencias. Prueba con otra palabra.</p>}
              </DialogContent>
            </Dialog>
            <Button asChild variant="ghost" className="topbar-guide">
              <Link to="/guide" aria-label="Tutorial">
                <GraduationCap size={18} />
                <span>Tutorial</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="topbar-guide">
              <a href="/billing#donate" aria-label="Apoyar TAMV">
                <HeartHandshake size={17} />
                <span>Apoyar</span>
              </a>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema oscuro"}
            >
              {theme === "dark" ? <Sun /> : <Moon />}
            </Button>
          </div>
        </header>
        <main id="workspace-content" ref={main} tabIndex={-1} className="govern-body">
          {children}
        </main>
        <footer className="govern-footer">
          <span>TAMV ONLINE NETWORK · Tecnología con responsabilidad</span>
          <div className="flex gap-4">
            <Link to="/sovereignty">Soberanía</Link>
            <Link to="/hypercore">Diagnóstico</Link>
            <Link to="/wiki">Wiki</Link>
            <Link to="/faq">FAQ</Link>
            <Link to="/settings">Ajustes</Link>
            <Link to="/billing">Pagos</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
