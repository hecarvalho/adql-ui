from __future__ import annotations

import pandas as pd


RESULT_POINTS = {"W": 3, "D": 1, "L": 0}


def summarize_recent_form(form_df: pd.DataFrame, result_column: str = "ADQL_Result") -> dict[str, int | str]:
    if result_column not in form_df.columns:
        raise ValueError(f"Coluna de resultado não encontrada: {result_column}")

    results = form_df[result_column].dropna().astype(str).tolist()
    points = sum(RESULT_POINTS.get(result, 0) for result in results)

    return {
        "matches": len(results),
        "wins": results.count("W"),
        "draws": results.count("D"),
        "losses": results.count("L"),
        "points": points,
        "sequence": "".join(results),
    }


def build_form_table(team: str, summary: dict[str, int | str]) -> pd.DataFrame:
    return pd.DataFrame(
        [
            ["Equipe", team],
            ["Jogos", summary["matches"]],
            ["Vitórias", summary["wins"]],
            ["Empates", summary["draws"]],
            ["Derrotas", summary["losses"]],
            ["Pontos", summary["points"]],
            ["Sequência", summary["sequence"]],
        ],
        columns=["Métrica", "Valor"],
    )
