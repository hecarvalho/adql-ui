from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

import pandas as pd

from adql_analytics.adql_export.schemas import ADQL_SCHEMA_VERSIONS


STATSBOMB_FIELD_X = 120.0
STATSBOMB_FIELD_Y = 80.0


@dataclass(slots=True)
class TacticalSequenceOptions:
    title: str = "Sequência StatsBomb"
    subtitle: str = "StatsBomb Open Data → ADQL C-03"
    source: str = "StatsBomb Open Data via statsbombpy"
    attacking_team: str | None = None
    flip_x: bool = False
    max_events: int = 10
    include_pressures: bool = True


def _safe_text(value: Any, fallback: str = "") -> str:
    if value is None:
        return fallback

    if isinstance(value, float) and pd.isna(value):
        return fallback

    text = str(value).strip()
    return text or fallback


def _safe_float(value: Any, fallback: float = 0.0) -> float:
    try:
        if value is None or (isinstance(value, float) and pd.isna(value)):
            return fallback
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _safe_int(value: Any, fallback: int = 0) -> int:
    try:
        if value is None or (isinstance(value, float) and pd.isna(value)):
            return fallback
        return int(float(value))
    except (TypeError, ValueError):
        return fallback


def _list_value(value: Any) -> list[Any] | None:
    if isinstance(value, list):
        return value

    if isinstance(value, tuple):
        return list(value)

    if isinstance(value, str):
        text = value.strip()
        if text.startswith("[") and text.endswith("]"):
            try:
                import ast

                parsed = ast.literal_eval(text)
                if isinstance(parsed, (list, tuple)):
                    return list(parsed)
            except (SyntaxError, ValueError):
                return None

    return None


def statsbomb_location_to_percent(
    location: Any,
    *,
    flip_x: bool = False,
    fallback: tuple[float, float] = (50.0, 50.0),
) -> tuple[float, float]:
    """Converte coordenadas StatsBomb 120x80 para percentual 0-100.

    StatsBomb usa 120 como comprimento de campo e 80 como largura. O ADQL C-03
    recebe coordenadas percentuais e o importador do editor converte para o SVG.
    """

    raw = _list_value(location)

    if not raw or len(raw) < 2:
        return fallback

    x = max(0.0, min(STATSBOMB_FIELD_X, _safe_float(raw[0], fallback[0] / 100 * STATSBOMB_FIELD_X)))
    y = max(0.0, min(STATSBOMB_FIELD_Y, _safe_float(raw[1], fallback[1] / 100 * STATSBOMB_FIELD_Y)))

    if flip_x:
        x = STATSBOMB_FIELD_X - x
        y = STATSBOMB_FIELD_Y - y

    return round((x / STATSBOMB_FIELD_X) * 100, 2), round((y / STATSBOMB_FIELD_Y) * 100, 2)


def _event_type(row: pd.Series) -> str:
    return _safe_text(row.get("type"), "Evento")


def _event_team(row: pd.Series) -> str:
    return _safe_text(row.get("team"), "Equipe")


def _event_player(row: pd.Series) -> str:
    return _safe_text(row.get("player"), "Jogador")


def _event_time(row: pd.Series) -> str:
    minute = _safe_int(row.get("minute"), 0)
    second = _safe_int(row.get("second"), 0)
    return f"{minute:02d}:{second:02d}"


def _destination_for_event(row: pd.Series) -> Any:
    event_type = _event_type(row)

    if event_type == "Pass":
        return row.get("pass_end_location")

    if event_type == "Carry":
        return row.get("carry_end_location")

    if event_type == "Shot":
        return row.get("shot_end_location")

    return None


def _node_id(prefix: str, index: int) -> str:
    return f"{prefix}{index:02d}"


def _trim_events(events: pd.DataFrame, max_events: int) -> pd.DataFrame:
    if "index" in events.columns:
        events = events.sort_values("index", kind="stable")
    elif {"period", "minute", "second"}.issubset(events.columns):
        events = events.sort_values(["period", "minute", "second"], kind="stable")

    relevant = events[events["type"].isin(["Pass", "Carry", "Shot", "Pressure", "Ball Recovery", "Dribble"])] if "type" in events.columns else events

    if max_events > 0:
        relevant = relevant.head(max_events)

    return relevant.reset_index(drop=True)


