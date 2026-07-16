from __future__ import annotations

from typing import Any

import pandas as pd

from adql_analytics.database.repository import AnalyticsRepository
from adql_analytics.sources.football_data_co_uk import normalize_results_dataframe

from .common import (
    WriterSummary,
    clean_text,
    coerce_int,
    count_dataframe_rows,
    ensure_competition_and_season,
    iso_date,
    numeric_first,
    row_raw,
)

FOOTBALL_DATA_SOURCE_ID = "football_data_co_uk"


def _football_data_source(repo: AnalyticsRepository) -> None:
    repo.upsert_source(
        source_id=FOOTBALL_DATA_SOURCE_ID,
        name="Football-Data.co.uk",
        source_type="csv",
        url="https://www.football-data.co.uk/",
        notes="Resultados, forma recente, casa/fora, odds e estatísticas básicas de partida.",
    )


def write_football_data_matches_to_database(
    df: pd.DataFrame,
    *,
    db_path: str | None = None,
    repo: AnalyticsRepository | None = None,
    season: str | None = None,
    competition: str | None = None,
    source_id: str = FOOTBALL_DATA_SOURCE_ID,
) -> dict[str, Any]:
    """Grava resultados Football-Data.co.uk no SQLite ADQL Analytics.

    Aceita o CSV bruto da fonte ou o DataFrame de amostra. Os dados são
    normalizados com `normalize_results_dataframe` antes da gravação.
    """
    owns_repo = repo is None
    repo = repo or AnalyticsRepository(db_path)
    normalized = normalize_results_dataframe(df)
    summary = WriterSummary(source_id=source_id, rows_seen=count_dataframe_rows(normalized))

    try:
        _football_data_source(repo)
        competition_name = competition or clean_text(normalized.attrs.get("competition_code"), default="Football-Data.co.uk")
        season_label = season or clean_text(normalized.attrs.get("season_code"), default="")
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

        for _, row in normalized.iterrows():
            home_team = clean_text(row.get("HomeTeam"))
            away_team = clean_text(row.get("AwayTeam"))

            if not home_team or not away_team:
                summary.skipped_rows += 1
                continue

            home_team_id = repo.upsert_team(
                name=home_team,
                source_id=source_id,
                source_team_id=home_team,
            )
            away_team_id = repo.upsert_team(
                name=away_team,
                source_id=source_id,
                source_team_id=away_team,
            )
            summary.teams_written.update({home_team_id, away_team_id})

            repo.insert_match_result(
                source_id=source_id,
                match_date=iso_date(row.get("Date")),
                competition_id=competition_id,
                season_id=season_id,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                home_goals=coerce_int(row.get("FTHG")),
                away_goals=coerce_int(row.get("FTAG")),
                home_shots=numeric_first(row, ["HS"]),
                away_shots=numeric_first(row, ["AS"]),
                home_shots_on_target=numeric_first(row, ["HST"]),
                away_shots_on_target=numeric_first(row, ["AST"]),
                home_odds=numeric_first(row, ["B365H"]),
                draw_odds=numeric_first(row, ["B365D"]),
                away_odds=numeric_first(row, ["B365A"]),
                raw=row_raw(row),
            )
            summary.matches_written += 1
            summary.rows_written += 1

        if owns_repo:
            repo.commit()
        return summary.as_dict()
    finally:
        if owns_repo:
            repo.close()
