import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { workspaceNavigation } from "@/lib/workspace-navigation";
import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });

  it.each(["/exagon", "/auth", "/auth?mode=recovery", "/auth-callback?code=abc"])(
    "matches the dedicated access route for %s",
    (href) => {
      const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

      // `matchRoutes` parses a pathname, not a full URL with a query string.
      const matches = router.matchRoutes(href.split("?")[0] ?? "/");

      expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
    },
  );

  it("resolves every sidebar destination to a real route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    for (const item of workspaceNavigation) {
      const matches = router.matchRoutes(item.to);

      expect(matches.at(-1)?.routeId, item.to).not.toBe(rootRouteId);
    }
  });

  it("only uses navigation groups rendered by the workspace shell", () => {
    for (const item of workspaceNavigation) {
      expect(["Crear", "Conectar", "Gobernar", "Aprender"], item.to).toContain(item.group);
    }
  });
});
