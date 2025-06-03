class fullrules {
    constructor(pauseBtn, applyBtn, boxEditor, chartCanvas, botNumberEditor) {
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
        this.botNumber = 1;
        this.botNumberEditor = botNumberEditor;
        this.botNumberEditor.value = this.botNumber;
        this.maxEnergy = 100;
        this.RoundPerTick = 10000;
        this.dummyPointPerMatch = 223;
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
        this.botNumber = parseInt(this.botNumberEditor.value);
        this.matchStates = Array(this.botNumber).fill().map((_) => ({
            e: this.maxEnergy,
            point: 0,
            pointd: 0,
            game: 0,
            gamed: 0,
            set: 0,
            setd: 0,
            match: 0,
            matchd: 0,
            energyWasted: 0,
            roundTotal: 0
        }));
        console.log(this.matchStates);
        this.totalPointsPlayed = 0;
        this.bestSetWinRatio = 0;
        this.setupChart();
        eval?.(this.boxMirror.getValue());
        this.strategy = strategy;
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            try {
                if (this.paused) return;
                if (!this.active) return;
                const now = Date.now();
                this.simulationTick();

                let toChart = this.setWinRatios;
                //toChart = this.wastedEnergy;
                //let toChart = this.roundPerMatch;
                const labels = toChart.map(r => `Bot ${r.bot}`);
                const bars = toChart.map(r => (r.bar));
                const ciLows = toChart.map((r, i) => ({ x: i, y: r.ciLow}));
                const ciHighs = toChart.map((r, i) => ({ x: i, y: r.ciHigh}));


                this.chart.data.labels = labels;
                this.chart.data.datasets[0].data = bars;
                this.chart.data.datasets[1].data = ciLows;
                this.chart.data.datasets[2].data = ciHighs;
                this.chart.options.animation = false;
                this.chart.update();

                const optimizeDuration = Date.now() - now;
                if (optimizeDuration > 400) {
                    this.RoundPerTick = this.RoundPerTick / 1.2;
                }
                if (optimizeDuration < 100) {
                    this.RoundPerTick = this.RoundPerTick * 1.2;
                }
                console.log('Optimization duration:', optimizeDuration, 'ms, iter', this.RoundPerTick);
            } catch (e) {
                this.paused = true;
                alert('error: ' + e.message);
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

    strategyStart(botID, matchState) {
        let e = matchState.e;
        let ed = matchState.ed;
        let point = matchState.point;
        let pointd = matchState.pointd;
        let set = matchState.set;
        let setd = matchState.setd;
        let match = matchState.match;
        let matchd = matchState.matchd;
        return (1.3 + 0.02 * botID);
    }

    playRound(botID, matchState) {
        let e = matchState.e;
        let ed = matchState.ed;
        let point = matchState.point;
        let pointd = matchState.pointd;
        let game = matchState.game;
        let gamed = matchState.gamed;
        let set = matchState.set;
        let setd = matchState.setd;
        let match = matchState.match;
        let matchd = matchState.matchd;

        let ePlayed = Math.min(this.strategy(botID, matchState), e);
        let ePlayedd = Math.min(1 + this.maxEnergy / this.dummyPointPerMatch, ed);
        let totalPlayed = ePlayed + ePlayedd;
        if (totalPlayed == 0) {
            totalPlayed = 2;
            ePlayed = 1;
        }

        e = Math.min(e - ePlayed +1, this.maxEnergy);
        ed = Math.min(ed - ePlayedd +1, this.maxEnergy);
        const rand = Math.random() * totalPlayed;
        if (rand < ePlayed) {
            point++;
        } else {
            pointd++;
        }
        if (point >= 4) {
            game++;
            point = 0;
            pointd = 0;
        }
        if (pointd >= 4) {
            gamed++;
            point = 0;
            pointd = 0;
        }
        if (game >= 6) {
            set++;
            game = 0;
            gamed = 0;
        }
        if (gamed >= 6) {
            setd++;
            game = 0;
            gamed = 0;
        }
        matchState.set = set;
        matchState.setd = setd;
        matchState.e = e;
        matchState.ed = ed;
        matchState.point = point;
        matchState.pointd = pointd;
        matchState.game = game;
        matchState.gamed = gamed;
        if (set >= 3) {
            match++;
            this.MatchEnd(matchState);
        }
        if (setd >= 3) {
            matchd++;
            this.MatchEnd(matchState);
        }

        matchState.match = match;
        matchState.matchd = matchd;
        matchState.roundTotal += 1;
    }

    MatchEnd(matchState) {
        matchState.energyWasted += matchState.e - 1
        matchState.e = this.maxEnergy;
        matchState.ed = this.maxEnergy;
        matchState.set = 0;
        matchState.setd = 0;
    }

    simulationTick() {
        //this.pause()
        this.setWinRatios = [];
        this.wastedEnergy = [];
        this.roundPerMatch = [];
        for (let i = 0; i < this.botNumber; i++) {
            let matchState = this.matchStates[i];
            for (let step = 0; step < this.RoundPerTick; step++) {
                this.playRound(i, matchState);
                //if (i == 1) {
                //    console.log(matchState.e, matchState.point);
                //}
            }
            let match = matchState.match;
            let matchd = matchState.matchd;

            const n = Math.max(match + matchd,1);
            const ratio = match / n;
            const z = 1.645;
            const se = Math.sqrt(ratio * (1 - ratio) / n);
            const ciLow = Math.max(0, ratio - z * se);
            const ciHigh = Math.min(1, ratio + z * se);
            
            this.setWinRatios.push({
                bot: i,
                bar : ratio *100,
                ciLow: ciLow *100,
                ciHigh: ciHigh * 100
            });

            const energyWasted = matchState.energyWasted / n
            this.wastedEnergy.push({
                bot: i,
                bar : energyWasted
            });
            const roundPerMatch = matchState.roundTotal / n
            this.roundPerMatch.push({
                bot: i,
                bar: roundPerMatch
            });
            console.log(matchState.roundTotal/n);
        }
    }
}