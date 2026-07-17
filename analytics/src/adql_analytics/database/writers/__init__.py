from __future__ import annotations

__all__: list[str] = []

try:
    from .fbref_writer import write_fbref_player_stats_to_database
    __all__.append("write_fbref_player_stats_to_database")
except ImportError:  # pragma: no cover
    pass

try:
    from .understat_writer import write_understat_player_stats_to_database
    __all__.append("write_understat_player_stats_to_database")
except ImportError:  # pragma: no cover
    pass

try:
    from .football_data_writer import write_football_data_matches_to_database
    __all__.append("write_football_data_matches_to_database")
except ImportError:  # pragma: no cover
    pass

try:
    from .clubelo_writer import write_clubelo_ratings_to_database
    __all__.append("write_clubelo_ratings_to_database")
except ImportError:  # pragma: no cover
    pass

try:
    from .api_football_writer import write_api_football_fixture_bundles_to_database
    __all__.append("write_api_football_fixture_bundles_to_database")
except ImportError:  # pragma: no cover
    pass
