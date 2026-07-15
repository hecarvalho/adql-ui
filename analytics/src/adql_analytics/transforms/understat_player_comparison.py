from __future__ import annotations

from difflib import get_close_matches
import re
import unicodedata
from typing import Sequence

import pandas as pd

from adql_analytics.adql_export.to_c05_player_comparison import players_to_c05_comparison
from adql_analytics.transforms.understat_table import (
    DEFAULT_UNDERSTAT_PLAYER_METRICS,
    UnderstatMetric,
    prepare_understat_player_table,
)


def _normalize_name(value: object) -> str:
    """Normaliza nomes para busca tolerante no dataframe."""
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).strip().casefold()
    return text


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
    requested = [
        str(label).strip()
        for label in (metric_labels or default_labels)
        if str(label).strip()
    ]
    lookup = _metric_lookup(metrics)
    resolved: list[UnderstatMetric] = []

    for label in requested:
        key = label.lower()
        if key not in lookup:
            available = ", ".join(metric.label for metric in metrics)
            raise ValueError(
                f"Métrica não encontrada: {label}. Métricas disponíveis: {available}"
            )
        resolved.append(lookup[key])

    return resolved


def _select_players_for_comparison(
    table: pd.DataFrame,
    players: Sequence[str] | None = None,
    max_players: int = 2,
) -> pd.DataFrame:
    """Seleciona jogadores por nome ou pelo maior score ADQL.

    Quando `players` é omitido, retorna os jogadores com maior score médio de
    percentis. Quando nomes são informados, tenta correspondência exata,
    parcial e aproximação por similaridade.
    """
    if table.empty:
        raise ValueError("Nenhum jogador disponível na base Understat.")

    output = table.copy()

    if not players:
        return (
            output.sort_values(["adql_score", "adql_90s"], ascending=[False, False])
            .head(int(max_players))
            .reset_index(drop=True)
        )

    output["adql_name_key"] = output["player"].map(_normalize_name)
    all_keys = output["adql_name_key"].dropna().astype(str).unique().tolist()
    selected_indices: list[int] = []

    for query in players:
        query_key = _normalize_name(query)
        matches = output.loc[output["adql_name_key"] == query_key]

        if matches.empty and query_key:
            matches = output.loc[
                output["adql_name_key"].str.contains(
                    re.escape(query_key), regex=True, na=False
                )
            ]

        if matches.empty and query_key:
            close = get_close_matches(query_key, all_keys, n=1, cutoff=0.72)
            if close:
                matches = output.loc[output["adql_name_key"] == close[0]]

        if matches.empty:
            available = ", ".join(
                output["player"].dropna().astype(str).head(8).tolist()
            )
            raise ValueError(
                f"Jogador não encontrado na base Understat: {query}. "
                f"Exemplos disponíveis: {available}"
            )

        row = matches.sort_values(["adql_score", "adql_90s"], ascending=[False, False]).iloc[0]
        row_index = int(row.name)

        if row_index not in selected_indices:
            selected_indices.append(row_index)

    return output.loc[selected_indices].drop(columns=["adql_name_key"]).reset_index(drop=True)


def understat_players_to_c05_payload(
    df: pd.DataFrame,
    players: Sequence[str] | None = None,
    title: str = "Comparação Understat",
    subtitle: str = "Percentis 0-100 calculados a partir de dados públicos do Understat",
    metric_labels: Sequence[str] | None = None,
    metrics: Sequence[UnderstatMetric] = DEFAULT_UNDERSTAT_PLAYER_METRICS,
    min_90s: float = 5.0,
    max_players: int = 2,
    source: str = "Understat via soccerdata / ADQL Analytics Layer",
) -> dict:
    """Gera JSON C-05 Player Comparison a partir de estatísticas do Understat.

    O C-05 recebe percentis 0-100 para radar/barras. Valores brutos e percentis
    por métrica são preservados em `data.rawMetrics` para conferência antes da
    publicação.
    """
    prepared = prepare_understat_player_table(df, metrics=metrics, min_90s=min_90s)
    selected = _select_players_for_comparison(
        prepared,
        players=players,
        max_players=max_players,
    )
    resolved_metrics = _parse_metric_labels(metric_labels, metrics)
    metric_names = [metric.label for metric in resolved_metrics]

    player_payloads: list[dict] = []
    raw_metrics: list[dict] = []

    for _, row in selected.iterrows():
        values: dict[str, float] = {}
        raw_values: dict[str, float] = {}
        percentile_values: dict[str, float] = {}

        for metric in resolved_metrics:
            raw_value = round(float(row.get(f"adql_raw_{metric.label}", 0) or 0), 3)
            percentile = round(float(row.get(f"adql_pct_{metric.label}", 0) or 0), 1)

            values[metric.label] = percentile
            raw_values[metric.label] = raw_value
            percentile_values[metric.label] = percentile

        player_name = str(row.get("player", "Jogador"))
        team_name = str(row.get("team", "Equipe"))

        player_payloads.append(
            {
                "name": player_name,
                "team": team_name,
                "values": values,
            }
        )
        raw_metrics.append(
            {
                "name": player_name,
                "team": team_name,
                "position": str(row.get("position", "")),
                "minutes90": round(float(row.get("adql_90s", 0) or 0), 1),
                "rawValues": raw_values,
                "percentiles": percentile_values,
                "score": round(float(row.get("adql_score", 0) or 0), 1),
            }
        )

    payload = players_to_c05_comparison(
        title=title,
        subtitle=subtitle,
        players=player_payloads,
        metrics=metric_names,
        scale_max=100,
    )

    payload["description"] = (
        "Comparação gerada a partir de dados públicos do Understat. "
        "Use como apoio para leitura de volume ofensivo, qualidade de chances, criação "
        "e participação na cadeia de xG. "
        f"Os valores enviados ao C-05 são percentis 0-100 calculados dentro da base filtrada por mínimo de {min_90s} jogos de 90 minutos."
    )
    payload["source"] = source
    payload["data"]["source"] = source
    payload["data"]["rawMetrics"] = raw_metrics
    payload["data"]["normalization"] = {
        "type": "understat-player-season-percentile",
        "scale": "0-100",
        "min90s": min_90s,
        "metricCount": len(metric_names),
    }

    return payload
