# ADQL Database Exporters V1

Esta etapa adiciona exportadores diretos do banco SQLite ADQL Analytics para os componentes já importáveis no ADQL UI.

## Objetivo

Transformar o fluxo:

```text
fontes externas → JSON ADQL
```

em:

```text
fontes externas → SQLite ADQL Analytics → JSON ADQL
```

## Exportadores adicionados

```text
analytics/examples/export_c04_from_database.py
analytics/examples/export_c05_from_database.py
analytics/examples/export_c06_from_database.py
```

## C-04 — Radar Profile

Gera radar individual a partir da tabela `player_stats`.

```powershell
.\.venv\Scripts\python.exe examples\export_c04_from_database.py --player "Bukayo Saka"
```

Com filtro de fonte:

```powershell
.\.venv\Scripts\python.exe examples\export_c04_from_database.py --source fbref --player "Bukayo Saka"
```

Saída padrão:

```text
analytics/outputs/c04_database_radar_profile.json
```

## C-05 — Player Comparison

Gera comparação entre jogadores a partir da tabela `player_stats`.

```powershell
.\.venv\Scripts\python.exe examples\export_c05_from_database.py --players "Bukayo Saka" "Mohamed Salah"
```

Com filtro de fonte:

```powershell
.\.venv\Scripts\python.exe examples\export_c05_from_database.py --source understat --players "Erling Haaland" "Mohamed Salah"
```

Saída padrão:

```text
analytics/outputs/c05_database_player_comparison.json
```

## C-06 — Table Builder

Modos disponíveis:

```text
players
team-stats
matches
clubelo
```

Jogadores:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_database.py --mode players
```

Estatísticas de equipes:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_database.py --mode team-stats
```

Partidas:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_database.py --mode matches
```

ClubElo:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_database.py --mode clubelo
```

## Métricas dos jogadores

As métricas são calculadas por 90 minutos quando houver minutos disponíveis:

```text
Gols/90
Assistências/90
xG/90
xA/90
Chutes/90
Progressão/90
Defesa/90
```

Para C-04 e C-05, os valores enviados ao ADQL UI são percentis 0-100 calculados dentro da base filtrada.

Os valores brutos ficam preservados em `data.rawMetrics`.

## Observação

Estes exportadores não buscam dados na internet. Eles apenas leem o banco SQLite local.

Antes de usá-los, rode algum writer:

```powershell
.\.venv\Scripts\python.exe examples\update_database_all_basic_sources.py --sample
```

ou os writers reais já implementados no projeto.
