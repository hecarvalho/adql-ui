from __future__ import annotations

from typing import Iterable

import numpy as np
import pandas as pd


def add_percentile_columns(
    df: pd.DataFrame,
    metric_columns: Iterable[str],
    suffix: str = "_percentile",
    higher_is_better: bool = True,
) -> pd.DataFrame:
    """Adiciona percentis simples de 0 a 100 para métricas numéricas."""
    output = df.copy()

    for column in metric_columns:
        if column not in output.columns:
            raise ValueError(f"Coluna não encontrada: {column}")

        values = pd.to_numeric(output[column], errors="coerce")
        percentile = values.rank(pct=True) * 100
        if not higher_is_better:
            percentile = 100 - percentile

        output[f"{column}{suffix}"] = percentile.round(1).replace({np.nan: None})

    return output


def select_player_metrics(
    df: pd.DataFrame,
    player_column: str,
    player_name: str,
    metric_columns: Iterable[str],
) -> dict[str, float | int | str | None]:
    if player_column not in df.columns:
        raise ValueError(f"Coluna de jogador não encontrada: {player_column}")

    rows = df[df[player_column].astype(str).str.lower() == player_name.lower()]
    if rows.empty:
        raise ValueError(f"Jogador não encontrado: {player_name}")

    row = rows.iloc[0]
    result: dict[str, float | int | str | None] = {"player": player_name}

    for column in metric_columns:
        if column not in df.columns:
            raise ValueError(f"Coluna de métrica não encontrada: {column}")
        value = row[column]
        if pd.isna(value):
            result[column] = None
        elif isinstance(value, (int, float, str)):
            result[column] = value
        else:
            result[column] = str(value)

    return result
