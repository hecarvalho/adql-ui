from __future__ import annotations

from dataclasses import dataclass
import math
import re
import unicodedata
from typing import Iterable, Sequence

import pandas as pd

from adql_analytics.adql_export.to_c04_radar import metrics_to_c04_radar
from adql_analytics.adql_export.to_c05_player_comparison import players_to_c05_comparison


@dataclass(frozen=True)
class DatabaseMetric:
    label: str
    column: str
    higher_is_better: bool = True
    description: str = ""


DEFAULT_DATABASE_PLAYER_METRICS: tuple[DatabaseMetric, ...] = (
    DatabaseMetric("Gols/90", "goals_per90", description="Gols por 90 minutos"),
    DatabaseMetric("Assistências/90", "assists_per90", description="Assistências por 90 minutos"),
    DatabaseMetric("xG/90", "xg_per90", description="Expected goals por 90 minutos"),
    DatabaseMetric("xA/90", "xa_per90", description="Expected assists/xA por 90 minutos"),
    DatabaseMetric("Chutes/90", "shots_per90", description="Finalizações por 90 minutos"),
    DatabaseMetric("Progressão/90", "progressive_actions_per90", description="Ações progressivas por 90 minutos"),
    DatabaseMetric("Defesa/90", "defensive_actions_per90", description="Ações defensivas por 90 minutos"),
)


def normalize_name(value: object) -> str:
    text = unicodedata.normalize("NFKD", str("" if value is None else value))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = re.sub(r"[^a-zA-Z0-9]+", " ", text).strip().lower()
    return re.sub(r"\s+", " ", text)