def _sequence_reading(events: pd.DataFrame, attacking_team: str | None) -> str:
    if events.empty:
        return "Sequência gerada a partir de eventos StatsBomb para edição no ADQL UI."

    first = events.iloc[0]
    last = events.iloc[-1]
    team = attacking_team or _safe_text(first.get("possession_team"), _event_team(first))
    start_time = _event_time(first)
    end_time = _event_time(last)
    types = events["type"].value_counts().to_dict() if "type" in events.columns else {}

    parts = [f"Recorte de {team} entre {start_time} e {end_time}."]

    if types.get("Pass"):
        parts.append(f"A sequência contém {types['Pass']} passe(s).")

    if types.get("Carry"):
        parts.append(f"Há {types['Carry']} condução(ões) para progressão territorial.")

    if types.get("Shot"):
        shots = events[events["type"] == "Shot"]
        xg_values = [
            _safe_float(item, 0.0)
            for item in shots.get("shot_statsbomb_xg", pd.Series([], dtype=float)).tolist()
            if item is not None and not (isinstance(item, float) and pd.isna(item))
        ]
        if xg_values:
            parts.append(f"A posse termina em finalização com xG aproximado de {max(xg_values):.2f}.")
        else:
            parts.append("A posse termina em finalização.")

    return " ".join(parts)


def _zone_from_locations(locations: Iterable[tuple[float, float]]) -> list[dict[str, Any]]:
    points = list(locations)

    if len(points) < 2:
        return []

    min_x = max(0, min(point[0] for point in points) - 5)
    max_x = min(100, max(point[0] for point in points) + 5)
    min_y = max(0, min(point[1] for point in points) - 6)
    max_y = min(100, max(point[1] for point in points) + 6)

    if max_x - min_x < 8 or max_y - min_y < 8:
        return []

    return [
        {
            "x1": round(min_x, 2),
            "y1": round(min_y, 2),
            "x2": round(max_x, 2),
            "y2": round(max_y, 2),
        }
    ]


def _step_copy(events: pd.DataFrame) -> list[dict[str, str]]:
    if events.empty:
        return [
            {"title": "Recorte", "text": "Selecionar a sequência principal."},
            {"title": "Progressão", "text": "Observar como a bola avança no campo."},
            {"title": "Consequência", "text": "Identificar a ação final da posse."},
        ]

    has_pass = bool((events.get("type") == "Pass").any()) if "type" in events.columns else False
    has_carry = bool((events.get("type") == "Carry").any()) if "type" in events.columns else False
    has_shot = bool((events.get("type") == "Shot").any()) if "type" in events.columns else False

    return [
        {
            "title": "Origem",
            "text": "Localizar o primeiro ponto de controle da posse e a orientação da equipe.",
        },
        {
            "title": "Progressão",
            "text": "Acompanhar passes e conduções que movem a bola entre setores." if has_pass or has_carry else "Observar a sequência de eventos conectados.",
        },
        {
            "title": "Finalização" if has_shot else "Saída",
            "text": "Avaliar a condição criada para o chute." if has_shot else "Interpretar o resultado tático do recorte.",
        },
    ]


