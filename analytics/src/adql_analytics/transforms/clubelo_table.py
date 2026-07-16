from __future__ import annotations

from typing import Iterable, Sequence

import pandas as pd

from adql_analytics.adql_export.to_c06_table import dataframe_to_c06_table
from adql_analytics.sources.clubelo import normalize_clubelo_dataframe, resolve_club_names


MODE_ALIASES = {
    "top": "top",
    "ranking": "top",
    "rankings": "top",
    "ratings": "top",
    "compare": "compare",
    "comparison": "compare",
    "comparar": "compare",
    "history": "history",
    "historico": "history",
    "histórico": "history",
    "trend": "history",
}


def _fmt_number(value: object, decimals: int = 0) -> str:
    number = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
    if pd.isna(number):
        return "—"
    if decimals <= 0:
        return f"{float(number):.0f}"
    text = f"{float(number):.{decimals}f}"
    return text.replace(".0", "")


def _fmt_signed(value: object, decimals: int = 0) -> str:
    number = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
    if pd.isna(number):
        return "—"
    sign = "+" if float(number) > 0 else ""
    if decimals <= 0:
        return f"{sign}{float(number):.0f}"
    text = f"{sign}{float(number):.{decimals}f}"
    return text.replace(".0", "")


def _fmt_date(value: object) -> str:
    timestamp = pd.to_datetime(value, errors="coerce")
    if pd.isna(timestamp):
        return "—"
    return timestamp.strftime("%d/%m/%Y")


def _normalize_mode(mode: str) -> str:
    key = str(mode or "top").strip().lower()
    return MODE_ALIASES.get(key, "top")


def build_clubelo_ranking_dataframe(df: pd.DataFrame, top: int = 10) -> pd.DataFrame:
    normalized = normalize_clubelo_dataframe(df)
    table = normalized.head(int(top)).copy()

    rows = []
    for _, row in table.iterrows():
        rows.append(
            {
                "Pos.": _fmt_number(row.get("ADQL_Rank"), 0),
                "Equipe": str(row.get("ADQL_Team", "—")),
                "País": str(row.get("ADQL_Country", "—")),
                "Nível": _fmt_number(row.get("ADQL_Level"), 0),
                "Elo": _fmt_number(row.get("ADQL_Elo"), 0),
                "Data": _fmt_date(row.get("ADQL_Date")),
            }
        )

    return pd.DataFrame(rows)


def build_clubelo_comparison_dataframe(df: pd.DataFrame, teams: Sequence[str]) -> pd.DataFrame:
    normalized = normalize_clubelo_dataframe(df)
    resolved = resolve_club_names(df, teams)
    selected = normalized[normalized["ADQL_Team"].isin(resolved)].copy()
    selected["_order"] = selected["ADQL_Team"].apply(lambda name: resolved.index(name))
    selected = selected.sort_values("_order")

    if selected.empty:
        raise ValueError("Nenhuma equipe selecionada foi encontrada no DataFrame ClubElo.")

    max_elo = normalized["ADQL_Elo"].max()
    reference = selected.iloc[0]
    reference_elo = float(reference["ADQL_Elo"])

    rows = []
    for _, row in selected.iterrows():
        elo = float(row.get("ADQL_Elo"))
        rows.append(
            {
                "Equipe": str(row.get("ADQL_Team", "—")),
                "País": str(row.get("ADQL_Country", "—")),
                "Rank": _fmt_number(row.get("ADQL_Rank"), 0),
                "Elo": _fmt_number(elo, 0),
                "vs 1ª equipe": _fmt_signed(elo - reference_elo, 0),
                "vs melhor": _fmt_signed(elo - float(max_elo), 0),
                "Nível": _fmt_number(row.get("ADQL_Level"), 0),
            }
        )

    return pd.DataFrame(rows)


def build_clubelo_history_dataframe(history_df: pd.DataFrame, teams: Sequence[str] | None = None, last_n: int = 8) -> pd.DataFrame:
    normalized = normalize_clubelo_dataframe(history_df)

    if teams:
        resolved = resolve_club_names(history_df, teams)
        normalized = normalized[normalized["ADQL_Team"].isin(resolved)].copy()

    if normalized.empty:
        raise ValueError("Histórico ClubElo vazio depois dos filtros.")

    normalized = normalized.sort_values(["ADQL_Team", "ADQL_Date"])
    rows: list[dict[str, str]] = []

    for team, group in normalized.groupby("ADQL_Team", sort=False):
        recent = group.tail(int(last_n)).copy()
        first_elo = float(recent["ADQL_Elo"].iloc[0])
        last_elo = float(recent["ADQL_Elo"].iloc[-1])
        country = str(recent["ADQL_Country"].replace("nan", "—").iloc[-1])

        rows.append(
            {
                "Equipe": str(team),
                "País": country,
                "Início": _fmt_date(recent["ADQL_Date"].iloc[0]),
                "Fim": _fmt_date(recent["ADQL_Date"].iloc[-1]),
                "Elo inicial": _fmt_number(first_elo, 0),
                "Elo final": _fmt_number(last_elo, 0),
                "Variação": _fmt_signed(last_elo - first_elo, 0),
                "Pontos analisados": str(len(recent)),
            }
        )

    return pd.DataFrame(rows)


def clubelo_to_c06_payload(
    df: pd.DataFrame,
    mode: str = "top",
    teams: Sequence[str] | None = None,
    top: int = 10,
    date: str | None = None,
    title: str | None = None,
    subtitle: str | None = None,
    source: str = "ClubElo / soccerdata / ADQL Analytics Layer",
) -> dict:
    """Converte ratings ClubElo em payload C-06.

    Modos:
    - `top`: ranking das equipes mais fortes no recorte.
    - `compare`: comparação entre equipes selecionadas.
    """
    normalized_mode = _normalize_mode(mode)

    if normalized_mode == "compare":
        cleaned_teams = [team for team in (teams or []) if str(team).strip()]
        if not cleaned_teams:
            raise ValueError("No modo compare, informe equipes com --teams.")

        table_df = build_clubelo_comparison_dataframe(df, cleaned_teams)
        names = " x ".join(table_df["Equipe"].tolist())
        card_title = title or f"ClubElo — {names}"
        card_subtitle = subtitle or "Força relativa das equipes no recorte selecionado"
    elif normalized_mode == "history":
        table_df = build_clubelo_history_dataframe(df, teams=teams, last_n=top)
        card_title = title or "ClubElo — evolução recente"
        card_subtitle = subtitle or f"Variação de rating nos últimos {top} registros por equipe"
    else:
        table_df = build_clubelo_ranking_dataframe(df, top=top)
        card_title = title or f"ClubElo — Top {top} equipes"
        card_subtitle = subtitle or "Ranking de força relativa por rating Elo"

    payload = dataframe_to_c06_table(
        df=table_df,
        title=card_title,
        subtitle=card_subtitle,
        max_rows=None,
    )

    payload["description"] = (
        "Tabela gerada com ratings ClubElo. Use como contexto de força relativa e nível do adversário; "
        "não trate Elo como métrica isolada de desempenho técnico, físico ou tático."
    )
    payload["source"] = source
    payload["data"]["source"] = source
    payload["data"]["normalization"] = {
        "type": "clubelo_rating",
        "mode": normalized_mode,
        "top": int(top),
        "date": date,
    }
    payload["data"]["rawMetrics"] = {
        "mode": normalized_mode,
        "teams": list(teams or []),
        "top": int(top),
        "date": date,
    }

    return payload
