# Understat → C-06 Table Builder

Este pipeline gera tabelas editoriais para o **C-06 — Table Builder** usando dados públicos do Understat via `soccerdata`.

## Uso principal

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_understat.py --sample
```

Saída:

```text
analytics/outputs/c06_understat_xg_table.json
```

Importe esse JSON no C-06 pelo botão **Analytics Layer**.

## Uso com Understat real

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_understat.py --league "ENG-Premier League" --season "2025-2026" --sort-metric "xG/90" --top 10
```

Jogadores específicos:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_understat.py --league "ENG-Premier League" --season "2025-2026" --players "Erling Haaland" "Mohamed Salah" "Bukayo Saka"
```

## Métricas disponíveis

- Gols/90
- xG/90
- npxG/90
- xA/90
- Chutes/90
- KP/90
- xGChain/90
- xGBuildup/90
- Gols - xG

Você pode limitar as colunas:

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_understat.py --sample --metrics "xG/90,xA/90,Chutes/90,Gols - xG"
```

## Observações

- Esta etapa é focada em tabela editorial, não em mapa de chutes.
- O Understat é útil para volume/qualidade ofensiva: xG, xA, chutes, passes-chave, xGChain e xGBuildup.
- As colunas reais podem variar conforme liga, temporada e versão do `soccerdata`.
- O arquivo bruto normalizado fica em `analytics/data/raw/understat_players_raw.csv`.

## Integração com o ADQL

Fluxo:

```text
Understat / soccerdata
→ pandas
→ métricas por 90
→ JSON C-06
→ ADQL UI
→ tabela editável
→ PNG/HTML
```
