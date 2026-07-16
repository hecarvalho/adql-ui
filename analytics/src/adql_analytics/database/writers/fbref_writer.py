from __future__ import annotations

from typing import Any

import pandas as pd

from adql_analytics.database.repository import AnalyticsRepository

from .common import (
    WriterSummary,
    clean_text,
    count_dataframe_rows,
    ensure_competition_and_season,
    first_existing,
    numeric_first,
    per90_to_total,
    row_raw,
)

FBREF_SOURCE_ID = "fbref"


def _fbref_source(repo: AnalyticsRepository) -> None:
    repo.upsert_source(
        source_id=FBREF_SOURCE_ID,
        name="FBref",
        source_type="scraper",
        url="https://fbref.com/",
        notes="Estatísticas públicas de jogadores, equipes e competições via soccerdata.",
    )


def write_fbref_player_stats_to_database(
    df: pd.DataFrame,
    *,
    db_path: str | None = None,
    repo: AnalyticsRepository | None = None,
    source_id: str = FBREF_SOURCE_ID,
) -> dict[str, Any]:
    """Grava estatísticas FBref de jogadores no SQLite ADQL Analytics.

    Espera DataFrame no formato produzido por `fetch_fbref_player_stats()` ou
    `sample_fbref_player_stats()`. A função é tolerante a variações de nomes de
    colunas do soccerdata/FBref e preserva a linha completa em `raw_json`.
    """
    owns_repo = repo is None
    repo = repo or AnalyticsRepository(db_path)
    summary = WriterSummary(source_id=source_id, rows_seen=count_dataframe_rows(df))

    try:
        _fbref_source(repo)

        for _, row in df.iterrows():
            player_name = clean_text(first_existing(row, ["player", "Player"]))
            team_name = clean_text(first_existing(row, ["team", "squad", "Squad"]))

            if not player_name:
                summary.skipped_rows += 1
                continue

            competition_name = clean_text(first_existing(row, ["league", "competition", "comp", "Comp"]))
            season_label = clean_text(first_existing(row, ["season", "Season"]))
            competition_id, season_id = ensure_competition_and_season(
                repo,
                source_id=source_id,
                competition_name=competition_name,
                season_label=season_label,
            )

            if competition_id:
                summary.competitions_written.add(competition_id)
            if season_id:
                summary.seasons_written.add(season_id)

            team_id = None
            if team_name:
                team_id = repo.upsert_team(
                    name=team_name,
                    source_id=source_id,
                    source_team_id=team_name,
                )
                summary.teams_written.add(team_id)

            position = clean_text(first_existing(row, ["position", "pos", "standard_pos"]), default="") or None
            player_id = repo.upsert_player(
                name=player_name,
                team_id=team_id,
                source_id=source_id,
                source_player_id=f"{player_name}|{team_name}|{season_label}|{competition_name}",
                position=position,
            )
            summary.players_written.add(player_id)

            ninety_units = numeric_first(row, [
                "standard_playing_time_90s",
                "playing_time_90s",
                "90s",
                "standard_90s",
            ])
            minutes = numeric_first(row, [
                "standard_playing_time_min",
                "playing_time_min",
                "min",
                "minutes",
            ])
            if minutes is None and ninety_units is not None:
                minutes = ninety_units * 90

            goals = _total_from_total_or_per90(
                row,
                total_cols=["standard_standard_gls", "standard_gls", "gls", "goals"],
                per90_cols=["standard_per_90_minutes_gls", "gls_90", "goals_90"],
                ninety_units=ninety_units,
            )
            assists = _total_from_total_or_per90(
                row,
                total_cols=["standard_standard_ast", "standard_ast", "ast", "assists"],
                per90_cols=["standard_per_90_minutes_ast", "ast_90", "assists_90"],
                ninety_units=ninety_units,
            )
            xg = _total_from_total_or_per90(
                row,
                total_cols=["standard_expected_xg", "expected_xg", "xg"],
                per90_cols=["standard_per_90_minutes_xg", "xg_90"],
                ninety_units=ninety_units,
            )
            xag = _total_from_total_or_per90(
                row,
                total_cols=["standard_expected_xag", "expected_xag", "xag", "xa"],
                per90_cols=["standard_per_90_minutes_xag", "xag_90", "xa_90"],
                ninety_units=ninety_units,
            )
            shots = _total_from_total_or_per90(
                row,
                total_cols=["shooting_standard_sh", "shooting_sh", "sh", "shots"],
                per90_cols=["shooting_standard_sh/90", "shooting_standard_sh_90", "sh_90", "shots_90"],
                ninety_units=ninety_units,
            )

            progressive_actions = _sum_existing(
                row,
                ["standard_progression_prgc", "progression_prgc", "prgc"],
                ["standard_progression_prgp", "progression_prgp", "prgp"],
            )
            defensive_actions = _sum_existing(
                row,
                ["misc_performance_tklw", "performance_tklw", "tklw"],
                ["standard_performance_int", "performance_int", "int"],
            )

            repo.upsert_player_stat(
                source_id=source_id,
                player_id=player_id,
                team_id=team_id,
                competition_id=competition_id,
                season_id=season_id,
                stat_scope="season",
                minutes=minutes,
                appearances=numeric_first(row, ["standard_playing_time_mp", "playing_time_mp", "mp", "matches"]),
                starts=numeric_first(row, ["standard_playing_time_starts", "playing_time_starts", "starts"]),
                goals=goals,
                assists=assists,
                xg=xg,
                xa=xag,
                xag=xag,
                shots=shots,
                progressive_actions=progressive_actions,
                defensive_actions=defensive_actions,
                raw=row_raw(row),
            )
            summary.stats_written += 1
            summary.rows_written += 1

        if owns_repo:
            repo.commit()
        return summary.as_dict()
    finally:
        if owns_repo:
            repo.close()


def _total_from_total_or_per90(
    row: pd.Series,
    *,
    total_cols: list[str],
    per90_cols: list[str],
    ninety_units: float | None,
) -> float | None:
    total = numeric_first(row, total_cols)
    if total is not None:
        return total
    per90 = numeric_first(row, per90_cols)
    return per90_to_total(per90, ninety_units)


def _sum_existing(row: pd.Series, *candidate_groups: list[str]) -> float | None:
    values: list[float] = []
    for candidates in candidate_groups:
        value = numeric_first(row, candidates)
        if value is not None:
            values.append(value)
    if not values:
        return None
    return float(sum(values))
