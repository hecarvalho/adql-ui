/* ==========================================================
   ADQL EDITOR
   C-03 — TACTICAL PITCH / IMPORTADOR ANALYTICS LAYER
========================================================== */

(function setupTacticalAnalyticsImport() {
  if (window.__adqlTacticalAnalyticsImportInstalled) {
    return;
  }

  window.__adqlTacticalAnalyticsImportInstalled = true;

  const tacticalAnalyticsBaseBuildInspector = buildInspector;
  const tacticalAnalyticsMessages = new WeakMap();

  const SVG_BOUNDS = {
    minX: 72,
    maxX: 928,
    minY: 72,
    maxY: 548
  };

  function taiElement(tag, className = "", text = "") {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== "") {
      element.textContent = text;
    }

    return element;
  }

  function taiNumber(value, fallback = 0) {
    const parsed = Number(
      String(value ?? "")
        .trim()
        .replace(",", ".")
    );

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function taiClamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function taiSafeArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function taiText(value, fallback = "") {
    if (value === null || value === undefined) {
      return fallback;
    }

    return String(value);
  }

  function taiIsObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function taiMessage(frame, text, type = "info") {
    tacticalAnalyticsMessages.set(frame, { text, type });
  }

  function taiCurrentMessage(frame) {
    return tacticalAnalyticsMessages.get(frame) || {
      text: "Importe uma cena gerada pelo ADQL Analytics Layer ou pelo fluxo manual do ChatGPT.",
      type: "info"
    };
  }

  function taiSetStatus(card, message, type = "info") {
    const status = card.querySelector("[data-tai-status]");

    if (!status) {
      return;
    }

    status.textContent = message;
    status.dataset.taiStatus = type;
  }

  function ensureTacticalAnalyticsImportStyles() {
    if (document.getElementById("tacticalAnalyticsImportStyles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "tacticalAnalyticsImportStyles";
    style.textContent = `
      .tai-card {
        display: grid;
        gap: 12px;
        padding: 14px;
        border: 1px solid rgba(197,139,18,.42);
        border-radius: 14px;
        background:
          radial-gradient(circle at 100% 0%, rgba(197,139,18,.18), transparent 34%),
          linear-gradient(180deg, rgba(197,139,18,.08), rgba(255,253,248,.96));
        box-shadow: 0 10px 24px rgba(7,31,61,.08);
      }

      .tai-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .tai-eyebrow {
        display: block;
        color: #c58b12;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .tai-title {
        margin-top: 3px;
        color: #071f3d;
        font-size: 15px;
        font-weight: 900;
        line-height: 1.12;
      }

      .tai-pill {
        flex: 0 0 auto;
        padding: 7px 9px;
        border-radius: 999px;
        background: #071f3d;
        color: #fff;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .08em;
        text-transform: uppercase;
      }

      .tai-copy {
        color: #5f6872;
        font-size: 11px;
        line-height: 1.45;
      }

      .tai-actions {
        display: grid;
        gap: 8px;
      }

      .tai-file {
        position: relative;
        overflow: hidden;
      }

      .tai-file input {
        position: absolute;
        inset: 0;
        opacity: 0;
        cursor: pointer;
      }

      .tai-button,
      .tai-file-label {
        min-height: 39px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 9px 11px;
        border: 1px solid #071f3d;
        border-radius: 10px;
        background: #071f3d;
        color: #fff;
        font: 900 11px/1.2 Inter, Arial, sans-serif;
        cursor: pointer;
        transition: 150ms ease;
      }

      .tai-button:hover,
      .tai-file-label:hover {
        transform: translateY(-1px);
        border-color: #c58b12;
      }

      .tai-button-secondary {
        border-color: #d8d1c3;
        background: #fffdf8;
        color: #071f3d;
      }

      .tai-status {
        min-height: 34px;
        padding: 9px 10px;
        border: 1px solid #e2dbce;
        border-radius: 10px;
        background: rgba(255,255,255,.72);
        color: #5f6872;
        font-size: 11px;
        font-weight: 700;
        line-height: 1.35;
      }

      .tai-status[data-tai-status="success"] {
        border-color: rgba(48,119,78,.28);
        background: rgba(48,119,78,.08);
        color: #276344;
      }

      .tai-status[data-tai-status="error"] {
        border-color: rgba(150,42,42,.28);
        background: rgba(150,42,42,.08);
        color: #8d2d2d;
      }

      .tai-hint {
        padding-top: 2px;
        color: #7b8188;
        font-size: 10px;
        line-height: 1.45;
      }
    `;

    document.head.appendChild(style);
  }

  function taiReadFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      reader.readAsText(file);
    });
  }

  function taiExtractPayload(json) {
    if (!taiIsObject(json)) {
      throw new Error("O JSON precisa ser um objeto.");
    }

    if (taiIsObject(json.data) && String(json.schemaVersion || "").includes("adql.c03")) {
      return {
        ...json.data,
        schemaVersion: json.schemaVersion,
        title: json.title ?? json.data.title,
        subtitle: json.subtitle ?? json.data.subtitle
      };
    }

    if (taiIsObject(json.data) && String(json.data.schemaVersion || "").includes("adql.c03")) {
      return json.data;
    }

    return json;
  }

  function taiAssertC03Schema(payload) {
    const schemaVersion = String(payload.schemaVersion || "");

    if (schemaVersion && schemaVersion !== "adql.c03.scene.v1") {
      throw new Error(`Schema não suportado: ${schemaVersion}`);
    }
  }

  function taiInferPercentCoordinates(payload, players) {
    const declared = String(
      payload.coordinateSystem ||
      payload.coordinates ||
      payload.meta?.coordinateSystem ||
      payload.meta?.coordinates ||
      ""
    ).toLowerCase();

    if (declared.includes("percent") || declared.includes("0-100")) {
      return true;
    }

    if (declared.includes("svg") || declared.includes("absolute")) {
      return false;
    }

    const positionedPlayers = players.filter((player) =>
      Number.isFinite(taiNumber(player.x, NaN)) &&
      Number.isFinite(taiNumber(player.y, NaN))
    );

    if (!positionedPlayers.length) {
      return false;
    }

    return positionedPlayers.every((player) => {
      const x = taiNumber(player.x, 0);
      const y = taiNumber(player.y, 0);

      return x >= 0 && x <= 100 && y >= 0 && y <= 100;
    });
  }

  function taiScaleX(value, usePercent) {
    const number = taiNumber(value, 50);

    if (usePercent) {
      return Math.round(
        SVG_BOUNDS.minX +
          (taiClamp(number, 0, 100) / 100) *
            (SVG_BOUNDS.maxX - SVG_BOUNDS.minX)
      );
    }

    return Math.round(taiClamp(number, SVG_BOUNDS.minX, SVG_BOUNDS.maxX));
  }

  function taiScaleY(value, usePercent) {
    const number = taiNumber(value, 50);

    if (usePercent) {
      return Math.round(
        SVG_BOUNDS.minY +
          (taiClamp(number, 0, 100) / 100) *
            (SVG_BOUNDS.maxY - SVG_BOUNDS.minY)
      );
    }

    return Math.round(taiClamp(number, SVG_BOUNDS.minY, SVG_BOUNDS.maxY));
  }

  function taiScaleW(value, usePercent) {
    const number = taiNumber(value, 18);

    if (usePercent) {
      return Math.round((taiClamp(number, 0, 100) / 100) * (SVG_BOUNDS.maxX - SVG_BOUNDS.minX));
    }

    return Math.round(Math.max(0, number));
  }

  function taiScaleH(value, usePercent) {
    const number = taiNumber(value, 18);

    if (usePercent) {
      return Math.round((taiClamp(number, 0, 100) / 100) * (SVG_BOUNDS.maxY - SVG_BOUNDS.minY));
    }

    return Math.round(Math.max(0, number));
  }

  function taiNormalizePlayerType(player, fallbackId) {
    const raw = String(player.type || player.team || player.side || "").toLowerCase();

    if (raw.includes("opponent") || raw.includes("advers") || fallbackId.startsWith("o")) {
      return "opponent";
    }

    if (raw.includes("highlight") || raw.includes("destaque")) {
      return "highlight";
    }

    if (raw.includes("ghost") || raw.includes("fantasma")) {
      return "ghost";
    }

    return "team";
  }

  function taiUniqueId(baseId, usedIds) {
    const cleanBase = String(baseId || "p")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "") || "p";

    if (!usedIds.has(cleanBase)) {
      usedIds.add(cleanBase);
      return cleanBase;
    }

    let index = 2;
    let next = `${cleanBase}-${index}`;

    while (usedIds.has(next)) {
      index += 1;
      next = `${cleanBase}-${index}`;
    }

    usedIds.add(next);
    return next;
  }

  function taiNormalizePlayers(payload, usePercent) {
    const rawPlayers = taiSafeArray(payload.players);
    const usedIds = new Set();

    return rawPlayers.map((player, index) => {
      const candidateId = player.id || player.playerId || player.code || `p${index + 1}`;
      const id = taiUniqueId(candidateId, usedIds);
      const type = taiNormalizePlayerType(player, id);
      const label = player.number ?? player.label ?? player.jersey ?? player.shirtNumber ?? "";

      return {
        id,
        x: taiScaleX(player.x ?? player.left ?? 50, usePercent),
        y: taiScaleY(player.y ?? player.top ?? 50, usePercent),
        type,
        number: label === "" || label === null || label === undefined ? null : String(label)
      };
    });
  }

  function taiValidPlayerIds(players) {
    return new Set(players.map((player) => player.id));
  }

  function taiNormalizeRoute(route, fallbackBend = 0) {
    return {
      from: taiText(route.from ?? route.source ?? route.start ?? route.playerFrom ?? ""),
      to: taiText(route.to ?? route.target ?? route.end ?? route.playerTo ?? ""),
      bend: taiNumber(route.bend, fallbackBend)
    };
  }

  function taiRouteIsValid(route, playerIds) {
    return Boolean(route.from && route.to && playerIds.has(route.from) && playerIds.has(route.to));
  }

  function taiNormalizeRouteArray(routes, playerIds, fallbackBend = 0) {
    return taiSafeArray(routes)
      .map((route) => taiNormalizeRoute(route, fallbackBend))
      .filter((route) => taiRouteIsValid(route, playerIds));
  }

  function taiNormalizeCarry(route, playerIds) {
    const normalized = taiNormalizeRoute(route, 0);

    if (!taiRouteIsValid(normalized, playerIds)) {
      return null;
    }

    if (taiIsObject(route.control1)) {
      normalized.control1 = {
        x: taiNumber(route.control1.x, 0),
        y: taiNumber(route.control1.y, 0)
      };
    }

    if (taiIsObject(route.control2)) {
      normalized.control2 = {
        x: taiNumber(route.control2.x, 0),
        y: taiNumber(route.control2.y, 0)
      };
    }

    if (route.path) {
      normalized.path = String(route.path);
    }

    return normalized;
  }

  function taiClassifyActions(actions, playerIds) {
    const grouped = {
      passes: [],
      runs: [],
      carries: [],
      pressures: []
    };

    taiSafeArray(actions).forEach((action) => {
      const type = String(action.type || action.kind || action.action || "pass").toLowerCase();

      if (type.includes("press")) {
        const playerId = taiText(action.playerId ?? action.player ?? action.target ?? action.to ?? "");

        if (playerIds.has(playerId)) {
          grouped.pressures.push({
            playerId,
            r: taiNumber(action.r ?? action.radius, 30)
          });
        }

        return;
      }

      if (type.includes("carry") || type.includes("dribble") || type.includes("condu")) {
        const carry = taiNormalizeCarry(action, playerIds);

        if (carry) {
          grouped.carries.push(carry);
        }

        return;
      }

      if (type.includes("run") || type.includes("corrida") || type.includes("movement") || type.includes("movimento")) {
        const run = taiNormalizeRoute(action, -0.18);

        if (taiRouteIsValid(run, playerIds)) {
          grouped.runs.push(run);
        }

        return;
      }

      const pass = taiNormalizeRoute(action, 0.12);

      if (taiRouteIsValid(pass, playerIds)) {
        grouped.passes.push(pass);
      }
    });

    return grouped;
  }

  function taiNormalizeZones(zones, usePercent) {
    return taiSafeArray(zones)
      .map((zone) => {
        if (zone.x1 !== undefined && zone.y1 !== undefined && zone.x2 !== undefined && zone.y2 !== undefined) {
          const x1 = taiScaleX(zone.x1, usePercent);
          const y1 = taiScaleY(zone.y1, usePercent);
          const x2 = taiScaleX(zone.x2, usePercent);
          const y2 = taiScaleY(zone.y2, usePercent);

          return {
            x: Math.min(x1, x2),
            y: Math.min(y1, y2),
            w: Math.abs(x2 - x1),
            h: Math.abs(y2 - y1)
          };
        }

        return {
          x: taiScaleX(zone.x ?? 45, usePercent),
          y: taiScaleY(zone.y ?? 35, usePercent),
          w: taiScaleW(zone.w ?? zone.width ?? 24, usePercent),
          h: taiScaleH(zone.h ?? zone.height ?? 28, usePercent)
        };
      })
      .filter((zone) => zone.w > 0 && zone.h > 0);
  }

  function taiNormalizeGates(gates, usePercent) {
    return taiSafeArray(gates)
      .map((gate) => ({
        x1: taiScaleX(gate.x1 ?? gate.startX ?? 45, usePercent),
        y1: taiScaleY(gate.y1 ?? gate.startY ?? 35, usePercent),
        x2: taiScaleX(gate.x2 ?? gate.endX ?? 55, usePercent),
        y2: taiScaleY(gate.y2 ?? gate.endY ?? 65, usePercent)
      }))
      .filter((gate) => gate.x1 !== gate.x2 || gate.y1 !== gate.y2);
  }

  function taiNormalizePressures(pressures, playerIds) {
    return taiSafeArray(pressures)
      .map((pressure) => ({
        playerId: taiText(pressure.playerId ?? pressure.player ?? pressure.id ?? ""),
        r: taiNumber(pressure.r ?? pressure.radius, 30)
      }))
      .filter((pressure) => playerIds.has(pressure.playerId));
  }

  function taiNormalizeSteps(steps, playerIds) {
    return taiSafeArray(steps)
      .map((step, index) => ({
        playerId: taiText(step.playerId ?? step.player ?? step.id ?? ""),
        number: taiNumber(step.number ?? step.label ?? index + 1, index + 1)
      }))
      .filter((step) => playerIds.has(step.playerId));
  }

  function taiGenerateStepsFromRoutes(passes, runs, carries, playerIds) {
    const sequence = [];

    [...passes, ...carries, ...runs].forEach((route) => {
      [route.from, route.to].forEach((id) => {
        if (playerIds.has(id) && !sequence.includes(id)) {
          sequence.push(id);
        }
      });
    });

    return sequence.slice(0, 3).map((playerId, index) => ({
      playerId,
      number: index + 1
    }));
  }

  function taiNormalizeStepCopy(payload, routesCount) {
    const raw = taiSafeArray(payload.stepCopy ?? payload.stepsCopy ?? payload.narrativeSteps);

    if (raw.length) {
      return raw.slice(0, 3).map((step, index) => ({
        title: taiText(step.title ?? step.label, `Momento ${index + 1}`),
        text: taiText(step.text ?? step.description ?? step.copy, "")
      }));
    }

    const actionCount = taiSafeArray(payload.actions).length || routesCount;

    if (actionCount) {
      return [
        {
          title: "Organizar",
          text: "Posicionar a estrutura inicial da jogada."
        },
        {
          title: "Conectar",
          text: "Criar a ligação entre setores ou corredores."
        },
        {
          title: "Acelerar",
          text: "Atacar o espaço ou finalizar a progressão."
        }
      ];
    }

    return [
      {
        title: "Momento 1",
        text: "Primeiro comportamento observado na cena."
      },
      {
        title: "Momento 2",
        text: "Desenvolvimento da jogada."
      },
      {
        title: "Momento 3",
        text: "Consequência tática da ação."
      }
    ];
  }

  function taiNormalizeScene(payload, currentData = {}) {
    taiAssertC03Schema(payload);

    const rawPlayers = taiSafeArray(payload.players);

    if (!rawPlayers.length) {
      throw new Error("O JSON não contém jogadores em players[].");
    }

    const usePercent = taiInferPercentCoordinates(payload, rawPlayers);
    const players = taiNormalizePlayers(payload, usePercent);
    const playerIds = taiValidPlayerIds(players);
    const groupedActions = taiClassifyActions(payload.actions, playerIds);

    const passes = [
      ...taiNormalizeRouteArray(payload.passes, playerIds, 0.12),
      ...groupedActions.passes
    ];

    const runs = [
      ...taiNormalizeRouteArray(payload.runs, playerIds, -0.18),
      ...groupedActions.runs
    ];

    const carries = [
      ...taiSafeArray(payload.carries)
        .map((carry) => taiNormalizeCarry(carry, playerIds))
        .filter(Boolean),
      ...groupedActions.carries
    ];

    const pressures = [
      ...taiNormalizePressures(payload.pressures, playerIds),
      ...groupedActions.pressures
    ];

    const gates = taiNormalizeGates(payload.gates, usePercent);
    const zones = taiNormalizeZones(payload.zones, usePercent);
    const steps = taiNormalizeSteps(payload.steps, playerIds);
    const generatedSteps = steps.length
      ? steps
      : taiGenerateStepsFromRoutes(passes, runs, carries, playerIds);

    const meta = taiIsObject(payload.meta) ? payload.meta : {};
    const title = taiText(payload.title ?? meta.title, currentData.title || "Cena tática");
    const subtitle = taiText(payload.subtitle ?? meta.subtitle, currentData.subtitle || "ADQL Analytics Layer");
    const reading = taiText(
      payload.reading ?? payload.description ?? meta.reading ?? meta.description,
      currentData.reading || "Cena gerada a partir de dados externos para edição no ADQL UI."
    );

    return {
      kicker: taiText(payload.kicker ?? meta.kicker, currentData.kicker || "Campo tático"),
      title,
      subtitle,
      reading,
      source: taiText(payload.source ?? meta.source, "ADQL Analytics Layer"),
      stepCopy: taiNormalizeStepCopy(payload, passes.length + runs.length + carries.length),
      players,
      zones,
      passes,
      runs,
      carries,
      pressures,
      gates,
      steps: generatedSteps
    };
  }

  function taiApplyScene({ frame, schema, currentValues, scene }) {
    const win = frame.contentWindow;
    const data = win[schema.dataKey];

    if (!data) {
      throw new Error("Dados do componente C-03 não encontrados.");
    }

    Object.keys(data).forEach((key) => {
      delete data[key];
    });

    Object.assign(data, scene);
    win[schema.dataKey] = data;

    if (currentValues) {
      currentValues.__data = data;
      currentValues.__variableName = schema.dataKey;
    }

    if (typeof win.setTacticalInteractionState === "function") {
      win.setTacticalInteractionState({
        mode: "move",
        routeStartPlayerId: null
      });
    }

    const renderFunction = win[schema.renderFunction];

    if (typeof renderFunction === "function") {
      renderFunction(data);
    }
  }

  function taiBuildImportCard(args) {
    const { frame, schema, currentValues } = args;
    const currentMessage = taiCurrentMessage(frame);
    const card = taiElement("section", "tai-card");
    const head = taiElement("div", "tai-head");
    const titleWrap = taiElement("div");

    titleWrap.appendChild(taiElement("span", "tai-eyebrow", "Analytics Layer"));
    titleWrap.appendChild(taiElement("div", "tai-title", "Importar cena tática"));
    head.appendChild(titleWrap);
    head.appendChild(taiElement("span", "tai-pill", "C-03"));
    card.appendChild(head);

    card.appendChild(
      taiElement(
        "p",
        "tai-copy",
        "Use um JSON adql.c03.scene.v1 para preencher jogadores, setas, zonas, pressões e marcadores. Depois, ajuste a cena manualmente no campo."
      )
    );

    const actions = taiElement("div", "tai-actions");
    const fileWrapper = taiElement("label", "tai-file");
    const fileLabel = taiElement("span", "tai-file-label", "Selecionar JSON");
    const fileInput = document.createElement("input");

    fileInput.type = "file";
    fileInput.accept = ".json,application/json";

    fileWrapper.appendChild(fileLabel);
    fileWrapper.appendChild(fileInput);
    actions.appendChild(fileWrapper);

    const resetButton = taiElement("button", "tai-button tai-button-secondary", "Limpar aviso");
    resetButton.type = "button";
    resetButton.addEventListener("click", () => {
      taiMessage(frame, "Importe uma cena gerada pelo ADQL Analytics Layer ou pelo fluxo manual do ChatGPT.", "info");
      taiSetStatus(card, taiCurrentMessage(frame).text, "info");
    });

    actions.appendChild(resetButton);
    card.appendChild(actions);

    const status = taiElement("div", "tai-status", currentMessage.text);
    status.dataset.taiStatus = currentMessage.type;
    status.setAttribute("data-tai-status", currentMessage.type);
    card.appendChild(status);

    card.appendChild(
      taiElement(
        "div",
        "tai-hint",
        "Formato aceito: analytics/outputs/c03_scene_example.json ou JSON do fluxo manual com schemaVersion adql.c03.scene.v1. Coordenadas 0–100 são convertidas automaticamente para o campo."
      )
    );

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];

      if (!file) {
        return;
      }

      try {
        taiSetStatus(card, "Lendo arquivo JSON...", "info");

        const text = await taiReadFile(file);
        const parsed = JSON.parse(text);
        const payload = taiExtractPayload(parsed);
        const currentData = frame.contentWindow?.[schema.dataKey] || {};
        const scene = taiNormalizeScene(payload, currentData);

        taiApplyScene({
          frame,
          schema,
          currentValues,
          scene
        });

        taiMessage(
          frame,
          `Cena importada: ${scene.players.length} jogadores, ${scene.passes.length + scene.runs.length + scene.carries.length} movimentos, ${scene.zones.length} zonas.`,
          "success"
        );

        taiRefreshInspector(args);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Erro desconhecido ao importar JSON.";
        taiMessage(frame, message, "error");
        taiSetStatus(card, message, "error");
      } finally {
        fileInput.value = "";
      }
    });

    return card;
  }

  function taiInjectImportCard(args) {
    const { form } = args;

    if (!form || form.querySelector(".tai-card")) {
      return;
    }

    ensureTacticalAnalyticsImportStyles();
    form.prepend(taiBuildImportCard(args));
  }

  function taiRefreshInspector(args) {
    tacticalAnalyticsBaseBuildInspector(args);

    if (args?.schema?.mode === "tactical-advanced") {
      taiInjectImportCard(args);
    }
  }

  buildInspector = function buildInspectorWithTacticalAnalyticsImport(args) {
    tacticalAnalyticsBaseBuildInspector(args);

    if (args?.schema?.mode === "tactical-advanced") {
      taiInjectImportCard(args);
    }
  };
})();
