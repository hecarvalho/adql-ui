editorSchemas["tactical-pitch"] = {
  mode: "tactical-advanced",
  dataKey: "playData",
  renderFunction: "renderTacticalPitch"
};

const baseBuildInspector = buildInspector;
const tacticalEditorStates = new WeakMap();

const TACTICAL_ROUTE_TOOLS = {
  "add-pass": {
    label: "Passe",
    icon: "→",
    arrayKey: "passes"
  },
  "add-run": {
    label: "Corrida",
    icon: "⇢",
    arrayKey: "runs"
  },
  "add-carry": {
    label: "Condução",
    icon: "↝",
    arrayKey: "carries"
  }
};

const TACTICAL_PLAYER_TYPES = [
  {
    value: "team",
    label: "Equipe"
  },
  {
    value: "opponent",
    label: "Adversário"
  },
  {
    value: "highlight",
    label: "Destaque"
  },
  {
    value: "ghost",
    label: "Fantasma"
  }
];

function tacticalElement(
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

function ensureTacticalInspectorStyles() {
  if (
    document.getElementById(
      "tacticalInspectorStyles"
    )
  ) {
    return;
  }

  const style = document.createElement("style");

  style.id = "tacticalInspectorStyles";
  style.textContent = `
    .ti-shell {
      display: grid;
      gap: 16px;
    }

    .ti-hero {
      padding: 16px;
      border-radius: 14px;
      background: #071f3d;
      color: #fff;
    }

    .ti-hero-top,
    .ti-card-head,
    .ti-subhead {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .ti-eyebrow {
      color: #c58b12;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }

    .ti-hero h4 {
      margin-top: 4px;
      font-size: 18px;
      line-height: 1.1;
    }

    .ti-hero p {
      margin-top: 8px;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.5;
    }

    .ti-tools {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    .ti-tool,
    .ti-button,
    .ti-icon-button,
    .ti-type-button,
    .ti-player-chip {
      font: inherit;
      cursor: pointer;
      transition: 150ms ease;
    }

    .ti-tool {
      min-height: 48px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 10px;
      background: rgba(255,255,255,.07);
      color: #fff;
      text-align: left;
      font-size: 12px;
      font-weight: 800;
    }

    .ti-tool:hover {
      border-color: rgba(197,139,18,.72);
      background: rgba(255,255,255,.11);
    }

    .ti-tool.is-active {
      border-color: #c58b12;
      background: #c58b12;
      color: #071f3d;
    }

    .ti-tool-icon {
      width: 26px;
      height: 26px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 8px;
      background: rgba(255,255,255,.1);
      font-size: 16px;
      font-weight: 900;
    }

    .ti-tool.is-active .ti-tool-icon {
      background: rgba(7,31,61,.12);
    }

    .ti-status {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px;
      border: 1px solid rgba(197,139,18,.32);
      border-radius: 12px;
      background: rgba(197,139,18,.09);
      color: #071f3d;
      font-size: 12px;
      line-height: 1.45;
    }

    .ti-status strong {
      display: block;
      margin-bottom: 2px;
      font-size: 12px;
    }

    .ti-status-dot {
      width: 9px;
      height: 9px;
      margin-top: 4px;
      flex: 0 0 auto;
      border-radius: 50%;
      background: #c58b12;
      box-shadow: 0 0 0 4px rgba(197,139,18,.14);
    }

    .ti-card {
      padding: 14px;
      border: 1px solid #d8d1c3;
      border-radius: 14px;
      background: #fffdf8;
    }

    .ti-card h4,
    .ti-subhead h4 {
      color: #071f3d;
      font-size: 14px;
      font-weight: 900;
    }

    .ti-count {
      min-width: 24px;
      height: 24px;
      display: inline-grid;
      place-items: center;
      padding: 0 7px;
      border-radius: 999px;
      background: #ece5d8;
      color: #071f3d;
      font-size: 11px;
      font-weight: 900;
    }

    .ti-button {
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid #d8d1c3;
      border-radius: 9px;
      background: #fff;
      color: #071f3d;
      font-size: 11px;
      font-weight: 800;
    }

    .ti-button:hover {
      border-color: #c58b12;
    }

    .ti-button-primary {
      border-color: #071f3d;
      background: #071f3d;
      color: #fff;
    }

    .ti-button-danger {
      border-color: rgba(159,49,49,.28);
      color: #9f3131;
      background: rgba(159,49,49,.05);
    }

    .ti-icon-button {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border: 1px solid #d8d1c3;
      border-radius: 8px;
      background: #fff;
      color: #071f3d;
      font-size: 14px;
      font-weight: 900;
    }

    .ti-icon-button:hover {
      border-color: #c58b12;
      color: #c58b12;
    }

    .ti-icon-button.is-danger:hover {
      border-color: #9f3131;
      color: #9f3131;
    }

    .ti-type-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .ti-type-button {
      min-height: 42px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      border: 1px solid #d8d1c3;
      border-radius: 10px;
      background: #fff;
      color: #071f3d;
      font-size: 11px;
      font-weight: 800;
    }

    .ti-type-button.is-active {
      border-color: #c58b12;
      box-shadow: inset 0 0 0 1px #c58b12;
    }

    .ti-type-dot {
      width: 10px;
      height: 10px;
      flex: 0 0 auto;
      border-radius: 50%;
      border: 2px solid #071f3d;
      background: #fff;
    }

    .ti-type-dot-team {
      background: #071f3d;
    }

    .ti-type-dot-opponent {
      background: #fff;
    }

    .ti-type-dot-highlight {
      border-color: #c58b12;
      background: #c58b12;
    }

    .ti-type-dot-ghost {
      opacity: .45;
      background: #a8afb6;
    }

    .ti-inline-field {
      margin-top: 12px;
    }

    .ti-inline-field label {
      display: block;
      margin-bottom: 6px;
      color: #6f7680;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .1em;
      text-transform: uppercase;
    }

    .ti-inline-field input,
    .ti-mini-input {
      width: 100%;
      border: 1px solid #d8d1c3;
      border-radius: 8px;
      background: #fff;
      color: #071f3d;
      font-family: Inter, Arial, sans-serif;
      font-size: 12px;
      font-weight: 700;
      outline: none;
    }

    .ti-inline-field input {
      height: 40px;
      padding: 0 10px;
    }

    .ti-inline-field input:focus,
    .ti-mini-input:focus {
      border-color: #c58b12;
    }

    .ti-player-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 12px;
    }

    .ti-player-chip {
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 10px;
      border: 1px solid #ded7ca;
      border-radius: 10px;
      background: #fff;
      color: #071f3d;
      text-align: left;
    }

    .ti-player-chip:hover,
    .ti-player-chip.is-active {
      border-color: #c58b12;
      box-shadow: inset 0 0 0 1px rgba(197,139,18,.35);
    }

    .ti-player-chip strong {
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 11px;
    }

    .ti-player-chip small {
      display: block;
      margin-top: 2px;
      color: #7b8188;
      font-size: 9px;
      font-weight: 700;
    }

    .ti-empty {
      margin-top: 12px;
      padding: 13px;
      border: 1px dashed #d8d1c3;
      border-radius: 10px;
      color: #7b8188;
      font-size: 11px;
      line-height: 1.5;
      text-align: center;
    }

    .ti-list {
      display: grid;
      gap: 8px;
      margin-top: 12px;
    }

    .ti-list-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border: 1px solid #e3dccf;
      border-radius: 10px;
      background: #fff;
    }

    .ti-list-main {
      min-width: 0;
    }

    .ti-list-title {
      color: #071f3d;
      font-size: 11px;
      font-weight: 900;
    }

    .ti-list-meta {
      margin-top: 3px;
      color: #7b8188;
      font-size: 10px;
      font-weight: 700;
    }

    .ti-list-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ti-mini-input {
      width: 58px;
      height: 32px;
      padding: 0 7px;
      text-align: center;
    }

    .ti-route-bend {
      margin-top: 7px;
      display: grid;
      grid-template-columns: 58px 1fr;
      align-items: center;
      gap: 8px;
      color: #7b8188;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .ti-route-bend input {
      width: 100%;
      accent-color: #c58b12;
    }

    .ti-actions-line {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .ti-divider {
      height: 1px;
      margin: 14px 0;
      background: #e3dccf;
    }

    .ti-accordion {
      overflow: hidden;
      border: 1px solid #d8d1c3;
      border-radius: 14px;
      background: #fffdf8;
    }

    .ti-accordion summary {
      list-style: none;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      min-height: 48px;
      padding: 0 14px;
      color: #071f3d;
      cursor: pointer;
      font-size: 12px;
      font-weight: 900;
    }

    .ti-accordion summary::-webkit-details-marker {
      display: none;
    }

    .ti-accordion summary::after {
      content: "+";
      color: #c58b12;
      font-size: 18px;
      font-weight: 500;
    }

    .ti-accordion[open] summary::after {
      content: "−";
    }

    .ti-accordion-body {
      padding: 0 14px 14px;
      border-top: 1px solid #e3dccf;
    }

    .ti-accordion-body .field-section:first-child {
      margin-top: 16px;
    }

    .ti-compact-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 10px;
    }

    .ti-compact-field label {
      display: block;
      margin-bottom: 4px;
      color: #7b8188;
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .ti-compact-field input {
      width: 100%;
      height: 34px;
      padding: 0 8px;
      border: 1px solid #d8d1c3;
      border-radius: 8px;
      background: #fff;
      color: #071f3d;
      font-family: Inter, Arial, sans-serif;
      font-size: 11px;
      font-weight: 700;
      outline: none;
    }

    .ti-compact-field input:focus {
      border-color: #c58b12;
    }
  `;

  document.head.appendChild(style);
}

function tacticalField({
  label,
  value,
  type = "input",
  onInput
}) {
  const wrapper = tacticalElement(
    "div",
    "field"
  );

  const labelEl = tacticalElement(
    "label",
    "",
    label
  );

  const input =
    type === "textarea"
      ? document.createElement("textarea")
      : document.createElement("input");

  input.value = value ?? "";
  input.oninput = () => {
    onInput(input.value);
  };

  wrapper.appendChild(labelEl);
  wrapper.appendChild(input);

  return wrapper;
}

function tacticalSection(label) {
  return tacticalElement(
    "div",
    "field-section",
    label
  );
}

function tacticalNumber(value) {
  const parsed = Number(
    String(value)
      .trim()
      .replace(",", ".")
  );

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function tacticalOptionalNumber(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(",", ".");

  if (normalized === "") {
    return null;
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : null;
}

function tacticalSafePlayerLabel(
  value,
  fallback = "Posição livre"
) {
  const normalized = String(value ?? "").trim();

  return normalized
    ? normalized.toUpperCase()
    : fallback;
}

function tacticalRouteMeta(route) {
  const from = String(route?.from ?? "").trim();
  const to = String(route?.to ?? "").trim();

  if (from && to) {
    return `${from.toUpperCase()} → ${to.toUpperCase()}`;
  }

  if (String(route?.path ?? "").trim()) {
    return "Trajeto livre";
  }

  return "Rota incompleta";
}

function tacticalGetByPath(object, path) {
  return path
    .split(".")
    .reduce((current, key) => {
      if (current == null) {
        return undefined;
      }

      return current[key];
    }, object);
}

function tacticalSetByPath(
  object,
  path,
  value
) {
  const keys = path.split(".");
  const lastKey = keys.pop();
  let current = object;

  keys.forEach((key) => {
    if (current[key] == null) {
      current[key] = {};
    }

    current = current[key];
  });

  current[lastKey] = value;
}

function tacticalRerender(
  win,
  schema,
  data
) {
  const renderFunction =
    win[schema.renderFunction];

  if (typeof renderFunction === "function") {
    renderFunction(data);
  }
}

function tacticalAddCopyField({
  container,
  frame,
  data,
  currentValues,
  key,
  label,
  selector,
  dataPath,
  type = "input"
}) {
  const value = tacticalGetByPath(
    data,
    dataPath
  );

  currentValues[key] = value ?? "";

  container.appendChild(
    tacticalField({
      label,
      value,
      type,
      onInput: (newValue) => {
        currentValues[key] = newValue;

        tacticalSetByPath(
          data,
          dataPath,
          newValue
        );

        const target =
          frame.contentDocument.querySelector(
            selector
          );

        if (target) {
          target.textContent = newValue;
        }
      }
    })
  );
}

function tacticalAccordion(
  title,
  open = false
) {
  const details = tacticalElement(
    "details",
    "ti-accordion"
  );

  details.open = open;

  const summary = tacticalElement(
    "summary",
    "",
    title
  );

  const body = tacticalElement(
    "div",
    "ti-accordion-body"
  );

  details.appendChild(summary);
  details.appendChild(body);

  return {
    details,
    body
  };
}

function tacticalButton({
  label,
  className = "",
  title = "",
  onClick
}) {
  const button = tacticalElement(
    "button",
    `ti-button ${className}`.trim(),
    label
  );

  button.type = "button";
  button.title = title;
  button.onclick = onClick;

  return button;
}

function tacticalIconButton({
  label,
  title,
  danger = false,
  onClick
}) {
  const button = tacticalElement(
    "button",
    `ti-icon-button${
      danger ? " is-danger" : ""
    }`,
    label
  );

  button.type = "button";
  button.title = title;
  button.setAttribute("aria-label", title);
  button.onclick = onClick;

  return button;
}

function tacticalPlayerTypeLabel(type) {
  return (
    TACTICAL_PLAYER_TYPES.find(
      (item) => item.value === type
    )?.label || type
  );
}

function tacticalTypeDot(type) {
  return tacticalElement(
    "span",
    `ti-type-dot ti-type-dot-${type}`
  );
}

function ensureTacticalArray(data, key) {
  if (!Array.isArray(data[key])) {
    data[key] = [];
  }

  return data[key];
}

function tacticalNextPlayerId(
  data,
  type
) {
  const prefix =
    type === "opponent" ? "o" : "p";

  const usedIds = new Set(
    (data.players || []).map(
      (player) => player.id
    )
  );

  let index = 1;

  while (usedIds.has(`${prefix}${index}`)) {
    index += 1;
  }

  return `${prefix}${index}`;
}

function tacticalDeleteLinkedPlayerData(
  data,
  playerId
) {
  data.passes = (data.passes || []).filter(
    (route) =>
      route.from !== playerId &&
      route.to !== playerId
  );

  data.runs = (data.runs || []).filter(
    (route) =>
      route.from !== playerId &&
      route.to !== playerId
  );

  data.carries = (data.carries || []).filter(
    (route) =>
      route.from !== playerId &&
      route.to !== playerId
  );

  data.pressures = (
    data.pressures || []
  ).filter(
    (pressure) =>
      pressure.playerId !== playerId
  );

  data.steps = (data.steps || []).filter(
    (step) =>
      step.playerId !== playerId
  );
}

function tacticalGetState(frame) {
  let state = tacticalEditorStates.get(frame);

  if (!state) {
    state = {
      mode: null,
      routeStartPlayerId: null,
      selectedPlayerId: null,
      playerDraftType: "team",
      playerDraftNumber: "",
      statusMessage: "",
      cleanup: null,
      renderWorkspace: null
    };

    tacticalEditorStates.set(frame, state);
  }

  return state;
}

function tacticalSyncInteractionState(
  win,
  state
) {
  if (
    typeof win.setTacticalInteractionState !==
    "function"
  ) {
    return;
  }

  win.setTacticalInteractionState({
    mode: state.mode || "move",
    routeStartPlayerId:
      state.routeStartPlayerId
  });
}

function tacticalCancelMode(
  win,
  state,
  renderWorkspace
) {
  state.mode = null;
  state.routeStartPlayerId = null;
  state.statusMessage = "";

  tacticalSyncInteractionState(win, state);
  renderWorkspace();
}

function tacticalActivateMode(
  win,
  state,
  mode,
  renderWorkspace
) {
  if (state.mode === mode) {
    tacticalCancelMode(
      win,
      state,
      renderWorkspace
    );

    return;
  }

  state.mode = mode;
  state.routeStartPlayerId = null;
  state.selectedPlayerId = null;
  state.statusMessage = "";

  tacticalSyncInteractionState(win, state);
  renderWorkspace();
}

function tacticalAddRoute(
  data,
  mode,
  from,
  to
) {
  const config = TACTICAL_ROUTE_TOOLS[mode];

  if (!config || !from || !to || from === to) {
    return {
      ok: false,
      reason: "invalid"
    };
  }

  const routes = ensureTacticalArray(
    data,
    config.arrayKey
  );

  const alreadyExists = routes.some(
    (route) =>
      route?.from === from &&
      route?.to === to
  );

  if (alreadyExists) {
    return {
      ok: false,
      reason: "duplicate"
    };
  }

  if (mode === "add-carry") {
    routes.push({
      from,
      to
    });

    return { ok: true };
  }

  routes.push({
    from,
    to,
    bend: 0
  });

  return { ok: true };
}

function tacticalNextStepNumber(data) {
  const numbers = (data.steps || [])
    .map((step) => Number(step.number))
    .filter(Number.isFinite);

  return numbers.length
    ? Math.max(...numbers) + 1
    : 1;
}

function tacticalModeStatus(state) {
  if (state.statusMessage) {
    return {
      title: "Atenção",
      text: state.statusMessage
    };
  }

  if (state.mode === "add-player") {
    return {
      title: "Criando jogador",
      text:
        "Escolha o tipo abaixo e clique em um ponto vazio do campo."
    };
  }

  if (TACTICAL_ROUTE_TOOLS[state.mode]) {
    const label =
      TACTICAL_ROUTE_TOOLS[state.mode].label;

    if (state.routeStartPlayerId) {
      return {
        title: `${label}: origem selecionada`,
        text:
          `${state.routeStartPlayerId.toUpperCase()} está marcado. Agora clique no jogador de destino.`
      };
    }

    return {
      title: `Criando ${label.toLowerCase()}`,
      text:
        "Clique primeiro no jogador de origem e depois no jogador de destino."
    };
  }

  if (state.mode === "add-pressure") {
    return {
      title: "Criando pressão",
      text:
        "Clique no jogador que deve receber o círculo de pressão."
    };
  }

  if (state.mode === "add-step") {
    return {
      title: "Criando marcador",
      text:
        "Clique no jogador que deve receber o próximo número da sequência."
    };
  }

  return {
    title: "Edição direta",
    text:
      "Arraste para mover. Clique em um jogador para editar tipo, número ou excluir."
  };
}

function tacticalToolButton({
  icon,
  label,
  active,
  onClick
}) {
  const button = tacticalElement(
    "button",
    `ti-tool${active ? " is-active" : ""}`
  );

  button.type = "button";
  button.onclick = onClick;

  button.appendChild(
    tacticalElement(
      "span",
      "ti-tool-icon",
      icon
    )
  );

  button.appendChild(
    tacticalElement("span", "", label)
  );

  return button;
}

function tacticalTypeSelector({
  value,
  onChange
}) {
  const grid = tacticalElement(
    "div",
    "ti-type-grid"
  );

  TACTICAL_PLAYER_TYPES.forEach((type) => {
    const button = tacticalElement(
      "button",
      `ti-type-button${
        value === type.value
          ? " is-active"
          : ""
      }`
    );

    button.type = "button";
    button.appendChild(
      tacticalTypeDot(type.value)
    );
    button.appendChild(
      tacticalElement(
        "span",
        "",
        type.label
      )
    );

    button.onclick = () => {
      onChange(type.value);
    };

    grid.appendChild(button);
  });

  return grid;
}

function tacticalBuildHeaderTools({
  win,
  state,
  renderWorkspace
}) {
  const hero = tacticalElement(
    "section",
    "ti-hero"
  );

  const top = tacticalElement(
    "div",
    "ti-hero-top"
  );

  const heading = tacticalElement("div");

  heading.appendChild(
    tacticalElement(
      "div",
      "ti-eyebrow",
      "Campo tático"
    )
  );

  heading.appendChild(
    tacticalElement(
      "h4",
      "",
      "Ferramentas rápidas"
    )
  );

  top.appendChild(heading);
  hero.appendChild(top);

  hero.appendChild(
    tacticalElement(
      "p",
      "",
      "Crie a jogada diretamente no campo, sem procurar jogadores em listas."
    )
  );

  const tools = tacticalElement(
    "div",
    "ti-tools"
  );

  tools.appendChild(
    tacticalToolButton({
      icon: "+",
      label: "Jogador",
      active: state.mode === "add-player",
      onClick: () => {
        tacticalActivateMode(
          win,
          state,
          "add-player",
          renderWorkspace
        );
      }
    })
  );

  Object.entries(TACTICAL_ROUTE_TOOLS).forEach(
    ([mode, config]) => {
      tools.appendChild(
        tacticalToolButton({
          icon: config.icon,
          label: config.label,
          active: state.mode === mode,
          onClick: () => {
            tacticalActivateMode(
              win,
              state,
              mode,
              renderWorkspace
            );
          }
        })
      );
    }
  );

  tools.appendChild(
    tacticalToolButton({
      icon: "◎",
      label: "Pressão",
      active:
        state.mode === "add-pressure",
      onClick: () => {
        tacticalActivateMode(
          win,
          state,
          "add-pressure",
          renderWorkspace
        );
      }
    })
  );

  tools.appendChild(
    tacticalToolButton({
      icon: "1",
      label: "Marcador",
      active: state.mode === "add-step",
      onClick: () => {
        tacticalActivateMode(
          win,
          state,
          "add-step",
          renderWorkspace
        );
      }
    })
  );

  hero.appendChild(tools);

  return hero;
}

function tacticalBuildStatus({
  win,
  state,
  renderWorkspace
}) {
  const statusData = tacticalModeStatus(state);
  const status = tacticalElement(
    "div",
    "ti-status"
  );

  status.appendChild(
    tacticalElement(
      "span",
      "ti-status-dot"
    )
  );

  const copy = tacticalElement("div");
  copy.style.flex = "1";

  copy.appendChild(
    tacticalElement(
      "strong",
      "",
      statusData.title
    )
  );

  copy.appendChild(
    tacticalElement(
      "span",
      "",
      statusData.text
    )
  );

  status.appendChild(copy);

  if (state.mode) {
    status.appendChild(
      tacticalButton({
        label: "Cancelar",
        title: "Cancelar ferramenta ativa (Esc)",
        onClick: () => {
          tacticalCancelMode(
            win,
            state,
            renderWorkspace
          );
        }
      })
    );
  }

  return status;
}

function tacticalBuildPlayerPlacement({
  win,
  state,
  renderWorkspace
}) {
  if (state.mode !== "add-player") {
    return null;
  }

  const card = tacticalElement(
    "section",
    "ti-card"
  );

  const head = tacticalElement(
    "div",
    "ti-card-head"
  );

  head.appendChild(
    tacticalElement(
      "h4",
      "",
      "Novo jogador"
    )
  );

  head.appendChild(
    tacticalButton({
      label: "Cancelar",
      onClick: () => {
        tacticalCancelMode(
          win,
          state,
          renderWorkspace
        );
      }
    })
  );

  card.appendChild(head);

  card.appendChild(
    tacticalTypeSelector({
      value: state.playerDraftType,
      onChange: (type) => {
        state.playerDraftType = type;
        renderWorkspace();
      }
    })
  );

  const numberField = tacticalElement(
    "div",
    "ti-inline-field"
  );

  numberField.appendChild(
    tacticalElement(
      "label",
      "",
      "Número opcional"
    )
  );

  const numberInput = document.createElement(
    "input"
  );

  numberInput.value = state.playerDraftNumber;
  numberInput.placeholder = "Ex.: 10";
  numberInput.oninput = () => {
    state.playerDraftNumber = numberInput.value;
  };

  numberField.appendChild(numberInput);
  card.appendChild(numberField);

  return card;
}

function tacticalBuildSelectedPlayer({
  data,
  win,
  schema,
  state,
  rerender,
  renderWorkspace
}) {
  const player = (data.players || []).find(
    (item) =>
      item.id === state.selectedPlayerId
  );

  if (!player || state.mode) {
    return null;
  }

  const card = tacticalElement(
    "section",
    "ti-card"
  );

  const head = tacticalElement(
    "div",
    "ti-card-head"
  );

  head.appendChild(
    tacticalElement(
      "h4",
      "",
      `Jogador ${player.id.toUpperCase()}`
    )
  );

  head.appendChild(
    tacticalIconButton({
      label: "×",
      title: "Excluir jogador",
      danger: true,
      onClick: () => {
        const confirmed = window.confirm(
          `Excluir ${player.id.toUpperCase()} e todos os elementos ligados a ele?`
        );

        if (!confirmed) {
          return;
        }

        data.players = (
          data.players || []
        ).filter(
          (item) => item.id !== player.id
        );

        tacticalDeleteLinkedPlayerData(
          data,
          player.id
        );

        state.selectedPlayerId = null;
        rerender();
        renderWorkspace();
      }
    })
  );

  card.appendChild(head);

  card.appendChild(
    tacticalTypeSelector({
      value: player.type,
      onChange: (type) => {
        player.type = type;
        rerender();
        renderWorkspace();
      }
    })
  );

  const numberField = tacticalElement(
    "div",
    "ti-inline-field"
  );

  numberField.appendChild(
    tacticalElement(
      "label",
      "",
      "Número"
    )
  );

  const numberInput = document.createElement(
    "input"
  );

  numberInput.value = player.number ?? "";
  numberInput.placeholder = "Sem número";
  numberInput.oninput = () => {
    player.number =
      numberInput.value.trim() === ""
        ? null
        : numberInput.value.trim();

    tacticalRerender(
      win,
      schema,
      data
    );
  };

  numberField.appendChild(numberInput);
  card.appendChild(numberField);

  return card;
}

function tacticalBuildPlayersCard({
  data,
  win,
  state,
  rerender,
  renderWorkspace
}) {
  const card = tacticalElement(
    "section",
    "ti-card"
  );

  const head = tacticalElement(
    "div",
    "ti-card-head"
  );

  const titleWrap = tacticalElement(
    "div",
    "ti-subhead"
  );

  titleWrap.appendChild(
    tacticalElement(
      "h4",
      "",
      "Jogadores"
    )
  );

  titleWrap.appendChild(
    tacticalElement(
      "span",
      "ti-count",
      String((data.players || []).length)
    )
  );

  head.appendChild(titleWrap);

  head.appendChild(
    tacticalButton({
      label: "Excluir todos",
      className: "ti-button-danger",
      onClick: () => {
        if (!(data.players || []).length) {
          return;
        }

        const confirmed = window.confirm(
          "Excluir todos os jogadores? Passes, corridas, conduções, pressões e marcadores ligados a eles também serão removidos."
        );

        if (!confirmed) {
          return;
        }

        data.players = [];
        data.passes = [];
        data.runs = [];
        data.carries = [];
        data.pressures = [];
        data.steps = [];

        state.mode = null;
        state.routeStartPlayerId = null;
        state.selectedPlayerId = null;

        tacticalSyncInteractionState(
          win,
          state
        );
        rerender();
        renderWorkspace();
      }
    })
  );

  card.appendChild(head);

  if (!(data.players || []).length) {
    card.appendChild(
      tacticalElement(
        "div",
        "ti-empty",
        "Nenhum jogador no campo. Use + Jogador e clique onde ele deve aparecer."
      )
    );

    return card;
  }

  const grid = tacticalElement(
    "div",
    "ti-player-grid"
  );

  (data.players || []).forEach((player) => {
    const chip = tacticalElement(
      "button",
      `ti-player-chip${
        state.selectedPlayerId === player.id
          ? " is-active"
          : ""
      }`
    );

    chip.type = "button";
    chip.appendChild(
      tacticalTypeDot(player.type)
    );

    const copy = tacticalElement("span");

    copy.appendChild(
      tacticalElement(
        "strong",
        "",
        player.id.toUpperCase()
      )
    );

    copy.appendChild(
      tacticalElement(
        "small",
        "",
        player.number
          ? `${tacticalPlayerTypeLabel(player.type)} • ${player.number}`
          : tacticalPlayerTypeLabel(player.type)
      )
    );

    chip.appendChild(copy);

    chip.onclick = () => {
      state.mode = null;
      state.routeStartPlayerId = null;
      state.selectedPlayerId = player.id;

      tacticalSyncInteractionState(
        win,
        state
      );
      renderWorkspace();
    };

    grid.appendChild(chip);
  });

  card.appendChild(grid);

  return card;
}

function tacticalAllRoutes(data) {
  const routes = [];

  (data.passes || []).forEach(
    (route, index) => {
      routes.push({
        type: "Passe",
        icon: "→",
        arrayKey: "passes",
        index,
        route
      });
    }
  );

  (data.runs || []).forEach(
    (route, index) => {
      routes.push({
        type: "Corrida",
        icon: "⇢",
        arrayKey: "runs",
        index,
        route
      });
    }
  );

  (data.carries || []).forEach(
    (route, index) => {
      routes.push({
        type: "Condução",
        icon: "↝",
        arrayKey: "carries",
        index,
        route
      });
    }
  );

  return routes;
}

function tacticalBuildRoutesCard({
  data,
  rerender,
  renderWorkspace
}) {
  const card = tacticalElement(
    "section",
    "ti-card"
  );

  const routes = tacticalAllRoutes(data);
  const head = tacticalElement(
    "div",
    "ti-card-head"
  );

  const titleWrap = tacticalElement(
    "div",
    "ti-subhead"
  );

  titleWrap.appendChild(
    tacticalElement(
      "h4",
      "",
      "Setas e movimentos"
    )
  );

  titleWrap.appendChild(
    tacticalElement(
      "span",
      "ti-count",
      String(routes.length)
    )
  );

  head.appendChild(titleWrap);

  if (routes.length) {
    head.appendChild(
      tacticalButton({
        label: "Limpar setas",
        className: "ti-button-danger",
        onClick: () => {
          const confirmed = window.confirm(
            "Excluir todos os passes, corridas e conduções?"
          );

          if (!confirmed) {
            return;
          }

          data.passes = [];
          data.runs = [];
          data.carries = [];

          rerender();
          renderWorkspace();
        }
      })
    );
  }

  card.appendChild(head);

  if (!routes.length) {
    card.appendChild(
      tacticalElement(
        "div",
        "ti-empty",
        "Use Passe, Corrida ou Condução. Depois clique em dois jogadores no campo."
      )
    );

    return card;
  }

  const list = tacticalElement(
    "div",
    "ti-list"
  );

  routes.forEach((item) => {
    const row = tacticalElement(
      "div",
      "ti-list-row"
    );

    const main = tacticalElement(
      "div",
      "ti-list-main"
    );

    main.appendChild(
      tacticalElement(
        "div",
        "ti-list-title",
        `${item.icon} ${item.type}`
      )
    );

    main.appendChild(
      tacticalElement(
        "div",
        "ti-list-meta",
        tacticalRouteMeta(item.route)
      )
    );

    if ("bend" in item.route) {
      const bendWrap = tacticalElement(
        "label",
        "ti-route-bend"
      );

      bendWrap.appendChild(
        tacticalElement(
          "span",
          "",
          "Curva"
        )
      );

      const range = document.createElement(
        "input"
      );

      range.type = "range";
      range.min = "-0.5";
      range.max = "0.5";
      range.step = "0.02";
      range.value = item.route.bend ?? 0;
      range.oninput = () => {
        item.route.bend = tacticalNumber(
          range.value
        );
        rerender();
      };

      bendWrap.appendChild(range);
      main.appendChild(bendWrap);
    }

    const actions = tacticalElement(
      "div",
      "ti-list-actions"
    );

    actions.appendChild(
      tacticalIconButton({
        label: "×",
        title: `Excluir ${item.type.toLowerCase()}`,
        danger: true,
        onClick: () => {
          data[item.arrayKey].splice(
            item.index,
            1
          );

          rerender();
          renderWorkspace();
        }
      })
    );

    row.appendChild(main);
    row.appendChild(actions);
    list.appendChild(row);
  });

  card.appendChild(list);

  return card;
}

function tacticalCompactNumberField({
  label,
  value,
  onInput
}) {
  const wrapper = tacticalElement(
    "div",
    "ti-compact-field"
  );

  wrapper.appendChild(
    tacticalElement("label", "", label)
  );

  const input = document.createElement("input");

  input.value = value ?? "";
  input.inputMode = "decimal";
  input.oninput = () => {
    const parsed = tacticalOptionalNumber(
      input.value
    );

    if (parsed === null) {
      return;
    }

    onInput(parsed);
  };

  wrapper.appendChild(input);

  return wrapper;
}

function tacticalBuildAdvancedElements({
  data,
  rerender,
  renderWorkspace
}) {
  const accordion = tacticalAccordion(
    "Outros elementos do campo",
    false
  );

  const body = accordion.body;

  const zoneHead = tacticalElement(
    "div",
    "ti-card-head"
  );

  zoneHead.appendChild(
    tacticalElement(
      "h4",
      "",
      "Zonas"
    )
  );

  zoneHead.appendChild(
    tacticalButton({
      label: "+ Zona",
      onClick: () => {
        ensureTacticalArray(
          data,
          "zones"
        ).push({
          x: 350,
          y: 150,
          w: 300,
          h: 300
        });

        rerender();
        renderWorkspace();
      }
    })
  );

  body.appendChild(zoneHead);

  if (!(data.zones || []).length) {
    body.appendChild(
      tacticalElement(
        "div",
        "ti-empty",
        "Nenhuma zona criada."
      )
    );
  }

  (data.zones || []).forEach(
    (zone, index) => {
      const row = tacticalElement(
        "div",
        "ti-list-row"
      );

      const main = tacticalElement(
        "div",
        "ti-list-main"
      );

      main.appendChild(
        tacticalElement(
          "div",
          "ti-list-title",
          `Zona ${index + 1}`
        )
      );

      const grid = tacticalElement(
        "div",
        "ti-compact-grid"
      );

      [
        ["X", "x"],
        ["Y", "y"],
        ["Largura", "w"],
        ["Altura", "h"]
      ].forEach(([label, key]) => {
        grid.appendChild(
          tacticalCompactNumberField({
            label,
            value: zone[key],
            onInput: (value) => {
              zone[key] = value;
              rerender();
            }
          })
        );
      });

      main.appendChild(grid);

      row.appendChild(main);
      row.appendChild(
        tacticalIconButton({
          label: "×",
          title: "Excluir zona",
          danger: true,
          onClick: () => {
            data.zones.splice(index, 1);
            rerender();
            renderWorkspace();
          }
        })
      );

      body.appendChild(row);
    }
  );

  body.appendChild(
    tacticalElement("div", "ti-divider")
  );

  const gateHead = tacticalElement(
    "div",
    "ti-card-head"
  );

  gateHead.appendChild(
    tacticalElement(
      "h4",
      "",
      "Linhas de ruptura"
    )
  );

  gateHead.appendChild(
    tacticalButton({
      label: "+ Linha",
      onClick: () => {
        ensureTacticalArray(
          data,
          "gates"
        ).push({
          x1: 450,
          y1: 190,
          x2: 450,
          y2: 390
        });

        rerender();
        renderWorkspace();
      }
    })
  );

  body.appendChild(gateHead);

  (data.gates || []).forEach(
    (gate, index) => {
      const row = tacticalElement(
        "div",
        "ti-list-row"
      );

      const main = tacticalElement(
        "div",
        "ti-list-main"
      );

      main.appendChild(
        tacticalElement(
          "div",
          "ti-list-title",
          `Linha ${index + 1}`
        )
      );

      const grid = tacticalElement(
        "div",
        "ti-compact-grid"
      );

      [
        ["X inicial", "x1"],
        ["Y inicial", "y1"],
        ["X final", "x2"],
        ["Y final", "y2"]
      ].forEach(([label, key]) => {
        grid.appendChild(
          tacticalCompactNumberField({
            label,
            value: gate[key],
            onInput: (value) => {
              gate[key] = value;
              rerender();
            }
          })
        );
      });

      main.appendChild(grid);

      row.appendChild(main);
      row.appendChild(
        tacticalIconButton({
          label: "×",
          title: "Excluir linha",
          danger: true,
          onClick: () => {
            data.gates.splice(index, 1);
            rerender();
            renderWorkspace();
          }
        })
      );

      body.appendChild(row);
    }
  );

  body.appendChild(
    tacticalElement("div", "ti-divider")
  );

  body.appendChild(
    tacticalElement(
      "h4",
      "",
      "Pressões"
    )
  );

  if (!(data.pressures || []).length) {
    body.appendChild(
      tacticalElement(
        "div",
        "ti-empty",
        "Use a ferramenta Pressão e clique em um jogador."
      )
    );
  }

  (data.pressures || []).forEach(
    (pressure, index) => {
      const row = tacticalElement(
        "div",
        "ti-list-row"
      );

      const main = tacticalElement(
        "div",
        "ti-list-main"
      );

      main.appendChild(
        tacticalElement(
          "div",
          "ti-list-title",
          tacticalSafePlayerLabel(
            pressure.playerId
          )
        )
      );

      main.appendChild(
        tacticalElement(
          "div",
          "ti-list-meta",
          "Círculo de pressão"
        )
      );

      const actions = tacticalElement(
        "div",
        "ti-list-actions"
      );

      const radius = document.createElement(
        "input"
      );

      radius.className = "ti-mini-input";
      radius.value = pressure.r ?? 30;
      radius.title = "Raio";
      radius.inputMode = "decimal";
      radius.oninput = () => {
        const parsed = tacticalOptionalNumber(
          radius.value
        );

        if (parsed === null) {
          return;
        }

        pressure.r = parsed;
        rerender();
      };

      actions.appendChild(radius);
      actions.appendChild(
        tacticalIconButton({
          label: "×",
          title: "Excluir pressão",
          danger: true,
          onClick: () => {
            data.pressures.splice(index, 1);
            rerender();
            renderWorkspace();
          }
        })
      );

      row.appendChild(main);
      row.appendChild(actions);
      body.appendChild(row);
    }
  );

  body.appendChild(
    tacticalElement("div", "ti-divider")
  );

  body.appendChild(
    tacticalElement(
      "h4",
      "",
      "Marcadores numerados"
    )
  );

  if (!(data.steps || []).length) {
    body.appendChild(
      tacticalElement(
        "div",
        "ti-empty",
        "Use a ferramenta Marcador e clique em um jogador."
      )
    );
  }

  (data.steps || []).forEach(
    (step, index) => {
      const row = tacticalElement(
        "div",
        "ti-list-row"
      );

      const main = tacticalElement(
        "div",
        "ti-list-main"
      );

      main.appendChild(
        tacticalElement(
          "div",
          "ti-list-title",
          tacticalSafePlayerLabel(
            step.playerId,
            `Marcador ${step.number ?? index + 1}`
          )
        )
      );

      main.appendChild(
        tacticalElement(
          "div",
          "ti-list-meta",
          "Marcador da sequência"
        )
      );

      const actions = tacticalElement(
        "div",
        "ti-list-actions"
      );

      const number = document.createElement(
        "input"
      );

      number.className = "ti-mini-input";
      number.value = step.number ?? "";
      number.title = "Número";
      number.oninput = () => {
        step.number = number.value;
        rerender();
      };

      actions.appendChild(number);
      actions.appendChild(
        tacticalIconButton({
          label: "×",
          title: "Excluir marcador",
          danger: true,
          onClick: () => {
            data.steps.splice(index, 1);
            rerender();
            renderWorkspace();
          }
        })
      );

      row.appendChild(main);
      row.appendChild(actions);
      body.appendChild(row);
    }
  );

  return accordion.details;
}

function tacticalBuildCopyAccordions({
  form,
  frame,
  data,
  currentValues
}) {
  const copyAccordion = tacticalAccordion(
    "Texto do card",
    false
  );

  copyAccordion.body.appendChild(
    tacticalSection("Cabeçalho")
  );

  tacticalAddCopyField({
    container: copyAccordion.body,
    frame,
    data,
    currentValues,
    key: "pitchKicker",
    label: "Categoria",
    selector: ".tp-kicker",
    dataPath: "kicker"
  });

  tacticalAddCopyField({
    container: copyAccordion.body,
    frame,
    data,
    currentValues,
    key: "pitchTitle",
    label: "Título",
    selector: "#pitchTitle",
    dataPath: "title"
  });

  tacticalAddCopyField({
    container: copyAccordion.body,
    frame,
    data,
    currentValues,
    key: "pitchSubtitle",
    label: "Subtítulo",
    selector: "#pitchSubtitle",
    dataPath: "subtitle"
  });

  copyAccordion.body.appendChild(
    tacticalSection("Leitura")
  );

  tacticalAddCopyField({
    container: copyAccordion.body,
    frame,
    data,
    currentValues,
    key: "readingText",
    label: "Leitura tática",
    selector: "#readingText",
    dataPath: "reading",
    type: "textarea"
  });

  form.appendChild(copyAccordion.details);

  const stepsAccordion = tacticalAccordion(
    "Etapas e rodapé",
    false
  );

  (data.stepCopy || []).forEach(
    (step, index) => {
      const position = index + 1;

      stepsAccordion.body.appendChild(
        tacticalSection(
          `Etapa ${position}`
        )
      );

      tacticalAddCopyField({
        container: stepsAccordion.body,
        frame,
        data,
        currentValues,
        key: `step${position}Title`,
        label: "Título",
        selector:
          `.tp-steps article:nth-child(${position}) h3`,
        dataPath:
          `stepCopy.${index}.title`
      });

      tacticalAddCopyField({
        container: stepsAccordion.body,
        frame,
        data,
        currentValues,
        key: `step${position}Text`,
        label: "Descrição",
        selector:
          `.tp-steps article:nth-child(${position}) p`,
        dataPath:
          `stepCopy.${index}.text`,
        type: "textarea"
      });
    }
  );

  stepsAccordion.body.appendChild(
    tacticalSection("Rodapé")
  );

  tacticalAddCopyField({
    container: stepsAccordion.body,
    frame,
    data,
    currentValues,
    key: "sourceText",
    label: "Fonte",
    selector: "#sourceText",
    dataPath: "source"
  });

  form.appendChild(stepsAccordion.details);
}

function tacticalAttachFrameEvents({
  frame,
  data,
  win,
  state,
  rerender,
  renderWorkspace
}) {
  if (typeof state.cleanup === "function") {
    state.cleanup();
  }

  const doc = frame.contentDocument;

  const handlePlayerClick = (event) => {
    const playerId = event.detail?.playerId;

    if (!playerId) {
      return;
    }

    state.statusMessage = "";

    if (TACTICAL_ROUTE_TOOLS[state.mode]) {
      if (!state.routeStartPlayerId) {
        state.routeStartPlayerId = playerId;

        tacticalSyncInteractionState(
          win,
          state
        );
        renderWorkspace();
        return;
      }

      if (
        state.routeStartPlayerId === playerId
      ) {
        state.statusMessage =
          "Origem e destino precisam ser jogadores diferentes.";
        renderWorkspace();
        return;
      }

      const routeResult = tacticalAddRoute(
        data,
        state.mode,
        state.routeStartPlayerId,
        playerId
      );

      if (!routeResult?.ok) {
        state.statusMessage =
          routeResult?.reason === "duplicate"
            ? "Esse movimento já existe entre os dois jogadores."
            : "Não foi possível criar esse movimento.";
        state.routeStartPlayerId = null;

        tacticalSyncInteractionState(
          win,
          state
        );
        renderWorkspace();
        return;
      }

      state.mode = null;
      state.routeStartPlayerId = null;
      state.selectedPlayerId = null;

      tacticalSyncInteractionState(
        win,
        state
      );
      rerender();
      renderWorkspace();
      return;
    }

    if (state.mode === "add-pressure") {
      const pressures = ensureTacticalArray(
        data,
        "pressures"
      );

      const alreadyExists = pressures.some(
        (pressure) =>
          pressure.playerId === playerId
      );

      if (alreadyExists) {
        state.statusMessage =
          "Esse jogador já possui um indicador de pressão.";
      } else {
        pressures.push({
          playerId,
          r: 30
        });
      }

      state.mode = null;
      state.selectedPlayerId = playerId;

      tacticalSyncInteractionState(
        win,
        state
      );
      rerender();
      renderWorkspace();
      return;
    }

    if (state.mode === "add-step") {
      const steps = ensureTacticalArray(
        data,
        "steps"
      );

      const alreadyExists = steps.some(
        (step) => step?.playerId === playerId
      );

      if (alreadyExists) {
        state.statusMessage =
          "Esse jogador já possui um marcador numerado.";
      } else {
        steps.push({
          playerId,
          number: tacticalNextStepNumber(data)
        });
      }

      state.mode = null;
      state.selectedPlayerId = playerId;

      tacticalSyncInteractionState(
        win,
        state
      );
      rerender();
      renderWorkspace();
      return;
    }

    if (state.mode === "add-player") {
      state.statusMessage =
        "Clique em um espaço vazio do campo para posicionar o novo jogador.";
      renderWorkspace();
      return;
    }

    state.selectedPlayerId = playerId;
    renderWorkspace();
  };

  const handleFieldClick = (event) => {
    if (state.mode === "add-player") {
      const type = state.playerDraftType;
      const id = tacticalNextPlayerId(
        data,
        type
      );

      ensureTacticalArray(
        data,
        "players"
      ).push({
        id,
        x: tacticalNumber(event.detail?.x),
        y: tacticalNumber(event.detail?.y),
        type,
        number:
          state.playerDraftNumber.trim() === ""
            ? null
            : state.playerDraftNumber.trim()
      });

      state.mode = null;
      state.routeStartPlayerId = null;
      state.selectedPlayerId = id;
      state.playerDraftNumber = "";
      state.statusMessage = "";

      tacticalSyncInteractionState(
        win,
        state
      );
      rerender();
      renderWorkspace();
      return;
    }

    if (state.mode) {
      return;
    }

    state.selectedPlayerId = null;
    renderWorkspace();
  };

  doc.addEventListener(
    "tactical:player-click",
    handlePlayerClick
  );

  doc.addEventListener(
    "tactical:field-click",
    handleFieldClick
  );

  const exportButtons = [
    "exportDataBtn",
    "exportHtmlBtn",
    "exportPngBtn"
  ]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const handleExport = () => {
    state.mode = null;
    state.routeStartPlayerId = null;
    state.statusMessage = "";

    tacticalSyncInteractionState(
      win,
      state
    );
  };

  exportButtons.forEach((button) => {
    button.addEventListener(
      "click",
      handleExport,
      true
    );
  });

  const handleEscape = (event) => {
    if (event.key !== "Escape" || !state.mode) {
      return;
    }

    tacticalCancelMode(
      win,
      state,
      renderWorkspace
    );
  };

  document.addEventListener(
    "keydown",
    handleEscape
  );

  doc.addEventListener(
    "keydown",
    handleEscape
  );

  state.cleanup = () => {
    doc.removeEventListener(
      "tactical:player-click",
      handlePlayerClick
    );

    doc.removeEventListener(
      "tactical:field-click",
      handleFieldClick
    );

    exportButtons.forEach((button) => {
      button.removeEventListener(
        "click",
        handleExport,
        true
      );
    });

    document.removeEventListener(
      "keydown",
      handleEscape
    );

    doc.removeEventListener(
      "keydown",
      handleEscape
    );
  };
}

function buildAdvancedTacticalInspector({
  form,
  frame,
  schema,
  currentValues
}) {
  form.innerHTML = "";
  ensureTacticalInspectorStyles();

  const win = frame.contentWindow;
  const data = win[schema.dataKey];

  if (!data) {
    form.innerHTML =
      "Dados táticos não encontrados no componente.";
    return;
  }

  currentValues.__data = data;
  currentValues.__variableName =
    schema.dataKey;

  const state = tacticalGetState(frame);

  state.mode = null;
  state.routeStartPlayerId = null;
  state.selectedPlayerId = null;
  state.statusMessage = "";

  const rerender = () => {
    tacticalRerender(
      win,
      schema,
      data
    );
  };

  const workspace = tacticalElement(
    "div",
    "ti-shell"
  );

  form.appendChild(workspace);

  const renderWorkspace = () => {
    workspace.innerHTML = "";

    workspace.appendChild(
      tacticalBuildHeaderTools({
        win,
        state,
        renderWorkspace
      })
    );

    workspace.appendChild(
      tacticalBuildStatus({
        win,
        state,
        renderWorkspace
      })
    );

    const placement =
      tacticalBuildPlayerPlacement({
        win,
        state,
        renderWorkspace
      });

    if (placement) {
      workspace.appendChild(placement);
    }

    const selectedPlayer =
      tacticalBuildSelectedPlayer({
        data,
        win,
        schema,
        state,
        rerender,
        renderWorkspace
      });

    if (selectedPlayer) {
      workspace.appendChild(selectedPlayer);
    }

    workspace.appendChild(
      tacticalBuildPlayersCard({
        data,
        win,
        state,
        rerender,
        renderWorkspace
      })
    );

    workspace.appendChild(
      tacticalBuildRoutesCard({
        data,
        rerender,
        renderWorkspace
      })
    );

    workspace.appendChild(
      tacticalBuildAdvancedElements({
        data,
        rerender,
        renderWorkspace
      })
    );
  };

  state.renderWorkspace = renderWorkspace;

  tacticalAttachFrameEvents({
    frame,
    data,
    win,
    state,
    rerender,
    renderWorkspace
  });

  tacticalSyncInteractionState(
    win,
    state
  );
  renderWorkspace();

  tacticalBuildCopyAccordions({
    form,
    frame,
    data,
    currentValues
  });
}

buildInspector = function buildInspectorWithTacticalMode(
  args
) {
  if (
    args.schema.mode ===
    "tactical-advanced"
  ) {
    buildAdvancedTacticalInspector(args);
    return;
  }

  const previousState = tacticalEditorStates.get(
    args.frame
  );

  if (
    previousState &&
    typeof previousState.cleanup === "function"
  ) {
    previousState.cleanup();
    previousState.cleanup = null;
    previousState.mode = null;
    previousState.routeStartPlayerId = null;
    previousState.statusMessage = "";
  }

  baseBuildInspector(args);
};
