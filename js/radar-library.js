const RADAR_SVG_NS = "http://www.w3.org/2000/svg";

function radarSVG(tag, attrs = {}) {
  const el = document.createElementNS(RADAR_SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function polarPoint(cx, cy, radius, angle) {
  const rad = (Math.PI / 180) * angle;

  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad)
  };
}

function radarPolygonPoints(values, maxValue, cx, cy, radius) {
  const total = values.length;

  return values
    .map((value, index) => {
      const angle = -90 + (360 / total) * index;
      const point = polarPoint(cx, cy, radius * (value / maxValue), angle);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function drawRadar(svg, data) {
  const cx = 450;
  const cy = 410;
  const radius = 355;
  const maxValue = data.maxValue || 100;
  const metrics = data.metrics;
  const total = metrics.length;

  svg.innerHTML = "";

  for (let level = 1; level <= 5; level++) {
    const levelRadius = (radius / 5) * level;

    const points = metrics
      .map((_, index) => {
        const angle = -90 + (360 / total) * index;
        const p = polarPoint(cx, cy, levelRadius, angle);
        return `${p.x},${p.y}`;
      })
      .join(" ");

    svg.appendChild(
      radarSVG("polygon", {
        points,
        fill: level % 2 === 0 ? "#071F3D" : "none",
        opacity: level % 2 === 0 ? "0.018" : "1",
        stroke: "#D9D2C5",
        "stroke-width": "1.15"
      })
    );
  }

  metrics.forEach((metric, index) => {
    const angle = -90 + (360 / total) * index;
    const end = polarPoint(cx, cy, radius, angle);
    const label = polarPoint(cx, cy, radius + 78, angle);

    svg.appendChild(
      radarSVG("line", {
        x1: cx,
        y1: cy,
        x2: end.x,
        y2: end.y,
        stroke: "#D9D2C5",
        "stroke-width": "1.15"
      })
    );

    const text = radarSVG("text", {
      x: label.x,
      y: label.y,
      fill: "#071F3D",
      "font-family": "Inter, Arial, sans-serif",
      "font-size": "20",
      "font-weight": "800",
      "text-anchor": label.x < cx - 20 ? "end" : label.x > cx + 20 ? "start" : "middle"
    });

    text.textContent = metric.label.toUpperCase();
    svg.appendChild(text);
  });

  const homeValues = metrics.map((metric) => metric.home);
  const awayValues = metrics.map((metric) => metric.away);

  const homePoints = radarPolygonPoints(homeValues, maxValue, cx, cy, radius);
  const awayPoints = radarPolygonPoints(awayValues, maxValue, cx, cy, radius);

  svg.appendChild(
    radarSVG("polygon", {
      points: homePoints,
      fill: "#C58B12",
      opacity: "0.18",
      stroke: "#C58B12",
      "stroke-width": "5",
      "stroke-linejoin": "round"
    })
  );

  svg.appendChild(
    radarSVG("polygon", {
      points: awayPoints,
      fill: "#071F3D",
      opacity: "0.105",
      stroke: "#071F3D",
      "stroke-width": "5",
      "stroke-linejoin": "round"
    })
  );

  homeValues.forEach((value, index) => {
    const angle = -90 + (360 / total) * index;
    const point = polarPoint(cx, cy, radius * (value / maxValue), angle);

    svg.appendChild(
      radarSVG("circle", {
        cx: point.x,
        cy: point.y,
        r: "9",
        fill: "#C58B12",
        stroke: "#FFFDF8",
        "stroke-width": "4"
      })
    );
  });

  awayValues.forEach((value, index) => {
    const angle = -90 + (360 / total) * index;
    const point = polarPoint(cx, cy, radius * (value / maxValue), angle);

    svg.appendChild(
      radarSVG("circle", {
        cx: point.x,
        cy: point.y,
        r: "8",
        fill: "#071F3D",
        stroke: "#FFFDF8",
        "stroke-width": "4"
      })
    );
  });

  svg.appendChild(
    radarSVG("circle", {
      cx,
      cy,
      r: "6",
      fill: "#071F3D"
    })
  );
}