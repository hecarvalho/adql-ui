from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


def _require_soccerdata():
    try:
        import soccerdata as sd
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "Instale as dependências com `pip install -r requirements.txt` para usar FBref via soccerdata."
        ) from exc
    return sd


@dataclass
class FBrefSource:
    leagues: str | Iterable[str]
    seasons: str | int | Iterable[str | int]
    no_cache: bool = False

    def _client(self):
        sd = _require_soccerdata()
        return sd.FBref(leagues=self.leagues, seasons=self.seasons, no_cache=self.no_cache)

    def team_season_stats(self, stat_type: str = "standard") -> pd.DataFrame:
        """Retorna estatísticas de equipes do FBref.

        Exemplos de `stat_type` usados pelo FBref/soccerdata podem incluir:
        `standard`, `shooting`, `passing`, `defense`, `possession`, `misc`.
        A disponibilidade depende da competição/temporada.
        """
        fbref = self._client()
        return fbref.read_team_season_stats(stat_type=stat_type)

    def player_season_stats(self, stat_type: str = "standard") -> pd.DataFrame:
        """Retorna estatísticas de jogadores do FBref."""
        fbref = self._client()
        return fbref.read_player_season_stats(stat_type=stat_type)


def normalize_player_table(df: pd.DataFrame) -> pd.DataFrame:
    """Achata índices/colunas comuns do FBref para facilitar exportação ao ADQL."""
    output = df.copy()

    if isinstance(output.index, pd.MultiIndex):
        output = output.reset_index()
    else:
        output = output.reset_index(drop=False)

    if isinstance(output.columns, pd.MultiIndex):
        output.columns = ["_".join(str(part) for part in col if str(part) != "") for col in output.columns]

    output.columns = [str(col).strip().replace(" ", "_").lower() for col in output.columns]
    return output
