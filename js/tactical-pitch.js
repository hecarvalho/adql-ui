const TACTICAL_DRAG_BOUNDS = {
  minX: 72,
  maxX: 928,
  minY: 72,
  maxY: 548
};

const TACTICAL_CLICK_DISTANCE = 7;

let tacticalDragState = null;
let tacticalPointerState = null;

const tacticalInteractionState = {
  mode: "move",
  routeStartPlayerId: null
};

function setTacticalText(selector, value) {
  const target = document.querySelector(selector);

  if (target) {
    target.textContent = value ?? "";
  }
}

function findTacticalPlayer(data, id) {
  return data.players?.find(
    (player) => player.id === id
  );
}

function buildLinkedCarryPath(data, carry) {
  const from = findTacticalPlayer(
    data,
    carry.from
  );

  const to = findTacticalPlayer(
    data,
    carry.to
  );

  if (!from || !to) {
    return carry.path || "";
  }

  const control1 =
    carry.control1 || {
      x: (to.x - from.x) * 0.34,
      y: (to.y - from.y) * 0.4
    };

  const control2 =
    carry.control2 || {
      x: (from.x - to.x) * 0.34,
      y: (from.y - to.y) * 0.2
    };

  return `
    M ${from.x} ${from.y}
    C ${from.x + control1.x} ${
      from.y + control1.y
    },
      ${to.x + control2.x} ${
        to.y + control2.y
      },
      ${to.x} ${to.y}
  `;
}

function syncLinkedTacticalData(data) {
  data.pressures?.forEach((pressure) => {
    if (!pressure.playerId) {
      return;
    }

    const player = findTacticalPlayer(
      data,
      pressure.playerId
    );

    if (player) {
      pressure.x = player.x;
      pressure.y = player.y;
    }
  });

  data.steps?.forEach((step) => {
    if (!step.playerId) {
      return;
    }

    const player = findTacticalPlayer(
      data,
      step.playerId
    );

    if (player) {
      step.x = player.x;
      step.y = player.y;
    }
  });

  data.carries?.forEach((carry) => {
    if (carry.from && carry.to) {
      carry.path = buildLinkedCarryPath(
        data,
        carry
      );
    }
  });
}

function renderTacticalCopy(data) {
  setTacticalText(
    ".tp-kicker",
    data.kicker
  );

  setTacticalText(
    "#pitchTitle",
    data.title
  );

  setTacticalText(
    "#pitchSubtitle",
    data.subtitle
  );

  setTacticalText(
    "#readingText",
    data.reading
  );

  setTacticalText(
    "#sourceText",
    data.source
  );

  (data.stepCopy || []).forEach(
    (step, index) => {
      const position = index + 1;

      setTacticalText(
        `.tp-steps article:nth-child(${position}) h3`,
        step.title
      );

      setTacticalText(
        `.tp-steps article:nth-child(${position}) p`,
        step.text
      );
    }
  );
}

function applyTacticalInteractionClasses(svg) {
  if (!svg) {
    return;
  }

  const mode =
    tacticalInteractionState.mode || "move";

  svg.dataset.interactionMode = mode;
  svg.classList.toggle(
    "is-action-mode",
    mode !== "move"
  );

  svg
    .querySelectorAll("[data-player-id]")
    .forEach((node) => {
      const isRouteStart =
        node.dataset.playerId ===
        tacticalInteractionState.routeStartPlayerId;

      node.classList.toggle(
        "is-route-start",
        isRouteStart
      );
    });
}

function getTacticalPlayerPalette(type) {
  switch (type) {
    case "opponent":
      return {
        fill: "#c84a3f",
        stroke: "#fff4ec",
        text: "#ffffff",
        halo: "drop-shadow(0 0 2px rgba(200,74,63,.95)) drop-shadow(0 0 6px rgba(200,74,63,.34))",
        opacity: "1"
      };
    case "highlight":
      return {
        fill: "#d6a11e",
        stroke: "#071f3d",
        text: "#071f3d",
        halo: "drop-shadow(0 0 2px rgba(214,161,30,.95)) drop-shadow(0 0 7px rgba(214,161,30,.42))",
        opacity: "1"
      };
    case "ghost":
      return {
        fill: "#c8d0d8",
        stroke: "#6e7b88",
        text: "#4f5b66",
        halo: "none",
        opacity: ".9"
      };
    case "team":
    default:
      return {
        fill: "#071f3d",
        stroke: "#f5efe2",
        text: "#ffffff",
        halo: "drop-shadow(0 0 2px rgba(7,31,61,.82))",
        opacity: "1"
      };
  }
}

