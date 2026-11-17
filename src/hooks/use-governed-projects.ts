import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProjects } from "@/lib/project.functions";
import { useAuthSession } from "./use-auth-session";
import type { GovernedProject } from "@/lib/project-schema";
export function useGovernedProjects() {
  const session = useAuthSession();
  const fetchProjects = useServerFn(listProjects);
  const [projects, setProjects] = useState<GovernedProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    if (session.status !== "authenticated") {
      setProjects([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      setProjects(await fetchProjects());
    } catch {
      setError("No se pudieron cargar tus proyectos.");
    } finally {
      setLoading(false);
    }
  }, [session.status, fetchProjects]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { projects, loading, error, session, refresh };
}
