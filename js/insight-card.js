/* ==========================================================
   ADQL UI
   C-02 — INSIGHT CARD
   Auditoria funcional v1
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
    target.textContent = value ?? "";
  }
}

function setTextBySelector(
  selector,
  value
) {
  const target =
    document.querySelector(selector);

  if (target) {
    target.textContent = value ?? "";
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

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    return null;
  }

  return parsed;
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

function toRelativePercent(
  primaryValue,
  comparisonValue
) {
  if (
    primaryValue === null ||
    comparisonValue === null
  ) {
    return 0;
  }

  const total =
    primaryValue + comparisonValue;

  if (
    total <= 0 ||
    primaryValue <= 0
  ) {
    return 0;
  }

  const rawPercent =
    (primaryValue / total) * 100;

  return clampInsightValue(
    rawPercent,
    INSIGHT_VISUAL_SCALE
      .minVisiblePercent,
    INSIGHT_VISUAL_SCALE
      .maxVisiblePercent
  );
}

function calculateXgPerShot(
  xg,
  shots
) {
  if (
    xg === null ||
    shots === null ||
    shots <= 0
  ) {
    return null;
  }

  return xg / shots;
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

  const homeXg =
    parseInsightNumber(
      document
        .getElementById("homeXg")
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

  const homeXgPerShot =
    calculateXgPerShot(
      homeXg,
      homeShots
    );

  const awayXgPerShot =
    calculateXgPerShot(
      awayXg,
      awayShots
    );

  const homeVolumePercent =
    toRelativePercent(
      homeShots,
      awayShots
    );

  const awayEfficiencyPercent =
    toRelativePercent(
      awayXgPerShot,
      homeXgPerShot
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
  if (!data) {
    return;
  }

  const home = data.home ?? {};
  const away = data.away ?? {};

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
    home.team
  );

  setTextById(
    "homeShots",
    home.shots
  );

  setTextById(
    "homeXg",
    home.xg
  );

  setTextBySelector(
    ".ic-team-block:not(.ic-team-block-away) .ic-team-reading",
    home.reading
  );

  setTextById(
    "awayTeam",
    away.team
  );

  setTextById(
    "awayShots",
    away.shots
  );

  setTextById(
    "awayXg",
    away.xg
  );

  setTextBySelector(
    ".ic-team-block-away .ic-team-reading",
    away.reading
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
