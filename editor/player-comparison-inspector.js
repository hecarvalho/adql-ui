/* ==========================================================
   ADQL EDITOR
   C-05 — PLAYER COMPARISON / EDITOR AVANÇADO
========================================================== */

editorSchemas["player-comparison"] = {
  mode: "player-comparison-advanced",
  dataKey: "playerComparisonData",
  renderFunction: "renderPlayerComparison"
};

const playerComparisonBaseBuildInspector = buildInspector;
const playerComparisonEditorStates = new WeakMap();

function pciElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== "") {
    element.textContent = text;
  }

  return element;
}

function pciClamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function pciNumber(value, fallback = 0) {
  const parsed = Number(String(value ?? "").trim().replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function pciParseNumber(value) {
  const normalized = String(value ?? "").trim().replace(",", ".");

  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function pciUid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function pciGetState(frame) {
  let state = playerComparisonEditorStates.get(frame);

  if (!state) {
    state = {
      selectedPlayerId: null,
      selectedRadarId: null,
      selectedRadarMetricId: null,
      selectedBarMetricId: null,
      selectedBarEntryId: null,
      openSections: {
        players: false,
        radars: true,
        bars: false,
        text: false
      },
      openBarEntries: {},
      pendingWorkspaceRefresh: false,
      drag: null,
      boundDocument: null,
      renderWorkspace: null,
      rerender: null,
      cleanup: null
    };

    playerComparisonEditorStates.set(frame, state);
  }

  return state;
}

function pciButton({
  label,
  icon = "",
  className = "pci-button",
  onClick,
  disabled = false,
  title = ""
}) {
  const button = pciElement("button", className);
  button.type = "button";
  button.disabled = disabled;

  if (title) {
    button.title = title;
  }

  if (icon) {
    button.appendChild(pciElement("span", "pci-button-icon", icon));
  }

  button.appendChild(pciElement("span", "pci-button-label", label));

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!button.disabled) {
      onClick?.(event);
    }
  });

  return button;
}

function pciField({
  label,
  value,
  type = "text",
  placeholder = "",
  min,
  max,
  step,
  onInput,
  onChange,
  onBlur,
  className = ""
}) {
  const wrapper = pciElement("label", `pci-field ${className}`.trim());
  wrapper.appendChild(pciElement("span", "pci-field-label", label));

  const input = document.createElement("input");
  input.type = type;
  input.value = value ?? "";
  input.placeholder = placeholder;

  if (min !== undefined) input.min = String(min);
  if (max !== undefined) input.max = String(max);
  if (step !== undefined) input.step = String(step);

  input.addEventListener("input", () => {
    onInput?.(input.value, input);
  });

  input.addEventListener("change", () => {
    onChange?.(input.value, input);
  });

  input.addEventListener("blur", () => {
    onBlur?.(input.value, input);
  });

  wrapper.appendChild(input);
  return wrapper;
}

function pciTextArea({ label, value, onInput }) {
  const wrapper = pciElement("label", "pci-field");
  wrapper.appendChild(pciElement("span", "pci-field-label", label));

  const input = document.createElement("textarea");
  input.value = value ?? "";

  input.addEventListener("input", () => {
    onInput?.(input.value, input);
  });

  wrapper.appendChild(input);
  return wrapper;
}

function pciCard(title, eyebrow = "") {
  const card = pciElement("section", "pci-card");
  const head = pciElement("div", "pci-card-head");
  const titleWrap = pciElement("div");

  if (eyebrow) {
    titleWrap.appendChild(pciElement("span", "pci-eyebrow", eyebrow));
  }

  titleWrap.appendChild(pciElement("h4", "", title));
  head.appendChild(titleWrap);
  card.appendChild(head);

  return { card, head, titleWrap };
}

function pciDetails(title, eyebrow = "") {
  const details = pciElement("details", "pci-details");
  const summary = pciElement("summary");
  const titleWrap = pciElement("div");

  if (eyebrow) {
    titleWrap.appendChild(pciElement("span", "pci-eyebrow", eyebrow));
  }

  titleWrap.appendChild(pciElement("strong", "", title));
  summary.appendChild(titleWrap);
  summary.appendChild(pciElement("span", "pci-details-plus", "+"));
  details.appendChild(summary);

  return details;
}

function pciWrapCardInCollapse({
  card,
  state,
  sectionKey,
  defaultOpen = false
}) {
  state.openSections ||= {};

  const details = pciElement("details", "pci-section-details");
  const savedState = state.openSections[sectionKey];

  details.open =
    typeof savedState === "boolean"
      ? savedState
      : defaultOpen;

  const summary = pciElement("summary", "pci-section-summary");
  const head = card.firstElementChild?.classList?.contains("pci-card-head")
    ? card.firstElementChild
    : null;

  if (head) {
    summary.appendChild(head);
  }

  summary.appendChild(pciElement("span", "pci-details-plus", "+"));
  details.appendChild(summary);

  const body = pciElement("div", "pci-section-body");
  body.appendChild(card);
  details.appendChild(body);

  details.addEventListener("toggle", () => {
    state.openSections[sectionKey] = details.open;
  });

  return details;
}

