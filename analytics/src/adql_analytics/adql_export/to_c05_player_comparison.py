from __future__ import annotations

from typing import Any, Iterable

from .schemas import ADQLExport, ADQL_SCHEMA_VERSIONS


def players_to_c05_comparison(
    title: str,
    players: Iterable[dict[str, Any]],
    metrics: Iterable[str],
    subtitle: str | None = None,
    scale_max: float = 100,
) -> dict[str, Any]:
    """Gera estrutura-base para comparação C-05.

    `players` deve conter itens como:
    {"name": "Jogador", "team": "Equipe", "values": {"xG": 71, "xA": 55}}
    """
    metric_names = [str(metric) for metric in metrics]
    normalized_players = []

    for player in players:
        values = player.get("values", {}) or {}
        normalized_players.append(
            {
                "name": str(player.get("name", "Jogador")),
                "team": str(player.get("team", "Equipe")),
                "values": {
                    metric: max(0, min(scale_max, float(values.get(metric, 0))))
                    for metric in metric_names
                },
            }
        )

    payload = ADQLExport(
        component="C-05",
        schema_version=ADQL_SCHEMA_VERSIONS["c05"],
        title=title,
        subtitle=subtitle,
        data={
            "scaleMax": scale_max,
            "metrics": metric_names,
            "players": normalized_players,
        },
    )
    return payload.to_dict()
