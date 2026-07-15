from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class FootballDataCoUkSource:
    """Leitor simples de CSVs públicos do football-data.co.uk.

    Exemplo de URL:
    https://www.football-data.co.uk/mmz4281/2526/E0.csv

    Códigos comuns:
    - E0: Premier League
    - SP1: La Liga
    - D1: Bundesliga
    - I1: Serie A
    - F1: Ligue 1
    """

    base_url: str = "https://www.football-data.co.uk/mmz4281"

    def read_competition_csv(self, season_code: str, competition_code: str) -> pd.DataFrame:
        url = f"{self.base_url}/{season_code}/{competition_code}.csv"
        return pd.read_csv(url)

    @staticmethod
    def recent_form(df: pd.DataFrame, team: str, last_n: int = 5) -> pd.DataFrame:
        if not {"HomeTeam", "AwayTeam", "Date", "FTHG", "FTAG"}.issubset(df.columns):
            raise ValueError("CSV não contém colunas esperadas: HomeTeam, AwayTeam, Date, FTHG, FTAG.")

        matches = df[(df["HomeTeam"] == team) | (df["AwayTeam"] == team)].copy()
        matches = matches.tail(last_n)

        def result(row):
            is_home = row["HomeTeam"] == team
            goals_for = row["FTHG"] if is_home else row["FTAG"]
            goals_against = row["FTAG"] if is_home else row["FTHG"]
            if goals_for > goals_against:
                return "W"
            if goals_for < goals_against:
                return "L"
            return "D"

        matches["ADQL_Result"] = matches.apply(result, axis=1)
        return matches
