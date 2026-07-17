from __future__ import annotations

from typing import Any

import pandas as pd

from .schemas import ADQLExport, ADQL_SCHEMA_VERSIONS
from adql_analytics.io import sanitize_json_value


def dataframe_to_c06_table(
    df: pd.DataFrame,
    title: str,
    subtitle: str | None = None,
    max_rows: int | None = None,
) -> dict[str, Any]:
    """Converte um DataFrame para um JSON simples de tabela ADQL C-06.

    A conversão força `object` antes de substituir nulos. Isso evita que colunas
    numéricas convertam `None` de volta para `NaN`, o que quebraria a importação
    via `JSON.parse` no ADQL UI.
    """
    table = df.copy()

    if max_rows is not None:
        table = table.head(max_rows)

    table = table.astype(object).where(pd.notnull(table), None)

    payload = ADQLExport(
        component="C-06",
        schema_version=ADQL_SCHEMA_VERSIONS["c06"],
        title=title,
        subtitle=subtitle,
        data={
            "columns": [str(column) for column in table.columns],
            "rows": sanitize_json_value(table.values.tolist()),
        },
    )
    return sanitize_json_value(payload.to_dict())
