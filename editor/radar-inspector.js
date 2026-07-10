/* ==========================================================
   ADQL EDITOR
   C-04 — RADAR PROFILE / EDITOR AVANÇADO
========================================================== */

editorSchemas["radar-profile"] = {
  mode: "radar-advanced",
  dataKey: "radarData",
  renderFunction: "renderRadarProfile"
};

const radarBaseBuildInspector = buildInspector;
const radarEditorStates = new WeakMap();

const RADAR_GEOMETRY = {
  cx: 450,
  cy: 410,
  radius: 355
};

function riElement(
  tag,
  className = "",
  text = ""
) {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text) {
    element.textContent = text;
  }

  return element;
}

function riClamp(value, min, max) {
  return Math.min(
    Math.max(value, min),
    max
  );
}

function riNumber(value, fallback = 0) {
  const parsed = Number(
    String(value ?? "")
      .trim()
      .replace(",", ".")
  );

  return Number.isFinite(parsed)
    ? parsed
    : fallback;
}

function riSafeArray(value) {
  return Array.isArray(value)
    ? value
    : [];
}

function riGetState(frame) {
  let state = radarEditorStates.get(frame);

  if (!state) {
    state = {
      selectedMetricIndex: 0,
      selectedCardIndex: 0,
      drag: null,
      boundDocument: null,
      renderWorkspace: null,
      rerender: null
    };

    radarEditorStates.set(frame, state);
  }

  return state;
}

function riButton({
  label,
  icon = "",
  className = "ri-button",
  onClick,
  title = "",
  disabled = false
}) {
  const button = riElement(
    "button",
    className
  );

  button.type = "button";
  button.disabled = disabled;

  if (title) {
    button.title = title;
  }

  if (icon) {
    const iconEl = riElement(
      "span",
      "ri-button-icon",
      icon
    );

    button.appendChild(iconEl);
  }

  const labelEl = riElement(
    "span",
    "ri-button-label",
    label
  );

  button.appendChild(labelEl);

  button.addEventListener(
    "click",
    (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!button.disabled) {
        onClick?.(event);
      }
    }
  );

  return button;
}

function riField({
  label,
  value,
  type = "text",
  placeholder = "",
  onInput,
  className = ""
}) {
  const wrapper = riElement(
    "label",
    `ri-field ${className}`.trim()
  );

  const labelEl = riElement(
    "span",
    "ri-field-label",
    label
  );

  const input = document.createElement("input");
  input.type = type;
  input.value = value ?? "";
  input.placeholder = placeholder;

  input.addEventListener("input", () => {
    onInput?.(input.value, input);
  });

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);

  return wrapper;
}

function riTextArea({
  label,
  value,
  placeholder = "",
  onInput
}) {
  const wrapper = riElement(
    "label",
    "ri-field"
  );

  const labelEl = riElement(
    "span",
    "ri-field-label",
    label
  );

  const input = document.createElement("textarea");
  input.value = value ?? "";
  input.placeholder = placeholder;

  input.addEventListener("input", () => {
    onInput?.(input.value, input);
  });

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);

  return wrapper;
}

function riCard(title, eyebrow = "") {
  const card = riElement("section", "ri-card");
  const head = riElement("div", "ri-card-head");
  const titleWrap = riElement("div");

  if (eyebrow) {
    titleWrap.appendChild(
      riElement(
        "span",
        "ri-eyebrow",
        eyebrow
      )
    );
  }

  titleWrap.appendChild(
    riElement("h4", "", title)
  );

  head.appendChild(titleWrap);
  card.appendChild(head);

  return { card, head, titleWrap };
}

