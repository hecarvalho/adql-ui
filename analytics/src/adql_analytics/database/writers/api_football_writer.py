from __future__ import annotations

from typing import Any, Iterable

from adql_analytics.database.repository import AnalyticsRepository, as_json, make_id
from adql_analytics.sources.api_football import API_FOOTBALL_SOURCE_ID

from .common import WriterSummary, clean_text, coerce_float, coerce_int


def _api_football_source(repo: AnalyticsRepository) -> None:
    repo.upsert_source(
        source_id=API_FOOTBALL_SOURCE_ID,
        name="API-Football",
        source_type="api",
        url="https://www.api-football.com/",
        notes="Fixtures, resultados, eventos básicos, estatísticas de partida, lineups e dados de jogadores.",
    )


def _value_as_float(value: Any) -> float | None:
    if isinstance(value, str):
        value = value.replace("%", "").strip()
    return coerce_float(value)


def _stat_lookup(statistics: list[dict[str, Any]] | None) -> dict[str, float | None]:
    output: dict[str, float | None] = {}
    for item in statistics or []:
        stat_type = clean_text(item.get("type")).lower()
        if not stat_type:
            continue
        output[stat_type] = _value_as_float(item.get("value"))
    return output


def _stat_value(stats: dict[str, float | None], *names: str) -> float | None:
    for name in names:
        key = name.lower()
        if key in stats and stats[key] is not None:
            return stats[key]
    return None


def _fixture_id(bundle: dict[str, Any]) -> str | None:
    fixture = bundle.get("fixture") or {}
    fixture_info = fixture.get("fixture") or {}
    raw_id = fixture_info.get("id")
    return str(raw_id) if raw_id is not None else None


def _upsert_match(
    repo: AnalyticsRepository,
    *,
    source_id: str,
    fixture_id: str,
    fixture_payload: dict[str, Any],
    competition_id: str | None,
    season_id: str | None,
    home_team_id: str,
    away_team_id: str,
) -> str:
    fixture_info = fixture_payload.get("fixture") or {}
    goals = fixture_payload.get("goals") or {}
    status = fixture_info.get("status") or {}
    venue = fixture_info.get("venue") or {}

    match_id = make_id("match", source_id, fixture_id)
    repo.execute(
        """
        INSERT INTO matches(
          match_id, source_id, source_match_id, competition_id, season_id, match_date,
          home_team_id, away_team_id, home_score, away_score, status, venue, neutral, raw_json
        ) VALUES (
          :match_id, :source_id, :source_match_id, :competition_id, :season_id, :match_date,
          :home_team_id, :away_team_id, :home_score, :away_score, :status, :venue, :neutral, :raw_json
        )
        ON CONFLICT(source_id, source_match_id) DO UPDATE SET
          competition_id = excluded.competition_id,
          season_id = excluded.season_id,
          match_date = excluded.match_date,
          home_team_id = excluded.home_team_id,
          away_team_id = excluded.away_team_id,
          home_score = excluded.home_score,
          away_score = excluded.away_score,
          status = excluded.status,
          venue = excluded.venue,
          raw_json = excluded.raw_json,
          updated_at = CURRENT_TIMESTAMP
        """,
        {
            "match_id": match_id,
            "source_id": source_id,
            "source_match_id": fixture_id,
            "competition_id": competition_id,
            "season_id": season_id,
            "match_date": fixture_info.get("date"),
            "home_team_id": home_team_id,
            "away_team_id": away_team_id,
            "home_score": coerce_int(goals.get("home")),
            "away_score": coerce_int(goals.get("away")),
            "status": clean_text(status.get("short") or status.get("long")),
            "venue": clean_text((venue or {}).get("name")),
            "neutral": 0,
            "raw_json": as_json(fixture_payload),
        },
    )
    return match_id


def _team_ids_from_fixture(
    repo: AnalyticsRepository,
    *,
    source_id: str,
    fixture_payload: dict[str, Any],
    summary: WriterSummary,
) -> tuple[str, str]:
    teams = fixture_payload.get("teams") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}

    home_name = clean_text(home.get("name"), default="Mandante")
    away_name = clean_text(away.get("name"), default="Visitante")

    home_team_id = repo.upsert_team(
        name=home_name,
        source_id=source_id,
        source_team_id=str(home.get("id") or home_name),
    )
    away_team_id = repo.upsert_team(
        name=away_name,
        source_id=source_id,
        source_team_id=str(away.get("id") or away_name),
    )
    summary.teams_written.update({home_team_id, away_team_id})
    return home_team_id, away_team_id


