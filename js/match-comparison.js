/* ==========================================
   ADQL UI
   Comparison Metrics v2
========================================== */

const match = {

    home: "Brasil",

    away: "Japão",

    competition: "Eliminatórias da Copa do Mundo",

    date: "10 Jun 2026",

    stats: [

        {
            label: "Posse de bola",
            home: 62,
            away: 38,
            suffix: "%"
        },

        {
            label: "Expected Goals (xG)",
            home: 2.12,
            away: 0.26,
            decimals: 2
        },

        {
            label: "Finalizações",
            home: 19,
            away: 5
        },

        {
            label: "Passes certos",
            home: 652,
            away: 418
        },

        {
            label: "Recepções no terço final",
            home: 250,
            away: 81
        }

    ]

};

/* ==========================================
   HEADER
========================================== */

document.querySelector(".match-title").innerHTML =
`
${match.home}
<span>×</span>
${match.away}
`;

document.querySelector(".competition").textContent =
`${match.competition} • ${match.date}`;


/* ==========================================
   BUILD METRICS
========================================== */

const wrapper =
document.querySelector("#comparisonMetrics");

match.stats.forEach(stat => {

    const max = Math.max(stat.home, stat.away);

    const homeWidth = (stat.home / max) * 100;

    const suffix = stat.suffix ?? "";

    const format = (value) => {

        if(stat.decimals){

            return value.toFixed(stat.decimals);

        }

        return value;

    };

    wrapper.innerHTML += `

<div class="metric">

    <div class="metric-header">

        <div class="metric-label">

            ${stat.label}

        </div>

    </div>

    <div class="metric-values">

        <div class="value">

            ${format(stat.home)}${suffix}

        </div>

        <div class="bar">

            <div
                class="bar-fill"
                style="width:${homeWidth}%">

            </div>

        </div>

        <div class="value">

            ${format(stat.away)}${suffix}

        </div>

    </div>

</div>

`;

});