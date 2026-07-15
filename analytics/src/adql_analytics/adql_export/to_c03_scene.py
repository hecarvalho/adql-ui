from __future__ import annotations

from typing import Any, Iterable

from .schemas import ADQL_SCHEMA_VERSIONS


def simple_c03_scene(
    title: str,
    description: str,
    players: Iterable[dict[str, Any]],
    actions: Iterable[dict[str, Any]] | None = None,
    zones: Iterable[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Gera uma cena tática simples compatível com o conceito do C-03.

    Coordenadas recomendadas: x e y entre 0 e 100.
    """
    normalized_players = []
    for index, player in enumerate(players, start=1):
        normalized_players.append(
            {
                "id": str(player.get("id", f"p{index}")),
                "label": str(player.get("label", index)),
                "name": str(player.get("name", "")),
                "team": str(player.get("team", "team")),
                "x": max(0, min(100, float(player.get("x", 50)))),
                "y": max(0, min(100, float(player.get("y", 50)))),
                "role": str(player.get("role", "player")),
            }
        )

    return {
        "schemaVersion": ADQL_SCHEMA_VERSIONS["c03"],
        "title": title,
        "description": description,
        "players": normalized_players,
        "actions": list(actions or []),
        "zones": list(zones or []),
    }
