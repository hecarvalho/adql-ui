from __future__ import annotations

from dataclasses import dataclass
from typing import Sequence

import pandas as pd

from adql_analytics.adql_export.to_c06_table import dataframe_to_c06_table


@dataclass(frozen=True)
class UnderstatMetric:
    label: str
    column: str
    mode: str = "per90"  # total | per90 | diff
    decimals: int = 2


DEFAULT_UNDERSTAT_PLAYER_METRICS: tuple[UnderstatMetric, ...] = (
    UnderstatMetric("Gols/90", "goals", "per90", 2),
    UnderstatMetric("xG/90", "xg", "per90", 2),
    UnderstatMetric("npxG/90", "npxg", "per90", 2),
    UnderstatMetric("xA/90", "xa", "per90", 2),
    UnderstatMetric("Chutes/90", "shots", "per90", 2),
    UnderstatMetric("KP/90", "key_passes", "per90", 2),
    UnderstatMetric("xGChain/90", "xgchain", "per90", 2),
    UnderstatMetric("xGBuildup/90", "xgbuildup", "per90", 2),
    UnderstatMetric("Gols - xG", "goals_xg_delta", "total", 2),
)

_ID_CANDIDATES = {
    "player": ("player", "player_name", "name"),
    "team": ("team", "squad", "team_title", "team_name"),
    "league": ("league", "competition"),
    "season": ("season", "year"),
    "position": ("position", "pos"),
    "minutes": ("time", "minutes", "min", "mins"),
    "games": ("games", "apps", "appearances", "matches"),
}


def _clean_columns(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()
    output.columns = [
        str(column)
        .strip()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("-", "_")
        .replace(".", "_")
        .lower()
        for column in output.columns
    ]
    return output


def _find_column(df: pd.DataFrame, candidates: Sequence[str]) -> str | None:
    columns = {str(column).lower(): column for column in df.columns}

    for candidate in candidates:
        key = str(candidate).lower()
        if key in columns:
            return columns[key]

    return None


def _series(df: pd.DataFrame, column: str | None, default: object = "") -> pd.Series:
    if column and column in df.columns:
        return df[column]
    return pd.Series([default] * len(df), index=df.index)


def _numeric(df: pd.DataFrame, column: str | None, default: float = 0.0) -> pd.Series:
    if column and column in df.columns:
        return pd.to_numeric(df[column], errors="coerce").fillna(default)
    return pd.Series([default] * len(df), index=df.index, dtype="float64")


def _format_number(value: object, decimals: int = 2) -> str:
    numeric = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]

    if pd.isna(numeric):
        return "—"

    number = float(numeric)

    if decimals <= 0:
        return f"{number:.0f}"

    text = f"{number:.{decimals}f}"
    return text.replace(".00", "")


def _resolve_identity_column(df: pd.DataFrame, key: str) -> str | None:
    return _find_column(df, _ID_CANDIDATES[key])


def _resolve_metric_column(df: pd.DataFrame, column: str) -> str | None:
    normalized = str(column).strip().lower()
    candidates = {
        "xg": ("xg", "expected_goals"),
        "npxg": ("npxg", "np_xg", "non_penalty_xg"),
        "xa": ("xa", "xag", "expected_assists"),
        "shots": ("shots", "sh", "total_shots"),
        "key_passes": ("key_passes", "keypasses", "kp"),
        "xgchain": ("xgchain", "xg_chain"),
        "xgbuildup": ("xgbuildup", "xg_buildup"),
        "goals": ("goals", "g"),
        "assists": ("assists", "a"),
    }
    return _find_column(df, candidates.get(normalized, (normalized,)))


