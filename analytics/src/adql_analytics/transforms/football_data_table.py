from __future__ import annotations

from typing import Sequence

import pandas as pd

from adql_analytics.adql_export.to_c06_table import dataframe_to_c06_table
from adql_analytics.sources.football_data_co_uk import (
    RESULT_POINTS,
    add_team_match_columns,
    normalize_results_dataframe,
    resolve_team_name,
)

RESULT_LABELS = {"W": "Vitória", "D": "Empate", "L": "Derrota"}


def _fmt_number(value: object, decimals: int = 1) -> str:
    number = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
    if pd.isna(number):
        return "—"
    if decimals <= 0:
        return f"{float(number):.0f}"
    text = f"{float(number):.{decimals}f}"
    return text.replace(".0", "")


def _sequence(results: Sequence[str]) -> str:
    return " ".join(str(result) for result in results)


def summarize_team_form(matches: pd.DataFrame) -> dict[str, object]:
    if matches.empty:
        return {
            "team": "—",
            "matches": 0,
            "wins": 0,
            "draws": 0,
            "losses": 0,
            "points": 0,
            "goals_for": 0,
            "goals_against": 0,
            "goal_difference": 0,
            "sequence": "—",
            "shots_for_avg": None,
            "shots_against_avg": None,
            "shots_on_target_avg": None,
        }

    results = matches["ADQL_Result"].dropna().astype(str).tolist()
    gf = pd.to_numeric(matches["ADQL_GF"], errors="coerce").fillna(0)
    ga = pd.to_numeric(matches["ADQL_GA"], errors="coerce").fillna(0)

    summary = {
        "team": str(matches["ADQL_Team"].iloc[0]),
        "matches": len(matches),
        "wins": results.count("W"),
        "draws": results.count("D"),
        "losses": results.count("L"),
        "points": int(sum(RESULT_POINTS.get(result, 0) for result in results)),
        "goals_for": int(gf.sum()),
        "goals_against": int(ga.sum()),
        "goal_difference": int(gf.sum() - ga.sum()),
        "sequence": _sequence(results),
    }

    if "ADQL_ShotsFor" in matches.columns:
        summary["shots_for_avg"] = float(pd.to_numeric(matches["ADQL_ShotsFor"], errors="coerce").mean())
        summary["shots_against_avg"] = float(pd.to_numeric(matches["ADQL_ShotsAgainst"], errors="coerce").mean())

    if "ADQL_ShotsOnTargetFor" in matches.columns:
        summary["shots_on_target_avg"] = float(
            pd.to_numeric(matches["ADQL_ShotsOnTargetFor"], errors="coerce").mean()
        )

    return summary


def build_team_form_dataframe(matches: pd.DataFrame) -> pd.DataFrame:
    rows: list[dict[str, str]] = []

    for _, row in matches.iterrows():
        rows.append(
            {
                "Data": row["Date"].strftime("%d/%m/%Y") if pd.notna(row.get("Date")) else "—",
                "Local": str(row.get("ADQL_Venue", "—")),
                "Adversário": str(row.get("ADQL_Opponent", "—")),
                "Placar": str(row.get("ADQL_Score", "—")),
                "Resultado": RESULT_LABELS.get(str(row.get("ADQL_Result", "")), str(row.get("ADQL_Result", "—"))),
                "Chutes": _fmt_number(row.get("ADQL_ShotsFor"), 0),
                "No alvo": _fmt_number(row.get("ADQL_ShotsOnTargetFor"), 0),
                "Odd vitória": _fmt_number(row.get("ADQL_WinOdd"), 2),
            }
        )

    return pd.DataFrame(rows)


def build_team_comparison_dataframe(summaries: Sequence[dict[str, object]]) -> pd.DataFrame:
    rows: list[dict[str, str]] = []

    for summary in summaries:
        rows.append(
            {
                "Equipe": str(summary.get("team", "—")),
                "Jogos": str(summary.get("matches", 0)),
                "V-E-D": f"{summary.get('wins', 0)}-{summary.get('draws', 0)}-{summary.get('losses', 0)}",
                "Pontos": str(summary.get("points", 0)),
                "Gols": f"{summary.get('goals_for', 0)}-{summary.get('goals_against', 0)}",
                "Saldo": str(summary.get("goal_difference", 0)),
                "Seq.": str(summary.get("sequence", "—")),
                "Chutes/J": _fmt_number(summary.get("shots_for_avg"), 1),
                "Sofridos/J": _fmt_number(summary.get("shots_against_avg"), 1),
                "No alvo/J": _fmt_number(summary.get("shots_on_target_avg"), 1),
            }
        )

    return pd.DataFrame(rows)


def football_data_to_c06_payload(
    df: pd.DataFrame,
    teams: Sequence[str],
    mode: str = "compare",
    last_n: int = 5,
    title: str | None = None,
    subtitle: str | None = None,
    source: str = "Football-Data.co.uk / ADQL Analytics Layer",
) -> dict:
    """Converte resultados do Football-Data.co.uk em JSON C-06.

    `mode="compare"` cria uma tabela-resumo entre equipes.
    `mode="matches"` cria a lista dos últimos jogos de uma única equipe.
    """
    normalized = normalize_results_dataframe(df)
    cleaned_teams = [team for team in teams if str(team).strip()]

    if not cleaned_teams:
        raise ValueError("Informe pelo menos um time com --team.")

    mode = str(mode or "compare").lower().strip()

    selected_matches: dict[str, pd.DataFrame] = {}
    summaries: list[dict[str, object]] = []

    for team in cleaned_teams:
        resolved = resolve_team_name(normalized, team)
        matches = add_team_match_columns(normalized, resolved).tail(int(last_n)).reset_index(drop=True)
        selected_matches[resolved] = matches
        summaries.append(summarize_team_form(matches))

    if mode in {"matches", "team", "recent", "form"}:
        first_team = next(iter(selected_matches))
        table_df = build_team_form_dataframe(selected_matches[first_team])
        card_title = title or f"Últimos {last_n} jogos — {first_team}"
        card_subtitle = subtitle or "Forma recente com placar, volume de finalizações e odds de referência"
    else:
        table_df = build_team_comparison_dataframe(summaries)
        names = " x ".join(summary["team"] for summary in summaries)
        card_title = title or f"Forma recente — {names}"
        card_subtitle = subtitle or f"Últimos {last_n} jogos por equipe"

    payload = dataframe_to_c06_table(
        df=table_df,
        title=card_title,
        subtitle=card_subtitle,
        max_rows=None,
    )

    payload["description"] = (
        "Tabela gerada a partir dos arquivos CSV do Football-Data.co.uk. "
        "Use como contexto de forma recente, casa/fora, resultados e odds, sempre cruzando com vídeo e leitura tática."
    )
    payload["source"] = source
    payload["data"]["source"] = source
    payload["data"]["rawMetrics"] = summaries
    payload["data"]["normalization"] = {
        "type": "recent_form",
        "lastN": int(last_n),
        "mode": mode,
    }

    return payload
