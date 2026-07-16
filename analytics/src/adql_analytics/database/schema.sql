PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sources (
  source_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT,
  url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS competitions (
  competition_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT,
  country TEXT,
  gender TEXT,
  source_id TEXT,
  source_competition_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  UNIQUE(source_id, source_competition_id)
);

CREATE TABLE IF NOT EXISTS seasons (
  season_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  start_year INTEGER,
  end_year INTEGER,
  source_id TEXT,
  source_season_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  UNIQUE(source_id, source_season_id)
);

CREATE TABLE IF NOT EXISTS teams (
  team_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  country TEXT,
  source_id TEXT,
  source_team_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  UNIQUE(source_id, source_team_id)
);

CREATE INDEX IF NOT EXISTS idx_teams_normalized_name ON teams(normalized_name);

CREATE TABLE IF NOT EXISTS players (
  player_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  team_id TEXT,
  country TEXT,
  position TEXT,
  birth_date TEXT,
  source_id TEXT,
  source_player_id TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  UNIQUE(source_id, source_player_id)
);

CREATE INDEX IF NOT EXISTS idx_players_normalized_name ON players(normalized_name);
CREATE INDEX IF NOT EXISTS idx_players_team_id ON players(team_id);

CREATE TABLE IF NOT EXISTS matches (
  match_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_match_id TEXT,
  competition_id TEXT,
  season_id TEXT,
  match_date TEXT,
  home_team_id TEXT,
  away_team_id TEXT,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT,
  venue TEXT,
  neutral INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  FOREIGN KEY (competition_id) REFERENCES competitions(competition_id),
  FOREIGN KEY (season_id) REFERENCES seasons(season_id),
  FOREIGN KEY (home_team_id) REFERENCES teams(team_id),
  FOREIGN KEY (away_team_id) REFERENCES teams(team_id),
  UNIQUE(source_id, source_match_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX IF NOT EXISTS idx_matches_home_team ON matches(home_team_id);
CREATE INDEX IF NOT EXISTS idx_matches_away_team ON matches(away_team_id);

CREATE TABLE IF NOT EXISTS match_results (
  match_result_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  match_id TEXT,
  match_date TEXT,
  competition_id TEXT,
  season_id TEXT,
  home_team_id TEXT NOT NULL,
  away_team_id TEXT NOT NULL,
  home_goals INTEGER,
  away_goals INTEGER,
  home_shots REAL,
  away_shots REAL,
  home_shots_on_target REAL,
  away_shots_on_target REAL,
  home_odds REAL,
  draw_odds REAL,
  away_odds REAL,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  FOREIGN KEY (match_id) REFERENCES matches(match_id),
  FOREIGN KEY (competition_id) REFERENCES competitions(competition_id),
  FOREIGN KEY (season_id) REFERENCES seasons(season_id),
  FOREIGN KEY (home_team_id) REFERENCES teams(team_id),
  FOREIGN KEY (away_team_id) REFERENCES teams(team_id)
);

CREATE INDEX IF NOT EXISTS idx_match_results_date ON match_results(match_date);

CREATE TABLE IF NOT EXISTS player_stats (
  stat_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  team_id TEXT,
  competition_id TEXT,
  season_id TEXT,
  stat_scope TEXT NOT NULL DEFAULT 'season',
  minutes REAL,
  appearances REAL,
  starts REAL,
  goals REAL,
  assists REAL,
  xg REAL,
  xa REAL,
  npxg REAL,
  xag REAL,
  shots REAL,
  key_passes REAL,
  progressive_actions REAL,
  defensive_actions REAL,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (competition_id) REFERENCES competitions(competition_id),
  FOREIGN KEY (season_id) REFERENCES seasons(season_id),
  UNIQUE(source_id, player_id, team_id, competition_id, season_id, stat_scope)
);

CREATE INDEX IF NOT EXISTS idx_player_stats_lookup ON player_stats(player_id, team_id, season_id, source_id);

CREATE TABLE IF NOT EXISTS team_stats (
  stat_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  competition_id TEXT,
  season_id TEXT,
  stat_scope TEXT NOT NULL DEFAULT 'season',
  matches_played REAL,
  minutes REAL,
  goals_for REAL,
  goals_against REAL,
  xg_for REAL,
  xg_against REAL,
  shots_for REAL,
  shots_against REAL,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (competition_id) REFERENCES competitions(competition_id),
  FOREIGN KEY (season_id) REFERENCES seasons(season_id),
  UNIQUE(source_id, team_id, competition_id, season_id, stat_scope)
);

CREATE INDEX IF NOT EXISTS idx_team_stats_lookup ON team_stats(team_id, season_id, source_id);

CREATE TABLE IF NOT EXISTS shot_stats (
  shot_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_shot_id TEXT,
  match_id TEXT,
  team_id TEXT,
  player_id TEXT,
  minute INTEGER,
  second INTEGER,
  x REAL,
  y REAL,
  xg REAL,
  outcome TEXT,
  body_part TEXT,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  FOREIGN KEY (match_id) REFERENCES matches(match_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  FOREIGN KEY (player_id) REFERENCES players(player_id),
  UNIQUE(source_id, source_shot_id)
);

CREATE INDEX IF NOT EXISTS idx_shot_stats_match ON shot_stats(match_id);
CREATE INDEX IF NOT EXISTS idx_shot_stats_player ON shot_stats(player_id);

CREATE TABLE IF NOT EXISTS event_sequences (
  sequence_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  source_match_id TEXT,
  match_id TEXT,
  team_id TEXT,
  sequence_type TEXT,
  possession INTEGER,
  title TEXT NOT NULL,
  description TEXT,
  start_minute INTEGER,
  end_minute INTEGER,
  events_json TEXT,
  adql_json_path TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  FOREIGN KEY (match_id) REFERENCES matches(match_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id)
);

CREATE INDEX IF NOT EXISTS idx_event_sequences_source_match ON event_sequences(source_id, source_match_id);

CREATE TABLE IF NOT EXISTS clubelo_ratings (
  rating_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  rating_date TEXT NOT NULL,
  elo REAL NOT NULL,
  rank INTEGER,
  country TEXT,
  level INTEGER,
  from_score REAL,
  to_score REAL,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id),
  FOREIGN KEY (team_id) REFERENCES teams(team_id),
  UNIQUE(source_id, team_id, rating_date)
);

CREATE INDEX IF NOT EXISTS idx_clubelo_date ON clubelo_ratings(rating_date);
CREATE INDEX IF NOT EXISTS idx_clubelo_team ON clubelo_ratings(team_id);

CREATE TABLE IF NOT EXISTS raw_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL,
  dataset_name TEXT NOT NULL,
  path TEXT NOT NULL,
  content_hash TEXT,
  row_count INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_raw_snapshots_source_dataset ON raw_snapshots(source_id, dataset_name);

CREATE TABLE IF NOT EXISTS generated_exports (
  export_id TEXT PRIMARY KEY,
  component TEXT NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL,
  output_path TEXT NOT NULL,
  source_payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (source_id) REFERENCES sources(source_id)
);

CREATE INDEX IF NOT EXISTS idx_generated_exports_component ON generated_exports(component);
CREATE INDEX IF NOT EXISTS idx_generated_exports_created ON generated_exports(created_at);

INSERT OR IGNORE INTO schema_migrations(version) VALUES ('0001_database_v1');
