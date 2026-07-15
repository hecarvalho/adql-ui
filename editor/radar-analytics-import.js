/* ==========================================================
   ADQL EDITOR
   C-04 — RADAR PROFILE / IMPORTADOR ANALYTICS LAYER
========================================================== */

(function setupRadarAnalyticsImport() {
  if (window.__adqlRadarAnalyticsImportInstalled) {
    return;
  }

  window.__adqlRadarAnalyticsImportInstalled = true;

  const radarAnalyticsBaseBuildInspector = buildInspector;

  function raiElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== "") {
      element.textContent = text;
    }

    return element;
  }

  function raiNumber(value, fallback = 0) {
    const parsed = Number(
      String(value ?? "")
        .trim()
        .replace(",", ".")
    );

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function raiClamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function raiSafeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function raiSetStatus(card, message, type = "info") {
    const status = card.querySelector("[data-rai-status]");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.raiStatus = type;
  }

  function ensureRadarAnalyticsImportStyles() {
    if (document.getElementById("radarAnalyticsImportStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "radarAnalyticsImportStyles";
    style.textContent = `
      .rai-card {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid rgba(197,139,18,.36);
        border-radius: 14px;
        background:
          linear-gradient(180deg, rgba(197,139,18,.08), rgba(255,253,248,.96));
        box-shadow: 0 10px 24px rgba(7,31,61,.08);
      }

      .rai-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .rai-card-title {
        display: grid;
        gap: 3px;
      }

      .rai-eyebrow {
        color: #c58b12;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      .rai-card h4 {
        margin: 0;
        color: #071f3d;
        font-size: 15px;
        font-weight: 900;
        line-height: 1.1;
      }

      .rai-badge {
        flex: 0 0 auto;
        padding: 6px 8px;
        border-radius: 999px;
        background: rgba(7,31,61,.08);
        color: #071f3d;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .rai-help {
        color: #5f5a4f;
        font-size: 11px;
        line-height: 1.45;
      }

      .rai-actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .rai-button {
        min-height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 9px 11px;
        border: 1px solid #c58b12;
        border-radius: 10px;
        background: #c58b12;
        color: #071f3d;
        font: inherit;
        font-size: 12px;
        font-weight: 900;
        cursor: pointer;
        transition: 150ms ease;
      }

      .rai-button:hover {
        transform: translateY(-1px);
        filter: brightness(1.02);
      }

      .rai-file {
        display: none;
      }

      .rai-status {
        min-height: 18px;
        padding: 8px 10px;
        border-radius: 9px;
        background: rgba(7,31,61,.06);
        color: #6f7680;
        font-size: 10px;
        font-weight: 800;
        line-height: 1.35;
      }

      .rai-status[data-rai-status="success"] {
        background: rgba(34,104,70,.09);
        color: #236847;
      }

      .rai-status[data-rai-status="error"] {
        background: rgba(145,41,41,.08);
        color: #8d2b2b;
      }
    `;

    document.head.appendChild(style);
  }

  function raiCreateInput(card, args) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.className = "rai-file";

    input.addEventListener("change", () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.addEventListener("load", () => {
        try {
          const payload = JSON.parse(String(reader.result ?? ""));
          raiApplyPayload(args, payload);
          raiSetStatus(
            card,
            `Importado: ${file.name}`,
            "success"
          );
          renderRadarInspectorWithAnalytics(args);
        } catch (error) {
          raiSetStatus(
            card,
            error?.message || "Não foi possível importar o JSON.",
            "error"
          );
        } finally {
          input.value = "";
        }
      });

      reader.addEventListener("error", () => {
        raiSetStatus(
          card,
          "Falha ao ler o arquivo selecionado.",
          "error"
        );
        input.value = "";
      });

      reader.readAsText(file, "utf-8");
    });

    return input;
  }

  function raiNormalizeMetric(metric, index, scaleMax) {
    const label = String(
      metric?.label ??
      metric?.name ??
      metric?.metric ??
      `Métrica ${index + 1}`
    );

    const homeValue = raiNumber(
      metric?.home ??
      metric?.value ??
      metric?.score ??
      metric?.entityValue,
      0
    );

    const fallbackReference = Math.round(scaleMax * 0.5);
    const awayValue = raiNumber(
      metric?.away ??
      metric?.referenceValue ??
      metric?.benchmark ??
      metric?.comparisonValue,
      fallbackReference
    );

    return {
      label,
      home: Math.round(raiClamp(homeValue, 0, scaleMax)),
      away: Math.round(raiClamp(awayValue, 0, scaleMax))
    };
  }

  function raiBuildCards(payload, metrics, scaleMax) {
    const externalCards = raiSafeArray(payload?.data?.cards || payload?.cards);

    if (externalCards.length) {
      return externalCards.map((card, index) => ({
        label: String(card?.label ?? `Destaque ${index + 1}`),
        value: String(card?.value ?? ""),
        text: String(card?.text ?? card?.description ?? "")
      }));
    }

    const bestMetric = [...metrics].sort((a, b) => b.home - a.home)[0];
    const average = metrics.length
      ? Math.round(
          metrics.reduce((sum, metric) => sum + raiNumber(metric.home, 0), 0) /
          metrics.length
        )
      : 0;

    return [
      {
        label: "Métricas",
        value: String(metrics.length),
        text: `Radar importado do Analytics Layer em escala 0-${scaleMax}.`
      },
      {
        label: "Média",
        value: String(average),
        text: "Média simples dos valores importados."
      },
      {
        label: "Maior eixo",
        value: bestMetric?.label ?? "—",
        text: bestMetric
          ? `Valor ${bestMetric.home} no eixo ${bestMetric.label}.`
          : "Nenhuma métrica importada."
      }
    ];
  }

  function raiPayloadToRadarData(currentData, payload) {
    const sourceData = payload?.data && typeof payload.data === "object"
      ? payload.data
      : payload;

    const scaleMax = Math.max(
      1,
      raiNumber(
        sourceData?.scaleMax ??
        sourceData?.maxValue ??
        payload?.scaleMax ??
        payload?.maxValue,
        currentData?.maxValue ?? 100
      )
    );

    const rawMetrics = raiSafeArray(sourceData?.metrics || payload?.metrics);

    if (!rawMetrics.length) {
      throw new Error("O JSON não contém métricas para o C-04.");
    }

    const metrics = rawMetrics.map((metric, index) =>
      raiNormalizeMetric(metric, index, scaleMax)
    );

    const entityName = String(
      sourceData?.entity ??
      sourceData?.home ??
      sourceData?.team ??
      payload?.entity ??
      currentData?.home ??
      "Entidade"
    );

    const referenceName = String(
      sourceData?.reference ??
      sourceData?.away ??
      sourceData?.benchmarkLabel ??
      currentData?.away ??
      "Referência"
    );

    const title = String(
      payload?.title ??
      sourceData?.title ??
      currentData?.title ??
      "Perfil de desempenho"
    );

    const subtitle = String(
      payload?.subtitle ??
      sourceData?.subtitle ??
      currentData?.subtitle ??
      "Radar importado do Analytics Layer"
    );

    return {
      ...currentData,
      title,
      subtitle,
      home: entityName,
      away: referenceName,
      maxValue: scaleMax,
      metrics,
      cards: raiBuildCards(payload, metrics, scaleMax),
      readingTitle: currentData?.readingTitle || "Leitura do radar",
      readingText:
        payload?.description ||
        sourceData?.description ||
        currentData?.readingText ||
        "Radar gerado a partir de dados tratados na camada Analytics. Ajuste a leitura manualmente conforme o contexto da análise.",
      keyText:
        currentData?.keyText ||
        `Valores normalizados em escala 0-${scaleMax}.`,
      source:
        sourceData?.source ||
        payload?.source ||
        currentData?.source ||
        "ADQL Analytics Layer"
    };
  }

  function raiApplyPayload(args, payload) {
    const win = args.frame?.contentWindow;
    const schema = args.schema;
    const data = win?.[schema.dataKey];

    if (!win || !schema || !data) {
      throw new Error("Dados do componente C-04 não encontrados.");
    }

    const schemaVersion = String(
      payload?.schemaVersion ??
      payload?.schema_version ??
      ""
    );

    const component = String(payload?.component ?? "").toUpperCase();

    if (
      schemaVersion &&
      schemaVersion !== "adql.c04.radar.v1" &&
      !schemaVersion.includes("c04")
    ) {
      throw new Error(
        `Schema incompatível para C-04: ${schemaVersion}`
      );
    }

    if (component && component !== "C-04" && component !== "RADAR") {
      throw new Error(
        `Componente incompatível para C-04: ${component}`
      );
    }

    const normalizedData = raiPayloadToRadarData(data, payload);
    Object.assign(data, normalizedData);

    if (args.currentValues) {
      args.currentValues.__data = data;
      args.currentValues.__variableName = schema.dataKey;
    }

    const renderFunction = win[schema.renderFunction];

    if (typeof renderFunction === "function") {
      renderFunction(data);
    }
  }

  function raiBuildImportCard(args) {
    const card = raiElement("section", "rai-card");
    card.id = "radarAnalyticsImportCard";

    const head = raiElement("div", "rai-card-head");
    const title = raiElement("div", "rai-card-title");
    title.appendChild(
      raiElement("span", "rai-eyebrow", "Analytics Layer")
    );
    title.appendChild(
      raiElement("h4", "", "Importar JSON")
    );
    head.appendChild(title);
    head.appendChild(
      raiElement("span", "rai-badge", "C-04")
    );
    card.appendChild(head);

    card.appendChild(
      raiElement(
        "p",
        "rai-help",
        "Importe arquivos gerados em analytics/outputs, como c04_radar_example.json. O radar continua editável depois da importação."
      )
    );

    const actions = raiElement("div", "rai-actions");
    const input = raiCreateInput(card, args);
    const button = raiElement("button", "rai-button", "Selecionar JSON");
    button.type = "button";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      input.click();
    });

    actions.appendChild(button);
    actions.appendChild(input);
    card.appendChild(actions);

    const status = raiElement(
      "div",
      "rai-status",
      "Aguardando arquivo JSON do Analytics Layer."
    );
    status.dataset.raiStatus = "info";
    card.appendChild(status);

    return card;
  }

  function raiInsertImportCard(args) {
    ensureRadarAnalyticsImportStyles();

    const form = args.form;

    if (!form || form.querySelector("#radarAnalyticsImportCard")) {
      return;
    }

    const shell = form.querySelector(".ri-shell");
    const card = raiBuildImportCard(args);

    if (shell) {
      form.insertBefore(card, shell);
    } else {
      form.prepend(card);
    }
  }

  function renderRadarInspectorWithAnalytics(args) {
    radarAnalyticsBaseBuildInspector(args);
    raiInsertImportCard(args);
  }

  buildInspector = function buildInspectorWithRadarAnalyticsImport(args) {
    if (args?.schema?.mode === "radar-advanced") {
      renderRadarInspectorWithAnalytics(args);
      return;
    }

    radarAnalyticsBaseBuildInspector(args);
  };
})();