def prepare_understat_player_table(
    df: pd.DataFrame,
    metrics: Sequence[UnderstatMetric] = DEFAULT_UNDERSTAT_PLAYER_METRICS,
    min_90s: float = 5.0,
) -> pd.DataFrame:
    """Normaliza uma base Understat de jogadores e calcula métricas editoriais."""
    source = _clean_columns(df)
    output = pd.DataFrame(index=source.index)

    player_col = _resolve_identity_column(source, "player")
    team_col = _resolve_identity_column(source, "team")
    league_col = _resolve_identity_column(source, "league")
    season_col = _resolve_identity_column(source, "season")
    position_col = _resolve_identity_column(source, "position")
    minutes_col = _resolve_identity_column(source, "minutes")
    games_col = _resolve_identity_column(source, "games")

    output["player"] = _series(source, player_col, "Jogador").astype(str)
    output["team"] = _series(source, team_col, "Equipe").astype(str)
    output["league"] = _series(source, league_col, "").astype(str)
    output["season"] = _series(source, season_col, "").astype(str)
    output["position"] = _series(source, position_col, "").astype(str)

    minutes = _numeric(source, minutes_col, 0.0)
    games = _numeric(source, games_col, 0.0)

    # Understat costuma expor `time` em minutos. Caso não exista, usa jogos como proxy de 90s.
    minutes90 = minutes.div(90).where(minutes > 0, games)
    minutes90 = minutes90.replace(0, pd.NA).astype("float64")
    output["adql_90s"] = minutes90.fillna(0.0)

    goals_col = _resolve_metric_column(source, "goals")
    xg_col = _resolve_metric_column(source, "xg")
    goals = _numeric(source, goals_col, 0.0)
    xg = _numeric(source, xg_col, 0.0)
    output["adql_raw_Gols - xG"] = goals.sub(xg)

    metric_values: list[str] = []

    for metric in metrics:
        raw_column_name = f"adql_raw_{metric.label}"

        if metric.column == "goals_xg_delta":
            values = output["adql_raw_Gols - xG"]
        else:
            column = _resolve_metric_column(source, metric.column)
            base = _numeric(source, column, 0.0)

            if metric.mode == "per90":
                values = base.div(output["adql_90s"].replace(0, pd.NA)).fillna(0.0)
            else:
                values = base

        output[raw_column_name] = values.astype(float)
        percentile_column = f"adql_pct_{metric.label}"
        output[percentile_column] = output[raw_column_name].rank(pct=True).mul(100).fillna(0.0)
        metric_values.append(percentile_column)

    if metric_values:
        output["adql_score"] = output[metric_values].mean(axis=1).fillna(0.0)
    else:
        output["adql_score"] = 0.0

    filtered = output.loc[output["adql_90s"] >= float(min_90s)].copy()
    if filtered.empty:
        filtered = output.copy()

    return filtered.reset_index(drop=True)


def _metric_lookup(metrics: Sequence[UnderstatMetric]) -> dict[str, UnderstatMetric]:
    return {metric.label.lower(): metric for metric in metrics}


def _parse_metric_labels(
    metric_labels: Sequence[str] | None,
    metrics: Sequence[UnderstatMetric],
) -> list[UnderstatMetric]:
    default_labels = ("Gols/90", "xG/90", "xA/90", "Chutes/90", "KP/90", "Gols - xG")
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


def _select_players(table: pd.DataFrame, players: Sequence[str] | None) -> pd.DataFrame:
    if not players:
        return table

    selected_rows = []
    normalized = table.assign(_name=table["player"].astype(str).str.casefold())

    for player in players:
        query = str(player).strip().casefold()
        exact = normalized.loc[normalized["_name"] == query]

        if exact.empty:
            exact = normalized.loc[normalized["_name"].str.contains(query, regex=False, na=False)]

        if exact.empty:
            raise ValueError(f"Jogador não encontrado na base Understat: {player}")

        selected_rows.append(exact.iloc[[0]].drop(columns=["_name"]))

    return pd.concat(selected_rows, ignore_index=True)


