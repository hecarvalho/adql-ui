const playData = {
  kicker: "Campo tático",
  title: "Atrair por fora, atacar por dentro",
  subtitle: "França × Marrocos • Quartas de final",
  reading:
    "A equipe atrai a pressão no corredor lateral, conecta por dentro e acelera no espaço antes da recomposição defensiva.",
  source: "Vídeo-análise • Dados próprios",

  stepCopy: [
    {
      title: "Atrair",
      text: "Fixar a pressão no corredor lateral."
    },
    {
      title: "Conectar",
      text: "Encontrar o apoio por dentro."
    },
    {
      title: "Acelerar",
      text: "Atacar o espaço livre no lado oposto."
    }
  ],

  players: [
    { id: "p1", x: 150, y: 420, type: "team" },
    { id: "p2", x: 300, y: 350, type: "team" },
    { id: "p3", x: 462, y: 292, type: "highlight" },
    { id: "p4", x: 632, y: 222, type: "team" },
    { id: "p5", x: 785, y: 135, type: "team" },
    { id: "o1", x: 225, y: 230, type: "opponent" },
    { id: "o2", x: 395, y: 215, type: "opponent" },
    { id: "o3", x: 570, y: 312, type: "opponent" },
    { id: "o4", x: 730, y: 365, type: "opponent" }
  ],

  zones: [
    { x: 520, y: 120, w: 300, h: 340 }
  ],

  passes: [
    { from: "p1", to: "p2", bend: 0.12 },
    { from: "p2", to: "p3", bend: 0.18 },
    { from: "p3", to: "p4", bend: 0.14 }
  ],

  runs: [
    { from: "p4", to: "p5", bend: -0.22 }
  ],

  carries: [
    {
      from: "p3",
      to: "p4",
      control1: { x: 58, y: -42 },
      control2: { x: -57, y: 14 }
    }
  ],

  pressures: [
    { playerId: "o1", r: 32 },
    { playerId: "o2", r: 30 }
  ],

  gates: [
    { x1: 440, y1: 202, x2: 478, y2: 378 }
  ],

  steps: [
    { playerId: "p1", number: 1 },
    { playerId: "p3", number: 2 },
    { playerId: "p5", number: 3 }
  ]
};

window.playData = playData;