function ensurePlayerComparisonInspectorStyles() {
  if (document.getElementById("playerComparisonInspectorStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "playerComparisonInspectorStyles";
  style.textContent = `
    .pci-shell {
      display: grid;
      gap: 16px;
    }

    .pci-hero {
      padding: 17px;
      border-radius: 15px;
      background:
        radial-gradient(circle at 92% 0%, rgba(197,139,18,.24), transparent 34%),
        #071f3d;
      color: #fff;
      box-shadow: 0 12px 30px rgba(7,31,61,.12);
    }

    .pci-hero-top,
    .pci-card-head,
    .pci-row-head,
    .pci-editor-head,
    .pci-value-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .pci-eyebrow {
      display: block;
      color: #c58b12;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }

    .pci-hero h4 {
      margin-top: 4px;
      font-size: 19px;
      line-height: 1.08;
    }

    .pci-hero p {
      margin-top: 8px;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.5;
    }

    .pci-quick-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    .pci-button,
    .pci-icon-button,
    .pci-list-row,
    .pci-team-button {
      font: inherit;
      cursor: pointer;
      transition: 150ms ease;
    }

    .pci-button {
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

    .pci-button:hover {
      border-color: #c58b12;
      transform: translateY(-1px);
    }

    .pci-button:disabled {
      opacity: .35;
      cursor: not-allowed;
      transform: none;
    }

    .pci-hero .pci-button {
      border-color: rgba(255,255,255,.14);
      background: rgba(255,255,255,.08);
      color: #fff;
    }

    .pci-hero .pci-button:hover {
      border-color: #c58b12;
      background: rgba(255,255,255,.12);
    }

    .pci-button-icon {
      font-size: 16px;
      line-height: 1;
    }

    .pci-button-danger {
      border-color: rgba(168,45,45,.25);
      color: #9f2d2d;
    }

    .pci-button-danger:hover {
      border-color: #9f2d2d;
    }

    .pci-button-ghost {
      min-height: 34px;
      padding: 7px 9px;
      background: transparent;
      font-size: 11px;
    }

    .pci-card {
      padding: 15px;
      border: 1px solid #d8d1c3;
      border-radius: 14px;
      background: rgba(255,253,248,.78);
      box-shadow: 0 8px 22px rgba(7,31,61,.04);
    }

    .pci-card-head h4 {
      margin-top: 3px;
      color: #071f3d;
      font-size: 16px;
      line-height: 1.1;
    }

    .pci-count {
      min-width: 25px;
      height: 25px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 99px;
      background: rgba(7,31,61,.08);
      color: #071f3d;
      font-size: 11px;
      font-weight: 900;
    }

    .pci-card-actions {
      display: flex;
      gap: 6px;
    }

    .pci-icon-button {
      width: 30px;
      height: 30px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #d8d1c3;
      border-radius: 8px;
      background: #fff;
      color: #071f3d;
      font-size: 14px;
      font-weight: 900;
    }

    .pci-icon-button:hover {
      border-color: #c58b12;
    }

    .pci-team-settings {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    .pci-field {
      display: block;
      margin-top: 11px;
    }

    .pci-field-label {
      display: block;
      margin-bottom: 6px;
      color: #6f7680;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .pci-field input,
    .pci-field textarea {
      width: 100%;
      border: 1px solid #d8d1c3;
      border-radius: 9px;
      background: #fff;
      color: #071f3d;
      padding: 10px 11px;
      font: 700 12px Inter, Arial, sans-serif;
      outline: none;
    }

    .pci-field textarea {
      min-height: 92px;
      resize: vertical;
      line-height: 1.45;
    }

    .pci-field input:focus,
    .pci-field textarea:focus {
      border-color: #c58b12;
      box-shadow: 0 0 0 2px rgba(197,139,18,.1);
    }

    .pci-list {
      display: grid;
      gap: 7px;
      margin-top: 13px;
    }

    .pci-list-row {
      width: 100%;
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 9px;
      min-height: 44px;
      padding: 8px 9px;
      border: 1px solid #ddd6ca;
      border-radius: 10px;
      background: #fff;
      color: #071f3d;
      text-align: left;
    }

    .pci-list-row:hover,
    .pci-list-row.is-selected {
      border-color: #c58b12;
      box-shadow: 0 0 0 2px rgba(197,139,18,.08);
    }

    .pci-swatch {
      width: 16px;
      height: 6px;
      border-radius: 99px;
      background: var(--pci-color, #c58b12);
    }

    .pci-row-copy {
      min-width: 0;
    }

    .pci-row-copy strong,
    .pci-row-copy span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pci-row-copy strong {
      font-size: 12px;
      font-weight: 900;
    }

    .pci-row-copy span {
      margin-top: 2px;
      color: #7a8189;
      font-size: 10px;
      font-weight: 700;
    }

    .pci-row-value {
      color: #071f3d;
      font-size: 11px;
      font-weight: 900;
    }

    .pci-editor {
      margin-top: 14px;
      padding: 12px;
      border-radius: 11px;
      background: rgba(7,31,61,.045);
      border-left: 3px solid #c58b12;
    }

    .pci-editor-head strong {
      color: #071f3d;
      font-size: 12px;
    }

    .pci-editor-head span {
      color: #7a8189;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .pci-team-switch {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 6px;
      margin-top: 10px;
    }

    .pci-team-button {
      min-height: 34px;
      border: 1px solid #d8d1c3;
      border-radius: 8px;
      background: #fff;
      color: #071f3d;
      font-size: 11px;
      font-weight: 900;
    }

    .pci-team-button.is-active[data-team="A"] {
      border-color: #c58b12;
      background: rgba(197,139,18,.12);
    }

    .pci-team-button.is-active[data-team="B"] {
      border-color: #071f3d;
      background: rgba(7,31,61,.1);
    }

    .pci-editor-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      margin-top: 11px;
    }

    .pci-value-list {
      display: grid;
      gap: 9px;
      margin-top: 12px;
    }

    .pci-value-row {
      padding: 9px;
      border: 1px solid #ddd6ca;
      border-radius: 9px;
      background: #fff;
    }

    .pci-value-head strong {
      min-width: 0;
      overflow: hidden;
      color: #071f3d;
      font-size: 11px;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .pci-value-head input {
      width: 72px;
      border: 1px solid #d8d1c3;
      border-radius: 7px;
      padding: 6px 7px;
      color: #071f3d;
      font: 800 11px Inter, Arial, sans-serif;
      text-align: right;
      outline: none;
    }

    .pci-value-row input[type="range"] {
      width: 100%;
      margin-top: 7px;
      accent-color: var(--pci-color, #c58b12);
    }

    .pci-empty {
      margin-top: 12px;
      padding: 17px 12px;
      border: 1px dashed #d8d1c3;
      border-radius: 10px;
      color: #7a8189;
      font-size: 11px;
      font-weight: 700;
      line-height: 1.45;
      text-align: center;
    }

    .pci-section-details {
      border: 1px solid #d8d1c3;
      border-radius: 14px;
      background: rgba(255,253,248,.78);
      box-shadow: 0 8px 22px rgba(7,31,61,.04);
      overflow: hidden;
    }

    .pci-section-summary {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 15px;
      cursor: pointer;
      list-style: none;
      background: rgba(255,253,248,.92);
    }

    .pci-section-summary::-webkit-details-marker {
      display: none;
    }

    .pci-section-summary > .pci-card-head {
      width: 100%;
      min-width: 0;
    }

    .pci-section-summary .pci-card-actions {
      flex-shrink: 0;
    }

    .pci-section-details[open] > .pci-section-summary {
      border-bottom: 1px solid #e2dbcf;
    }

    .pci-section-details[open] > .pci-section-summary .pci-details-plus {
      transform: rotate(45deg);
    }

    .pci-section-body > .pci-card {
      border: 0;
      border-radius: 0;
      background: transparent;
      box-shadow: none;
      padding: 14px 15px 15px;
    }

    .pci-section-body > .pci-card > :first-child {
      margin-top: 0;
    }

    .pci-entry-details {
      border: 1px solid #ddd6ca;
      border-radius: 10px;
      background: #fff;
      overflow: hidden;
    }

    .pci-entry-details > summary {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto auto;
      align-items: center;
      gap: 9px;
      min-height: 46px;
      padding: 9px 10px;
      cursor: pointer;
      list-style: none;
    }

    .pci-entry-details > summary::-webkit-details-marker {
      display: none;
    }

    .pci-entry-details[open] > summary {
      border-bottom: 1px solid #ece6dc;
      background: rgba(7,31,61,.025);
    }

    .pci-entry-details > summary .pci-details-plus {
      font-size: 17px;
    }

    .pci-entry-details[open] > summary .pci-details-plus {
      transform: rotate(45deg);
    }

    .pci-entry-details-body {
      padding: 0 10px 10px;
    }

    .pci-entry-details-body > .pci-field:first-child {
      margin-top: 10px;
    }

    .pci-entry-details .pci-row-value {
      white-space: nowrap;
    }

    .pci-details {
      border: 1px solid #d8d1c3;
      border-radius: 13px;
      background: rgba(255,253,248,.72);
      overflow: hidden;
    }

    .pci-details summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 15px;
      cursor: pointer;
      list-style: none;
    }

    .pci-details summary::-webkit-details-marker {
      display: none;
    }

    .pci-details summary strong {
      display: block;
      margin-top: 3px;
      color: #071f3d;
      font-size: 14px;
    }

    .pci-details-plus {
      color: #c58b12;
      font-size: 20px;
      font-weight: 900;
      transition: transform 150ms ease;
    }

    .pci-details[open] .pci-details-plus {
      transform: rotate(45deg);
    }

    .pci-details-body {
      padding: 0 15px 15px;
    }

    .pci-hint {
      margin-top: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      background: rgba(197,139,18,.08);
      color: #6f7680;
      font-size: 10px;
      font-weight: 700;
      line-height: 1.45;
    }
  `;

  document.head.appendChild(style);
}


function pciNormalizeData(win, data) {
  if (typeof win.pcNormalizeData === "function") {
    win.pcNormalizeData(data);
  }
}

function pciRerenderComponent(win, schema, data) {
  const renderFunction = win[schema.renderFunction];

  if (typeof renderFunction === "function") {
    renderFunction(data);
  }
}

function pciPlayerColor(win, data, playerId) {
  if (typeof win.pcGetPlayerColor === "function") {
    return win.pcGetPlayerColor(data, playerId);
  }

  return data.players.find((player) => player.id === playerId)?.team === "B"
    ? "#071F3D"
    : "#C58B12";
}

function pciGetRadar(data, radarId) {
  return data.radars.find((radar) => radar.id === radarId) ?? null;
}

function pciAddPlayer(data, team) {
  const count = data.players.filter((player) => player.team === team).length + 1;
  const player = {
    id: pciUid(`player-${team.toLowerCase()}`),
    team,
    name: `Jogador ${team}${count}`
  };

  data.players.push(player);

  data.radars.forEach((radar) => {
    radar.metrics.forEach((metric) => {
      metric.values ||= {};
      metric.values[player.id] = Math.round(radar.maxValue * 0.5);
    });
  });

  return player;
}

function pciRemovePlayer(data, playerId) {
  data.players = data.players.filter((player) => player.id !== playerId);

  data.radars.forEach((radar) => {
    radar.metrics.forEach((metric) => {
      if (metric.values) {
        delete metric.values[playerId];
      }
    });
  });
}

function pciDuplicatePlayer(data, playerId) {
  const source = data.players.find((player) => player.id === playerId);

  if (!source) {
    return null;
  }

  const clone = {
    id: pciUid(`player-${source.team.toLowerCase()}`),
    team: source.team,
    name: `${source.name} cópia`
  };

  data.players.push(clone);

  data.radars.forEach((radar) => {
    radar.metrics.forEach((metric) => {
      metric.values ||= {};
      metric.values[clone.id] = pciNumber(metric.values[source.id], 0);
    });
  });

  return clone;
}

function pciCreateDefaultRadarMetric(data, radar, index = 0) {
  const metric = {
    id: pciUid("radar-metric"),
    label: `Métrica ${index + 1}`,
    values: {}
  };

  data.players.forEach((player) => {
    metric.values[player.id] = Math.round(radar.maxValue * 0.5);
  });

  return metric;
}

function pciAddRadar(data) {
  const radar = {
    id: pciUid("radar"),
    title: `Radar ${data.radars.length + 1}`,
    subtitle: "Perfil multidimensional",
    maxValue: 100,
    metrics: []
  };

  radar.metrics.push(
    pciCreateDefaultRadarMetric(data, radar, 0),
    pciCreateDefaultRadarMetric(data, radar, 1),
    pciCreateDefaultRadarMetric(data, radar, 2)
  );

  data.radars.push(radar);
  return radar;
}

function pciDuplicateRadar(data, radarId) {
  const source = pciGetRadar(data, radarId);

  if (!source) {
    return null;
  }

  const clone = {
    id: pciUid("radar"),
    title: `${source.title} cópia`,
    subtitle: source.subtitle,
    maxValue: source.maxValue,
    metrics: source.metrics.map((metric) => ({
      id: pciUid("radar-metric"),
      label: metric.label,
      values: { ...metric.values }
    }))
  };

  const index = data.radars.findIndex((radar) => radar.id === radarId);
  data.radars.splice(index + 1, 0, clone);
  return clone;
}

function pciAddRadarMetric(data, radar) {
  const metric = pciCreateDefaultRadarMetric(data, radar, radar.metrics.length);
  radar.metrics.push(metric);
  return metric;
}

function pciDuplicateRadarMetric(radar, metricId) {
  const source = radar.metrics.find((metric) => metric.id === metricId);

  if (!source) {
    return null;
  }

  const clone = {
    id: pciUid("radar-metric"),
    label: `${source.label} cópia`,
    values: { ...source.values }
  };

  const index = radar.metrics.findIndex((metric) => metric.id === metricId);
  radar.metrics.splice(index + 1, 0, clone);
  return clone;
}

function pciAddBarMetric(data) {
  const metric = {
    id: pciUid("bar"),
    label: `Métrica ${data.barMetrics.length + 1}`,
    unit: "",
    maxValue: 10,
    decimals: 1,
    entries: []
  };

  data.barMetrics.push(metric);
  return metric;
}

function pciDuplicateBarMetric(data, metricId) {
  const source = data.barMetrics.find((metric) => metric.id === metricId);

  if (!source) {
    return null;
  }

  const clone = {
    id: pciUid("bar"),
    label: `${source.label} cópia`,
    unit: source.unit,
    maxValue: source.maxValue,
    decimals: source.decimals,
    entries: (source.entries || []).map((entry) => ({
      id: pciUid("bar-player"),
      team: entry.team,
      name: entry.name,
      value: pciNumber(entry.value, 0)
    }))
  };

  const index = data.barMetrics.findIndex((metric) => metric.id === metricId);
  data.barMetrics.splice(index + 1, 0, clone);
  return clone;
}

function pciAddBarEntry(data, metric, team) {
  metric.entries ||= [];

  const count = metric.entries.filter((entry) => entry.team === team).length + 1;
  const entry = {
    id: pciUid("bar-player"),
    team,
    name: `Jogador ${team}${count}`,
    value: 0
  };

  metric.entries.push(entry);
  return entry;
}

function pciRemoveBarEntry(metric, entryId) {
  metric.entries = (metric.entries || []).filter((entry) => entry.id !== entryId);
}

function pciDuplicateBarEntry(metric, entryId) {
  const source = (metric.entries || []).find((entry) => entry.id === entryId);

  if (!source) {
    return null;
  }

  const clone = {
    id: pciUid("bar-player"),
    team: source.team,
    name: `${source.name} cópia`,
    value: pciNumber(source.value, 0)
  };

  const index = metric.entries.findIndex((entry) => entry.id === entryId);
  metric.entries.splice(index + 1, 0, clone);
  return clone;
}


function pciBuildHero({ data, state, rerender }) {
  const hero = pciElement("section", "pci-hero");
  const top = pciElement("div", "pci-hero-top");
  const copy = pciElement("div");

  copy.appendChild(pciElement("span", "pci-eyebrow", "C-05 • Ferramentas rápidas"));
  copy.appendChild(pciElement("h4", "", "Comparação de jogadores"));
  copy.appendChild(
    pciElement(
      "p",
      "",
      "Os jogadores dos radares e os jogadores das barras agora são independentes. Crie apenas quem participa de cada comparação."
    )
  );

  top.appendChild(copy);
  hero.appendChild(top);

  const actions = pciElement("div", "pci-quick-actions");

  actions.appendChild(
    pciButton({
      label: `Jogador ${data.teams.A}`,
      icon: "+",
      onClick: () => {
        state.openSections.players = true;
        const player = pciAddPlayer(data, "A");
        state.selectedPlayerId = player.id;
        rerender(true);
      }
    })
  );

  actions.appendChild(
    pciButton({
      label: `Jogador ${data.teams.B}`,
      icon: "+",
      onClick: () => {
        state.openSections.players = true;
        const player = pciAddPlayer(data, "B");
        state.selectedPlayerId = player.id;
        rerender(true);
      }
    })
  );

  hero.appendChild(actions);
  return hero;
}

function pciBuildPlayerRow({ win, data, player, state, renderWorkspace, rerender }) {
  const row = pciElement(
    "button",
    `pci-list-row ${state.selectedPlayerId === player.id ? "is-selected" : ""}`
  );
  row.type = "button";

  const swatch = pciElement("span", "pci-swatch");
  swatch.style.setProperty("--pci-color", pciPlayerColor(win, data, player.id));

  const copy = pciElement("span", "pci-row-copy");
  copy.appendChild(pciElement("strong", "", player.name));
  copy.appendChild(pciElement("span", "", player.team === "A" ? data.teams.A : data.teams.B));

  row.appendChild(swatch);
  row.appendChild(copy);
  row.appendChild(pciElement("span", "pci-row-value", player.team));

  row.addEventListener("click", () => {
    state.selectedPlayerId = player.id;
    renderWorkspace();
    rerender(false);
  });

  return row;
}

function pciBuildPlayersCard({ win, data, state, rerender, renderWorkspace }) {
  const { card, head } = pciCard("Jogadores dos radares", "Elenco multidimensional");
  const headActions = pciElement("div", "pci-card-actions");

  headActions.appendChild(pciElement("span", "pci-count", String(data.players.length)));
  headActions.appendChild(
    pciButton({
      label: "Excluir todos",
      className: "pci-button pci-button-ghost pci-button-danger",
      disabled: !data.players.length,
      onClick: () => {
        if (!confirm("Excluir todos os jogadores dos radares e seus valores? As barras serão mantidas.")) {
          return;
        }

        data.players = [];
        data.radars.forEach((radar) => {
          radar.metrics.forEach((metric) => {
            metric.values = {};
          });
        });
        state.selectedPlayerId = null;
        rerender(true);
      }
    })
  );

  head.appendChild(headActions);

  const teamSettings = pciElement("div", "pci-team-settings");
  teamSettings.appendChild(
    pciField({
      label: "Nome do Time A",
      value: data.teams.A,
      onInput: (value) => {
        data.teams.A = value;
        rerender(true);
      }
    })
  );
  teamSettings.appendChild(
    pciField({
      label: "Nome do Time B",
      value: data.teams.B,
      onInput: (value) => {
        data.teams.B = value;
        rerender(true);
      }
    })
  );
  card.appendChild(teamSettings);

  const list = pciElement("div", "pci-list");

  data.players.forEach((player) => {
    list.appendChild(
      pciBuildPlayerRow({ win, data, player, state, renderWorkspace, rerender })
    );
  });

  if (!data.players.length) {
    list.appendChild(
      pciElement(
        "div",
        "pci-empty",
        "Use os botões acima para criar jogadores do Time A ou do Time B."
      )
    );
  }

  card.appendChild(list);

  const selected = data.players.find((player) => player.id === state.selectedPlayerId);

  if (selected) {
    const editor = pciElement("div", "pci-editor");
    const editorHead = pciElement("div", "pci-editor-head");
    editorHead.appendChild(pciElement("strong", "", "Editar jogador"));
    editorHead.appendChild(
      pciElement("span", "", selected.team === "A" ? data.teams.A : data.teams.B)
    );
    editor.appendChild(editorHead);

    editor.appendChild(
      pciField({
        label: "Nome do jogador",
        value: selected.name,
        onInput: (value) => {
          selected.name = value;
          rerender(true);
        }
      })
    );

    const switcher = pciElement("div", "pci-team-switch");

    ["A", "B"].forEach((team) => {
      const button = pciElement(
        "button",
        `pci-team-button ${selected.team === team ? "is-active" : ""}`,
        team === "A" ? data.teams.A : data.teams.B
      );
      button.type = "button";
      button.dataset.team = team;
      button.addEventListener("click", () => {
        selected.team = team;
        rerender(true);
      });
      switcher.appendChild(button);
    });

    editor.appendChild(switcher);

    const actions = pciElement("div", "pci-editor-actions");
    actions.appendChild(
      pciButton({
        label: "Duplicar",
        className: "pci-button pci-button-ghost",
        onClick: () => {
          const clone = pciDuplicatePlayer(data, selected.id);
          state.selectedPlayerId = clone?.id ?? selected.id;
          rerender(true);
        }
      })
    );
    actions.appendChild(
      pciButton({
        label: "Excluir",
        className: "pci-button pci-button-ghost pci-button-danger",
        onClick: () => {
          pciRemovePlayer(data, selected.id);
          state.selectedPlayerId = data.players[0]?.id ?? null;
          rerender(true);
        }
      })
    );
    editor.appendChild(actions);
    card.appendChild(editor);
  }

  return card;
}

function pciMetricSummary(metric, data) {
  if (!data.players.length) {
    return "Sem jogadores";
  }

  const values = data.players.map((player) => pciNumber(metric.values?.[player.id], 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `${min.toLocaleString("pt-BR")} — ${max.toLocaleString("pt-BR")}`;
}

function pciBuildMetricListRow({ metric, selected, summary, onSelect }) {
  const row = pciElement("button", `pci-list-row ${selected ? "is-selected" : ""}`);
  row.type = "button";

  const marker = pciElement("span", "pci-swatch");
  marker.style.setProperty("--pci-color", selected ? "#C58B12" : "#D8D1C3");

  const copy = pciElement("span", "pci-row-copy");
  copy.appendChild(pciElement("strong", "", metric.label));
  copy.appendChild(pciElement("span", "", summary));

  row.appendChild(marker);
  row.appendChild(copy);
  row.appendChild(pciElement("span", "pci-row-value", "›"));
  row.addEventListener("click", onSelect);

  return row;
}

function pciBuildPlayerValueRows({ win, data, metric, maxValue, step, decimals, rerender }) {
  const list = pciElement("div", "pci-value-list");

  data.players.forEach((player) => {
    const row = pciElement("div", "pci-value-row");
    row.style.setProperty("--pci-color", pciPlayerColor(win, data, player.id));

    const head = pciElement("div", "pci-value-head");
    head.appendChild(pciElement("strong", "", player.name));

    const currentValue = () =>
      pciClamp(pciNumber(metric.values?.[player.id], 0), 0, maxValue);

    const normalizeValue = (rawValue) => {
      const parsed = pciParseNumber(rawValue);

      if (parsed === null) {
        return null;
      }

      const clamped = pciClamp(parsed, 0, maxValue);
      return decimals === 0
        ? Math.round(clamped)
        : Number(clamped.toFixed(decimals));
    };

    const numberInput = document.createElement("input");
    numberInput.type = "number";
    numberInput.min = "0";
    numberInput.max = String(maxValue);
    numberInput.step = String(step);
    numberInput.value = String(currentValue());

    const rangeInput = document.createElement("input");
    rangeInput.type = "range";
    rangeInput.min = "0";
    rangeInput.max = String(maxValue);
    rangeInput.step = String(step);
    rangeInput.value = String(currentValue());

    const applyValue = (value) => {
      metric.values ||= {};
      metric.values[player.id] = value;
      rangeInput.value = String(value);
      rerender(false);
    };

    numberInput.addEventListener("input", () => {
      const value = normalizeValue(numberInput.value);

      if (value === null) {
        return;
      }

      applyValue(value);
    });

    numberInput.addEventListener("change", () => {
      const value = normalizeValue(numberInput.value);

      if (value === null) {
        numberInput.value = String(currentValue());
        return;
      }

      applyValue(value);
      numberInput.value = String(value);
    });

    rangeInput.addEventListener("input", () => {
      const value = normalizeValue(rangeInput.value);

      if (value === null) {
        return;
      }

      applyValue(value);
      numberInput.value = String(value);
    });

    head.appendChild(numberInput);
    row.appendChild(head);
    row.appendChild(rangeInput);
    list.appendChild(row);
  });

  if (!data.players.length) {
    list.appendChild(pciElement("div", "pci-empty", "Crie jogadores para editar os valores."));
  }

  return list;
}

function pciBuildRadarCard({ win, data, state, rerender, renderWorkspace }) {
  const { card, head } = pciCard("Radares", "Perfis multidimensionais");
  const actions = pciElement("div", "pci-card-actions");

  actions.appendChild(
    pciButton({
      label: "+ Radar",
      className: "pci-button pci-button-ghost",
      onClick: () => {
        state.openSections.radars = true;
        const radar = pciAddRadar(data);
        state.selectedRadarId = radar.id;
        state.selectedRadarMetricId = radar.metrics[0]?.id ?? null;
        rerender(true);
      }
    })
  );

  actions.appendChild(
    pciButton({
      label: "Excluir todos",
      className: "pci-button pci-button-ghost pci-button-danger",
      disabled: !data.radars.length,
      onClick: () => {
        if (!confirm("Excluir todos os radares? As barras serão mantidas.")) {
          return;
        }

        data.radars = [];
        state.selectedRadarId = null;
        state.selectedRadarMetricId = null;
        rerender(true);
      }
    })
  );

  head.appendChild(actions);

  const radarList = pciElement("div", "pci-list");

  data.radars.forEach((radar, index) => {
    radarList.appendChild(
      pciBuildMetricListRow({
        metric: {
          label: radar.title || `Radar ${index + 1}`
        },
        selected: state.selectedRadarId === radar.id,
        summary: `${radar.metrics.length} métricas • escala ${radar.maxValue}`,
        onSelect: () => {
          state.selectedRadarId = radar.id;

          if (!radar.metrics.some((metric) => metric.id === state.selectedRadarMetricId)) {
            state.selectedRadarMetricId = radar.metrics[0]?.id ?? null;
          }

          renderWorkspace();
          rerender(false);
        }
      })
    );
  });

  if (!data.radars.length) {
    radarList.appendChild(
      pciElement(
        "div",
        "pci-empty",
        "Clique em “+ Radar”. Cada radar pode ter título, escala e conjunto de métricas próprios."
      )
    );
  }

  card.appendChild(radarList);

  const selectedRadar = pciGetRadar(data, state.selectedRadarId);

  if (!selectedRadar) {
    return card;
  }

  const radarEditor = pciElement("div", "pci-editor");
  const radarEditorHead = pciElement("div", "pci-editor-head");
  radarEditorHead.appendChild(pciElement("strong", "", "Editar radar"));
  radarEditorHead.appendChild(
    pciElement("span", "", `${selectedRadar.metrics.length} eixos`)
  );
  radarEditor.appendChild(radarEditorHead);

  radarEditor.appendChild(
    pciField({
      label: "Título do radar",
      value: selectedRadar.title,
      onInput: (value) => {
        selectedRadar.title = value;
        rerender(true);
      }
    })
  );

  radarEditor.appendChild(
    pciField({
      label: "Subtítulo",
      value: selectedRadar.subtitle,
      onInput: (value) => {
        selectedRadar.subtitle = value;
        rerender(false);
      }
    })
  );

  radarEditor.appendChild(
    pciField({
      label: "Valor máximo da escala",
      value: selectedRadar.maxValue,
      type: "number",
      min: 1,
      step: 1,
      onChange: (value, input) => {
        const parsed = pciParseNumber(value);

        if (parsed === null || parsed < 1) {
          input.value = String(selectedRadar.maxValue);
          return;
        }

        const oldMax = Math.max(1, pciNumber(selectedRadar.maxValue, 100));
        const nextMax = Math.max(1, Math.round(parsed));

        if (nextMax === oldMax) {
          input.value = String(oldMax);
          return;
        }

        const ratio = nextMax / oldMax;
        selectedRadar.maxValue = nextMax;

        selectedRadar.metrics.forEach((metric) => {
          Object.keys(metric.values || {}).forEach((playerId) => {
            metric.values[playerId] = pciClamp(
              Math.round(pciNumber(metric.values[playerId], 0) * ratio),
              0,
              nextMax
            );
          });
        });

        input.value = String(nextMax);
        rerender(true);
      }
    })
  );

  const radarEditorActions = pciElement("div", "pci-editor-actions");
  radarEditorActions.appendChild(
    pciButton({
      label: "Duplicar radar",
      className: "pci-button pci-button-ghost",
      onClick: () => {
        const clone = pciDuplicateRadar(data, selectedRadar.id);
        state.selectedRadarId = clone?.id ?? selectedRadar.id;
        state.selectedRadarMetricId = clone?.metrics[0]?.id ?? null;
        rerender(true);
      }
    })
  );
  radarEditorActions.appendChild(
    pciButton({
      label: "Excluir radar",
      className: "pci-button pci-button-ghost pci-button-danger",
      onClick: () => {
        data.radars = data.radars.filter((radar) => radar.id !== selectedRadar.id);
        state.selectedRadarId = data.radars[0]?.id ?? null;
        state.selectedRadarMetricId = data.radars[0]?.metrics[0]?.id ?? null;
        rerender(true);
      }
    })
  );
  radarEditor.appendChild(radarEditorActions);
  card.appendChild(radarEditor);

  const metricEditor = pciElement("div", "pci-editor");
  const metricHead = pciElement("div", "pci-editor-head");
  metricHead.appendChild(pciElement("strong", "", "Métricas deste radar"));

  const metricActions = pciElement("div", "pci-card-actions");
  metricActions.appendChild(
    pciButton({
      label: "+ Métrica",
      className: "pci-button pci-button-ghost",
      onClick: () => {
        const metric = pciAddRadarMetric(data, selectedRadar);
        state.selectedRadarMetricId = metric.id;
        rerender(true);
      }
    })
  );
  metricActions.appendChild(
    pciButton({
      label: "Limpar",
      className: "pci-button pci-button-ghost pci-button-danger",
      disabled: !selectedRadar.metrics.length,
      onClick: () => {
        selectedRadar.metrics = [];
        state.selectedRadarMetricId = null;
        rerender(true);
      }
    })
  );
  metricHead.appendChild(metricActions);
  metricEditor.appendChild(metricHead);

  const metricList = pciElement("div", "pci-list");

  selectedRadar.metrics.forEach((metric) => {
    metricList.appendChild(
      pciBuildMetricListRow({
        metric,
        selected: state.selectedRadarMetricId === metric.id,
        summary: pciMetricSummary(metric, data),
        onSelect: () => {
          state.selectedRadarMetricId = metric.id;
          renderWorkspace();
          rerender(false);
        }
      })
    );
  });

  if (!selectedRadar.metrics.length) {
    metricList.appendChild(
      pciElement(
        "div",
        "pci-empty",
        "Adicione pelo menos três métricas para formar um radar completo."
      )
    );
  }

  metricEditor.appendChild(metricList);

  const selectedMetric = selectedRadar.metrics.find(
    (metric) => metric.id === state.selectedRadarMetricId
  );

  if (selectedMetric) {
    const selectedMetricEditor = pciElement("div", "pci-editor");
    const selectedMetricHead = pciElement("div", "pci-editor-head");
    selectedMetricHead.appendChild(pciElement("strong", "", "Editar métrica"));
    selectedMetricHead.appendChild(
      pciElement("span", "", selectedRadar.title || "Radar")
    );
    selectedMetricEditor.appendChild(selectedMetricHead);

    selectedMetricEditor.appendChild(
      pciField({
        label: "Nome da métrica",
        value: selectedMetric.label,
        onInput: (value) => {
          selectedMetric.label = value;
          rerender(true);
        }
      })
    );

    selectedMetricEditor.appendChild(
      pciBuildPlayerValueRows({
        win,
        data,
        metric: selectedMetric,
        maxValue: selectedRadar.maxValue,
        step: 1,
        decimals: 0,
        rerender
      })
    );

    selectedMetricEditor.appendChild(
      pciElement(
        "div",
        "pci-hint",
        "Você também pode arrastar os pontos diretamente no radar selecionado."
      )
    );

    const selectedMetricActions = pciElement("div", "pci-editor-actions");
    selectedMetricActions.appendChild(
      pciButton({
        label: "Duplicar",
        className: "pci-button pci-button-ghost",
        onClick: () => {
          const clone = pciDuplicateRadarMetric(selectedRadar, selectedMetric.id);
          state.selectedRadarMetricId = clone?.id ?? selectedMetric.id;
          rerender(true);
        }
      })
    );
    selectedMetricActions.appendChild(
      pciButton({
        label: "Excluir",
        className: "pci-button pci-button-ghost pci-button-danger",
        onClick: () => {
          selectedRadar.metrics = selectedRadar.metrics.filter(
            (metric) => metric.id !== selectedMetric.id
          );
          state.selectedRadarMetricId = selectedRadar.metrics[0]?.id ?? null;
          rerender(true);
        }
      })
    );
    selectedMetricEditor.appendChild(selectedMetricActions);
    metricEditor.appendChild(selectedMetricEditor);
  }

  card.appendChild(metricEditor);
  return card;
}

function pciBuildBarsCard({ win, data, state, rerender, renderWorkspace }) {
  const { card, head } = pciCard("Barras comparativas", "Modelo independente");
  const actions = pciElement("div", "pci-card-actions");

  actions.appendChild(
    pciButton({
      label: "+ Métrica",
      className: "pci-button pci-button-ghost",
      onClick: () => {
        state.openSections.bars = true;
        const metric = pciAddBarMetric(data);
        state.selectedBarMetricId = metric.id;
        state.selectedBarEntryId = null;
        rerender(true);
      }
    })
  );

  actions.appendChild(
    pciButton({
      label: "Limpar",
      className: "pci-button pci-button-ghost pci-button-danger",
      disabled: !data.barMetrics.length,
      onClick: () => {
        data.barMetrics = [];
        state.selectedBarMetricId = null;
        state.selectedBarEntryId = null;
        rerender(true);
      }
    })
  );

  head.appendChild(actions);

  card.appendChild(
    pciElement(
      "div",
      "pci-hint",
      "As barras são independentes dos radares. Cada métrica possui sua própria lista de jogadores."
    )
  );

  const list = pciElement("div", "pci-list");

  data.barMetrics.forEach((metric) => {
    const entries = Array.isArray(metric.entries) ? metric.entries : [];

    list.appendChild(
      pciBuildMetricListRow({
        metric,
        selected: state.selectedBarMetricId === metric.id,
        summary: `${entries.length} jogadores • máx. ${metric.maxValue}`,
        onSelect: () => {
          state.selectedBarMetricId = metric.id;

          if (!entries.some((entry) => entry.id === state.selectedBarEntryId)) {
            state.selectedBarEntryId = entries[0]?.id ?? null;
          }

          renderWorkspace();
          rerender(false);
        }
      })
    );
  });

  if (!data.barMetrics.length) {
    list.appendChild(
      pciElement(
        "div",
        "pci-empty",
        "Clique em “+ Métrica”. Depois adicione apenas os jogadores que devem aparecer naquela comparação."
      )
    );
  }

  card.appendChild(list);

  const selected = data.barMetrics.find((metric) => metric.id === state.selectedBarMetricId);

  if (!selected) {
    return card;
  }

  selected.entries ||= [];

  const editor = pciElement("div", "pci-editor");
  const editorHead = pciElement("div", "pci-editor-head");
  editorHead.appendChild(pciElement("strong", "", "Configurar métrica"));
  editorHead.appendChild(pciElement("span", "", "Barras horizontais"));
  editor.appendChild(editorHead);

  editor.appendChild(
    pciField({
      label: "Nome da métrica",
      value: selected.label,
      onInput: (value) => {
        selected.label = value;
        rerender(true);
      }
    })
  );

  const settings = pciElement("div", "pci-team-settings");
  settings.appendChild(
    pciField({
      label: "Unidade",
      value: selected.unit,
      placeholder: "% / km / xG",
      onInput: (value) => {
        selected.unit = value;
        rerender(false);
      }
    })
  );
  settings.appendChild(
    pciField({
      label: "Escala máxima",
      value: selected.maxValue,
      type: "number",
      min: 0.0001,
      step: 0.1,
      onChange: (value, input) => {
        const parsed = pciParseNumber(value);

        if (parsed === null || parsed <= 0) {
          input.value = String(selected.maxValue);
          return;
        }

        selected.maxValue = Math.max(0.0001, parsed);
        input.value = String(selected.maxValue);
        rerender(false);
      }
    })
  );
  editor.appendChild(settings);

  editor.appendChild(
    pciField({
      label: "Casas decimais",
      value: selected.decimals,
      type: "number",
      min: 0,
      max: 3,
      step: 1,
      onChange: (value, input) => {
        const parsed = pciParseNumber(value);

        if (parsed === null) {
          input.value = String(selected.decimals);
          return;
        }

        selected.decimals = pciClamp(Math.round(parsed), 0, 3);
        input.value = String(selected.decimals);
        rerender(false);
      }
    })
  );

  const editorActions = pciElement("div", "pci-editor-actions");
  editorActions.appendChild(
    pciButton({
      label: "Duplicar métrica",
      className: "pci-button pci-button-ghost",
      onClick: () => {
        const clone = pciDuplicateBarMetric(data, selected.id);
        state.selectedBarMetricId = clone?.id ?? selected.id;
        state.selectedBarEntryId = clone?.entries?.[0]?.id ?? null;
        rerender(true);
      }
    })
  );
  editorActions.appendChild(
    pciButton({
      label: "Excluir métrica",
      className: "pci-button pci-button-ghost pci-button-danger",
      onClick: () => {
        data.barMetrics = data.barMetrics.filter((metric) => metric.id !== selected.id);
        state.selectedBarMetricId = data.barMetrics[0]?.id ?? null;
        state.selectedBarEntryId = data.barMetrics[0]?.entries?.[0]?.id ?? null;
        rerender(true);
      }
    })
  );
  editor.appendChild(editorActions);
  card.appendChild(editor);

  const roster = pciElement("div", "pci-editor");
  const rosterHead = pciElement("div", "pci-editor-head");
  rosterHead.appendChild(pciElement("strong", "", "Jogadores desta métrica"));
  rosterHead.appendChild(
    pciElement("span", "", `${selected.entries.length} na comparação`)
  );
  roster.appendChild(rosterHead);

  const addActions = pciElement("div", "pci-quick-actions");
  addActions.appendChild(
    pciButton({
      label: `+ ${data.teams.A}`,
      className: "pci-button pci-button-ghost",
      onClick: () => {
        const entry = pciAddBarEntry(data, selected, "A");
        state.selectedBarEntryId = entry.id;
        rerender(true);
      }
    })
  );
  addActions.appendChild(
    pciButton({
      label: `+ ${data.teams.B}`,
      className: "pci-button pci-button-ghost",
      onClick: () => {
        const entry = pciAddBarEntry(data, selected, "B");
        state.selectedBarEntryId = entry.id;
        rerender(true);
      }
    })
  );
  roster.appendChild(addActions);

  const valueList = pciElement("div", "pci-value-list");

  selected.entries.forEach((entry) => {
    state.openBarEntries ||= {};

    const row = pciElement("details", "pci-entry-details");
    const savedOpenState = state.openBarEntries[entry.id];

    row.open =
      typeof savedOpenState === "boolean"
        ? savedOpenState
        : entry.id === state.selectedBarEntryId;

    const color =
      typeof win.pcGetBarEntryColor === "function"
        ? win.pcGetBarEntryColor(selected, entry.id)
        : entry.team === "B"
          ? "#071F3D"
          : "#C58B12";

    row.style.setProperty("--pci-color", color);

    const summary = pciElement("summary");
    const swatch = pciElement("span", "pci-swatch");
    swatch.style.setProperty("--pci-color", color);

    const copy = pciElement("span", "pci-row-copy");
    copy.appendChild(pciElement("strong", "", entry.name));
    copy.appendChild(
      pciElement(
        "span",
        "",
        entry.team === "A" ? data.teams.A : data.teams.B
      )
    );

    summary.appendChild(swatch);
    summary.appendChild(copy);
    summary.appendChild(
      pciElement(
        "span",
        "pci-row-value",
        `${entry.value}${selected.unit ? ` ${selected.unit}` : ""}`
      )
    );
    summary.appendChild(pciElement("span", "pci-details-plus", "+"));
    row.appendChild(summary);

    const body = pciElement("div", "pci-entry-details-body");

    body.appendChild(
      pciField({
        label: "Nome do jogador",
        value: entry.name,
        onInput: (value) => {
          entry.name = value;
          rerender(true);
        }
      })
    );

    body.appendChild(
      pciField({
        label: "Valor",
        value: entry.value,
        type: "number",
        min: 0,
        step: selected.decimals === 0 ? 1 : 1 / 10 ** selected.decimals,
        onInput: (value) => {
          const parsed = pciParseNumber(value);

          if (parsed === null) {
            return;
          }

          entry.value = Math.max(0, parsed);
          rerender(false);
        },
        onChange: (value, input) => {
          const parsed = pciParseNumber(value);

          if (parsed === null) {
            input.value = String(entry.value);
            return;
          }

          entry.value = Math.max(0, parsed);
          input.value = String(entry.value);
          rerender(false);
        }
      })
    );

    const switcher = pciElement("div", "pci-team-switch");

    ["A", "B"].forEach((team) => {
      const button = pciElement(
        "button",
        `pci-team-button ${entry.team === team ? "is-active" : ""}`,
        team === "A" ? data.teams.A : data.teams.B
      );
      button.type = "button";
      button.dataset.team = team;
      button.addEventListener("click", () => {
        entry.team = team;
        rerender(true);
      });
      switcher.appendChild(button);
    });

    body.appendChild(switcher);

    const rowActions = pciElement("div", "pci-editor-actions");
    rowActions.appendChild(
      pciButton({
        label: "Duplicar",
        className: "pci-button pci-button-ghost",
        onClick: () => {
          const clone = pciDuplicateBarEntry(selected, entry.id);
          state.selectedBarEntryId = clone?.id ?? entry.id;
          state.openBarEntries[clone?.id ?? entry.id] = true;
          rerender(true);
        }
      })
    );
    rowActions.appendChild(
      pciButton({
        label: "Excluir",
        className: "pci-button pci-button-ghost pci-button-danger",
        onClick: () => {
          delete state.openBarEntries[entry.id];
          pciRemoveBarEntry(selected, entry.id);
          state.selectedBarEntryId = selected.entries[0]?.id ?? null;
          rerender(true);
        }
      })
    );
    body.appendChild(rowActions);
    row.appendChild(body);

    row.addEventListener("toggle", () => {
      state.openBarEntries[entry.id] = row.open;

      if (row.open) {
        state.selectedBarEntryId = entry.id;
      }
    });

    valueList.appendChild(row);
  });

  if (!selected.entries.length) {
    valueList.appendChild(
      pciElement(
        "div",
        "pci-empty",
        "Esta métrica está vazia. Adicione jogadores do Time A ou do Time B acima."
      )
    );
  }

  roster.appendChild(valueList);

  const clearActions = pciElement("div", "pci-editor-actions");
  clearActions.appendChild(
    pciButton({
      label: "Limpar jogadores",
      className: "pci-button pci-button-ghost pci-button-danger",
      disabled: !selected.entries.length,
      onClick: () => {
        selected.entries = [];
        state.selectedBarEntryId = null;
        rerender(true);
      }
    })
  );
  roster.appendChild(clearActions);

  card.appendChild(roster);
  return card;
}

function pciBuildTextDetails({ data, rerender, state }) {
  const details = pciDetails("Texto do card", "Conteúdo editorial");
  state.openSections ||= {};
  details.open = Boolean(state.openSections.text);
  details.addEventListener("toggle", () => {
    state.openSections.text = details.open;
  });

  const body = pciElement("div", "pci-details-body");

  body.appendChild(
    pciField({
      label: "Kicker",
      value: data.kicker,
      onInput: (value) => {
        data.kicker = value;
        rerender(false);
      }
    })
  );
  body.appendChild(
    pciField({
      label: "Título",
      value: data.title,
      onInput: (value) => {
        data.title = value;
        rerender(false);
      }
    })
  );
  body.appendChild(
    pciField({
      label: "Subtítulo",
      value: data.subtitle,
      onInput: (value) => {
        data.subtitle = value;
        rerender(false);
      }
    })
  );
  body.appendChild(
    pciField({
      label: "Título da leitura",
      value: data.readingTitle,
      onInput: (value) => {
        data.readingTitle = value;
        rerender(false);
      }
    })
  );
  body.appendChild(
    pciTextArea({
      label: "Leitura",
      value: data.readingText,
      onInput: (value) => {
        data.readingText = value;
        rerender(false);
      }
    })
  );
  body.appendChild(
    pciTextArea({
      label: "Ponto-chave",
      value: data.keyText,
      onInput: (value) => {
        data.keyText = value;
        rerender(false);
      }
    })
  );
  body.appendChild(
    pciField({
      label: "Fonte",
      value: data.source,
      onInput: (value) => {
        data.source = value;
        rerender(false);
      }
    })
  );

  details.appendChild(body);
  return details;
}

function pciResetSelectionStyle(frame, data) {
  const doc = frame.contentDocument;

  if (!doc) {
    return;
  }

  doc.querySelectorAll(".pc-player-chip.is-selected").forEach((chip) => {
    chip.classList.remove("is-selected");
  });

  doc.querySelectorAll(".pc-radar-card.is-selected").forEach((card) => {
    card.classList.remove("is-selected");
  });

  doc.querySelectorAll(".pc-bar-card.is-selected").forEach((card) => {
    card.classList.remove("is-selected");
  });

  doc.querySelectorAll(".pc-radar-label[data-radar-metric-id]").forEach((label) => {
    label.removeAttribute("fill");
  });

  doc.querySelectorAll(".pc-radar-node[data-player-id]").forEach((node) => {
    const player = data.players.find((item) => item.id === node.dataset.playerId);
    node.setAttribute("r", player?.team === "B" ? "7" : "7.5");
    node.setAttribute("stroke-width", "3.4");
  });
}

function pciClearSelectionStyle(frame, data) {
  pciResetSelectionStyle(frame, data);
}

function pciApplySelectionStyle(frame, data, state) {
  const doc = frame.contentDocument;

  if (!doc) {
    return;
  }

  pciResetSelectionStyle(frame, data);

  doc.querySelectorAll(".pc-player-chip[data-player-id]").forEach((chip) => {
    chip.classList.toggle("is-selected", chip.dataset.playerId === state.selectedPlayerId);
  });

  doc.querySelectorAll(".pc-radar-node[data-player-id]").forEach((node) => {
    const isSelected = node.dataset.playerId === state.selectedPlayerId;

    if (isSelected) {
      node.setAttribute("r", "10");
      node.setAttribute("stroke-width", "5");
    }
  });

  doc.querySelectorAll(".pc-radar-card[data-radar-id]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.radarId === state.selectedRadarId);
  });

  doc.querySelectorAll("[data-radar-metric-id].pc-radar-label").forEach((label) => {
    const isSelected =
      label.dataset.radarId === state.selectedRadarId &&
      label.dataset.radarMetricId === state.selectedRadarMetricId;

    if (isSelected) {
      label.setAttribute("fill", "#C58B12");
    }
  });

  doc.querySelectorAll(".pc-bar-card[data-bar-metric-id]").forEach((card) => {
    card.classList.toggle("is-selected", card.dataset.barMetricId === state.selectedBarMetricId);
  });
}

function pciSvgPoint(svg, event) {
  const point = svg.createSVGPoint();
  point.x = event.clientX;
  point.y = event.clientY;

  const matrix = svg.getScreenCTM();

  if (!matrix) {
    return null;
  }

  return point.matrixTransform(matrix.inverse());
}

function pciUpdateRadarDrag({ frame, data, state, event, rerender }) {
  if (!state.drag) {
    return;
  }

  const doc = frame.contentDocument;
  const svg = Array.from(doc?.querySelectorAll("svg.pc-radar[data-radar-id]") || []).find(
    (item) => item.dataset.radarId === state.drag.radarId
  );

  if (!svg) {
    return;
  }

  const radar = pciGetRadar(data, state.drag.radarId);

  if (!radar) {
    return;
  }

  const point = pciSvgPoint(svg, event);

  if (!point) {
    return;
  }

  const metricIndex = radar.metrics.findIndex(
    (metric) => metric.id === state.drag.metricId
  );

  if (metricIndex < 0 || !radar.metrics.length) {
    return;
  }

  const geometry = frame.contentWindow.pcRadarGeometry || {
    cx: 450,
    cy: 330,
    radius: 240
  };

  const angle = (-90 + (360 / radar.metrics.length) * metricIndex) * (Math.PI / 180);
  const unitX = Math.cos(angle);
  const unitY = Math.sin(angle);
  const vectorX = point.x - geometry.cx;
  const vectorY = point.y - geometry.cy;
  const projection = vectorX * unitX + vectorY * unitY;
  const ratio = pciClamp(projection / geometry.radius, 0, 1);
  const value = Math.round(ratio * radar.maxValue);
  const metric = radar.metrics[metricIndex];

  metric.values[state.drag.playerId] = value;
  rerender(false);
}

function pciAttachFrameEvents({ frame, data, state, rerender, renderWorkspace }) {
  const doc = frame.contentDocument;
  const win = frame.contentWindow;

  if (!doc) {
    return;
  }

  state.cleanup?.();
  state.cleanup = null;
  state.boundDocument = doc;

  const handleClick = (event) => {
    const radarNode = event.target.closest?.(
      ".pc-radar-node[data-radar-id][data-player-id][data-radar-metric-id]"
    );

    if (radarNode && !state.drag) {
      state.openSections.radars = true;
      state.selectedPlayerId = radarNode.dataset.playerId;
      state.selectedRadarId = radarNode.dataset.radarId;
      state.selectedRadarMetricId = radarNode.dataset.radarMetricId;
      renderWorkspace();
      pciApplySelectionStyle(frame, data, state);
      return;
    }

    const metricTarget = event.target.closest?.("[data-radar-id][data-radar-metric-id]");

    if (metricTarget?.dataset.radarMetricId && !state.drag) {
      state.openSections.radars = true;
      state.selectedRadarId = metricTarget.dataset.radarId;
      state.selectedRadarMetricId = metricTarget.dataset.radarMetricId;
      renderWorkspace();
      pciApplySelectionStyle(frame, data, state);
      return;
    }

    const radarTarget = event.target.closest?.(".pc-radar-card[data-radar-id]");

    if (radarTarget?.dataset.radarId && !state.drag) {
      state.openSections.radars = true;
      const radar = pciGetRadar(data, radarTarget.dataset.radarId);
      state.selectedRadarId = radarTarget.dataset.radarId;

      if (!radar?.metrics.some((metric) => metric.id === state.selectedRadarMetricId)) {
        state.selectedRadarMetricId = radar?.metrics[0]?.id ?? null;
      }

      renderWorkspace();
      pciApplySelectionStyle(frame, data, state);
      return;
    }

    const playerTarget = event.target.closest?.("[data-player-id]");

    if (playerTarget?.dataset.playerId && !state.drag) {
      state.openSections.players = true;
      state.selectedPlayerId = playerTarget.dataset.playerId;
      renderWorkspace();
      pciApplySelectionStyle(frame, data, state);
      return;
    }

    const barEntryTarget = event.target.closest?.(".pc-bar-row[data-bar-entry-id]");
    const barCardTarget = event.target.closest?.(".pc-bar-card[data-bar-metric-id]");

    if (barEntryTarget?.dataset.barEntryId && barCardTarget?.dataset.barMetricId) {
      state.openSections.bars = true;
      state.selectedBarMetricId = barCardTarget.dataset.barMetricId;
      state.selectedBarEntryId = barEntryTarget.dataset.barEntryId;
      state.openBarEntries ||= {};
      state.openBarEntries[state.selectedBarEntryId] = true;
      renderWorkspace();
      pciApplySelectionStyle(frame, data, state);
      return;
    }

    if (barCardTarget?.dataset.barMetricId) {
      state.openSections.bars = true;
      state.selectedBarMetricId = barCardTarget.dataset.barMetricId;
      renderWorkspace();
      pciApplySelectionStyle(frame, data, state);
    }
  };

  const handlePointerDown = (event) => {
    const node = event.target.closest?.(
      ".pc-radar-node[data-radar-id][data-player-id][data-radar-metric-id]"
    );

    if (!node) {
      return;
    }

    event.preventDefault();
    state.openSections.radars = true;
    state.selectedPlayerId = node.dataset.playerId;
    state.selectedRadarId = node.dataset.radarId;
    state.selectedRadarMetricId = node.dataset.radarMetricId;
    state.drag = {
      radarId: node.dataset.radarId,
      playerId: node.dataset.playerId,
      metricId: node.dataset.radarMetricId
    };

    renderWorkspace();
    pciApplySelectionStyle(frame, data, state);
  };

  const handlePointerMove = (event) => {
    if (!state.drag) {
      return;
    }

    event.preventDefault();
    pciUpdateRadarDrag({ frame, data, state, event, rerender });
  };

  const finishDrag = () => {
    if (!state.drag) {
      return;
    }

    state.drag = null;
    renderWorkspace();
    pciApplySelectionStyle(frame, data, state);
  };

  const handleRendered = () => {
    requestAnimationFrame(() => pciApplySelectionStyle(frame, data, state));
  };

  doc.addEventListener("click", handleClick);
  doc.addEventListener("pointerdown", handlePointerDown);
  doc.addEventListener("pointermove", handlePointerMove);
  doc.addEventListener("pointerup", finishDrag);
  doc.addEventListener("pointercancel", finishDrag);
  win.addEventListener("pointerup", finishDrag);
  win.addEventListener("blur", finishDrag);
  win.addEventListener("adql:player-comparison-rendered", handleRendered);

  const exportButtons = [
    "exportDataBtn",
    "exportHtmlBtn",
    "exportPngBtn"
  ]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const handleExport = () => {
    state.drag = null;
    pciClearSelectionStyle(frame, data);
  };

  exportButtons.forEach((button) => {
    button.addEventListener("click", handleExport, true);
  });

  state.cleanup = () => {
    doc.removeEventListener("click", handleClick);
    doc.removeEventListener("pointerdown", handlePointerDown);
    doc.removeEventListener("pointermove", handlePointerMove);
    doc.removeEventListener("pointerup", finishDrag);
    doc.removeEventListener("pointercancel", finishDrag);
    win.removeEventListener("pointerup", finishDrag);
    win.removeEventListener("blur", finishDrag);
    win.removeEventListener("adql:player-comparison-rendered", handleRendered);

    exportButtons.forEach((button) => {
      button.removeEventListener("click", handleExport, true);
    });

    state.drag = null;

    if (state.boundDocument === doc) {
      state.boundDocument = null;
    }
  };
}

function buildAdvancedPlayerComparisonInspector({
  form,
  frame,
  schema,
  currentValues
}) {
  ensurePlayerComparisonInspectorStyles();
  form.innerHTML = "";

  const win = frame.contentWindow;
  const data = win[schema.dataKey];

  if (!data) {
    form.innerHTML = "Dados do C-05 não encontrados no componente.";
    return;
  }

  pciNormalizeData(win, data);

  currentValues.__data = data;
  currentValues.__variableName = schema.dataKey;

  const state = pciGetState(frame);

  if (!data.players.some((player) => player.id === state.selectedPlayerId)) {
    state.selectedPlayerId = data.players[0]?.id ?? null;
  }

  if (!data.radars.some((radar) => radar.id === state.selectedRadarId)) {
    state.selectedRadarId = data.radars[0]?.id ?? null;
  }

  const activeRadar = pciGetRadar(data, state.selectedRadarId);

  if (!activeRadar?.metrics.some((metric) => metric.id === state.selectedRadarMetricId)) {
    state.selectedRadarMetricId = activeRadar?.metrics[0]?.id ?? null;
  }

  if (!data.barMetrics.some((metric) => metric.id === state.selectedBarMetricId)) {
    state.selectedBarMetricId = data.barMetrics[0]?.id ?? null;
  }

  const activeBarMetric = data.barMetrics.find(
    (metric) => metric.id === state.selectedBarMetricId
  );

  if (!activeBarMetric?.entries?.some((entry) => entry.id === state.selectedBarEntryId)) {
    state.selectedBarEntryId = activeBarMetric?.entries?.[0]?.id ?? null;
  }

  const workspace = pciElement("div", "pci-shell");
  form.appendChild(workspace);

  const rerender = (refreshWorkspace = false) => {
    pciRerenderComponent(win, schema, data);

    requestAnimationFrame(() => {
      pciApplySelectionStyle(frame, data, state);
    });

    if (!refreshWorkspace) {
      return;
    }

    const activeElement = document.activeElement;
    const isTyping =
      activeElement &&
      workspace.contains(activeElement) &&
      (activeElement.tagName === "INPUT" || activeElement.tagName === "TEXTAREA");

    if (isTyping) {
      state.pendingWorkspaceRefresh = true;

      if (activeElement.dataset.pciRefreshOnBlur !== "true") {
        activeElement.dataset.pciRefreshOnBlur = "true";

        activeElement.addEventListener(
          "blur",
          () => {
            window.setTimeout(() => {
              if (!state.pendingWorkspaceRefresh) {
                return;
              }

              const nextActiveElement = document.activeElement;
              const focusStayedInWorkspace =
                nextActiveElement && workspace.contains(nextActiveElement);

              if (focusStayedInWorkspace) {
                return;
              }

              state.pendingWorkspaceRefresh = false;
              renderWorkspace();
            }, 120);
          },
          { once: true }
        );
      }

      return;
    }

    state.pendingWorkspaceRefresh = false;
    renderWorkspace();
  };

  const renderWorkspace = () => {
    workspace.innerHTML = "";

    workspace.appendChild(
      pciBuildHero({ data, state, rerender })
    );

    workspace.appendChild(
      pciWrapCardInCollapse({
        card: pciBuildPlayersCard({ win, data, state, rerender, renderWorkspace }),
        state,
        sectionKey: "players",
        defaultOpen: false
      })
    );

    workspace.appendChild(
      pciWrapCardInCollapse({
        card: pciBuildRadarCard({ win, data, state, rerender, renderWorkspace }),
        state,
        sectionKey: "radars",
        defaultOpen: true
      })
    );

    workspace.appendChild(
      pciWrapCardInCollapse({
        card: pciBuildBarsCard({ win, data, state, rerender, renderWorkspace }),
        state,
        sectionKey: "bars",
        defaultOpen: false
      })
    );

    workspace.appendChild(pciBuildTextDetails({ data, rerender, state }));

    requestAnimationFrame(() => {
      pciApplySelectionStyle(frame, data, state);
    });
  };

  state.renderWorkspace = renderWorkspace;
  state.rerender = rerender;

  pciAttachFrameEvents({ frame, data, state, rerender, renderWorkspace });

  renderWorkspace();
  rerender(false);
}

buildInspector = function buildInspectorWithPlayerComparisonMode(args) {
  if (args.schema.mode === "player-comparison-advanced") {
    buildAdvancedPlayerComparisonInspector(args);
    return;
  }

  const playerComparisonState = playerComparisonEditorStates.get(args.frame);
  playerComparisonState?.cleanup?.();
  playerComparisonBaseBuildInspector(args);
};
