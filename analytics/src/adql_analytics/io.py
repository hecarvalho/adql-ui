from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import pandas as pd


def write_json(data: dict[str, Any] | list[Any], path: str | Path) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)
    return output_path


def read_json(path: str | Path) -> Any:
    input_path = Path(path)
    with input_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_dataframe(df: pd.DataFrame, path: str | Path) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    suffix = output_path.suffix.lower()
    if suffix == ".csv":
        df.to_csv(output_path, index=False)
    elif suffix in {".xlsx", ".xls"}:
        df.to_excel(output_path, index=False)
    elif suffix == ".json":
        df.to_json(output_path, orient="records", force_ascii=False, indent=2)
    else:
        raise ValueError(f"Formato não suportado para DataFrame: {suffix}")
    return output_path
