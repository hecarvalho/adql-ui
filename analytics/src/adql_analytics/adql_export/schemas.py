from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ADQLExport:
    component: str
    schema_version: str
    title: str
    subtitle: str | None = None
    data: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "component": self.component,
            "schemaVersion": self.schema_version,
            "title": self.title,
            "subtitle": self.subtitle,
            "data": self.data,
        }


ADQL_SCHEMA_VERSIONS = {
    "c03": "adql.c03.scene.v1",
    "c04": "adql.c04.radar.v1",
    "c05": "adql.c05.player-comparison.v1",
    "c06": "adql.c06.table.v1",
}
