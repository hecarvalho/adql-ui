/* ==========================================================
   ADQL UI
   C-05 — PLAYER COMPARISON
========================================================== */

const PC_SVG_NS = "http://www.w3.org/2000/svg";

const PC_TEAM_PALETTES = {
  A: ["#C58B12", "#E3AA32", "#9B6A0C", "#F0C45D", "#B77C09"],
  B: ["#071F3D", "#294A70", "#4B6B91", "#18385E", "#6A84A3"]
};

const PC_RADAR_GEOMETRY = {
  cx: 450,
  cy: 330,
  radius: 240,
  labelRadius: 294,
  levels: 5
};

function pcSvg(tag, attrs = {}) {
  const element = document.createElementNS(PC_SVG_NS, tag);

  Object.entries(attrs).forEach(([key, value]) => {
    element.setAttribute(key, String(value));
  });

  return element;
}

function pcSetText(id, value) {
  const target = document.getElementById(id);

  if (target) {
    target.textContent = value ?? "";
  }
}

function pcSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function pcNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pcClamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pcUid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function pcNormalizeData(data) {
  data.kicker ??= "Player comparison";
  data.title ??= "Comparação de jogadores";
  data.subtitle ??= "";
  data.code ??= "C-05";
  data.teams ??= { A: "Time A", B: "Time B" };
  data.teams.A ??= "Time A";
  data.teams.B ??= "Time B";
  data.radarMaxValue = Math.max(1, pcNumber(data.radarMaxValue, 100));
  data.players = pcSafeArray(data.players);
  data.radarMetrics = pcSafeArray(data.radarMetrics);
  data.barMetrics = pcSafeArray(data.barMetrics);

  data.players.forEach((player, index) => {
    player.id ||= pcUid(`player-${index + 1}`);
    player.team = player.team === "B" ? "B" : "A";
    player.name ||= `Jogador ${index + 1}`;
  });

  data.radarMetrics.forEach((metric, index) => {
    metric.id ||= pcUid(`radar-${index + 1}`);
    metric.label ||= `Métrica ${index + 1}`;
    metric.values ||= {};

    data.players.forEach((player) => {
      metric.values[player.id] = pcClamp(
        pcNumber(metric.values[player.id], 0),
        0,
        data.radarMaxValue
      );
    });
  });

  data.barMetrics.forEach((metric, index) => {
    metric.id ||= pcUid(`bar-${index + 1}`);
    metric.label ||= `Métrica ${index + 1}`;
    metric.unit ??= "";
    metric.decimals = pcClamp(Math.round(pcNumber(metric.decimals, 1)), 0, 3);
    metric.values ||= {};

    data.players.forEach((player) => {
      metric.values[player.id] = Math.max(
        0,
        pcNumber(metric.values[player.id], 0)
      );
    });

    const biggestValue = Math.max(
      0,
      ...Object.values(metric.values).map((value) => pcNumber(value, 0))
    );

    metric.maxValue = Math.max(
      pcNumber(metric.maxValue, biggestValue || 1),
      biggestValue,
      0.0001
    );
  });

  data.readingTitle ??= "Leitura comparativa";
  data.readingText ??= "";
  data.keyText ??= "";
  data.source ??= "";
}

function pcGetTeamPlayers(data, team) {
  return data.players.filter((player) => player.team === team);
}

function pcGetPlayerColor(data, playerId) {
  const player = data.players.find((item) => item.id === playerId);

  if (!player) {
    return PC_TEAM_PALETTES.A[0];
  }

  const teamPlayers = pcGetTeamPlayers(data, player.team);
  const index = Math.max(
    0,
    teamPlayers.findIndex((item) => item.id === player.id)
  );

  const palette = PC_TEAM_PALETTES[player.team] || PC_TEAM_PALETTES.A;
  return palette[index % palette.length];
}

