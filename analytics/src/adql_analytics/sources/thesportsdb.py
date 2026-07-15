from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


@dataclass
class TheSportsDBSource:
    api_key: str | None = None
    timeout: int = 30

    @property
    def base_url(self) -> str:
        key = self.api_key or "3"
        return f"https://www.thesportsdb.com/api/v1/json/{key}"

    def _get(self, endpoint: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.base_url}/{endpoint}"
        response = requests.get(url, params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def search_team(self, team_name: str) -> dict[str, Any]:
        return self._get("searchteams.php", {"t": team_name})

    def search_event(self, event_name: str) -> dict[str, Any]:
        return self._get("searchevents.php", {"e": event_name})

    def next_events_by_team_id(self, team_id: str) -> dict[str, Any]:
        return self._get("eventsnext.php", {"id": team_id})

    def last_events_by_team_id(self, team_id: str) -> dict[str, Any]:
        return self._get("eventslast.php", {"id": team_id})
