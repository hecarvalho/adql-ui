function findPlayer(players, id) {
  return players.find((player) => player.id === id);
}

function clearDynamicLayers(svg) {
  svg
    .querySelectorAll('[data-layer="zones"], [data-layer="routes"], [data-layer="effects"], [data-layer="players"], [data-layer="labels"]')
    .forEach((layer) => layer.remove());
}

function renderPlay(svg, data) {
  if (!svg || !data) return;

  clearDynamicLayers(svg);

  data.zones?.forEach((zone) => {
    drawZone(svg, zone.x, zone.y, zone.w, zone.h);
  });

  data.passes?.forEach((pass) => {
    const from = findPlayer(data.players, pass.from);
    const to = findPlayer(data.players, pass.to);

    if (from && to) drawPass(svg, from.x, from.y, to.x, to.y, pass.bend);
  });

  data.runs?.forEach((run) => {
    const from = findPlayer(data.players, run.from);
    const to = findPlayer(data.players, run.to);

    if (from && to) drawRun(svg, from.x, from.y, to.x, to.y, run.bend);
  });

  data.carries?.forEach((carry) => {
    drawCarry(svg, carry.path);
  });

  data.pressures?.forEach((pressure) => {
    drawPressure(svg, pressure.x, pressure.y, pressure.r);
  });

  data.gates?.forEach((gate) => {
    drawGate(svg, gate.x1, gate.y1, gate.x2, gate.y2);
  });

  data.players?.forEach((player) => {
    drawPlayer(svg, player.x, player.y, player.type, player.number);
  });

  data.steps?.forEach((step) => {
    drawStep(svg, step.x, step.y, step.number);
  });
}