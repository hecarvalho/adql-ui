from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import unicodedata
from pathlib import Path
from typing import Any, Iterable

try:
    import pandas as pd
except ImportError:  # pragma: no cover
    pd = None

from .connection import get_connection


def normalize_name(value: str | None) -> str:
    """Normaliza nomes para busca e geração de IDs internos."""
    raw_value = str(value or "").strip()
    normalized = unicodedata.normalize("NFKD", raw_value)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = re.sub(r"[^a-zA-Z0-9]+", " ", normalized).strip().lower()
    return re.sub(r"\s+", " ", normalized)


def slugify(value: str | None) -> str:
    normalized = normalize_name(value)
    return re.sub(r"[^a-z0-9]+", "-", normalized).strip("-") or "item"


def make_id(prefix: str, *parts: Any) -> str:
    clean_parts = [str(part) for part in parts if part is not None and str(part) != ""]
    base = "|".join(clean_parts) if clean_parts else prefix
    digest = hashlib.sha1(base.encode("utf-8")).hexdigest()[:10]
    readable = slugify(clean_parts[0] if clean_parts else prefix)[:42]
    return f"{prefix}-{readable}-{digest}"


def as_json(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, default=str)


class AnalyticsRepository:
    """Camada simples de leitura/escrita do banco ADQL Analytics."""

    def __init__(self, db_path: str | Path | None = None):
        self.db_path = db_path
        self.connection = get_connection(db_path)

    def close(self) -> None:
        self.connection.close()

    def __enter__(self) -> "AnalyticsRepository":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        if exc_type is None:
            self.connection.commit()
        else:
            self.connection.rollback()
        self.close()

    def execute(self, sql: str, params: dict[str, Any] | tuple[Any, ...] | None = None) -> sqlite3.Cursor:
        return self.connection.execute(sql, params or {})

    def executemany(self, sql: str, rows: Iterable[dict[str, Any]]) -> sqlite3.Cursor:
        return self.connection.executemany(sql, list(rows))

    def commit(self) -> None:
        self.connection.commit()

    def query_rows(self, sql: str, params: dict[str, Any] | None = None) -> list[sqlite3.Row]:
        return list(self.connection.execute(sql, params or {}))

    def query_dicts(self, sql: str, params: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        return [dict(row) for row in self.query_rows(sql, params)]

    def query_dataframe(self, sql: str, params: dict[str, Any] | None = None):
        if pd is None:  # pragma: no cover
            raise ImportError("pandas é necessário para query_dataframe.")
        return pd.read_sql_query(sql, self.connection, params=params or {})

    def upsert_source(
        self,
        source_id: str,
        name: str,
        source_type: str | None = None,
        url: str | None = None,
        notes: str | None = None,
    ) -> str:
        self.execute(
            """
            INSERT INTO sources(source_id, name, source_type, url, notes)
            VALUES (:source_id, :name, :source_type, :url, :notes)
            ON CONFLICT(source_id) DO UPDATE SET
              name = excluded.name,
              source_type = COALESCE(excluded.source_type, sources.source_type),
              url = COALESCE(excluded.url, sources.url),
              notes = COALESCE(excluded.notes, sources.notes),
              updated_at = CURRENT_TIMESTAMP
            """,
            {
                "source_id": source_id,
                "name": name,
                "source_type": source_type,
                "url": url,
                "notes": notes,
            },
        )
        return source_id

    def upsert_competition(
        self,
        name: str,
        source_id: str | None = None,
        source_competition_id: str | None = None,
        competition_id: str | None = None,
        country: str | None = None,
        gender: str | None = None,
    ) -> str:
        final_id = competition_id or make_id("comp", source_id or "manual", source_competition_id or name)
        self.execute(
            """
            INSERT INTO competitions(competition_id, name, normalized_name, country, gender, source_id, source_competition_id)
            VALUES (:competition_id, :name, :normalized_name, :country, :gender, :source_id, :source_competition_id)
            ON CONFLICT(competition_id) DO UPDATE SET
              name = excluded.name,
              normalized_name = excluded.normalized_name,
              country = COALESCE(excluded.country, competitions.country),
              gender = COALESCE(excluded.gender, competitions.gender),
              updated_at = CURRENT_TIMESTAMP
            """,
            {
                "competition_id": final_id,
                "name": name,
                "normalized_name": normalize_name(name),
                "country": country,
                "gender": gender,
                "source_id": source_id,
                "source_competition_id": source_competition_id,
            },
        )
        return final_id

    def upsert_season(
        self,
        label: str,
        source_id: str | None = None,
        source_season_id: str | None = None,
        season_id: str | None = None,
        start_year: int | None = None,
        end_year: int | None = None,
    ) -> str:
        final_id = season_id or make_id("season", source_id or "manual", source_season_id or label)
        self.execute(
            """
            INSERT INTO seasons(season_id, label, start_year, end_year, source_id, source_season_id)
            VALUES (:season_id, :label, :start_year, :end_year, :source_id, :source_season_id)
            ON CONFLICT(season_id) DO UPDATE SET
              label = excluded.label,
              start_year = COALESCE(excluded.start_year, seasons.start_year),
              end_year = COALESCE(excluded.end_year, seasons.end_year),
              updated_at = CURRENT_TIMESTAMP
            """,
            {
                "season_id": final_id,
                "label": label,
                "start_year": start_year,
                "end_year": end_year,
                "source_id": source_id,
                "source_season_id": source_season_id,
            },
        )
        return final_id

    def upsert_team(
        self,
        name: str,
        source_id: str | None = None,
        source_team_id: str | None = None,
        team_id: str | None = None,
        country: str | None = None,
    ) -> str:
        final_id = team_id or make_id("team", source_id or "manual", source_team_id or name)
        self.execute(
            """
            INSERT INTO teams(team_id, name, normalized_name, country, source_id, source_team_id)
            VALUES (:team_id, :name, :normalized_name, :country, :source_id, :source_team_id)
            ON CONFLICT(team_id) DO UPDATE SET
              name = excluded.name,
              normalized_name = excluded.normalized_name,
              country = COALESCE(excluded.country, teams.country),
              updated_at = CURRENT_TIMESTAMP
            """,
            {
                "team_id": final_id,
                "name": name,
                "normalized_name": normalize_name(name),
                "country": country,
                "source_id": source_id,
                "source_team_id": source_team_id,
            },
        )
        return final_id

    def upsert_player(
        self,
        name: str,
        team_id: str | None = None,
        source_id: str | None = None,
        source_player_id: str | None = None,
        player_id: str | None = None,
        country: str | None = None,
        position: str | None = None,
        birth_date: str | None = None,
    ) -> str:
        final_id = player_id or make_id("player", source_id or "manual", source_player_id or name, team_id or "")
        self.execute(
            """
            INSERT INTO players(player_id, name, normalized_name, team_id, country, position, birth_date, source_id, source_player_id)
            VALUES (:player_id, :name, :normalized_name, :team_id, :country, :position, :birth_date, :source_id, :source_player_id)
            ON CONFLICT(player_id) DO UPDATE SET
              name = excluded.name,
              normalized_name = excluded.normalized_name,
              team_id = COALESCE(excluded.team_id, players.team_id),
              country = COALESCE(excluded.country, players.country),
              position = COALESCE(excluded.position, players.position),
              birth_date = COALESCE(excluded.birth_date, players.birth_date),
              updated_at = CURRENT_TIMESTAMP
            """,
            {
                "player_id": final_id,
                "name": name,
                "normalized_name": normalize_name(name),
                "team_id": team_id,
                "country": country,
                "position": position,
                "birth_date": birth_date,
                "source_id": source_id,
                "source_player_id": source_player_id,
            },
        )
        return final_id

    def upsert_player_stat(self, **kwargs: Any) -> str:
        source_id = kwargs["source_id"]
        player_id = kwargs["player_id"]
        stat_scope = kwargs.get("stat_scope") or "season"
        stat_id = kwargs.get("stat_id") or make_id(
            "pstat",
            source_id,
            player_id,
            kwargs.get("team_id") or "",
            kwargs.get("competition_id") or "",
            kwargs.get("season_id") or "",
            stat_scope,
        )
        payload = {
            "stat_id": stat_id,
            "source_id": source_id,
            "player_id": player_id,
            "team_id": kwargs.get("team_id"),
            "competition_id": kwargs.get("competition_id"),
            "season_id": kwargs.get("season_id"),
            "stat_scope": stat_scope,
            "minutes": kwargs.get("minutes"),
            "appearances": kwargs.get("appearances"),
            "starts": kwargs.get("starts"),
            "goals": kwargs.get("goals"),
            "assists": kwargs.get("assists"),
            "xg": kwargs.get("xg"),
            "xa": kwargs.get("xa"),
            "npxg": kwargs.get("npxg"),
            "xag": kwargs.get("xag"),
            "shots": kwargs.get("shots"),
            "key_passes": kwargs.get("key_passes"),
            "progressive_actions": kwargs.get("progressive_actions"),
            "defensive_actions": kwargs.get("defensive_actions"),
            "raw_json": as_json(kwargs.get("raw")),
        }
        self.execute(
            """
            INSERT INTO player_stats(
              stat_id, source_id, player_id, team_id, competition_id, season_id, stat_scope,
              minutes, appearances, starts, goals, assists, xg, xa, npxg, xag,
              shots, key_passes, progressive_actions, defensive_actions, raw_json
            ) VALUES (
              :stat_id, :source_id, :player_id, :team_id, :competition_id, :season_id, :stat_scope,
              :minutes, :appearances, :starts, :goals, :assists, :xg, :xa, :npxg, :xag,
              :shots, :key_passes, :progressive_actions, :defensive_actions, :raw_json
            )
            ON CONFLICT(source_id, player_id, team_id, competition_id, season_id, stat_scope) DO UPDATE SET
              minutes = excluded.minutes,
              appearances = excluded.appearances,
              starts = excluded.starts,
              goals = excluded.goals,
              assists = excluded.assists,
              xg = excluded.xg,
              xa = excluded.xa,
              npxg = excluded.npxg,
              xag = excluded.xag,
              shots = excluded.shots,
              key_passes = excluded.key_passes,
              progressive_actions = excluded.progressive_actions,
              defensive_actions = excluded.defensive_actions,
              raw_json = excluded.raw_json,
              updated_at = CURRENT_TIMESTAMP
            """,
            payload,
        )
        return stat_id

    def upsert_team_stat(self, **kwargs: Any) -> str:
        source_id = kwargs["source_id"]
        team_id = kwargs["team_id"]
        stat_scope = kwargs.get("stat_scope") or "season"
        stat_id = kwargs.get("stat_id") or make_id(
            "tstat",
            source_id,
            team_id,
            kwargs.get("competition_id") or "",
            kwargs.get("season_id") or "",
            stat_scope,
        )
        payload = {
            "stat_id": stat_id,
            "source_id": source_id,
            "team_id": team_id,
            "competition_id": kwargs.get("competition_id"),
            "season_id": kwargs.get("season_id"),
            "stat_scope": stat_scope,
            "matches_played": kwargs.get("matches_played"),
            "minutes": kwargs.get("minutes"),
            "goals_for": kwargs.get("goals_for"),
            "goals_against": kwargs.get("goals_against"),
            "xg_for": kwargs.get("xg_for"),
            "xg_against": kwargs.get("xg_against"),
            "shots_for": kwargs.get("shots_for"),
            "shots_against": kwargs.get("shots_against"),
            "raw_json": as_json(kwargs.get("raw")),
        }
        self.execute(
            """
            INSERT INTO team_stats(
              stat_id, source_id, team_id, competition_id, season_id, stat_scope,
              matches_played, minutes, goals_for, goals_against, xg_for, xg_against,
              shots_for, shots_against, raw_json
            ) VALUES (
              :stat_id, :source_id, :team_id, :competition_id, :season_id, :stat_scope,
              :matches_played, :minutes, :goals_for, :goals_against, :xg_for, :xg_against,
              :shots_for, :shots_against, :raw_json
            )
            ON CONFLICT(source_id, team_id, competition_id, season_id, stat_scope) DO UPDATE SET
              matches_played = excluded.matches_played,
              minutes = excluded.minutes,
              goals_for = excluded.goals_for,
              goals_against = excluded.goals_against,
              xg_for = excluded.xg_for,
              xg_against = excluded.xg_against,
              shots_for = excluded.shots_for,
              shots_against = excluded.shots_against,
              raw_json = excluded.raw_json,
              updated_at = CURRENT_TIMESTAMP
            """,
            payload,
        )
        return stat_id

    def insert_match_result(self, **kwargs: Any) -> str:
        source_id = kwargs["source_id"]
        result_id = kwargs.get("match_result_id") or make_id(
            "mres",
            source_id,
            kwargs.get("match_date") or "",
            kwargs.get("home_team_id") or "",
            kwargs.get("away_team_id") or "",
        )
        payload = {
            "match_result_id": result_id,
            "source_id": source_id,
            "match_id": kwargs.get("match_id"),
            "match_date": kwargs.get("match_date"),
            "competition_id": kwargs.get("competition_id"),
            "season_id": kwargs.get("season_id"),
            "home_team_id": kwargs.get("home_team_id"),
            "away_team_id": kwargs.get("away_team_id"),
            "home_goals": kwargs.get("home_goals"),
            "away_goals": kwargs.get("away_goals"),
            "home_shots": kwargs.get("home_shots"),
            "away_shots": kwargs.get("away_shots"),
            "home_shots_on_target": kwargs.get("home_shots_on_target"),
            "away_shots_on_target": kwargs.get("away_shots_on_target"),
            "home_odds": kwargs.get("home_odds"),
            "draw_odds": kwargs.get("draw_odds"),
            "away_odds": kwargs.get("away_odds"),
            "raw_json": as_json(kwargs.get("raw")),
        }
        self.execute(
            """
            INSERT OR REPLACE INTO match_results(
              match_result_id, source_id, match_id, match_date, competition_id, season_id,
              home_team_id, away_team_id, home_goals, away_goals,
              home_shots, away_shots, home_shots_on_target, away_shots_on_target,
              home_odds, draw_odds, away_odds, raw_json, updated_at
            ) VALUES (
              :match_result_id, :source_id, :match_id, :match_date, :competition_id, :season_id,
              :home_team_id, :away_team_id, :home_goals, :away_goals,
              :home_shots, :away_shots, :home_shots_on_target, :away_shots_on_target,
              :home_odds, :draw_odds, :away_odds, :raw_json, CURRENT_TIMESTAMP
            )
            """,
            payload,
        )
        return result_id

    def upsert_clubelo_rating(self, **kwargs: Any) -> str:
        source_id = kwargs.get("source_id") or "clubelo"
        team_id = kwargs["team_id"]
        rating_date = kwargs["rating_date"]
        rating_id = kwargs.get("rating_id") or make_id("elo", source_id, team_id, rating_date)
        payload = {
            "rating_id": rating_id,
            "source_id": source_id,
            "team_id": team_id,
            "rating_date": rating_date,
            "elo": kwargs.get("elo"),
            "rank": kwargs.get("rank"),
            "country": kwargs.get("country"),
            "level": kwargs.get("level"),
            "from_score": kwargs.get("from_score"),
            "to_score": kwargs.get("to_score"),
            "raw_json": as_json(kwargs.get("raw")),
        }
        self.execute(
            """
            INSERT INTO clubelo_ratings(
              rating_id, source_id, team_id, rating_date, elo, rank, country, level,
              from_score, to_score, raw_json
            ) VALUES (
              :rating_id, :source_id, :team_id, :rating_date, :elo, :rank, :country, :level,
              :from_score, :to_score, :raw_json
            )
            ON CONFLICT(source_id, team_id, rating_date) DO UPDATE SET
              elo = excluded.elo,
              rank = excluded.rank,
              country = COALESCE(excluded.country, clubelo_ratings.country),
              level = COALESCE(excluded.level, clubelo_ratings.level),
              from_score = excluded.from_score,
              to_score = excluded.to_score,
              raw_json = excluded.raw_json,
              updated_at = CURRENT_TIMESTAMP
            """,
            payload,
        )
        return rating_id

    def insert_event_sequence(self, **kwargs: Any) -> str:
        source_id = kwargs["source_id"]
        sequence_id = kwargs.get("sequence_id") or make_id(
            "seq",
            source_id,
            kwargs.get("source_match_id") or kwargs.get("match_id") or "",
            kwargs.get("team_id") or "",
            kwargs.get("possession") or "",
            kwargs.get("title") or "",
        )
        payload = {
            "sequence_id": sequence_id,
            "source_id": source_id,
            "source_match_id": kwargs.get("source_match_id"),
            "match_id": kwargs.get("match_id"),
            "team_id": kwargs.get("team_id"),
            "sequence_type": kwargs.get("sequence_type"),
            "possession": kwargs.get("possession"),
            "title": kwargs.get("title"),
            "description": kwargs.get("description"),
            "start_minute": kwargs.get("start_minute"),
            "end_minute": kwargs.get("end_minute"),
            "events_json": as_json(kwargs.get("events")),
            "adql_json_path": kwargs.get("adql_json_path"),
        }
        self.execute(
            """
            INSERT OR REPLACE INTO event_sequences(
              sequence_id, source_id, source_match_id, match_id, team_id, sequence_type,
              possession, title, description, start_minute, end_minute, events_json,
              adql_json_path, updated_at
            ) VALUES (
              :sequence_id, :source_id, :source_match_id, :match_id, :team_id, :sequence_type,
              :possession, :title, :description, :start_minute, :end_minute, :events_json,
              :adql_json_path, CURRENT_TIMESTAMP
            )
            """,
            payload,
        )
        return sequence_id

    def insert_raw_snapshot(self, **kwargs: Any) -> str:
        snapshot_id = kwargs.get("snapshot_id") or make_id(
            "raw",
            kwargs.get("source_id"),
            kwargs.get("dataset_name"),
            kwargs.get("path"),
            kwargs.get("content_hash"),
        )
        self.execute(
            """
            INSERT OR REPLACE INTO raw_snapshots(snapshot_id, source_id, dataset_name, path, content_hash, row_count)
            VALUES (:snapshot_id, :source_id, :dataset_name, :path, :content_hash, :row_count)
            """,
            {
                "snapshot_id": snapshot_id,
                "source_id": kwargs.get("source_id"),
                "dataset_name": kwargs.get("dataset_name"),
                "path": kwargs.get("path"),
                "content_hash": kwargs.get("content_hash"),
                "row_count": kwargs.get("row_count"),
            },
        )
        return snapshot_id

    def insert_generated_export(self, **kwargs: Any) -> str:
        export_id = kwargs.get("export_id") or make_id(
            "export",
            kwargs.get("component"),
            kwargs.get("title"),
            kwargs.get("output_path"),
        )
        self.execute(
            """
            INSERT OR REPLACE INTO generated_exports(export_id, component, source_id, title, output_path, source_payload_json)
            VALUES (:export_id, :component, :source_id, :title, :output_path, :source_payload_json)
            """,
            {
                "export_id": export_id,
                "component": kwargs.get("component"),
                "source_id": kwargs.get("source_id"),
                "title": kwargs.get("title"),
                "output_path": str(kwargs.get("output_path")),
                "source_payload_json": as_json(kwargs.get("source_payload")),
            },
        )
        return export_id

    def table_counts(self) -> dict[str, int]:
        tables = [
            "sources",
            "competitions",
            "seasons",
            "teams",
            "players",
            "matches",
            "match_results",
            "player_stats",
            "team_stats",
            "shot_stats",
            "event_sequences",
            "clubelo_ratings",
            "raw_snapshots",
            "generated_exports",
        ]
        counts: dict[str, int] = {}
        for table in tables:
            counts[table] = int(self.execute(f"SELECT COUNT(*) AS total FROM {table}").fetchone()["total"])
        return counts

    def recent_exports(self, limit: int = 10) -> list[dict[str, Any]]:
        return self.query_dicts(
            """
            SELECT export_id, component, title, output_path, created_at
            FROM generated_exports
            ORDER BY created_at DESC
            LIMIT :limit
            """,
            {"limit": limit},
        )
