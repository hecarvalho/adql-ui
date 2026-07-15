/* ==========================================================
   ADQL EDITOR
   C-05 — PLAYER COMPARISON / IMPORTADOR ANALYTICS LAYER
========================================================== */

(function setupPlayerComparisonAnalyticsImport() {
  if (window.__adqlPlayerComparisonAnalyticsImportInstalled) {
    return;
  }

  window.__adqlPlayerComparisonAnalyticsImportInstalled = true;

  const playerComparisonAnalyticsBaseBuildInspector = buildInspector;

  function pcaiElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== "") {
      element.textContent = text;
    }

    return element;
  }

  function pcaiNumber(value, fallback = 0) {
    const parsed = Number(
      String(value ?? "")
        .trim()
        .replace(",", ".")
    );

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function pcaiClamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function pcaiSafeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function pcaiUid(prefix, index = 0) {
    return `${prefix}-${Date.now().toString(36)}-${index}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  }

  function pcaiSetStatus(card, message, type = "info") {
    const status = card.querySelector("[data-pcai-status]");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.pcaiStatus = type;
  }

  function ensurePlayerComparisonAnalyticsImportStyles() {
    if (document.getElementById("playerComparisonAnalyticsImportStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "playerComparisonAnalyticsImportStyles";
    style.textContent = `
      .pcai-card {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid rgba(197,139,18,.36);
        border-radius: 14px;
        background:
          linear-gradient(180deg, rgba(197,139,18,.08), rgba(255,253,248,.96));
        box-shadow: 0 10px 24px rgba(7,31,61,.08);
      }

      .pcai-card-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }

      .pcai-card-title {
        display: grid;
        gap: 3px;
      }

      .pcai-eyebrow {
        color: #c58b12;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .16em;
        text-transform: uppercase;
      }

      .pcai-card h4 {
        margin: 0;
        color: #071f3d;
        font-size: 15px;
        font-weight: 900;
        line-height: 1.1;
      }

      .pcai-badge {
        flex: 0 0 auto;
        padding: 6px 8px;
        border-radius: 999px;
        background: rgba(7,31,61,.08);
        color: #071f3d;
        font-size: 10px;
        font-weight: 900;
        text-transform: uppercase;
      }

      .pcai-help {
        color: #5f5a4f;
        font-size: 11px;
        line-height: 1.45;
      }

      .pcai-actions {
        display: grid;
        grid-template-columns: 1fr;
        gap: 8px;
      }

      .pcai-button {
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

      .pcai-button:hover {
        transform: translateY(-1px);
        filter: brightness(1.02);
      }

      .pcai-file {
        display: none;
      }

      .pcai-status {
        min-height: 18px;
        padding: 8px 10px;
        border-radius: 9px;
        background: rgba(7,31,61,.06);
        color: #6f7680;
        font-size: 10px;
        font-weight: 800;
        line-height: 1.35;
      }

      .pcai-status[data-pcai-status="success"] {
        background: rgba(34,104,70,.09);
        color: #236847;
      }

      .pcai-status[data-pcai-status="error"] {
        background: rgba(145,41,41,.08);
        color: #8d2b2b;
      }
    `;

    document.head.appendChild(style);
  }

  function pcaiCreateInput(card, args) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.className = "pcai-file";

    input.addEventListener("change", () => {
      const file = input.files?.[0];

      if (!file) {
        return;
      }

      const reader = new FileReader();

      reader.addEventListener("load", () => {
        try {
          const payload = JSON.parse(String(reader.result ?? ""));
          pcaiApplyPayload(args, payload);
          pcaiSetStatus(
            card,
            `Importado: ${file.name}`,
            "success"
          );
          renderPlayerComparisonInspectorWithAnalytics(args);
        } catch (error) {
          pcaiSetStatus(
            card,
            error?.message || "Não foi possível importar o JSON.",
            "error"
          );
        } finally {
          input.value = "";
        }
      });

      reader.addEventListener("error", () => {
        pcaiSetStatus(
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

  function pcaiNormalizeTeamName(rawTeam, index, knownTeams) {
    const team = String(rawTeam ?? "").trim();
    const lower = team.toLowerCase();

    if (["b", "time b", "team b", "away", "visitante", "adversário", "adversario"].includes(lower)) {
      return "B";
    }

    if (["a", "time a", "team a", "home", "mandante", "equipe", "time"].includes(lower)) {
      return "A";
    }

    if (knownTeams.length >= 2 && team === knownTeams[1]) {
      return "B";
    }

    if (knownTeams.length >= 1 && team === knownTeams[0]) {
      return "A";
    }

    return index % 2 === 0 ? "A" : "B";
  }

  function pcaiResolveTeamLabels(players, currentData) {
    const labels = [];

    players.forEach((player) => {
      const team = String(player?.team ?? "").trim();

      if (
        team &&
        !["a", "b", "time a", "time b", "team a", "team b"].includes(team.toLowerCase()) &&
        !labels.includes(team)
      ) {
        labels.push(team);
      }
    });

    return {
      labels,
      teams: {
        A: labels[0] || currentData?.teams?.A || "Time A",
        B: labels[1] || currentData?.teams?.B || "Time B"
      }
    };
  }

  function pcaiGetMetricNames(sourceData) {
    const metricList = pcaiSafeArray(sourceData?.metrics);

    if (metricList.length) {
      return metricList.map((metric, index) =>
        String(
          typeof metric === "string"
            ? metric
            : metric?.label ?? metric?.name ?? metric?.metric ?? `Métrica ${index + 1}`
        )
      );
    }

    const players = pcaiSafeArray(sourceData?.players);
    const names = [];

    players.forEach((player) => {
      const values = player?.values && typeof player.values === "object"
        ? player.values
        : {};

      Object.keys(values).forEach((name) => {
        if (!names.includes(name)) {
          names.push(name);
        }
      });
    });

    return names;
  }

  function pcaiBuildPlayers(sourcePlayers, knownTeams) {
    return pcaiSafeArray(sourcePlayers).map((player, index) => ({
      id: pcaiUid("player", index + 1),
      team: pcaiNormalizeTeamName(player?.team, index, knownTeams),
      name: String(player?.name ?? player?.player ?? `Jogador ${index + 1}`),
      __values: player?.values && typeof player.values === "object"
        ? player.values
        : {}
    }));
  }

  function pcaiBuildRadarMetrics(players, metricNames, scaleMax) {
    return metricNames.map((name, metricIndex) => {
      const values = {};

      players.forEach((player) => {
        values[player.id] = Math.round(
          pcaiClamp(
            pcaiNumber(player.__values?.[name], 0),
            0,
            scaleMax
          )
        );
      });

      return {
        id: pcaiUid("radar-metric", metricIndex + 1),
        label: name,
        values
      };
    });
  }

  function pcaiBuildBarMetrics(players, metricNames, scaleMax) {
    return metricNames.map((name, metricIndex) => {
      const entries = players.map((player, playerIndex) => ({
        id: pcaiUid("bar-player", `${metricIndex + 1}-${playerIndex + 1}`),
        team: player.team,
        name: player.name,
        value: pcaiClamp(
          pcaiNumber(player.__values?.[name], 0),
          0,
          Number.POSITIVE_INFINITY
        )
      }));

      const biggestValue = Math.max(
        0,
        ...entries.map((entry) => pcaiNumber(entry.value, 0))
      );

      return {
        id: pcaiUid("bar", metricIndex + 1),
        label: name,
        unit: "",
        maxValue: Math.max(scaleMax, biggestValue || 1),
        decimals: 1,
        entries
      };
    });
  }

  function pcaiPayloadToPlayerComparisonData(currentData, payload) {
    const sourceData = payload?.data && typeof payload.data === "object"
      ? payload.data
      : payload;

    const rawPlayers = pcaiSafeArray(sourceData?.players || payload?.players);

    if (!rawPlayers.length) {
      throw new Error("O JSON não contém jogadores para o C-05.");
    }

    const metricNames = pcaiGetMetricNames(sourceData);

    if (!metricNames.length) {
      throw new Error("O JSON não contém métricas para o C-05.");
    }

    const scaleMax = Math.max(
      1,
      pcaiNumber(
        sourceData?.scaleMax ??
        sourceData?.maxValue ??
        payload?.scaleMax ??
        payload?.maxValue,
        100
      )
    );

    const { labels: knownTeams, teams } = pcaiResolveTeamLabels(
      rawPlayers,
      currentData
    );
    const playersWithValues = pcaiBuildPlayers(rawPlayers, knownTeams);
    const players = playersWithValues.map(({ __values, ...player }) => player);

    const radarTitle = String(
      sourceData?.radarTitle ??
      sourceData?.sectionTitle ??
      "Radar comparativo"
    );

    const radarSubtitle = String(
      sourceData?.radarSubtitle ??
      sourceData?.sectionSubtitle ??
      "Métricas normalizadas"
    );

    const barMetrics = pcaiBuildBarMetrics(
      playersWithValues,
      metricNames,
      scaleMax
    );

    return {
      ...currentData,
      kicker: currentData?.kicker || "Player comparison",
      title: String(
        payload?.title ??
        sourceData?.title ??
        currentData?.title ??
        "Comparação de jogadores"
      ),
      subtitle: String(
        payload?.subtitle ??
        sourceData?.subtitle ??
        currentData?.subtitle ??
        "Comparação importada do Analytics Layer"
      ),
      code: currentData?.code || "C-05",
      teams,
      players,
      radars: [
        {
          id: pcaiUid("radar", 1),
          title: radarTitle,
          subtitle: radarSubtitle,
          maxValue: scaleMax,
          metrics: pcaiBuildRadarMetrics(
            playersWithValues,
            metricNames,
            scaleMax
          )
        }
      ],
      barMetrics,
      readingTitle:
        currentData?.readingTitle ||
        "Leitura comparativa",
      readingText:
        payload?.description ||
        sourceData?.description ||
        currentData?.readingText ||
        "Comparação gerada a partir de dados tratados na camada Analytics. Ajuste a leitura manualmente conforme o contexto da análise.",
      keyText:
        currentData?.keyText ||
        `Radar normalizado em escala 0-${scaleMax}; barras preservam os valores importados.`,
      source:
        sourceData?.source ||
        payload?.source ||
        currentData?.source ||
        "ADQL Analytics Layer"
    };
  }

  function pcaiApplyPayload(args, payload) {
    const win = args.frame?.contentWindow;
    const schema = args.schema;
    const data = win?.[schema.dataKey];

    if (!win || !schema || !data) {
      throw new Error("Dados do componente C-05 não encontrados.");
    }

    const schemaVersion = String(
      payload?.schemaVersion ??
      payload?.schema_version ??
      ""
    );

    const component = String(payload?.component ?? "").toUpperCase();

    if (
      schemaVersion &&
      schemaVersion !== "adql.c05.player-comparison.v1" &&
      !schemaVersion.includes("c05")
    ) {
      throw new Error(
        `Schema incompatível para C-05: ${schemaVersion}`
      );
    }

    if (component && component !== "C-05" && component !== "PLAYER-COMPARISON") {
      throw new Error(
        `Componente incompatível para C-05: ${component}`
      );
    }

    const normalizedData = pcaiPayloadToPlayerComparisonData(data, payload);
    Object.assign(data, normalizedData);

    if (typeof win.pcNormalizeData === "function") {
      win.pcNormalizeData(data);
    }

    if (args.currentValues) {
      args.currentValues.__data = data;
      args.currentValues.__variableName = schema.dataKey;
    }

    const renderFunction = win[schema.renderFunction];

    if (typeof renderFunction === "function") {
      renderFunction(data);
    }
  }

  function pcaiBuildImportCard(args) {
    const card = pcaiElement("section", "pcai-card");
    card.id = "playerComparisonAnalyticsImportCard";

    const head = pcaiElement("div", "pcai-card-head");
    const title = pcaiElement("div", "pcai-card-title");
    title.appendChild(
      pcaiElement("span", "pcai-eyebrow", "Analytics Layer")
    );
    title.appendChild(
      pcaiElement("h4", "", "Importar JSON")
    );
    head.appendChild(title);
    head.appendChild(
      pcaiElement("span", "pcai-badge", "C-05")
    );
    card.appendChild(head);

    card.appendChild(
      pcaiElement(
        "p",
        "pcai-help",
        "Importe arquivos gerados em analytics/outputs, como c05_player_comparison_example.json. A comparação continua editável depois da importação."
      )
    );

    const actions = pcaiElement("div", "pcai-actions");
    const input = pcaiCreateInput(card, args);
    const button = pcaiElement("button", "pcai-button", "Selecionar JSON");
    button.type = "button";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      input.click();
    });

    actions.appendChild(button);
    actions.appendChild(input);
    card.appendChild(actions);

    const status = pcaiElement(
      "div",
      "pcai-status",
      "Aguardando arquivo JSON do Analytics Layer."
    );
    status.dataset.pcaiStatus = "info";
    card.appendChild(status);

    return card;
  }

  function pcaiInsertImportCard(args) {
    ensurePlayerComparisonAnalyticsImportStyles();

    const form = args.form;

    if (!form || form.querySelector("#playerComparisonAnalyticsImportCard")) {
      return;
    }

    const shell = form.querySelector(".pci-shell");
    const card = pcaiBuildImportCard(args);

    if (shell) {
      form.insertBefore(card, shell);
    } else {
      form.prepend(card);
    }
  }

  function renderPlayerComparisonInspectorWithAnalytics(args) {
    playerComparisonAnalyticsBaseBuildInspector(args);
    pcaiInsertImportCard(args);
  }

  buildInspector = function buildInspectorWithPlayerComparisonAnalyticsImport(args) {
    if (args?.schema?.mode === "player-comparison-advanced") {
      renderPlayerComparisonInspectorWithAnalytics(args);
      return;
    }

    playerComparisonAnalyticsBaseBuildInspector(args);
  };
})();
