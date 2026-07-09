function formatComparisonValue(value, type) {
  const number = Number(value);

  if (type === "percent") {
    return `${Math.round(number)}%`;
  }

  if (type === "decimal") {
    return number.toFixed(2);
  }

  return String(Math.round(number));
}

function formatComparisonDiff(home, away, type, homeName, awayName) {
  const homeNumber = Number(home);
  const awayNumber = Number(away);
  const diff = homeNumber - awayNumber;
  const winner = diff >= 0 ? homeName : awayName;
  const abs = Math.abs(diff);

  let value;

  if (type === "percent") {
    value = `${Math.round(abs)}%`;
  } else if (type === "decimal") {
    value = abs.toFixed(2);
  } else {
    value = Math.round(abs);
  }

  return `+${value} ${winner}`;
}

function getHomeShare(home, away) {
  const homeNumber = Number(home);
  const awayNumber = Number(away);
  const total = homeNumber + awayNumber;

  if (!Number.isFinite(total) || total <= 0) {
    return 50;
  }

  return (homeNumber / total) * 100;
}

function createMetricRow(metric, data) {
  const article = document.createElement("article");
  article.className = "mc-metric";
  article.dataset.metricId = metric.id;

  const homeShare = getHomeShare(metric.home, metric.away);

  article.innerHTML = `
    <div class="mc-metric-label">${metric.label}</div>

    <div class="mc-metric-content">
      <strong class="mc-home-value" data-metric="${metric.id}" data-side="home">
        ${formatComparisonValue(metric.home, metric.type)}
      </strong>

      <div class="mc-bar">
        <span class="mc-bar-fill" style="width:${homeShare}%"></span>
        <i style="left:${homeShare}%"></i>
        <em>
          ${formatComparisonDiff(
            metric.home,
            metric.away,
            metric.type,
            data.home.name,
            data.away.name
          )}
        </em>
      </div>

      <strong class="mc-away-value" data-metric="${metric.id}" data-side="away">
        ${formatComparisonValue(metric.away, metric.type)}
      </strong>
    </div>
  `;

  return article;
}

function renderComparison(data) {
  if (!data) return;

  const homeTitle = document.getElementById("homeTitle");
  const awayTitle = document.getElementById("awayTitle");
  const matchSubtitle = document.getElementById("matchSubtitle");
  const homeTeamLabel = document.getElementById("homeTeamLabel");
  const awayTeamLabel = document.getElementById("awayTeamLabel");
  const sourceText = document.getElementById("sourceText");
  const versionText = document.getElementById("comparisonVersion");
  const metricsContainer = document.getElementById("comparisonMetrics");

  if (homeTitle) homeTitle.textContent = data.home.name;
  if (awayTitle) awayTitle.textContent = data.away.name;
  if (matchSubtitle) matchSubtitle.textContent = data.subtitle;
  if (homeTeamLabel) homeTeamLabel.textContent = data.home.name;
  if (awayTeamLabel) awayTeamLabel.textContent = data.away.name;
  if (sourceText) sourceText.textContent = data.source;
  if (versionText) versionText.textContent = data.version;

  if (metricsContainer) {
    metricsContainer.innerHTML = "";

    data.metrics.forEach((metric) => {
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