function applyTacticalPlayerVisual(node, player) {
  if (!node || !player) {
    return;
  }

  const palette = getTacticalPlayerPalette(player.type);

  node.dataset.playerType = player.type || "team";
  node.style.opacity = palette.opacity;
  node.style.filter = palette.halo;

  node
    .querySelectorAll("circle, ellipse")
    .forEach((shape) => {
      shape.style.fill = palette.fill;
      shape.style.stroke = palette.stroke;
      shape.style.strokeWidth = "3px";
    });

  node
    .querySelectorAll("text, tspan")
    .forEach((label) => {
      label.style.fill = palette.text;
      label.style.stroke = "none";
      label.style.fontWeight = "800";
    });
}

function annotateTacticalPlayers(svg, data) {
  const playerLayer = svg.querySelector(
    '[data-layer="players"]'
  );

  const labelLayer = svg.querySelector(
    '[data-layer="labels"]'
  );

  if (labelLayer) {
    labelLayer.style.pointerEvents = "none";
  }

  if (!playerLayer) {
    return;
  }

  const playerNodes = Array.from(
    playerLayer.children
  );

  (data.players || []).forEach(
    (player, index) => {
      const node = playerNodes[index];

      if (!node) {
        return;
      }

      node.dataset.playerId = player.id;
      node.dataset.playerType = player.type || "team";
      node.classList.add("tp-player-node");
      applyTacticalPlayerVisual(node, player);
    }
  );

  applyTacticalInteractionClasses(svg);
}

function renderTacticalPitch(
  data = window.playData
) {
  if (!data) {
    return;
  }

  if (
    tacticalInteractionState.routeStartPlayerId &&
    !findTacticalPlayer(
      data,
      tacticalInteractionState.routeStartPlayerId
    )
  ) {
    tacticalInteractionState.routeStartPlayerId = null;
  }

  renderTacticalCopy(data);
  syncLinkedTacticalData(data);

  const svg = document.querySelector(
    ".tp-pitch"
  );

  if (!svg) {
    return;
  }

  renderPlay(svg, data);
  annotateTacticalPlayers(svg, data);
}

function clampTacticalValue(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function getTacticalSvgPoint(svg, event) {
  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return null;
  }

  const point = svg.createSVGPoint();

  point.x = event.clientX;
  point.y = event.clientY;

  return point.matrixTransform(
    matrix.inverse()
  );
}

function dispatchTacticalEvent(
  name,
  detail
) {
  document.dispatchEvent(
    new CustomEvent(name, {
      detail
    })
  );
}

function ensureTacticalEditorStyles() {
  if (
    document.getElementById(
      "tacticalEditorStyles"
    )
  ) {
    return;
  }

  const style = document.createElement("style");

  style.id = "tacticalEditorStyles";
  style.textContent = `
    .tp-pitch {
      touch-action: none;
      user-select: none;
    }

    .tp-pitch .tp-player-node {
      cursor: grab;
      transform-box: fill-box;
      transform-origin: center;
      transition: filter 140ms ease, transform 140ms ease;
    }

    .tp-pitch.is-dragging .tp-player-node {
      cursor: grabbing;
    }

    .tp-pitch.is-action-mode {
      cursor: crosshair;
    }

    .tp-pitch.is-action-mode .tp-player-node {
      cursor: pointer;
    }

    .tp-pitch .tp-player-node.is-route-start {
      filter:
        drop-shadow(0 0 3px rgba(197, 139, 18, 1))
        drop-shadow(0 0 8px rgba(197, 139, 18, 0.75));
      transform: scale(1.12);
    }
  `;

  document.head.appendChild(style);
}

function setTacticalInteractionState(nextState = {}) {
  if ("mode" in nextState) {
    tacticalInteractionState.mode =
      nextState.mode || "move";
  }

  if ("routeStartPlayerId" in nextState) {
    tacticalInteractionState.routeStartPlayerId =
      nextState.routeStartPlayerId || null;
  }

  applyTacticalInteractionClasses(
    document.querySelector(".tp-pitch")
  );
}

