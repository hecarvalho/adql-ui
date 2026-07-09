const list = document.getElementById("componentsList");
const frame = document.getElementById("previewFrame");
const title = document.getElementById("componentTitle");
const code = document.getElementById("componentCode");
const form = document.getElementById("formFields");

const exportDataBtn = document.getElementById("exportDataBtn");
const exportHtmlBtn = document.getElementById("exportHtmlBtn");
const exportPngBtn = document.getElementById("exportPngBtn");

let activeComponent = null;
let activeSchema = null;
let currentValues = {};

componentsRegistry.forEach((component) => {
  const item = document.createElement("div");
  item.className = "component-item";

  item.innerHTML = `
    <strong>${component.code}</strong>
    <span>${component.name}</span>
  `;

  item.onclick = () => selectComponent(component, item);

  list.appendChild(item);
});

function selectComponent(component, item) {
  document
    .querySelectorAll(".component-item")
    .forEach((el) => el.classList.remove("active"));

  item.classList.add("active");

  activeComponent = component;
  activeSchema = getSchema(component.id);
  currentValues = {};

  title.innerText = component.name;
  code.innerText = component.code;

  enableExportButtons();

  frame.src = `${component.htmlPath}?v=${Date.now()}`;

  frame.onload = async () => {
    const doc = frame.contentDocument;

    await waitFonts(document);
    await waitFonts(doc);

    await new Promise((resolve) => setTimeout(resolve, 300));

    buildInspector({
      form,
      frame,
      schema: activeSchema,
      currentValues,
      onUpdate: () => {}
    });
  };
}

function enableExportButtons() {
  exportDataBtn.disabled = false;
  exportHtmlBtn.disabled = false;
  exportPngBtn.disabled = false;
}

exportDataBtn.onclick = () => {
  exportDataFile(activeComponent, currentValues);
};

exportHtmlBtn.onclick = () => {
  exportHtmlFile(activeComponent, frame);
};

exportPngBtn.onclick = () => {
  exportPngFile(activeComponent, frame);
};