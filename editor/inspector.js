const editorSchemas = {
  "match-comparison": {
    mode: "data",
    dataKey: "comparisonData",
    renderFunction: "renderComparison"
  },

  "insight-card": {
    mode: "dom",
    fields: [
      { type: "section", label: "Insight principal" },
      { key: "insightCategory", label: "Categoria", selector: "#insightCategory", type: "input" },
      { key: "mainValue", label: "Valor principal", selector: "#mainValue", type: "input" },
      { key: "mainUnit", label: "Unidade", selector: "#mainUnit", type: "input" },
      { key: "mainStatement", label: "Frase principal", selector: "#mainStatement", type: "input" },
      { key: "mainInsight", label: "Insight", selector: "#mainInsight", type: "textarea" },
      { key: "supportingText", label: "Texto de apoio", selector: "#supportingText", type: "textarea" },
      { type: "section", label: "Leitura" },
      { key: "readingText", label: "Leitura", selector: "#readingText", type: "textarea" },
      { key: "sourceText", label: "Fonte", selector: "#sourceText", type: "input" }
    ]
  },

  "tactical-pitch": {
    mode: "dom",
    fields: [
      { type: "section", label: "Cabeçalho" },
      { key: "pitchTitle", label: "Título", selector: "#pitchTitle", type: "input" },
      { key: "pitchSubtitle", label: "Subtítulo", selector: "#pitchSubtitle", type: "input" },
      { type: "section", label: "Leitura" },
      { key: "readingText", label: "Leitura tática", selector: "#readingText", type: "textarea" },
      { key: "sourceText", label: "Fonte", selector: "#sourceText", type: "input" }
    ]
  },

  "radar-profile": {
    mode: "dom",
    fields: [
      { type: "section", label: "Cabeçalho" },
      { key: "radarTitle", label: "Título", selector: "#radarTitle", type: "input" },
      { key: "radarSubtitle", label: "Subtítulo", selector: "#radarSubtitle", type: "input" },
      { type: "section", label: "Leitura" },
      { key: "radarReadingTitle", label: "Título da leitura", selector: "#radarReadingTitle", type: "input" },
      { key: "radarReadingText", label: "Texto da leitura", selector: "#radarReadingText", type: "textarea" },
      { key: "radarKeyText", label: "Ponto-chave", selector: "#radarKeyText", type: "textarea" },
      { key: "sourceText", label: "Fonte", selector: "#sourceText", type: "input" }
    ]
  }
};

function getSchema(componentId) {
  return editorSchemas[componentId] || {
    mode: "dom",
    fields: []
  };
}

function createSection(label) {
  const section = document.createElement("div");
  section.className = "field-section";
  section.textContent = label;
  return section;
}

function createField({ label, value, type = "input", onInput }) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const labelEl = document.createElement("label");
  labelEl.textContent = label;

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

function numberFromInput(value) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function rerenderDataComponent(win, schema, data) {
  const renderFunction = win[schema.renderFunction];

  if (typeof renderFunction === "function") {
    renderFunction(data);
  } else {
    console.warn("Função de renderização não encontrada:", schema.renderFunction);
  }
}

function buildDataInspector({ form, frame, schema, currentValues }) {
  const win = frame.contentWindow;
  const data = win[schema.dataKey];

  if (!data) {
    form.innerHTML = `
      <p class="empty-state">
        Dados não encontrados no componente.
      </p>
    `;
    return;
  }

  currentValues.__data = data;
  currentValues.__variableName = schema.dataKey;

  form.appendChild(createSection("Informações gerais"));

  form.appendChild(
    createField({
      label: "Time A",
      value: data.home.name,
      onInput: (value) => {
        data.home.name = value;
        rerenderDataComponent(win, schema, data);
      }
    })
  );

  form.appendChild(
    createField({
      label: "Time B",
      value: data.away.name,
      onInput: (value) => {
        data.away.name = value;
        rerenderDataComponent(win, schema, data);
      }
    })
  );

  form.appendChild(
    createField({
      label: "Subtítulo",
      value: data.subtitle,
      onInput: (value) => {
        data.subtitle = value;
        rerenderDataComponent(win, schema, data);
      }
    })
  );

  form.appendChild(
    createField({
      label: "Versão",
      value: data.version,
      onInput: (value) => {
        data.version = value;
        rerenderDataComponent(win, schema, data);
      }
    })
  );

  form.appendChild(createSection("Métricas"));

  data.metrics.forEach((metric) => {
    form.appendChild(createSection(metric.label));

    form.appendChild(
      createField({
        label: data.home.name,
        value: metric.home,
        onInput: (value) => {
          metric.home = numberFromInput(value);
          rerenderDataComponent(win, schema, data);
        }
      })
    );

    form.appendChild(
      createField({
        label: data.away.name,
        value: metric.away,
        onInput: (value) => {
          metric.away = numberFromInput(value);
          rerenderDataComponent(win, schema, data);
        }
      })
    );

    form.appendChild(
      createField({
        label: "Nome da métrica",
        value: metric.label,
        onInput: (value) => {
          metric.label = value;
          rerenderDataComponent(win, schema, data);
        }
      })
    );
  });

  form.appendChild(createSection("Rodapé"));

  form.appendChild(
    createField({
      label: "Fonte",
      value: data.source,
      onInput: (value) => {
        data.source = value;
        rerenderDataComponent(win, schema, data);
      }
    })
  );
}

function updatePreviewField(frame, field, value) {
  const doc = frame.contentDocument;
  const target = doc.querySelector(field.selector);

  if (target) {
    target.textContent = value;
  }
}

function buildDomInspector({ form, frame, fields, currentValues, onUpdate }) {
  const doc = frame.contentDocument;

  fields.forEach((field) => {
    if (field.type === "section") {
      form.appendChild(createSection(field.label));
      return;
    }

    const target = doc.querySelector(field.selector);
    const value = target ? target.textContent.trim() : "";

    currentValues[field.key] = value;

    form.appendChild(
      createField({
        label: field.label,
        value,
        type: field.type,
        onInput: (newValue) => {
          currentValues[field.key] = newValue;
          updatePreviewField(frame, field, newValue);

          if (typeof onUpdate === "function") {
            onUpdate(field, newValue);
          }
        }
      })
    );
  });
}

function buildInspector({ form, frame, schema, currentValues, onUpdate }) {
  form.innerHTML = "";

  if (schema.mode === "data") {
    buildDataInspector({
      form,
      frame,
      schema,
      currentValues
    });

    return;
  }

  buildDomInspector({
    form,
    frame,
    fields: schema.fields || [],
    currentValues,
    onUpdate
  });
}