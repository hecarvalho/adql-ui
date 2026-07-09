document.getElementById("pitchTitle").textContent = playData.title;
document.getElementById("pitchSubtitle").textContent = playData.subtitle;
document.getElementById("readingText").textContent = playData.reading;
document.getElementById("sourceText").textContent = playData.source;

const svg = document.querySelector(".tp-pitch");

renderPlay(svg, playData);