def _sort_column(sort_metric: str, sort_mode: str) -> str:
    metric = str(sort_metric or "score").strip()

    if metric.lower() in {"score", "adql_score", "pontuação", "pontuacao"}:
        return "adql_score"

    prefix = "adql_pct_" if sort_mode == "percentile" else "adql_raw_"
    return f"{prefix}{metric}"


def understat_players_to_c06_payload(
    df: pd.DataFrame,
    players: Sequence[str] | None = None,
    title: str = "Tabela Understat — xG e criação",
    subtitle: str = "Dados públicos tratados pelo ADQL Analytics Layer",
    metric_labels: Sequence[str] | None = None,
    metrics: Sequence[UnderstatMetric] = DEFAULT_UNDERSTAT_PLAYER_METRICS,
    value_type: str = "raw",
    sort_metric: str = "xG/90",
    sort_mode: str = "raw",
    min_90s: float = 5.0,
    max_rows: int = 10,
    source: str = "Understat via soccerdata / ADQL Analytics Layer",
) -> dict:
    """Gera JSON C-06 com ranking ou comparação de jogadores via Understat."""
    value_type = "percentile" if str(value_type).lower().startswith("p") else "raw"
    sort_mode = "percentile" if str(sort_mode).lower().startswith("p") else "raw"

    prepared = prepare_understat_player_table(df, metrics=metrics, min_90s=min_90s)
    selected = _select_players(prepared, players)

    if not players:
        column = _sort_column(sort_metric, sort_mode)
        if column not in selected.columns:
            available = [metric.label for metric in metrics]
            raise ValueError(f"Coluna de ordenação não encontrada: {sort_metric}. Opções: score, {', '.join(available)}")
        selected = selected.sort_values(column, ascending=False).head(int(max_rows)).reset_index(drop=True)

    resolved_metrics = _parse_metric_labels(metric_labels, metrics)
    rows: list[dict[str, str]] = []
    raw_metrics: list[dict] = []

    for rank, (_, row) in enumerate(selected.iterrows(), start=1):
        output_row: dict[str, str] = {
            "#": str(rank),
            "Jogador": str(row.get("player", "Jogador")),
            "Equipe": str(row.get("team", "Equipe")),
            "Posição": str(row.get("position", "")) or "—",
            "90s": _format_number(row.get("adql_90s", 0), decimals=1),
        }
        raw_values: dict[str, float] = {}
        percentiles: dict[str, float] = {}

        for metric in resolved_metrics:
            raw_value = float(row.get(f"adql_raw_{metric.label}", 0) or 0)
            pct_value = float(row.get(f"adql_pct_{metric.label}", 0) or 0)
            raw_values[metric.label] = round(raw_value, 3)
            percentiles[metric.label] = round(pct_value, 1)
            output_row[metric.label] = _format_number(
                pct_value if value_type == "percentile" else raw_value,
                decimals=0 if value_type == "percentile" else metric.decimals,
            )

        output_row["Score"] = _format_number(row.get("adql_score", 0), decimals=0)
        rows.append(output_row)
        raw_metrics.append(
            {
                "rank": rank,
                "name": str(row.get("player", "Jogador")),
                "team": str(row.get("team", "Equipe")),
                "position": str(row.get("position", "")),
                "minutes90": round(float(row.get("adql_90s", 0) or 0), 1),
                "rawValues": raw_values,
                "percentiles": percentiles,
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
        "Tabela gerada a partir de dados públicos do Understat. "
        "Use como apoio para leitura de volume, qualidade de chances e criação ofensiva."
    )
    payload["source"] = source
    payload["data"]["source"] = source
    payload["data"]["rawMetrics"] = raw_metrics
    payload["data"]["normalization"] = {
        "type": "understat-player-season",
        "scale": "raw/percentile",
        "min90s": min_90s,
        "displayValueType": value_type,
        "sortMetric": sort_metric,
        "sortMode": sort_mode,
    }
    return payload
