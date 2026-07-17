from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from adql_analytics.adql_export.to_c06_table import dataframe_to_c06_table
from adql_analytics.config import load_config
from adql_analytics.database import AnalyticsRepository, initialize_database
from adql_analytics.io import write_json
from adql_analytics.sources.api_football import API_FOOTBALL_SOURCE_ID


def build_matches_table(repo: AnalyticsRepository, limit: int):
    return repo.query_dataframe(
        """
        SELECT
          substr(m.match_date, 1, 10) AS Data,
          c.name AS Competição,
          ht.name AS Mandante,
          at.name AS Visitante,
          COALESCE(m.home_score, mr.home_goals) || ' x ' || COALESCE(m.away_score, mr.away_goals) AS Placar,
          m.status AS Status,
          ROUND(mr.home_shots, 0) AS "Chutes casa",
          ROUND(mr.away_shots, 0) AS "Chutes fora",
          ROUND(mr.home_shots_on_target, 0) AS "No alvo casa",
          ROUND(mr.away_shots_on_target, 0) AS "No alvo fora"
        FROM matches m
        LEFT JOIN match_results mr ON mr.match_id = m.match_id
        LEFT JOIN competitions c ON c.competition_id = m.competition_id
        JOIN teams ht ON ht.team_id = m.home_team_id
        JOIN teams at ON at.team_id = m.away_team_id
        WHERE m.source_id = :source_id
        ORDER BY m.match_date DESC
        LIMIT :limit
        """,
        {"source_id": API_FOOTBALL_SOURCE_ID, "limit": limit},
    )


def build_team_stats_table(repo: AnalyticsRepository, limit: int):
    return repo.query_dataframe(
        """
        SELECT
          t.name AS Equipe,
          c.name AS Competição,
          ts.stat_scope AS Recorte,
          ROUND(ts.goals_for, 1) AS GP,
          ROUND(ts.goals_against, 1) AS GC,
          ROUND(ts.xg_for, 2) AS xG,
          ROUND(ts.xg_against, 2) AS "xG contra",
          ROUND(ts.shots_for, 0) AS Chutes,
          ROUND(ts.shots_against, 0) AS "Chutes contra"
        FROM team_stats ts
        JOIN teams t ON t.team_id = ts.team_id
        LEFT JOIN competitions c ON c.competition_id = ts.competition_id
        WHERE ts.source_id = :source_id
        ORDER BY ts.updated_at DESC
        LIMIT :limit
        """,
        {"source_id": API_FOOTBALL_SOURCE_ID, "limit": limit},
    )


def build_player_stats_table(repo: AnalyticsRepository, limit: int):
    return repo.query_dataframe(
        """
        SELECT
          p.name AS Jogador,
          t.name AS Equipe,
          ps.stat_scope AS Recorte,
          ROUND(ps.minutes, 0) AS Min,
          ROUND(ps.goals, 0) AS Gols,
          ROUND(ps.assists, 0) AS Assist,
          ROUND(ps.shots, 0) AS Chutes,
          ROUND(ps.key_passes, 0) AS "Passes-chave",
          ROUND(ps.defensive_actions, 0) AS "Ações def."
        FROM player_stats ps
        JOIN players p ON p.player_id = ps.player_id
        LEFT JOIN teams t ON t.team_id = ps.team_id
        WHERE ps.source_id = :source_id
        ORDER BY ps.updated_at DESC, ps.goals DESC, ps.assists DESC
        LIMIT :limit
        """,
        {"source_id": API_FOOTBALL_SOURCE_ID, "limit": limit},
    )


def build_events_table(repo: AnalyticsRepository, limit: int):
    return repo.query_dataframe(
        """
        SELECT
          title AS Título,
          sequence_type AS Tipo,
          start_minute AS Início,
          end_minute AS Fim,
          description AS Descrição
        FROM event_sequences
        WHERE source_id = :source_id
        ORDER BY created_at DESC
        LIMIT :limit
        """,
        {"source_id": API_FOOTBALL_SOURCE_ID, "limit": limit},
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Exporta tabelas C-06 com dados API-Football salvos no banco.")
    parser.add_argument("--mode", choices=["matches", "team-stats", "player-stats", "events"], default="matches")
    parser.add_argument("--limit", type=int, default=12)
    args = parser.parse_args()

    config = load_config()
    db_path = initialize_database()

    with AnalyticsRepository(db_path) as repo:
        if args.mode == "team-stats":
            df = build_team_stats_table(repo, args.limit)
            title = "API-Football — estatísticas de equipes"
            output_path = config.output_dir / "c06_api_football_team_stats.json"
        elif args.mode == "player-stats":
            df = build_player_stats_table(repo, args.limit)
            title = "API-Football — estatísticas de jogadores"
            output_path = config.output_dir / "c06_api_football_player_stats.json"
        elif args.mode == "events":
            df = build_events_table(repo, args.limit)
            title = "API-Football — eventos básicos"
            output_path = config.output_dir / "c06_api_football_events.json"
        else:
            df = build_matches_table(repo, args.limit)
            title = "API-Football — partidas no banco"
            output_path = config.output_dir / "c06_api_football_matches.json"

        if df.empty:
            raise SystemExit(
                "Nenhum dado API-Football encontrado. Rode antes: python examples\\update_database_from_api_football.py --sample"
            )

        payload = dataframe_to_c06_table(
            df,
            title=title,
            subtitle="Tabela gerada a partir do SQLite local do ADQL Analytics",
            max_rows=args.limit,
        )
        write_json(payload, output_path)
        repo.insert_generated_export(
            component="C-06",
            source_id=API_FOOTBALL_SOURCE_ID,
            title=title,
            output_path=str(output_path),
            source_payload={"mode": args.mode, "limit": args.limit},
        )

    print(f"Arquivo gerado: {output_path}")


if __name__ == "__main__":
    main()
