from __future__ import annotations

from pathlib import Path

from .connection import get_connection, resolve_database_path

SCHEMA_PATH = Path(__file__).with_name("schema.sql")

DEFAULT_SOURCES = [
    {
        "source_id": "fbref",
        "name": "FBref",
        "source_type": "scraper",
        "url": "https://fbref.com/",
        "notes": "Estatísticas públicas de jogadores, equipes e competições via soccerdata.",
    },
    {
        "source_id": "understat",
        "name": "Understat",
        "source_type": "scraper",
        "url": "https://understat.com/",
        "notes": "xG, xA, chutes, xGChain e xGBuildup via soccerdata.",
    },
    {
        "source_id": "statsbomb_open",
        "name": "StatsBomb Open Data",
        "source_type": "open-data",
        "url": "https://github.com/statsbomb/open-data",
        "notes": "Eventos reais gratuitos para pesquisa e estudo tático.",
    },
    {
        "source_id": "football_data_co_uk",
        "name": "Football-Data.co.uk",
        "source_type": "csv",
        "url": "https://www.football-data.co.uk/",
        "notes": "Resultados, forma recente, casa/fora, odds e estatísticas básicas de partida.",
    },
    {
        "source_id": "clubelo",
        "name": "ClubElo",
        "source_type": "scraper",
        "url": "https://clubelo.com/",
        "notes": "Ratings Elo para contexto de força relativa de clubes.",
    },
    {
        "source_id": "football_data_org",
        "name": "football-data.org",
        "source_type": "api",
        "url": "https://www.football-data.org/",
        "notes": "API para fixtures, tabelas, resultados e artilheiros.",
    },

    {
        "source_id": "database",
        "name": "ADQL Analytics Database",
        "source_type": "local",
        "url": None,
        "notes": "Fonte interna para exports gerados a partir do SQLite local.",
    },
    {
        "source_id": "thesportsdb",
        "name": "TheSportsDB",
        "source_type": "api",
        "url": "https://www.thesportsdb.com/",
        "notes": "Metadados, eventos, equipes, jogadores e imagens.",
    },
]


def initialize_database(path: str | Path | None = None) -> Path:
    """Cria ou atualiza o banco SQLite local do ADQL Analytics."""
    database_path = resolve_database_path(path)

    with get_connection(database_path) as connection:
        schema_sql = SCHEMA_PATH.read_text(encoding="utf-8")
        connection.executescript(schema_sql)
        seed_default_sources(connection)
        connection.commit()

    return database_path


def seed_default_sources(connection) -> None:
    """Insere fontes conhecidas sem sobrescrever notas personalizadas."""
    connection.executemany(
        """
        INSERT INTO sources(source_id, name, source_type, url, notes)
        VALUES (:source_id, :name, :source_type, :url, :notes)
        ON CONFLICT(source_id) DO UPDATE SET
          name = excluded.name,
          source_type = excluded.source_type,
          url = excluded.url,
          updated_at = CURRENT_TIMESTAMP
        """,
        DEFAULT_SOURCES,
    )


def reset_database(path: str | Path | None = None) -> Path:
    """Remove o arquivo SQLite e recria o schema. Use apenas em desenvolvimento."""
    database_path = resolve_database_path(path)
    if database_path.exists():
        database_path.unlink()
    return initialize_database(database_path)
