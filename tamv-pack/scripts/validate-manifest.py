"""Validate pack inventory and governance links; no application runtime dependency."""
import json
import re
from pathlib import Path


def validate(root: Path) -> None:
    pack = json.loads((root / "pack.json").read_text())
    skills = pack["skills"]
    if len(skills) != 37 or len(set(skills)) != 37:
        raise ValueError("El paquete debe tener 37 skills únicos: 17 originales y 20 nuevos.")
    folders = {p.name for p in (root / "skills").iterdir() if p.is_dir()}
    if folders != set(skills):
        raise ValueError("El manifiesto y las carpetas de skills no coinciden.")
    for skill in skills:
        if not re.fullmatch(r"tamv-[a-z0-9-]+", skill):
            raise ValueError(f"Nombre inseguro: {skill}")
        body = (root / "skills" / skill / "SKILL.md").read_text()
        if "TAMV ONLINE NETWORK" not in body:
            raise ValueError(f"Falta atribución: {skill}")
    graph = pack["skillGraph"]
    if len(graph) != 20:
        raise ValueError("Se requieren 20 skills adicionales con conexiones declaradas.")
    for skill, dependencies in graph.items():
        if skill not in skills or not dependencies or len(set(dependencies)) != len(dependencies):
            raise ValueError(f"Dependencias inválidas: {skill}")
        if not {"tamv-core-governance", "tamv-rights-safety-guard"}.issubset(dependencies):
            raise ValueError(f"Faltan controles obligatorios: {skill}")
        if any(d not in skills or d == skill for d in dependencies):
            raise ValueError(f"Dependencia desconocida o recursiva: {skill}")
        body = (root / "skills" / skill / "SKILL.md").read_text()
        if not body.startswith("---\n") or f"name: {skill}\n" not in body:
            raise ValueError(f"Falta frontmatter: {skill}")
        if any(f"`{d}`" not in body for d in dependencies):
            raise ValueError(f"Contrato de conexión incompleto: {skill}")
    visited, active = set(), set()
    def visit(skill: str) -> None:
        if skill in active:
            raise ValueError(f"Ciclo en el grafo de dependencias: {skill}")
        if skill in visited:
            return
        active.add(skill)
        for dep in graph.get(skill, []):
            visit(dep)
        active.remove(skill)
        visited.add(skill)
    for skill in skills:
        visit(skill)
    if pack["orchestration"]["humanApprovalRequired"] is not True:
        raise ValueError("La aprobación humana debe ser obligatoria.")
    print(f"Manifiesto válido: {len(skills)} skills, {len(graph)} extensiones gobernadas.")


if __name__ == "__main__":
    validate(Path(__file__).resolve().parents[1])