def _safe_float(value: object, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        output = float(value)
        if math.isnan(output) or math.isinf(output):
            return default
        return output
    except (TypeError, ValueError):
        return default


def _percentile_series(series: pd.Series, *, higher_is_better: bool = True) -> pd.Series:
    numeric = pd.to_numeric(series, errors="coerce").fillna(0).astype("float64")
    if numeric.empty:
        return numeric
    ascending = bool(higher_is_better)
    percentile = numeric.rank(method="average", pct=True, ascending=ascending) * 100
    return percentile.fillna(0).clip(0, 100)


def _latest_season_filter_clause(season: str | None) -> tuple[str, dict[str, object]]:
    if not season:
        return "", {}
    return " AND se.label = :season_label", {"season_label": season}


def _source_filter_clause(source: str | None) -> tuple[str, dict[str, object]]:
    if not source:
        return "", {}
    return " AND ps.source_id = :source_id", {"source_id": source}


def _competition_filter_clause(competition: str | None) -> tuple[str, dict[str, object]]:
    if not competition:
        return "", {}
    return " AND LOWER(c.name) LIKE :competition_like", {"competition_like": f"%{competition.lower()}%"}


def load_database_player_metric_table(
    repo,
    *,
    source: str | None = None,
    season: str | None = None,
    competition: str | None = None,
    min_minutes: float = 450,
) -> pd.DataFrame:
    """Lê player_stats do SQLite e calcula métricas por 90 + percentis.

    A tabela resultante é a base única para exportar C-04, C-05 e C-06 a partir do banco.
    """
    clauses = ["COALESCE(ps.minutes, 0) >= :min_minutes"]
    params: dict[str, object] = {"min_minutes": min_minutes}

    source_clause, source_params = _source_filter_clause(source)
    season_clause, season_params = _latest_season_filter_clause(season)
    competition_clause, competition_params = _competition_filter_clause(competition)

    if source_clause:
        clauses.append(source_clause.replace(" AND ", "", 1))
        params.update(source_params)
    if season_clause:
        clauses.append(season_clause.replace(" AND ", "", 1))
        params.update(season_params)
    if competition_clause:
        clauses.append(competition_clause.replace(" AND ", "", 1))
        params.update(competition_params)

    where_sql = " AND ".join(clauses)

    df = repo.query_dataframe(
        f"""
        SELECT
          p.player_id,
          p.name AS player,
          t.name AS team,
          ps.source_id,
          s.name AS source_name,
          c.name AS competition,
          se.label AS season,
          ps.minutes,
          ps.appearances,
          ps.starts,
          ps.goals,
          ps.assists,
          ps.xg,
          ps.xa,
          ps.npxg,
          ps.xag,
          ps.shots,
          ps.key_passes,
          ps.progressive_actions,
          ps.defensive_actions
        FROM player_stats ps
        JOIN players p ON p.player_id = ps.player_id
        LEFT JOIN teams t ON t.team_id = ps.team_id
        LEFT JOIN sources s ON s.source_id = ps.source_id
        LEFT JOIN competitions c ON c.competition_id = ps.competition_id
        LEFT JOIN seasons se ON se.season_id = ps.season_id
        WHERE {where_sql}
        ORDER BY ps.source_id, se.label DESC, p.name ASC
        """,
        params,
    )

    if df.empty:
        return df

    output = df.copy()
    output["minutes"] = pd.to_numeric(output["minutes"], errors="coerce").fillna(0)
    minutes_factor = output["minutes"].replace(0, pd.NA) / 90.0

    def per90(column: str) -> pd.Series:
        values = pd.to_numeric(output.get(column, 0), errors="coerce").fillna(0)
        return (values / minutes_factor).replace([math.inf, -math.inf], 0).fillna(0)

    output["goals_per90"] = per90("goals")
    output["assists_per90"] = per90("assists")
    output["xg_per90"] = per90("xg")
    output["xa_per90"] = per90("xa")
    output["shots_per90"] = per90("shots")
    output["key_passes_per90"] = per90("key_passes")
    output["progressive_actions_per90"] = per90("progressive_actions")
    output["defensive_actions_per90"] = per90("defensive_actions")

    for metric in DEFAULT_DATABASE_PLAYER_METRICS:
        output[f"pct_{metric.label}"] = _percentile_series(
            output[metric.column],
            higher_is_better=metric.higher_is_better,
        )

    output["normalized_player"] = output["player"].map(normalize_name)
    return output


def select_database_players(
    table: pd.DataFrame,
    *,
    players: Sequence[str] | None = None,
    max_players: int = 2,
    sort_metric: str = "xg_per90",
) -> pd.DataFrame:
    if table.empty:
        return table

    if not players:
        sort_column = sort_metric if sort_metric in table.columns else "xg_per90"
        return table.sort_values(sort_column, ascending=False).head(max_players).copy()

    selected_indexes: list[int] = []
    normalized_targets = [normalize_name(player) for player in players if str(player).strip()]

    for target in normalized_targets:
        exact = table[table["normalized_player"] == target]
        if not exact.empty:
            selected_indexes.append(int(exact.index[0]))
            continue

        contains = table[table["normalized_player"].str.contains(target, regex=False, na=False)]
        if not contains.empty:
            selected_indexes.append(int(contains.index[0]))
            continue

        reverse_contains = table[table["normalized_player"].map(lambda value: value in target if value else False)]
        if not reverse_contains.empty:
            selected_indexes.append(int(reverse_contains.index[0]))

    if not selected_indexes:
        available = ", ".join(table["player"].dropna().astype(str).head(12).tolist())
        raise ValueError(f"Nenhum jogador informado foi encontrado no banco. Disponíveis: {available}")

    selected = table.loc[list(dict.fromkeys(selected_indexes))].head(max_players).copy()
    return selected


def database_players_to_c05_payload(
    table: pd.DataFrame,
    *,
    players: Sequence[str] | None = None,
    title: str | None = None,
    subtitle: str = "Percentis 0-100 calculados a partir do SQLite ADQL Analytics",
    max_players: int = 2,
    metrics: Sequence[DatabaseMetric] = DEFAULT_DATABASE_PLAYER_METRICS,
) -> dict:
    selected = select_database_players(table, players=players, max_players=max_players)
    if selected.empty:
        raise ValueError("Nenhum jogador disponível para gerar C-05 a partir do banco.")

    metric_labels = [metric.label for metric in metrics]
    c05_players = []
    raw_metrics = []

    for _, row in selected.iterrows():
        values = {metric.label: _safe_float(row.get(f"pct_{metric.label}")) for metric in metrics}
        raw_values = {metric.label: round(_safe_float(row.get(metric.column)), 3) for metric in metrics}
        c05_players.append(
            {
                "name": str(row.get("player") or "Jogador"),
                "team": str(row.get("team") or "Equipe"),
                "values": values,
            }
        )
        raw_metrics.append(
            {
                "name": str(row.get("player") or "Jogador"),
                "team": str(row.get("team") or "Equipe"),
                "source": str(row.get("source_name") or row.get("source_id") or "database"),
                "competition": str(row.get("competition") or ""),
                "season": str(row.get("season") or ""),
                "minutes": round(_safe_float(row.get("minutes")), 1),
                "rawValues": raw_values,
            }
        )

    resolved_title = title or " × ".join(player["name"] for player in c05_players)
    payload = players_to_c05_comparison(
        title=resolved_title,
        subtitle=subtitle,
        players=c05_players,
        metrics=metric_labels,
        scale_max=100,
    )
    payload["description"] = "Comparação gerada a partir do banco SQLite ADQL Analytics."
    payload["source"] = "ADQL Analytics Database"
    payload["data"]["rawMetrics"] = raw_metrics
    payload["data"]["normalization"] = {
        "type": "percentile",
        "scale": "0-100",
        "basis": "player_stats SQLite",
    }
    return payload


def database_player_to_c04_payload(
    table: pd.DataFrame,
    *,
    player: str | None = None,
    title: str | None = None,
    subtitle: str = "Percentis 0-100 calculados a partir do SQLite ADQL Analytics",
    metrics: Sequence[DatabaseMetric] = DEFAULT_DATABASE_PLAYER_METRICS,
) -> dict:
    selected = select_database_players(table, players=[player] if player else None, max_players=1)
    if selected.empty:
        raise ValueError("Nenhum jogador disponível para gerar C-04 a partir do banco.")

    row = selected.iloc[0]
    player_name = str(row.get("player") or "Jogador")
    team_name = str(row.get("team") or "Equipe")

    radar_metrics = []
    raw_values: dict[str, float] = {}
    for metric in metrics:
        percentile = _safe_float(row.get(f"pct_{metric.label}"))
        raw_value = round(_safe_float(row.get(metric.column)), 3)
        raw_values[metric.label] = raw_value
        radar_metrics.append(
            {
                "label": metric.label,
                "value": percentile,
                "description": metric.description or f"Valor bruto: {raw_value}",
            }
        )

    payload = metrics_to_c04_radar(
        title=title or f"Perfil no banco — {player_name}",
        subtitle=subtitle,
        entity_name=f"{player_name} · {team_name}",
        metrics=radar_metrics,
        scale_max=100,
    )
    payload["description"] = "Radar gerado a partir do banco SQLite ADQL Analytics."
    payload["source"] = "ADQL Analytics Database"
    payload["data"]["source"] = "ADQL Analytics Database"
    payload["data"]["rawMetrics"] = {
        "name": player_name,
        "team": team_name,
        "source": str(row.get("source_name") or row.get("source_id") or "database"),
        "competition": str(row.get("competition") or ""),
        "season": str(row.get("season") or ""),
        "minutes": round(_safe_float(row.get("minutes")), 1),
        "rawValues": raw_values,
    }
    payload["data"]["normalization"] = {
        "type": "percentile",
        "scale": "0-100",
        "basis": "player_stats SQLite",
    }
    return payload


def database_players_to_table(table: pd.DataFrame, *, limit: int = 12, sort_metric: str = "xg_per90") -> pd.DataFrame:
    if table.empty:
        return table
    sort_column = sort_metric if sort_metric in table.columns else "xg_per90"
    output = table.sort_values(sort_column, ascending=False).head(limit).copy()
    return pd.DataFrame(
        {
            "Jogador": output["player"],
            "Equipe": output["team"].fillna(""),
            "Fonte": output["source_name"].fillna(output["source_id"]),
            "Temporada": output["season"].fillna(""),
            "Min": output["minutes"].round(0),
            "Gols/90": output["goals_per90"].round(2),
            "Assist/90": output["assists_per90"].round(2),
            "xG/90": output["xg_per90"].round(2),
            "xA/90": output["xa_per90"].round(2),
            "Chutes/90": output["shots_per90"].round(2),
        }
    )


def database_match_results_table(repo, *, limit: int = 12) -> pd.DataFrame:
    return repo.query_dataframe(
        """
        SELECT
          mr.match_date AS Data,
          ht.name AS Mandante,
          mr.home_goals AS GM,
          mr.away_goals AS GV,
          at.name AS Visitante,
          ROUND(mr.home_shots, 1) AS "Finalizações M",
          ROUND(mr.away_shots, 1) AS "Finalizações V",
          ROUND(mr.home_shots_on_target, 1) AS "No alvo M",
          ROUND(mr.away_shots_on_target, 1) AS "No alvo V",
          s.name AS Fonte
        FROM match_results mr
        LEFT JOIN teams ht ON ht.team_id = mr.home_team_id
        LEFT JOIN teams at ON at.team_id = mr.away_team_id
        LEFT JOIN sources s ON s.source_id = mr.source_id
        ORDER BY mr.match_date DESC, mr.updated_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )


def database_team_stats_table(repo, *, limit: int = 12) -> pd.DataFrame:
    return repo.query_dataframe(
        """
        SELECT
          t.name AS Equipe,
          s.name AS Fonte,
          c.name AS Competição,
          se.label AS Temporada,
          ts.stat_scope AS Escopo,
          ROUND(ts.matches_played, 1) AS Jogos,
          ROUND(ts.goals_for, 2) AS "Gols pró",
          ROUND(ts.goals_against, 2) AS "Gols contra",
          ROUND(ts.xg_for, 2) AS "xG pró",
          ROUND(ts.xg_against, 2) AS "xG contra",
          ROUND(ts.shots_for, 2) AS "Chutes pró"
        FROM team_stats ts
        JOIN teams t ON t.team_id = ts.team_id
        LEFT JOIN sources s ON s.source_id = ts.source_id
        LEFT JOIN competitions c ON c.competition_id = ts.competition_id
        LEFT JOIN seasons se ON se.season_id = ts.season_id
        ORDER BY ts.updated_at DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )


def database_clubelo_table(repo, *, limit: int = 12) -> pd.DataFrame:
    return repo.query_dataframe(
        """
        SELECT
          cr.rating_date AS Data,
          t.name AS Equipe,
          cr.country AS País,
          cr.rank AS Ranking,
          ROUND(cr.elo, 1) AS Elo
        FROM clubelo_ratings cr
        JOIN teams t ON t.team_id = cr.team_id
        ORDER BY cr.rating_date DESC, cr.elo DESC
        LIMIT :limit
        """,
        {"limit": limit},
    )