function ensureRadarInspectorStyles() {
  if (
    document.getElementById(
      "radarInspectorStyles"
    )
  ) {
    return;
  }

  const style = document.createElement("style");

  style.id = "radarInspectorStyles";
  style.textContent = `
    .ri-shell {
      display: grid;
      gap: 16px;
    }

    .ri-hero {
      padding: 17px;
      border-radius: 15px;
      background:
        radial-gradient(circle at 92% 0%, rgba(197,139,18,.24), transparent 34%),
        #071f3d;
      color: #fff;
      box-shadow: 0 12px 30px rgba(7,31,61,.12);
    }

    .ri-hero-top,
    .ri-card-head,
    .ri-row-head,
    .ri-editor-head,
    .ri-slider-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .ri-eyebrow {
      display: block;
      color: #c58b12;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }

    .ri-hero h4 {
      margin-top: 4px;
      font-size: 19px;
      line-height: 1.08;
    }

    .ri-hero p {
      margin-top: 8px;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.5;
    }

    .ri-quick-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    .ri-button,
    .ri-icon-button,
    .ri-metric-row,
    .ri-card-row,
    .ri-team-swatch,
    .ri-preset {
      font: inherit;
      cursor: pointer;
      transition: 150ms ease;
    }

    .ri-button {
      min-height: 42px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 11px;
      border: 1px solid #d8d1c3;
      border-radius: 10px;
      background: #fffdf8;
      color: #071f3d;
      font-size: 12px;
      font-weight: 900;
    }

    .ri-button:hover {
      border-color: #c58b12;
      transform: translateY(-1px);
    }

    .ri-button:disabled {
      opacity: .35;
      cursor: not-allowed;
      transform: none;
    }

    .ri-hero .ri-button {
      border-color: rgba(255,255,255,.14);
      background: rgba(255,255,255,.08);
      color: #fff;
    }

    .ri-hero .ri-button:hover {
      border-color: #c58b12;
      background: rgba(255,255,255,.12);
    }

    .ri-button-primary {
      border-color: #c58b12;
      background: #c58b12;
      color: #071f3d;
    }

    .ri-button-danger {
      border-color: rgba(145,41,41,.22);
      background: rgba(145,41,41,.06);
      color: #8d2b2b;
    }

    .ri-button-compact {
      min-height: 34px;
      padding: 7px 9px;
      font-size: 11px;
    }

    .ri-button-icon {
      font-size: 15px;
      font-weight: 900;
    }

    .ri-card {
      padding: 14px;
      border: 1px solid #d8d1c3;
      border-radius: 14px;
      background: rgba(255,253,248,.92);
    }

    .ri-card h4 {
      color: #071f3d;
      font-size: 14px;
      font-weight: 900;
    }

    .ri-card-head {
      margin-bottom: 12px;
    }

    .ri-count {
      min-width: 28px;
      height: 28px;
      display: grid;
      place-items: center;
      border-radius: 999px;
      background: rgba(7,31,61,.07);
      color: #071f3d;
      font-size: 11px;
      font-weight: 900;
    }

    .ri-teams {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .ri-team-box {
      position: relative;
      padding: 12px;
      border: 1px solid #d8d1c3;
      border-radius: 12px;
      background: #fff;
      overflow: hidden;
    }

    .ri-team-box::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 4px;
      background: var(--ri-team-color);
    }

    .ri-team-label {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-bottom: 8px;
      color: #6f7680;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .ri-team-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--ri-team-color);
    }

    .ri-team-box input {
      width: 100%;
      border: 0;
      background: transparent;
      color: #071f3d;
      font: inherit;
      font-size: 14px;
      font-weight: 900;
      outline: none;
    }

    .ri-help {
      padding: 11px 12px;
      border: 1px solid rgba(197,139,18,.28);
      border-radius: 11px;
      background: rgba(197,139,18,.08);
      color: #5f5a4f;
      font-size: 11px;
      line-height: 1.45;
    }

    .ri-help strong {
      color: #071f3d;
    }

    .ri-metric-list,
    .ri-card-list {
      display: grid;
      gap: 8px;
    }

    .ri-metric-row,
    .ri-card-row {
      position: relative;
      width: 100%;
      padding: 11px;
      border: 1px solid #ddd6ca;
      border-radius: 11px;
      background: #fff;
      color: #071f3d;
      text-align: left;
    }

    .ri-metric-row:hover,
    .ri-card-row:hover {
      border-color: #c58b12;
    }

    .ri-metric-row.is-selected,
    .ri-card-row.is-selected {
      border-color: #c58b12;
      box-shadow: 0 0 0 2px rgba(197,139,18,.12);
    }

    .ri-row-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #071f3d;
      font-size: 12px;
      font-weight: 900;
    }

    .ri-row-values {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #6f7680;
      font-size: 10px;
      font-weight: 800;
    }

    .ri-mini-bars {
      display: grid;
      gap: 5px;
      margin-top: 9px;
    }

    .ri-mini-track {
      height: 4px;
      overflow: hidden;
      border-radius: 999px;
      background: rgba(7,31,61,.08);
    }

    .ri-mini-fill {
      height: 100%;
      width: var(--ri-width, 0%);
      border-radius: inherit;
      background: var(--ri-fill);
      transition: width 100ms linear;
    }

    .ri-editor {
      margin-top: 12px;
      padding: 12px;
      border: 1px solid rgba(197,139,18,.28);
      border-radius: 12px;
      background: rgba(197,139,18,.055);
    }

    .ri-editor-head {
      margin-bottom: 12px;
    }

    .ri-editor-title {
      color: #071f3d;
      font-size: 12px;
      font-weight: 900;
    }

    .ri-editor-actions {
      display: flex;
      gap: 6px;
    }

    .ri-icon-button {
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
      border: 1px solid #d8d1c3;
      border-radius: 8px;
      background: #fff;
      color: #071f3d;
      font-size: 13px;
      font-weight: 900;
    }

    .ri-icon-button:hover {
      border-color: #c58b12;
    }

    .ri-field {
      display: block;
      margin-bottom: 12px;
    }

    .ri-field:last-child {
      margin-bottom: 0;
    }

    .ri-field-label {
      display: block;
      margin-bottom: 6px;
      color: #6f7680;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .ri-field input,
    .ri-field textarea {
      width: 100%;
      border: 1px solid #d8d1c3;
      border-radius: 9px;
      background: #fff;
      color: #071f3d;
      padding: 10px 11px;
      font-family: Inter, Arial, sans-serif;
      font-size: 13px;
      font-weight: 700;
      outline: none;
    }

    .ri-field input:focus,
    .ri-field textarea:focus {
      border-color: #c58b12;
      box-shadow: 0 0 0 2px rgba(197,139,18,.09);
    }

    .ri-field textarea {
      min-height: 88px;
      resize: vertical;
      line-height: 1.45;
    }

    .ri-value-editor {
      padding: 10px;
      margin-bottom: 8px;
      border: 1px solid #ded7cb;
      border-radius: 10px;
      background: #fff;
    }

    .ri-slider-head {
      margin-bottom: 8px;
    }

    .ri-slider-team {
      display: flex;
      align-items: center;
      gap: 7px;
      min-width: 0;
      color: #071f3d;
      font-size: 11px;
      font-weight: 900;
    }

    .ri-slider-team span:last-child {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ri-slider-dot {
      width: 8px;
      height: 8px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: var(--ri-dot);
    }

    .ri-value-number {
      width: 66px;
      border: 1px solid #d8d1c3;
      border-radius: 8px;
      background: #fffdf8;
      color: #071f3d;
      padding: 6px 7px;
      font: inherit;
      font-size: 12px;
      font-weight: 900;
      text-align: right;
      outline: none;
    }

    .ri-value-number:focus {
      border-color: #c58b12;
    }

    .ri-range {
      width: 100%;
      accent-color: var(--ri-range-color);
      cursor: pointer;
    }

    .ri-inline-actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .ri-inline-actions .ri-button {
      flex: 1;
    }

    .ri-empty {
      padding: 18px 12px;
      border: 1px dashed #cfc7b9;
      border-radius: 11px;
      color: #7c7a74;
      font-size: 12px;
      line-height: 1.5;
      text-align: center;
    }

    .ri-card-row strong {
      display: block;
      color: #071f3d;
      font-size: 12px;
      font-weight: 900;
    }

    .ri-card-row span {
      display: block;
      margin-top: 4px;
      color: #7a7f86;
      font-size: 10px;
      line-height: 1.35;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .ri-details {
      border: 1px solid #d8d1c3;
      border-radius: 14px;
      background: rgba(255,253,248,.92);
      overflow: hidden;
    }

    .ri-details summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 14px;
      color: #071f3d;
      font-size: 13px;
      font-weight: 900;
      cursor: pointer;
      list-style: none;
    }

    .ri-details summary::-webkit-details-marker {
      display: none;
    }

    .ri-details summary::after {
      content: "+";
      color: #c58b12;
      font-size: 18px;
      font-weight: 900;
    }

    .ri-details[open] summary::after {
      content: "−";
    }

    .ri-details-body {
      padding: 0 14px 14px;
    }

    .ri-presets {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 7px;
      margin-top: 8px;
    }

    .ri-preset {
      min-height: 32px;
      border: 1px solid #d8d1c3;
      border-radius: 8px;
      background: #fff;
      color: #071f3d;
      font-size: 11px;
      font-weight: 900;
    }

    .ri-preset:hover {
      border-color: #c58b12;
    }

    .ri-warning {
      margin-top: 10px;
      padding: 9px 10px;
      border-radius: 9px;
      background: rgba(145,89,21,.08);
      color: #7b5a29;
      font-size: 10px;
      line-height: 1.45;
    }
  `;

  document.head.appendChild(style);
}

