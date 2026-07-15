# Pipeline FBref → C-05 Player Comparison

Este pipeline busca estatísticas públicas do FBref via `soccerdata`, calcula métricas por 90 minutos e transforma os valores em percentis de 0 a 100 para o componente C-05 do ADQL UI.

## Arquivos adicionados

```text
analytics/src/adql_analytics/sources/fbref_players.py
analytics/src/adql_analytics/transforms/player_comparison.py
analytics/examples/export_c05_from_fbref.py
```

## Teste sem internet

```powershell
python examples\export_c05_from_fbref.py --sample --players "Bukayo Saka" "Mohamed Salah"
```

Saída esperada:

```text
analytics/outputs/c05_fbref_player_comparison.json
```

## Uso com FBref real

```powershell
python examples\export_c05_from_fbref.py --league "ENG-Premier League" --season "2025-2026" --players "Bukayo Saka" "Mohamed Salah"
```

Exemplo usando Top-5 ligas europeias combinadas:

```powershell
python examples\export_c05_from_fbref.py --league "Big 5 European Leagues Combined" --season "2025-2026" --players "Kylian Mbappe" "Lamine Yamal"
```

## Métricas exportadas

- Gols/90
- Assistências/90
- xG/90
- xAG/90
- Chutes/90
- Progressão/90
- Defesa/90

Os valores enviados ao C-05 são percentis normalizados em escala 0-100. Os valores brutos ficam no JSON em `data.rawMetrics` para consulta, mas o importador visual do C-05 usa os percentis para radar e barras.

## Observações

- Use nomes de jogadores entre aspas.
- Se um nome não for encontrado, o script tenta uma correspondência aproximada.
- O CSV bruto normalizado é salvo em `analytics/data/raw/fbref_players_raw.csv`.
- O FBref pode bloquear ou atrasar scraping em alguns momentos. Se isso ocorrer, tente novamente depois ou rode sem `--no-cache`.
