# ADQL Analytics Layer V1

Camada Python auxiliar para complementar o **ADQL UI** com fontes gratuitas de dados de futebol, tratamento em `pandas`, visualizações com `mplsoccer` e exportação de JSON compatível com os componentes visuais do projeto.

Esta camada não substitui o editor web. Ela prepara dados, gráficos e estruturas para alimentar os componentes do ADQL UI.

## Objetivo

Fluxo recomendado:

```text
dados gratuitos / CSV / APIs / StatsBomb Open Data
        ↓
Python + pandas + soccerdata + statsbombpy + mplsoccer
        ↓
limpeza, métricas, rankings, percentis e gráficos
        ↓
JSON ADQL ou imagem PNG
        ↓
ADQL UI
        ↓
postagem no Notion, Instagram e LinkedIn
```

## Fontes previstas

| Fonte | Uso principal | Módulo |
|---|---|---|
| FBref via soccerdata | estatísticas de equipes e jogadores | `sources/fbref.py` |
| Understat via soccerdata | xG, xA, chutes e dados ofensivos | `sources/understat.py` |
| ClubElo via soccerdata | força relativa das equipes | `sources/clubelo.py` |
| Football-Data.co.uk | resultados, forma recente e odds históricas | `sources/football_data_co_uk.py` |
| football-data.org | calendário, resultados, tabelas e artilheiros | `sources/football_data_org.py` |
| StatsBomb Open Data | eventos avançados abertos | `sources/statsbomb_open.py` |
| TheSportsDB | metadados, eventos, equipes e imagens | `sources/thesportsdb.py` |

## Instalação

Entre na pasta `analytics/` e crie o ambiente:

```bash
python -m venv .venv
```

Ative o ambiente:

```bash
# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate
```

Instale as dependências:

```bash
pip install -r requirements.txt
```

Copie o arquivo de ambiente:

```bash
cp .env.example .env
```

No Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## Variáveis opcionais

Algumas fontes funcionam sem chave. Outras podem exigir API key ou ter limites.

```env
FOOTBALL_DATA_ORG_TOKEN=
THESPORTSDB_API_KEY=
```

## Primeiros testes

```bash
python examples/smoke_test.py
```

Exportar uma tabela simples para o ADQL C-06:

```bash
python examples/export_c06_table_example.py
```

O arquivo será gerado em:

```text
outputs/c06_table_example.json
```

## Convenção de saída para o ADQL UI

A camada gera arquivos JSON pensados para serem colados/importados futuramente no editor:

```text
outputs/
├── c03_scene_*.json
├── c04_radar_*.json
├── c05_player_comparison_*.json
└── c06_table_*.json
```

Nesta V1, a integração automática com o editor web ainda não está incluída. O objetivo é consolidar a coleta, transformação e exportação.

## Cuidados

- Respeite os termos de uso das fontes.
- Use cache local para evitar consultas repetidas.
- Não faça scraping agressivo.
- Sempre valide estatísticas com vídeo e contexto tático.
- Dados gratuitos podem mudar formato, cobertura e disponibilidade.
