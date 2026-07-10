/* ==========================================================
   ADQL EDITOR
   C-06 — TABLE BUILDER / EDITOR AVANÇADO
========================================================== */

editorSchemas["text-table"] = {
  mode: "table-builder-advanced",
  dataKey: "tableBuilderData",
  renderFunction: "renderTextTable"
};

const tableBuilderBaseBuildInspector = buildInspector;
const tableBuilderEditorStates = new WeakMap();
let tableBuilderActiveFrame = null;

function tbiElement(tag, className = "", text = "") {
  const element = document.createElement(tag);

  if (className) {
    element.className = className;
  }

  if (text !== "") {
    element.textContent = text;
  }

  return element;
}

function tbiUid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function tbiSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function tbiGetState(frame) {
  let state = tableBuilderEditorStates.get(frame);

  if (!state) {
    state = {
      selectedColumnId: null,
      selectedRowId: null,
      selectedCellColumnId: null,
      openSections: {
        structure: true,
        columns: false,
        rows: true,
        text: false
      },
      openColumns: {},
      openRows: {},
      boundDocument: null,
      frameClickHandler: null,
      exportOwnerDocument: null,
      exportCaptureHandler: null,
      renderWorkspace: null,
      rerender: null
    };

    tableBuilderEditorStates.set(frame, state);
  }

  return state;
}

function tbiButton({
  label,
  icon = "",
  className = "tbi-button",
  onClick,
  disabled = false,
  title = ""
}) {
  const button = tbiElement("button", className);
  button.type = "button";
  button.disabled = disabled;

  if (title) {
    button.title = title;
  }

  if (icon) {
    button.appendChild(tbiElement("span", "tbi-button-icon", icon));
  }

  button.appendChild(tbiElement("span", "tbi-button-label", label));

  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!button.disabled) {
      onClick?.(event);
    }
  });

  return button;
}

function tbiField({
  label,
  value,
  placeholder = "",
  onInput,
  multiline = false
}) {
  const wrapper = tbiElement("label", "tbi-field");
  wrapper.appendChild(tbiElement("span", "tbi-field-label", label));

  const input = multiline
    ? document.createElement("textarea")
    : document.createElement("input");

  if (!multiline) {
    input.type = "text";
  }

  input.value = value ?? "";
  input.placeholder = placeholder;

  input.addEventListener("input", () => {
    onInput?.(input.value, input);
  });

  wrapper.appendChild(input);
  return wrapper;
}

function tbiDetails({
  title,
  subtitle = "",
  open = false,
  className = "tbi-details",
  onToggle
}) {
  const details = tbiElement("details", className);
  details.open = open;

  const summary = tbiElement("summary", "tbi-details-summary");
  const titleWrap = tbiElement("div", "tbi-details-title");
  titleWrap.appendChild(tbiElement("strong", "", title));

  if (subtitle) {
    titleWrap.appendChild(tbiElement("span", "", subtitle));
  }

  summary.appendChild(titleWrap);
  summary.appendChild(tbiElement("span", "tbi-details-plus", "+"));
  details.appendChild(summary);

  details.addEventListener("toggle", () => {
    onToggle?.(details.open);
  });

  return details;
}

function tbiSectionCard(title, eyebrow = "") {
  const card = tbiElement("section", "tbi-card");
  const head = tbiElement("div", "tbi-card-head");
  const titleWrap = tbiElement("div");

  if (eyebrow) {
    titleWrap.appendChild(tbiElement("span", "tbi-eyebrow", eyebrow));
  }

  titleWrap.appendChild(tbiElement("h4", "", title));
  head.appendChild(titleWrap);
  card.appendChild(head);

  return { card, head };
}

