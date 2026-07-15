# FBref → C-04 Radar Profile

Este pipeline gera um JSON compatível com o componente **C-04 — Radar Profile** a partir de estatísticas de jogadores do FBref via `soccerdata`.

O objetivo é criar um radar individual editável no ADQL UI, usando percentis 0–100 calculados dentro da base carregada.

## Arquivos

```text
analytics/src/adql_analytics/transforms/radar_profile.py
analytics/examples/export_c04_from_fbref.py
```

## Teste sem internet

```powershell
python examples\export_c04_from_fbref.py --sample --player "Bukayo Saka"
```

Saída esperada:

```text
analytics/outputs/c04_fbref_radar_profile.json
```

## Teste com FBref real

```powershell
python examples\export_c04_from_fbref.py --league "Big 5 European Leagues Combined" --season "2025-2026" --player "Lamine Yamal"
```

Ou:

```powershell
python examples\export_c04_from_fbref.py --league "ENG-Premier League" --season "2025-2026" --player "Bukayo Saka"
```

## Métricas padrão

As métricas reaproveitam o transformador validado no C-05:

```text
Gols/90
Assistências/90
xG/90
xAG/90
Chutes/90
Progressão/90
Defesa/90
```

O radar recebe percentis em escala 0–100. Os valores brutos ficam preservados no JSON em:

```text
data.rawMetrics
```

## Fluxo

```text
FBref / soccerdata
        ↓
pandas
        ↓
percentis 0–100
        ↓
JSON C-04
        ↓
ADQL UI / Radar Profile
```

## Observação metodológica

Os percentis dependem da base carregada. Comparar um jogador dentro de uma liga específica e comparar dentro das Big 5 gera leituras diferentes. Para publicação, informe sempre a base usada no subtítulo ou na fonte.
