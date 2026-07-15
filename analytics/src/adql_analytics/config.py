from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover
    load_dotenv = None


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CONFIG_PATH = PROJECT_ROOT / "config" / "sources.json"


@dataclass(frozen=True)
class AnalyticsConfig:
    cache_dir: Path
    output_dir: Path
    raw_data_dir: Path
    football_data_org_token: str | None
    thesportsdb_api_key: str | None
    sources: dict[str, Any]


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Arquivo de configuração não encontrado: {path}")
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def load_config(config_path: str | Path | None = None) -> AnalyticsConfig:
    """Carrega configuração da camada ADQL Analytics.

    O arquivo `.env` é opcional. Quando existir, ele sobrescreve diretórios e chaves.
    """
    if load_dotenv is not None:
        load_dotenv(PROJECT_ROOT / ".env")

    path = Path(config_path) if config_path else DEFAULT_CONFIG_PATH
    data = load_json(path)

    cache_dir = Path(os.getenv("ADQL_ANALYTICS_CACHE_DIR", data.get("cache_dir", "cache")))
    output_dir = Path(os.getenv("ADQL_ANALYTICS_OUTPUT_DIR", data.get("output_dir", "outputs")))

    if not cache_dir.is_absolute():
        cache_dir = PROJECT_ROOT / cache_dir
    if not output_dir.is_absolute():
        output_dir = PROJECT_ROOT / output_dir

    raw_data_dir = PROJECT_ROOT / "data" / "raw"

    cache_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)
    raw_data_dir.mkdir(parents=True, exist_ok=True)

    return AnalyticsConfig(
        cache_dir=cache_dir,
        output_dir=output_dir,
        raw_data_dir=raw_data_dir,
        football_data_org_token=os.getenv("FOOTBALL_DATA_ORG_TOKEN") or None,
        thesportsdb_api_key=os.getenv("THESPORTSDB_API_KEY") or None,
        sources=data.get("sources", {}),
    )
