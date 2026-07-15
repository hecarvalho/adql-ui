# FBref → C-06 Table Builder

Este pipeline transforma estatísticas públicas do FBref em um JSON compatível com o componente **C-06 — Table Builder** do ADQL UI.

## Fluxo

```text
FBref / soccerdata
→ pandas
→ métricas por 90 + percentis
→ tabela editorial
→ JSON C-06
→ ADQL UI
```

## Teste sem internet

Dentro de `analytics/`:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_fbref.py --sample
```

Saída:

```text
analytics/outputs/c06_fbref_table.json
```

Importe esse arquivo no C-06 pelo card **Importar JSON / Analytics Layer**.

## Exemplo com jogadores específicos

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_fbref.py --sample --players "Bukayo Saka" "Mohamed Salah" "Cole Palmer"
```

## Exemplo com FBref real

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_fbref.py --league "Big 5 European Leagues Combined" --season "2025-2026" --sort-metric "xG/90" --top 10
```

## Usar percentis na tabela

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_fbref.py --sample --value-type percentile --sort-mode percentile
```

## Escolher métricas

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_fbref.py --sample --metrics "Gols/90,xG/90,Chutes/90,Progressão/90"
```

## Métricas disponíveis

- Gols/90
- Assistências/90
- xG/90
- xAG/90
- Chutes/90
- Progressão/90
- Defesa/90

## Observações

- `raw` exibe os valores brutos por 90 quando disponíveis.
- `percentile` exibe percentis de 0 a 100 calculados dentro da base filtrada.
- O CSV bruto normalizado é salvo em `analytics/data/raw/fbref_players_raw.csv`.
- O JSON final é salvo em `analytics/outputs/c06_fbref_table.json`.
