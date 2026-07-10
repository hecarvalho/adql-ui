/* ==========================================================
   ADQL UI
   C-04 — RADAR PROFILE
========================================================== */

function radarSetText(id, value) {
  const target = document.getElementById(id);

  if (target) {
    target.textContent = value ?? "";
  }
}

function radarCreateMetricCard(card, index) {
  const item = document.createElement("article");
  item.className = "rp-metric-card";
  item.dataset.radarCardIndex = String(index);

  const label = document.createElement("span");
  label.textContent = card?.label ?? "";

  const value = document.createElement("strong");
  value.textContent = card?.value ?? "";

  const text = document.createElement("p");
  text.textContent = card?.text ?? "";

  item.appendChild(label);
  item.appendChild(value);
  item.appendChild(text);

  return item;
}

function radarGetSvgBox(svg) {
  const viewBox = svg?.viewBox?.baseVal;

  if (
    viewBox &&
    Number.isFinite(viewBox.width) &&
    viewBox.width > 0 &&
    Number.isFinite(viewBox.height) &&
    viewBox.height > 0
  ) {
    return {
      x: viewBox.x || 0,
      y: viewBox.y || 0,
      width: viewBox.width,
      height: viewBox.height
    };
  }

  const width =
    Number(svg?.getAttribute("width")) ||
    svg?.clientWidth ||
    900;

  const height =
    Number(svg?.getAttribute("height")) ||
    svg?.clientHeight ||
    820;

  return {
    x: 0,
    y: 0,
    width,
    height
  };
}

function radarClamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function radarEstimateLabelWidth(text) {
  const safeText = String(text ?? "").trim();

  return Math.max(42, safeText.length * 8.2);
}

function radarNormalizeMetricLabels(svg, data) {
  if (!svg || !data) {
    return;
  }

  const metrics = Array.isArray(data.metrics)
    ? data.metrics
    : [];

  if (!metrics.length) {
    return;
  }

  svg.style.overflow = "visible";

  const labels = Array.from(
    svg.querySelectorAll("text")
  ).slice(0, metrics.length);

  if (!labels.length) {
    return;
  }

  const box = radarGetSvgBox(svg);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  const horizontalPadding = 34;
  const topPadding = 26;
  const bottomPadding = 24;
  const sideThreshold = box.width * 0.12;
  const verticalThreshold = box.height * 0.18;

  labels.forEach((label) => {
    const rawX = Number(label.getAttribute("x")) || 0;
    const rawY = Number(label.getAttribute("y")) || 0;

    let x = rawX;
    let y = rawY;

    const dx = rawX - cx;
    const dy = rawY - cy;

    let anchor = "middle";

    if (dx > sideThreshold) {
      anchor = "end";
      x -= 14;
    } else if (dx < -sideThreshold) {
      anchor = "start";
      x += 14;
    }

    if (dy < -verticalThreshold) {
      y += 8;
    } else if (dy > verticalThreshold) {
      y -= 8;
    }

    const estimatedWidth =
      radarEstimateLabelWidth(
        label.textContent
      );

    if (anchor === "start") {
      x = radarClamp(
        x,
        box.x + horizontalPadding,
        box.x +
          box.width -
          horizontalPadding -
          estimatedWidth
      );
    } else if (anchor === "end") {
      x = radarClamp(
        x,
        box.x +
          horizontalPadding +
          estimatedWidth,
        box.x + box.width - horizontalPadding
      );
    } else {
      x = radarClamp(
        x,
        box.x +
          horizontalPadding +
          estimatedWidth / 2,
        box.x +
          box.width -
          horizontalPadding -
          estimatedWidth / 2
      );
    }

    y = radarClamp(
      y,
      box.y + topPadding,
      box.y + box.height - bottomPadding
    );

    label.setAttribute("x", String(x));
    label.setAttribute("y", String(y));
    label.setAttribute(
      "text-anchor",
      anchor
    );
    label.setAttribute(
      "dominant-baseline",
      "middle"
    );

    label.style.pointerEvents = "auto";
    label.style.userSelect = "none";
  });
}

function radarTagInteractiveNodes(svg, data) {
  if (!svg) {
    return;
  }

  const metrics = Array.isArray(data.metrics)
    ? data.metrics
    : [];

  const circles = Array.from(
    svg.querySelectorAll("circle")
  );

  const total = metrics.length;

  metrics.forEach((metric, index) => {
    const homeNode = circles[index];
    const awayNode = circles[total + index];

    if (homeNode) {
      homeNode.dataset.radarTeam = "home";
      homeNode.dataset.radarIndex = String(index);
      homeNode.style.cursor = "grab";
      homeNode.style.touchAction = "none";
      homeNode.setAttribute(
        "aria-label",
        `${data.home ?? "Equipe A"}: ${metric.label ?? "Métrica"} ${metric.home ?? 0}`
      );
    }

    if (awayNode) {
      awayNode.dataset.radarTeam = "away";
      awayNode.dataset.radarIndex = String(index);
      awayNode.style.cursor = "grab";
      awayNode.style.touchAction = "none";
      awayNode.setAttribute(
        "aria-label",
        `${data.away ?? "Equipe B"}: ${metric.label ?? "Métrica"} ${metric.away ?? 0}`
      );
    }
  });

  Array.from(svg.querySelectorAll("text"))
    .slice(0, total)
    .forEach((label, index) => {
      label.dataset.radarMetricIndex = String(index);
      label.style.cursor = "pointer";
      label.style.userSelect = "none";
    });
}

function renderRadarProfile(data = window.radarData) {
  if (!data) {
    return;
  }

  radarSetText("radarTitle", data.title);
  radarSetText("radarSubtitle", data.subtitle);
  radarSetText("homeLegend", data.home);
  radarSetText("awayLegend", data.away);
  radarSetText(
    "radarReadingTitle",
    data.readingTitle
  );
  radarSetText(
    "radarReadingText",
    data.readingText
  );
  radarSetText("radarKeyText", data.keyText);
  radarSetText("sourceText", data.source);

  const svg = document.getElementById("radarSvg");

  if (
    svg &&
    typeof drawRadar === "function"
  ) {
    drawRadar(svg, data);
    radarNormalizeMetricLabels(svg, data);
    radarTagInteractiveNodes(svg, data);
  }

  const metrics = document.getElementById("radarMetrics");

  if (metrics) {
    metrics.innerHTML = "";

    const cards = Array.isArray(data.cards)
      ? data.cards
      : [];

    cards.forEach((card, index) => {
      metrics.appendChild(
        radarCreateMetricCard(card, index)
      );
    });
  }

  window.dispatchEvent(
    new CustomEvent("adql:radar-rendered", {
      detail: { data }
    })
  );
}

window.radarData = radarData;
window.renderRadarProfile =
  renderRadarProfile;
window.radarTagInteractiveNodes =
  radarTagInteractiveNodes;
window.radarNormalizeMetricLabels =
  radarNormalizeMetricLabels;

renderRadarProfile(radarData);