function riNormalizeData(data) {
  data.metrics = riSafeArray(data.metrics);
  data.cards = riSafeArray(data.cards);
  data.maxValue = Math.max(
    1,
    riNumber(data.maxValue, 100)
  );

  data.metrics.forEach((metric, index) => {
    metric.label = metric.label ?? `Métrica ${index + 1}`;
    metric.home = riNumber(metric.home, 0);
    metric.away = riNumber(metric.away, 0);
  });

  data.cards.forEach((card, index) => {
    card.label = card.label ?? `Card ${index + 1}`;
    card.value = card.value ?? "0";
    card.text = card.text ?? "";
  });
}

function riRerenderComponent(
  win,
  schema,
  data
) {
  const renderFunction = win[
    schema.renderFunction
  ];

  if (
    typeof renderFunction === "function"
  ) {
    renderFunction(data);
  }
}

function riApplySelectionStyle(
  frame,
  data,
  state
) {
  const doc = frame.contentDocument;
  const svg = doc?.getElementById("radarSvg");

  if (!svg) {
    return;
  }

  const selectedIndex =
    state.selectedMetricIndex;

  svg
    .querySelectorAll(
      "[data-radar-metric-index]"
    )
    .forEach((label) => {
      const index = Number(
        label.dataset.radarMetricIndex
      );

      if (index === selectedIndex) {
        label.setAttribute(
          "fill",
          "#C58B12"
        );
        label.setAttribute(
          "font-size",
          "22"
        );
      }
    });

  svg
    .querySelectorAll(
      "circle[data-radar-index]"
    )
    .forEach((node) => {
      const index = Number(
        node.dataset.radarIndex
      );

      if (index === selectedIndex) {
        const team =
          node.dataset.radarTeam;

        node.setAttribute(
          "r",
          team === "home" ? "13" : "12"
        );

        node.style.filter =
          "drop-shadow(0 3px 5px rgba(7,31,61,.2))";
      }
    });

  const cards = doc.querySelectorAll(
    "[data-radar-card-index]"
  );

  cards.forEach((card) => {
    const index = Number(
      card.dataset.radarCardIndex
    );

    card.style.cursor = "pointer";

    if (
      index === state.selectedCardIndex
    ) {
      card.style.outline =
        "3px solid rgba(197,139,18,.45)";
      card.style.outlineOffset = "2px";
    }
  });
}

function riSvgPointFromEvent(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;

  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return null;
  }

  return point.matrixTransform(
    matrix.inverse()
  );
}

function riUpdateMetricFromPointer({
  svg,
  event,
  data,
  state,
  rerender
}) {
  if (!state.drag) {
    return;
  }

  const point = riSvgPointFromEvent(
    svg,
    event
  );

  if (!point) {
    return;
  }

  const distance = Math.hypot(
    point.x - RADAR_GEOMETRY.cx,
    point.y - RADAR_GEOMETRY.cy
  );

  const maxValue = Math.max(
    1,
    riNumber(data.maxValue, 100)
  );

  const value = Math.round(
    riClamp(
      (distance / RADAR_GEOMETRY.radius) *
        maxValue,
      0,
      maxValue
    )
  );

  const metric =
    data.metrics[state.drag.index];

  if (!metric) {
    return;
  }

  metric[state.drag.team] = value;
  rerender(false);

  const panelInput = document.querySelector(
    `[data-ri-value="${state.drag.team}"]`
  );

  const panelRange = document.querySelector(
    `[data-ri-range="${state.drag.team}"]`
  );

  if (panelInput) {
    panelInput.value = String(value);
  }

  if (panelRange) {
    panelRange.value = String(value);
  }

  const workspace = document.querySelector(
    ".ri-shell"
  );

  riRefreshMetricRow(
    workspace,
    state.drag.index,
    data
  );
}

