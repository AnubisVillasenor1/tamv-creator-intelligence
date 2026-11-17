import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listProjects } from "@/lib/project.functions";
import { useAuthSession } from "./use-auth-session";
import type { GovernedProject } from "@/lib/project-schema";

export function useGovernedProjects() {
  const session = useAuthSession();
  const fetchProjects = useServerFn(listProjects);
  const owner = session.status === "authenticated" ? session.email : null;
  const generation = useRef(0);
  const [state, setState] = useState<{
    owner: string | null;
    projects: GovernedProject[];
    loading: boolean;
    error: string;
  }>({ owner: null, projects: [], loading: false, error: "" });
  const refresh = useCallback(async () => {
    const run = ++generation.current;
    setState({ owner, projects: [], loading: owner !== null, error: "" });
    if (owner === null) return;
    try {
      const projects = await fetchProjects();
      if (run === generation.current) setState({ owner, projects, loading: false, error: "" });
    } catch {
      if (run === generation.current)
        setState({
          owner,
          projects: [],
          loading: false,
          error: "No se pudieron cargar tus proyectos.",
        });
    }
  }, [owner, fetchProjects]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current += 1;
    };
  }, [refresh]);
  const visible = state.owner === owner && owner !== null;
  return {
    projects: visible ? state.projects : [],
    loading: visible && state.loading,
    error: visible ? state.error : "",
    session,
    refresh,
  };
}