function tbiWrapCardInCollapse({
  card,
  state,
  sectionKey,
  defaultOpen = false
}) {
  const details = tbiElement("details", "tbi-section-details");
  const savedState = state.openSections[sectionKey];

  details.open = typeof savedState === "boolean"
    ? savedState
    : defaultOpen;

  const summary = tbiElement("summary", "tbi-section-summary");
  const head = card.firstElementChild?.classList?.contains("tbi-card-head")
    ? card.firstElementChild
    : null;

  if (head) {
    summary.appendChild(head);
  }

  summary.appendChild(tbiElement("span", "tbi-details-plus", "+"));
  details.appendChild(summary);

  const body = tbiElement("div", "tbi-section-body");
  body.appendChild(card);
  details.appendChild(body);

  details.addEventListener("toggle", () => {
    state.openSections[sectionKey] = details.open;
  });

  return details;
}

function ensureTableBuilderInspectorStyles() {
  if (document.getElementById("tableBuilderInspectorStyles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "tableBuilderInspectorStyles";
  style.textContent = `
    .tbi-shell {
      display: grid;
      gap: 14px;
    }

    .tbi-hero {
      padding: 17px;
      border-radius: 15px;
      background:
        radial-gradient(circle at 92% 0%, rgba(197,139,18,.24), transparent 34%),
        #071f3d;
      color: #fff;
      box-shadow: 0 12px 30px rgba(7,31,61,.12);
    }

    .tbi-hero-top,
    .tbi-card-head,
    .tbi-row-head,
    .tbi-inline-actions,
    .tbi-cell-context {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }

    .tbi-eyebrow {
      display: block;
      color: #c58b12;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .16em;
      text-transform: uppercase;
    }

    .tbi-hero h4 {
      margin-top: 4px;
      font-size: 19px;
      line-height: 1.08;
    }

    .tbi-hero p {
      margin-top: 8px;
      color: rgba(255,255,255,.72);
      font-size: 12px;
      line-height: 1.5;
    }

    .tbi-count {
      flex: 0 0 auto;
      min-width: 42px;
      padding: 7px 9px;
      border-radius: 999px;
      background: rgba(255,255,255,.1);
      color: #fff;
      font-size: 11px;
      font-weight: 900;
      text-align: center;
    }

    .tbi-quick-actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    .tbi-button,
    .tbi-icon-button,
    .tbi-chip {
      font: inherit;
      cursor: pointer;
      transition: 150ms ease;
    }

    .tbi-button {
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

    .tbi-button:hover {
      border-color: #c58b12;
      transform: translateY(-1px);
    }

    .tbi-button:disabled {
      opacity: .35;
      cursor: not-allowed;
      transform: none;
    }

    .tbi-hero .tbi-button {
      border-color: rgba(255,255,255,.14);
      background: rgba(255,255,255,.08);
      color: #fff;
    }

    .tbi-hero .tbi-button:hover {
      border-color: #c58b12;
      background: rgba(255,255,255,.12);
    }

    .tbi-button-danger {
      border-color: rgba(150, 42, 42, .24);
      color: #8d2d2d;
    }

    .tbi-card {
      display: grid;
      gap: 13px;
      padding: 15px;
      border: 1px solid #ded7ca;
      border-radius: 14px;
      background: rgba(255,253,248,.88);
    }

    .tbi-card-head h4 {
      margin-top: 3px;
      color: #071f3d;
      font-size: 16px;
      line-height: 1.1;
    }

    .tbi-field {
      display: grid;
      gap: 6px;
    }

    .tbi-field-label {
      color: #6f7680;
      font-size: 10px;
      font-weight: 900;
      letter-spacing: .08em;
      text-transform: uppercase;
    }

    .tbi-field input,
    .tbi-field textarea {
      width: 100%;
      min-width: 0;
      padding: 9px 10px;
      border: 1px solid #d8d1c3;
      border-radius: 9px;
      outline: none;
      background: #fff;
      color: #071f3d;
      font: 600 12px/1.4 Inter, Arial, sans-serif;
    }

    .tbi-field textarea {
      min-height: 78px;
      resize: vertical;
    }

    .tbi-field input:focus,
    .tbi-field textarea:focus {
      border-color: #c58b12;
      box-shadow: 0 0 0 3px rgba(197,139,18,.1);
    }

    .tbi-section-details,
    .tbi-details {
      border: 1px solid #ded7ca;
      border-radius: 14px;
      background: rgba(255,253,248,.72);
      overflow: hidden;
    }

    .tbi-section-summary,
    .tbi-details-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      cursor: pointer;
      list-style: none;
    }

    .tbi-section-summary::-webkit-details-marker,
    .tbi-details-summary::-webkit-details-marker {
      display: none;
    }

    .tbi-section-details[open] > .tbi-section-summary,
    .tbi-details[open] > .tbi-details-summary {
      border-bottom: 1px solid #e4ddd1;
    }

    .tbi-section-summary .tbi-card-head {
      width: 100%;
      padding: 0;
    }

    .tbi-section-body {
      padding: 0;
    }

    .tbi-section-body > .tbi-card {
      border: 0;
      border-radius: 0;
      background: transparent;
    }

    .tbi-details-title {
      min-width: 0;
      display: grid;
      gap: 2px;
    }

    .tbi-details-title strong {
      overflow: hidden;
      color: #071f3d;
      font-size: 12px;
      font-weight: 900;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .tbi-details-title span {
      color: #81858b;
      font-size: 10px;
      font-weight: 700;
    }

    .tbi-details-plus {
      flex: 0 0 auto;
      color: #c58b12;
      font-size: 18px;
      font-weight: 800;
      transition: transform 160ms ease;
    }

    details[open] > summary .tbi-details-plus {
      transform: rotate(45deg);
    }

    .tbi-details-body {
      display: grid;
      gap: 10px;
      padding: 12px;
    }

    .tbi-list {
      display: grid;
      gap: 8px;
    }

    .tbi-inline-actions {
      align-items: stretch;
    }

    .tbi-inline-actions .tbi-button {
      flex: 1 1 0;
      min-height: 36px;
      padding: 7px 8px;
      font-size: 10px;
    }

    .tbi-mini-actions {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }

    .tbi-mini-actions .tbi-button {
      min-height: 34px;
      padding: 6px;
      font-size: 10px;
    }

    .tbi-cell-card {
      border-color: rgba(197,139,18,.42);
      background: linear-gradient(180deg, rgba(197,139,18,.07), rgba(255,253,248,.9));
    }

    .tbi-cell-context {
      padding-bottom: 8px;
      border-bottom: 1px solid #e5ded1;
    }

    .tbi-cell-context strong {
      color: #071f3d;
      font-size: 12px;
    }

    .tbi-cell-context span {
      color: #6f7680;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .tbi-empty {
      padding: 14px;
      border: 1px dashed #d8d1c3;
      border-radius: 10px;
      color: #767b82;
      font-size: 11px;
      line-height: 1.45;
      text-align: center;
    }
  `;

  document.head.appendChild(style);
}

function tbiNormalizeData(win, data) {
  if (typeof win.tbNormalizeData === "function") {
    win.tbNormalizeData(data);
  }

  data.columns = tbiSafeArray(data.columns);
  data.rows = tbiSafeArray(data.rows);
}

function tbiRerenderComponent(win, schema, data) {
  const renderFunction = win[schema.renderFunction];

  if (typeof renderFunction === "function") {
    renderFunction(data);
  }
}

function tbiClearSelectionStyle(frame) {
  const doc = frame?.contentDocument;

  if (!doc) {
    return;
  }

  doc
    .querySelectorAll(".is-editor-selected")
    .forEach((element) => element.classList.remove("is-editor-selected"));
}

function tbiEscapeSelectorValue(value) {
  const rawValue = String(value ?? "");

  if (globalThis.CSS?.escape) {
    return CSS.escape(rawValue);
  }

  return rawValue.replace(/[\"']/g, "\\$&");
}

function tbiApplySelectionStyle(frame, state) {
  const doc = frame.contentDocument;

  if (!doc) {
    return;
  }

  tbiClearSelectionStyle(frame);

  if (state.selectedRowId) {
    doc
      .querySelectorAll(
        `[data-tb-row-id="${tbiEscapeSelectorValue(state.selectedRowId)}"]`
      )
      .forEach((element) => element.classList.add("is-editor-selected"));
  }

  if (state.selectedColumnId) {
    doc
      .querySelectorAll(
        `[data-tb-column-id="${tbiEscapeSelectorValue(state.selectedColumnId)}"]`
      )
      .forEach((element) => element.classList.add("is-editor-selected"));
  }

  if (state.selectedRowId && state.selectedCellColumnId) {
    const cell = doc.querySelector(
      `[data-tb-row-id="${tbiEscapeSelectorValue(state.selectedRowId)}"][data-tb-column-id="${tbiEscapeSelectorValue(state.selectedCellColumnId)}"]`
    );

    cell?.classList.add("is-editor-selected");
  }
}

function tbiCleanupFrameEvents(frame, state) {
  if (state?.boundDocument && state.frameClickHandler) {
    state.boundDocument.removeEventListener(
      "click",
      state.frameClickHandler
    );
  }

  if (state?.exportOwnerDocument && state.exportCaptureHandler) {
    state.exportOwnerDocument.removeEventListener(
      "click",
      state.exportCaptureHandler,
      true
    );
  }

  tbiClearSelectionStyle(frame);

  if (state) {
    state.boundDocument = null;
    state.frameClickHandler = null;
    state.exportOwnerDocument = null;
    state.exportCaptureHandler = null;
  }
}

function tbiAttachExportCleanup({ frame, state }) {
  const ownerDocument = frame.ownerDocument || document;

  if (
    state.exportOwnerDocument === ownerDocument &&
    state.exportCaptureHandler
  ) {
    return;
  }

  if (state.exportOwnerDocument && state.exportCaptureHandler) {
    state.exportOwnerDocument.removeEventListener(
      "click",
      state.exportCaptureHandler,
      true
    );
  }

  state.exportOwnerDocument = ownerDocument;
  state.exportCaptureHandler = (event) => {
    const target = event.target;
    const exportButton = target?.closest?.(
      "#exportDataBtn, #exportHtmlBtn, #exportPngBtn"
    );

    if (exportButton) {
      tbiClearSelectionStyle(frame);
    }
  };

  ownerDocument.addEventListener(
    "click",
    state.exportCaptureHandler,
    true
  );
}

function tbiCreateColumn(data) {
  const column = {
    id: tbiUid("col"),
    label: `Coluna ${data.columns.length + 1}`
  };

  data.columns.push(column);

  data.rows.forEach((row) => {
    row.cells ||= {};
    row.cells[column.id] = "";
  });

  return column;
}

function tbiCreateRow(data) {
  const row = {
    id: tbiUid("row"),
    cells: {}
  };

  data.columns.forEach((column) => {
    row.cells[column.id] = "";
  });

  data.rows.push(row);
  return row;
}

function tbiMoveItem(array, index, direction) {
  const nextIndex = index + direction;

  if (nextIndex < 0 || nextIndex >= array.length) {
    return;
  }

  const [item] = array.splice(index, 1);
  array.splice(nextIndex, 0, item);
}

function tbiBuildHero({ data, state, rerender, renderWorkspace }) {
  const hero = tbiElement("section", "tbi-hero");
  const top = tbiElement("div", "tbi-hero-top");
  const text = tbiElement("div");

  text.appendChild(tbiElement("span", "tbi-eyebrow", "C-06 • Construtor de tabela"));
  text.appendChild(tbiElement("h4", "", "Monte a estrutura visualmente"));
  text.appendChild(
    tbiElement(
      "p",
      "",
      "Crie colunas e linhas, depois clique em qualquer célula da arte para editar seu texto."
    )
  );

  top.appendChild(text);
  top.appendChild(
    tbiElement(
      "span",
      "tbi-count",
      `${data.columns.length}×${data.rows.length}`
    )
  );

  hero.appendChild(top);

  const actions = tbiElement("div", "tbi-quick-actions");

  actions.appendChild(
    tbiButton({
      label: "Coluna",
      icon: "+",
      onClick: () => {
        const column = tbiCreateColumn(data);
        state.selectedColumnId = column.id;
        state.openColumns[column.id] = true;
        state.openSections.structure = true;
        state.openSections.columns = true;
        rerender(true);
      }
    })
  );

  actions.appendChild(
    tbiButton({
      label: "Linha",
      icon: "+",
      disabled: !data.columns.length,
      onClick: () => {
        const row = tbiCreateRow(data);
        state.selectedRowId = row.id;
        state.selectedCellColumnId = data.columns[0]?.id ?? null;
        state.openRows[row.id] = true;
        state.openSections.structure = true;
        state.openSections.rows = true;
        rerender(true);
      }
    })
  );

  hero.appendChild(actions);
  return hero;
}

function tbiBuildSelectedCellCard({ data, state, rerender }) {
  const row = data.rows.find((item) => item.id === state.selectedRowId);
  const column = data.columns.find(
    (item) => item.id === state.selectedCellColumnId
  );

  if (!row || !column) {
    return null;
  }

  const { card } = tbiSectionCard("Célula selecionada", "Edição rápida");
  card.classList.add("tbi-cell-card");

  const context = tbiElement("div", "tbi-cell-context");
  context.appendChild(tbiElement("strong", "", column.label || "Coluna"));
  context.appendChild(
    tbiElement(
      "span",
      "",
      `Linha ${data.rows.findIndex((item) => item.id === row.id) + 1}`
    )
  );
  card.appendChild(context);

  card.appendChild(
    tbiField({
      label: "Texto da célula",
      value: row.cells?.[column.id] ?? "",
      multiline: true,
      onInput: (value) => {
        row.cells ||= {};
        row.cells[column.id] = value;
        rerender(false);
      }
    })
  );

  return card;
}

function tbiBuildColumnDetails({
  column,
  index,
  data,
  state,
  rerender,
  renderWorkspace
}) {
  const details = tbiDetails({
    title: column.label || `Coluna ${index + 1}`,
    subtitle: `Posição ${index + 1}`,
    open: Boolean(state.openColumns[column.id]),
    onToggle: (open) => {
      state.openColumns[column.id] = open;
    }
  });

  const body = tbiElement("div", "tbi-details-body");

  body.appendChild(
    tbiField({
      label: "Nome da coluna",
      value: column.label,
      onInput: (value) => {
        column.label = value;
        rerender(false);
      }
    })
  );

  const actions = tbiElement("div", "tbi-mini-actions");

  actions.appendChild(
    tbiButton({
      label: "←",
      title: "Mover para a esquerda",
      disabled: index === 0,
      onClick: () => {
        tbiMoveItem(data.columns, index, -1);
        rerender(true);
      }
    })
  );

  actions.appendChild(
    tbiButton({
      label: "→",
      title: "Mover para a direita",
      disabled: index === data.columns.length - 1,
      onClick: () => {
        tbiMoveItem(data.columns, index, 1);
        rerender(true);
      }
    })
  );

  actions.appendChild(
    tbiButton({
      label: "Duplicar",
      onClick: () => {
        const copy = {
          id: tbiUid("col"),
          label: `${column.label || "Coluna"} cópia`
        };

        data.columns.splice(index + 1, 0, copy);

        data.rows.forEach((row) => {
          row.cells ||= {};
          row.cells[copy.id] = row.cells[column.id] ?? "";
        });

        state.selectedColumnId = copy.id;
        state.openColumns[copy.id] = true;
        rerender(true);
      }
    })
  );

  actions.appendChild(
    tbiButton({
      label: "Excluir",
      className: "tbi-button tbi-button-danger",
      onClick: () => {
        data.columns.splice(index, 1);

        data.rows.forEach((row) => {
          if (row.cells) {
            delete row.cells[column.id];
          }
        });

        if (state.selectedColumnId === column.id) {
          state.selectedColumnId = data.columns[0]?.id ?? null;
        }

        if (state.selectedCellColumnId === column.id) {
          state.selectedCellColumnId = data.columns[0]?.id ?? null;
        }

        rerender(true);
      }
    })
  );

  body.appendChild(actions);
  details.appendChild(body);
  return details;
}

function tbiBuildRowDetails({
  row,
  index,
  data,
  state,
  rerender
}) {
  const firstColumn = data.columns[0];
  const firstValue = firstColumn
    ? row.cells?.[firstColumn.id] ?? ""
    : "";

  const details = tbiDetails({
    title: firstValue || `Linha ${index + 1}`,
    subtitle: `${data.columns.length} células`,
    open: Boolean(state.openRows[row.id]),
    onToggle: (open) => {
      state.openRows[row.id] = open;
    }
  });

  const body = tbiElement("div", "tbi-details-body");

  data.columns.forEach((column) => {
    body.appendChild(
      tbiField({
        label: column.label || "Coluna",
        value: row.cells?.[column.id] ?? "",
        multiline: true,
        onInput: (value) => {
          row.cells ||= {};
          row.cells[column.id] = value;
          state.selectedRowId = row.id;
          state.selectedCellColumnId = column.id;
          rerender(false);
        }
      })
    );
  });

  const actions = tbiElement("div", "tbi-mini-actions");

  actions.appendChild(
    tbiButton({
      label: "↑",
      title: "Mover para cima",
      disabled: index === 0,
      onClick: () => {
        tbiMoveItem(data.rows, index, -1);
        rerender(true);
      }
    })
  );

  actions.appendChild(
    tbiButton({
      label: "↓",
      title: "Mover para baixo",
      disabled: index === data.rows.length - 1,
      onClick: () => {
        tbiMoveItem(data.rows, index, 1);
        rerender(true);
      }
    })
  );

  actions.appendChild(
    tbiButton({
      label: "Duplicar",
      onClick: () => {
        const copy = {
          id: tbiUid("row"),
          cells: { ...row.cells }
        };

        data.rows.splice(index + 1, 0, copy);
        state.selectedRowId = copy.id;
        state.selectedCellColumnId = data.columns[0]?.id ?? null;
        state.openRows[copy.id] = true;
        rerender(true);
      }
    })
  );

  actions.appendChild(
    tbiButton({
      label: "Excluir",
      className: "tbi-button tbi-button-danger",
      onClick: () => {
        data.rows.splice(index, 1);

        if (state.selectedRowId === row.id) {
          state.selectedRowId = data.rows[0]?.id ?? null;
          state.selectedCellColumnId = data.columns[0]?.id ?? null;
        }

        rerender(true);
      }
    })
  );

  body.appendChild(actions);
  details.appendChild(body);
  return details;
}

function tbiBuildStructureCard({ data, state, rerender, renderWorkspace }) {
  const { card, head } = tbiSectionCard("Estrutura da tabela", "Linhas e colunas");

  head.appendChild(
    tbiElement(
      "span",
      "tbi-count",
      `${data.columns.length}×${data.rows.length}`
    )
  );

  const actions = tbiElement("div", "tbi-inline-actions");

  actions.appendChild(
    tbiButton({
      label: "+ Coluna",
      onClick: () => {
        const column = tbiCreateColumn(data);
        state.selectedColumnId = column.id;
        state.openColumns[column.id] = true;
        state.openSections.columns = true;
        rerender(true);
      }
    })
  );

  actions.appendChild(
    tbiButton({
      label: "+ Linha",
      disabled: !data.columns.length,
      onClick: () => {
        const row = tbiCreateRow(data);
        state.selectedRowId = row.id;
        state.selectedCellColumnId = data.columns[0]?.id ?? null;
        state.openRows[row.id] = true;
        state.openSections.rows = true;
        rerender(true);
      }
    })
  );

  card.appendChild(actions);

  const columnsDetails = tbiDetails({
    title: "Colunas",
    subtitle: `${data.columns.length} criadas`,
    open: state.openSections.columns,
    onToggle: (open) => {
      state.openSections.columns = open;
    }
  });

  const columnsBody = tbiElement("div", "tbi-details-body");
  const columnsList = tbiElement("div", "tbi-list");

  if (!data.columns.length) {
    columnsList.appendChild(
      tbiElement("div", "tbi-empty", "Nenhuma coluna criada.")
    );
  } else {
    data.columns.forEach((column, index) => {
      columnsList.appendChild(
        tbiBuildColumnDetails({
          column,
          index,
          data,
          state,
          rerender,
          renderWorkspace
        })
      );
    });
  }

  columnsBody.appendChild(columnsList);

  if (data.columns.length) {
    columnsBody.appendChild(
      tbiButton({
        label: "Excluir todas as colunas",
        className: "tbi-button tbi-button-danger",
        onClick: () => {
          if (!window.confirm("Excluir todas as colunas da tabela?")) {
            return;
          }

          data.columns = [];
          data.rows.forEach((row) => {
            row.cells = {};
          });
          state.selectedColumnId = null;
          state.selectedCellColumnId = null;
          rerender(true);
        }
      })
    );
  }

  columnsDetails.appendChild(columnsBody);
  card.appendChild(columnsDetails);

  const rowsDetails = tbiDetails({
    title: "Linhas",
    subtitle: `${data.rows.length} criadas`,
    open: state.openSections.rows,
    onToggle: (open) => {
      state.openSections.rows = open;
    }
  });

  const rowsBody = tbiElement("div", "tbi-details-body");
  const rowsList = tbiElement("div", "tbi-list");

  if (!data.rows.length) {
    rowsList.appendChild(
      tbiElement("div", "tbi-empty", "Nenhuma linha criada.")
    );
  } else {
    data.rows.forEach((row, index) => {
      rowsList.appendChild(
        tbiBuildRowDetails({
          row,
          index,
          data,
          state,
          rerender
        })
      );
    });
  }

  rowsBody.appendChild(rowsList);

  if (data.rows.length) {
    rowsBody.appendChild(
      tbiButton({
        label: "Excluir todas as linhas",
        className: "tbi-button tbi-button-danger",
        onClick: () => {
          if (!window.confirm("Excluir todas as linhas da tabela?")) {
            return;
          }

          data.rows = [];
          state.selectedRowId = null;
          state.selectedCellColumnId = null;
          rerender(true);
        }
      })
    );
  }

  rowsDetails.appendChild(rowsBody);
  card.appendChild(rowsDetails);

  return card;
}

function tbiBuildTextCard({ data, rerender }) {
  const { card } = tbiSectionCard("Texto do card", "Conteúdo editorial");

  [
    ["Kicker", "kicker"],
    ["Título", "title"],
    ["Subtítulo", "subtitle"],
    ["Rótulo da seção", "sectionLabel"],
    ["Título da seção", "sectionTitle"],
    ["Texto de apoio", "sectionText"],
    ["Leitura", "noteText", true],
    ["Fonte", "source"]
  ].forEach(([label, key, multiline]) => {
    card.appendChild(
      tbiField({
        label,
        value: data[key],
        multiline: Boolean(multiline),
        onInput: (value) => {
          data[key] = value;
          rerender(false);
        }
      })
    );
  });

  return card;
}

function tbiAttachFrameEvents({ frame, state, renderWorkspace }) {
  const doc = frame.contentDocument;

  if (!doc) {
    return;
  }

  if (state.boundDocument === doc && state.frameClickHandler) {
    tbiAttachExportCleanup({ frame, state });
    return;
  }

  if (state.boundDocument && state.frameClickHandler) {
    state.boundDocument.removeEventListener(
      "click",
      state.frameClickHandler
    );
  }

  state.boundDocument = doc;
  state.frameClickHandler = (event) => {
    const target = event.target;
    const cell = target?.closest?.(
      "td[data-tb-row-id][data-tb-column-id]"
    );

    if (cell) {
      state.selectedRowId = cell.dataset.tbRowId;
      state.selectedCellColumnId = cell.dataset.tbColumnId;
      state.selectedColumnId = cell.dataset.tbColumnId;
      state.openSections.structure = true;
      state.openSections.rows = true;
      state.openRows[state.selectedRowId] = true;
      renderWorkspace();
      tbiApplySelectionStyle(frame, state);
      return;
    }

    const header = target?.closest?.("th[data-tb-column-id]");

    if (header) {
      state.selectedColumnId = header.dataset.tbColumnId;
      state.selectedRowId = null;
      state.selectedCellColumnId = null;
      state.openSections.structure = true;
      state.openSections.columns = true;
      state.openColumns[state.selectedColumnId] = true;
      renderWorkspace();
      tbiApplySelectionStyle(frame, state);
    }
  };

  doc.addEventListener("click", state.frameClickHandler);
  tbiAttachExportCleanup({ frame, state });
}

function buildAdvancedTableBuilderInspector({
  form,
  frame,
  schema,
  currentValues
}) {
  ensureTableBuilderInspectorStyles();
  form.innerHTML = "";

  const win = frame.contentWindow;
  const data = win[schema.dataKey];

  if (!data) {
    form.innerHTML = "Dados não encontrados no componente.";
    return;
  }

  tbiNormalizeData(win, data);

  currentValues.__data = data;
  currentValues.__variableName = schema.dataKey;

  const state = tbiGetState(frame);

  if (
    state.selectedColumnId !== null &&
    !data.columns.some((column) => column.id === state.selectedColumnId)
  ) {
    state.selectedColumnId = null;
  }

  if (
    state.selectedRowId !== null &&
    !data.rows.some((row) => row.id === state.selectedRowId)
  ) {
    state.selectedRowId = null;
  }

  if (
    state.selectedCellColumnId !== null &&
    !data.columns.some((column) => column.id === state.selectedCellColumnId)
  ) {
    state.selectedCellColumnId = null;
  }

  const workspace = tbiElement("div", "tbi-shell");
  form.appendChild(workspace);

  const rerender = (refreshWorkspace = false) => {
    tbiRerenderComponent(win, schema, data);

    requestAnimationFrame(() => {
      tbiApplySelectionStyle(frame, state);
    });

    if (refreshWorkspace) {
      renderWorkspace();
    }
  };

  const renderWorkspace = () => {
    workspace.innerHTML = "";

    workspace.appendChild(
      tbiBuildHero({ data, state, rerender, renderWorkspace })
    );

    const selectedCellCard = tbiBuildSelectedCellCard({
      data,
      state,
      rerender
    });

    if (selectedCellCard) {
      workspace.appendChild(selectedCellCard);
    }

    workspace.appendChild(
      tbiWrapCardInCollapse({
        card: tbiBuildStructureCard({
          data,
          state,
          rerender,
          renderWorkspace
        }),
        state,
        sectionKey: "structure",
        defaultOpen: true
      })
    );

    workspace.appendChild(
      tbiWrapCardInCollapse({
        card: tbiBuildTextCard({ data, rerender }),
        state,
        sectionKey: "text",
        defaultOpen: false
      })
    );

    requestAnimationFrame(() => {
      tbiApplySelectionStyle(frame, state);
    });
  };

  state.renderWorkspace = renderWorkspace;
  state.rerender = rerender;

  tableBuilderActiveFrame = frame;

  tbiAttachFrameEvents({
    frame,
    state,
    renderWorkspace
  });

  renderWorkspace();
  rerender(false);
}

buildInspector = function buildInspectorWithTableBuilderMode(args) {
  if (args.schema.mode === "table-builder-advanced") {
    if (
      tableBuilderActiveFrame &&
      tableBuilderActiveFrame !== args.frame
    ) {
      tbiCleanupFrameEvents(
        tableBuilderActiveFrame,
        tbiGetState(tableBuilderActiveFrame)
      );
    }

    buildAdvancedTableBuilderInspector(args);
    return;
  }

  if (tableBuilderActiveFrame) {
    tbiCleanupFrameEvents(
      tableBuilderActiveFrame,
      tbiGetState(tableBuilderActiveFrame)
    );
    tableBuilderActiveFrame = null;
  }

  tableBuilderBaseBuildInspector(args);
};
