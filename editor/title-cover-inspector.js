/* ==========================================================
   ADQL EDITOR
   C-07 — TITLE COVER / EDITOR AVANÇADO
========================================================== */

editorSchemas["title-cover"] = {
  mode: "title-cover-advanced",
  dataKey: "titleCoverData",
  renderFunction: "renderTitleCover"
};

const titleCoverBaseBuildInspector = buildInspector;
const titleCoverEditorStates = new WeakMap();

const TCI_COMPOSITIONS = [
  {
    id: "editorial",
    label: "Editorial",
    description: "A composição atual, equilibrada",
    icon: "▰"
  },
  {
    id: "impact",
    label: "Impacto",
    description: "Mais contraste, escala e tensão",
    icon: "!"
  },
  {
    id: "minimal",
    label: "Essencial",
    description: "Mais limpa e com foco no título",
    icon: "—"
  }
];

function tciElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== "") {
    element.textContent = text;
  }

  return element;
}

function tciGetState(frame) {
  let state = titleCoverEditorStates.get(frame);

  if (!state) {
    state = {
      openSections: {
        content: true,
        composition: true
      },
      boundDocument: null,
      renderWorkspace: null,
      rerender: null
    };

    titleCoverEditorStates.set(frame, state);
  }

  return state;
}

function tciField({
  label,
  value,
  placeholder = "",
  multiline = false,
  rows = 3,
  onInput
}) {
  const wrapper = tciElement("label", "tci-field");
  wrapper.appendChild(tciElement("span", "tci-field-label", label));

  const input = multiline
    ? document.createElement("textarea")
    : document.createElement("input");

  if (!multiline) {
    input.type = "text";
  } else {
    input.rows = rows;
  }

  input.value = value ?? "";
  input.placeholder = placeholder;

  input.addEventListener("input", () => {
    onInput?.(input.value, input);
  });

  wrapper.appendChild(input);
  return wrapper;
}

function tciToggle({ label, description, checked, onChange }) {
  const wrapper = tciElement("label", "tci-toggle-row");
  const text = tciElement("span", "tci-toggle-copy");
  text.appendChild(tciElement("strong", "", label));

  if (description) {
    text.appendChild(tciElement("small", "", description));
  }

  const control = tciElement("span", "tci-toggle");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);

  const visual = tciElement("span", "tci-toggle-track");

  input.addEventListener("change", () => {
    onChange?.(input.checked);
  });

  control.appendChild(input);
  control.appendChild(visual);
  wrapper.appendChild(text);
  wrapper.appendChild(control);

  return wrapper;
}

function tciCard(title, eyebrow = "") {
  const card = tciElement("section", "tci-card");
  const head = tciElement("div", "tci-card-head");
  const titleWrap = tciElement("div");

  if (eyebrow) {
    titleWrap.appendChild(tciElement("span", "tci-eyebrow", eyebrow));
  }

  titleWrap.appendChild(tciElement("h4", "", title));
  head.appendChild(titleWrap);
  card.appendChild(head);

  return { card, head };
}

function tciWrapCardInCollapse({
  card,
  state,
  sectionKey,
  defaultOpen = false
}) {
  const details = tciElement("details", "tci-section-details");
  const savedState = state.openSections[sectionKey];

  details.open = typeof savedState === "boolean"
    ? savedState
    : defaultOpen;

  const summary = tciElement("summary", "tci-section-summary");
  const head = card.firstElementChild?.classList?.contains("tci-card-head")
    ? card.firstElementChild
    : null;

  if (head) {
    summary.appendChild(head);
  }

  summary.appendChild(tciElement("span", "tci-details-plus", "+"));
  details.appendChild(summary);

  const body = tciElement("div", "tci-section-body");
  body.appendChild(card);
  details.appendChild(body);

  details.addEventListener("toggle", () => {
    state.openSections[sectionKey] = details.open;
  });

  return details;
}

