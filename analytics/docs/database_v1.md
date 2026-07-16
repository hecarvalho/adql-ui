# ADQL Analytics Database V1

Esta etapa adiciona um banco local SQLite para consolidar os dados coletados por fontes gratuitas antes da exportação para o ADQL UI.

## Objetivo

Fluxo anterior:

```text
fonte externa → JSON ADQL
```

Fluxo novo:

```text
fonte externa → dados brutos/cache → SQLite local → JSON ADQL → ADQL UI
```

O banco não substitui o ADQL UI. Ele serve como camada analítica intermediária para guardar histórico, normalizar nomes e reutilizar dados sem depender de internet a cada card.

## Arquivo do banco

```text
analytics/data/adql_analytics.db
```

Esse arquivo é local. Em geral, não precisa ser versionado no Git.

## Tabelas principais

- `sources`: fontes integradas, como FBref, Understat, StatsBomb Open Data, Football-Data.co.uk e ClubElo.
- `competitions`: competições normalizadas.
- `seasons`: temporadas.
- `teams`: equipes.
- `players`: jogadores.
- `matches`: partidas normalizadas.
- `match_results`: resultados, odds e estatísticas básicas de partida.
- `player_stats`: métricas de jogadores por fonte/temporada.
- `team_stats`: métricas de equipes.
- `shot_stats`: finalizações com coordenadas.
- `event_sequences`: recortes táticos para C-03.
- `clubelo_ratings`: força relativa de equipes.
- `raw_snapshots`: registro de arquivos brutos/cache.
- `generated_exports`: histórico de JSONs gerados para ADQL UI.

## Comandos

Inicializar banco:

```powershell
.\.venv\Scripts\python.exe examples\init_database.py
```

Alimentar amostra:

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_sample.py
```

Inspecionar banco:

```powershell
.\.venv\Scripts\python.exe examples\inspect_database.py
```

Exportar C-06 de jogadores a partir do banco:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_database.py --mode players
```

Exportar C-06 de ClubElo a partir do banco:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_database.py --mode clubelo
```

## Saídas esperadas

```text
analytics/outputs/c06_database_players.json
analytics/outputs/c06_database_clubelo.json
```

Esses arquivos podem ser importados no C-06 pelo importador Analytics já validado.

## Próxima fase

Depois desta base, os pipelines existentes devem ganhar comandos de gravação no banco:

```text
FBref → SQLite → C-04/C-05/C-06
Understat → SQLite → C-04/C-05/C-06
Football-Data.co.uk → SQLite → C-06
ClubElo → SQLite → C-06
StatsBomb Open Data → SQLite → C-03
```

Depois disso, o `mplsoccer` entra como camada visual auxiliar consumindo dados já normalizados do banco.
