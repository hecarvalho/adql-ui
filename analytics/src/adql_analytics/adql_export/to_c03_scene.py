from __future__ import annotations

from typing import Any, Iterable

from .schemas import ADQL_SCHEMA_VERSIONS


def _clamp_percent(value: Any, fallback: float = 50) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        number = fallback

    return max(0, min(100, number))


def _text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback

    return str(value)


def _normalize_player(player: dict[str, Any], index: int) -> dict[str, Any]:
    raw_type = str(player.get("type", player.get("team", "team"))).lower()

    if "opponent" in raw_type or "advers" in raw_type:
        player_type = "opponent"
    elif "highlight" in raw_type or "destaque" in raw_type:
        player_type = "highlight"
    elif "ghost" in raw_type or "fantasma" in raw_type:
        player_type = "ghost"
    else:
        player_type = "team"

    prefix = "o" if player_type == "opponent" else "p"

    return {
        "id": _text(player.get("id"), f"{prefix}{index}"),
        "label": _text(player.get("label", player.get("number", ""))),
        "name": _text(player.get("name", "")),
        "type": player_type,
        "team": player_type,
        "x": _clamp_percent(player.get("x", 50)),
        "y": _clamp_percent(player.get("y", 50)),
        "role": _text(player.get("role", "player")),
    }


def _normalize_route(route: dict[str, Any], default_type: str = "pass") -> dict[str, Any]:
    return {
        "type": _text(route.get("type", default_type)),
        "from": _text(route.get("from", route.get("source", ""))),
        "to": _text(route.get("to", route.get("target", ""))),
        "bend": route.get("bend", 0.12 if default_type == "pass" else -0.18),
    }


def simple_c03_scene(
    title: str,
    description: str,
    players: Iterable[dict[str, Any]],
    actions: Iterable[dict[str, Any]] | None = None,
    zones: Iterable[dict[str, Any]] | None = None,
    subtitle: str = "ADQL Analytics Layer",
    source: str = "ADQL Analytics Layer",
    step_copy: Iterable[dict[str, Any]] | None = None,
    pressures: Iterable[dict[str, Any]] | None = None,
    gates: Iterable[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Gera uma cena tática simples para importação no C-03.

    Coordenadas dos jogadores e zonas usam escala percentual de 0 a 100.
    O importador do ADQL UI converte essas coordenadas para o SVG do campo.
    """

    normalized_players = [
        _normalize_player(player, index)
        for index, player in enumerate(players, start=1)
    ]

    normalized_actions = [
        _normalize_route(action, str(action.get("type", "pass")))
        for action in list(actions or [])
    ]

    return {
        "schemaVersion": ADQL_SCHEMA_VERSIONS["c03"],
        "coordinateSystem": "percent-0-100",
        "kicker": "Campo tático",
        "title": title,
        "subtitle": subtitle,
        "description": description,
        "reading": description,
        "source": source,
        "players": normalized_players,
        "actions": normalized_actions,
        "zones": list(zones or []),
        "pressures": list(pressures or []),
        "gates": list(gates or []),
        "stepCopy": list(
            step_copy
            or [
                {
                    "title": "Organizar",
                    "text": "Posicionar a estrutura inicial da jogada.",
                },
                {
                    "title": "Conectar",
                    "text": "Criar a ligação entre setores ou corredores.",
                },
                {
                    "title": "Acelerar",
                    "text": "Atacar o espaço ou finalizar a progressão.",
                },
            ]
        ),
    }
