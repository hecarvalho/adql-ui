from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import requests


@dataclass
class FootballDataOrgSource:
    token: str | None
    base_url: str = "https://api.football-data.org/v4"
    timeout: int = 30

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.token:
            headers["X-Auth-Token"] = self.token
        return headers

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        response = requests.get(url, headers=self._headers(), params=params, timeout=self.timeout)
        response.raise_for_status()
        return response.json()

    def competitions(self) -> dict[str, Any]:
        return self._get("/competitions")

    def matches_today(self) -> dict[str, Any]:
        return self._get("/matches")

    def competition_matches(self, competition_code: str, season: int | None = None) -> dict[str, Any]:
        params = {"season": season} if season else None
        return self._get(f"/competitions/{competition_code}/matches", params=params)

    def standings(self, competition_code: str, season: int | None = None) -> dict[str, Any]:
        params = {"season": season} if season else None
        return self._get(f"/competitions/{competition_code}/standings", params=params)

    def scorers(self, competition_code: str, season: int | None = None) -> dict[str, Any]:
        params = {"season": season} if season else None
        return self._get(f"/competitions/{competition_code}/scorers", params=params)