function riAttachFrameEvents({
  frame,
  data,
  state,
  rerender,
  renderWorkspace
}) {
  const doc = frame.contentDocument;

  if (
    !doc ||
    state.boundDocument === doc
  ) {
    return;
  }

  state.boundDocument = doc;

  const svg = doc.getElementById("radarSvg");

  if (svg) {
    svg.addEventListener(
      "pointerdown",
      (event) => {
        const node = event.target.closest?.(
          "circle[data-radar-team]"
        );

        if (!node) {
          return;
        }

        const index = Number(
          node.dataset.radarIndex
        );
        const team =
          node.dataset.radarTeam;

        if (
          !Number.isInteger(index) ||
          !["home", "away"].includes(team)
        ) {
          return;
        }

        state.selectedMetricIndex = index;
        state.drag = {
          index,
          team,
          pointerId: event.pointerId
        };

        try {
          svg.setPointerCapture(
            event.pointerId
          );
        } catch (error) {
          // O navegador pode não oferecer captura
          // de ponteiro dentro do iframe.
        }

        event.preventDefault();
        renderWorkspace();
        riApplySelectionStyle(
          frame,
          data,
          state
        );
      }
    );

    svg.addEventListener(
      "pointermove",
      (event) => {
        if (
          !state.drag ||
          state.drag.pointerId !==
            event.pointerId
        ) {
          return;
        }

        riUpdateMetricFromPointer({
          svg,
          event,
          data,
          state,
          rerender
        });

        event.preventDefault();
      }
    );

    const finishDrag = (event) => {
      if (
        !state.drag ||
        state.drag.pointerId !==
          event.pointerId
      ) {
        return;
      }

      state.drag = null;
      renderWorkspace();
      riApplySelectionStyle(
        frame,
        data,
        state
      );
    };

    svg.addEventListener(
      "pointerup",
      finishDrag
    );
    svg.addEventListener(
      "pointercancel",
      finishDrag
    );

    svg.addEventListener(
      "click",
      (event) => {
        const label = event.target.closest?.(
          "[data-radar-metric-index]"
        );

        if (!label) {
          return;
        }

        state.selectedMetricIndex = Number(
          label.dataset.radarMetricIndex
        );

        renderWorkspace();
        riApplySelectionStyle(
          frame,
          data,
          state
        );
      }
    );
  }

  doc.addEventListener(
    "click",
    (event) => {
      const card = event.target.closest?.(
        "[data-radar-card-index]"
      );

      if (!card) {
        return;
      }

      state.selectedCardIndex = Number(
        card.dataset.radarCardIndex
      );

      renderWorkspace();
      riApplySelectionStyle(
        frame,
        data,
        state
      );
    }
  );
}

function riAddMetric(
  data,
  state,
  rerender,
  renderWorkspace
) {
  const index = data.metrics.length;
  const baseValue = Math.round(
    data.maxValue * 0.55
  );

  data.metrics.push({
    label: `Métrica ${index + 1}`,
    home: baseValue,
    away: baseValue
  });

  state.selectedMetricIndex = index;
  rerender(false);
  renderWorkspace();
}

function riAddCard(
  data,
  state,
  rerender,
  renderWorkspace
) {
  const index = data.cards.length;

  data.cards.push({
    label: `Destaque ${index + 1}`,
    value: "0",
    text: "Texto de apoio"
  });

  state.selectedCardIndex = index;
  rerender(false);
  renderWorkspace();
}

function riBuildHero({
  data,
  state,
  rerender,
  renderWorkspace
}) {
  const hero = riElement("section", "ri-hero");
  const top = riElement("div", "ri-hero-top");
  const copy = riElement("div");

  copy.appendChild(
    riElement(
      "span",
      "ri-eyebrow",
      "C-04 • Radar Profile"
    )
  );
  copy.appendChild(
    riElement(
      "h4",
      "",
      "Editor visual do radar"
    )
  );

  top.appendChild(copy);
  hero.appendChild(top);

  hero.appendChild(
    riElement(
      "p",
      "",
      "Crie métricas pelo painel ou arraste os pontos diretamente no gráfico para ajustar os valores."
    )
  );

  const actions = riElement(
    "div",
    "ri-quick-actions"
  );

  actions.appendChild(
    riButton({
      label: "Nova métrica",
      icon: "+",
      onClick: () => {
        riAddMetric(
          data,
          state,
          rerender,
          renderWorkspace
        );
      }
    })
  );

  actions.appendChild(
    riButton({
      label: "Novo card",
      icon: "+",
      onClick: () => {
        riAddCard(
          data,
          state,
          rerender,
          renderWorkspace
        );
      }
    })
  );

  hero.appendChild(actions);

  return hero;
}

function riBuildTeamsCard({
  data,
  rerender
}) {
  const { card, head } = riCard(
    "Equipes",
    "Legenda"
  );

  head.appendChild(
    riElement(
      "span",
      "ri-count",
      "2"
    )
  );

  const teams = riElement("div", "ri-teams");

  [
    {
      key: "home",
      label: "Equipe dourada",
      color: "#C58B12"
    },
    {
      key: "away",
      label: "Equipe azul",
      color: "#071F3D"
    }
  ].forEach((team) => {
    const box = riElement(
      "div",
      "ri-team-box"
    );

    box.style.setProperty(
      "--ri-team-color",
      team.color
    );

    const label = riElement(
      "div",
      "ri-team-label"
    );

    const dot = riElement(
      "span",
      "ri-team-dot"
    );

    label.appendChild(dot);
    label.appendChild(
      document.createTextNode(team.label)
    );

    const input = document.createElement("input");
    input.value = data[team.key] ?? "";
    input.placeholder = team.label;

    input.addEventListener("input", () => {
      data[team.key] = input.value;
      rerender(false);

      document
        .querySelectorAll(
          `[data-ri-team-name="${team.key}"]`
        )
        .forEach((target) => {
          target.textContent =
            input.value || team.label;
        });
    });

    box.appendChild(label);
    box.appendChild(input);
    teams.appendChild(box);
  });

  card.appendChild(teams);

  return card;
}

