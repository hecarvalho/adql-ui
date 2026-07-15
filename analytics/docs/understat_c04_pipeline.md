# Understat → C-04 Radar Profile

Este pipeline gera um JSON compatível com o **C-04 — Radar Profile** a partir de dados públicos do Understat coletados via `soccerdata`.

## Objetivo

Transformar métricas ofensivas de jogadores em um radar editorial do ADQL UI.

Fluxo:

```text
Understat / soccerdata
→ pandas
→ métricas por 90
→ percentis 0–100
→ JSON C-04
→ ADQL UI / Radar Profile
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

Os valores enviados ao radar são percentis. Os valores brutos ficam em `data.rawMetrics` para conferência editorial.

## Teste sem internet

```powershell
.\.venv\Scripts\python.exe examples\export_c04_from_understat.py --sample --player "Bukayo Saka"
```

Saída esperada:

```text
analytics/outputs/c04_understat_radar_profile.json
```

## Teste com Understat real

```powershell
.\.venv\Scripts\python.exe examples\export_c04_from_understat.py --league "ENG-Premier League" --season "2025-2026" --player "Erling Haaland"
```

Outro exemplo:

```powershell
.\.venv\Scripts\python.exe examples\export_c04_from_understat.py --league "ESP-La Liga" --season "2025-2026" --player "Lamine Yamal"
```

## Métricas customizadas

```powershell
.\.venv\Scripts\python.exe examples\export_c04_from_understat.py --sample --player "Mohamed Salah" --metrics "xG/90,xA/90,Chutes/90,KP/90,xGChain/90"
```

## Observação editorial

O Understat é útil para leitura de volume ofensivo, qualidade de chance e participação na cadeia de xG. Não substitui vídeo, contexto tático ou tracking físico.
