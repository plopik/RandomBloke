class optimlongerset {
    constructor(pauseBtn, applyBtn, boxEditor, chartCanvas, heatmapCanvas, setSizeInput, tempInput, pressureInput, times2Input, passingmapCanvas) {
        this.chart = null;
        this.interval = null;
        this.paused = false;
        this.active = false;
        this.firstRender = true;

        this.optimizerStart = null
        this.setSize = 128;
        this.optimIter = 1000;
        this.optimBotStrategy = null;
        this.optimBestxs = [];
        this.optimizerOut = null;
        this.temp = 0;
        this.pressure = 0;
        this.derStep = 1;
        this.correctE = 0;
        this.derStable = null;
        this.derLast = null;

        this.pauseBtn = pauseBtn;
        this.applyBtn = applyBtn;
        //this.boxEditor = boxEditor;
        //this.boxMirror = null;;
        //this.objective = null;
        this.chartCanvas = chartCanvas;
        this.heatmapCanvas = heatmapCanvas;
        this.setSizeInput = setSizeInput;
        this.tempInput = tempInput;
        this.pressureInput = pressureInput;
        this.times2Input = times2Input;
        this.passingmapCanvas = passingmapCanvas;
    }

    render() {
        this.active = true;
        if (this.firstRender) {
            this.applyBtn.onclick = this.reset.bind(this);
            this.times2Input.onclick = this.times2.bind(this);
            this.pauseBtn.onclick = this.pause.bind(this);
            //this.boxEditor.value = "function " + this.objectiveStart.toString().replace("objectiveStart", "objective");
            //this.boxMirror = CodeMirror.fromTextArea(
            //    this.boxEditor,
            //    {
            //        mode: "javascript",
            //        theme: "default",
            //        indentUnit: 4,
            //        tabSize: 4,
            //        lineWrapping: true
            //    }
            //);
            this.setSizeInput.value = this.setSize;
            this.tempInput.value = this.temp;
            this.pressureInput.value = this.pressure;
            this.reset();
            this.firstRender = false;
        }
    }

    times2() {
        this.setSizeInput.value = this.setSize * 2;
        this.reset();
    }

    hide() {
        this.active = false;
    }

    pause() {

        this.temp = parseInt(this.tempInput.value);
        this.pressure = parseInt(this.pressureInput.value);
        this.paused = !this.paused;
        if (this.paused) {
            this.pauseBtn.innerHTML = 'Resume';
        } else {
            this.pauseBtn.innerHTML = 'Pause';
        }
    }

    resize(o, size, newSize) {
        let x = Array.from({ length: newSize ** 2 }, (_, k) => 1);
        if (o == null || true) {
            return x
        }
        for (let i = 0; i < newSize; i++) {
            for (let j = 0; j < newSize; j++) {
                const oi = Math.floor(i * size / newSize);
                const oj = Math.floor(j * size / newSize);
                let p = o[oi * size + oj];
                x[i * newSize + j] = Math.max(p, 0.01);
            }
        }
        return x;
    }

    reset() {
        console.log("reset optimizer2")
        let oldSize = this.setSize;
        this.setSize = parseInt(this.setSizeInput.value);
        this.temp = parseInt(this.tempInput.value);
        this.pressure = parseInt(this.pressureInput.value);
        if (oldSize != this.setSize || this.optimizerOut == null) {
            this.optimBestxs = [];
            this.optimizerOut = this.resize(this.optimizerOut, oldSize, this.setSize);
            if (this.heatmap || this.passingMap) {
                this.heatmap.destroy()
                this.passingMap.destroy()
                this.heatmap = null;
                this.passingMap = null;
            }
        }
        this.derStep = 1;
        this.derLast = Array.from({ length: this.setSize ** 2 }, () => 0);
        this.derStable = Array.from({ length: this.setSize ** 2 }, () => 0);
        for (let i = 0; i < this.setSize; i++) {
            for (let j = 0; j < this.setSize; j++) {
                if (i >= j && this.optimizerOut[i * this.setSize + j] == 0) {
                    this.optimizerOut[i * this.setSize + j] = 10 ** -100;
                }
            }
        }

        let lp1 = this.setSize + 1;
        this.matrixWin = Array.from({ length: lp1 ** 2 }, (_, i) => i >= this.setSize * lp1 ? 0 : 1);
        this.matrixEnergy = Array.from({ length: lp1 ** 2 }, () => 0);
        this.setupChart();
        //eval?.(this.boxMirror.getValue());
        //this.objective = this.objectiveStart;
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            try {
                if (this.paused) return;
                if (!this.active) return;
                console.log("start iter")
                this.temp = parseInt(this.tempInput.value);
                this.pressure = parseInt(this.pressureInput.value);
                const now = Date.now();
                const solution = this.derParam(this.optimizerOut);

                //this.simulationStep();

                this.chart.data.labels = this.optimBestxs.map((_, i) => `Gen ${i + 1}`).slice(-1000);
                let data = this.optimBestxs.map((r) => (r) * 100).slice(-1000);
                this.chart.data.datasets[0].data = data;
                this.chart.update();

                const heatmapData = [];
                for (let y = 0; y < this.setSize; y++) {
                    for (let x = 0; x < this.setSize; x++) {
                        heatmapData.push({
                            x: x,
                            y: y,
                            v: solution[y * this.setSize + x]
                        });
                    }
                }
                this.heatmap.data.datasets[0].data = heatmapData;
                this.heatmap.update();


                const passingmapData = [];
                let filteredPassing = this.passing.filter((v) => !isNaN(v) && v != 0);

                this.passingMapMin = Math.min(...filteredPassing);
                this.passingMapMax = Math.max(...filteredPassing);

                for (let y = 0; y < this.setSize; y++) {
                    for (let x = 0; x < this.setSize; x++) {
                        passingmapData.push({
                            x: x,
                            y: y,
                            v: this.passing[y * this.setSize + x]
                        });
                    }
                }
                this.passingMap.data.datasets[0].data = passingmapData;
                this.passingMap.update();

                const optimizeDuration = Date.now() - now;
                if (optimizeDuration > 500) {
                    this.optimIter = this.optimIter / 1.2;
                }
                if (optimizeDuration < 200) {
                    this.optimIter = this.optimIter * 1.2;
                }
                console.log('Optimization duration:', optimizeDuration, 'ms, iter', this.optimIter);

            } catch (e) {
                clearInterval(this.interval);
                alert('Optimization error: ' + e.message);
                throw e;
            }
        }, 1000);
    }

    derParam(v) {
        const l = this.setSize;
        let pm = Array(v.length);
        let em = Array(v.length);
        let wm = Array(v.length);
        let dem = Array(v.length);
        let dwm = Array(v.length);
        let dv = Array(v.length);

        pm[0] = 1;
        for (let i = 1; i < l; i++) {
            const ei = v[(i - 1) * l];
            const pi = 1 / (ei + 1);
            pm[i * l] = pi * pm[(i - 1) * l];
            const ej = v[i - 1];
            const pj = ej / (ej + 1);
            pm[i] = pj * pm[i - 1];
        }
        for (let i = 1; i < l; i++) {
            for (let j = 1; j < l; j++) {
                const ei = v[(i - 1) * l + j];
                const pi = 1 / (ei + 1);
                const ej = v[i * l + j - 1];
                const pj = ej / (ej + 1);
                pm[i * l + j] = pi * pm[(i - 1) * l + j] + pj * pm[i * l + j - 1];
            }
        }

        em[v.length - 1] = v[v.length - 1] - 1
        wm[v.length - 1] = v[v.length - 1] / (1 + v[v.length - 1]);
        for (let i = l - 2; i >= 0; i--) {
            let vx = v[i * l + (l - 1)];
            let px = vx / (vx + 1)
            let vy = v[(l - 1) * l + i];
            let py = vy / (vy + 1)

            let wx = wm[(i + 1) * l + (l - 1)] * (1 - px) + px
            let wy = wm[(l - 1) * l + i + 1] * py
            wm[i * l + (l - 1)] = wx;
            wm[(l - 1) * l + i] = wy;

            let ex = em[(i + 1) * l + (l - 1)] * (1 - px)
            let ey = em[(l - 1) * l + i + 1] * py
            em[i * l + (l - 1)] = vx - 1 + ex;
            em[(l - 1) * l + i] = vy - 1 + ey;
        }

        for (let s = l - 2; s >= 0; s--) {
            for (let k = l - 2; k >= 0; k--) {
                let e0 = v[s * l + k];
                let p0 = e0 / (e0 + 1)

                let vx = wm[s * l + k + 1] * p0
                let vy = wm[(s + 1) * l + k] * (1 - p0)
                wm[s * l + k] = vx + vy;

                let ex = em[s * l + k + 1] * p0
                let ey = em[(s + 1) * l + k] * (1 - p0)
                em[s * l + k] = e0 - 1 + ex + ey;
            }
        }

        let k1 = 0;
        let k2 = 0;
        for (let i = 0; i < l; i++) {
            for (let j = 0; j < l; j++) {
                let er = 0;
                let eb = 0;
                let wr = 1;
                let wb = 0;
                if (i < l - 1) {
                    eb = em[(i + 1) * l + j];
                    wb = wm[(i + 1) * l + j];
                }
                if (j < l - 1) {
                    er = em[i * l + j + 1];
                    wr = wm[i * l + j + 1];
                }
                let vv = v[i * l + j];
                let dedv = 0
                let dwdv = 0

                if (vv > 0) {
                    dedv = (1 + (er - eb) / ((1 + vv) ** 2))
                    dwdv = (wr - wb) / ((1 + vv) ** 2)
                }
                dwm[i * l + j] = dwdv
                dem[i * l + j] = dedv;
                k1 += dedv * dwdv;
                k2 += dedv ** 2;

            }
        }

        let k = (k1) / k2
        for (let i = 0; i < v.length; i++) {

            dv[i] = dwm[i] - k * dem[i];
            if (dv[i] != 0 && v[i] != 0) {
                let dvis = dv[i] * this.derLast[i];
                if (dvis > 0) {
                    this.derStable[i] += 1
                } else if (dvis < 0) {
                    this.derStable[i] -= 1;
                }
            }

            this.derStable[i] = Math.max(-100, this.derStable[i]);
        }


        let v1 = Array(v.length);
        let v2, o2;
        let o = this.objective(v);
        for (let i = 0; i < v.length; i++) {
            let vdv = Math.max(v[i] + this.derStep * dv[i], v[i] * 0.1);
            vdv = Math.min(vdv, v[i] * 2);
            v1[i] = vdv
            if (v1[i] < 10 ** -6) {
                v1[i] = 0;
            }
        }
        let o1 = this.objective(v1);
        if (Math.abs(o1.e) > 10 ** -12) {
            v2 = this.normalizeEnergy(v1, dem, pm);
            o2 = this.objective(v2);
        } else {
            v2 = v1;
            o2 = o1;
        }

        console.log("delta w", o2.w - o.w, o2.w, "e0", o2.e);

        this.optimBestxs.push(o2.w);
        let pm2 = pm.map((v, i) => v > 10 ** -8 ? (Math.log10(v) + 4) : 0);
        this.passing = pm2;
        if (this.temp == 1) {
            this.passing = this.derStable;
        } else if (this.temp == 2) {
            this.passing = dv;
        } else if (this.temp == 3) {
            this.passing = v2.map((v, i) => (v - matrix128[i]))
        } else if (this.temp == 4) {
            this.passing = dem
        } else if (this.temp == 5) {
            this.passing = dwm
        }

        this.derLast = dv;
        this.optimizerOut = v2;
        return v2
    }

    setupChart() {
        if (!this.chart) {
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
        }
        if (!this.heatmap) {
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
                            //const r = (t <= 0.25) ? Math.round(255 * 4 * t) : 255;
                            //const g = (t > 0.25) ? Math.round(255 * (1.33 * (t - 0.25))) : 0;
                            //const b = (t > 0.25) ? Math.round(255 * (1.33 * (t - 0.25))) : 0;
                            const r = (t <= 0.25) ? Math.round(255 * 4 * t) : Math.round(255 - 255 * (1.33 * (t - 0.25)));
                            const g = (t > 0.25) ? Math.round(255 - 255 * (1.33 * (t - 0.25))) : 0;
                            const b = (t > 0.25) ? 255 : 0;
                            return `rgb(${r},${g},${b})`;
                        },
                        width: ({ chart }) => (chart.chartArea || {}).width / this.setSize,
                        height: ({ chart }) => (chart.chartArea || {}).height / this.setSize,
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
                                    return [v.x + '.' + v.y + ': ' + v.v];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: false,
                            min: -0.5,
                            max: this.setSize - 0.5,
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
        }
        if (!this.passingMap) {
            this.passingMap = new Chart(this.passingmapCanvas.getContext('2d'), {
                type: 'matrix',
                data: {
                    datasets: [{
                        label: 'Solution Heatmap',
                        data: [{ x: 0, y: 0, v: 0 }],
                        backgroundColor: ctx => {
                            const value = ctx.raw.v;
                            if (isNaN(value)) {
                                return 'rgb(0, 80, 0)';
                            }
                            if (value == 0) {
                                return 'rgb(0,0,0)';
                            }
                            if (value < 0) {
                                const t = Math.max(0, Math.min(1, value / this.passingMapMin));
                                const r = 0;
                                const g = 0;
                                const b = Math.round(255 * t);
                                return `rgb(${r},${g},${b})`;
                            }
                            if (value > 0) {
                                const t = Math.max(0, Math.min(1, value / (this.passingMapMax)));
                                const r = Math.round(255 * t);
                                const g = 0;
                                const b = 0;
                                return `rgb(${r},${g},${b})`;
                            }
                        },
                        width: ({ chart }) => 1 + (chart.chartArea || {}).width / this.setSize,
                        height: ({ chart }) => 1 + (chart.chartArea || {}).height / this.setSize,
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
                                    return [v.x + '.' + v.y + ': ' + v.v];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            display: false,
                            min: -0.5,
                            max: this.setSize - 0.5,
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
        }
        this.passingMap.update();
        this.heatmap.update();
        this.chart.update();
    }

    objective(v) {
        const l = this.setSize;
        const lp1 = l + 1;

        for (let s = l - 1; s >= 0; s--) {
            for (let k = l - 1; k >= 0; k--) {
                let e0 = v[s * l + k];
                let p0 = e0 / (e0 + 1)

                let vx = this.matrixWin[s * lp1 + k + 1] * p0
                let vy = this.matrixWin[(s + 1) * lp1 + k] * (1 - p0)
                this.matrixWin[s * lp1 + k] = vx + vy;

                let ex = this.matrixEnergy[s * lp1 + k + 1] * p0
                let ey = this.matrixEnergy[(s + 1) * lp1 + k] * (1 - p0)
                this.matrixEnergy[s * lp1 + k] = e0 - 1 + ex + ey;
            }
        }

        let score = 0
        let e = this.matrixEnergy[0];
        if (e > 0 && e < 0.1) {
            score = this.matrixWin[0] - 1000 * e ** 3
        }
        if (e < 0 && e > -0.1) {
            score = this.matrixWin[0] - 1 * e ** 3
        }

        let obj = {
            e: this.matrixEnergy[0],
            w: this.matrixWin[0],
            s: score,
        };
        return obj
    }

    normalizeEnergy(x0, dem, pm) {
        let x = Array.from({ length: x0.length }, (_, i) => x0[i]);

        let correctEmin = -Infinity;
        let correctEmax = Infinity;
        let correctE = 0;
        let o = this.objective(x);
        if (o.e > 0) {
            correctEmax = 0;
            correctE = -1;
        } else if (o.e < 0) {
            correctEmin = 0;
            correctE = 1;
        }
        for (let j = 0; j <= 50; j++) {
            for (let i = 0; i < x.length; i++) {
                let e0 = (dem[i] * correctE);
                x[i] = x0[i] + e0;
                if (x[i] < 0) {
                    x[i] = 0;
                }
                x[i] = Math.max(x[i], x0[i] * 0.1);
            }
            o = this.objective(x);

            if (o.e > 0) {
                correctEmax = correctE;
            }
            if (o.e < 0) {
                correctEmin = correctE;
            }
            if (correctEmax == Infinity || correctEmin == -Infinity) {
                correctE = 2 * correctE
            } else {
                correctE = (correctEmin + correctEmax) / 2;
            }
        }
        console.log("delta e", correctE);

        return x
    }

    //simulationStep() {
    //    let l = this.setSize;
    //    let energy = 0;
    //    let botPoint = 0;
    //    let dummyPoint = 0;
    //    let botSet = 0;
    //    let dummySet = 0;

    //    for (let step = 0; step < 100; step++) {
    //        const e0 = this.optimizerOut[dummyPoint * l + botPoint];
    //        energy = energy + 1 - e0;
    //        const rand = Math.random() * (1 + e0);
    //        if (rand < e0) {
    //            botPoint++;
    //        } else {
    //            dummyPoint++;
    //        }
    //        if (botPoint >= l || dummyPoint >= l) {
    //            if (botPoint > dummyPoint) {
    //                botSet++;
    //            } else {
    //                dummySet++;
    //            }
    //            botPoint = 0;
    //            dummyPoint = 0;
    //        }
    //    }
    //console.log("Ratio", botSet / (dummySet + botSet), "Energy", energy);
    //}
}