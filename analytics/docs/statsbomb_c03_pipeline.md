# StatsBomb Open Data → C-03 Tactical Pitch

Este pipeline transforma uma sequência de eventos StatsBomb em um JSON compatível com o componente **C-03 — Tactical Pitch** do ADQL UI.

## O que ele gera

- pontos de evento como jogadores/nós editáveis;
- passes e conduções como setas;
- pressões como círculos de pressão;
- finalização como rota até alvo destacado;
- zona territorial do recorte;
- leitura textual e três etapas narrativas.

O resultado **não é tracking completo**. A StatsBomb Open Data fornece eventos com coordenadas, não a posição simultânea dos 22 jogadores. Portanto, o C-03 recebe uma cena tática baseada nos pontos reais da sequência e você ajusta manualmente a ocupação coletiva no ADQL UI.

## Teste sem internet

```powershell
.\.venv\Scripts\python.exe examples\export_c03_from_statsbomb.py --sample
```

Saída:

```text
analytics/outputs/c03_statsbomb_sequence.json
```

## Listar competições abertas

```powershell
.\.venv\Scripts\python.exe examples\export_c03_from_statsbomb.py --list-competitions
```

## Listar partidas

Substitua os IDs pelos retornados na listagem de competições:

```powershell
.\.venv\Scripts\python.exe examples\export_c03_from_statsbomb.py --competition-id 43 --season-id 106 --list-matches
```

## Gerar cena real por partida

```powershell
.\.venv\Scripts\python.exe examples\export_c03_from_statsbomb.py --match-id 3869685 --team "Argentina" --auto-shot
```

## Gerar cena por posse específica

```powershell
.\.venv\Scripts\python.exe examples\export_c03_from_statsbomb.py --match-id 3869685 --team "Argentina" --possession 145
```

## Gerar cena por intervalo de tempo

```powershell
.\.venv\Scripts\python.exe examples\export_c03_from_statsbomb.py --match-id 3869685 --team "Argentina" --minute-from 20 --minute-to 25 --max-events 12
```

## Importação no ADQL UI

1. Abra o ADQL UI.
2. Selecione **C-03 — Tactical Pitch**.
3. Use o card **Analytics Layer / Importar cena tática**.
4. Selecione `analytics/outputs/c03_statsbomb_sequence.json`.
5. Ajuste jogadores, setas, zonas e textos manualmente.
6. Exporte PNG/HTML.

## Observação metodológica

Este pipeline deve ser tratado como **base de reconstrução tática**, não como verdade posicional completa. Para análise de desempenho, use o JSON importado como ponto de partida e complemente com vídeo.