function riMetricPercent(value, maxValue) {
  return `${riClamp(
    (riNumber(value, 0) /
      Math.max(1, maxValue)) * 100,
    0,
    100
  )}%`;
}

function riBuildMetricRow({
  metric,
  index,
  data,
  state,
  renderWorkspace,
  frame
}) {
  const row = riElement(
    "button",
    "ri-metric-row"
  );

  row.type = "button";
  row.dataset.riMetricIndex = String(index);

  if (
    state.selectedMetricIndex === index
  ) {
    row.classList.add("is-selected");
  }

  const head = riElement("div", "ri-row-head");
  const title = riElement(
    "span",
    "ri-row-title",
    metric.label || `Métrica ${index + 1}`
  );

  title.dataset.role = "metric-label";

  const values = riElement(
    "span",
    "ri-row-values"
  );

  const homeValue = riElement(
    "span",
    "",
    String(metric.home)
  );
  homeValue.dataset.role = "home-value";

  const separator = riElement(
    "span",
    "",
    "×"
  );

  const awayValue = riElement(
    "span",
    "",
    String(metric.away)
  );
  awayValue.dataset.role = "away-value";

  values.appendChild(homeValue);
  values.appendChild(separator);
  values.appendChild(awayValue);

  head.appendChild(title);
  head.appendChild(values);

  const bars = riElement(
    "div",
    "ri-mini-bars"
  );

  [
    {
      key: "home",
      color: "#C58B12"
    },
    {
      key: "away",
      color: "#071F3D"
    }
  ].forEach((team) => {
    const track = riElement(
      "div",
      "ri-mini-track"
    );
    const fill = riElement(
      "div",
      "ri-mini-fill"
    );

    fill.dataset.role = `${team.key}-bar`;
    fill.style.setProperty(
      "--ri-fill",
      team.color
    );
    fill.style.setProperty(
      "--ri-width",
      riMetricPercent(
        metric[team.key],
        data.maxValue
      )
    );

    track.appendChild(fill);
    bars.appendChild(track);
  });

  row.appendChild(head);
  row.appendChild(bars);

  row.addEventListener("click", () => {
    state.selectedMetricIndex = index;
    renderWorkspace();
    riApplySelectionStyle(
      frame,
      data,
      state
    );
  });

  return row;
}

function riRefreshMetricRow(
  workspace,
  index,
  data
) {
  if (!workspace) {
    return;
  }

  const row = workspace.querySelector(
    `[data-ri-metric-index="${index}"]`
  );

  const metric = data.metrics[index];

  if (!row || !metric) {
    return;
  }

  const label = row.querySelector(
    `[data-role="metric-label"]`
  );
  const homeValue = row.querySelector(
    `[data-role="home-value"]`
  );
  const awayValue = row.querySelector(
    `[data-role="away-value"]`
  );
  const homeBar = row.querySelector(
    `[data-role="home-bar"]`
  );
  const awayBar = row.querySelector(
    `[data-role="away-bar"]`
  );

  if (label) {
    label.textContent = metric.label;
  }

  if (homeValue) {
    homeValue.textContent = metric.home;
  }

  if (awayValue) {
    awayValue.textContent = metric.away;
  }

  if (homeBar) {
    homeBar.style.setProperty(
      "--ri-width",
      riMetricPercent(
        metric.home,
        data.maxValue
      )
    );
  }

  if (awayBar) {
    awayBar.style.setProperty(
      "--ri-width",
      riMetricPercent(
        metric.away,
        data.maxValue
      )
    );
  }
}

function riBuildValueEditor({
  teamKey,
  teamName,
  color,
  metric,
  data,
  rerender,
  workspace
}) {
  const wrapper = riElement(
    "div",
    "ri-value-editor"
  );

  const head = riElement(
    "div",
    "ri-slider-head"
  );

  const team = riElement(
    "div",
    "ri-slider-team"
  );

  const dot = riElement(
    "span",
    "ri-slider-dot"
  );
  dot.style.setProperty(
    "--ri-dot",
    color
  );

  const teamLabel = riElement(
    "span",
    "",
    teamName
  );
  teamLabel.dataset.riTeamName = teamKey;

  team.appendChild(dot);
  team.appendChild(teamLabel);

  const number = document.createElement("input");
  number.type = "number";
  number.className = "ri-value-number";
  number.min = "0";
  number.max = String(data.maxValue);
  number.step = "1";
  number.value = String(metric[teamKey]);
  number.dataset.riValue = teamKey;

  head.appendChild(team);
  head.appendChild(number);

  const range = document.createElement("input");
  range.type = "range";
  range.className = "ri-range";
  range.min = "0";
  range.max = String(data.maxValue);
  range.step = "1";
  range.value = String(metric[teamKey]);
  range.dataset.riRange = teamKey;
  range.style.setProperty(
    "--ri-range-color",
    color
  );

  const update = (rawValue) => {
    const value = Math.round(
      riClamp(
        riNumber(rawValue, 0),
        0,
        data.maxValue
      )
    );

    metric[teamKey] = value;
    number.value = String(value);
    range.value = String(value);

    rerender(false);

    const index = data.metrics.indexOf(metric);

    riRefreshMetricRow(
      workspace,
      index,
      data
    );
  };

  number.addEventListener("input", () => {
    update(number.value);
  });

  range.addEventListener("input", () => {
    update(range.value);
  });

  wrapper.appendChild(head);
  wrapper.appendChild(range);

  return wrapper;
}

