from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import pandas as pd

from adql_analytics.adql_export.to_c06_table import dataframe_to_c06_table
from adql_analytics.transforms.player_comparison import (
    DEFAULT_PLAYER_METRICS,
    PlayerMetricSpec,
    prepare_player_metric_table,
    select_players_for_comparison,
)


@dataclass(frozen=True)
class TableMetricColumn:
    """Configuração de uma métrica exibida na tabela C-06."""

    label: str
    value_type: str = "raw"  # raw | percentile


def _format_number(value: object, decimals: int = 2) -> str:
    numeric = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]

    if pd.isna(numeric):
        return "—"

    number = float(numeric)

    if decimals <= 0:
        return f"{number:.0f}"

    text = f"{number:.{decimals}f}"
    return text.replace(".00", "")


def _metric_lookup(metrics: Sequence[PlayerMetricSpec]) -> dict[str, PlayerMetricSpec]:
    return {metric.label.lower(): metric for metric in metrics}


def resolve_metric_columns(
    labels: Sequence[str] | None,
    metrics: Sequence[PlayerMetricSpec] = DEFAULT_PLAYER_METRICS,
    value_type: str = "raw",
) -> list[TableMetricColumn]:
    """Resolve nomes de métricas informados pelo usuário para colunas de tabela.

    Se `labels` vier vazio, usa um conjunto editorial compacto para não criar
    uma tabela larga demais no C-06.
    """
    default_labels = ("Gols/90", "Assistências/90", "xG/90", "xAG/90", "Chutes/90")
    requested = [str(label).strip() for label in (labels or default_labels) if str(label).strip()]
    lookup = _metric_lookup(metrics)
    resolved: list[TableMetricColumn] = []

    for label in requested:
        key = label.lower()
        if key not in lookup:
            available = ", ".join(metric.label for metric in metrics)
            raise ValueError(f"Métrica não encontrada: {label}. Métricas disponíveis: {available}")

        resolved.append(TableMetricColumn(label=lookup[key].label, value_type=value_type))

    return resolved


def _sort_column_for_metric(sort_metric: str, sort_mode: str) -> str:
    metric = str(sort_metric or "score").strip()

    if metric.lower() in {"score", "pontuação", "pontuacao", "adql_score"}:
        return "adql_score"

    prefix = "adql_pct_" if sort_mode == "percentile" else "adql_raw_"
    return f"{prefix}{metric}"


def _select_table_rows(
    table: pd.DataFrame,
    players: Sequence[str] | None,
    max_rows: int,
    sort_metric: str,
    sort_mode: str,
    min_90s: float,
) -> pd.DataFrame:
    if players:
        return select_players_for_comparison(
            table,
            players=players,
            max_players=max(len(players), 1),
        )

    filtered = table.loc[table["adql_90s"] >= float(min_90s)].copy()

    if filtered.empty:
        filtered = table.copy()

    sort_column = _sort_column_for_metric(sort_metric, sort_mode)

    if sort_column not in filtered.columns:
        available = [column.replace("adql_raw_", "") for column in filtered.columns if column.startswith("adql_raw_")]
        available_text = ", ".join(available)
        raise ValueError(f"Coluna de ordenação não encontrada: {sort_metric}. Opções: score, {available_text}")

    return (
        filtered.sort_values(sort_column, ascending=False)
        .head(int(max_rows))
        .reset_index(drop=True)
    )


def players_dataframe_to_c06_payload(
    df: pd.DataFrame,
    players: Sequence[str] | None = None,
    title: str = "Tabela FBref",
    subtitle: str = "Estatísticas públicas tratadas pelo ADQL Analytics Layer",
    metrics: Sequence[PlayerMetricSpec] = DEFAULT_PLAYER_METRICS,
    metric_labels: Sequence[str] | None = None,
    value_type: str = "raw",
    sort_metric: str = "score",
    sort_mode: str = "percentile",
    min_90s: float = 5.0,
    max_rows: int = 10,
    source: str = "FBref via soccerdata / ADQL Analytics Layer",
) -> dict:
    """Gera JSON compatível com C-06 Table Builder a partir de dados FBref.

    O payload mantém a tabela simples para o editor visual: colunas textuais e
    linhas já formatadas. Dados de auditoria ficam preservados em `data.rawMetrics`.
    """
    value_type = "percentile" if str(value_type).lower().startswith("p") else "raw"
    sort_mode = "percentile" if str(sort_mode).lower().startswith("p") else "raw"

    prepared = prepare_player_metric_table(df, metrics=metrics, min_90s=min_90s)
    selected = _select_table_rows(
        prepared,
        players=players,
        max_rows=max_rows,
        sort_metric=sort_metric,
        sort_mode=sort_mode,
        min_90s=min_90s,
    )
    columns = resolve_metric_columns(metric_labels, metrics=metrics, value_type=value_type)

    rows: list[dict[str, str]] = []
    raw_metrics: list[dict] = []

    for index, (_, row) in enumerate(selected.iterrows(), start=1):
        output_row: dict[str, str] = {
            "#": str(index),
            "Jogador": str(row.get("player", "Jogador")),
            "Equipe": str(row.get("team", "Equipe")),
            "90s": _format_number(row.get("adql_90s", 0), decimals=1),
        }

        raw_values: dict[str, float] = {}
        percentile_values: dict[str, float] = {}

        for column in columns:
            raw_value = float(row.get(f"adql_raw_{column.label}", 0) or 0)
            percentile_value = float(row.get(f"adql_pct_{column.label}", 0) or 0)
            raw_values[column.label] = round(raw_value, 3)
            percentile_values[column.label] = round(percentile_value, 1)

            if column.value_type == "percentile":
                output_row[column.label] = _format_number(percentile_value, decimals=0)
            else:
                output_row[column.label] = _format_number(raw_value, decimals=2)

        output_row["Score"] = _format_number(row.get("adql_score", 0), decimals=0)
        rows.append(output_row)

        raw_metrics.append(
            {
                "rank": index,
                "name": str(row.get("player", "Jogador")),
                "team": str(row.get("team", "Equipe")),
                "minutes90": round(float(row.get("adql_90s", 0) or 0), 1),
                "rawValues": raw_values,
                "percentiles": percentile_values,
                "score": round(float(row.get("adql_score", 0) or 0), 1),
            }
        )

    table_df = pd.DataFrame(rows)

    payload = dataframe_to_c06_table(
        df=table_df,
        title=title,
        subtitle=subtitle,
        max_rows=None,
    )
    payload["description"] = (
        "Tabela gerada a partir de estatísticas do FBref. "
        "Os valores exibidos podem ser brutos por 90 ou percentis, conforme o modo escolhido no exportador."
    )
    payload["source"] = source
    payload["data"]["source"] = source
    payload["data"]["rawMetrics"] = raw_metrics
    payload["data"]["normalization"] = {
        "type": "percentile",
        "scale": "0-100",
        "min90s": min_90s,
        "displayValueType": value_type,
        "sortMetric": sort_metric,
        "sortMode": sort_mode,
    }

    return payload
