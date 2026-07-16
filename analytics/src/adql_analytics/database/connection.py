from __future__ import annotations

import sqlite3
from pathlib import Path

from adql_analytics.config import PROJECT_ROOT

DEFAULT_DATABASE_PATH = PROJECT_ROOT / "data" / "adql_analytics.db"


def resolve_database_path(path: str | Path | None = None) -> Path:
    """Resolve o caminho do SQLite da camada ADQL Analytics."""
    database_path = Path(path) if path else DEFAULT_DATABASE_PATH

    if not database_path.is_absolute():
        database_path = PROJECT_ROOT / database_path

    return database_path


def get_connection(path: str | Path | None = None) -> sqlite3.Connection:
    """Abre uma conexão SQLite com configurações seguras para o projeto."""
    database_path = resolve_database_path(path)
    database_path.parent.mkdir(parents=True, exist_ok=True)

    connection = sqlite3.connect(database_path)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    connection.execute("PRAGMA journal_mode = WAL;")
    connection.execute("PRAGMA synchronous = NORMAL;")
    return connection
