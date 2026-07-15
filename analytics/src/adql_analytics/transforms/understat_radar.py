from __future__ import annotations

from typing import Sequence

import pandas as pd

from adql_analytics.adql_export.to_c04_radar import metrics_to_c04_radar
from adql_analytics.transforms.understat_table import (
    DEFAULT_UNDERSTAT_PLAYER_METRICS,
    UnderstatMetric,
    prepare_understat_player_table,
)


def _select_player(table: pd.DataFrame, player: str | None = None) -> pd.Series:
    """Seleciona um jogador para o radar Understat.

    Quando `player` não é informado, usa o maior score médio de percentis dentro
    da base filtrada. Quando informado, tenta correspondência exata e depois
    correspondência parcial sem diferenciar maiúsculas/minúsculas.
    """
    if table.empty:
        raise ValueError("Nenhum jogador disponível para gerar o radar C-04.")

    if not player:
        sorted_table = table.sort_values("adql_score", ascending=False).reset_index(drop=True)
        return sorted_table.iloc[0]

    query = str(player).strip().casefold()
    normalized = table.assign(_name=table["player"].astype(str).str.casefold())

    exact = normalized.loc[normalized["_name"] == query]
    if exact.empty:
        exact = normalized.loc[normalized["_name"].str.contains(query, regex=False, na=False)]

    if exact.empty:
        raise ValueError(f"Jogador não encontrado na base Understat: {player}")

    return exact.drop(columns=["_name"]).iloc[0]


def _metric_lookup(metrics: Sequence[UnderstatMetric]) -> dict[str, UnderstatMetric]:
    return {metric.label.lower(): metric for metric in metrics}


def _parse_metric_labels(
    metric_labels: Sequence[str] | None,
    metrics: Sequence[UnderstatMetric],
) -> list[UnderstatMetric]:
    default_labels = (
        "Gols/90",
        "xG/90",
        "npxG/90",
        "xA/90",
        "Chutes/90",
        "KP/90",
        "xGChain/90",
        "xGBuildup/90",
        "Gols - xG",
    )
    requested = [str(label).strip() for label in (metric_labels or default_labels) if str(label).strip()]
    lookup = _metric_lookup(metrics)
    resolved: list[UnderstatMetric] = []

    for label in requested:
        key = label.lower()
        if key not in lookup:
            available = ", ".join(metric.label for metric in metrics)
            raise ValueError(f"Métrica não encontrada: {label}. Métricas disponíveis: {available}")
        resolved.append(lookup[key])

    return resolved


def understat_player_to_c04_payload(
    df: pd.DataFrame,
    player: str | None = None,
    title: str | None = None,
    subtitle: str = "Radar de percentis calculado a partir de dados públicos do Understat",
    metric_labels: Sequence[str] | None = None,
    metrics: Sequence[UnderstatMetric] = DEFAULT_UNDERSTAT_PLAYER_METRICS,
    min_90s: float = 5.0,
    source: str = "Understat via soccerdata / ADQL Analytics Layer",
) -> dict:
    """Gera JSON C-04 Radar Profile a partir de estatísticas do Understat.

    Os valores enviados ao C-04 são percentis 0-100 calculados dentro da base
    consultada. Os valores brutos ficam preservados em `data.rawMetrics` para
    auditoria editorial e checagem antes da publicação.
    """
    table = prepare_understat_player_table(df, metrics=metrics, min_90s=min_90s)
    row = _select_player(table, player)

    player_name = str(row.get("player", "Jogador"))
    team_name = str(row.get("team", "Equipe"))
    position = str(row.get("position", ""))
    resolved_metrics = _parse_metric_labels(metric_labels, metrics)

    radar_metrics: list[dict] = []
    raw_values: dict[str, float] = {}
    percentile_values: dict[str, float] = {}

    for metric in resolved_metrics:
        raw_value = round(float(row.get(f"adql_raw_{metric.label}", 0) or 0), 3)
        percentile = round(float(row.get(f"adql_pct_{metric.label}", 0) or 0), 1)

        raw_values[metric.label] = raw_value
        percentile_values[metric.label] = percentile

        radar_metrics.append(
            {
                "label": metric.label,
                "value": percentile,
                "description": f"Valor bruto: {raw_value}",
            }
        )

    payload = metrics_to_c04_radar(
        title=title or f"Perfil Understat — {player_name}",
        subtitle=subtitle,
        entity_name=f"{player_name} · {team_name}",
        metrics=radar_metrics,
        scale_max=100,
    )

    payload["description"] = (
        "Radar gerado a partir de dados públicos do Understat. "
        "Use como apoio para leitura de volume, qualidade de chances, criação e participação na cadeia ofensiva. "
        f"Os percentis foram calculados dentro da base filtrada por mínimo de {min_90s} jogos de 90 minutos."
    )
    payload["source"] = source
    payload["data"]["source"] = source
    payload["data"]["rawMetrics"] = {
        "name": player_name,
        "team": team_name,
        "position": position,
        "minutes90": round(float(row.get("adql_90s", 0) or 0), 1),
        "rawValues": raw_values,
        "percentiles": percentile_values,
        "score": round(float(row.get("adql_score", 0) or 0), 1),
    }
    payload["data"]["normalization"] = {
        "type": "understat-player-season-percentile",
        "scale": "0-100",
        "min90s": min_90s,
        "metricCount": len(resolved_metrics),
    }

    return payload
