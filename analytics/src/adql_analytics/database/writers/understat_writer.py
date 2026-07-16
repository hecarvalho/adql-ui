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
    row_raw,
)

UNDERSTAT_SOURCE_ID = "understat"


def _understat_source(repo: AnalyticsRepository) -> None:
    repo.upsert_source(
        source_id=UNDERSTAT_SOURCE_ID,
        name="Understat",
        source_type="scraper",
        url="https://understat.com/",
        notes="xG, xA, chutes, xGChain e xGBuildup via soccerdata.",
    )


def write_understat_player_stats_to_database(
    df: pd.DataFrame,
    *,
    db_path: str | None = None,
    repo: AnalyticsRepository | None = None,
    source_id: str = UNDERSTAT_SOURCE_ID,
) -> dict[str, Any]:
    """Grava estatísticas Understat de jogadores no SQLite ADQL Analytics."""
    owns_repo = repo is None
    repo = repo or AnalyticsRepository(db_path)
    summary = WriterSummary(source_id=source_id, rows_seen=count_dataframe_rows(df))

    try:
        _understat_source(repo)

        for _, row in df.iterrows():
            player_name = clean_text(first_existing(row, ["player", "player_name", "name"]))
            team_name = clean_text(first_existing(row, ["team", "team_title", "squad"]))

            if not player_name:
                summary.skipped_rows += 1
                continue

            competition_name = clean_text(first_existing(row, ["league", "competition", "comp"]))
            season_label = clean_text(first_existing(row, ["season", "year"]))
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

            position = clean_text(first_existing(row, ["position", "pos"]), default="") or None
            player_id = repo.upsert_player(
                name=player_name,
                team_id=team_id,
                source_id=source_id,
                source_player_id=f"{player_name}|{team_name}|{season_label}|{competition_name}",
                position=position,
            )
            summary.players_written.add(player_id)

            repo.upsert_player_stat(
                source_id=source_id,
                player_id=player_id,
                team_id=team_id,
                competition_id=competition_id,
                season_id=season_id,
                stat_scope="season",
                minutes=numeric_first(row, ["time", "minutes", "mins"]),
                appearances=numeric_first(row, ["games", "appearances", "apps"]),
                starts=numeric_first(row, ["starts"]),
                goals=numeric_first(row, ["goals", "g"]),
                assists=numeric_first(row, ["assists", "a"]),
                xg=numeric_first(row, ["xg", "x_g"]),
                xa=numeric_first(row, ["xa", "x_a"]),
                npxg=numeric_first(row, ["npxg", "npx_g"]),
                shots=numeric_first(row, ["shots", "sh"]),
                key_passes=numeric_first(row, ["key_passes", "keypasses", "kp"]),
                progressive_actions=numeric_first(row, ["xgchain", "xg_chain"]),
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
