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
      {
        key: "insightCategory",
        label: "Categoria",
        selector: "#insightCategory",
        dataPath: "category",
        type: "input"
      },
      {
        key: "mainValue",
        label: "Valor principal",
        selector: "#mainValue",
        dataPath: "mainValue",
        type: "input"
      },
      {
        key: "mainUnit",
        label: "Unidade",
        selector: "#mainUnit",
        dataPath: "mainUnit",
        type: "input"
      },
      {
        key: "mainStatement",
        label: "Frase principal",
        selector: "#mainStatement",
        dataPath: "mainStatement",
        type: "input"
      },
      {
        key: "mainInsight",
        label: "Insight",
        selector: "#mainInsight",
        dataPath: "mainInsight",
        type: "textarea"
      },
      {
        key: "supportingText",
        label: "Texto de apoio",
        selector: "#supportingText",
        dataPath: "supportingText",
        type: "textarea"
      },

      { type: "section", label: "Comparação direta" },
      {
        key: "comparisonSubtitle",
        label: "Descrição da comparação",
        selector: ".ic-comparison-heading p",
        dataPath: "comparisonSubtitle",
        type: "input"
      },

      { type: "section", label: "Equipe esquerda" },
      {
        key: "homeTeam",
        label: "Nome da equipe",
        selector: "#homeTeam",
        dataPath: "home.team",
        type: "input"
      },
      {
        key: "homeShots",
        label: "Finalizações",
        selector: "#homeShots",
        dataPath: "home.shots",
        type: "input"
      },
      {
        key: "homeXg",
        label: "xG",
        selector: "#homeXg",
        dataPath: "home.xg",
        type: "input"
      },
      {
        key: "homeReading",
        label: "Texto de apoio",
        selector:
          ".ic-team-block:not(.ic-team-block-away) .ic-team-reading",
        dataPath: "home.reading",
        type: "textarea"
      },

      { type: "section", label: "Equipe direita" },
      {
        key: "awayTeam",
        label: "Nome da equipe",
        selector: "#awayTeam",
        dataPath: "away.team",
        type: "input"
      },
      {
        key: "awayShots",
        label: "Finalizações",
        selector: "#awayShots",
        dataPath: "away.shots",
        type: "input"
      },
      {
        key: "awayXg",
        label: "xG",
        selector: "#awayXg",
        dataPath: "away.xg",
        type: "input"
      },
      {
        key: "awayReading",
        label: "Texto de apoio",
        selector: ".ic-team-block-away .ic-team-reading",
        dataPath: "away.reading",
        type: "textarea"
      },

      { type: "section", label: "Leitura" },
      {
        key: "readingText",
        label: "Leitura",
        selector: "#readingText",
        dataPath: "reading",
        type: "textarea"
      },
      {
        key: "sourceText",
        label: "Fonte",
        selector: "#sourceText",
        dataPath: "source",
        type: "input"
      }
    ]
  },

  "tactical-pitch": {
    mode: "dom",
    fields: [
      { type: "section", label: "Cabeçalho" },
      {
        key: "pitchTitle",
        label: "Título",
        selector: "#pitchTitle",
        type: "input"
      },
      {
        key: "pitchSubtitle",
        label: "Subtítulo",
        selector: "#pitchSubtitle",
        type: "input"
      },
      { type: "section", label: "Leitura" },
      {
        key: "readingText",
        label: "Leitura tática",
        selector: "#readingText",
        type: "textarea"
      },
      {
        key: "sourceText",
        label: "Fonte",
        selector: "#sourceText",
        type: "input"
      }
    ]
  },

  "radar-profile": {
    mode: "dom",
    fields: [
      { type: "section", label: "Cabeçalho" },
      {
        key: "radarTitle",
        label: "Título",
        selector: "#radarTitle",
        type: "input"
      },
      {
        key: "radarSubtitle",
        label: "Subtítulo",
        selector: "#radarSubtitle",
        type: "input"
      },
      { type: "section", label: "Leitura" },
      {
        key: "radarReadingTitle",
        label: "Título da leitura",
        selector: "#radarReadingTitle",
        type: "input"
      },
      {
        key: "radarReadingText",
        label: "Texto da leitura",
        selector: "#radarReadingText",
        type: "textarea"
      },
      {
        key: "radarKeyText",
        label: "Ponto-chave",
        selector: "#radarKeyText",
        type: "textarea"
      },
      {
        key: "sourceText",
        label: "Fonte",
        selector: "#sourceText",
        type: "input"
      }
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

function createField({
  label,
  value,
  type = "input",
  onInput
}) {
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

function rerenderDataComponent(
  win,
  schema,
  data
) {
  const renderFunction =
    win[schema.renderFunction];

  if (typeof renderFunction === "function") {
    renderFunction(data);
  } else {
    console.warn(
      "Função de renderização não encontrada:",
      schema.renderFunction
    );
  }
}

function buildDataInspector({
  form,
  frame,
  schema,
  currentValues
}) {
  const win = frame.contentWindow;
  const data = win[schema.dataKey];

  if (!data) {
    form.innerHTML =
      `Dados não encontrados no componente.`;

    return;
  }

  currentValues.__data = data;
  currentValues.__variableName =
    schema.dataKey;

  form.appendChild(
    createSection("Informações gerais")
  );

  form.appendChild(
    createField({
      label: "Título",
      value: data.title,
      onInput: (value) => {
        data.title = value;

        rerenderDataComponent(
          win,
          schema,
          data
        );
      }
    })
  );

  form.appendChild(
    createField({
      label: "Time A",
      value: data.home.name,
      onInput: (value) => {
        data.home.name = value;

        rerenderDataComponent(
          win,
          schema,
          data
        );
      }
    })
  );

  form.appendChild(
    createField({
      label: "Time B",
      value: data.away.name,
      onInput: (value) => {
        data.away.name = value;

        rerenderDataComponent(
          win,
          schema,
          data
        );
      }
    })
  );

  form.appendChild(
    createField({
      label: "Subtítulo",
      value: data.subtitle,
      onInput: (value) => {
        data.subtitle = value;

        rerenderDataComponent(
          win,
          schema,
          data
        );
      }
    })
  );

  form.appendChild(
    createField({
      label: "Versão",
      value: data.version,
      onInput: (value) => {
        data.version = value;

        rerenderDataComponent(
          win,
          schema,
          data
        );
      }
    })
  );

  form.appendChild(
    createSection("Métricas")
  );

  const metrics = Array.isArray(data.metrics)
    ? data.metrics
    : [];

  metrics.forEach((metric) => {
    form.appendChild(
      createSection(metric.label)
    );

    form.appendChild(
      createField({
        label: data.home.name,
        value: metric.home,
        onInput: (value) => {
          const parsed = numberFromInput(value);

          if (parsed === null) {
            return;
          }

          metric.home = parsed;

          rerenderDataComponent(
            win,
            schema,
            data
          );
        }
      })
    );

    form.appendChild(
      createField({
        label: data.away.name,
        value: metric.away,
        onInput: (value) => {
          const parsed = numberFromInput(value);

          if (parsed === null) {
            return;
          }

          metric.away = parsed;

          rerenderDataComponent(
            win,
            schema,
            data
          );
        }
      })
    );

    form.appendChild(
      createField({
        label: "Nome da métrica",
        value: metric.label,
        onInput: (value) => {
          metric.label = value;

          rerenderDataComponent(
            win,
            schema,
            data
          );
        }
      })
    );
  });

  form.appendChild(
    createSection("Rodapé")
  );

  form.appendChild(
    createField({
      label: "Fonte",
      value: data.source,
      onInput: (value) => {
        data.source = value;

        rerenderDataComponent(
          win,
          schema,
          data
        );
      }
    })
  );
}

function setNestedObjectValue(
  target,
  path,
  value
) {
  if (!target || !path) {
    return;
  }

  const parts = String(path)
    .split(".")
    .filter(Boolean);

  if (!parts.length) {
    return;
  }

  let cursor = target;

  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];

    if (
      !cursor[key] ||
      typeof cursor[key] !== "object"
    ) {
      cursor[key] = {};
    }

    cursor = cursor[key];
  }

  cursor[parts[parts.length - 1]] = value;
}

function syncDomFieldData(
  frame,
  field,
  value
) {
  if (!field.dataPath) {
    return;
  }

  const data = frame.contentWindow?.insight;

  setNestedObjectValue(
    data,
    field.dataPath,
    value
  );
}

function updatePreviewField(
  frame,
  field,
  value
) {
  const doc = frame.contentDocument;
  const target =
    doc.querySelector(field.selector);

  if (target) {
    target.textContent = value;
  }
}

function runDomComponentHooks(frame) {
  const win = frame.contentWindow;

  if (
    typeof win.updateInsightVisuals ===
    "function"
  ) {
    win.updateInsightVisuals();
  }
}

function buildDomInspector({
  form,
  frame,
  fields,
  currentValues,
  onUpdate
}) {
  const doc = frame.contentDocument;

  fields.forEach((field) => {
    if (field.type === "section") {
      form.appendChild(
        createSection(field.label)
      );

      return;
    }

    const target =
      doc.querySelector(field.selector);

    const value = target
      ? target.textContent.trim()
      : "";

    currentValues[field.key] = value;

    form.appendChild(
      createField({
        label: field.label,
        value,
        type: field.type,

        onInput: (newValue) => {
          currentValues[field.key] =
            newValue;

          syncDomFieldData(
            frame,
            field,
            newValue
          );

          updatePreviewField(
            frame,
            field,
            newValue
          );

          runDomComponentHooks(frame);

          if (
            typeof onUpdate === "function"
          ) {
            onUpdate(field, newValue);
          }
        }
      })
    );
  });
}

function buildInspector({
  form,
  frame,
  schema,
  currentValues,
  onUpdate
}) {
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
