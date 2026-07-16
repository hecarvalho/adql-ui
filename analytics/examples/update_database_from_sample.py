from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.database import AnalyticsRepository, initialize_database


def main() -> None:
    db_path = initialize_database()

    with AnalyticsRepository(db_path) as repo:
        season_id = repo.upsert_season(
            label="2025-2026",
            source_id="fbref",
            source_season_id="2025-2026",
            start_year=2025,
            end_year=2026,
        )
        competition_id = repo.upsert_competition(
            name="Big 5 European Leagues Combined",
            source_id="fbref",
            source_competition_id="big5-2025-2026",
            country="Europe",
        )

        arsenal_id = repo.upsert_team("Arsenal", source_id="fbref", source_team_id="arsenal")
        liverpool_id = repo.upsert_team("Liverpool", source_id="fbref", source_team_id="liverpool")
        barcelona_id = repo.upsert_team("Barcelona", source_id="fbref", source_team_id="barcelona")

        saka_id = repo.upsert_player(
            "Bukayo Saka",
            team_id=arsenal_id,
            source_id="fbref",
            source_player_id="bukayo-saka",
            position="RW",
            country="England",
        )
        salah_id = repo.upsert_player(
            "Mohamed Salah",
            team_id=liverpool_id,
            source_id="fbref",
            source_player_id="mohamed-salah",
            position="RW",
            country="Egypt",
        )
        yamal_id = repo.upsert_player(
            "Lamine Yamal",
            team_id=barcelona_id,
            source_id="fbref",
            source_player_id="lamine-yamal",
            position="RW",
            country="Spain",
        )

        repo.upsert_player_stat(
            source_id="fbref",
            player_id=saka_id,
            team_id=arsenal_id,
            competition_id=competition_id,
            season_id=season_id,
            minutes=2550,
            appearances=33,
            starts=30,
            goals=16,
            assists=10,
            xg=13.4,
            xa=8.8,
            shots=91,
            progressive_actions=210,
            defensive_actions=63,
            raw={"sample": True},
        )
        repo.upsert_player_stat(
            source_id="fbref",
            player_id=salah_id,
            team_id=liverpool_id,
            competition_id=competition_id,
            season_id=season_id,
            minutes=2700,
            appearances=34,
            starts=32,
            goals=21,
            assists=12,
            xg=18.9,
            xa=9.1,
            shots=104,
            progressive_actions=185,
            defensive_actions=41,
            raw={"sample": True},
        )
        repo.upsert_player_stat(
            source_id="fbref",
            player_id=yamal_id,
            team_id=barcelona_id,
            competition_id=competition_id,
            season_id=season_id,
            minutes=2350,
            appearances=32,
            starts=28,
            goals=9,
            assists=14,
            xg=7.7,
            xa=11.5,
            shots=72,
            progressive_actions=244,
            defensive_actions=56,
            raw={"sample": True},
        )

        # Exemplo Understat ofensivo no mesmo banco, sem sobrescrever FBref.
        for player_id, team_id, goals, xg, xa, npxg, key_passes in [
            (saka_id, arsenal_id, 16, 13.2, 9.5, 12.6, 68),
            (salah_id, liverpool_id, 21, 19.4, 10.1, 18.1, 73),
            (yamal_id, barcelona_id, 9, 8.0, 12.2, 7.9, 81),
        ]:
            repo.upsert_player_stat(
                source_id="understat",
                player_id=player_id,
                team_id=team_id,
                competition_id=competition_id,
                season_id=season_id,
                stat_scope="season_attacking",
                minutes=2500,
                goals=goals,
                xg=xg,
                xa=xa,
                npxg=npxg,
                shots=85,
                key_passes=key_passes,
                raw={"sample": True},
            )

        # Exemplo Football-Data.co.uk: resultado recente.
        repo.insert_match_result(
            source_id="football_data_co_uk",
            match_date="2026-01-10",
            competition_id=competition_id,
            season_id=season_id,
            home_team_id=arsenal_id,
            away_team_id=liverpool_id,
            home_goals=2,
            away_goals=2,
            home_shots=14,
            away_shots=11,
            home_shots_on_target=5,
            away_shots_on_target=4,
            home_odds=2.25,
            draw_odds=3.30,
            away_odds=3.10,
            raw={"sample": True},
        )

        # Exemplo ClubElo.
        repo.upsert_clubelo_rating(team_id=arsenal_id, rating_date="2026-01-10", elo=1908.4, rank=5, country="ENG")
        repo.upsert_clubelo_rating(team_id=liverpool_id, rating_date="2026-01-10", elo=1922.1, rank=4, country="ENG")
        repo.upsert_clubelo_rating(team_id=barcelona_id, rating_date="2026-01-10", elo=1948.7, rank=2, country="ESP")

        # Exemplo StatsBomb Open Data / C-03.
        repo.insert_event_sequence(
            source_id="statsbomb_open",
            source_match_id="sample-match-001",
            team_id=barcelona_id,
            sequence_type="possession_to_shot",
            possession=42,
            title="Sequência ofensiva pelo corredor direito",
            description="Amostra para registrar recortes táticos no banco antes do export C-03.",
            start_minute=61,
            end_minute=62,
            events=[
                {"type": "pass", "player": "Lamine Yamal", "x": 73.0, "y": 22.0},
                {"type": "carry", "player": "Lamine Yamal", "x": 81.0, "y": 18.0},
                {"type": "shot", "player": "Lamine Yamal", "x": 98.0, "y": 42.0, "xg": 0.14},
            ],
            adql_json_path="outputs/c03_statsbomb_sequence.json",
        )

        repo.insert_generated_export(
            component="C-06",
            source_id="database",
            title="Amostra do banco ADQL Analytics",
            output_path="outputs/c06_database_players.json",
            source_payload={"sample": True},
        )

    print("Banco alimentado com dados de amostra.")
    print(f"Arquivo: {db_path}")


if __name__ == "__main__":
    main()
