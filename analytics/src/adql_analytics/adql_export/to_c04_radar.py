from __future__ import annotations

from typing import Any, Iterable

from .schemas import ADQLExport, ADQL_SCHEMA_VERSIONS


def metrics_to_c04_radar(
    title: str,
    entity_name: str,
    metrics: Iterable[dict[str, Any]],
    subtitle: str | None = None,
    scale_max: float = 100,
) -> dict[str, Any]:
    """Gera estrutura-base para radar C-04.

    Cada métrica deve seguir:
    {"label": "Finalização", "value": 72, "description": "opcional"}
    """
    normalized_metrics = []
    for metric in metrics:
        value = float(metric.get("value", 0))
        normalized_metrics.append(
            {
                "label": str(metric.get("label", "Métrica")),
                "value": max(0, min(scale_max, value)),
                "description": metric.get("description"),
            }
        )

    payload = ADQLExport(
        component="C-04",
        schema_version=ADQL_SCHEMA_VERSIONS["c04"],
        title=title,
        subtitle=subtitle,
        data={
            "entity": entity_name,
            "scaleMax": scale_max,
            "metrics": normalized_metrics,
        },
    )
    return payload.to_dict()
