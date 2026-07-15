from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import pandas as pd


def _require_statsbombpy():
    try:
        from statsbombpy import sb
    except ImportError as exc:  # pragma: no cover
        raise ImportError(
            "Instale as dependências com `pip install -r requirements.txt` para usar StatsBomb Open Data."
        ) from exc

    return sb


@dataclass(slots=True)
class StatsBombMatchRequest:
    """Identifica uma partida da base aberta StatsBomb."""

    match_id: int | None = None
    competition_id: int | None = None
    season_id: int | None = None


class StatsBombEventsSource:
    """Acesso simples à StatsBomb Open Data via statsbombpy.

    A classe mantém o acesso isolado em `sources/` para que os scripts do
    ADQL Analytics consigam buscar competições, partidas e eventos sem
    misturar coleta com transformação visual.
    """

    def competitions(self) -> pd.DataFrame:
        sb = _require_statsbombpy()
        return sb.competitions()

    def matches(self, competition_id: int, season_id: int) -> pd.DataFrame:
        sb = _require_statsbombpy()
        return sb.matches(competition_id=competition_id, season_id=season_id)

    def events(self, match_id: int) -> pd.DataFrame:
        sb = _require_statsbombpy()
        events = sb.events(match_id=match_id)

        if not isinstance(events, pd.DataFrame):
            raise TypeError("statsbombpy não retornou um DataFrame de eventos.")

        return normalize_events_dataframe(events)

    def lineups(self, match_id: int) -> dict[str, Any]:
        sb = _require_statsbombpy()
        return sb.lineups(match_id=match_id)


def normalize_events_dataframe(events: pd.DataFrame) -> pd.DataFrame:
    """Normaliza colunas esperadas sem alterar demais o DataFrame original."""

    df = events.copy()

    if "index" in df.columns:
        df = df.sort_values("index", kind="stable")
    elif {"period", "minute", "second"}.issubset(df.columns):
        df = df.sort_values(["period", "minute", "second"], kind="stable")

    for column in [
        "type",
        "team",
        "player",
        "possession_team",
        "pass_recipient",
    ]:
        if column in df.columns:
            df[column] = df[column].fillna("").astype(str)

    return df.reset_index(drop=True)


def sample_statsbomb_events() -> pd.DataFrame:
    """Base local mínima para validar o pipeline C-03 sem internet.

    O exemplo simula uma posse curta pelo corredor direito: recuperação,
    passe vertical, condução, cruzamento e finalização.
    """

    rows = [
        {
            "id": "sample-001",
            "index": 1,
            "period": 1,
            "timestamp": "00:10:12.000",
            "minute": 10,
            "second": 12,
            "type": "Ball Recovery",
            "team": "Brasil",
            "possession_team": "Brasil",
            "player": "Volante",
            "location": [42.0, 47.0],
            "possession": 12,
        },
        {
            "id": "sample-002",
            "index": 2,
            "period": 1,
            "timestamp": "00:10:14.000",
            "minute": 10,
            "second": 14,
            "type": "Pass",
            "team": "Brasil",
            "possession_team": "Brasil",
            "player": "Volante",
            "pass_recipient": "Meia direito",
            "location": [45.0, 48.0],
            "pass_end_location": [66.0, 58.0],
            "possession": 12,
        },
        {
            "id": "sample-003",
            "index": 3,
            "period": 1,
            "timestamp": "00:10:16.000",
            "minute": 10,
            "second": 16,
            "type": "Carry",
            "team": "Brasil",
            "possession_team": "Brasil",
            "player": "Meia direito",
            "location": [67.0, 58.0],
            "carry_end_location": [84.0, 63.0],
            "possession": 12,
        },
        {
            "id": "sample-004",
            "index": 4,
            "period": 1,
            "timestamp": "00:10:18.000",
            "minute": 10,
            "second": 18,
            "type": "Pressure",
            "team": "Adversário",
            "possession_team": "Brasil",
            "player": "Lateral adversário",
            "location": [82.0, 61.0],
            "possession": 12,
        },
        {
            "id": "sample-005",
            "index": 5,
            "period": 1,
            "timestamp": "00:10:20.000",
            "minute": 10,
            "second": 20,
            "type": "Pass",
            "team": "Brasil",
            "possession_team": "Brasil",
            "player": "Meia direito",
            "pass_recipient": "Centroavante",
            "location": [84.0, 63.0],
            "pass_end_location": [102.0, 41.0],
            "possession": 12,
        },
        {
            "id": "sample-006",
            "index": 6,
            "period": 1,
            "timestamp": "00:10:22.000",
            "minute": 10,
            "second": 22,
            "type": "Shot",
            "team": "Brasil",
            "possession_team": "Brasil",
            "player": "Centroavante",
            "location": [102.0, 41.0],
            "shot_end_location": [120.0, 39.5, 1.2],
            "shot_statsbomb_xg": 0.18,
            "possession": 12,
        },
    ]

    return normalize_events_dataframe(pd.DataFrame(rows))


def filter_events(
    events: pd.DataFrame,
    *,
    team: str | None = None,
    possession: int | None = None,
    minute_from: int | None = None,
    minute_to: int | None = None,
    event_types: list[str] | None = None,
    max_events: int | None = None,
) -> pd.DataFrame:
    """Filtra eventos por critérios simples para gerar um recorte tático."""

    df = normalize_events_dataframe(events)

    if team and "possession_team" in df.columns:
        mask = df["possession_team"].str.casefold() == team.casefold()
        if not mask.any() and "team" in df.columns:
            mask = df["team"].str.casefold() == team.casefold()
        df = df[mask]
    elif team and "team" in df.columns:
        df = df[df["team"].str.casefold() == team.casefold()]

    if possession is not None and "possession" in df.columns:
        df = df[df["possession"] == possession]

    if minute_from is not None and "minute" in df.columns:
        df = df[df["minute"] >= minute_from]

    if minute_to is not None and "minute" in df.columns:
        df = df[df["minute"] <= minute_to]

    if event_types and "type" in df.columns:
        allowed = {item.casefold() for item in event_types}
        df = df[df["type"].str.casefold().isin(allowed)]

    if max_events and max_events > 0:
        df = df.head(max_events)

    return df.reset_index(drop=True)


def select_possession_ending_in_shot(
    events: pd.DataFrame,
    *,
    team: str | None = None,
    min_events: int = 4,
    max_events: int = 12,
) -> pd.DataFrame:
    """Seleciona a primeira posse disponível que termina em finalização.

    É um modo prático para testar dados reais sem conhecer previamente o número
    da posse. O resultado fica limitado a `max_events` ações relevantes.
    """

    df = normalize_events_dataframe(events)

    if team:
        df = filter_events(df, team=team)

    if "possession" not in df.columns or "type" not in df.columns:
        raise ValueError("O DataFrame precisa conter as colunas 'possession' e 'type'.")

    relevant_types = {
        "Pass",
        "Carry",
        "Shot",
        "Pressure",
        "Ball Recovery",
        "Dribble",
        "Ball Receipt*",
    }

    for _, group in df.groupby("possession", sort=False):
        if "Shot" not in set(group["type"]):
            continue

        sequence = group[group["type"].isin(relevant_types)].copy()

        if len(sequence) >= min_events:
            return sequence.head(max_events).reset_index(drop=True)

    raise ValueError("Nenhuma posse com finalização encontrada para os filtros informados.")
