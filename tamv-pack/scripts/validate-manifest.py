"""Validate skill inventory, metadata, governance and dependency contracts."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PACK_ROOT = Path(__file__).resolve().parents[1]
REQUIRED_SKILLS = 37
REQUIRED_EXTENSIONS = 20
REQUIRED_GUARDS = {"tamv-core-governance", "tamv-rights-safety-guard"}


def fail(message: str) -> None:
    raise ValueError(message)


def validate() -> None:
    try:
        pack = json.loads((PACK_ROOT / "pack.json").read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"No se pudo leer pack.json: {error}")

    if not isinstance(pack, dict):
        fail("La raíz de pack.json debe ser un objeto.")
    skills = pack.get("skills")
    if (
        not isinstance(skills, list)
        or any(not isinstance(skill, str) for skill in skills)
        or len(skills) != REQUIRED_SKILLS
        or len(set(skills)) != REQUIRED_SKILLS
    ):
        fail(f"El paquete debe declarar {REQUIRED_SKILLS} skills únicos.")

    skill_root = PACK_ROOT / "skills"
    if not skill_root.is_dir():
        fail("No existe el directorio skills.")
    folders = {path.name for path in skill_root.iterdir() if path.is_dir()}
    if folders != set(skills):
        fail("El manifiesto y las carpetas de skills no coinciden.")

    for skill in skills:
        if not re.fullmatch(r"tamv-[a-z0-9-]+", skill):
            fail(f"Nombre de skill inseguro: {skill!r}")
        skill_file = skill_root / skill / "SKILL.md"
        if not skill_file.is_file():
            fail(f"Falta el contrato del skill: {skill}")
        body = skill_file.read_text(encoding="utf-8")
        if "TAMV ONLINE NETWORK" not in body:
            fail(f"Falta atribución en {skill}")
        if not body.startswith("---\n") or f"name: {skill}\n" not in body:
            fail(f"Frontmatter inválido en {skill}")

    graph = pack.get("skillGraph")
    if not isinstance(graph, dict) or len(graph) != REQUIRED_EXTENSIONS:
        fail(f"Se requieren {REQUIRED_EXTENSIONS} extensiones con dependencias declaradas.")
    for skill, dependencies in graph.items():
        if skill not in skills or not isinstance(dependencies, list) or not dependencies:
            fail(f"Dependencias inválidas: {skill}")
        if any(not isinstance(dependency, str) for dependency in dependencies):
            fail(f"Las dependencias deben ser cadenas: {skill}")
        if len(set(dependencies)) != len(dependencies):
            fail(f"Dependencias duplicadas: {skill}")
        if not REQUIRED_GUARDS.issubset(dependencies):
            fail(f"Faltan controles obligatorios en {skill}")
        if any(dependency not in skills or dependency == skill for dependency in dependencies):
            fail(f"Dependencia desconocida o autorreferencia en {skill}")
        body = (skill_root / skill / "SKILL.md").read_text(encoding="utf-8")
        if any((chr(96) + dependency + chr(96)) not in body for dependency in dependencies):
            fail(f"Contrato de conexión incompleto: {skill}")

    visited: set[str] = set()
    active: set[str] = set()

    def visit(skill: str) -> None:
        if skill in active:
            fail(f"Ciclo en el grafo de dependencias: {skill}")
        if skill in visited:
            return
        active.add(skill)
        for dependency in graph.get(skill, []):
            visit(dependency)
        active.remove(skill)
        visited.add(skill)

    for skill in skills:
        visit(skill)

    governance = pack.get("governance")
    orchestration = pack.get("orchestration")
    if not isinstance(governance, dict) or governance.get("attributionRequired") is not True or governance.get("auditRequired") is not True:
        fail("El manifiesto debe exigir atribución y auditoría.")
    if not isinstance(orchestration, dict) or orchestration.get("humanApprovalRequired") is not True:
        fail("La aprobación humana debe ser obligatoria.")
    for key in ("entry", "safety", "quality"):
        if orchestration.get(key) not in skills:
            fail(f"Orquestación referencia un skill desconocido: {key}")

    print(f"Manifiesto válido: {len(skills)} skills, {len(graph)} extensiones gobernadas.")


if __name__ == "__main__":
    try:
        validate()
    except (ValueError, KeyError, TypeError) as error:
        print(f"Error de manifiesto: {error}", file=sys.stderr)
        sys.exit(1)
