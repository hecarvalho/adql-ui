/* ==========================================================
   ADQL UI
   C-07 — TITLE COVER
========================================================== */

const TC_COMPOSITIONS = new Set([
  "editorial",
  "impact",
  "minimal"
]);

function tcSetText(id, value) {
  const target = document.getElementById(id);

  if (target) {
    target.textContent = value ?? "";
  }
}

function tcNormalizeComposition(value) {
  if (value === "score") {
    return "impact";
  }

  if (value === "question") {
    return "minimal";
  }

  return TC_COMPOSITIONS.has(value)
    ? value
    : "editorial";
}

function tcNormalizePublicationNumber(value) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/\s+/g, "");

  return normalized || "01";
}

function tcApplyComposition(poster, composition) {
  if (!poster) {
    return;
  }

  poster.classList.remove(
    "tc-composition-editorial",
    "tc-composition-impact",
    "tc-composition-minimal",
    "tc-composition-score",
    "tc-composition-question"
  );

  poster.classList.add(
    `tc-composition-${tcNormalizeComposition(composition)}`
  );
}

function tcSetKickerVisibility(show) {
  const wrap = document.getElementById("tcKickerWrap");

  if (!wrap) {
    return;
  }

  wrap.classList.toggle("is-hidden", !show);
  wrap.setAttribute("aria-hidden", show ? "false" : "true");
}

function tcGetTitleBaseSize(data) {
  const composition = tcNormalizeComposition(data.composition);
  const title = String(data.title ?? "").trim();
  const manualLines = Math.max(1, title.split("\n").length);
  const compactLength = title.replace(/\s+/g, " ").length;

  let size = 136;

  if (compactLength > 28) size = 124;
  if (compactLength > 44) size = 108;
  if (compactLength > 64) size = 94;
  if (compactLength > 88) size = 82;
  if (compactLength > 116) size = 70;

  if (manualLines >= 3) {
    size = Math.min(size, 102);
  }

  if (manualLines >= 4) {
    size = Math.min(size, 86);
  }

  if (composition === "impact") {
    size = Math.min(size + 12, 154);
  }

  if (composition === "minimal") {
    size = Math.min(size, 122);
  }

  return size;
}

function tcGetTitleMaxHeight(poster) {
  if (poster.classList.contains("tc-composition-impact")) {
    return 338;
  }

  if (poster.classList.contains("tc-composition-minimal")) {
    return 314;
  }

  return 320;
}

function tcFitTitle(data) {
  const poster = document.getElementById("titleCoverPoster");
  const title = document.getElementById("tcTitle");
  const frame = title?.parentElement;

  if (!poster || !title || !frame) {
    return;
  }

  let size = tcGetTitleBaseSize(data);
  const minSize = 56;

  poster.style.setProperty("--tc-title-size", `${size}px`);

  const maxHeight = tcGetTitleMaxHeight(poster);
  const maxWidth = frame.clientWidth;

  while (
    size > minSize &&
    (title.scrollHeight > maxHeight || title.scrollWidth > maxWidth + 2)
  ) {
    size -= 2;
    poster.style.setProperty("--tc-title-size", `${size}px`);
  }
}

function renderTitleCover(data = window.titleCoverData) {
  if (!data) {
    return;
  }

  const poster = document.getElementById("titleCoverPoster");
  const composition = tcNormalizeComposition(data.composition);

  data.composition = composition;
  data.publicationNumber = tcNormalizePublicationNumber(
    data.publicationNumber
  );

  tcSetText("tcKicker", data.kicker);
  tcSetText("tcTitle", data.title);
  tcSetText("tcSubtitle", data.subtitle);
  tcSetText("tcCode", data.code || "C-07");
  tcSetText("tcBigCode", data.publicationNumber);

  tcApplyComposition(poster, composition);
  tcSetKickerVisibility(data.showKicker !== false);

  requestAnimationFrame(() => {
    tcFitTitle(data);
  });

  window.dispatchEvent(
    new CustomEvent("adql:title-cover-rendered", {
      detail: { data }
    })
  );
}

window.titleCoverData = titleCoverData;
window.renderTitleCover = renderTitleCover;
window.tcFitTitle = tcFitTitle;
window.tcNormalizeComposition = tcNormalizeComposition;

renderTitleCover(titleCoverData);
