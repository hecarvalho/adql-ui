from __future__ import annotations

from dataclasses import dataclass
from difflib import get_close_matches
import math
import re
import unicodedata
from typing import Iterable, Sequence

import pandas as pd

from adql_analytics.adql_export.to_c05_player_comparison import players_to_c05_comparison


@dataclass(frozen=True)
class MetricComponent:
    per90_aliases: Sequence[str]
    total_aliases: Sequence[str] = ()
    weight: float = 1.0


@dataclass(frozen=True)
class PlayerMetricSpec:
    label: str
    components: Sequence[MetricComponent]
    higher_is_better: bool = True


DEFAULT_PLAYER_METRICS: tuple[PlayerMetricSpec, ...] = (
    PlayerMetricSpec(
        label="Gols/90",
        components=(
            MetricComponent(
                per90_aliases=(
                    "standard_per_90_minutes_gls",
                    "per_90_minutes_gls",
                    "per 90 minutes_gls",
                    "gls_per90",
                    "gls/90",
                ),
                total_aliases=(
                    "standard_performance_gls",
                    "performance_gls",
                    "gls",
                ),
            ),
        ),
    ),
    PlayerMetricSpec(
        label="Assistências/90",
        components=(
            MetricComponent(
                per90_aliases=(
                    "standard_per_90_minutes_ast",
                    "per_90_minutes_ast",
                    "per 90 minutes_ast",
                    "ast_per90",
                    "ast/90",
                ),
                total_aliases=(
                    "standard_performance_ast",
                    "performance_ast",
                    "ast",
                ),
            ),
        ),
    ),
    PlayerMetricSpec(
        label="xG/90",
        components=(
            MetricComponent(
                per90_aliases=(
                    "standard_per_90_minutes_xg",
                    "shooting_expected_xg/90",
                    "per_90_minutes_xg",
                    "xg_per90",
                    "xg/90",
                ),
                total_aliases=(
                    "standard_expected_xg",
                    "shooting_expected_xg",
                    "expected_xg",
                    "xg",
                ),
            ),
        ),
    ),
    PlayerMetricSpec(
        label="xAG/90",
        components=(
            MetricComponent(
                per90_aliases=(
                    "standard_per_90_minutes_xag",
                    "standard_per_90_minutes_xa",
                    "per_90_minutes_xag",
                    "xag_per90",
                    "xa_per90",
                    "xag/90",
                ),
                total_aliases=(
                    "standard_expected_xag",
                    "standard_expected_xa",
                    "expected_xag",
                    "expected_xa",
                    "xag",
                    "xa",
                ),
            ),
        ),
    ),
    PlayerMetricSpec(
        label="Chutes/90",
        components=(
            MetricComponent(
                per90_aliases=(
                    "shooting_standard_sh/90",
                    "standard_sh/90",
                    "sh/90",
                    "shots/90",
                ),
                total_aliases=(
                    "shooting_standard_sh",
                    "standard_sh",
                    "sh",
                    "shots",
                ),
            ),
        ),
    ),
    PlayerMetricSpec(
        label="Progressão/90",
        components=(
            MetricComponent(
                per90_aliases=("standard_progression_prgc/90", "prgc/90"),
                total_aliases=(
                    "standard_progression_prgc",
                    "progression_prgc",
                    "prgc",
                ),
            ),
            MetricComponent(
                per90_aliases=("standard_progression_prgp/90", "prgp/90"),
                total_aliases=(
                    "standard_progression_prgp",
                    "progression_prgp",
                    "prgp",
                ),
            ),
        ),
    ),
    PlayerMetricSpec(
        label="Defesa/90",
        components=(
            MetricComponent(
                per90_aliases=("misc_performance_tklw/90", "tklw/90"),
                total_aliases=(
                    "misc_performance_tklw",
                    "standard_performance_tklw",
                    "performance_tklw",
                    "tklw",
                ),
            ),
            MetricComponent(
                per90_aliases=("standard_performance_int/90", "misc_performance_int/90", "int/90"),
                total_aliases=(
                    "standard_performance_int",
                    "misc_performance_int",
                    "performance_int",
                    "int",
                ),
            ),
        ),
    ),
)

NINETIES_ALIASES = (
    "standard_playing_time_90s",
    "shooting_playing_time_90s",
    "misc_playing_time_90s",
    "playing_time_90s",
    "90s",
)

