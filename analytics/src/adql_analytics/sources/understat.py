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


def _flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()

    if isinstance(output.index, pd.MultiIndex):
        output = output.reset_index()
    else:
        output = output.reset_index(drop=False)

    if isinstance(output.columns, pd.MultiIndex):
        output.columns = [
            "_".join(str(part) for part in column if str(part) != "")
            for column in output.columns
        ]

    output.columns = [
        str(column)
        .strip()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("-", "_")
        .replace(".", "_")
        .lower()
        for column in output.columns
    ]
    return output


@dataclass(frozen=True)
class UnderstatRequest:
    """Configuração para consulta ao Understat via soccerdata."""

    leagues: str | Iterable[str] = "ENG-Premier League"
    seasons: str | int | Iterable[str | int] = "2025-2026"
    no_cache: bool = False


@dataclass
class UnderstatSource:
    leagues: str | Iterable[str]
    seasons: str | int | Iterable[str | int]
    no_cache: bool = False

    def _client(self):
        sd = _require_soccerdata()

        try:
            return sd.Understat(
                leagues=self.leagues,
                seasons=self.seasons,
                no_cache=self.no_cache,
            )
        except TypeError:
            # Algumas versões antigas do soccerdata não aceitam no_cache no Understat.
            return sd.Understat(leagues=self.leagues, seasons=self.seasons)

    def schedule(self) -> pd.DataFrame:
        understat = self._client()
        return _flatten_columns(understat.read_schedule())

    def team_match_stats(self) -> pd.DataFrame:
        understat = self._client()
        return _flatten_columns(understat.read_team_match_stats())

    def player_season_stats(self) -> pd.DataFrame:
        understat = self._client()
        return _flatten_columns(understat.read_player_season_stats())

    def player_match_stats(self) -> pd.DataFrame:
        understat = self._client()
        return _flatten_columns(understat.read_player_match_stats())

    def shots(self, match_id: int | str) -> pd.DataFrame:
        understat = self._client()
        return _flatten_columns(understat.read_shot_events(match_id=match_id))


def fetch_understat_player_season_stats(request: UnderstatRequest) -> pd.DataFrame:
    """Busca estatísticas agregadas de jogadores no Understat.

    O retorno é normalizado para colunas em minúsculas, sem MultiIndex e com
    separadores simplificados. A disponibilidade das colunas depende da liga,
    temporada e versão do soccerdata.
    """
    source = UnderstatSource(
        leagues=request.leagues,
        seasons=request.seasons,
        no_cache=request.no_cache,
    )
    return source.player_season_stats().drop_duplicates().reset_index(drop=True)


def fetch_understat_team_match_stats(request: UnderstatRequest) -> pd.DataFrame:
    """Busca estatísticas de xG por partida/equipe no Understat."""
    source = UnderstatSource(
        leagues=request.leagues,
        seasons=request.seasons,
        no_cache=request.no_cache,
    )
    return source.team_match_stats().drop_duplicates().reset_index(drop=True)


def sample_understat_player_season_stats() -> pd.DataFrame:
    """Base fictícia para validar o exportador sem internet.

    Os valores abaixo servem apenas para teste estrutural. Para análise real,
    use `fetch_understat_player_season_stats`.
    """
    return pd.DataFrame(
        [
            {
                "league": "ENG-Premier League",
                "season": "2025-2026",
                "team": "Manchester City",
                "player": "Erling Haaland",
                "position": "FW",
                "games": 25,
                "time": 2115,
                "goals": 24,
                "xg": 22.4,
                "npxg": 18.9,
                "assists": 3,
                "xa": 3.8,
                "shots": 96,
                "key_passes": 26,
                "xgchain": 26.5,
                "xgbuildup": 4.7,
            },
            {
                "league": "ENG-Premier League",
                "season": "2025-2026",
                "team": "Liverpool",
                "player": "Mohamed Salah",
                "position": "FW",
                "games": 27,
                "time": 2290,
                "goals": 20,
                "xg": 17.2,
                "npxg": 13.9,
                "assists": 10,
                "xa": 8.6,
                "shots": 88,
                "key_passes": 58,
                "xgchain": 29.1,
                "xgbuildup": 7.4,
            },
            {
                "league": "ENG-Premier League",
                "season": "2025-2026",
                "team": "Arsenal",
                "player": "Bukayo Saka",
                "position": "FW,MF",
                "games": 24,
                "time": 1975,
                "goals": 12,
                "xg": 11.8,
                "npxg": 9.3,
                "assists": 9,
                "xa": 9.7,
                "shots": 72,
                "key_passes": 63,
                "xgchain": 24.8,
                "xgbuildup": 8.9,
            },
            {
                "league": "ESP-La Liga",
                "season": "2025-2026",
                "team": "Barcelona",
                "player": "Lamine Yamal",
                "position": "FW,MF",
                "games": 26,
                "time": 2060,
                "goals": 9,
                "xg": 8.1,
                "npxg": 8.1,
                "assists": 11,
                "xa": 10.5,
                "shots": 69,
                "key_passes": 71,
                "xgchain": 27.3,
                "xgbuildup": 10.2,
            },
            {
                "league": "ESP-La Liga",
                "season": "2025-2026",
                "team": "Real Madrid",
                "player": "Kylian Mbappe",
                "position": "FW",
                "games": 28,
                "time": 2380,
                "goals": 23,
                "xg": 19.8,
                "npxg": 17.1,
                "assists": 6,
                "xa": 5.4,
                "shots": 104,
                "key_passes": 42,
                "xgchain": 28.7,
                "xgbuildup": 5.6,
            },
        ]
    )
