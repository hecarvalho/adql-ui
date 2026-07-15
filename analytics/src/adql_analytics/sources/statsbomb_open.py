from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


def _require_statsbombpy():
    try:
        from statsbombpy import sb
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "Instale as dependências com `pip install -r requirements.txt` para usar StatsBomb Open Data."
        ) from exc
    return sb


@dataclass
class StatsBombOpenSource:
    """Acesso aos dados abertos da StatsBomb via statsbombpy."""

    def competitions(self) -> pd.DataFrame:
        sb = _require_statsbombpy()
        return sb.competitions()

    def matches(self, competition_id: int, season_id: int) -> pd.DataFrame:
        sb = _require_statsbombpy()
        return sb.matches(competition_id=competition_id, season_id=season_id)

    def events(self, match_id: int) -> pd.DataFrame:
        sb = _require_statsbombpy()
        return sb.events(match_id=match_id)

    def lineups(self, match_id: int) -> dict:
        sb = _require_statsbombpy()
        return sb.lineups(match_id=match_id)


EXPECTED_EVENT_COLUMNS = [
    "id",
    "index",
    "period",
    "timestamp",
    "minute",
    "second",
    "type",
    "team",
    "player",
    "location",
    "pass_end_location",
    "shot_statsbomb_xg",
]


def select_common_event_columns(events: pd.DataFrame) -> pd.DataFrame:
    existing = [column for column in EXPECTED_EVENT_COLUMNS if column in events.columns]
    return events[existing].copy()
