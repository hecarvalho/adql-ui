# ClubElo → C-06 Table Builder

Este pipeline gera tabelas editoriais para o **C-06 — Table Builder** usando ratings do ClubElo via `soccerdata`.

## Objetivo

Adicionar contexto de força relativa das equipes para pré-jogo, pós-jogo e comparação de adversários.

Fluxo:

```text
ClubElo / soccerdata
→ pandas
→ ranking, comparação ou histórico
→ JSON C-06
→ ADQL UI
```

## O que o ClubElo resolve

Use ClubElo para:

- comparar força relativa entre clubes;
- contextualizar dificuldade do adversário;
- montar ranking de equipes;
- acompanhar variação de rating ao longo do tempo;
- enriquecer cards pré-jogo.

Não use ClubElo como métrica isolada para avaliar desempenho técnico, físico ou tático. Ele é uma camada de contexto competitivo.

## Teste sem internet

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_clubelo.py --sample --mode top --top 10
```

Saída:

```text
analytics/outputs/c06_clubelo_table.json
```

## Comparação entre equipes

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_clubelo.py --sample --mode compare --teams "Arsenal" "Liverpool"
```

## Histórico fictício para validação

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_clubelo.py --sample --mode history --teams "Arsenal" "Liverpool" --top 5
```

## Consulta real

Ranking atual disponível:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_clubelo.py --mode top --top 15
```

Ranking por data:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_clubelo.py --date "2026-07-16" --mode top --top 15
```

Comparação real:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_clubelo.py --date "2026-07-16" --mode compare --teams "Arsenal" "Liverpool" "Man City"
```

Histórico real:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_clubelo.py --mode history --teams "Arsenal" "Liverpool" --top 8
```

## Saídas geradas

```text
analytics/data/raw/clubelo_raw.csv
analytics/outputs/c06_clubelo_table.json
```

## Uso no ADQL UI

1. Abra o **C-06 — Table Builder**.
2. Use o card **Importar JSON / Analytics Layer**.
3. Selecione `analytics/outputs/c06_clubelo_table.json`.
4. Ajuste o texto, título e leitura editorial manualmente.
5. Exporte em PNG/HTML.

## Cards recomendados

- Top 10 clubes por força relativa;
- Comparativo pré-jogo de Elo;
- Evolução recente de rating;
- Contexto de dificuldade do adversário;
- Ranking de nível competitivo entre possíveis adversários.
