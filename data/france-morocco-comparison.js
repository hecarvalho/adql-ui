const comparisonData = {
  title: "Comparativo estatístico",
  version: "V3.0",

  home: {
    name: "França"
  },

  away: {
    name: "Marrocos"
  },

  subtitle: "Quartas de final • Copa do Mundo 2026",

  source: "FIFA • FBref • Dados próprios",

  metrics: [
    {
      id: "possession",
      label: "Posse de bola",
      home: 58,
      away: 42,
      type: "percent"
    },
    {
      id: "xg",
      label: "Expected Goals (xG)",
      home: 1.74,
      away: 1.08,
      type: "decimal"
    },
    {
      id: "shots",
      label: "Finalizações",
      home: 14,
      away: 9,
      type: "integer"
    },
    {
      id: "passes",
      label: "Passes certos",
      home: 541,
      away: 392,
      type: "integer"
    },
    {
      id: "recoveries",
      label: "Recuperações no campo ofensivo",
      home: 37,
      away: 29,
      type: "integer"
    }
  ]
};

window.comparisonData = comparisonData;