import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Blocks, Braces, Check, GitBranch, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { skillRegistry } from "@/lib/skill-registry";
import { resolveSkillDependencies } from "@/lib/skill-governance";
export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace de skills · TAMV" },
      {
        name: "description",
        content:
          "Catálogo de 37 contratos de skills TAMV con dependencias gobernadas e integración en proyectos existentes.",
      },
      { property: "og:title", content: "Marketplace de skills · TAMV" },
      {
        property: "og:description",
        content: "Inventario de contratos, dependencias y controles de gobernanza.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marketplace,
});
function Marketplace() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const [selected, setSelected] = useState("");
  const items = skillRegistry.filter(
    (s) =>
      (category === "Todos" || s.category === category) &&
      `${s.name} ${s.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">GOVERNED SKILL NETWORK</span>
        <h1>Marketplace de skills</h1>
        <p>
          {skillRegistry.length} contratos del paquete · dependencias explícitas · control TAMV.
        </p>
      </div>
      <div className="skill-toolbar">
        <div className="search-field">
          <Search size={17} />
          <input
            aria-label="Buscar skills"
            placeholder="Buscar capacidad o contrato…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="field"
          aria-label="Categoría de skill"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["Todos", ...new Set(skillRegistry.map((s) => s.category))].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div className="skill-grid">
        {items.map((skill, i) => (
          <article key={skill.id} className="market-skill">
            <div className="flex justify-between">
              <span className={`skill-symbol tone-${i % 3}`}>
                <Blocks size={22} />
              </span>
              <span className="micro-tag">{skill.category}</span>
            </div>
            <h2>{skill.name}</h2>
            <p>{skill.description}</p>
            <div className="skill-foot">
              <GitBranch size={12} />
              {skill.dependencies.length} dependencias<span>CONTRATO</span>
            </div>
            <Button
              variant="ghost"
              onClick={() => setSelected(selected === skill.id ? "" : skill.id)}
              className="w-full justify-between px-0 mt-3"
            >
              {selected === skill.id ? "Ocultar contrato" : "Ver contrato"}
              <Braces size={14} />
            </Button>
            {selected === skill.id && (
              <div className="mt-3 space-y-3 text-xs text-muted-foreground">
                <p>Entrada: {skill.inputs}</p>
                <p>Salida: {skill.outputs}</p>
                <p>
                  Plan de dependencias resuelto (contratos; no ejecutado):{" "}
                  {resolveSkillDependencies([skill.id]).join(" → ")}
                </p>
                {skill.dependencies.map((d) => (
                  <p key={d} className="flex gap-2">
                    <Check size={12} />
                    {d}
                  </p>
                ))}
                <Button variant="outline" size="sm" asChild>
                  <Link to="/sdk">
                    <ShieldCheck size={13} />
                    Integrar con SDK
                  </Link>
                </Button>
              </div>
            )}
          </article>
        ))}
      </div>
      {!items.length && (
        <p className="text-muted-foreground py-8">No hay contratos para esta búsqueda.</p>
      )}
    </>
  );
}
