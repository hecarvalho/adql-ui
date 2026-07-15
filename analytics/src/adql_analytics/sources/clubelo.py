from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


def _require_soccerdata():
    try:
        import soccerdata as sd
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "Instale as dependências com `pip install -r requirements.txt` para usar ClubElo via soccerdata."
        ) from exc
    return sd


@dataclass
class ClubEloSource:
    def _client(self):
        sd = _require_soccerdata()
        return sd.ClubElo()

    def ratings_by_date(self, date: str | None = None) -> pd.DataFrame:
        """Retorna ratings Elo por data.

        `date` deve seguir formato ISO: YYYY-MM-DD. Quando omitido, depende do comportamento do soccerdata.
        """
        clubelo = self._client()
        if hasattr(clubelo, "read_by_date"):
            if date:
                return clubelo.read_by_date(date=date)
            return clubelo.read_by_date()
        raise AttributeError("Sua versão do soccerdata não expõe read_by_date para ClubElo.")

    def team_history(self, team: str) -> pd.DataFrame:
        clubelo = self._client()
        if hasattr(clubelo, "read_team_history"):
            return clubelo.read_team_history(team=team)
        raise AttributeError("Sua versão do soccerdata não expõe read_team_history para ClubElo.")
