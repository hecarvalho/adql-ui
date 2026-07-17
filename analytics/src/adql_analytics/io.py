from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import pandas as pd


def sanitize_json_value(value: Any) -> Any:
    """Converte valores não compatíveis com JSON estrito para valores seguros.

    O `json.dump` do Python aceita NaN/Infinity por padrão, mas o `JSON.parse`
    do navegador não aceita. Como o ADQL UI importa JSON no browser, todo
    arquivo exportado precisa ser JSON estrito.

    A ordem das verificações é importante: listas, tuplas, sets e dicionários
    precisam ser tratados antes de `pd.isna`, porque `pd.isna(lista)` retorna
    um array booleano e isso causa o erro "truth value of an array is ambiguous".
    """
    if value is None:
        return None

    if isinstance(value, dict):
        return {str(key): sanitize_json_value(item) for key, item in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [sanitize_json_value(item) for item in value]

    # Compatibilidade com objetos tipo ndarray/Series sem depender diretamente de numpy.
    if hasattr(value, "tolist") and not isinstance(value, (str, bytes, bytearray)):
        try:
            converted = value.tolist()
            if converted is not value:
                return sanitize_json_value(converted)
        except Exception:
            pass

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
        return value

    # Compatibilidade com escalares NumPy/Pandas sem depender diretamente de numpy.
    if hasattr(value, "item") and not isinstance(value, (str, bytes, bytearray)):
        try:
            return sanitize_json_value(value.item())
        except Exception:
            pass

    try:
        missing = pd.isna(value)
        if isinstance(missing, bool) and missing:
            return None
    except Exception:
        pass

    return value


def write_json(data: dict[str, Any] | list[Any], path: str | Path) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    safe_data = sanitize_json_value(data)

    with output_path.open("w", encoding="utf-8") as file:
        json.dump(
            safe_data,
            file,
            ensure_ascii=False,
            indent=2,
            allow_nan=False,
        )

    return output_path


def read_json(path: str | Path) -> Any:
    input_path = Path(path)
    with input_path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_dataframe(df: pd.DataFrame, path: str | Path) -> Path:
    output_path = Path(path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    suffix = output_path.suffix.lower()

    safe_df = df.astype(object).where(pd.notnull(df), None)

    if suffix == ".csv":
        safe_df.to_csv(output_path, index=False)
    elif suffix in {".xlsx", ".xls"}:
        safe_df.to_excel(output_path, index=False)
    elif suffix == ".json":
        records = sanitize_json_value(safe_df.to_dict(orient="records"))
        with output_path.open("w", encoding="utf-8") as file:
            json.dump(
                records,
                file,
                ensure_ascii=False,
                indent=2,
                allow_nan=False,
            )
    else:
        raise ValueError(f"Formato não suportado para DataFrame: {suffix}")

    return output_path
