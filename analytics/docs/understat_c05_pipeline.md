# Understat → C-05 Player Comparison

Este pipeline gera um JSON compatível com o **C-05 — Player Comparison** usando dados públicos do Understat via `soccerdata`.

## Objetivo

```text
Understat / soccerdata
→ pandas
→ métricas por 90
→ percentis 0–100
→ JSON C-05
→ ADQL UI
```

## Métricas padrão

- Gols/90
- xG/90
- npxG/90
- xA/90
- Chutes/90
- KP/90
- xGChain/90
- xGBuildup/90
- Gols - xG

Os valores enviados ao C-05 são percentis 0–100. Os valores brutos ficam preservados em `data.rawMetrics`.

## Teste sem internet

```powershell
.\.venv\Scripts\python.exe examples\export_c05_from_understat.py --sample --players "Erling Haaland" "Mohamed Salah"
```

Saída:

```text
analytics/outputs/c05_understat_player_comparison.json
```

## Teste com Understat real

```powershell
.\.venv\Scripts\python.exe examples\export_c05_from_understat.py --league "ENG-Premier League" --season "2025-2026" --players "Erling Haaland" "Mohamed Salah"
```

Outro exemplo:

```powershell
.\.venv\Scripts\python.exe examples\export_c05_from_understat.py --league "ESP-La Liga" --season "2025-2026" --players "Lamine Yamal" "Kylian Mbappe"
```

## Personalizar métricas

```powershell
.\.venv\Scripts\python.exe examples\export_c05_from_understat.py --sample --players "Bukayo Saka" "Lamine Yamal" --metrics "xG/90,xA/90,Chutes/90,KP/90,xGChain/90"
```

## Importação no ADQL UI

1. Abra o ADQL UI.
2. Selecione **C-05 — Player Comparison**.
3. Use o card **Analytics Layer**.
4. Importe `analytics/outputs/c05_understat_player_comparison.json`.
5. Ajuste manualmente se necessário.
6. Exporte PNG/HTML.

## Observação metodológica

O Understat é mais útil para leitura ofensiva: volume de finalizações, xG, xA, key passes e participação na cadeia de xG. Para métricas defensivas e progressão ampla, use o pipeline FBref → C-05.
