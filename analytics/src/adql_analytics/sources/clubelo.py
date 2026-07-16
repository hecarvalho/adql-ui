from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Iterable

import pandas as pd


def _require_soccerdata():
    try:
        import soccerdata as sd
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "Instale as dependências com `pip install -r requirements.txt` para usar ClubElo via soccerdata."
        ) from exc
    return sd


@dataclass(frozen=True)
class ClubEloRequest:
    """Configuração para consulta de ratings ClubElo.

    `date` aceita string ISO `YYYY-MM-DD`, objeto date/datetime ou None.
    Quando omitido, o soccerdata consulta a data corrente disponível pela fonte.
    """

    date: str | date | datetime | None = None


class ClubEloSource:
    """Leitor ClubElo via soccerdata.

    ClubElo é usado no ADQL Analytics como fonte de força relativa de equipes.
    Ele não substitui métricas de desempenho em campo; serve como contexto de
    nível competitivo, força do adversário e pré-jogo.
    """

    def __init__(self, data_dir: str | None = None) -> None:
        self.data_dir = data_dir

    def _client(self):
        sd = _require_soccerdata()
        if self.data_dir:
            return sd.ClubElo(data_dir=self.data_dir)
        return sd.ClubElo()

    def ratings_by_date(self, date_value: str | date | datetime | None = None) -> pd.DataFrame:
        """Retorna ratings Elo por data.

        O soccerdata expõe `ClubElo.read_by_date(date=None)`. Mantemos chamadas
        tolerantes a versões diferentes, primeiro usando argumento nomeado e depois
        argumento posicional.
        """
        clubelo = self._client()

        if not hasattr(clubelo, "read_by_date"):
            raise AttributeError("Sua versão do soccerdata não expõe ClubElo.read_by_date().")

        if date_value is None:
            df = clubelo.read_by_date()
        else:
            try:
                df = clubelo.read_by_date(date=date_value)
            except TypeError:
                df = clubelo.read_by_date(date_value)

        return _ensure_dataframe(df)

    def read_request(self, request: ClubEloRequest) -> pd.DataFrame:
        return self.ratings_by_date(request.date)

    def team_history(self, team: str, max_age: int = 1) -> pd.DataFrame:
        """Retorna histórico Elo de uma equipe.

        Para grafias exatas, consulte `ratings_by_date()` ou use nomes alternativos
        aceitos pelo soccerdata.
        """
        clubelo = self._client()

        if not hasattr(clubelo, "read_team_history"):
            raise AttributeError("Sua versão do soccerdata não expõe ClubElo.read_team_history().")

        try:
            df = clubelo.read_team_history(team=team, max_age=max_age)
        except TypeError:
            try:
                df = clubelo.read_team_history(team=team)
            except TypeError:
                df = clubelo.read_team_history(team)

        return _ensure_dataframe(df)


def _ensure_dataframe(value: object) -> pd.DataFrame:
    if isinstance(value, pd.DataFrame):
        return value.copy()
    raise TypeError(f"ClubElo retornou um objeto inesperado: {type(value)!r}")


def sample_clubelo_ratings() -> pd.DataFrame:
    """Base local simples para validar o pipeline sem internet."""
    rows = [
        ["2026-07-16", 1, "Man City", "ENG", 1, 2054.2],
        ["2026-07-16", 2, "Real Madrid", "ESP", 1, 2041.8],
        ["2026-07-16", 3, "Arsenal", "ENG", 1, 1978.4],
        ["2026-07-16", 4, "Bayern", "GER", 1, 1966.9],
        ["2026-07-16", 5, "Liverpool", "ENG", 1, 1958.6],
        ["2026-07-16", 6, "Barcelona", "ESP", 1, 1947.1],
        ["2026-07-16", 7, "Inter", "ITA", 1, 1928.5],
        ["2026-07-16", 8, "PSG", "FRA", 1, 1915.7],
        ["2026-07-16", 9, "Atletico", "ESP", 1, 1872.3],
        ["2026-07-16", 10, "Dortmund", "GER", 1, 1859.6],
    ]

    return pd.DataFrame(
        rows,
        columns=["date", "rank", "team", "country", "level", "elo"],
    )


