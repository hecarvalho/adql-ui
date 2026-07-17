# API-Football Full Fixture Bundle V3

## Correção principal

A V2 usava `/fixtures?ids=...` como padrão no modo `--full`.
No plano gratuito, a API-Football pode bloquear esse parâmetro com o erro:

```text
Free plans do not have access to the Ids parameter.
```

A V3 muda o padrão para:

```text
/fixtures?id=FIXTURE_ID
```

Assim o modo `--full` volta a ser compatível com o plano Free.

## Comando recomendado no plano gratuito

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-id 123456 --full
```

Para mais de uma partida, o script repete uma chamada por fixture:

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-ids 123456 123457 --full
```

Isso consome uma requisição por fixture, mas evita o parâmetro `ids` bloqueado.

## Modo para plano pago ou quando `ids` estiver liberado

```powershell
.\.venv\Scripts\python.exe examples\update_database_from_api_football.py --fixture-ids 123456 123457 --full --use-ids-param
```

## Patch de JSON estrito

Esta versão também reaplica a correção de JSON:

```text
NaN / Infinity / -Infinity → null
```

Isso evita erro no importador do ADQL UI:

```text
Unexpected token 'N', ... NaN ... is not valid JSON
```

## Exportação depois da coleta

```powershell
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode matches
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode team-stats
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode player-stats
.\.venv\Scripts\python.exe examples\export_c06_from_api_football.py --mode events
```
