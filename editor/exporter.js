async function waitFonts(doc) {
  if (!doc || !doc.fonts) return;

  await doc.fonts.load('800 80px "Barlow Semi Condensed"');
  await doc.fonts.load('700 40px "Barlow Semi Condensed"');
  await doc.fonts.load('800 20px "Inter"');
  await doc.fonts.load('600 16px "Inter"');
  await doc.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 500));
}

function downloadFile(filename, content, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportDataFile(activeComponent, currentValues) {
  if (!activeComponent) return;

  const variableName = `${activeComponent.id.replaceAll("-", "_")}_draft`;
  const fileContent = `const ${variableName} = ${JSON.stringify(currentValues, null, 2)};`;

  downloadFile(
    `${activeComponent.id}-draft.js`,
    fileContent,
    "text/javascript"
  );
}

function exportHtmlFile(activeComponent, frame) {
  if (!activeComponent) return;

  const doc = frame.contentDocument;
  const html = `\n${doc.documentElement.outerHTML}`;

  downloadFile(
    `${activeComponent.id}-edited.html`,
    html,
    "text/html"
  );
}

function findPosterElement(doc) {
  return (
    doc.querySelector(".mc-poster") ||
    doc.querySelector(".ic-poster") ||
    doc.querySelector(".tp-poster") ||
    doc.querySelector(".rp-poster") ||
    doc.querySelector(".pc-poster") ||
    doc.querySelector(".tb-poster") ||
    doc.querySelector(".adql-sheet")
  );
}

async function exportPngFile(activeComponent, frame) {
  if (!activeComponent) return;

  const doc = frame.contentDocument;

  await waitFonts(document);
  await waitFonts(doc);

  const poster = findPosterElement(doc);

  if (!poster) {
    alert("Não encontrei o elemento principal do componente.");
    return;
  }

  const previousOverflow = poster.style.overflow;
  const previousTransform = poster.style.transform;
  const previousAnimation = poster.style.animation;

  poster.style.overflow = "hidden";
  poster.style.transform = "none";
  poster.style.animation = "none";

  await new Promise((resolve) => setTimeout(resolve, 500));

  try {
    const canvas = await html2canvas(poster, {
      backgroundColor: "#f7f2e8",
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      width: poster.offsetWidth,
      height: poster.offsetHeight,
      windowWidth: doc.documentElement.scrollWidth,
      windowHeight: doc.documentElement.scrollHeight
    });

    canvas.toBlob((blob) => {
      if (!blob) {
        alert("Falha ao gerar PNG.");
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeComponent.id}.png`;
      link.click();
      URL.revokeObjectURL(url);
    }, "image/png");
  } catch (error) {
    console.error(error);
    alert("Erro ao exportar PNG. Veja o console do navegador.");
  } finally {
    poster.style.overflow = previousOverflow;
    poster.style.transform = previousTransform;
    poster.style.animation = previousAnimation;
  }
}
