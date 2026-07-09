const SVG_NS = "http://www.w3.org/2000/svg";

function createSVG(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
  return el;
}

function ensureDefs(svg) {
  let defs = svg.querySelector("defs");

  if (!defs) {
    defs = createSVG("defs");
    svg.prepend(defs);
  }

  if (!svg.querySelector("#adql-arrow-gold")) {
    const marker = createSVG("marker", {
      id: "adql-arrow-gold",
      markerWidth: "12",
      markerHeight: "12",
      refX: "10",
      refY: "6",
      orient: "auto",
      markerUnits: "strokeWidth"
    });

    marker.appendChild(createSVG("path", {
      d: "M 0 1 L 12 6 L 0 11 L 3 6 Z",
      fill: "#C58B12"
    }));

    defs.appendChild(marker);
  }

  if (!svg.querySelector("#adql-arrow-blue")) {
    const marker = createSVG("marker", {
      id: "adql-arrow-blue",
      markerWidth: "12",
      markerHeight: "12",
      refX: "10",
      refY: "6",
      orient: "auto",
      markerUnits: "strokeWidth"
    });

    marker.appendChild(createSVG("path", {
      d: "M 0 1 L 12 6 L 0 11 L 3 6 Z",
      fill: "#071F3D"
    }));

    defs.appendChild(marker);
  }
}

function getLayer(svg, name) {
  let layer = svg.querySelector(`[data-layer="${name}"]`);

  if (!layer) {
    layer = createSVG("g", { "data-layer": name });
    svg.appendChild(layer);
  }

  return layer;
}

function curvePath(x1, y1, x2, y2, bend = 0.18) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  return `
    M ${x1} ${y1}
    C ${x1 + dx * 0.35} ${y1 + dy * bend},
      ${x1 + dx * 0.68} ${y2 - dy * bend},
      ${x2} ${y2}
  `;
}

function drawZone(svg, x, y, w, h) {
  const layer = getLayer(svg, "zones");

  const zone = createSVG("path", {
    d: `
      M ${x + 26} ${y + 12}
      C ${x + w * .35} ${y - 8}, ${x + w * .74} ${y + 16}, ${x + w - 24} ${y + 40}
      C ${x + w + 10} ${y + h * .42}, ${x + w - 18} ${y + h * .78}, ${x + w - 48} ${y + h - 20}
      C ${x + w * .56} ${y + h + 12}, ${x + w * .2} ${y + h}, ${x + 20} ${y + h - 34}
      C ${x - 8} ${y + h * .65}, ${x} ${y + h * .28}, ${x + 26} ${y + 12}
      Z
    `,
    fill: "#C58B12",
    opacity: "0.10"
  });

  layer.appendChild(zone);
}

function drawPlayer(svg, x, y, type = "team", number = null) {
  const layer = getLayer(svg, "players");

  const colors = {
    team: "#C58B12",
    opponent: "#071F3D",
    highlight: "#D8A331",
    ghost: "#AEB6BF"
  };

  const fill = colors[type] || colors.team;

  const group = createSVG("g");

  group.appendChild(createSVG("circle", {
    cx: x,
    cy: y + 4,
    r: 22,
    fill: "#071F3D",
    opacity: "0.16"
  }));

  if (type === "highlight") {
    group.appendChild(createSVG("circle", {
      cx: x,
      cy: y,
      r: 31,
      fill: "#C58B12",
      opacity: "0.16"
    }));
  }

  group.appendChild(createSVG("circle", {
    cx: x,
    cy: y,
    r: 20,
    fill: "#FFFDF8",
    stroke: "#FFFDF8",
    "stroke-width": 3
  }));

  group.appendChild(createSVG("circle", {
    cx: x,
    cy: y,
    r: 14,
    fill,
    stroke: type === "highlight" ? "#071F3D" : "none",
    "stroke-width": type === "highlight" ? 2 : 0
  }));

  if (number !== null) {
    const text = createSVG("text", {
      x,
      y: y + 5,
      "text-anchor": "middle",
      "font-size": "12",
      "font-family": "Inter, Arial, sans-serif",
      "font-weight": "800",
      fill: "#FFFDF8"
    });

    text.textContent = number;
    group.appendChild(text);
  }

  layer.appendChild(group);
}

function drawPass(svg, x1, y1, x2, y2, bend = 0.16) {
  ensureDefs(svg);

  getLayer(svg, "routes").appendChild(createSVG("path", {
    d: curvePath(x1, y1, x2, y2, bend),
    fill: "none",
    stroke: "#C58B12",
    "stroke-width": "4",
    "stroke-linecap": "round",
    "marker-end": "url(#adql-arrow-gold)"
  }));
}

function drawRun(svg, x1, y1, x2, y2, bend = -0.2) {
  ensureDefs(svg);

  getLayer(svg, "routes").appendChild(createSVG("path", {
    d: curvePath(x1, y1, x2, y2, bend),
    fill: "none",
    stroke: "#071F3D",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-dasharray": "10 8",
    "marker-end": "url(#adql-arrow-blue)",
    opacity: "0.55"
  }));
}

function drawCarry(svg, path) {
  ensureDefs(svg);

  getLayer(svg, "routes").appendChild(createSVG("path", {
    d: path,
    fill: "none",
    stroke: "#C58B12",
    "stroke-width": "3",
    "stroke-linecap": "round",
    "stroke-dasharray": "2 8",
    "marker-end": "url(#adql-arrow-gold)"
  }));
}

function drawPressure(svg, x, y, r = 34) {
  const layer = getLayer(svg, "effects");

  for (let i = 0; i < 3; i++) {
    layer.appendChild(createSVG("path", {
      d: `M ${x - r - i * 10} ${y - 18 - i * 7}
          C ${x - r - 10 - i * 10} ${y},
            ${x - r - i * 10} ${y + 18 + i * 7},
            ${x - r + 8 - i * 10} ${y + 25 + i * 7}`,
      fill: "none",
      stroke: "#071F3D",
      "stroke-width": "2",
      opacity: `${0.42 - i * 0.1}`
    }));
  }
}

function drawStep(svg, x, y, number) {
  const layer = getLayer(svg, "labels");

  const group = createSVG("g");

  group.appendChild(createSVG("circle", {
    cx: x,
    cy: y,
    r: 18,
    fill: "#071F3D",
    stroke: "#C58B12",
    "stroke-width": 3
  }));

  const text = createSVG("text", {
    x,
    y: y + 6,
    "text-anchor": "middle",
    "font-family": "Inter, Arial, sans-serif",
    "font-size": "16",
    "font-weight": "800",
    fill: "#FFFDF8"
  });

  text.textContent = number;
  group.appendChild(text);

  layer.appendChild(group);
}

function drawGate(svg, x1, y1, x2, y2) {
  getLayer(svg, "effects").appendChild(createSVG("line", {
    x1,
    y1,
    x2,
    y2,
    stroke: "#C58B12",
    "stroke-width": "4",
    "stroke-linecap": "round",
    opacity: "0.9"
  }));
}