MINUTES_ALIASES = (
    "standard_playing_time_min",
    "playing_time_min",
    "min",
    "minutes",
)


def normalize_key(value: object) -> str:
    text = unicodedata.normalize("NFKD", str("" if value is None else value))
    text = text.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "", text.lower())


def normalize_name(value: object) -> str:
    text = unicodedata.normalize("NFKD", str("" if value is None else value))
    text = text.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"\s+", " ", text.lower()).strip()


def _column_lookup(df: pd.DataFrame) -> dict[str, str]:
    return {normalize_key(column): str(column) for column in df.columns}


def find_column(df: pd.DataFrame, aliases: Iterable[str]) -> str | None:
    lookup = _column_lookup(df)

    for alias in aliases:
        key = normalize_key(alias)

        if key in lookup:
            return lookup[key]

    for alias in aliases:
        key = normalize_key(alias)

        for normalized_column, original_column in lookup.items():
            if key and key in normalized_column:
                return original_column

    return None


def numeric_series(df: pd.DataFrame, column: str | None, default: float = 0.0) -> pd.Series:
    if not column or column not in df.columns:
        return pd.Series(default, index=df.index, dtype="float64")

    return pd.to_numeric(df[column], errors="coerce").fillna(default).astype("float64")


def add_minutes_context(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()
    nineties_col = find_column(output, NINETIES_ALIASES)
    minutes_col = find_column(output, MINUTES_ALIASES)

    if nineties_col:
        output["adql_90s"] = numeric_series(output, nineties_col)
    elif minutes_col:
        output["adql_90s"] = numeric_series(output, minutes_col) / 90
    else:
        output["adql_90s"] = 0.0

    output["adql_90s"] = output["adql_90s"].replace([math.inf, -math.inf], 0).fillna(0)
    return output


def _component_to_per90(df: pd.DataFrame, component: MetricComponent) -> pd.Series:
    per90_col = find_column(df, component.per90_aliases)

    if per90_col:
        return numeric_series(df, per90_col) * component.weight

    total_col = find_column(df, component.total_aliases)

    if total_col:
        nineties = df.get("adql_90s")
        if nineties is None:
            nineties = pd.Series(0.0, index=df.index)

        totals = numeric_series(df, total_col)
        per90 = totals / pd.to_numeric(nineties, errors="coerce").replace(0, pd.NA)
        return per90.replace([math.inf, -math.inf], pd.NA).fillna(0) * component.weight

    return pd.Series(0.0, index=df.index, dtype="float64")


def add_metric_columns(
    df: pd.DataFrame,
    metrics: Sequence[PlayerMetricSpec] = DEFAULT_PLAYER_METRICS,
) -> pd.DataFrame:
    output = add_minutes_context(df)

    for metric in metrics:
        series = pd.Series(0.0, index=output.index, dtype="float64")

        for component in metric.components:
            series = series + _component_to_per90(output, component)

        output[f"adql_raw_{metric.label}"] = series.replace([math.inf, -math.inf], 0).fillna(0)

    return output


def add_percentile_columns(
    df: pd.DataFrame,
    metrics: Sequence[PlayerMetricSpec] = DEFAULT_PLAYER_METRICS,
    min_90s: float = 5.0,
) -> pd.DataFrame:
    output = df.copy()
    base_mask = output["adql_90s"] >= float(min_90s)
    base = output.loc[base_mask]

    for metric in metrics:
        raw_column = f"adql_raw_{metric.label}"
        percentile_column = f"adql_pct_{metric.label}"

        if raw_column not in output.columns or base.empty:
            output[percentile_column] = 0.0
            continue

        rank_values = output[raw_column].rank(pct=True, ascending=metric.higher_is_better)
        # rank(ascending=True) gives higher raw values higher percentile.
        if not metric.higher_is_better:
            rank_values = output[raw_column].rank(pct=True, ascending=False)

        # Recalcula com a base filtrada para não punir jogadores com amostra irrelevante.
        base_rank = base[raw_column].rank(pct=True, ascending=metric.higher_is_better)
        if not metric.higher_is_better:
            base_rank = base[raw_column].rank(pct=True, ascending=False)

        output[percentile_column] = 0.0
        output.loc[base.index, percentile_column] = (base_rank * 100).round(1)

        missing_mask = ~base_mask
        if missing_mask.any():
            output.loc[missing_mask, percentile_column] = (rank_values.loc[missing_mask] * 100).round(1)

    score_columns = [f"adql_pct_{metric.label}" for metric in metrics]
    output["adql_score"] = output[score_columns].mean(axis=1).fillna(0)
    return output


def prepare_player_metric_table(
    df: pd.DataFrame,
    metrics: Sequence[PlayerMetricSpec] = DEFAULT_PLAYER_METRICS,
    min_90s: float = 5.0,
) -> pd.DataFrame:
    output = df.copy()

    if "player" not in output.columns:
        raise ValueError("A tabela precisa ter uma coluna `player`.")

    if "team" not in output.columns:
        output["team"] = "Equipe"

    output = add_metric_columns(output, metrics=metrics)
    output = add_percentile_columns(output, metrics=metrics, min_90s=min_90s)
    return output


def select_players_for_comparison(
    df: pd.DataFrame,
    players: Sequence[str] | None = None,
    max_players: int = 2,
) -> pd.DataFrame:
    output = df.copy()

    if not players:
        return (
            output.sort_values(["adql_90s", "adql_score"], ascending=[False, False])
            .head(max_players)
            .reset_index(drop=True)
        )

    output["adql_name_key"] = output["player"].map(normalize_name)
    selected_indices: list[int] = []
    all_keys = output["adql_name_key"].dropna().astype(str).unique().tolist()

    for query in players:
        query_key = normalize_name(query)
        matches = output[output["adql_name_key"] == query_key]

        if matches.empty:
            matches = output[output["adql_name_key"].str.contains(re.escape(query_key), na=False)]

        if matches.empty:
            close = get_close_matches(query_key, all_keys, n=1, cutoff=0.72)
            if close:
                matches = output[output["adql_name_key"] == close[0]]

        if matches.empty:
            available = ", ".join(output["player"].dropna().astype(str).head(8).tolist())
            raise ValueError(
                f"Jogador não encontrado no FBref: {query}. Exemplos disponíveis na tabela: {available}"
            )

        row = matches.sort_values(["adql_90s", "adql_score"], ascending=[False, False]).iloc[0]
        index = int(row.name)

        if index not in selected_indices:
            selected_indices.append(index)

    return output.loc[selected_indices].reset_index(drop=True)


def players_dataframe_to_c05_payload(
    df: pd.DataFrame,
    players: Sequence[str] | None = None,
    title: str = "Comparação FBref",
    subtitle: str = "Percentis calculados a partir de estatísticas públicas",
    metrics: Sequence[PlayerMetricSpec] = DEFAULT_PLAYER_METRICS,
    min_90s: float = 5.0,
    max_players: int = 2,
    source: str = "FBref via soccerdata / ADQL Analytics Layer",
) -> dict:
    table = prepare_player_metric_table(df, metrics=metrics, min_90s=min_90s)
    selected = select_players_for_comparison(table, players=players, max_players=max_players)

    metric_labels = [metric.label for metric in metrics]
    player_payloads = []
    raw_metrics = []

    for _, row in selected.iterrows():
        values = {
            metric.label: float(row.get(f"adql_pct_{metric.label}", 0) or 0)
            for metric in metrics
        }
        raw_values = {
            metric.label: round(float(row.get(f"adql_raw_{metric.label}", 0) or 0), 3)
            for metric in metrics
        }

        player_payloads.append(
            {
                "name": str(row.get("player", "Jogador")),
                "team": str(row.get("team", "Equipe")),
                "values": values,
            }
        )
        raw_metrics.append(
            {
                "name": str(row.get("player", "Jogador")),
                "team": str(row.get("team", "Equipe")),
                "minutes90": round(float(row.get("adql_90s", 0) or 0), 1),
                "rawValues": raw_values,
            }
        )

    payload = players_to_c05_comparison(
        title=title,
        subtitle=subtitle,
        players=player_payloads,
        metrics=metric_labels,
        scale_max=100,
    )

    payload["description"] = (
        "Comparação gerada a partir de estatísticas do FBref. "
        f"Os valores enviados ao radar são percentis 0-100 calculados dentro da base filtrada por mínimo de {min_90s} jogos de 90 minutos."
    )
    payload["source"] = source
    payload["data"]["source"] = source
    payload["data"]["rawMetrics"] = raw_metrics
    payload["data"]["normalization"] = {
        "type": "percentile",
        "scale": "0-100",
        "min90s": min_90s,
    }

    return payload
