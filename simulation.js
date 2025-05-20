let N = 50;
let chartStepPerTick = 1000;
let score;
let optimSetSize = 3;
let chartBotStrategyAux = null;
let chart, chartInterval;
let chartPaused = false;
let simInterval;
let chartActive = false;

function chartRender() {
    chartActive = true;
    if (!score) {
        const applyStrategyBtn = document.getElementById('chartApply');
        const pauseBtn = document.getElementById('chartPause');
        applyStrategyBtn.onclick = chartReset;
        pauseBtn.onclick = chartPause;
        window.chartStrategyBox = CodeMirror.fromTextArea(
            document.getElementById('strategyFunc'),
            {
                mode: "javascript",
                theme: "default",
                indentUnit: 4,
                tabSize: 4,
                lineWrapping: true
            }
        );
        chartReset();
    }
}

function chartHide() {
    chartActive = false;
}

function chartPause() {
    chartPaused = !chartPaused;
    const pauseBtn = document.getElementById('chartPause');
    if (chartPaused) {
        pauseBtn.innerHTML = 'Resume';
    } else {
        pauseBtn.innerHTML = 'Pause';
    }
}


function chartReset() {
    score = {
        botPoints: Array(N).fill(0),
        dummyPoints: Array(N).fill(0),
        botSets: Array(N + 1).fill(0),
        dummySets: Array(N + 1).fill(0),
        energy: Array(N).fill(1),
        setWinRatios: [],
        totalPointsPlayed: 0,
        bestSetWinRatio: null
    };
    setupChart();

    eval(window.chartStrategyBox.getValue());
    chartBotStrategyAux = strategy;

    tickCount = 0;
    lastTickTime = Date.now();
    startTime = Date.now();

    console.log('Simulation start');
    if (chartInterval) clearInterval(simInterval);
    chartInterval = setInterval(() => {
        if (chartPaused) return;
        if (!chartActive) return;
        try {
            simulateStep();
            const now = Date.now();
            const animation = now - startTime < 60000;
            updateUI(animation);

            // Count ticks
            tickCount++;

            if (now - lastTickTime >= 1000) {
                document.getElementById('ticksPerSecond').textContent =
                    `fps:${tickCount}`;
                tickCount = 0;
                lastTickTime = now;
            }
        }
        catch (e) {
            clearInterval(chartInterval);
            alert('Simulation error: ' + e.message);
            throw e;
            return;
        }
    }, 200);
}

function setupChart() {
    const ctx = document.getElementById('ratioChart').getContext('2d');
    if (chart) return;
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: N }, (_, i) => `Bot ${i}`),
            datasets: [
                {
                    label: 'Set Win Ratio (%)',
                    type: 'bar',
                    data: [],
                    backgroundColor: 'rgba(54, 162, 235, 0.7)',
                    order: 1
                },
                {
                    label: 'CI Lower Bound',
                    type: 'scatter',
                    data: [],
                    backgroundColor: 'rgba(255, 99, 132, 1)',
                    pointRadius: 4,
                    order: 2
                },
                {
                    label: 'CI Upper Bound',
                    type: 'scatter',
                    data: [],
                    backgroundColor: 'rgba(75, 192, 192, 1)',
                    pointRadius: 4,
                    order: 2
                }
            ]
        },
        options: {
            animation: true,
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'Win Ratio (%)' }
                }
            },
            plugins: {
                legend: { display: true }
            }
        }
    });
    //const tomap = simulation.computeTheoreticalWinRatios(simulation.m);
    //const theoretical = tomap.map((r) => (r * 100));
    //chart.data.datasets[3].data = theoretical;
    chart.update();
}

function updateUI(animation) {
    //document.getElementById('totalPointsPlayed').textContent = `Total Rounds Played: ${score.totalPointsPlayed}`;
    const labels = score.setWinRatios.map(r => `Bot ${r.bot}`);
    const ratios = score.setWinRatios.map(r => (r.ratio * 100));
    const ciLows = score.setWinRatios.map((r, i) => ({ x: i, y: r.ciLow * 100 }));
    const ciHighs = score.setWinRatios.map((r, i) => ({ x: i, y: r.ciHigh * 100 }));


    chart.data.labels = labels;
    chart.data.datasets[0].data = ratios;
    chart.data.datasets[1].data = ciLows;
    chart.data.datasets[2].data = ciHighs;
    chart.options.animation = animation;
    chart.update();
    // Update best set win ratio display
    let ratio = score.bestSetWinRatio;
    document.getElementById('bestSetWinRatio').textContent =
        `Best Set Win Ratio: ${(ratio.ratio * 100).toFixed(1)}% [${(ratio.ciLow * 100).toFixed(1)}-${(ratio.ciHigh * 100).toFixed(1)}]`;
}

function simulateStep() {
    for (let step = 0; step < chartStepPerTick; step++) {
        for (let i = 0; i < N; i++) {
            
            score.energy[i] = Math.min(score.energy[i] + 1, 10000);
            const usedBot = Math.min(score.energy[i], chartBotStrategyAux(i, score.energy[i], score.botPoints[i], score.dummyPoints[i]));
            const used0 = 1;

            score.energy[i] -= usedBot;
            
            const total = usedBot + used0;
            if (total > 0) {
                const rand = Math.random() * total;
                if (rand < usedBot) {
                    score.botPoints[i]++;
                } else {
                    score.dummyPoints[i]++;
                }
                score.totalPointsPlayed++;
            }

            const bBot = score.botPoints[i];
            const b0 = score.dummyPoints[i];
            if (bBot >= 3 || b0 >= 3) {
                if (bBot > b0) {
                    score.botSets[i]++;
                } else {
                    score.dummySets[i]++;
                }
                score.botPoints[i] = 0;
                score.dummyPoints[i] = 0;
            }
        }
    }
    

    // Calculate win ratios and 90% CI for each bot1..N
    score.setWinRatios = [];
    for (let i = 0; i < N; i++) {
        const bset = score.botSets[i];
        const dset = score.dummySets[i];
        const n = bset + dset;
        let ratio = 0, ciLow = 0, ciHigh = 0;
        if (n > 0) {
            ratio = bset / n;
            const z = 1.645;
            const se = Math.sqrt(ratio * (1 - ratio) / n);
            ciLow = Math.max(0, ratio - z * se);
            ciHigh = Math.min(1, ratio + z * se);
        }
        score.setWinRatios.push({
            bot: i,
            ratio,
            ciLow,
            ciHigh
        });
    }
    // After the for loop that fills setWinRatios:
    let best = score.setWinRatios[0];
    for (let i = 0; i < score.setWinRatios.length; i++) {
        if (score.setWinRatios[i].ciLow > best.ciLow) {
            best = score.setWinRatios[i];
        }
    }
    if (score.totalPointsPlayed > 1000) {
        score.bestSetWinRatio = best;
    }
}