function ensureTitleCoverInspectorStyles() {
  if (document.getElementById("titleCoverInspectorStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "titleCoverInspectorStyles";
  style.textContent = `
    .tci-shell {
      display: grid;
      gap: 14px;
    }

    .tci-hero {
      padding: 17px;
      border-radius: 15px;
      background:
        radial-gradient(circle at 92% 0%, rgba(197,139,18,.26), transparent 34%),
        #071f3d;
      color: #fff;
      box-shadow: 0 12px 30px rgba(7,31,61,.12);
    }

    .tci-hero-top,
    .tci-card-head,
    .tci-counter-row,
    .tci-toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .tci-eyebrow {
      display: block;
      color: #c58b12;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }

    .tci-hero h4 {
      margin-top: 4px;
      font-size: 19px;
      line-height: 1.08;
    }

    .tci-hero p {
      margin-top: 8px;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.5;
    }

    .tci-hero-badge {
      min-width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(255,255,255,.14);
      border-radius: 12px;
      color: #c58b12;
      background: rgba(255,255,255,.07);
      font-size: 13px;
      font-weight: 900;
    }

    .tci-card {
      display: grid;
      gap: 13px;
      padding: 14px;
      border: 1px solid #ded7c9;
      border-radius: 13px;
      background: #fffdf8;
    }

    .tci-card-head h4 {
      margin-top: 3px;
      color: #071f3d;
      font-size: 15px;
      line-height: 1.15;
    }

    .tci-field {
      display: grid;
      gap: 6px;
    }

    .tci-field-label {
      color: #7a7368;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .tci-field input,
    .tci-field textarea {
      width: 100%;
      min-width: 0;
      padding: 10px 11px;
      border: 1px solid #d8d1c3;
      border-radius: 9px;
      outline: none;
      background: #fff;
      color: #071f3d;
      font: inherit;
      font-size: 12px;
      line-height: 1.45;
      resize: vertical;
    }

    .tci-field input:focus,
    .tci-field textarea:focus {
      border-color: #c58b12;
      box-shadow: 0 0 0 3px rgba(197,139,18,.12);
    }

    .tci-counter-row {
      margin-top: -5px;
      color: #989083;
      font-size: 10px;
    }

    .tci-counter-row strong {
      color: #071f3d;
      font-size: 10px;
    }

    .tci-toggle-row {
      padding: 11px 12px;
      border: 1px solid #e1dacd;
      border-radius: 10px;
      background: #fbf8f1;
      cursor: pointer;
    }

    .tci-toggle-copy {
      display: grid;
      gap: 3px;
    }

    .tci-toggle-copy strong {
      color: #071f3d;
      font-size: 12px;
    }

    .tci-toggle-copy small {
      color: #8a8276;
      font-size: 10px;
      line-height: 1.35;
    }

    .tci-toggle {
      position: relative;
      flex: 0 0 auto;
    }

    .tci-toggle input {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }

    .tci-toggle-track {
      display: block;
      position: relative;
      width: 40px;
      height: 23px;
      border-radius: 999px;
      background: #c9c2b7;
      transition: 140ms ease;
    }

    .tci-toggle-track::after {
      content: "";
      position: absolute;
      width: 17px;
      height: 17px;
      left: 3px;
      top: 3px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 2px 5px rgba(7,31,61,.18);
      transition: 140ms ease;
    }

    .tci-toggle input:checked + .tci-toggle-track {
      background: #c58b12;
    }

    .tci-toggle input:checked + .tci-toggle-track::after {
      transform: translateX(17px);
    }

    .tci-composition-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
    }

    .tci-composition-button {
      min-width: 0;
      min-height: 112px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
      padding: 10px;
      border: 1px solid #d8d1c3;
      border-radius: 11px;
      background: #fff;
      color: #071f3d;
      cursor: pointer;
      transition: 150ms ease;
      text-align: left;
    }

    .tci-composition-button:hover {
      border-color: #c58b12;
      transform: translateY(-1px);
    }

    .tci-composition-button.is-active {
      border-color: #c58b12;
      background: #fff8e8;
      box-shadow: inset 0 0 0 1px rgba(197,139,18,.12);
    }

    .tci-composition-icon {
      width: 100%;
      min-height: 36px;
      display: grid;
      place-items: center;
      border-radius: 7px;
      background: #071f3d;
      color: #c58b12;
      font-family: "Barlow Semi Condensed", Arial, sans-serif;
      font-size: 18px;
      font-weight: 900;
    }

    .tci-composition-button strong {
      display: block;
      font-size: 11px;
    }

    .tci-composition-button small {
      display: block;
      margin-top: 2px;
      color: #8d8579;
      font-size: 9px;
      line-height: 1.3;
    }

    .tci-note {
      padding: 11px 12px;
      border-left: 3px solid #c58b12;
      background: rgba(197,139,18,.07);
      color: #6f675b;
      font-size: 10px;
      line-height: 1.5;
    }

    .tci-section-details {
      overflow: hidden;
      border: 1px solid #ded7c9;
      border-radius: 13px;
      background: #fffdf8;
    }

    .tci-section-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 14px;
      cursor: pointer;
      list-style: none;
    }

    .tci-section-summary::-webkit-details-marker {
      display: none;
    }

    .tci-section-summary .tci-card-head {
      flex: 1;
    }

    .tci-section-body {
      border-top: 1px solid #ebe4d7;
    }

    .tci-section-body > .tci-card {
      border: 0;
      border-radius: 0;
      background: transparent;
    }

    .tci-details-plus {
      flex: 0 0 auto;
      width: 24px;
      height: 24px;
      display: grid;
      place-items: center;
      border-radius: 7px;
      background: #f2ede4;
      color: #071f3d;
      font-size: 16px;
      font-weight: 700;
      transition: 140ms ease;
    }

    .tci-section-details[open] > .tci-section-summary .tci-details-plus {
      transform: rotate(45deg);
      background: #071f3d;
      color: #c58b12;
    }
  `;

  document.head.appendChild(style);
}

function tciRerenderComponent(win, schema, data) {
  const renderFunction = win[schema.renderFunction];

  if (typeof renderFunction === "function") {
    renderFunction(data);
  }
}

function tciBuildHero(data) {
  const hero = tciElement("section", "tci-hero");
  const top = tciElement("div", "tci-hero-top");
  const text = tciElement("div");

  text.appendChild(tciElement("span", "tci-eyebrow", "C-07 • Capa editorial"));
  text.appendChild(tciElement("h4", "", "Título da matéria"));
  text.appendChild(
    tciElement(
      "p",
      "",
      "Poucos elementos, hierarquia forte e leitura imediata. O título se ajusta automaticamente à composição."
    )
  );

  top.appendChild(text);
  top.appendChild(tciElement("span", "tci-hero-badge", data.code || "C-07"));
  hero.appendChild(top);

  return hero;
}

function tciBuildContentCard({ data, rerender }) {
  const { card } = tciCard("Conteúdo", "Texto principal");

  card.appendChild(
    tciToggle({
      label: "Mostrar identificador",
      description: "Exibe o rótulo acima do título.",
      checked: data.showKicker !== false,
      onChange: (checked) => {
        data.showKicker = checked;
        rerender(false);
      }
    })
  );

  card.appendChild(
    tciField({
      label: "Identificador",
      value: data.kicker,
      placeholder: "Pós-jogo",
      onInput: (value) => {
        data.kicker = value;
        rerender(false);
      }
    })
  );

  card.appendChild(
    tciField({
      label: "Número da publicação",
      value: data.publicationNumber,
      placeholder: "01",
      onInput: (value) => {
        data.publicationNumber = value;
        rerender(false);
      }
    })
  );

  const titleField = tciField({
    label: "Título",
    value: data.title,
    placeholder: "Escócia 0 × 3 Brasil",
    multiline: true,
    rows: 4,
    onInput: (value) => {
      data.title = value;
      rerender(false);
      titleCounter.textContent = `${value.length} caracteres`;
      titleLines.textContent = `${Math.max(1, value.split("\n").length)} linha(s)`;
    }
  });

  card.appendChild(titleField);

  const counter = tciElement("div", "tci-counter-row");
  const titleCounter = tciElement("span", "", `${String(data.title ?? "").length} caracteres`);
  const titleLines = tciElement(
    "strong",
    "",
    `${Math.max(1, String(data.title ?? "").split("\n").length)} linha(s)`
  );
  counter.appendChild(titleCounter);
  counter.appendChild(titleLines);
  card.appendChild(counter);

  card.appendChild(
    tciField({
      label: "Subtítulo",
      value: data.subtitle,
      placeholder: "Competição • data • estádio",
      multiline: true,
      rows: 3,
      onInput: (value) => {
        data.subtitle = value;
        rerender(false);
      }
    })
  );

  card.appendChild(
    tciElement(
      "div",
      "tci-note",
      "Use Enter para forçar uma quebra de linha no título ou no subtítulo. O número da publicação altera somente a marca d’água grande."
    )
  );

  return card;
}

function tciBuildCompositionCard({ data, state, rerender, renderWorkspace }) {
  const { card } = tciCard("Composição", "Direção visual");
  const grid = tciElement("div", "tci-composition-grid");

  TCI_COMPOSITIONS.forEach((composition) => {
    const button = tciElement(
      "button",
      `tci-composition-button${data.composition === composition.id ? " is-active" : ""}`
    );
    button.type = "button";

    button.appendChild(
      tciElement("span", "tci-composition-icon", composition.icon)
    );

    const copy = tciElement("span");
    copy.appendChild(tciElement("strong", "", composition.label));
    copy.appendChild(tciElement("small", "", composition.description));
    button.appendChild(copy);

    button.addEventListener("click", () => {
      data.composition = composition.id;
      rerender(false);
      renderWorkspace();
    });

    grid.appendChild(button);
  });

  card.appendChild(grid);

  const helpText = {
    editorial: "Mantém a composição aprovada: equilíbrio entre impacto, respiro e linguagem editorial.",
    impact: "Para pós-jogo, manchetes fortes e títulos curtos. Usa diagonais, contraste e uma marca d’água mais presente.",
    minimal: "Para análises e textos mais sofisticados. Remove quase todo o ruído visual e deixa o título conduzir a capa."
  };

  card.appendChild(
    tciElement("div", "tci-note", helpText[data.composition] || helpText.editorial)
  );

  return card;
}

function tciAttachFrameEvents({ frame, state }) {
  const doc = frame.contentDocument;

  if (!doc || state.boundDocument === doc) {
    return;
  }

  state.boundDocument = doc;

  doc.addEventListener("click", (event) => {
    if (event.target.closest("#tcTitle, #tcSubtitle, #tcKicker, #tcBigCode")) {
      state.openSections.content = true;
      state.renderWorkspace?.();
    }
  });
}

function buildAdvancedTitleCoverInspector({
  form,
  frame,
  schema,
  currentValues
}) {
  ensureTitleCoverInspectorStyles();
  form.innerHTML = "";

  const win = frame.contentWindow;
  const data = win[schema.dataKey];

  if (!data) {
    form.innerHTML = "Dados do C-07 não encontrados no componente.";
    return;
  }

  data.kicker ??= "Pós-jogo";
  data.showKicker ??= true;
  data.title ??= "Título da matéria";
  data.subtitle ??= "Informações complementares";
  data.composition ??= "editorial";
  data.code ??= "C-07";
  data.publicationNumber ??= "01";

  if (data.composition === "score") {
    data.composition = "impact";
  }

  if (data.composition === "question") {
    data.composition = "minimal";
  }

  currentValues.__data = data;
  currentValues.__variableName = schema.dataKey;

  const state = tciGetState(frame);
  const workspace = tciElement("div", "tci-shell");
  form.appendChild(workspace);

  const rerender = (refreshWorkspace = false) => {
    tciRerenderComponent(win, schema, data);

    if (refreshWorkspace) {
      renderWorkspace();
    }
  };

  const renderWorkspace = () => {
    workspace.innerHTML = "";

    workspace.appendChild(tciBuildHero(data));

    workspace.appendChild(
      tciWrapCardInCollapse({
        card: tciBuildContentCard({ data, rerender }),
        state,
        sectionKey: "content",
        defaultOpen: true
      })
    );

    workspace.appendChild(
      tciWrapCardInCollapse({
        card: tciBuildCompositionCard({
          data,
          state,
          rerender,
          renderWorkspace
        }),
        state,
        sectionKey: "composition",
        defaultOpen: true
      })
    );
  };

  state.renderWorkspace = renderWorkspace;
  state.rerender = rerender;

  tciAttachFrameEvents({ frame, state });

  renderWorkspace();
  rerender(false);
}

buildInspector = function buildInspectorWithTitleCoverMode(args) {
  if (args.schema.mode === "title-cover-advanced") {
    buildAdvancedTitleCoverInspector(args);
    return;
  }

  titleCoverBaseBuildInspector(args);
};
