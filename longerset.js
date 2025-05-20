class optimlongerset {
    constructor(pauseBtn, applyBtn, boxEditor, chartCanvas, heatmapCanvas, setSizeInput) {
        this.chart = null;
        this.interval = null;
        this.paused = false;
        this.active = false;
        this.firstRender = true;

        this.optimizerStart = null;
        this.objective = null;
        this.setSize = 12;
        this.optimBotStrategy = null;
        this.optimBestxs = [];
        this.optimizerOut = null;

        this.pauseBtn = pauseBtn;
        this.applyBtn = applyBtn;
        this.boxEditor = boxEditor;
        this.boxMirror = null;
        this.chartCanvas = chartCanvas;
        this.heatmapCanvas = heatmapCanvas;
        this.setSizeInput = setSizeInput;
    }

    render() {
        this.active = true;
        if (this.firstRender) {
            this.applyBtn.onclick = this.reset.bind(this);
            this.pauseBtn.onclick = this.pause.bind(this);
            this.boxEditor.value = "function " + this.objectiveStart.toString().replace("objectiveStart", "objective");
            this.boxMirror = CodeMirror.fromTextArea(
                this.boxEditor,
                {
                    mode: "javascript",
                    theme: "default",
                    indentUnit: 4,
                    tabSize: 4,
                    lineWrapping: true
                }
            );
            this.reset();
            this.firstRender = false;
        }
    }

    hide() {
        this.active = false;
    }

    pause() {
        this.paused = !this.paused;
        if (this.paused) {
            this.pauseBtn.innerHTML = 'Resume';
        } else {
            this.pauseBtn.innerHTML = 'Pause';
        }
    }

    reset() {
        this.setSize = parseInt(this.setSizeInput.value);
        this.optimBestxs = [];
        this.optimizerOut = null;
        this.setupChart();
        eval?.(this.boxMirror.getValue());
        this.objective = objective;
        //this.objective = this.objectiveStart;
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            try {
                if (this.paused) return;
                if (!this.active) return;
                const solution = this.optimizeBotStrategy();

                this.chart.data.labels = this.optimBestxs.map((_, i) => `Gen ${i + 1}`);
                this.chart.data.datasets[0].data = this.optimBestxs.map((r) => (r * 100));
                this.chart.update();

                const heatmapData = [];
                for (let y = 0; y < this.setSize; y++) {
                    for (let x = 0; x < this.setSize; x++) {
                        heatmapData.push({
                            x: x,
                            y: y,
                            v: solution[y * this.setSize+ x]
                        });
                    }
                }

                this.heatmap.data.datasets[0].data = heatmapData;
                this.heatmap.update();
                //this. = JSON.stringify(solution, null, 1);
            } catch (e) {
                clearInterval(this.interval);
                alert('Optimization error: ' + e.message);
                throw e;
            }
        }, 1000);
    }

    setupChart() {
        if (this.chart) this.chart.destroy();
        this.chartCanvas.width = this.chartCanvas.height * this.chartCanvas.parentNode.clientWidth / this.chartCanvas.parentNode.clientHeight;
        this.chart = new Chart(this.chartCanvas.getContext('2d'), {
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
        if (this.heatmap) this.heatmap.destroy();
        this.heatmap = new Chart(this.heatmapCanvas.getContext('2d'), {
            type: 'matrix',
            data: {
                datasets: [{
                    label: 'Solution Heatmap',
                    data: [{ x: 0, y: 0, v: 0 }],
                    backgroundColor: ctx => {
                        // Simple blue-to-red scale
                        const value = ctx.raw.v;
                        const min = 0, max = 4;
                        const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
                        const r = Math.round(255 * 4 * t);
                        const g = Math.round(255 * (1.33 * (t - 0.25)));
                        const b = Math.round(255 * (1.33 * (t - 0.25)));
                        return `rgb(${r},${g},${b})`;
                    },
                    width: ({ chart }) => (chart.chartArea || {}).width / this.setSize - 1,
                    height: ({ chart }) => (chart.chartArea || {}).height / this.setSize - 1,
                    borderWidth: 1,
                    borderColor: '#fff'
                }]
            },
            options: {
                animation: false,
                plugins: {
                    legend: false,
                    tooltip: {
                        callbacks: {
                            title() {
                                return '';
                            },
                            label(context) {
                                const v = context.dataset.data[context.dataIndex];
                                return [' ' + v.v];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: false,
                        min: -0.5,
                        max: this.setSize-0.5,
                        offset: false,
                        ticks: { stepSize: 1 },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: false,
                        min: -0.5,
                        max: this.setSize - 0.5,
                        offset: false,
                        ticks: { stepSize: 1 },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        this.heatmap.update();
        this.chart.update();
    }

    objectiveStart(v) {
        let l = Math.sqrt(v.length);
        let lp1 = l + 1;

        let matrixWin = Array.from({ length: lp1**2 }, (_, i) => i>=l*lp1 ? 0 : 1);
        let matrixEnergy = Array.from({ length: lp1 ** 2 }, () => 0);

        for (let s = l - 1; s >= 0; s--) {
            for (let k = l - 1; k >= 0; k--) {
                let e0 = v[s * l + k];
                let p0 = e0 / (e0 + 1)

                let vx = matrixWin[s * lp1 + k + 1] * p0
                let vy = matrixWin[(s + 1) * lp1 + k] * (1 - p0)
                matrixWin[s * lp1 + k] = vx + vy;

                let ex = matrixEnergy[s * lp1 + k + 1] * p0
                let ey = matrixEnergy[(s + 1) * lp1 + k] * (1 - p0)
                matrixEnergy[s * lp1 + k] = e0 - 1 + ex + ey;
            }
        }

        if (matrixEnergy[0] < 0) {
            return -matrixWin[0]
        }
        return 1000 * matrixEnergy[0] - matrixWin[0]
    }

    optimizeBotStrategy() {
        let l = this.setSize;
        var x0 = Array(l**2);
        var xdim = Array(l**2);
        var x0 = Array.from({ length: l ** 2 }, () => 1);
        x0[l ** 2 - 1] = 3;
        if (this.optimizerOut) {
            x0 = this.optimizerOut;
        }
        var xdim = Array.from({ length: l ** 2 }, () => optimjs.Real(0, 4.0));


        var optimizer = optimjs.OMGOptimizer(xdim, 0, 0.05);
        optimizer.tell([x0], [this.objective(x0)]);

        // optimization loop specified manually. The optimization runs for 256 iterations.
        for (let iter = 0; iter < 1000; iter++) {
            var x = optimizer.ask();
            var y = this.objective(x)
            optimizer.tell([x], [y])
        }
        

        //var m0 = Array.from({ length: l }, () => Array(l).fill(0));
        //for (let s = 0; s < l; s++) {
        //    for (let k = 0; k < l; k++) {
        //        let p = optimizer.best_x[s * l + k];
        //        m0[s][k] = p
        //    }
        //}

        this.optimBestxs.push(-this.objective(optimizer.best_x));
        this.optimizerOut = optimizer.best_x;
        return optimizer.best_x
    }
}