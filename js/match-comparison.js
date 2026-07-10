/* ==========================================================
   ADQL UI
   C-01 — MATCH COMPARISON
   Auditoria funcional v1
========================================================== */

function parseComparisonNumber(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (normalized === "") {
    return null;
  }

  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : null;
}

function clampComparisonValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatComparisonValue(value, type) {
  const number = parseComparisonNumber(value);

  if (number === null) {
    return "—";
  }

  if (type === "percent") {
    return `${Math.round(number)}%`;
  }

  if (type === "decimal") {
    return number.toFixed(2);
  }

  return String(Math.round(number));
}

function formatComparisonDiff(
  home,
  away,
  type,
  homeName,
  awayName
) {
  const homeNumber = parseComparisonNumber(home);
  const awayNumber = parseComparisonNumber(away);

  if (
    homeNumber === null ||
    awayNumber === null
  ) {
    return "SEM DADO";
  }

  const diff = homeNumber - awayNumber;

  if (Math.abs(diff) < Number.EPSILON) {
    return "EMPATE";
  }

  const leader = diff > 0
    ? homeName
    : awayName;

  const abs = Math.abs(diff);

  let value;

  if (type === "percent") {
    value = `${Math.round(abs)}%`;
  } else if (type === "decimal") {
    value = abs.toFixed(2);
  } else {
    value = Math.round(abs);
  }

  return `+${value} ${leader}`;
}

function getHomeShare(home, away) {
  const homeNumber = parseComparisonNumber(home);
  const awayNumber = parseComparisonNumber(away);

  if (
    homeNumber === null ||
    awayNumber === null
  ) {
    return 50;
  }

  const safeHome = Math.max(0, homeNumber);
  const safeAway = Math.max(0, awayNumber);
  const total = safeHome + safeAway;

  if (total <= 0) {
    return 50;
  }

  return clampComparisonValue(
    (safeHome / total) * 100,
    0,
    100
  );
}

function createMetricRow(metric, data) {
  const article = document.createElement("article");
  article.className = "mc-metric";

  if (metric?.id) {
    article.dataset.metricId = metric.id;
  }

  const label = document.createElement("div");
  label.className = "mc-metric-label";
  label.textContent = metric?.label ?? "Métrica";

  const content = document.createElement("div");
  content.className = "mc-metric-content";

  const homeValue = document.createElement("strong");
  homeValue.className = "mc-home-value";
  homeValue.dataset.metric = metric?.id ?? "";
  homeValue.dataset.side = "home";
  homeValue.textContent = formatComparisonValue(
    metric?.home,
    metric?.type
  );

  const bar = document.createElement("div");
  bar.className = "mc-bar";

  const homeShare = getHomeShare(
    metric?.home,
    metric?.away
  );

  const fill = document.createElement("span");
  fill.className = "mc-bar-fill";
  fill.style.width = `${homeShare}%`;

  const node = document.createElement("i");
  node.style.left = `${homeShare}%`;

  const diff = document.createElement("em");
  diff.textContent = formatComparisonDiff(
    metric?.home,
    metric?.away,
    metric?.type,
    data?.home?.name ?? "Time A",
    data?.away?.name ?? "Time B"
  );

  bar.appendChild(fill);
  bar.appendChild(node);
  bar.appendChild(diff);

  const awayValue = document.createElement("strong");
  awayValue.className = "mc-away-value";
  awayValue.dataset.metric = metric?.id ?? "";
  awayValue.dataset.side = "away";
  awayValue.textContent = formatComparisonValue(
    metric?.away,
    metric?.type
  );

  content.appendChild(homeValue);
  content.appendChild(bar);
  content.appendChild(awayValue);

  article.appendChild(label);
  article.appendChild(content);

  return article;
}

function renderComparison(data) {
  if (!data) {
    return;
  }

  const kicker = document.querySelector(".mc-kicker");
  const homeTitle = document.getElementById("homeTitle");
  const awayTitle = document.getElementById("awayTitle");
  const matchSubtitle = document.getElementById("matchSubtitle");
  const homeTeamLabel = document.getElementById("homeTeamLabel");
  const awayTeamLabel = document.getElementById("awayTeamLabel");
  const sourceText = document.getElementById("sourceText");
  const versionText = document.getElementById("comparisonVersion");
  const metricsContainer = document.getElementById("comparisonMetrics");

  if (kicker) {
    kicker.textContent = data.title ?? "Comparativo estatístico";
  }

  if (homeTitle) {
    homeTitle.textContent = data.home?.name ?? "Time A";
  }

  if (awayTitle) {
    awayTitle.textContent = data.away?.name ?? "Time B";
  }

  if (matchSubtitle) {
    matchSubtitle.textContent = data.subtitle ?? "";
  }

  if (homeTeamLabel) {
    homeTeamLabel.textContent = data.home?.name ?? "Time A";
  }

  if (awayTeamLabel) {
    awayTeamLabel.textContent = data.away?.name ?? "Time B";
  }

  if (sourceText) {
    sourceText.textContent = data.source ?? "";
  }

  if (versionText) {
    versionText.textContent = data.version ?? "";
  }

  if (metricsContainer) {
    metricsContainer.innerHTML = "";

    const metrics = Array.isArray(data.metrics)
      ? data.metrics
      : [];

    metrics.forEach((metric) => {
      metricsContainer.appendChild(
        createMetricRow(metric, data)
      );
    });
  }
}

window.renderComparison = renderComparison;

window.addEventListener("load", () => {
  if (window.comparisonData) {
    window.renderComparison(window.comparisonData);
  }
});