function finishTacticalPointer(
  svg,
  event,
  cancelled = false
) {
  if (
    !tacticalPointerState ||
    tacticalPointerState.pointerId !==
      event.pointerId
  ) {
    return;
  }

  const pointerState = tacticalPointerState;
  const point = getTacticalSvgPoint(
    svg,
    event
  );

  const distance = Math.hypot(
    event.clientX - pointerState.startClientX,
    event.clientY - pointerState.startClientY
  );

  tacticalPointerState = null;
  tacticalDragState = null;
  svg.classList.remove("is-dragging");

  if (
    svg.hasPointerCapture?.(
      event.pointerId
    )
  ) {
    svg.releasePointerCapture(
      event.pointerId
    );
  }

  if (
    cancelled ||
    distance > TACTICAL_CLICK_DISTANCE
  ) {
    return;
  }

  if (pointerState.playerId) {
    dispatchTacticalEvent(
      "tactical:player-click",
      {
        playerId: pointerState.playerId
      }
    );

    return;
  }

  if (point) {
    dispatchTacticalEvent(
      "tactical:field-click",
      {
        x: clampTacticalValue(
          Math.round(point.x),
          TACTICAL_DRAG_BOUNDS.minX,
          TACTICAL_DRAG_BOUNDS.maxX
        ),
        y: clampTacticalValue(
          Math.round(point.y),
          TACTICAL_DRAG_BOUNDS.minY,
          TACTICAL_DRAG_BOUNDS.maxY
        )
      }
    );
  }
}

function setupTacticalInteractions(
  svg,
  data
) {
  if (!svg || !data) {
    return;
  }

  ensureTacticalEditorStyles();

  svg.addEventListener(
    "pointerdown",
    (event) => {
      if (
        event.button !== undefined &&
        event.button !== 0
      ) {
        return;
      }

      const playerNode =
        event.target.closest?.(
          "[data-player-id]"
        );

      const playerId =
        playerNode?.dataset.playerId || null;

      tacticalPointerState = {
        pointerId: event.pointerId,
        playerId,
        startClientX: event.clientX,
        startClientY: event.clientY
      };

      const isMoveMode =
        tacticalInteractionState.mode ===
        "move";

      if (isMoveMode && playerId) {
        const player = findTacticalPlayer(
          data,
          playerId
        );

        if (player) {
          tacticalDragState = {
            pointerId: event.pointerId,
            playerId
          };

          svg.classList.add("is-dragging");
        }
      }

      svg.setPointerCapture?.(
        event.pointerId
      );

      if (
        playerId ||
        !isMoveMode
      ) {
        event.preventDefault();
      }
    }
  );

  svg.addEventListener(
    "pointermove",
    (event) => {
      if (
        !tacticalDragState ||
        tacticalDragState.pointerId !==
          event.pointerId
      ) {
        return;
      }

      const point = getTacticalSvgPoint(
        svg,
        event
      );

      const player = findTacticalPlayer(
        data,
        tacticalDragState.playerId
      );

      if (!point || !player) {
        return;
      }

      player.x = clampTacticalValue(
        Math.round(point.x),
        TACTICAL_DRAG_BOUNDS.minX,
        TACTICAL_DRAG_BOUNDS.maxX
      );

      player.y = clampTacticalValue(
        Math.round(point.y),
        TACTICAL_DRAG_BOUNDS.minY,
        TACTICAL_DRAG_BOUNDS.maxY
      );

      renderTacticalPitch(data);
      event.preventDefault();
    }
  );

  svg.addEventListener(
    "pointerup",
    (event) => {
      finishTacticalPointer(
        svg,
        event,
        false
      );
    }
  );

  svg.addEventListener(
    "pointercancel",
    (event) => {
      finishTacticalPointer(
        svg,
        event,
        true
      );
    }
  );

  svg.addEventListener(
    "lostpointercapture",
    () => {
      tacticalPointerState = null;
      tacticalDragState = null;
      svg.classList.remove("is-dragging");
    }
  );
}

window.renderTacticalPitch =
  renderTacticalPitch;

window.getTacticalData = () =>
  window.playData;

window.setTacticalInteractionState =
  setTacticalInteractionState;

window.getTacticalInteractionState = () => ({
  ...tacticalInteractionState
});

const tacticalSvg = document.querySelector(
  ".tp-pitch"
);

setupTacticalInteractions(
  tacticalSvg,
  window.playData
);

renderTacticalPitch(window.playData);
