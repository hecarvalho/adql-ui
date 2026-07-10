const playerComparisonData = {
  kicker: "Player comparison",
  title: "Comparação de jogadores",
  subtitle: "Perfis ofensivos • Temporada 2025/26",
  code: "C-05",

  teams: {
    A: "Time A",
    B: "Time B"
  },

  radarMaxValue: 100,

  players: [
    {
      id: "player-a-1",
      team: "A",
      name: "Jogador A1"
    },
    {
      id: "player-a-2",
      team: "A",
      name: "Jogador A2"
    },
    {
      id: "player-b-1",
      team: "B",
      name: "Jogador B1"
    },
    {
      id: "player-b-2",
      team: "B",
      name: "Jogador B2"
    }
  ],

  radarMetrics: [
    {
      id: "radar-creation",
      label: "Criação",
      values: {
        "player-a-1": 84,
        "player-a-2": 71,
        "player-b-1": 76,
        "player-b-2": 63
      }
    },
    {
      id: "radar-finishing",
      label: "Finalização",
      values: {
        "player-a-1": 72,
        "player-a-2": 86,
        "player-b-1": 68,
        "player-b-2": 79
      }
    },
    {
      id: "radar-progression",
      label: "Progressão",
      values: {
        "player-a-1": 78,
        "player-a-2": 62,
        "player-b-1": 88,
        "player-b-2": 70
      }
    },
    {
      id: "radar-dribble",
      label: "Drible",
      values: {
        "player-a-1": 66,
        "player-a-2": 81,
        "player-b-1": 73,
        "player-b-2": 85
      }
    },
    {
      id: "radar-pressing",
      label: "Pressão",
      values: {
        "player-a-1": 75,
        "player-a-2": 68,
        "player-b-1": 82,
        "player-b-2": 74
      }
    },
    {
      id: "radar-passing",
      label: "Passe",
      values: {
        "player-a-1": 88,
        "player-a-2": 76,
        "player-b-1": 79,
        "player-b-2": 67
      }
    }
  ],

  barMetrics: [
    {
      id: "bar-xg90",
      label: "xG / 90",
      unit: "",
      maxValue: 0.8,
      decimals: 2,
      values: {
        "player-a-1": 0.62,
        "player-a-2": 0.54,
        "player-b-1": 0.47,
        "player-b-2": 0.58
      }
    },
    {
      id: "bar-key-passes",
      label: "Passes-chave / 90",
      unit: "",
      maxValue: 4,
      decimals: 1,
      values: {
        "player-a-1": 3.1,
        "player-a-2": 2.4,
        "player-b-1": 3.5,
        "player-b-2": 2.8
      }
    }
  ],

  readingTitle: "Perfis diferentes, impacto comparável",
  readingText:
    "O radar mostra onde cada jogador concentra seu impacto. As barras ajudam a comparar métricas objetivas na mesma escala.",
  keyText:
    "Use o radar para enxergar o perfil e as barras para quantificar diferenças específicas.",
  source: "Dados próprios • Modelo ADQL"
};