def events_to_c03_scene(
    events: pd.DataFrame,
    *,
    options: TacticalSequenceOptions | None = None,
) -> dict[str, Any]:
    """Transforma uma sequência de eventos StatsBomb em JSON C-03.

    O resultado não tenta recriar as posições de todos os jogadores em campo.
    Ele gera uma cena tática editável baseada nos pontos reais dos eventos:
    origem, destino de passes, conduções, pressões e finalização.
    """

    opts = options or TacticalSequenceOptions()
    sequence = _trim_events(events.copy(), opts.max_events)

    if sequence.empty:
        raise ValueError("Nenhum evento disponível para gerar a cena C-03.")

    attacking_team = opts.attacking_team or _safe_text(sequence.iloc[0].get("possession_team"), _event_team(sequence.iloc[0]))

    players: list[dict[str, Any]] = []
    actions: list[dict[str, Any]] = []
    pressures: list[dict[str, Any]] = []
    gates: list[dict[str, Any]] = []
    steps: list[dict[str, Any]] = []
    all_locations: list[tuple[float, float]] = []

    previous_node_id: str | None = None
    previous_actor: str | None = None
    step_number = 1

    for idx, row in sequence.iterrows():
        event_type = _event_type(row)
        team = _event_team(row)
        player = _event_player(row)
        is_opponent = team.casefold() != attacking_team.casefold()
        start_x, start_y = statsbomb_location_to_percent(row.get("location"), flip_x=opts.flip_x)
        all_locations.append((start_x, start_y))

        if event_type == "Pressure" and opts.include_pressures:
            pressure_id = _node_id("o", idx + 1)
            players.append(
                {
                    "id": pressure_id,
                    "label": "P",
                    "name": player,
                    "type": "opponent" if is_opponent else "team",
                    "x": start_x,
                    "y": start_y,
                    "role": "pressure",
                }
            )
            pressures.append({"playerId": pressure_id, "r": 32})
            continue

        start_id = _node_id("p", idx + 1)
        players.append(
            {
                "id": start_id,
                "label": str(step_number),
                "name": player,
                "type": "opponent" if is_opponent else "team",
                "x": start_x,
                "y": start_y,
                "role": event_type.lower(),
            }
        )
        steps.append({"playerId": start_id, "number": step_number})
        step_number += 1

        if previous_node_id and previous_actor and previous_actor != player and event_type not in {"Ball Recovery"}:
            actions.append({"type": "pass", "from": previous_node_id, "to": start_id, "bend": 0.08})

        destination = _destination_for_event(row)
        end_location = statsbomb_location_to_percent(destination, flip_x=opts.flip_x, fallback=(start_x, start_y)) if destination is not None else None

        if event_type in {"Pass", "Carry", "Shot"} and end_location:
            end_x, end_y = end_location
            all_locations.append((end_x, end_y))

            if event_type == "Pass":
                recipient = _safe_text(row.get("pass_recipient"), "Destino")
                end_id = _node_id("p", idx + 1 + 100)
                players.append(
                    {
                        "id": end_id,
                        "label": str(step_number),
                        "name": recipient,
                        "type": "team" if not is_opponent else "opponent",
                        "x": end_x,
                        "y": end_y,
                        "role": "pass-reception",
                    }
                )
                actions.append({"type": "pass", "from": start_id, "to": end_id, "bend": 0.12})
                previous_node_id = end_id
                previous_actor = recipient
                steps.append({"playerId": end_id, "number": step_number})
                step_number += 1

            elif event_type == "Carry":
                end_id = _node_id("p", idx + 1 + 100)
                players.append(
                    {
                        "id": end_id,
                        "label": str(step_number),
                        "name": player,
                        "type": "team" if not is_opponent else "opponent",
                        "x": end_x,
                        "y": end_y,
                        "role": "carry-end",
                    }
                )
                actions.append({"type": "carry", "from": start_id, "to": end_id, "bend": -0.1})
                previous_node_id = end_id
                previous_actor = player
                steps.append({"playerId": end_id, "number": step_number})
                step_number += 1

            elif event_type == "Shot":
                goal_id = _node_id("p", idx + 1 + 100)
                players.append(
                    {
                        "id": goal_id,
                        "label": "G",
                        "name": "Alvo",
                        "type": "highlight",
                        "x": end_x,
                        "y": end_y,
                        "role": "shot-target",
                    }
                )
                actions.append({"type": "pass", "from": start_id, "to": goal_id, "bend": 0.05})
                gates.append({"x1": 96, "y1": 43, "x2": 100, "y2": 57})
                previous_node_id = goal_id
                previous_actor = "Alvo"
        else:
            previous_node_id = start_id
            previous_actor = player

    # Limita marcadores a três para evitar poluir o C-03.
    steps = steps[:3]

    title = opts.title
    if title == "Sequência StatsBomb" and attacking_team:
        title = f"Sequência de {attacking_team}"

    zones = _zone_from_locations(all_locations)
    reading = _sequence_reading(sequence, attacking_team)

    return {
        "schemaVersion": ADQL_SCHEMA_VERSIONS["c03"],
        "coordinateSystem": "percent-0-100",
        "kicker": "Campo tático",
        "title": title,
        "subtitle": opts.subtitle,
        "description": reading,
        "reading": reading,
        "source": opts.source,
        "players": players,
        "actions": actions,
        "zones": zones,
        "pressures": pressures,
        "gates": gates,
        "steps": steps,
        "stepCopy": _step_copy(sequence),
        "meta": {
            "provider": "StatsBomb Open Data",
            "attackingTeam": attacking_team,
            "eventsCount": int(len(sequence)),
            "eventTypes": sequence["type"].value_counts().to_dict() if "type" in sequence.columns else {},
        },
    }
