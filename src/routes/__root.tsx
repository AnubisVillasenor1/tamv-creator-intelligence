import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import workspaceCss from "../workspace.css?url";
import crystalCss from "../crystal-ui.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { GovernanceShell } from "../components/governance-shell";
import { TamvAttribution } from "../components/branding/TamvAttribution";

function NotFoundComponent() {
  return (
    <div className="tamv-system-state">
      <div className="tamv-system-state-card">
        <h1 className="tamv-system-state-code">404</h1>
        <h2 className="tamv-system-state-title">Página no encontrada</h2>
        <p className="tamv-system-state-copy">
          La página que buscas no existe o cambió de ubicación.
        </p>
        <div className="tamv-system-state-actions">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="tamv-system-state">
      <div className="tamv-system-state-card">
        <h1 className="tamv-system-state-title">
          No se pudo cargar esta página
        </h1>
        <p className="tamv-system-state-copy">
          Se produjo un error inesperado. Puedes reintentar o volver al inicio.
        </p>
        <div className="tamv-system-state-actions">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Volver al inicio
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    // Replace these placeholders with the app's name and description when first building the app.
    // Each content route, / included, must still set its own head(). Never add og:image or
    // twitter:image here: every page without its own would inherit the root's preview image.
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "TAMV Creator Intelligence" },
      { name: "description", content: "Gobernanza agnóstica de IA de TAMV ONLINE NETWORK." },
      { name: "author", content: "TAMV ONLINE NETWORK" },
      { property: "og:title", content: "TAMV Creator Intelligence" },
      {
        property: "og:description",
        content: "Inteligencia creativa con gobernanza y control humano.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "stylesheet", href: workspaceCss },
      { rel: "stylesheet", href: crystalCss },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/brand/tamv-online-logo-192.jpg" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TamvAttribution />
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <GovernanceShell>
        <Outlet />
      </GovernanceShell>
    </QueryClientProvider>
  );
}