function riBuildSelectedMetricEditor({
  data,
  state,
  rerender,
  renderWorkspace,
  workspace
}) {
  const metric =
    data.metrics[state.selectedMetricIndex];

  if (!metric) {
    return null;
  }

  const editor = riElement(
    "div",
    "ri-editor"
  );

  const head = riElement(
    "div",
    "ri-editor-head"
  );

  head.appendChild(
    riElement(
      "span",
      "ri-editor-title",
      "Métrica selecionada"
    )
  );

  const actions = riElement(
    "div",
    "ri-editor-actions"
  );

  const moveUp = riElement(
    "button",
    "ri-icon-button",
    "↑"
  );
  moveUp.type = "button";
  moveUp.title = "Mover eixo para trás";
  moveUp.disabled =
    state.selectedMetricIndex === 0;

  moveUp.addEventListener("click", () => {
    const index = state.selectedMetricIndex;

    if (index <= 0) {
      return;
    }

    [
      data.metrics[index - 1],
      data.metrics[index]
    ] = [
      data.metrics[index],
      data.metrics[index - 1]
    ];

    state.selectedMetricIndex = index - 1;
    rerender(false);
    renderWorkspace();
  });

  const moveDown = riElement(
    "button",
    "ri-icon-button",
    "↓"
  );
  moveDown.type = "button";
  moveDown.title = "Mover eixo para frente";
  moveDown.disabled =
    state.selectedMetricIndex ===
    data.metrics.length - 1;

  moveDown.addEventListener("click", () => {
    const index = state.selectedMetricIndex;

    if (
      index < 0 ||
      index >= data.metrics.length - 1
    ) {
      return;
    }

    [
      data.metrics[index],
      data.metrics[index + 1]
    ] = [
      data.metrics[index + 1],
      data.metrics[index]
    ];

    state.selectedMetricIndex = index + 1;
    rerender(false);
    renderWorkspace();
  });

  actions.appendChild(moveUp);
  actions.appendChild(moveDown);
  head.appendChild(actions);
  editor.appendChild(head);

  editor.appendChild(
    riField({
      label: "Nome do eixo",
      value: metric.label,
      placeholder: "Ex.: Posse",
      onInput: (value) => {
        metric.label = value;
        rerender(false);

        riRefreshMetricRow(
          workspace,
          state.selectedMetricIndex,
          data
        );
      }
    })
  );

  editor.appendChild(
    riBuildValueEditor({
      teamKey: "home",
      teamName: data.home || "Equipe dourada",
      color: "#C58B12",
      metric,
      data,
      rerender,
      workspace
    })
  );

  editor.appendChild(
    riBuildValueEditor({
      teamKey: "away",
      teamName: data.away || "Equipe azul",
      color: "#071F3D",
      metric,
      data,
      rerender,
      workspace
    })
  );

  const inline = riElement(
    "div",
    "ri-inline-actions"
  );

  inline.appendChild(
    riButton({
      label: "Duplicar",
      icon: "⧉",
      className:
        "ri-button ri-button-compact",
      onClick: () => {
        const copy = {
          label: `${metric.label} cópia`,
          home: metric.home,
          away: metric.away
        };

        data.metrics.splice(
          state.selectedMetricIndex + 1,
          0,
          copy
        );

        state.selectedMetricIndex += 1;
        rerender(false);
        renderWorkspace();
      }
    })
  );

  inline.appendChild(
    riButton({
      label: "Excluir",
      icon: "×",
      className:
        "ri-button ri-button-compact ri-button-danger",
      onClick: () => {
        data.metrics.splice(
          state.selectedMetricIndex,
          1
        );

        state.selectedMetricIndex =
          riClamp(
            state.selectedMetricIndex,
            0,
            Math.max(
              0,
              data.metrics.length - 1
            )
          );

        rerender(false);
        renderWorkspace();
      }
    })
  );

  editor.appendChild(inline);

  return editor;
}

function riBuildMetricsCard({
  data,
  state,
  rerender,
  renderWorkspace,
  workspace,
  frame
}) {
  const { card, head } = riCard(
    "Métricas do radar",
    "Eixos"
  );

  head.appendChild(
    riElement(
      "span",
      "ri-count",
      String(data.metrics.length)
    )
  );

  card.appendChild(
    riElement(
      "div",
      "ri-help",
      "Clique em uma métrica para editar. No gráfico, clique no nome do eixo ou arraste qualquer ponto para alterar o valor."
    )
  );

  const list = riElement(
    "div",
    "ri-metric-list"
  );
  list.style.marginTop = "10px";

  if (!data.metrics.length) {
    list.appendChild(
      riElement(
        "div",
        "ri-empty",
        "O radar está vazio. Crie a primeira métrica para começar."
      )
    );
  } else {
    data.metrics.forEach((metric, index) => {
      list.appendChild(
        riBuildMetricRow({
          metric,
          index,
          data,
          state,
          renderWorkspace,
          frame
        })
      );
    });
  }

  card.appendChild(list);

  const editor =
    riBuildSelectedMetricEditor({
      data,
      state,
      rerender,
      renderWorkspace,
      workspace
    });

  if (editor) {
    card.appendChild(editor);
  }

  const actions = riElement(
    "div",
    "ri-inline-actions"
  );

  actions.appendChild(
    riButton({
      label: "Nova métrica",
      icon: "+",
      className:
        "ri-button ri-button-compact ri-button-primary",
      onClick: () => {
        riAddMetric(
          data,
          state,
          rerender,
          renderWorkspace
        );
      }
    })
  );

  actions.appendChild(
    riButton({
      label: "Excluir todas",
      icon: "×",
      className:
        "ri-button ri-button-compact ri-button-danger",
      disabled: !data.metrics.length,
      onClick: () => {
        const confirmed = window.confirm(
          "Excluir todas as métricas do radar?"
        );

        if (!confirmed) {
          return;
        }

        data.metrics.length = 0;
        state.selectedMetricIndex = 0;
        rerender(false);
        renderWorkspace();
      }
    })
  );

  card.appendChild(actions);

  if (
    data.metrics.length > 0 &&
    data.metrics.length < 3
  ) {
    card.appendChild(
      riElement(
        "div",
        "ri-warning",
        "Um radar costuma funcionar melhor com pelo menos três métricas."
      )
    );
  }

  return card;
}

