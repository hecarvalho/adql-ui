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

function pciUid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function pciGetState(frame) {
  let state = playerComparisonEditorStates.get(frame);

  if (!state) {
    state = {
      selectedPlayerId: null,
      selectedRadarMetricId: null,
      selectedBarMetricId: null,
      drag: null,
      boundDocument: null,
      renderWorkspace: null,
      rerender: null
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

function pciAddPlayer(data, team) {
  const count = data.players.filter((player) => player.team === team).length + 1;
  const player = {
    id: pciUid(`player-${team.toLowerCase()}`),
    team,
    name: `Jogador ${team}${count}`
  };

  data.players.push(player);

  data.radarMetrics.forEach((metric) => {
    metric.values ||= {};
    metric.values[player.id] = Math.round(data.radarMaxValue * 0.5);
  });

  data.barMetrics.forEach((metric) => {
    metric.values ||= {};
    metric.values[player.id] = 0;
  });

  return player;
}

function pciRemovePlayer(data, playerId) {
  data.players = data.players.filter((player) => player.id !== playerId);

  [...data.radarMetrics, ...data.barMetrics].forEach((metric) => {
    if (metric.values) {
      delete metric.values[playerId];
    }
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

  data.radarMetrics.forEach((metric) => {
    metric.values ||= {};
    metric.values[clone.id] = pciNumber(metric.values[source.id], 0);
  });

  data.barMetrics.forEach((metric) => {
    metric.values ||= {};
    metric.values[clone.id] = pciNumber(metric.values[source.id], 0);
  });

  return clone;
}

function pciAddRadarMetric(data) {
  const metric = {
    id: pciUid("radar"),
    label: `Métrica ${data.radarMetrics.length + 1}`,
    values: {}
  };

  data.players.forEach((player) => {
    metric.values[player.id] = Math.round(data.radarMaxValue * 0.5);
  });

  data.radarMetrics.push(metric);
  return metric;
}

function pciDuplicateRadarMetric(data, metricId) {
  const source = data.radarMetrics.find((metric) => metric.id === metricId);

  if (!source) {
    return null;
  }

  const clone = {
    id: pciUid("radar"),
    label: `${source.label} cópia`,
    values: { ...source.values }
  };

  const index = data.radarMetrics.findIndex((metric) => metric.id === metricId);
  data.radarMetrics.splice(index + 1, 0, clone);
  return clone;
}

function pciAddBarMetric(data) {
  const metric = {
    id: pciUid("bar"),
    label: `Métrica ${data.barMetrics.length + 1}`,
    unit: "",
    maxValue: 10,
    decimals: 1,
    values: {}
  };

  data.players.forEach((player) => {
    metric.values[player.id] = 0;
  });

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
    values: { ...source.values }
  };

  const index = data.barMetrics.findIndex((metric) => metric.id === metricId);
  data.barMetrics.splice(index + 1, 0, clone);
  return clone;
}

function pciBuildHero({ data, state, rerender, renderWorkspace }) {
  const hero = pciElement("section", "pci-hero");
  const top = pciElement("div", "pci-hero-top");
  const copy = pciElement("div");

  copy.appendChild(pciElement("span", "pci-eyebrow", "C-05 • Ferramentas rápidas"));
  copy.appendChild(pciElement("h4", "", "Comparação de jogadores"));
  copy.appendChild(
    pciElement(
      "p",
      "",
      "Crie jogadores por equipe e depois construa o radar e as comparações em barras."
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
  const { card, head } = pciCard("Jogadores", "Elenco comparado");
  const headActions = pciElement("div", "pci-card-actions");

  headActions.appendChild(pciElement("span", "pci-count", String(data.players.length)));
  headActions.appendChild(
    pciButton({
      label: "Excluir todos",
      className: "pci-button pci-button-ghost pci-button-danger",
      disabled: !data.players.length,
      onClick: () => {
        if (!confirm("Excluir todos os jogadores e seus valores?")) {
          return;
        }

        data.players = [];
        data.radarMetrics.forEach((metric) => (metric.values = {}));
        data.barMetrics.forEach((metric) => (metric.values = {}));
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
    editorHead.appendChild(pciElement("span", "", selected.team === "A" ? data.teams.A : data.teams.B));
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

    const numberInput = document.createElement("input");
    numberInput.type = "number";
    numberInput.min = "0";
    numberInput.max = String(maxValue);
    numberInput.step = String(step);
    numberInput.value = pciNumber(metric.values?.[player.id], 0);

    const rangeInput = document.createElement("input");
    rangeInput.type = "range";
    rangeInput.min = "0";
    rangeInput.max = String(maxValue);
    rangeInput.step = String(step);
    rangeInput.value = pciNumber(metric.values?.[player.id], 0);

    const update = (rawValue, source) => {
      const value = pciClamp(pciNumber(rawValue, 0), 0, maxValue);
      metric.values[player.id] = decimals === 0 ? Math.round(value) : Number(value.toFixed(decimals));
      numberInput.value = String(metric.values[player.id]);
      rangeInput.value = String(metric.values[player.id]);
      rerender(false);

      if (source === numberInput) {
        source.value = String(metric.values[player.id]);
      }
    };

    numberInput.addEventListener("input", () => update(numberInput.value, numberInput));
    rangeInput.addEventListener("input", () => update(rangeInput.value, rangeInput));

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
  const { card, head } = pciCard("Radar", "Perfil multidimensional");
  const actions = pciElement("div", "pci-card-actions");

  actions.appendChild(
    pciButton({
      label: "+ Métrica",
      className: "pci-button pci-button-ghost",
      onClick: () => {
        const metric = pciAddRadarMetric(data);
        state.selectedRadarMetricId = metric.id;
        rerender(true);
      }
    })
  );

  actions.appendChild(
    pciButton({
      label: "Limpar",
      className: "pci-button pci-button-ghost pci-button-danger",
      disabled: !data.radarMetrics.length,
      onClick: () => {
        data.radarMetrics = [];
        state.selectedRadarMetricId = null;
        rerender(true);
      }
    })
  );

  head.appendChild(actions);

  const list = pciElement("div", "pci-list");

  data.radarMetrics.forEach((metric) => {
    list.appendChild(
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

  if (!data.radarMetrics.length) {
    list.appendChild(
      pciElement(
        "div",
        "pci-empty",
        "Adicione pelo menos três métricas para criar um radar completo."
      )
    );
  }

  card.appendChild(list);

  const selected = data.radarMetrics.find((metric) => metric.id === state.selectedRadarMetricId);

  if (selected) {
    const editor = pciElement("div", "pci-editor");
    const editorHead = pciElement("div", "pci-editor-head");
    editorHead.appendChild(pciElement("strong", "", "Editar métrica do radar"));
    editorHead.appendChild(pciElement("span", "", `${data.radarMetrics.length} eixos`));
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

    editor.appendChild(
      pciBuildPlayerValueRows({
        win,
        data,
        metric: selected,
        maxValue: data.radarMaxValue,
        step: 1,
        decimals: 0,
        rerender
      })
    );

    editor.appendChild(
      pciElement(
        "div",
        "pci-hint",
        "Também é possível arrastar os pontos diretamente no radar para alterar o valor do jogador selecionado naquele eixo."
      )
    );

    const editorActions = pciElement("div", "pci-editor-actions");
    editorActions.appendChild(
      pciButton({
        label: "Duplicar",
        className: "pci-button pci-button-ghost",
        onClick: () => {
          const clone = pciDuplicateRadarMetric(data, selected.id);
          state.selectedRadarMetricId = clone?.id ?? selected.id;
          rerender(true);
        }
      })
    );
    editorActions.appendChild(
      pciButton({
        label: "Excluir",
        className: "pci-button pci-button-ghost pci-button-danger",
        onClick: () => {
          data.radarMetrics = data.radarMetrics.filter((metric) => metric.id !== selected.id);
          state.selectedRadarMetricId = data.radarMetrics[0]?.id ?? null;
          rerender(true);
        }
      })
    );
    editor.appendChild(editorActions);
    card.appendChild(editor);
  }

  return card;
}

function pciBuildBarsCard({ win, data, state, rerender, renderWorkspace }) {
  const { card, head } = pciCard("Barras comparativas", "Comparação direta");
  const actions = pciElement("div", "pci-card-actions");

  actions.appendChild(
    pciButton({
      label: "+ Barra",
      className: "pci-button pci-button-ghost",
      onClick: () => {
        const metric = pciAddBarMetric(data);
        state.selectedBarMetricId = metric.id;
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
        rerender(true);
      }
    })
  );

  head.appendChild(actions);

  const list = pciElement("div", "pci-list");

  data.barMetrics.forEach((metric) => {
    list.appendChild(
      pciBuildMetricListRow({
        metric,
        selected: state.selectedBarMetricId === metric.id,
        summary: `${data.players.length} jogadores • máx. ${metric.maxValue}`,
        onSelect: () => {
          state.selectedBarMetricId = metric.id;
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
        "Clique em “+ Barra” e informe uma métrica. O gráfico cria uma barra por jogador, uma abaixo da outra."
      )
    );
  }

  card.appendChild(list);

  const selected = data.barMetrics.find((metric) => metric.id === state.selectedBarMetricId);

  if (selected) {
    const editor = pciElement("div", "pci-editor");
    const editorHead = pciElement("div", "pci-editor-head");
    editorHead.appendChild(pciElement("strong", "", "Editar comparação"));
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
        onInput: (value) => {
          selected.maxValue = Math.max(0.0001, pciNumber(value, 1));
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
        onInput: (value) => {
          selected.decimals = pciClamp(Math.round(pciNumber(value, 1)), 0, 3);
          rerender(false);
        }
      })
    );

    const maxValue = Math.max(0.0001, pciNumber(selected.maxValue, 1));
    const decimals = pciClamp(Math.round(pciNumber(selected.decimals, 1)), 0, 3);
    const step = decimals === 0 ? 1 : 1 / 10 ** decimals;

    editor.appendChild(
      pciBuildPlayerValueRows({
        win,
        data,
        metric: selected,
        maxValue,
        step,
        decimals,
        rerender
      })
    );

    const editorActions = pciElement("div", "pci-editor-actions");
    editorActions.appendChild(
      pciButton({
        label: "Duplicar",
        className: "pci-button pci-button-ghost",
        onClick: () => {
          const clone = pciDuplicateBarMetric(data, selected.id);
          state.selectedBarMetricId = clone?.id ?? selected.id;
          rerender(true);
        }
      })
    );
    editorActions.appendChild(
      pciButton({
        label: "Excluir",
        className: "pci-button pci-button-ghost pci-button-danger",
        onClick: () => {
          data.barMetrics = data.barMetrics.filter((metric) => metric.id !== selected.id);
          state.selectedBarMetricId = data.barMetrics[0]?.id ?? null;
          rerender(true);
        }
      })
    );
    editor.appendChild(editorActions);
    card.appendChild(editor);
  }

  return card;
}

function pciBuildTextDetails({ data, rerender }) {
  const details = pciDetails("Texto do card", "Conteúdo editorial");
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

function pciBuildSettingsDetails({ data, rerender, renderWorkspace }) {
  const details = pciDetails("Configurações", "Escala do radar");
  const body = pciElement("div", "pci-details-body");

  body.appendChild(
    pciField({
      label: "Valor máximo do radar",
      value: data.radarMaxValue,
      type: "number",
      min: 1,
      step: 1,
      onInput: (value) => {
        const oldMax = Math.max(1, pciNumber(data.radarMaxValue, 100));
        const nextMax = Math.max(1, pciNumber(value, oldMax));
        const ratio = nextMax / oldMax;

        data.radarMaxValue = nextMax;
        data.radarMetrics.forEach((metric) => {
          Object.keys(metric.values || {}).forEach((playerId) => {
            metric.values[playerId] = pciClamp(
              Math.round(pciNumber(metric.values[playerId], 0) * ratio),
              0,
              nextMax
            );
          });
        });

        rerender(false);
        renderWorkspace();
      }
    })
  );

  body.appendChild(
    pciElement(
      "div",
      "pci-hint",
      "O radar usa a mesma escala para todos os jogadores. Para percentis, mantenha 100."
    )
  );

  details.appendChild(body);
  return details;
}

function pciApplySelectionStyle(frame, state) {
  const doc = frame.contentDocument;

  if (!doc) {
    return;
  }

  doc.querySelectorAll("[data-player-id]").forEach((element) => {
    const isSelected = element.dataset.playerId === state.selectedPlayerId;

    if (element.classList.contains("pc-player-chip")) {
      element.classList.toggle("is-selected", isSelected);
    }

    if (element.classList.contains("pc-radar-node")) {
      element.setAttribute("r", isSelected ? "10" : "7.5");
      element.setAttribute("stroke-width", isSelected ? "5" : "3.4");
    }
  });

  doc.querySelectorAll("[data-radar-metric-id].pc-radar-label").forEach((label) => {
    const isSelected = label.dataset.radarMetricId === state.selectedRadarMetricId;
    label.setAttribute("fill", isSelected ? "#C58B12" : "#071F3D");
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
  const svg = doc?.getElementById("playerRadarSvg");

  if (!svg) {
    return;
  }

  const point = pciSvgPoint(svg, event);

  if (!point) {
    return;
  }

  const metricIndex = data.radarMetrics.findIndex(
    (metric) => metric.id === state.drag.metricId
  );

  if (metricIndex < 0 || !data.radarMetrics.length) {
    return;
  }

  const geometry = frame.contentWindow.pcRadarGeometry || {
    cx: 450,
    cy: 330,
    radius: 240
  };

  const angle = (-90 + (360 / data.radarMetrics.length) * metricIndex) * (Math.PI / 180);
  const unitX = Math.cos(angle);
  const unitY = Math.sin(angle);
  const vectorX = point.x - geometry.cx;
  const vectorY = point.y - geometry.cy;
  const projection = vectorX * unitX + vectorY * unitY;
  const ratio = pciClamp(projection / geometry.radius, 0, 1);
  const value = Math.round(ratio * data.radarMaxValue);
  const metric = data.radarMetrics[metricIndex];

  metric.values[state.drag.playerId] = value;
  rerender(false);
}

function pciAttachFrameEvents({ frame, data, state, rerender, renderWorkspace }) {
  const doc = frame.contentDocument;

  if (!doc || state.boundDocument === doc) {
    return;
  }

  state.boundDocument = doc;

  doc.addEventListener("click", (event) => {
    const playerTarget = event.target.closest?.("[data-player-id]");

    if (playerTarget?.dataset.playerId && !state.drag) {
      state.selectedPlayerId = playerTarget.dataset.playerId;
      renderWorkspace();
      pciApplySelectionStyle(frame, state);
      return;
    }

    const metricTarget = event.target.closest?.("[data-radar-metric-id]");

    if (metricTarget?.dataset.radarMetricId && !state.drag) {
      state.selectedRadarMetricId = metricTarget.dataset.radarMetricId;
      renderWorkspace();
      pciApplySelectionStyle(frame, state);
      return;
    }

    const barTarget = event.target.closest?.("[data-bar-metric-id]");

    if (barTarget?.dataset.barMetricId) {
      state.selectedBarMetricId = barTarget.dataset.barMetricId;
      renderWorkspace();
      pciApplySelectionStyle(frame, state);
    }
  });

  doc.addEventListener("pointerdown", (event) => {
    const node = event.target.closest?.(".pc-radar-node[data-player-id][data-radar-metric-id]");

    if (!node) {
      return;
    }

    event.preventDefault();
    state.selectedPlayerId = node.dataset.playerId;
    state.selectedRadarMetricId = node.dataset.radarMetricId;
    state.drag = {
      playerId: node.dataset.playerId,
      metricId: node.dataset.radarMetricId
    };

    renderWorkspace();
    pciApplySelectionStyle(frame, state);
  });

  doc.addEventListener("pointermove", (event) => {
    if (!state.drag) {
      return;
    }

    event.preventDefault();
    pciUpdateRadarDrag({ frame, data, state, event, rerender });
  });

  const finishDrag = () => {
    if (!state.drag) {
      return;
    }

    state.drag = null;
    renderWorkspace();
    pciApplySelectionStyle(frame, state);
  };

  doc.addEventListener("pointerup", finishDrag);
  doc.addEventListener("pointercancel", finishDrag);

  frame.contentWindow.addEventListener("adql:player-comparison-rendered", () => {
    requestAnimationFrame(() => pciApplySelectionStyle(frame, state));
  });
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

  if (!data.radarMetrics.some((metric) => metric.id === state.selectedRadarMetricId)) {
    state.selectedRadarMetricId = data.radarMetrics[0]?.id ?? null;
  }

  if (!data.barMetrics.some((metric) => metric.id === state.selectedBarMetricId)) {
    state.selectedBarMetricId = data.barMetrics[0]?.id ?? null;
  }

  const workspace = pciElement("div", "pci-shell");
  form.appendChild(workspace);

  const rerender = (refreshWorkspace = false) => {
    pciRerenderComponent(win, schema, data);

    requestAnimationFrame(() => {
      pciApplySelectionStyle(frame, state);
    });

    if (refreshWorkspace) {
      renderWorkspace();
    }
  };

  const renderWorkspace = () => {
    workspace.innerHTML = "";

    workspace.appendChild(
      pciBuildHero({ data, state, rerender, renderWorkspace })
    );

    workspace.appendChild(
      pciBuildPlayersCard({ win, data, state, rerender, renderWorkspace })
    );

    workspace.appendChild(
      pciBuildRadarCard({ win, data, state, rerender, renderWorkspace })
    );

    workspace.appendChild(
      pciBuildBarsCard({ win, data, state, rerender, renderWorkspace })
    );

    workspace.appendChild(pciBuildTextDetails({ data, rerender }));
    workspace.appendChild(pciBuildSettingsDetails({ data, rerender, renderWorkspace }));

    requestAnimationFrame(() => {
      pciApplySelectionStyle(frame, state);
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

  playerComparisonBaseBuildInspector(args);
};
