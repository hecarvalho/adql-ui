/* ==========================================================
   ADQL UI
   MATCH COMPARISON
========================================================== */


const match = {

  home: "França",

  away: "Marrocos",

  stage: "Quartas de final",

  competition: "Copa do Mundo 2026",

  stats: [

    {
      label: "Posse de bola",
      home: 58,
      away: 42,
      suffix: "%"
    },

    {
      label: "Expected Goals (xG)",
      home: 1.74,
      away: 1.08,
      decimals: 2
    },

    {
      label: "Finalizações",
      home: 14,
      away: 9
    },

    {
      label: "Passes certos",
      home: 541,
      away: 392
    },

    {
      label: "Recuperações no campo ofensivo",
      home: 37,
      away: 29
    }

  ]

};


/* ==========================================================
   HEADER
========================================================== */


document
  .getElementById("homeTitle")
  .textContent = match.home;


document
  .getElementById("awayTitle")
  .textContent = match.away;


document
  .getElementById("matchSubtitle")
  .textContent =
  `${match.stage} • ${match.competition}`;


document
  .getElementById("homeName")
  .textContent = match.home;


document
  .getElementById("awayName")
  .textContent = match.away;


/* ==========================================================
   METRICS
========================================================== */


const metrics =
  document.getElementById("metrics");


const formatValue = (value, stat) => {

  const suffix =
    stat.suffix ?? "";

  if(stat.decimals){

    return (
      value.toFixed(stat.decimals)
      + suffix
    );

  }

  return (
    value
    + suffix
  );

};


match.stats.forEach((stat) => {

  const total =
    stat.home
    + stat.away;


  const homeShare =
    total === 0
      ? 50
      : (stat.home / total) * 100;


  const difference =
    stat.home
    - stat.away;


  const winningTeam =
    difference === 0
      ? "equilíbrio"
      : difference > 0
        ? match.home
        : match.away;


  const differenceValue =
    difference === 0
      ? "0"
      : `${
          difference > 0
            ? "+"
            : ""
        }${
          formatValue(
            Math.abs(difference),
            stat
          )
        }`;


  const item =
    document.createElement(
      "article"
    );


  item.className =
    "mc-metric";


  item.innerHTML = `

    <div class="mc-metric-name">

      ${stat.label}

    </div>


    <div class="mc-metric-values">


      <div class="mc-value home">

        ${formatValue(
          stat.home,
          stat
        )}

      </div>


      <div class="mc-visual">


        <div class="mc-line">

          <div
            class="mc-fill"
            style="
              width:
              ${homeShare}%
            "
          ></div>


          <div
            class="mc-node"
            style="
              left:
              ${homeShare}%
            "
          ></div>

        </div>


        <div class="mc-note">

          <strong>

            ${differenceValue}

          </strong>

          ${winningTeam}

        </div>


      </div>


      <div class="mc-value away">

        ${formatValue(
          stat.away,
          stat
        )}

      </div>


    </div>

  `;


  metrics.appendChild(item);

});