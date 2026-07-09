/* ==========================================================
   ADQL UI
   C-02 — INSIGHT CARD
========================================================== */

const insight = {
  category: "Eficiência ofensiva",

  mainValue: "2,30",

  mainUnit: "xG",

  mainStatement:
    "com apenas 9 finalizações",

  mainInsight:
    "A Noruega não precisa finalizar muito para criar perigo real.",

  supportingText:
    "O dado resume uma diferença central entre os ataques: o Brasil constrói volume; a Noruega procura chegar em condições mais limpas e verticais.",

  comparisonSubtitle:
    "Volume de finalizações × qualidade das chances",

  home: {
    team: "Brasil",
    shots: 19,
    xg: "2,12",
    reading:
      "Mais volume para construir perigo."
  },

  away: {
    team: "Noruega",
    shots: 9,
    xg: "2,30",
    reading:
      "Menos volume, mas chances mais limpas."
  },

  reading:
    "O Brasil constrói volume. A Noruega procura eficiência.",

  source:
    "FIFA • Relatórios técnicos"
};

const INSIGHT_VISUAL_SCALE = {
  maxShots: 26,
  maxXgPerShot: 0.31,
  minVisiblePercent: 8,
  maxVisiblePercent: 94
};

/* ==========================================================
   TEXTO
========================================================== */

function setTextById(id, value) {
  const target =
    document.getElementById(id);

  if (target) {
    target.textContent = value;
  }
}

function setTextBySelector(
  selector,
  value
) {
  const target =
    document.querySelector(selector);

  if (target) {
    target.textContent = value;
  }
}

/* ==========================================================
   NÚMEROS
========================================================== */

function parseInsightNumber(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function clampInsightValue(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function toVisualPercent(
  value,
  referenceMax
) {
  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return 0;
  }

  const rawPercent =
    (value / referenceMax) * 100;

  return clampInsightValue(
    rawPercent,
    INSIGHT_VISUAL_SCALE
      .minVisiblePercent,
    INSIGHT_VISUAL_SCALE
      .maxVisiblePercent
  );
}

/* ==========================================================
   ESTILO DINÂMICO DAS BARRAS
========================================================== */

function ensureDynamicProfileStyles() {
  if (
    document.getElementById(
      "icDynamicProfileStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement("style");

  style.id =
    "icDynamicProfileStyles";

  style.textContent = `
    .ic-profile-line-home::before {
      width: var(
        --ic-profile-fill,
        72%
      ) !important;
    }

    .ic-profile-line-away::before {
      width: var(
        --ic-profile-fill,
        82%
      ) !important;
    }
  `;

  document.head.appendChild(style);
}

/* ==========================================================
   BARRA DE VOLUME
========================================================== */

function updateHomeProfileLine(
  percent
) {
  const line =
    document.querySelector(
      ".ic-profile-line-home"
    );

  const node =
    line?.querySelector(
      ".ic-line-node"
    );

  if (!line || !node) {
    return;
  }

  line.style.setProperty(
    "--ic-profile-fill",
    `${percent}%`
  );

  node.style.left =
    `${percent}%`;

  node.style.right = "auto";
}

/* ==========================================================
   BARRA DE EFICIÊNCIA
========================================================== */

function updateAwayProfileLine(
  percent
) {
  const line =
    document.querySelector(
      ".ic-profile-line-away"
    );

  const node =
    line?.querySelector(
      ".ic-line-node"
    );

  if (!line || !node) {
    return;
  }

  line.style.setProperty(
    "--ic-profile-fill",
    `${percent}%`
  );

  node.style.left = "auto";

  node.style.right =
    `${percent}%`;
}

/* ==========================================================
   ATUALIZAÇÃO DOS GRÁFICOS
========================================================== */

function updateInsightVisuals() {
  ensureDynamicProfileStyles();

  const homeShots =
    parseInsightNumber(
      document
        .getElementById("homeShots")
        ?.textContent
    );

  const awayShots =
    parseInsightNumber(
      document
        .getElementById("awayShots")
        ?.textContent
    );

  const awayXg =
    parseInsightNumber(
      document
        .getElementById("awayXg")
        ?.textContent
    );

  const awayXgPerShot =
    awayShots > 0
      ? awayXg / awayShots
      : 0;

  const homeVolumePercent =
    toVisualPercent(
      homeShots,
      INSIGHT_VISUAL_SCALE.maxShots
    );

  const awayEfficiencyPercent =
    toVisualPercent(
      awayXgPerShot,
      INSIGHT_VISUAL_SCALE
        .maxXgPerShot
    );

  updateHomeProfileLine(
    homeVolumePercent
  );

  updateAwayProfileLine(
    awayEfficiencyPercent
  );
}

/* ==========================================================
   RENDERIZAÇÃO
========================================================== */

function renderInsight(
  data = insight
) {
  setTextById(
    "insightCategory",
    data.category
  );

  setTextById(
    "mainValue",
    data.mainValue
  );

  setTextById(
    "mainUnit",
    data.mainUnit
  );

  setTextById(
    "mainStatement",
    data.mainStatement
  );

  setTextById(
    "mainInsight",
    data.mainInsight
  );

  setTextById(
    "supportingText",
    data.supportingText
  );

  setTextBySelector(
    ".ic-comparison-heading p",
    data.comparisonSubtitle
  );

  setTextById(
    "homeTeam",
    data.home.team
  );

  setTextById(
    "homeShots",
    data.home.shots
  );

  setTextById(
    "homeXg",
    data.home.xg
  );

  setTextBySelector(
    ".ic-team-block:not(.ic-team-block-away) .ic-team-reading",
    data.home.reading
  );

  setTextById(
    "awayTeam",
    data.away.team
  );

  setTextById(
    "awayShots",
    data.away.shots
  );

  setTextById(
    "awayXg",
    data.away.xg
  );

  setTextBySelector(
    ".ic-team-block-away .ic-team-reading",
    data.away.reading
  );

  setTextById(
    "readingText",
    data.reading
  );

  setTextById(
    "sourceText",
    data.source
  );

  updateInsightVisuals();
}

/* ==========================================================
   API DO COMPONENTE
========================================================== */

window.insight = insight;

window.renderInsight =
  renderInsight;

window.updateInsightVisuals =
  updateInsightVisuals;

/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

renderInsight(insight);