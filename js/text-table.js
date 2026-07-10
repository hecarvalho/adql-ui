/* ==========================================================
   ADQL UI
   C-06 — TABLE BUILDER
========================================================== */

function tbUid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function tbSafeArray(value) {
  return Array.isArray(value) ? value : [];
}

function tbSetText(id, value) {
  const target = document.getElementById(id);

  if (target) {
    target.textContent = value ?? "";
  }
}

function tbNormalizeData(data) {
  data.kicker ??= "Tabela comparativa";
  data.title ??= "Tabela de dados";
  data.subtitle ??= "";
  data.code ??= "C-06";
  data.sectionLabel ??= "Dados";
  data.sectionTitle ??= "Tabela de comparação";
  data.sectionText ??= "";
  data.noteText ??= "";
  data.source ??= "";

  data.columns = tbSafeArray(data.columns);
  data.rows = tbSafeArray(data.rows);

  data.columns.forEach((column, index) => {
    column.id ||= tbUid(`col-${index + 1}`);
    column.label ??= `Coluna ${index + 1}`;
  });

  const validColumnIds = new Set(
    data.columns.map((column) => column.id)
  );

  data.rows.forEach((row, index) => {
    row.id ||= tbUid(`row-${index + 1}`);
    row.cells = row.cells && typeof row.cells === "object"
      ? row.cells
      : {};

    Object.keys(row.cells).forEach((columnId) => {
      if (!validColumnIds.has(columnId)) {
        delete row.cells[columnId];
      }
    });

    data.columns.forEach((column) => {
      row.cells[column.id] ??= "";
    });
  });
}

function tbGetSizing(columnsCount) {
  if (columnsCount <= 3) {
    return { font: 21, padY: 20, padX: 20 };
  }

  if (columnsCount <= 5) {
    return { font: 18, padY: 18, padX: 16 };
  }

  if (columnsCount <= 7) {
    return { font: 15, padY: 15, padX: 12 };
  }

  if (columnsCount <= 9) {
    return { font: 13, padY: 13, padX: 9 };
  }

  return { font: 11, padY: 11, padX: 7 };
}

function tbCreateEmptyState(message) {
  const empty = document.createElement("div");
  empty.className = "tb-empty-state";
  empty.textContent = message;
  return empty;
}

function tbCreateTable(data) {
  const table = document.createElement("table");
  table.className = "tb-table";
  table.setAttribute("aria-label", data.sectionTitle || "Tabela de dados");

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  data.columns.forEach((column) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.dataset.tbColumnId = column.id;
    th.textContent = column.label ?? "";
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  data.rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.dataset.tbRowId = row.id;

    data.columns.forEach((column) => {
      const td = document.createElement("td");
      td.dataset.tbRowId = row.id;
      td.dataset.tbColumnId = column.id;
      td.textContent = row.cells?.[column.id] ?? "";
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  return table;
}

function renderTextTable(data = window.tableBuilderData) {
  if (!data) {
    return;
  }

  tbNormalizeData(data);

  tbSetText("tbKicker", data.kicker);
  tbSetText("tbTitle", data.title);
  tbSetText("tbSubtitle", data.subtitle);
  tbSetText("tbCode", data.code);
  tbSetText("tbSectionLabel", data.sectionLabel);
  tbSetText("tbSectionTitle", data.sectionTitle);
  tbSetText("tbSectionText", data.sectionText);
  tbSetText("tbNoteText", data.noteText);
  tbSetText("tbSourceText", data.source);

  const noteBlock = document.getElementById("tbNoteBlock");

  if (noteBlock) {
    noteBlock.hidden = !String(data.noteText ?? "").trim();
  }

  const poster = document.querySelector(".tb-poster");

  if (poster) {
    const sizing = tbGetSizing(data.columns.length);
    poster.style.setProperty("--tb-cell-font", `${sizing.font}px`);
    poster.style.setProperty("--tb-cell-pad-y", `${sizing.padY}px`);
    poster.style.setProperty("--tb-cell-pad-x", `${sizing.padX}px`);
  }

  const mount = document.getElementById("tbTableMount");

  if (!mount) {
    return;
  }

  mount.innerHTML = "";

  if (!data.columns.length) {
    mount.appendChild(
      tbCreateEmptyState("Adicione uma coluna para começar a construir a tabela.")
    );
  } else if (!data.rows.length) {
    mount.appendChild(
      tbCreateEmptyState("A estrutura está pronta. Adicione uma linha para preencher a tabela.")
    );
  } else {
    mount.appendChild(tbCreateTable(data));
  }

  window.dispatchEvent(
    new CustomEvent("adql:table-rendered", {
      detail: { data }
    })
  );
}

window.tableBuilderData = tableBuilderData;
window.renderTextTable = renderTextTable;
window.tbNormalizeData = tbNormalizeData;
window.tbUid = tbUid;

renderTextTable(tableBuilderData);
