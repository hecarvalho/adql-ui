# Football-Data.co.uk → C-06 Table Builder

Este pipeline transforma arquivos CSV públicos do Football-Data.co.uk em tabelas editoriais compatíveis com o componente **C-06 — Table Builder** do ADQL UI.

## Uso principal

```text
Football-Data.co.uk CSV
→ pandas
→ forma recente / casa-fora / odds / estatísticas básicas
→ tabela editorial
→ JSON C-06
→ ADQL UI
```

## Teste sem internet

Dentro de `analytics/`:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_football_data.py --sample
```

Saída:

```text
analytics/outputs/c06_football_data_form.json
```

Importe esse arquivo no **C-06 — Table Builder** pelo card **Importar JSON / Analytics Layer**.

## Comparar forma recente entre equipes

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_football_data.py --sample --team "Arsenal" "Liverpool" --mode compare --last-n 5
```

## Gerar tabela dos últimos jogos de uma equipe

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_football_data.py --sample --team "Arsenal" --mode matches --last-n 5
```

## Usar CSV real

Premier League 2025/26:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_football_data.py --season "2025-2026" --competition "E0" --team "Arsenal" "Liverpool" --mode compare --last-n 5
```

La Liga 2025/26:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_football_data.py --season "2025-2026" --competition "SP1" --team "Barcelona" "Real Madrid" --mode compare --last-n 5
```

## Códigos comuns

- `E0` — Premier League
- `E1` — Championship
- `SP1` — La Liga
- `D1` — Bundesliga
- `I1` — Serie A
- `F1` — Ligue 1
- `N1` — Eredivisie
- `P1` — Primeira Liga Portugal

## Campos usados

O pipeline tenta usar as colunas mais comuns dos CSVs:

- `Date`
- `HomeTeam`
- `AwayTeam`
- `FTHG`
- `FTAG`
- `HS` / `AS`
- `HST` / `AST`
- `B365H` / `B365D` / `B365A`

Quando alguma coluna opcional não existir, o valor final aparece como `—`.

## Observações de análise

Football-Data.co.uk é útil para contexto de forma, resultados, casa/fora e odds. Ele não substitui dados de evento, tracking ou análise de vídeo. Use como base de contexto para pré-jogo e pós-jogo, cruzando com FBref, StatsBomb Open Data e leitura tática.
