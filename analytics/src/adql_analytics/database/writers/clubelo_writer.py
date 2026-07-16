from __future__ import annotations

from typing import Any

import pandas as pd

from adql_analytics.database.repository import AnalyticsRepository
from adql_analytics.sources.clubelo import normalize_clubelo_dataframe

from .common import WriterSummary, clean_text, coerce_int, count_dataframe_rows, iso_date, numeric_first, row_raw, today_iso

CLUBELO_SOURCE_ID = "clubelo"


def _clubelo_source(repo: AnalyticsRepository) -> None:
    repo.upsert_source(
        source_id=CLUBELO_SOURCE_ID,
        name="ClubElo",
        source_type="scraper",
        url="https://clubelo.com/",
        notes="Ratings Elo para contexto de força relativa de clubes.",
    )


def write_clubelo_ratings_to_database(
    df: pd.DataFrame,
    *,
    db_path: str | None = None,
    repo: AnalyticsRepository | None = None,
    rating_date: str | None = None,
    source_id: str = CLUBELO_SOURCE_ID,
) -> dict[str, Any]:
    """Grava ratings ClubElo no SQLite ADQL Analytics."""
    owns_repo = repo is None
    repo = repo or AnalyticsRepository(db_path)
    normalized = normalize_clubelo_dataframe(df)
    summary = WriterSummary(source_id=source_id, rows_seen=count_dataframe_rows(normalized))

    try:
        _clubelo_source(repo)

        for _, row in normalized.iterrows():
            team_name = clean_text(row.get("ADQL_Team"))
            if not team_name:
                summary.skipped_rows += 1
                continue

            date_value = rating_date or iso_date(row.get("ADQL_Date"), fallback=today_iso())
            team_id = repo.upsert_team(
                name=team_name,
                source_id=source_id,
                source_team_id=team_name,
                country=clean_text(row.get("ADQL_Country"), default="") or None,
            )
            summary.teams_written.add(team_id)

            repo.upsert_clubelo_rating(
                source_id=source_id,
                team_id=team_id,
                rating_date=date_value,
                elo=numeric_first(row, ["ADQL_Elo"]),
                rank=coerce_int(row.get("ADQL_Rank")),
                country=clean_text(row.get("ADQL_Country"), default="") or None,
                level=coerce_int(row.get("ADQL_Level")),
                raw=row_raw(row),
            )
            summary.ratings_written += 1
            summary.rows_written += 1

        if owns_repo:
            repo.commit()
        return summary.as_dict()
    finally:
        if owns_repo:
            repo.close()