def sample_clubelo_history() -> pd.DataFrame:
    """Histórico fictício para validar a visualização de tendência sem internet."""
    rows = [
        ["2026-06-01", "Arsenal", "ENG", 1971.4],
        ["2026-06-08", "Arsenal", "ENG", 1974.9],
        ["2026-06-15", "Arsenal", "ENG", 1973.2],
        ["2026-06-22", "Arsenal", "ENG", 1976.8],
        ["2026-06-29", "Arsenal", "ENG", 1978.4],
        ["2026-06-01", "Liverpool", "ENG", 1948.6],
        ["2026-06-08", "Liverpool", "ENG", 1951.1],
        ["2026-06-15", "Liverpool", "ENG", 1953.7],
        ["2026-06-22", "Liverpool", "ENG", 1956.2],
        ["2026-06-29", "Liverpool", "ENG", 1958.6],
    ]

    return pd.DataFrame(rows, columns=["date", "team", "country", "elo"])


def normalize_clubelo_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Padroniza saídas ClubElo para colunas internas ADQL.

    Aceita tanto DataFrames com colunas explícitas (`team`, `elo`, etc.) quanto
    DataFrames nos quais o time ou a data aparecem no índice.
    """
    output = df.copy()

    if not isinstance(output.index, pd.RangeIndex):
        index_names = [name for name in output.index.names if name]
        output = output.reset_index()
        if index_names and "team" not in output.columns:
            for name in index_names:
                if str(name).lower() in {"team", "club", "squad"}:
                    output = output.rename(columns={name: "team"})

    normalized_columns = {str(column).strip().lower(): column for column in output.columns}

    def pick_column(candidates: Iterable[str]) -> str | None:
        for candidate in candidates:
            column = normalized_columns.get(candidate.lower())
            if column is not None:
                return str(column)
        return None

    date_col = pick_column(["date", "from"])
    rank_col = pick_column(["rank", "ranking"])
    team_col = pick_column(["team", "club", "squad", "name"])
    country_col = pick_column(["country", "nation"])
    level_col = pick_column(["level", "tier"])
    elo_col = pick_column(["elo", "rating", "score"])

    if team_col is None:
        # Caso incomum: o time ficou em uma coluna sem nome após reset_index().
        unnamed = [column for column in output.columns if str(column).lower().startswith("level_")]
        if unnamed:
            team_col = str(unnamed[-1])

    if team_col is None or elo_col is None:
        raise ValueError(
            "Não foi possível identificar colunas de time e Elo no DataFrame ClubElo. "
            f"Colunas recebidas: {list(output.columns)}"
        )

    result = pd.DataFrame()

    if date_col is not None:
        result["ADQL_Date"] = pd.to_datetime(output[date_col], errors="coerce")
    else:
        result["ADQL_Date"] = pd.NaT

    if rank_col is not None:
        result["ADQL_Rank"] = pd.to_numeric(output[rank_col], errors="coerce")
    else:
        result["ADQL_Rank"] = pd.NA

    result["ADQL_Team"] = output[team_col].astype(str)

    if country_col is not None:
        result["ADQL_Country"] = output[country_col].astype(str)
    else:
        result["ADQL_Country"] = "—"

    if level_col is not None:
        result["ADQL_Level"] = pd.to_numeric(output[level_col], errors="coerce")
    else:
        result["ADQL_Level"] = pd.NA

    result["ADQL_Elo"] = pd.to_numeric(output[elo_col], errors="coerce")
    result = result.dropna(subset=["ADQL_Team", "ADQL_Elo"])

    if result["ADQL_Rank"].isna().all():
        result = result.sort_values("ADQL_Elo", ascending=False).reset_index(drop=True)
        result["ADQL_Rank"] = result.index + 1
    else:
        result = result.sort_values(["ADQL_Rank", "ADQL_Elo"], ascending=[True, False]).reset_index(drop=True)

    return result


def resolve_club_names(df: pd.DataFrame, teams: Iterable[str]) -> list[str]:
    normalized = normalize_clubelo_dataframe(df)
    available = normalized["ADQL_Team"].dropna().astype(str).unique().tolist()
    resolved: list[str] = []

    for team in teams:
        requested = str(team).strip()
        if not requested:
            continue

        exact = [candidate for candidate in available if candidate.lower() == requested.lower()]
        if exact:
            resolved.append(exact[0])
            continue

        partial = [candidate for candidate in available if requested.lower() in candidate.lower()]
        if len(partial) == 1:
            resolved.append(partial[0])
            continue

        if partial:
            options = ", ".join(partial[:8])
            raise ValueError(f"Nome ambíguo para '{requested}'. Opções encontradas: {options}")

        raise ValueError(f"Time não encontrado no ClubElo: {requested}")

    return resolved
