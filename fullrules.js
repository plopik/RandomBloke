class fullrules {
    constructor(pauseBtn, applyBtn, boxEditor, chartCanvas) {
        this.chart = null;
        this.interval = null;
        this.paused = false;
        this.active = false;
        this.firstRender = true;
        this.pauseBtn = pauseBtn;
        this.applyBtn = applyBtn;
        this.boxEditor = boxEditor;
        this.boxMirror = null;
        this.chartCanvas = chartCanvas;
        this.botNumber = 100;
    }

    render() {
        this.active = true;
        if (this.firstRender) {
            this.applyBtn.onclick = this.reset.bind(this);
            this.pauseBtn.onclick = this.pause.bind(this);
            this.boxEditor.value = "function " + this.strategyStart.toString().replace("strategyStart", "strategy");
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
        this.pauseBtn.innerHTML = (this.paused) ? 'Resume' : 'Pause';
    }

    reset() {
        this.energy = Array(this.botNumber).fill(0);
        this.botPoints = Array(this.botNumber).fill(0);
        this.dummyPoints = Array(this.botNumber).fill(0);
        this.botSets = Array(this.botNumber).fill(0);
        this.dummySets = Array(this.botNumber).fill(0);
        this.setWinRatios = [];
        this.totalPointsPlayed = 0;
        this.bestSetWinRatio = null;
        //this.botNumber = parseInt(this.setBotNumber.value);
        this.setupChart();
        eval?.(this.boxMirror.getValue());
        this.strategy = strategy;
        //this.objective = this.objectiveStart;
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            try {
                if (this.paused) return;
                if (!this.active) return;
                this.simulationTick();
                const labels = this.setWinRatios.map(r => `Bot ${r.bot}`);
                const ratios = this.setWinRatios.map(r => (r.ratio * 100));
                const ciLows = this.setWinRatios.map((r, i) => ({ x: i, y: r.ciLow * 100 }));
                const ciHighs = this.setWinRatios.map((r, i) => ({ x: i, y: r.ciHigh * 100 }));


                this.chart.data.labels = labels;
                this.chart.data.datasets[0].data = ratios;
                this.chart.data.datasets[1].data = ciLows;
                this.chart.data.datasets[2].data = ciHighs;
                this.chart.options.animation = false;
                this.chart.update();
            } catch (e) {
                clearInterval(this.interval);
                alert('error: ' + e.message);
                throw e;
            }
        }, 200);
    }

    setupChart() {
        if (this.chart) this.chart.destroy();
        this.chartCanvas.width = this.chartCanvas.height * this.chartCanvas.parentNode.clientWidth / this.chartCanvas.parentNode.clientHeight;
        this.chart = new Chart(this.chartCanvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Array.from({ length: this.botNumber }, (_, i) => `Bot ${i}`),
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
        this.chart.update();
    }

    strategyStart() {
        return 1;
    }

    simulationTick() {
        for (let step = 0; step < 100; step++) {
            for (let i = 0; i < this.botNumber; i++) {
                this.energy[i] = Math.min(this.energy[i] + 1, 10000);
                const usedBot = Math.min(this.energy[i], this.strategy(i, this.energy[i], this.botPoints[i], this.dummyPoints[i]));
                const used0 = 1;

                this.energy[i] -= usedBot;

                const total = usedBot + used0;
                if (total > 0) {
                    const rand = Math.random() * total;
                    if (rand < usedBot) {
                        this.botPoints[i]++;
                    } else {
                        this.dummyPoints[i]++;
                    }
                    this.totalPointsPlayed++;
                }

                const bBot = this.botPoints[i];
                const b0 = this.dummyPoints[i];
                if (bBot >= 3 || b0 >= 3) {
                    if (bBot > b0) {
                        this.botSets[i]++;
                    } else {
                        this.dummySets[i]++;
                    }
                    this.botPoints[i] = 0;
                    this.dummyPoints[i] = 0;
                }
            }
        }
        this.setWinRatios = [];
        for (let i = 0; i < N; i++) {
            const bset = this.botSets[i];
            const dset = this.dummySets[i];
            const n = bset + dset;
            let ratio = 0, ciLow = 0, ciHigh = 0;
            if (n > 0) {
                ratio = bset / n;
                const z = 1.645;
                const se = Math.sqrt(ratio * (1 - ratio) / n);
                const ciLow = Math.max(0, ratio - z * se);
                const ciHigh = Math.min(1, ratio + z * se);
            
                this.setWinRatios.push({
                    bot: i,
                    ratio,
                    ciLow,
                    ciHigh
                });
            }
        }
    }
}