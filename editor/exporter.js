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

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function exportDataFile(activeComponent, currentValues) {
  if (!activeComponent) return;

  const variableName = `${activeComponent.id.replaceAll("-", "_")}_draft`;
  const fileContent = `const ${variableName} = ${JSON.stringify(
    currentValues,
    null,
    2
  )};`;

  downloadFile(
    `${activeComponent.id}-draft.js`,
    fileContent,
    "text/javascript"
  );
}

function absoluteResourceUrl(value, baseUrl) {
  const rawValue = String(value ?? "").trim();

  if (
    !rawValue ||
    rawValue.startsWith("#") ||
    rawValue.startsWith("data:") ||
    rawValue.startsWith("blob:") ||
    rawValue.startsWith("javascript:") ||
    rawValue.startsWith("mailto:") ||
    rawValue.startsWith("tel:")
  ) {
    return rawValue;
  }

  try {
    return new URL(rawValue, baseUrl).href;
  } catch {
    return rawValue;
  }
}

function rebaseCssUrls(cssText, stylesheetUrl) {
  let output = String(cssText ?? "");

  output = output.replace(
    /url\(\s*(["']?)([^"')]+)\1\s*\)/gi,
    (fullMatch, quote, rawUrl) => {
      const cleanUrl = String(rawUrl).trim();

      if (
        !cleanUrl ||
        cleanUrl.startsWith("data:") ||
        cleanUrl.startsWith("blob:") ||
        cleanUrl.startsWith("#")
      ) {
        return fullMatch;
      }

      const absoluteUrl = absoluteResourceUrl(
        cleanUrl,
        stylesheetUrl
      );

      return `url("${absoluteUrl}")`;
    }
  );

  output = output.replace(
    /@import\s+(?:url\()?\s*(["'])([^"']+)\1\s*\)?/gi,
    (fullMatch, quote, rawUrl) => {
      const absoluteUrl = absoluteResourceUrl(
        rawUrl,
        stylesheetUrl
      );

      return fullMatch.replace(rawUrl, absoluteUrl);
    }
  );

  return output;
}

function readStylesheetFromCssRules(doc, link) {
  const stylesheet = Array.from(doc.styleSheets).find(
    (sheet) => sheet.ownerNode === link
  );

  if (!stylesheet) {
    return "";
  }

  try {
    return Array.from(stylesheet.cssRules)
      .map((rule) => rule.cssText)
      .join("\n");
  } catch {
    return "";
  }
}

async function readStylesheetText(doc, link) {
  const href = link.href;

  if (!href) {
    return "";
  }

  try {
    const response = await fetch(href, {
      cache: "no-store"
    });

    if (response.ok) {
      return await response.text();
    }
  } catch {
    // O fallback abaixo tenta ler as regras já carregadas no documento.
  }

  return readStylesheetFromCssRules(doc, link);
}

async function inlineStylesheets(sourceDoc, clonedDoc) {
  const sourceLinks = Array.from(
    sourceDoc.querySelectorAll('link[rel="stylesheet"]')
  );

  const clonedLinks = Array.from(
    clonedDoc.querySelectorAll('link[rel="stylesheet"]')
  );

  for (let index = 0; index < sourceLinks.length; index += 1) {
    const sourceLink = sourceLinks[index];
    const clonedLink = clonedLinks[index];

    if (!clonedLink) {
      continue;
    }

    const stylesheetUrl = sourceLink.href;
    const cssText = await readStylesheetText(
      sourceDoc,
      sourceLink
    );

    if (cssText) {
      const style = clonedDoc.createElement("style");
      style.setAttribute(
        "data-exported-from",
        stylesheetUrl || "inline-stylesheet"
      );
      style.textContent = rebaseCssUrls(
        cssText,
        stylesheetUrl || sourceDoc.baseURI
      );

      clonedLink.replaceWith(style);
      continue;
    }

    if (stylesheetUrl) {
      clonedLink.href = stylesheetUrl;
    }
  }
}

function makeResourcesAbsolute(sourceDoc, clonedDoc) {
  const attributes = [
    ["img[src]", "src"],
    ["source[src]", "src"],
    ["video[src]", "src"],
    ["audio[src]", "src"],
    ["object[data]", "data"],
    ["link[href]", "href"],
    ["a[href]", "href"]
  ];

  attributes.forEach(([selector, attribute]) => {
    const elements = Array.from(
      clonedDoc.querySelectorAll(selector)
    );

    elements.forEach((element) => {
      const currentValue = element.getAttribute(attribute);

      if (!currentValue) {
        return;
      }

      element.setAttribute(
        attribute,
        absoluteResourceUrl(
          currentValue,
          sourceDoc.baseURI
        )
      );
    });
  });
}

function removeRuntimeScripts(clonedDoc) {
  clonedDoc
    .querySelectorAll("script")
    .forEach((script) => script.remove());
}

function addExportMetadata(clonedDoc) {
  const head = clonedDoc.head;

  if (!head) {
    return;
  }

  if (!head.querySelector('meta[charset]')) {
    const charset = clonedDoc.createElement("meta");
    charset.setAttribute("charset", "UTF-8");
    head.prepend(charset);
  }

  if (!head.querySelector('meta[name="viewport"]')) {
    const viewport = clonedDoc.createElement("meta");
    viewport.name = "viewport";
    viewport.content = "width=device-width, initial-scale=1.0";
    head.appendChild(viewport);
  }

  const exportStyle = clonedDoc.createElement("style");
  exportStyle.setAttribute("data-adql-export", "true");
  exportStyle.textContent = `
    html,
    body {
      margin: 0;
      min-width: 0;
    }
  `;

  head.appendChild(exportStyle);
}

async function createSelfContainedHtml(frame) {
  const sourceDoc = frame.contentDocument;

  if (!sourceDoc) {
    throw new Error("Documento do componente não encontrado.");
  }

  await waitFonts(document);
  await waitFonts(sourceDoc);

  const clonedDoc = sourceDoc.cloneNode(true);

  await inlineStylesheets(sourceDoc, clonedDoc);
  makeResourcesAbsolute(sourceDoc, clonedDoc);
  removeRuntimeScripts(clonedDoc);
  addExportMetadata(clonedDoc);

  return `<!DOCTYPE html>\n${clonedDoc.documentElement.outerHTML}`;
}

async function exportHtmlFile(activeComponent, frame) {
  if (!activeComponent) return;

  try {
    const html = await createSelfContainedHtml(frame);

    downloadFile(
      `${activeComponent.id}-edited.html`,
      html,
      "text/html;charset=utf-8"
    );
  } catch (error) {
    console.error(error);
    alert(
      "Erro ao gerar HTML independente. Veja o console do navegador."
    );
  }
}

function findPosterElement(doc) {
  return (
    doc.querySelector(".mc-poster") ||
    doc.querySelector(".ic-poster") ||
    doc.querySelector(".tp-poster") ||
    doc.querySelector(".rp-poster") ||
    doc.querySelector(".pc-poster") ||
    doc.querySelector(".tb-poster") ||
    doc.querySelector(".tc-poster") ||
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

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
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
