from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import pandas as pd


COMPETITION_ALIASES: dict[str, str] = {
    "e0": "E0",
    "premier league": "E0",
    "eng-premier league": "E0",
    "england premier league": "E0",
    "epl": "E0",
    "pl": "E0",
    "e1": "E1",
    "championship": "E1",
    "eng-championship": "E1",
    "e2": "E2",
    "league one": "E2",
    "e3": "E3",
    "league two": "E3",
    "sp1": "SP1",
    "la liga": "SP1",
    "laliga": "SP1",
    "spain la liga": "SP1",
    "sp2": "SP2",
    "segunda": "SP2",
    "d1": "D1",
    "bundesliga": "D1",
    "germany bundesliga": "D1",
    "d2": "D2",
    "bundesliga 2": "D2",
    "i1": "I1",
    "serie a": "I1",
    "italy serie a": "I1",
    "i2": "I2",
    "serie b": "I2",
    "f1": "F1",
    "ligue 1": "F1",
    "france ligue 1": "F1",
    "f2": "F2",
    "ligue 2": "F2",
    "n1": "N1",
    "eredivisie": "N1",
    "p1": "P1",
    "portugal": "P1",
}

RESULT_POINTS = {"W": 3, "D": 1, "L": 0}


@dataclass(frozen=True)
class FootballDataCoUkRequest:
    """Configuração para baixar um CSV do Football-Data.co.uk.

    `season_code` aceita formatos como `2526`, `2025-2026`, `2025-26` ou `2025`.
    `competition_code` aceita códigos oficiais, como `E0`, ou aliases comuns, como
    `Premier League`, `La Liga`, `Serie A`, `Bundesliga` e `Ligue 1`.
    """

    season_code: str = "2526"
    competition_code: str = "E0"
    base_url: str = "https://www.football-data.co.uk/mmz4281"


def normalize_season_code(value: str | int) -> str:
    text = str(value).strip()

    if text.isdigit() and len(text) == 4:
        return text

    if text.isdigit() and len(text) == 2:
        season_start = int(text)
        return f"{season_start:02d}{(season_start + 1) % 100:02d}"

    normalized = text.replace("/", "-").replace("_", "-")
    parts = [part for part in normalized.split("-") if part]

    if len(parts) == 2:
        start = int(parts[0])
        end = int(parts[1])

        if start >= 100:
            start_two = start % 100
        else:
            start_two = start

        if end >= 100:
            end_two = end % 100
        else:
            end_two = end

        return f"{start_two:02d}{end_two:02d}"

    if text.isdigit() and len(text) == 4:
        return text

    if text.isdigit():
        start = int(text)
        if start > 1900:
            return f"{start % 100:02d}{(start + 1) % 100:02d}"

    raise ValueError(
        "Temporada inválida. Use, por exemplo: 2526, 2025-2026, 2025-26 ou 2025."
    )


def normalize_competition_code(value: str) -> str:
    text = str(value).strip()

    if not text:
        raise ValueError("Informe a competição. Ex.: E0 ou Premier League.")

    upper = text.upper()
    if upper in {"E0", "E1", "E2", "E3", "EC", "SP1", "SP2", "D1", "D2", "I1", "I2", "F1", "F2", "N1", "P1"}:
        return upper

    key = text.lower().replace("_", "-").replace("/", " ").strip()
    key = " ".join(key.split())

    if key in COMPETITION_ALIASES:
        return COMPETITION_ALIASES[key]

    available = ", ".join(sorted({*COMPETITION_ALIASES.values()}))
    raise ValueError(f"Competição não reconhecida: {value}. Códigos comuns: {available}")


