var stats = new Statistics([],[],{ suppressWarnings: false });
class energyPool {
    constructor(pauseBtn, applyBtn, boxEditor, chartCanvas, botNumberEditor, testCanvas) {
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
        this.testCanvas = testCanvas;
        this.botNumber = 10;
        this.botNumberEditor = botNumberEditor;
        this.botNumberEditor.value = this.botNumber;
        this.setPerMatch = 4;
        this.pointPerSet = 4;
        //this.maxEnergy = (this.setPerMatch * 2 - 1) * (this.pointPerSet*2-1);
        this.maxEnergy =38;
        this.RoundPerTick = 100000;
        this.dummyPointPerMatch = 271.4;
        this.testNumber = 2000;
        this.tablePrecision = 3;
        this.fwvData = new Map();
        this.w0min = 0.95;
        this.w0max = 0.05;
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

    w0(e) {
        const pps = this.pointPerSet - 1
        const eRound = e / (pps*2+1);
        const p = eRound / (1 + eRound);
        //console.log("w10", eRound, p);
        if (p <= this.w0max) {
            return 0
        }
        if (p >= this.w0min) {
            return 0.999;
        }
        let w = stats.binomialCumulativeValue(pps, pps * 2 + 1, p);
        if (w < 0.01) {
            //console.log(`min w0(${e}) = ${w} for p ${p}`);
            this.w0min = Math.min(this.w0min || 1, p);
            return 0.999
        }
        if (w > 0.99) {
            //console.log(`max w0(${e}) = ${w} for p ${p}`);
            this.w0max = Math.max(this.w0max || 0, p);
            return 0
        }
        return 1-w
    }

    fwvRaw(s, sd, pt, ptd) {
        this.callNb++;

        if (pt <= 0) {
            return this.fwvRaw(s - 1, sd, this.pointPerSet, this.pointPerSet);
        }
        if (ptd <= 0) {
            return this.fwvRaw(s, sd - 1, this.pointPerSet, this.pointPerSet);
        }
        if (s == 1 && sd == 1 && pt + ptd > 2) {
            return this.fwvRaw(1, 1, 1, 1);
        }


        let data = this.fwvData.get(`w-${s}-${sd}-${pt}-${ptd}`);
        if (data) {
            return data;
        }
        //console.log(`RAW (${s}, ${sd}, ${pt}, ${ptd})`);

        if (s == 1 && sd == 1) {
            data = Array.from({ length: (this.maxEnergy + 1) * this.tablePrecision }, (_, e) => this.w0(e / this.tablePrecision))
            //console.log("data wO", data)
        }
        if (s <= 0) {
            data = Array.from({ length: (this.maxEnergy + 1) * this.tablePrecision }, () => 1)
        }
        if (sd <= 0) {
            data = Array.from({ length: (this.maxEnergy + 1) * this.tablePrecision }, () => 0)
        }

        if (s > 0 && sd > 0 && s + sd > 2) {
            data = [];
            let dataV = [];
            let fwb = this.fwvRaw(s, sd, pt, ptd - 1);
            let fwr = this.fwvRaw(s, sd, pt - 1, ptd);
            for (let e = 0; e <= this.maxEnergy * this.tablePrecision; e++) {
                let maxv = 0;
                let maxw = 0;
                for (let i = 0; i <= this.testNumber; i++) {
                    const v = i * e / this.testNumber;
                    const v2 = v / this.tablePrecision;
                    const p = v2 / (1 + v2);
                    const pm1 = 1 - p;
                    const ev = (e - v);
                    const efloor = Math.floor(ev);
                    const eceil = Math.ceil(ev);
                    let wb = fwb[efloor]
                    let wr = fwr[efloor]
                    if (efloor < eceil) {
                        wb = fwb[eceil] * (ev - efloor) + wb * (eceil - ev);
                        wr = fwr[eceil] * (ev - efloor) + wr * (eceil - ev);
                        //wb = Math.min(wb, fwb[eceil]);
                        //wr = Math.min(wr, fwr[eceil]);
                    }
                    const w = p * wr + pm1 * wb
                    if (w > maxw) {
                        maxw = w;
                        maxv = v2;
                    }
                }
                data.push(maxw);
                dataV.push(maxv);
            }
            this.fwvData.set(`v-${s}-${sd}-${pt}-${ptd}`, dataV);
        }
        this.fwvData.set(`w-${s}-${sd}-${pt}-${ptd}`, data);

        return data;
    }

    fw(s, sd, pt, ptd, e) {
        const eprecision = this.tablePrecision * e;
        const efloor = Math.floor(eprecision)
        const eceil = Math.ceil(eprecision)

        let data = this.fwvRaw(s, sd, pt, ptd);
        if (eceil == efloor) {
            return data[efloor];
        }
        return data[efloor] * (eprecision - efloor) + data[eceil] * (eceil - eprecision);
        
    }

    fv(s, sd, pt, ptd, e) {
        let data = this.fwvData.get(`v-${s}-${sd}-${pt}-${ptd}`);
        if (data && s + sd > 2) {
            const eprecision = this.tablePrecision * e;
            const efloor = Math.floor(eprecision)
            const eceil = Math.ceil(eprecision)
            if (eceil == efloor) {
                return data[efloor];
            }
            return data[eceil] * (eprecision - efloor) + data[efloor] * (eceil - eprecision);
        }
        let pointToPlay = pt + ptd - 1;
        return e / pointToPlay;
    }

    test() {
        this.callNb = 0;
        var chartW = [];
        const s = this.setPerMatch; // sets
        const sd = this.setPerMatch; // sets dummy
        //const pt = 10; // points
        //const ptd = 10; // points dummy
        let w = this.fw(s, sd, this.pointPerSet, this.pointPerSet, this.maxEnergy)
        console.log(`Tested ${this.callNb} calls for max energy ${this.maxEnergy} w ${w}`);

        const color1 = 'rgba(54, 162, 235, 0.7)';
        const color2 = 'rgba(255, 99, 132, 1)';
        for (let s = 1; s <= this.setPerMatch; s++) {
            for (let sd = 1; sd <= this.setPerMatch; sd++) {
                for (let ptd = this.pointPerSet; ptd >= 1; ptd--) {
                    var chartV = [];
                    let color = (s + sd) % 2 == 0 ? color1 : color2;
                    for (let pt = this.pointPerSet; pt >= 1; pt--) {
                        for (let e = 0; e <= this.maxEnergy; e += 1) {
                            //let pointToPlay = (s + sd - 2) * (this.pointPerSet * 2 - 1) + pt + ptd - 1;
                            let w = this.fw(s, sd, pt, ptd, e)
                            let v = this.fv(s, sd, pt, ptd, e)// pointToPlay * e;
                            let vs = v.toFixed(2);
                            let x = e + (this.pointPerSet - pt) * this.maxEnergy * 1.2 + (this.setPerMatch - s) * this.pointPerSet * this.maxEnergy * 1.2;
                            let y = Math.min(v, 4) + 5 * (ptd - 1) + (sd - 1) * 5 * this.pointPerSet;
                            let yw = w *3+ 4 * (ptd - 1) + (sd - 1) * 4 * this.pointPerSet;
                            chartV.push({
                                x, y, v: `${this.pointPerSet - pt}-${this.pointPerSet - ptd}-${e}: ${vs}`
                                //x, y: yw, v: `${this.pointPerSet - pt}-${this.pointPerSet - ptd}-${e}: ${(100*w).toFixed(1)}`
                            });
                        }
                    }
                    this.chartTest.data.datasets.push({
                        type: 'scatter',
                        data: chartV,
                        backgroundColor: color,// 'rgba(255, 99, 132, 1)',
                        pointRadius: 2,
                    })
                }
            }
        }
        //this.chartTest.data.datasets[0].data = chartW;
        //this.chartTest.data.datasets[1].data = chartV;
        //this.chartTest.data.datasets[0].label = `Wr1 when e: ${em}`;
        //this.chartTest.data.datasets[0].label = `W(e)`;
        //this.chartTest.data.labels = labels;
        this.chartTest.update();
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
        this.totalPointsPlayed = 0;
        this.bestSetWinRatio = 0;
        this.setupChart();
        eval?.(this.boxMirror.getValue());
        this.strategy = strategy;
        this.test();
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            try {
                if (this.paused) return;
                if (!this.active) return;
                const now = Date.now();
                this.simulationTick();

                let toChart = this.setWinRatios;
                //toChart = this.wastedEnergy;
                //toChart = this.roundPerMatch;
                const labels = toChart.map(r => `Bot ${r.bot}`);
                const bars = toChart.map(r => (r.bar));
                const ciLows = toChart.map((r, i) => ({ x: i, y: r.ciLow }));
                const ciHighs = toChart.map((r, i) => ({ x: i, y: r.ciHigh }));


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
        if (this.chartTest) this.chart.destroy();
        this.testCanvas.width = this.testCanvas.height * this.testCanvas.parentNode.clientWidth / this.testCanvas.parentNode.clientHeight;
        this.chartTest = new Chart(this.testCanvas.getContext('2d'), {
            type: 'scatter',
            data: {
                datasets: []
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
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            title() {
                                return '';
                            },
                            label(context) {
                                const v = context.dataset.data[context.dataIndex];
                                return v.v;
                            }
                        }
                    },
                    interaction: {
                        //intersect: false,
                        mode: 'nearest',
                    },
                },
                scales: {
                    x: {
                        display: false,
                        offset: false,
                        ticks: { stepSize: 1 },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: false,
                        offset: false,
                        ticks: { stepSize: 1 },
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
        this.chartTest.update();

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
        if (botID > 0) {
            return 1 + botID * 0.1
        }
        if (botID == 0) {
            return this.fv(this.setPerMatch - set, this.setPerMatch - setd, this.pointPerSet - point, this.pointPerSet - pointd, e);
        }
        let pointToPlay = (this.setPerMatch*2 - set - setd) * (this.pointPerSet * 2 - 1) - point - pointd;
        return e/pointToPlay;
    }

    playRound(botID, matchState) {
        let e = matchState.e;
        let ed = matchState.ed;
        let point = matchState.point;
        let pointd = matchState.pointd;
        let set = matchState.set;
        let setd = matchState.setd;
        let match = matchState.match;
        let matchd = matchState.matchd;

        let ePlayed = Math.min(this.strategy(botID, matchState), e);
        //let ePlayedd = Math.min(1 + this.maxEnergy / this.dummyPointPerMatch, ed);
        let ePlayedd =1

        let totalPlayed = ePlayed + ePlayedd;
        if (totalPlayed == 0) {
            totalPlayed = 2;
            ePlayed = 1;
        }

        e = e - ePlayed
        //ed = Math.min(ed - ePlayedd, this.maxEnergy);
        const rand = Math.random() * totalPlayed;
        if (rand < ePlayed) {
            point++;
        } else {
            pointd++;
        }
        if (point >= this.pointPerSet) {
            set++;
            point = 0;
            pointd = 0;
        }
        if (pointd >= this.pointPerSet) {
            setd++;
            point = 0;
            pointd = 0;
        }
        matchState.e = e;
        matchState.ed = ed;
        matchState.point = point;
        matchState.pointd = pointd;
        matchState.set = set
        matchState.setd = setd
        if (set >= this.setPerMatch) {
            match++;
            this.MatchEnd(matchState);
        }
        if (setd >= this.setPerMatch) {
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

            const n = Math.max(match + matchd, 1);
            const ratio = match / n;
            const z = 1.645;
            const se = Math.sqrt(ratio * (1 - ratio) / n);
            const ciLow = Math.max(0, ratio - z * se);
            const ciHigh = Math.min(1, ratio + z * se);

            this.setWinRatios.push({
                bot: i,
                bar: ratio * 100,
                ciLow: ciLow * 100,
                ciHigh: ciHigh * 100
            });

            const energyWasted = matchState.energyWasted / n
            this.wastedEnergy.push({
                bot: i,
                bar: energyWasted
            });
            const roundPerMatch = matchState.roundTotal / n
            this.roundPerMatch.push({
                bot: i,
                bar: roundPerMatch
            });
            //console.log(matchState.roundTotal / n);
        }
    }
}