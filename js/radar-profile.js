document.getElementById("radarTitle").textContent = radarData.title;
document.getElementById("radarSubtitle").textContent = radarData.subtitle;
document.getElementById("homeLegend").textContent = radarData.home;
document.getElementById("awayLegend").textContent = radarData.away;
document.getElementById("radarReadingTitle").textContent = radarData.readingTitle;
document.getElementById("radarReadingText").textContent = radarData.readingText;
document.getElementById("radarKeyText").textContent = radarData.keyText;
document.getElementById("sourceText").textContent = radarData.source;

drawRadar(document.getElementById("radarSvg"), radarData);

const metrics = document.getElementById("radarMetrics");

radarData.cards.forEach((card) => {
  const item = document.createElement("article");
  item.className = "rp-metric-card";

  item.innerHTML = `
    <span>${card.label}</span>
    <strong>${card.value}</strong>
    <p>${card.text}</p>
  `;

  metrics.appendChild(item);
});