function riBuildCardRow({
  cardData,
  index,
  state,
  renderWorkspace,
  frame,
  data
}) {
  const row = riElement(
    "button",
    "ri-card-row"
  );

  row.type = "button";

  if (state.selectedCardIndex === index) {
    row.classList.add("is-selected");
  }

  row.appendChild(
    riElement(
      "strong",
      "",
      `${cardData.label || `Card ${index + 1}`} • ${cardData.value ?? ""}`
    )
  );

  row.appendChild(
    riElement(
      "span",
      "",
      cardData.text || "Sem texto de apoio"
    )
  );

  row.addEventListener("click", () => {
    state.selectedCardIndex = index;
    renderWorkspace();
    riApplySelectionStyle(
      frame,
      data,
      state
    );
  });

  return row;
}

function riBuildSelectedCardEditor({
  data,
  state,
  rerender,
  renderWorkspace
}) {
  const cardData =
    data.cards[state.selectedCardIndex];

  if (!cardData) {
    return null;
  }

  const editor = riElement(
    "div",
    "ri-editor"
  );

  editor.appendChild(
    riElement(
      "div",
      "ri-editor-title",
      "Card selecionado"
    )
  );

  editor.style.marginTop = "12px";

  editor.appendChild(
    riField({
      label: "Rótulo",
      value: cardData.label,
      placeholder: "Ex.: Posse",
      onInput: (value) => {
        cardData.label = value;
        rerender(false);
      }
    })
  );

  editor.appendChild(
    riField({
      label: "Valor",
      value: cardData.value,
      placeholder: "Ex.: 72",
      onInput: (value) => {
        cardData.value = value;
        rerender(false);
      }
    })
  );

  editor.appendChild(
    riField({
      label: "Texto de apoio",
      value: cardData.text,
      placeholder: "Ex.: Percentil França",
      onInput: (value) => {
        cardData.text = value;
        rerender(false);
      }
    })
  );

  const actions = riElement(
    "div",
    "ri-inline-actions"
  );

  actions.appendChild(
    riButton({
      label: "Duplicar",
      icon: "⧉",
      className:
        "ri-button ri-button-compact",
      onClick: () => {
        data.cards.splice(
          state.selectedCardIndex + 1,
          0,
          { ...cardData }
        );

        state.selectedCardIndex += 1;
        rerender(false);
        renderWorkspace();
      }
    })
  );

  actions.appendChild(
    riButton({
      label: "Excluir",
      icon: "×",
      className:
        "ri-button ri-button-compact ri-button-danger",
      onClick: () => {
        data.cards.splice(
          state.selectedCardIndex,
          1
        );

        state.selectedCardIndex = riClamp(
          state.selectedCardIndex,
          0,
          Math.max(0, data.cards.length - 1)
        );

        rerender(false);
        renderWorkspace();
      }
    })
  );

  editor.appendChild(actions);

  return editor;
}

function riBuildCardsCard({
  data,
  state,
  rerender,
  renderWorkspace,
  frame
}) {
  const { card, head } = riCard(
    "Cards de destaque",
    "Rodapé visual"
  );

  head.appendChild(
    riElement(
      "span",
      "ri-count",
      String(data.cards.length)
    )
  );

  const list = riElement(
    "div",
    "ri-card-list"
  );

  if (!data.cards.length) {
    list.appendChild(
      riElement(
        "div",
        "ri-empty",
        "Nenhum card de destaque. Você pode criar um sem alterar as métricas do radar."
      )
    );
  } else {
    data.cards.forEach((cardData, index) => {
      list.appendChild(
        riBuildCardRow({
          cardData,
          index,
          state,
          renderWorkspace,
          frame,
          data
        })
      );
    });
  }

  card.appendChild(list);

  const editor =
    riBuildSelectedCardEditor({
      data,
      state,
      rerender,
      renderWorkspace
    });

  if (editor) {
    card.appendChild(editor);
  }

  const actions = riElement(
    "div",
    "ri-inline-actions"
  );

  actions.appendChild(
    riButton({
      label: "Novo card",
      icon: "+",
      className:
        "ri-button ri-button-compact ri-button-primary",
      onClick: () => {
        riAddCard(
          data,
          state,
          rerender,
          renderWorkspace
        );
      }
    })
  );

  actions.appendChild(
    riButton({
      label: "Excluir todos",
      icon: "×",
      className:
        "ri-button ri-button-compact ri-button-danger",
      disabled: !data.cards.length,
      onClick: () => {
        const confirmed = window.confirm(
          "Excluir todos os cards de destaque?"
        );

        if (!confirmed) {
          return;
        }

        data.cards.length = 0;
        state.selectedCardIndex = 0;
        rerender(false);
        renderWorkspace();
      }
    })
  );

  card.appendChild(actions);

  return card;
}