def _competition_and_season(
    repo: AnalyticsRepository,
    *,
    source_id: str,
    fixture_payload: dict[str, Any],
    summary: WriterSummary,
) -> tuple[str | None, str | None]:
    league = fixture_payload.get("league") or {}
    league_id = league.get("id")
    league_name = clean_text(league.get("name"), default="API-Football")
    season_value = league.get("season")

    competition_id = repo.upsert_competition(
        name=league_name,
        source_id=source_id,
        source_competition_id=str(league_id or league_name),
        country=clean_text(league.get("country"), default=None),
    )
    summary.competitions_written.add(competition_id)

    season_id = None
    if season_value is not None:
        start_year = coerce_int(season_value)
        season_id = repo.upsert_season(
            label=str(season_value),
            source_id=source_id,
            source_season_id=str(season_value),
            start_year=start_year,
            end_year=start_year + 1 if start_year else None,
        )
        summary.seasons_written.add(season_id)

    return competition_id, season_id


def _write_match_result_and_team_stats(
    repo: AnalyticsRepository,
    *,
    source_id: str,
    fixture_id: str,
    fixture_payload: dict[str, Any],
    statistics: list[dict[str, Any]],
    match_id: str,
    competition_id: str | None,
    season_id: str | None,
    home_team_id: str,
    away_team_id: str,
    summary: WriterSummary,
) -> None:
    fixture_info = fixture_payload.get("fixture") or {}
    goals = fixture_payload.get("goals") or {}

    stats_by_api_team_id: dict[str, dict[str, Any]] = {}
    stats_by_team_name: dict[str, dict[str, Any]] = {}
    for entry in statistics or []:
        team = entry.get("team") or {}
        key_id = str(team.get("id")) if team.get("id") is not None else ""
        key_name = clean_text(team.get("name")).lower()
        if key_id:
            stats_by_api_team_id[key_id] = entry
        if key_name:
            stats_by_team_name[key_name] = entry

    teams = fixture_payload.get("teams") or {}
    home = teams.get("home") or {}
    away = teams.get("away") or {}
    home_stats_raw = stats_by_api_team_id.get(str(home.get("id"))) or stats_by_team_name.get(clean_text(home.get("name")).lower()) or {}
    away_stats_raw = stats_by_api_team_id.get(str(away.get("id"))) or stats_by_team_name.get(clean_text(away.get("name")).lower()) or {}
    home_stats = _stat_lookup(home_stats_raw.get("statistics"))
    away_stats = _stat_lookup(away_stats_raw.get("statistics"))

    repo.insert_match_result(
        source_id=source_id,
        match_id=match_id,
        match_date=fixture_info.get("date"),
        competition_id=competition_id,
        season_id=season_id,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        home_goals=coerce_int(goals.get("home")),
        away_goals=coerce_int(goals.get("away")),
        home_shots=_stat_value(home_stats, "Total Shots"),
        away_shots=_stat_value(away_stats, "Total Shots"),
        home_shots_on_target=_stat_value(home_stats, "Shots on Goal"),
        away_shots_on_target=_stat_value(away_stats, "Shots on Goal"),
        raw={"fixture": fixture_payload, "statistics": statistics},
    )
    summary.matches_written += 1

    pairs = [
        (home_team_id, coerce_float(goals.get("home")), coerce_float(goals.get("away")), home_stats, away_stats, home_stats_raw),
        (away_team_id, coerce_float(goals.get("away")), coerce_float(goals.get("home")), away_stats, home_stats, away_stats_raw),
    ]
    for team_id, gf, ga, team_stats, opp_stats, raw_stats in pairs:
        repo.upsert_team_stat(
            source_id=source_id,
            team_id=team_id,
            competition_id=competition_id,
            season_id=season_id,
            stat_scope=f"match:{fixture_id}",
            matches_played=1,
            minutes=90,
            goals_for=gf,
            goals_against=ga,
            xg_for=_stat_value(team_stats, "expected_goals", "Expected Goals", "xG"),
            xg_against=_stat_value(opp_stats, "expected_goals", "Expected Goals", "xG"),
            shots_for=_stat_value(team_stats, "Total Shots"),
            shots_against=_stat_value(opp_stats, "Total Shots"),
            raw=raw_stats,
        )
        summary.stats_written += 1


def _write_events(
    repo: AnalyticsRepository,
    *,
    source_id: str,
    fixture_id: str,
    fixture_payload: dict[str, Any],
    events: list[dict[str, Any]],
    match_id: str,
    home_team_id: str,
    summary: WriterSummary,
) -> None:
    if not events:
        return

    teams = fixture_payload.get("teams") or {}
    home_name = clean_text((teams.get("home") or {}).get("name"), default="Mandante")
    away_name = clean_text((teams.get("away") or {}).get("name"), default="Visitante")
    title = f"Eventos básicos: {home_name} x {away_name}"
    start_minute = min([coerce_int((item.get("time") or {}).get("elapsed"), 0) or 0 for item in events])
    end_minute = max([coerce_int((item.get("time") or {}).get("elapsed"), 0) or 0 for item in events])

    repo.insert_event_sequence(
        source_id=source_id,
        source_match_id=fixture_id,
        match_id=match_id,
        team_id=home_team_id,
        sequence_type="api_football_event_log",
        title=title,
        description="Eventos básicos sem coordenadas, obtidos via API-Football.",
        start_minute=start_minute,
        end_minute=end_minute,
        events=events,
    )


