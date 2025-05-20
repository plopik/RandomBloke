let setSize = 3;
let optimBotStrategy = null;
let optimBestxs = [];
let optimizerOut = null;
let optimChart = null;
let optimInterval = null;
let optimPaused = false;
let optimizerStart = null;
let optimObjective = null;
let optimActive = false;

function optimizerRender() {
    optimActive = true;
    if (!optimizerOut) {
        const applyStrategyBtn = document.getElementById('optimApply');
        const pauseBtn = document.getElementById('optimPause');
        applyStrategyBtn.onclick = optimReset;
        pauseBtn.onclick = optimPause;
        window.optimBoxEditor = CodeMirror.fromTextArea(
            document.getElementById('optimObjective'),
            {
                mode: "javascript",
                theme: "default",
                indentUnit: 4,
                tabSize: 4,
                lineWrapping: true
            }
        );
        optimReset();
    }
}

function optimHide() {
    optimActive = false;
}

function optimPause() {
    optimPaused = !optimPaused;
    const pauseBtn = document.getElementById('optimPause');
    if (optimPaused) {
        pauseBtn.innerHTML = 'Resume';
    } else {
        pauseBtn.innerHTML = 'Pause';
    }
}

function optimReset() {
    optimBestxs = [];
    optimizerOut = null;

    optimSetupChart();

    eval(window.optimBoxEditor.getValue());
    optimObjective = objective;

    if (optimInterval) clearInterval(optimInterval);
    optimInterval = setInterval(() => {
        try {
            if (optimPaused) return;
            if (!optimActive) return;
            const solution = optimizeBotStrategy();
            optimChart.data.labels = optimBestxs.map((_, i) => `Gen ${i + 1}`);
            optimChart.data.datasets[0].data = optimBestxs.map((r) => (r * 100));
            optimChart.update();
            document.getElementById('optimizerSolution').textContent = JSON.stringify(solution, null, 1);
        }
        catch (e) {
            clearInterval(optimInterval);
            alert('Optimization error: ' + e.message);
            throw e;
        }
    }, 1000);
}

function optimSetupChart() {
    var ctx = document.getElementById('optimizerCanvas')
    ctx.width = ctx.height * ctx.parentNode.clientWidth / ctx.parentNode.clientHeight;

    optimChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Optimized Value',
                data: [],
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                pointRadius: 4
            }]
        },
        options: {
            animation: false,
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
    optimChart.update();
}

function optimizeBotStrategy() {
    console.log("Optimizing bot strategy...");
    // objective that needs to be minimized

    var x0 = Array(setSize * setSize);
    var xdim = Array(setSize * setSize);
    var lastx = Array.from({ length: setSize }, () => Array(setSize).fill(1));
    if (optimizerOut) {
        lastx = optimizerOut;
    }
    for (let s = 0; s < setSize; s++) {
        for (let k = 0; k < setSize; k++) {
            //x0[s * setSize + k] = m[1][s][k];
            xdim[s * setSize + k] = optimjs.Real(0, 3.0);
            x0[s * setSize + k] = lastx[s][k];
        }
    }


    var optimizer = optimjs.OMGOptimizer(xdim, n_random_starts = 0);
    optimizer.tell([x0], [optimObjective(x0)]);

    // optimization loop specified manually. The optimization runs for 256 iterations.
    for (var iter = 0; iter < 1000; iter++) {
        var x = optimizer.ask();
        var y = optimObjective(x)
        optimizer.tell([x], [y])
    }

    var m0 = Array.from({ length: setSize }, () => Array(setSize).fill(0));
    for (let s = 0; s < setSize; s++) {
        for (let k = 0; k < setSize; k++) {
            p = optimizer.best_x[s * setSize + k];
            m0[s][k] = p
        }
    }

    optimBestxs.push(-optimObjective(optimizer.best_x));
    optimizerOut = m0;
    return m0
}
