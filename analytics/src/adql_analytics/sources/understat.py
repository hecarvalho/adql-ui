from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


def _require_soccerdata():
    try:
        import soccerdata as sd
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "Instale as dependências com `pip install -r requirements.txt` para usar Understat via soccerdata."
        ) from exc
    return sd


@dataclass
class UnderstatSource:
    leagues: str | Iterable[str]
    seasons: str | int | Iterable[str | int]

    def _client(self):
        sd = _require_soccerdata()
        return sd.Understat(leagues=self.leagues, seasons=self.seasons)

    def team_match_stats(self) -> pd.DataFrame:
        understat = self._client()
        if hasattr(understat, "read_team_match_stats"):
            return understat.read_team_match_stats()
        raise AttributeError("Sua versão do soccerdata não expõe read_team_match_stats para Understat.")

    def schedule(self) -> pd.DataFrame:
        understat = self._client()
        if hasattr(understat, "read_schedule"):
            return understat.read_schedule()
        raise AttributeError("Sua versão do soccerdata não expõe read_schedule para Understat.")

    def shots(self, match_id: int | str) -> pd.DataFrame:
        understat = self._client()
        if hasattr(understat, "read_shot_events"):
            return understat.read_shot_events(match_id=match_id)
        raise AttributeError("Sua versão do soccerdata não expõe read_shot_events para Understat.")
