# API-Football Full Fixture Bundle V2

Esta etapa adiciona o modo `--full` ao coletor da API-Football.

## Objetivo

Reduzir chamadas no plano gratuito quando já temos um ou mais `fixture_id`.

Fluxo preferencial:

```text
fixture_id(s)
→ /fixtures?ids=...
→ bundle completo quando disponível
→ raw snapshot
→ banco SQLite
→ exports ADQL
```

A API-Football documenta o parâmetro `ids` no endpoint `fixtures` para recuperar dados de vários fixtures em uma chamada, incluindo eventos, lineups, statistics e players quando esses dados estiverem disponíveis para a partida.

## Comandos

### Um fixture

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-id 123456 --full
```

### Vários fixtures

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-ids 123456 123457 123458 --full
```

Também aceita lista separada por vírgula:

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-ids "123456,123457,123458" --full
```

### Buscar IDs por filtro e depois usar full bundle

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --league 39 --season 2025 --last 3 --full --max-fixtures 3
```

Nesse caso, o script faz primeiro uma chamada para listar fixtures e depois usa `ids` para buscar os bundles enriquecidos.

## Modo legado preservado

O modo antigo continua disponível:

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-id 123456 --include statistics
```

Ele ainda é útil quando você quer forçar apenas um bloco específico ou quando a resposta do modo `ids` não trouxer algum dado esperado.

## Saídas

O script grava:

```text
analytics/data/raw/api_football/api_football_fixture_bundles.json
analytics/data/adql_analytics.db
```

Depois gere as tabelas:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode matches
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode team-stats
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode player-stats
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode events
```

## Observação

`--full` reduz chamadas, mas não transforma a API-Football em fonte StatsBomb-like. Ela continua sendo melhor para fixtures, eventos básicos, lineups, estatísticas de partida e estatísticas agregadas.