def _write_players(
    repo: AnalyticsRepository,
    *,
    source_id: str,
    fixture_id: str,
    competition_id: str | None,
    season_id: str | None,
    players_payload: list[dict[str, Any]],
    summary: WriterSummary,
) -> None:
    for team_block in players_payload or []:
        team = team_block.get("team") or {}
        team_name = clean_text(team.get("name"), default="Equipe")
        team_id = repo.upsert_team(
            name=team_name,
            source_id=source_id,
            source_team_id=str(team.get("id") or team_name),
        )
        summary.teams_written.add(team_id)

        for player_block in team_block.get("players") or []:
            player = player_block.get("player") or {}
            player_name = clean_text(player.get("name"))
            if not player_name:
                summary.skipped_rows += 1
                continue

            player_id = repo.upsert_player(
                name=player_name,
                team_id=team_id,
                source_id=source_id,
                source_player_id=str(player.get("id") or player_name),
            )
            summary.players_written.add(player_id)

            statistics = player_block.get("statistics") or []
            stat = statistics[0] if statistics else {}
            games = stat.get("games") or {}
            shots = stat.get("shots") or {}
            goals = stat.get("goals") or {}
            passes = stat.get("passes") or {}
            tackles = stat.get("tackles") or {}

            defensive_actions = (coerce_float(tackles.get("total"), 0) or 0) + (
                coerce_float(tackles.get("interceptions"), 0) or 0
            )

            repo.upsert_player_stat(
                source_id=source_id,
                player_id=player_id,
                team_id=team_id,
                competition_id=competition_id,
                season_id=season_id,
                stat_scope=f"match:{fixture_id}",
                minutes=coerce_float(games.get("minutes")),
                appearances=1,
                starts=None,
                goals=coerce_float(goals.get("total")),
                assists=coerce_float(goals.get("assists")),
                shots=coerce_float(shots.get("total")),
                key_passes=coerce_float(passes.get("key")),
                defensive_actions=defensive_actions,
                raw=player_block,
            )
            summary.stats_written += 1


def write_api_football_fixture_bundles_to_database(
    bundles: dict[str, Any] | Iterable[dict[str, Any]],
    *,
    db_path: str | None = None,
    repo: AnalyticsRepository | None = None,
    source_id: str = API_FOOTBALL_SOURCE_ID,
) -> dict[str, Any]:
    """Grava fixtures/estatísticas/eventos/jogadores API-Football no SQLite."""
    owns_repo = repo is None
    repo = repo or AnalyticsRepository(db_path)
    bundle_list = [bundles] if isinstance(bundles, dict) else list(bundles)
    summary = WriterSummary(source_id=source_id, rows_seen=len(bundle_list))

    try:
        _api_football_source(repo)

        for bundle in bundle_list:
            fixture_id = _fixture_id(bundle)
            fixture_payload = bundle.get("fixture") or {}
            if not fixture_id or not fixture_payload:
                summary.skipped_rows += 1
                continue

            competition_id, season_id = _competition_and_season(
                repo,
                source_id=source_id,
                fixture_payload=fixture_payload,
                summary=summary,
            )
            home_team_id, away_team_id = _team_ids_from_fixture(
                repo,
                source_id=source_id,
                fixture_payload=fixture_payload,
                summary=summary,
            )
            match_id = _upsert_match(
                repo,
                source_id=source_id,
                fixture_id=fixture_id,
                fixture_payload=fixture_payload,
                competition_id=competition_id,
                season_id=season_id,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
            )

            _write_match_result_and_team_stats(
                repo,
                source_id=source_id,
                fixture_id=fixture_id,
                fixture_payload=fixture_payload,
                statistics=bundle.get("statistics") or [],
                match_id=match_id,
                competition_id=competition_id,
                season_id=season_id,
                home_team_id=home_team_id,
                away_team_id=away_team_id,
                summary=summary,
            )
            _write_events(
                repo,
                source_id=source_id,
                fixture_id=fixture_id,
                fixture_payload=fixture_payload,
                events=bundle.get("events") or [],
                match_id=match_id,
                home_team_id=home_team_id,
                summary=summary,
            )
            _write_players(
                repo,
                source_id=source_id,
                fixture_id=fixture_id,
                competition_id=competition_id,
                season_id=season_id,
                players_payload=bundle.get("players") or [],
                summary=summary,
            )

            summary.rows_written += 1

        if owns_repo:
            repo.commit()
        return summary.as_dict()
    finally:
        if owns_repo:
            repo.close()