class FootballDataCoUkSource:
    """Leitor de CSVs públicos do Football-Data.co.uk.

    Exemplo de URL resultante:
    https://www.football-data.co.uk/mmz4281/2526/E0.csv
    """

    def __init__(self, base_url: str = "https://www.football-data.co.uk/mmz4281") -> None:
        self.base_url = base_url.rstrip("/")

    def build_csv_url(self, season_code: str | int, competition_code: str) -> str:
        season = normalize_season_code(season_code)
        competition = normalize_competition_code(competition_code)
        return f"{self.base_url}/{season}/{competition}.csv"

    def read_competition_csv(self, season_code: str | int, competition_code: str) -> pd.DataFrame:
        url = self.build_csv_url(season_code, competition_code)
        df = pd.read_csv(url)
        df.attrs["source_url"] = url
        df.attrs["season_code"] = normalize_season_code(season_code)
        df.attrs["competition_code"] = normalize_competition_code(competition_code)
        return df

    def read_request(self, request: FootballDataCoUkRequest) -> pd.DataFrame:
        return self.read_competition_csv(request.season_code, request.competition_code)

    @staticmethod
    def recent_form(df: pd.DataFrame, team: str, last_n: int = 5) -> pd.DataFrame:
        normalized = normalize_results_dataframe(df)
        return get_team_matches(normalized, team=team, last_n=last_n)


def sample_football_data_matches() -> pd.DataFrame:
    """Base local simples para validar o pipeline sem internet.

    As colunas seguem o padrão principal do Football-Data.co.uk.
    """
    rows = [
        ["16/08/2025", "Liverpool", "Arsenal", 2, 2, 1, 1, "D", 15, 12, 6, 4, 1.95, 3.80, 3.60],
        ["17/08/2025", "Chelsea", "Man City", 1, 3, 1, 2, "A", 9, 17, 3, 8, 3.40, 3.70, 2.05],
        ["23/08/2025", "Arsenal", "Tottenham", 2, 0, 0, 0, "H", 18, 7, 7, 2, 1.70, 4.10, 4.60],
        ["24/08/2025", "Man City", "Liverpool", 2, 1, 1, 1, "H", 14, 10, 5, 3, 1.85, 3.90, 3.90],
        ["30/08/2025", "Newcastle", "Arsenal", 1, 1, 0, 1, "D", 11, 13, 4, 5, 2.90, 3.45, 2.40],
        ["31/08/2025", "Liverpool", "Chelsea", 3, 1, 2, 0, "H", 16, 9, 7, 3, 1.78, 3.95, 4.20],
        ["13/09/2025", "Arsenal", "Man United", 1, 0, 0, 0, "H", 12, 8, 4, 2, 1.88, 3.70, 4.00],
        ["14/09/2025", "Man City", "Tottenham", 4, 2, 2, 1, "H", 20, 10, 9, 4, 1.55, 4.50, 5.50],
        ["20/09/2025", "Aston Villa", "Arsenal", 2, 3, 1, 1, "A", 13, 16, 5, 7, 2.95, 3.60, 2.28],
        ["21/09/2025", "Liverpool", "Brighton", 2, 0, 1, 0, "H", 17, 6, 6, 1, 1.42, 4.90, 7.00],
        ["27/09/2025", "Arsenal", "Chelsea", 2, 1, 1, 0, "H", 14, 11, 5, 4, 1.92, 3.65, 3.85],
        ["28/09/2025", "Everton", "Liverpool", 1, 2, 0, 1, "A", 8, 15, 2, 6, 5.50, 4.25, 1.58],
    ]

    return pd.DataFrame(
        rows,
        columns=[
            "Date",
            "HomeTeam",
            "AwayTeam",
            "FTHG",
            "FTAG",
            "HTHG",
            "HTAG",
            "FTR",
            "HS",
            "AS",
            "HST",
            "AST",
            "B365H",
            "B365D",
            "B365A",
        ],
    )


def normalize_results_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    required = {"Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"}
    missing = required.difference(df.columns)

    if missing:
        raise ValueError(f"CSV não contém colunas obrigatórias: {', '.join(sorted(missing))}")

    output = df.copy()
    output["Date"] = pd.to_datetime(output["Date"], dayfirst=True, errors="coerce")
    output["FTHG"] = pd.to_numeric(output["FTHG"], errors="coerce")
    output["FTAG"] = pd.to_numeric(output["FTAG"], errors="coerce")

    for column in ["HS", "AS", "HST", "AST", "B365H", "B365D", "B365A"]:
        if column in output.columns:
            output[column] = pd.to_numeric(output[column], errors="coerce")

    output = output.dropna(subset=["Date", "HomeTeam", "AwayTeam", "FTHG", "FTAG"])
    output = output.sort_values("Date").reset_index(drop=True)
    return output


