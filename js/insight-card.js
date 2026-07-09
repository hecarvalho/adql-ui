/* ==========================================================
   ADQL UI
   C-02 — INSIGHT CARD
========================================================== */


const insight = {

  category:
    "Eficiência ofensiva",

  mainValue:
    "2,30",

  mainUnit:
    "xG",

  mainStatement:
    "com apenas 9 finalizações",

  mainInsight:
    "A Noruega não precisa finalizar muito para criar perigo real.",

  supportingText:
    "O dado resume uma diferença central entre os ataques: o Brasil constrói volume; a Noruega procura chegar em condições mais limpas e verticais.",

  home: {

    team:
      "Brasil",

    shots:
      19,

    xg:
      "2,12"

  },

  away: {

    team:
      "Noruega",

    shots:
      9,

    xg:
      "2,30"

  },

  reading:
    "O Brasil constrói volume. A Noruega procura eficiência.",

  source:
    "FIFA • Relatórios técnicos"

};


/* ==========================================================
   MAIN
========================================================== */


document
  .getElementById("insightCategory")
  .textContent =
  insight.category;


document
  .getElementById("mainValue")
  .textContent =
  insight.mainValue;


document
  .getElementById("mainUnit")
  .textContent =
  insight.mainUnit;


document
  .getElementById("mainStatement")
  .textContent =
  insight.mainStatement;


document
  .getElementById("mainInsight")
  .textContent =
  insight.mainInsight;


document
  .getElementById("supportingText")
  .textContent =
  insight.supportingText;


/* ==========================================================
   HOME TEAM
========================================================== */


document
  .getElementById("homeTeam")
  .textContent =
  insight.home.team;


document
  .getElementById("homeShots")
  .textContent =
  insight.home.shots;


document
  .getElementById("homeXg")
  .textContent =
  insight.home.xg;


/* ==========================================================
   AWAY TEAM
========================================================== */


document
  .getElementById("awayTeam")
  .textContent =
  insight.away.team;


document
  .getElementById("awayShots")
  .textContent =
  insight.away.shots;


document
  .getElementById("awayXg")
  .textContent =
  insight.away.xg;


/* ==========================================================
   READING
========================================================== */


document
  .getElementById("readingText")
  .textContent =
  insight.reading;


/* ==========================================================
   SOURCE
========================================================== */


document
  .getElementById("sourceText")
  .textContent =
  insight.source;