function pcPolarPoint(cx, cy, radius, angleDeg) {
  const angle = (Math.PI / 180) * angleDeg;

  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

function pcRadarAngle(index, total) {
  return -90 + (360 / total) * index;
}

function pcRadarPoints(values, maxValue) {
  const { cx, cy, radius } = PC_RADAR_GEOMETRY;
  const total = values.length;

  return values
    .map((value, index) => {
      const point = pcPolarPoint(
        cx,
        cy,
        radius * (pcClamp(value, 0, maxValue) / maxValue),
        pcRadarAngle(index, total)
      );

      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function pcRadarLabelAnchor(point) {
  const { cx } = PC_RADAR_GEOMETRY;

  if (point.x < cx - 22) {
    return "end";
  }

  if (point.x > cx + 22) {
    return "start";
  }

  return "middle";
}

function pcDrawEmptyRadar(svg, message) {
  svg.innerHTML = "";

  const text = pcSvg("text", {
    x: 450,
    y: 330,
    fill: "#6F7680",
    "font-family": "Inter, Arial, sans-serif",
    "font-size": 18,
    "font-weight": 700,
    "text-anchor": "middle"
  });

  text.textContent = message;
  svg.appendChild(text);
}

function pcDrawRadar(svg, data) {
  const metrics = data.radarMetrics;
  const players = data.players;

  if (!metrics.length) {
    pcDrawEmptyRadar(svg, "Adicione métricas ao radar");
    return;
  }

  if (!players.length) {
    pcDrawEmptyRadar(svg, "Adicione jogadores para comparar");
    return;
  }

  const { cx, cy, radius, labelRadius, levels } = PC_RADAR_GEOMETRY;
  const total = metrics.length;
  const maxValue = Math.max(1, pcNumber(data.radarMaxValue, 100));

  svg.innerHTML = "";

  for (let level = 1; level <= levels; level += 1) {
    const levelRadius = (radius / levels) * level;
    const points = metrics
      .map((_, index) => {
        const point = pcPolarPoint(
          cx,
          cy,
          levelRadius,
          pcRadarAngle(index, total)
        );

        return `${point.x},${point.y}`;
      })
      .join(" ");

    svg.appendChild(
      pcSvg("polygon", {
        points,
        fill: level % 2 === 0 ? "#071F3D" : "none",
        opacity: level % 2 === 0 ? 0.018 : 1,
        stroke: "#D9D2C5",
        "stroke-width": 1.1
      })
    );
  }

  metrics.forEach((metric, index) => {
    const angle = pcRadarAngle(index, total);
    const end = pcPolarPoint(cx, cy, radius, angle);
    const labelPoint = pcPolarPoint(cx, cy, labelRadius, angle);

    svg.appendChild(
      pcSvg("line", {
        x1: cx,
        y1: cy,
        x2: end.x,
        y2: end.y,
        stroke: "#D9D2C5",
        "stroke-width": 1.1
      })
    );

    const label = pcSvg("text", {
      x: labelPoint.x,
      y: labelPoint.y,
      class: "pc-radar-label",
      "text-anchor": pcRadarLabelAnchor(labelPoint),
      "dominant-baseline": "middle",
      "data-radar-metric-id": metric.id
    });

    label.textContent = String(metric.label ?? "").toUpperCase();
    svg.appendChild(label);
  });

  players.forEach((player) => {
    const values = metrics.map((metric) =>
      pcClamp(pcNumber(metric.values?.[player.id], 0), 0, maxValue)
    );

    const color = pcGetPlayerColor(data, player.id);
    const points = pcRadarPoints(values, maxValue);

    svg.appendChild(
      pcSvg("polygon", {
        points,
        fill: color,
        opacity: player.team === "A" ? 0.085 : 0.065,
        stroke: color,
        "stroke-width": 3.5,
        "stroke-linejoin": "round",
        "data-radar-player-id": player.id
      })
    );
  });

  players.forEach((player) => {
    const color = pcGetPlayerColor(data, player.id);

    metrics.forEach((metric, index) => {
      const value = pcClamp(
        pcNumber(metric.values?.[player.id], 0),
        0,
        maxValue
      );
      const point = pcPolarPoint(
        cx,
        cy,
        radius * (value / maxValue),
        pcRadarAngle(index, total)
      );

      const circle = pcSvg("circle", {
        cx: point.x,
        cy: point.y,
        r: player.team === "A" ? 7.5 : 7,
        fill: color,
        stroke: "#FFFDF8",
        "stroke-width": 3.4,
        class: "pc-radar-node",
        "data-player-id": player.id,
        "data-radar-metric-id": metric.id,
        "aria-label": `${player.name}: ${metric.label} ${value}`
      });

      svg.appendChild(circle);
    });
  });

  svg.appendChild(
    pcSvg("circle", {
      cx,
      cy,
      r: 5.5,
      fill: "#071F3D"
    })
  );
}

function pcCreatePlayerChip(data, player) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "pc-player-chip";
  chip.dataset.playerId = player.id;
  chip.style.setProperty("--player-color", pcGetPlayerColor(data, player.id));
  chip.textContent = player.name;
  return chip;
}

function pcRenderPlayers(data) {
  const teamATarget = document.getElementById("pcTeamAPlayers");
  const teamBTarget = document.getElementById("pcTeamBPlayers");

  if (!teamATarget || !teamBTarget) {
    return;
  }

  teamATarget.innerHTML = "";
  teamBTarget.innerHTML = "";

  pcGetTeamPlayers(data, "A").forEach((player) => {
    teamATarget.appendChild(pcCreatePlayerChip(data, player));
  });

  pcGetTeamPlayers(data, "B").forEach((player) => {
    teamBTarget.appendChild(pcCreatePlayerChip(data, player));
  });

  if (!teamATarget.children.length) {
    const empty = document.createElement("span");
    empty.className = "pc-empty";
    empty.textContent = "Sem jogadores";
    teamATarget.appendChild(empty);
  }

  if (!teamBTarget.children.length) {
    const empty = document.createElement("span");
    empty.className = "pc-empty";
    empty.textContent = "Sem jogadores";
    teamBTarget.appendChild(empty);
  }
}

function pcFormatBarValue(metric, value) {
  const decimals = pcClamp(Math.round(pcNumber(metric.decimals, 1)), 0, 3);
  const formatted = pcNumber(value, 0).toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  return metric.unit ? `${formatted} ${metric.unit}` : formatted;
}

function pcCreateBarCard(data, metric) {
  const card = document.createElement("article");
  card.className = "pc-bar-card";
  card.dataset.barMetricId = metric.id;

  const head = document.createElement("div");
  head.className = "pc-bar-card-head";

  const title = document.createElement("h3");
  title.textContent = metric.label;

  const scale = document.createElement("span");
  scale.textContent = `escala máx. ${pcFormatBarValue(metric, metric.maxValue)}`;

  head.appendChild(title);
  head.appendChild(scale);
  card.appendChild(head);

  const rows = document.createElement("div");
  rows.className = "pc-bar-rows";

  data.players.forEach((player) => {
    const value = Math.max(0, pcNumber(metric.values?.[player.id], 0));
    const maxValue = Math.max(0.0001, pcNumber(metric.maxValue, 1));
    const percent = pcClamp((value / maxValue) * 100, 0, 100);
    const color = pcGetPlayerColor(data, player.id);

    const row = document.createElement("div");
    row.className = "pc-bar-row";
    row.dataset.playerId = player.id;

    const playerName = document.createElement("span");
    playerName.className = "pc-bar-player";
    playerName.textContent = player.name;

    const track = document.createElement("div");
    track.className = "pc-bar-track";

    const fill = document.createElement("div");
    fill.className = "pc-bar-fill";
    fill.style.setProperty("--bar-width", `${percent}%`);
    fill.style.setProperty("--player-color", color);

    const valueText = document.createElement("strong");
    valueText.className = "pc-bar-value";
    valueText.textContent = pcFormatBarValue(metric, value);

    track.appendChild(fill);
    row.appendChild(playerName);
    row.appendChild(track);
    row.appendChild(valueText);
    rows.appendChild(row);
  });

  if (!data.players.length) {
    const empty = document.createElement("div");
    empty.className = "pc-empty";
    empty.textContent = "Adicione jogadores para gerar as barras.";
    rows.appendChild(empty);
  }

  card.appendChild(rows);
  return card;
}

function pcRenderBars(data) {
  const target = document.getElementById("playerBarMetrics");

  if (!target) {
    return;
  }

  target.innerHTML = "";

  if (!data.barMetrics.length) {
    const empty = document.createElement("div");
    empty.className = "pc-empty";
    empty.textContent = "Adicione uma métrica para criar a comparação em barras.";
    target.appendChild(empty);
    return;
  }

  data.barMetrics.forEach((metric) => {
    target.appendChild(pcCreateBarCard(data, metric));
  });
}

function renderPlayerComparison(data = window.playerComparisonData) {
  if (!data) {
    return;
  }

  pcNormalizeData(data);

  pcSetText("pcKicker", data.kicker);
  pcSetText("pcTitle", data.title);
  pcSetText("pcSubtitle", data.subtitle);
  pcSetText("pcCode", data.code);
  pcSetText("pcTeamAName", data.teams.A);
  pcSetText("pcTeamBName", data.teams.B);
  pcSetText("pcReadingTitle", data.readingTitle);
  pcSetText("pcReadingText", data.readingText);
  pcSetText("pcKeyText", data.keyText);
  pcSetText("pcSourceText", data.source);

  pcRenderPlayers(data);

  const svg = document.getElementById("playerRadarSvg");

  if (svg) {
    pcDrawRadar(svg, data);
  }

  pcRenderBars(data);

  window.dispatchEvent(
    new CustomEvent("adql:player-comparison-rendered", {
      detail: { data }
    })
  );
}

window.playerComparisonData = playerComparisonData;
window.renderPlayerComparison = renderPlayerComparison;
window.pcNormalizeData = pcNormalizeData;
window.pcGetPlayerColor = pcGetPlayerColor;
window.pcRadarGeometry = PC_RADAR_GEOMETRY;

renderPlayerComparison(playerComparisonData);