function riBuildTextDetails({
  data,
  rerender
}) {
  const details = riElement(
    "details",
    "ri-details"
  );

  const summary = riElement(
    "summary",
    "",
    "Texto do card"
  );

  const body = riElement(
    "div",
    "ri-details-body"
  );

  body.appendChild(
    riField({
      label: "Título",
      value: data.title,
      onInput: (value) => {
        data.title = value;
        rerender(false);
      }
    })
  );

  body.appendChild(
    riField({
      label: "Subtítulo",
      value: data.subtitle,
      onInput: (value) => {
        data.subtitle = value;
        rerender(false);
      }
    })
  );

  body.appendChild(
    riField({
      label: "Título da leitura",
      value: data.readingTitle,
      onInput: (value) => {
        data.readingTitle = value;
        rerender(false);
      }
    })
  );

  body.appendChild(
    riTextArea({
      label: "Leitura",
      value: data.readingText,
      onInput: (value) => {
        data.readingText = value;
        rerender(false);
      }
    })
  );

  body.appendChild(
    riTextArea({
      label: "Ponto-chave",
      value: data.keyText,
      onInput: (value) => {
        data.keyText = value;
        rerender(false);
      }
    })
  );

  body.appendChild(
    riField({
      label: "Fonte",
      value: data.source,
      onInput: (value) => {
        data.source = value;
        rerender(false);
      }
    })
  );

  details.appendChild(summary);
  details.appendChild(body);

  return details;
}

function riBuildSettingsDetails({
  data,
  rerender,
  renderWorkspace
}) {
  const details = riElement(
    "details",
    "ri-details"
  );

  const summary = riElement(
    "summary",
    "",
    "Configurações do radar"
  );

  const body = riElement(
    "div",
    "ri-details-body"
  );

  body.appendChild(
    riField({
      label: "Valor máximo da escala",
      value: data.maxValue,
      type: "number",
      onInput: (rawValue) => {
        const nextMax = Math.max(
          1,
          Math.round(
            riNumber(rawValue, data.maxValue)
          )
        );

        data.maxValue = nextMax;

        data.metrics.forEach((metric) => {
          metric.home = riClamp(
            metric.home,
            0,
            nextMax
          );
          metric.away = riClamp(
            metric.away,
            0,
            nextMax
          );
        });

        rerender(false);
      }
    })
  );

  const presets = riElement(
    "div",
    "ri-presets"
  );

  [10, 100, 1000].forEach((value) => {
    const preset = riElement(
      "button",
      "ri-preset",
      `0–${value}`
    );

    preset.type = "button";

    preset.addEventListener("click", () => {
      data.maxValue = value;

      data.metrics.forEach((metric) => {
        metric.home = riClamp(
          metric.home,
          0,
          value
        );
        metric.away = riClamp(
          metric.away,
          0,
          value
        );
      });

      rerender(false);
      renderWorkspace();
    });

    presets.appendChild(preset);
  });

  body.appendChild(presets);

  body.appendChild(
    riElement(
      "div",
      "ri-warning",
      "Ao reduzir a escala máxima, valores acima do novo limite são ajustados automaticamente."
    )
  );

  details.appendChild(summary);
  details.appendChild(body);

  return details;
}

function buildAdvancedRadarInspector({
  form,
  frame,
  schema,
  currentValues
}) {
  ensureRadarInspectorStyles();
  form.innerHTML = "";

  const win = frame.contentWindow;
  const data = win[schema.dataKey];

  if (!data) {
    form.innerHTML =
      "Dados do radar não encontrados no componente.";
    return;
  }

  riNormalizeData(data);

  currentValues.__data = data;
  currentValues.__variableName =
    schema.dataKey;

  const state = riGetState(frame);

  state.selectedMetricIndex = riClamp(
    state.selectedMetricIndex,
    0,
    Math.max(0, data.metrics.length - 1)
  );

  state.selectedCardIndex = riClamp(
    state.selectedCardIndex,
    0,
    Math.max(0, data.cards.length - 1)
  );

  const workspace = riElement(
    "div",
    "ri-shell"
  );

  form.appendChild(workspace);

  const rerender = (
    refreshWorkspace = false
  ) => {
    riRerenderComponent(
      win,
      schema,
      data
    );

    requestAnimationFrame(() => {
      riApplySelectionStyle(
        frame,
        data,
        state
      );
    });

    if (refreshWorkspace) {
      renderWorkspace();
    }
  };

  const renderWorkspace = () => {
    workspace.innerHTML = "";

    workspace.appendChild(
      riBuildHero({
        data,
        state,
        rerender,
        renderWorkspace
      })
    );

    workspace.appendChild(
      riBuildTeamsCard({
        data,
        rerender
      })
    );

    workspace.appendChild(
      riBuildMetricsCard({
        data,
        state,
        rerender,
        renderWorkspace,
        workspace,
        frame
      })
    );

    workspace.appendChild(
      riBuildCardsCard({
        data,
        state,
        rerender,
        renderWorkspace,
        frame
      })
    );

    workspace.appendChild(
      riBuildTextDetails({
        data,
        rerender
      })
    );

    workspace.appendChild(
      riBuildSettingsDetails({
        data,
        rerender,
        renderWorkspace
      })
    );

    requestAnimationFrame(() => {
      riApplySelectionStyle(
        frame,
        data,
        state
      );
    });
  };

  state.renderWorkspace = renderWorkspace;
  state.rerender = rerender;

  riAttachFrameEvents({
    frame,
    data,
    state,
    rerender,
    renderWorkspace
  });

  renderWorkspace();
  rerender(false);
}

buildInspector = function buildInspectorWithRadarMode(
  args
) {
  if (
    args.schema.mode === "radar-advanced"
  ) {
    buildAdvancedRadarInspector(args);
    return;
  }

  radarBaseBuildInspector(args);
};
