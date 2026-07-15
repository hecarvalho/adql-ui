from __future__ import annotations

from typing import Sequence

import pandas as pd

from adql_analytics.adql_export.to_c04_radar import metrics_to_c04_radar
from adql_analytics.transforms.player_comparison import (
    DEFAULT_PLAYER_METRICS,
    PlayerMetricSpec,
    prepare_player_metric_table,
    select_players_for_comparison,
)


def player_dataframe_to_c04_payload(
    df: pd.DataFrame,
    player: str | None = None,
    title: str | None = None,
    subtitle: str = "Percentis calculados a partir de estatísticas públicas",
    metrics: Sequence[PlayerMetricSpec] = DEFAULT_PLAYER_METRICS,
    min_90s: float = 5.0,
    source: str = "FBref via soccerdata / ADQL Analytics Layer",
) -> dict:
    """Gera JSON compatível com C-04 Radar Profile a partir de uma tabela FBref.

    O C-04 é um radar de perfil. Por isso, este transformador seleciona um único
    jogador e envia percentis 0-100 para cada métrica do radar. Os valores brutos
    também são preservados em `data.rawMetrics` para auditoria editorial.
    """
    table = prepare_player_metric_table(df, metrics=metrics, min_90s=min_90s)
    selected = select_players_for_comparison(
        table,
        players=[player] if player else None,
        max_players=1,
    )

    if selected.empty:
        raise ValueError("Nenhum jogador disponível para gerar o radar C-04.")

    row = selected.iloc[0]
    player_name = str(row.get("player", "Jogador"))
    team_name = str(row.get("team", "Equipe"))

    radar_metrics = []
    raw_values: dict[str, float] = {}

    for metric in metrics:
        percentile = float(row.get(f"adql_pct_{metric.label}", 0) or 0)
        raw_value = round(float(row.get(f"adql_raw_{metric.label}", 0) or 0), 3)
        raw_values[metric.label] = raw_value

        radar_metrics.append(
            {
                "label": metric.label,
                "value": percentile,
                "description": f"Valor bruto: {raw_value}",
            }
        )

    payload = metrics_to_c04_radar(
        title=title or f"Perfil FBref — {player_name}",
        subtitle=subtitle,
        entity_name=f"{player_name} · {team_name}",
        metrics=radar_metrics,
        scale_max=100,
    )

    payload["description"] = (
        "Radar gerado a partir de estatísticas do FBref. "
        f"Os valores enviados ao C-04 são percentis 0-100 calculados dentro da base filtrada por mínimo de {min_90s} jogos de 90 minutos."
    )
    payload["source"] = source
    payload["data"]["source"] = source
    payload["data"]["rawMetrics"] = {
        "name": player_name,
        "team": team_name,
        "minutes90": round(float(row.get("adql_90s", 0) or 0), 1),
        "rawValues": raw_values,
    }
    payload["data"]["normalization"] = {
        "type": "percentile",
        "scale": "0-100",
        "min90s": min_90s,
    }

    return payload
