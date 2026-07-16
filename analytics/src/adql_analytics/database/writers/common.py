from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any, Iterable, Sequence

import pandas as pd

from adql_analytics.database.repository import AnalyticsRepository, as_json, normalize_name


@dataclass
class WriterSummary:
    """Resumo padronizado das gravações no SQLite."""

    source_id: str
    rows_seen: int = 0
    rows_written: int = 0
    competitions_written: set[str] = field(default_factory=set)
    seasons_written: set[str] = field(default_factory=set)
    teams_written: set[str] = field(default_factory=set)
    players_written: set[str] = field(default_factory=set)
    stats_written: int = 0
    matches_written: int = 0
    ratings_written: int = 0
    skipped_rows: int = 0

    def as_dict(self) -> dict[str, Any]:
        return {
            "source_id": self.source_id,
            "rows_seen": self.rows_seen,
            "rows_written": self.rows_written,
            "competitions": len(self.competitions_written),
            "seasons": len(self.seasons_written),
            "teams": len(self.teams_written),
            "players": len(self.players_written),
            "stats_written": self.stats_written,
            "matches_written": self.matches_written,
            "ratings_written": self.ratings_written,
            "skipped_rows": self.skipped_rows,
        }


def print_summary(title: str, summary: dict[str, Any]) -> None:
    print(title)
    for key, value in summary.items():
        print(f"- {key}: {value}")


def coerce_float(value: Any, default: float | None = None) -> float | None:
    if value is None:
        return default
    if pd.isna(value):
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def coerce_int(value: Any, default: int | None = None) -> int | None:
    number = coerce_float(value, None)
    if number is None:
        return default
    return int(number)


def clean_text(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if pd.isna(value):
        return default
    return str(value).strip() or default


def first_existing(row: pd.Series, candidates: Sequence[str]) -> Any:
    """Busca uma coluna tolerando variações de caixa, barras e underscores."""
    if not candidates:
        return None

    raw_columns = {str(column): column for column in row.index}
    normalized_columns = {_normalize_column_name(column): column for column in row.index}

    for candidate in candidates:
        if candidate in raw_columns:
            value = row[raw_columns[candidate]]
            if not _is_empty(value):
                return value

        normalized = _normalize_column_name(candidate)
        if normalized in normalized_columns:
            value = row[normalized_columns[normalized]]
            if not _is_empty(value):
                return value

    return None


def _normalize_column_name(value: Any) -> str:
    return (
        str(value)
        .strip()
        .lower()
        .replace("/", "_")
        .replace("-", "_")
        .replace(" ", "_")
        .replace(".", "_")
    )


def _is_empty(value: Any) -> bool:
    if value is None:
        return True
    try:
        return bool(pd.isna(value))
    except TypeError:
        return False


def numeric_first(row: pd.Series, candidates: Sequence[str], default: float | None = None) -> float | None:
    return coerce_float(first_existing(row, candidates), default)


def per90_to_total(per90: float | None, ninety_units: float | None) -> float | None:
    if per90 is None or ninety_units is None:
        return None
    return per90 * ninety_units


def row_raw(row: pd.Series) -> dict[str, Any]:
    raw: dict[str, Any] = {}
    for key, value in row.to_dict().items():
        if isinstance(value, pd.Timestamp):
            raw[str(key)] = value.isoformat()
        elif pd.isna(value):
            raw[str(key)] = None
        else:
            raw[str(key)] = value
    return raw


def ensure_competition_and_season(
    repo: AnalyticsRepository,
    *,
    source_id: str,
    competition_name: str | None,
    season_label: str | None,
) -> tuple[str | None, str | None]:
    competition_id: str | None = None
    season_id: str | None = None

    competition_name = clean_text(competition_name)
    if competition_name:
        competition_id = repo.upsert_competition(
            name=competition_name,
            source_id=source_id,
            source_competition_id=normalize_name(competition_name),
        )

    season_label = clean_text(season_label)
    if season_label:
        start_year, end_year = parse_season_years(season_label)
        season_id = repo.upsert_season(
            label=season_label,
            source_id=source_id,
            source_season_id=season_label,
            start_year=start_year,
            end_year=end_year,
        )

    return competition_id, season_id


def parse_season_years(label: str | None) -> tuple[int | None, int | None]:
    text = clean_text(label)
    if not text:
        return None, None

    parts = [part for part in text.replace("/", "-").split("-") if part]
    if not parts:
        return None, None

    try:
        start = int(parts[0])
    except ValueError:
        return None, None

    end: int | None = None
    if len(parts) > 1:
        try:
            raw_end = int(parts[1])
            end = raw_end if raw_end > 99 else int(str(start)[:2] + f"{raw_end:02d}")
        except ValueError:
            end = None

    return start, end


def iso_date(value: Any, fallback: str | None = None) -> str | None:
    if value is None or pd.isna(value):
        return fallback
    parsed = pd.to_datetime(value, dayfirst=True, errors="coerce")
    if pd.isna(parsed):
        return fallback
    return parsed.date().isoformat()


def today_iso() -> str:
    return date.today().isoformat()


def count_dataframe_rows(df: pd.DataFrame) -> int:
    return int(len(df.index))
