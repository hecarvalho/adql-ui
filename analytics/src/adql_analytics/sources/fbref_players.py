from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Sequence

import pandas as pd

from .fbref import FBrefSource, normalize_player_table


IDENTITY_COLUMNS = ("league", "season", "team", "player")
DEFAULT_PLAYER_STAT_TYPES = ("standard", "shooting", "misc")


@dataclass(frozen=True)
class FBrefPlayerStatsRequest:
    """Configuração para buscar estatísticas de jogadores no FBref via soccerdata."""

    leagues: str | Iterable[str] = "ENG-Premier League"
    seasons: str | int | Iterable[str | int] = "2025-2026"
    stat_types: Sequence[str] = DEFAULT_PLAYER_STAT_TYPES
    no_cache: bool = False


def _with_stat_prefix(df: pd.DataFrame, stat_type: str) -> pd.DataFrame:
    """Prefixa colunas estatísticas para evitar colisões entre tabelas do FBref."""
    output = df.copy()
    renamed: dict[str, str] = {}

    for column in output.columns:
        name = str(column)

        if name in IDENTITY_COLUMNS:
            continue

        if name.startswith(f"{stat_type}_"):
            continue

        renamed[name] = f"{stat_type}_{name}"

    return output.rename(columns=renamed)


def _ensure_identity_columns(df: pd.DataFrame) -> pd.DataFrame:
    output = df.copy()

    for column in IDENTITY_COLUMNS:
        if column not in output.columns:
            output[column] = ""

    return output


def fetch_fbref_player_stats(request: FBrefPlayerStatsRequest) -> pd.DataFrame:
    """Busca e mescla tabelas de jogadores do FBref.

    O retorno é um DataFrame já normalizado para facilitar transformação em JSON ADQL.
    Cada `stat_type` vira um conjunto de colunas prefixadas, por exemplo:
    `standard_per_90_minutes_gls`, `shooting_standard_sh/90`, `misc_performance_tklw`.
    """
    source = FBrefSource(
        leagues=request.leagues,
        seasons=request.seasons,
        no_cache=request.no_cache,
    )

    merged: pd.DataFrame | None = None

    for stat_type in request.stat_types:
        stat_type = str(stat_type).strip()

        if not stat_type:
            continue

        table = source.player_season_stats(stat_type=stat_type)
        table = normalize_player_table(table)
        table = _ensure_identity_columns(table)
        table = _with_stat_prefix(table, stat_type)

        if merged is None:
            merged = table
            continue

        merged = merged.merge(
            table,
            on=list(IDENTITY_COLUMNS),
            how="outer",
            suffixes=("", f"_{stat_type}"),
        )

    if merged is None:
        raise ValueError("Nenhum stat_type válido foi informado para o FBref.")

    merged = merged.drop_duplicates().reset_index(drop=True)
    return merged


def sample_fbref_player_stats() -> pd.DataFrame:
    """Base pequena para validar o pipeline sem internet.

    Os valores são fictícios e existem apenas para teste estrutural do exportador.
    Use `fetch_fbref_player_stats` para gerar comparações reais.
    """
    return pd.DataFrame(
        [
            {
                "league": "ENG-Premier League",
                "season": "2025-2026",
                "team": "Arsenal",
                "player": "Bukayo Saka",
                "standard_playing_time_90s": 27.4,
                "standard_per_90_minutes_gls": 0.42,
                "standard_per_90_minutes_ast": 0.31,
                "standard_per_90_minutes_xg": 0.39,
                "standard_per_90_minutes_xag": 0.34,
                "shooting_standard_sh/90": 3.12,
                "standard_progression_prgc": 126,
                "standard_progression_prgp": 142,
                "misc_performance_tklw": 28,
                "standard_performance_int": 17,
            },
            {
                "league": "ENG-Premier League",
                "season": "2025-2026",
                "team": "Liverpool",
                "player": "Mohamed Salah",
                "standard_playing_time_90s": 31.2,
                "standard_per_90_minutes_gls": 0.66,
                "standard_per_90_minutes_ast": 0.24,
                "standard_per_90_minutes_xg": 0.58,
                "standard_per_90_minutes_xag": 0.25,
                "shooting_standard_sh/90": 3.64,
                "standard_progression_prgc": 114,
                "standard_progression_prgp": 96,
                "misc_performance_tklw": 19,
                "standard_performance_int": 10,
            },
            {
                "league": "ENG-Premier League",
                "season": "2025-2026",
                "team": "Manchester City",
                "player": "Phil Foden",
                "standard_playing_time_90s": 24.8,
                "standard_per_90_minutes_gls": 0.37,
                "standard_per_90_minutes_ast": 0.27,
                "standard_per_90_minutes_xg": 0.31,
                "standard_per_90_minutes_xag": 0.29,
                "shooting_standard_sh/90": 2.72,
                "standard_progression_prgc": 98,
                "standard_progression_prgp": 151,
                "misc_performance_tklw": 22,
                "standard_performance_int": 16,
            },
            {
                "league": "ENG-Premier League",
                "season": "2025-2026",
                "team": "Chelsea",
                "player": "Cole Palmer",
                "standard_playing_time_90s": 29.1,
                "standard_per_90_minutes_gls": 0.48,
                "standard_per_90_minutes_ast": 0.35,
                "standard_per_90_minutes_xg": 0.43,
                "standard_per_90_minutes_xag": 0.37,
                "shooting_standard_sh/90": 3.05,
                "standard_progression_prgc": 104,
                "standard_progression_prgp": 133,
                "misc_performance_tklw": 21,
                "standard_performance_int": 14,
            },
        ]
    )