def resolve_team_name(df: pd.DataFrame, team: str) -> str:
    requested = str(team).strip()
    if not requested:
        raise ValueError("Informe o nome do time.")

    teams = pd.concat([df["HomeTeam"], df["AwayTeam"]], ignore_index=True).dropna().astype(str).unique()
    exact = [candidate for candidate in teams if candidate.lower() == requested.lower()]

    if exact:
        return exact[0]

    partial = [candidate for candidate in teams if requested.lower() in candidate.lower()]

    if len(partial) == 1:
        return partial[0]

    if partial:
        options = ", ".join(sorted(partial)[:12])
        raise ValueError(f"Time ambíguo: {team}. Opções encontradas: {options}")

    options = ", ".join(sorted(teams)[:20])
    raise ValueError(f"Time não encontrado: {team}. Exemplos disponíveis: {options}")


def add_team_match_columns(df: pd.DataFrame, team: str) -> pd.DataFrame:
    team_name = resolve_team_name(df, team)
    matches = df.loc[(df["HomeTeam"] == team_name) | (df["AwayTeam"] == team_name)].copy()

    if matches.empty:
        raise ValueError(f"Nenhuma partida encontrada para {team}.")

    is_home = matches["HomeTeam"] == team_name
    matches["ADQL_Team"] = team_name
    matches["ADQL_Opponent"] = matches["AwayTeam"].where(is_home, matches["HomeTeam"])
    matches["ADQL_Venue"] = is_home.map({True: "Casa", False: "Fora"})
    matches["ADQL_GF"] = matches["FTHG"].where(is_home, matches["FTAG"])
    matches["ADQL_GA"] = matches["FTAG"].where(is_home, matches["FTHG"])
    matches["ADQL_Score"] = matches["ADQL_GF"].astype(int).astype(str) + "-" + matches["ADQL_GA"].astype(int).astype(str)
    matches["ADQL_Result"] = "D"
    matches.loc[matches["ADQL_GF"] > matches["ADQL_GA"], "ADQL_Result"] = "W"
    matches.loc[matches["ADQL_GF"] < matches["ADQL_GA"], "ADQL_Result"] = "L"
    matches["ADQL_Points"] = matches["ADQL_Result"].map(RESULT_POINTS).fillna(0).astype(int)

    if {"HS", "AS"}.issubset(matches.columns):
        matches["ADQL_ShotsFor"] = matches["HS"].where(is_home, matches["AS"])
        matches["ADQL_ShotsAgainst"] = matches["AS"].where(is_home, matches["HS"])

    if {"HST", "AST"}.issubset(matches.columns):
        matches["ADQL_ShotsOnTargetFor"] = matches["HST"].where(is_home, matches["AST"])
        matches["ADQL_ShotsOnTargetAgainst"] = matches["AST"].where(is_home, matches["HST"])

    if {"B365H", "B365D", "B365A"}.issubset(matches.columns):
        matches["ADQL_WinOdd"] = matches["B365H"].where(is_home, matches["B365A"])
        matches["ADQL_DrawOdd"] = matches["B365D"]
        matches["ADQL_LoseOdd"] = matches["B365A"].where(is_home, matches["B365H"])

    return matches.sort_values("Date").reset_index(drop=True)


def get_team_matches(df: pd.DataFrame, team: str, last_n: int = 5) -> pd.DataFrame:
    matches = add_team_match_columns(df, team)
    return matches.tail(int(last_n)).reset_index(drop=True)


def get_multiple_team_matches(df: pd.DataFrame, teams: Iterable[str], last_n: int = 5) -> dict[str, pd.DataFrame]:
    return {resolve_team_name(df, team): get_team_matches(df, team=team, last_n=last_n) for team in teams}
