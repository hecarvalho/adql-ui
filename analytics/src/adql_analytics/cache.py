from __future__ import annotations

import hashlib
from pathlib import Path
from typing import Any

import pandas as pd

from .io import read_json, write_json


def cache_key(*parts: Any) -> str:
    raw = "::".join(str(part) for part in parts)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]


def json_cache_path(cache_dir: Path, namespace: str, *parts: Any) -> Path:
    return cache_dir / namespace / f"{cache_key(*parts)}.json"


def dataframe_cache_path(cache_dir: Path, namespace: str, *parts: Any) -> Path:
    return cache_dir / namespace / f"{cache_key(*parts)}.csv"


def load_cached_json(path: Path) -> Any | None:
    if path.exists():
        return read_json(path)
    return None


def save_cached_json(path: Path, data: dict[str, Any] | list[Any]) -> Path:
    return write_json(data, path)


def load_cached_dataframe(path: Path) -> pd.DataFrame | None:
    if path.exists():
        return pd.read_csv(path)
    return None


def save_cached_dataframe(path: Path, df: pd.DataFrame) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(path, index=False)
    return path
