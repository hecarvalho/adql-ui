# ADQL Analytics — API-Football Free → Database → C-06

Esta etapa adiciona a API-Football como fonte complementar de dados recentes.

Ela não substitui StatsBomb, Wyscout, Opta ou SkillCorner. O uso principal é:

- fixtures;
- resultados;
- eventos básicos;
- estatísticas agregadas de partida;
- lineups;
- estatísticas de jogadores por partida, quando disponíveis;
- tabelas C-06 de pré/pós-jogo.

## Limite do plano gratuito

O plano gratuito deve ser tratado como recurso limitado. A estratégia do ADQL é:

```text
API-Football
→ poucas chamadas controladas
→ raw snapshot local
→ banco SQLite
→ export C-06
```

Evite usar a API sempre que abrir o editor. Atualize o banco manualmente e gere os cards a partir do SQLite.

## Configuração

Crie ou edite `analytics/.env`:

```env
API_FOOTBALL_KEY=sua_chave_api_football_aqui
```

O pacote também inclui:

```text
analytics/.env.api-football.example
```

## Teste sem consumir API

Dentro de `analytics`:

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --sample
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode matches
```

Importe no ADQL UI:

```text
analytics/outputs/c06_api_football_matches.json
```

Outros modos:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode team-stats
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode player-stats
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode events
```

## Teste real por fixture

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-id 123456 --include statistics,events,lineups,players
```

Cada bloco extra consome chamadas adicionais:

```text
fixtures/id            → 1 chamada
fixtures/statistics    → 1 chamada
fixtures/events        → 1 chamada
fixtures/lineups       → 1 chamada
fixtures/players       → 1 chamada
```

Para economizar, use:

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-id 123456 --include statistics
```

## Teste real por liga/time

A API-Football usa `season` como ano, não necessariamente `2025-2026`.

Exemplo:

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --league 39 --season 2025 --last 3 --max-fixtures 2 --include statistics
```

Com equipe:

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --league 39 --season 2025 --team 42 --last 3 --max-fixtures 2 --include statistics,events
```

## Saídas C-06

```text
analytics/outputs/c06_api_football_matches.json
analytics/outputs/c06_api_football_team_stats.json
analytics/outputs/c06_api_football_player_stats.json
analytics/outputs/c06_api_football_events.json
```

## Tabelas usadas no banco

- `sources`
- `competitions`
- `seasons`
- `teams`
- `matches`
- `match_results`
- `team_stats`
- `player_stats`
- `event_sequences`
- `raw_snapshots`
- `generated_exports`

## Observação técnica

Os eventos da API-Football são básicos e não têm coordenadas no nível StatsBomb. Por isso, nesta versão, eles entram em C-06 e `event_sequences` como log de eventos, não como cena tática C-03.
