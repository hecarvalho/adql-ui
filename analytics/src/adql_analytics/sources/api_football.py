from __future__ import annotations

import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence

import requests

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None

API_FOOTBALL_SOURCE_ID = "api_football"
API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io"


class APIFootballError(RuntimeError):
    """Erro de comunicação, autenticação ou resposta da API-Football."""


@dataclass(frozen=True)
class APIFootballClientConfig:
    api_key: str | None = None
    base_url: str = API_FOOTBALL_BASE_URL
    timeout: int = 30
    pause_seconds: float = 0.35


def _project_root() -> Path:
    return Path(__file__).resolve().parents[2]


def load_api_football_key() -> str | None:
    """Carrega a chave do `.env` ou do ambiente.

    Variáveis aceitas:
    - API_FOOTBALL_KEY
    - APISPORTS_KEY
    """
    if load_dotenv is not None:
        load_dotenv(_project_root() / ".env")

    return os.getenv("API_FOOTBALL_KEY") or os.getenv("APISPORTS_KEY") or None


class APIFootballClient:
    """Cliente mínimo da API-Football v3.

    O cliente é propositalmente conservador: poucas chamadas, pequena pausa entre
    requisições e erro claro quando a chave não existe. A camada de banco deve
    cachear/salvar snapshots para evitar consumo desnecessário do plano gratuito.
    """

    def __init__(self, config: APIFootballClientConfig | None = None):
        self.config = config or APIFootballClientConfig()
        self.api_key = self.config.api_key or load_api_football_key()
        if not self.api_key:
            raise APIFootballError(
                "API_FOOTBALL_KEY não encontrada. Crie analytics/.env com API_FOOTBALL_KEY=sua_chave."
            )

    def get(self, endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        endpoint_path = endpoint.strip("/")
        url = f"{self.config.base_url.rstrip('/')}/{endpoint_path}"
        headers = {"x-apisports-key": self.api_key}

        response = requests.get(url, headers=headers, params=params or {}, timeout=self.config.timeout)

        try:
            payload = response.json()
        except ValueError as exc:  # pragma: no cover
            raise APIFootballError(f"Resposta não JSON da API-Football: HTTP {response.status_code}") from exc

        if response.status_code >= 400:
            raise APIFootballError(f"Erro HTTP {response.status_code} em {endpoint_path}: {payload}")

        errors = payload.get("errors")
        if errors:
            raise APIFootballError(f"Erro API-Football em {endpoint_path}: {errors}")

        if self.config.pause_seconds > 0:
            time.sleep(self.config.pause_seconds)

        return payload

    def fixtures(self, **params: Any) -> list[dict[str, Any]]:
        payload = self.get("fixtures", {key: value for key, value in params.items() if value is not None})
        return list(payload.get("response") or [])


    def fixture_by_id(self, fixture_id: int | str) -> list[dict[str, Any]]:
        """Busca um fixture usando `id`, compatível com plano gratuito.

        O parâmetro `ids` pode ser bloqueado no plano gratuito da API-Football.
        Para manter o modo full funcionando sem plano pago, usamos `id` e
        repetimos a chamada quando houver mais de um fixture.
        """
        return self.fixtures(id=fixture_id)

    def fixtures_by_ids(self, fixture_ids: Sequence[int | str]) -> list[dict[str, Any]]:
        """Busca fixtures usando `ids`, disponível apenas em alguns planos.

        Use somente com `--use-ids-param`. No plano gratuito, a API pode
        retornar: "Free plans do not have access to the Ids parameter."
        """
        ids = [str(item).strip() for item in fixture_ids if str(item).strip()]
        if not ids:
            return []
        payload = self.get("fixtures", {"ids": "-".join(ids)})
        return list(payload.get("response") or [])

    def fixture_statistics(self, fixture_id: int | str) -> list[dict[str, Any]]:
        payload = self.get("fixtures/statistics", {"fixture": fixture_id})
        return list(payload.get("response") or [])

    def fixture_events(self, fixture_id: int | str) -> list[dict[str, Any]]:
        payload = self.get("fixtures/events", {"fixture": fixture_id})
        return list(payload.get("response") or [])

    def fixture_lineups(self, fixture_id: int | str) -> list[dict[str, Any]]:
        payload = self.get("fixtures/lineups", {"fixture": fixture_id})
        return list(payload.get("response") or [])

    def fixture_players(self, fixture_id: int | str) -> list[dict[str, Any]]:
        payload = self.get("fixtures/players", {"fixture": fixture_id})
        return list(payload.get("response") or [])

    def standings(self, league: int | str, season: int | str) -> list[dict[str, Any]]:
        payload = self.get("standings", {"league": league, "season": season})
        return list(payload.get("response") or [])



def normalize_full_fixture_row(row: dict[str, Any]) -> dict[str, Any]:
    """Converte a resposta enriquecida de `/fixtures?ids=` no bundle ADQL.

    A resposta enriquecida pode trazer `statistics`, `events`, `lineups` e
    `players` no mesmo objeto do fixture. O writer atual já trabalha com o
    formato de bundle abaixo, então esta função mantém compatibilidade com a
    versão anterior.
    """
    return {
        "fixture": {
            "fixture": row.get("fixture") or {},
            "league": row.get("league") or {},
            "teams": row.get("teams") or {},
            "goals": row.get("goals") or {},
            "score": row.get("score") or {},
        },
        "statistics": list(row.get("statistics") or []),
        "events": list(row.get("events") or []),
        "lineups": list(row.get("lineups") or []),
        "players": list(row.get("players") or []),
        "_full_fixture_response": True,
    }


def fetch_fixture_full_bundles(
    fixture_ids: Sequence[int | str],
    *,
    client: APIFootballClient | None = None,
    chunk_size: int = 20,
    use_ids_param: bool = False,
) -> list[dict[str, Any]]:
    """Busca fixtures em modo full e retorna bundles ADQL.

    Por padrão, usa `/fixtures?id=FIXTURE_ID`, que é o caminho compatível com
    plano gratuito. O parâmetro `/fixtures?ids=ID1-ID2` é mantido como opção
    para planos que liberam essa funcionalidade, mas não deve ser o padrão no
    ADQL.
    """
    api = client or APIFootballClient()
    ids = [str(item).strip() for item in fixture_ids if str(item).strip()]
    if not ids:
        return []

    bundles: list[dict[str, Any]] = []

    if use_ids_param:
        size = max(1, int(chunk_size or 1))
        for start in range(0, len(ids), size):
            chunk = ids[start : start + size]
            rows = api.fixtures_by_ids(chunk)
            bundles.extend(normalize_full_fixture_row(row) for row in rows)
        return bundles

    # Plano gratuito: uma chamada por fixture usando `id`.
    for fixture_id in ids:
        rows = api.fixture_by_id(fixture_id)
        bundles.extend(normalize_full_fixture_row(row) for row in rows)

    return bundles


def fetch_fixture_full_bundle(
    fixture_id: int | str,
    *,
    client: APIFootballClient | None = None,
    use_ids_param: bool = False,
) -> dict[str, Any]:
    """Busca um fixture em modo full. Usa `/fixtures?id=` por padrão."""
    bundles = fetch_fixture_full_bundles(
        [fixture_id],
        client=client,
        chunk_size=1,
        use_ids_param=use_ids_param,
    )
    if not bundles:
        raise APIFootballError(f"Fixture não encontrado no modo full bundle: {fixture_id}")
    return bundles[0]

def fetch_fixture_bundle(
    fixture_id: int | str,
    *,
    client: APIFootballClient | None = None,
    include: Iterable[str] = ("statistics", "events", "lineups", "players"),
) -> dict[str, Any]:
    """Busca uma partida e seus blocos auxiliares.

    Cada bloco extra custa uma chamada. Para o plano gratuito, use apenas o que
    for necessário para o card/análise do momento.
    """
    api = client or APIFootballClient()
    include_set = {item.strip().lower() for item in include if item}

    fixtures = api.fixtures(id=fixture_id)
    if not fixtures:
        raise APIFootballError(f"Fixture não encontrado: {fixture_id}")

    bundle: dict[str, Any] = {
        "fixture": fixtures[0],
        "statistics": [],
        "events": [],
        "lineups": [],
        "players": [],
    }

    if "statistics" in include_set:
        bundle["statistics"] = api.fixture_statistics(fixture_id)
    if "events" in include_set:
        bundle["events"] = api.fixture_events(fixture_id)
    if "lineups" in include_set:
        bundle["lineups"] = api.fixture_lineups(fixture_id)
    if "players" in include_set:
        bundle["players"] = api.fixture_players(fixture_id)

    return bundle


def fetch_fixture_bundles(
    *,
    league: int | str | None = None,
    season: int | str | None = None,
    team: int | str | None = None,
    date: str | None = None,
    from_date: str | None = None,
    to_date: str | None = None,
    last: int | None = None,
    next_: int | None = None,
    max_fixtures: int = 3,
    include: Iterable[str] = ("statistics",),
    client: APIFootballClient | None = None,
) -> list[dict[str, Any]]:
    """Busca fixtures por filtro e hidrata até `max_fixtures`.

    Use max_fixtures baixo no plano gratuito. Uma partida com statistics/events/
    lineups/players pode consumir até 5 chamadas.
    """
    api = client or APIFootballClient()
    fixture_rows = api.fixtures(
        league=league,
        season=season,
        team=team,
        date=date,
        **{"from": from_date, "to": to_date, "last": last, "next": next_},
    )

    bundles: list[dict[str, Any]] = []
    for row in fixture_rows[: max(1, int(max_fixtures))]:
        fixture_id = (((row or {}).get("fixture") or {}).get("id"))
        if fixture_id is None:
            continue
        bundles.append(fetch_fixture_bundle(fixture_id, client=api, include=include))

    return bundles


def sample_api_football_fixture_bundle() -> dict[str, Any]:
    """Fixture fictício para validar banco/export C-06 sem consumir requisições."""
    return {
        "fixture": {
            "fixture": {
                "id": 990001,
                "date": "2026-07-16T19:00:00+00:00",
                "status": {"long": "Match Finished", "short": "FT", "elapsed": 90},
                "venue": {"name": "ADQL Stadium", "city": "Local"},
            },
            "league": {
                "id": 39,
                "name": "Premier League",
                "country": "England",
                "season": 2025,
                "round": "Regular Season - 1",
            },
            "teams": {
                "home": {"id": 42, "name": "Arsenal", "winner": True},
                "away": {"id": 40, "name": "Liverpool", "winner": False},
            },
            "goals": {"home": 2, "away": 1},
            "score": {"fulltime": {"home": 2, "away": 1}},
        },
        "statistics": [
            {
                "team": {"id": 42, "name": "Arsenal"},
                "statistics": [
                    {"type": "Shots on Goal", "value": 6},
                    {"type": "Total Shots", "value": 15},
                    {"type": "Ball Possession", "value": "56%"},
                    {"type": "Total passes", "value": 522},
                    {"type": "Passes accurate", "value": 451},
                    {"type": "expected_goals", "value": "1.85"},
                    {"type": "Corner Kicks", "value": 7},
                ],
            },
            {
                "team": {"id": 40, "name": "Liverpool"},
                "statistics": [
                    {"type": "Shots on Goal", "value": 4},
                    {"type": "Total Shots", "value": 11},
                    {"type": "Ball Possession", "value": "44%"},
                    {"type": "Total passes", "value": 418},
                    {"type": "Passes accurate", "value": 351},
                    {"type": "expected_goals", "value": "1.12"},
                    {"type": "Corner Kicks", "value": 4},
                ],
            },
        ],
        "events": [
            {
                "time": {"elapsed": 18, "extra": None},
                "team": {"id": 42, "name": "Arsenal"},
                "player": {"id": 1460, "name": "Bukayo Saka"},
                "assist": {"id": 2165, "name": "Martin Odegaard"},
                "type": "Goal",
                "detail": "Normal Goal",
                "comments": None,
            },
            {
                "time": {"elapsed": 63, "extra": None},
                "team": {"id": 40, "name": "Liverpool"},
                "player": {"id": 306, "name": "Mohamed Salah"},
                "assist": {"id": 290, "name": "Trent Alexander-Arnold"},
                "type": "Goal",
                "detail": "Normal Goal",
                "comments": None,
            },
            {
                "time": {"elapsed": 78, "extra": None},
                "team": {"id": 42, "name": "Arsenal"},
                "player": {"id": 20367, "name": "Gabriel Martinelli"},
                "assist": {"id": 1460, "name": "Bukayo Saka"},
                "type": "Goal",
                "detail": "Normal Goal",
                "comments": None,
            },
        ],
        "lineups": [
            {
                "team": {"id": 42, "name": "Arsenal"},
                "formation": "4-3-3",
                "coach": {"name": "Mikel Arteta"},
            },
            {
                "team": {"id": 40, "name": "Liverpool"},
                "formation": "4-2-3-1",
                "coach": {"name": "Arne Slot"},
            },
        ],
        "players": [
            {
                "team": {"id": 42, "name": "Arsenal"},
                "players": [
                    {
                        "player": {"id": 1460, "name": "Bukayo Saka"},
                        "statistics": [
                            {
                                "games": {"minutes": 90, "position": "F", "rating": "8.1"},
                                "shots": {"total": 4, "on": 2},
                                "goals": {"total": 1, "assists": 1},
                                "passes": {"key": 3, "total": 42},
                                "tackles": {"total": 2, "interceptions": 1},
                            }
                        ],
                    }
                ],
            },
            {
                "team": {"id": 40, "name": "Liverpool"},
                "players": [
                    {
                        "player": {"id": 306, "name": "Mohamed Salah"},
                        "statistics": [
                            {
                                "games": {"minutes": 90, "position": "F", "rating": "7.5"},
                                "shots": {"total": 3, "on": 2},
                                "goals": {"total": 1, "assists": 0},
                                "passes": {"key": 2, "total": 35},
                                "tackles": {"total": 1, "interceptions": 0},
                            }
                        ],
                    }
                ],
            },
        ],
    }
