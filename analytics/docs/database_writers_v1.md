# ADQL Database Writers V1

Esta etapa conecta as quatro fontes tabulares já validadas ao SQLite local do ADQL Analytics.

Fluxo anterior:

```text
fonte externa → JSON ADQL
```

Fluxo novo:

```text
fonte externa → banco local → JSON ADQL
```

## Fontes cobertas

- FBref → `player_stats`, `players`, `teams`, `competitions`, `seasons`
- Understat → `player_stats`, `players`, `teams`, `competitions`, `seasons`
- Football-Data.co.uk → `match_results`, `teams`, `competitions`, `seasons`
- ClubElo → `clubelo_ratings`, `teams`

## Teste sem internet

```powershell
.\.venv\Scripts\python.exe examples\update_database_all_basic_sources.py --sample
.\.venv\Scripts\python.exe examples\inspect_database.py
```

## Testes individuais sem internet

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_fbref.py --sample
.\.venv\Scripts\python.exe examples\update_database_from_understat.py --sample
.\.venv\Scripts\python.exe examples\update_database_from_football_data.py --sample
.\.venv\Scripts\python.exe examples\update_database_from_clubelo.py --sample
```

## Teste real

```powershell
.\.venv\Scripts\python.exe examples\update_database_all_basic_sources.py --league "ENG-Premier League" --season "2025-2026" --competition "E0"
```

A coleta real depende de internet, disponibilidade das fontes e compatibilidade da versão instalada do `soccerdata`.

## Observações

- O banco preserva a linha original em `raw_json` quando possível.
- Os writers usam `UPSERT` para evitar duplicar jogadores, equipes, temporadas, estatísticas e ratings.
- StatsBomb fica fora deste pacote porque a estrutura de eventos e sequências táticas será tratada separadamente.
- `mplsoccer` entra depois da consolidação do banco, usando os dados já normalizados para gerar imagens auxiliares.
