class mirror {
    constructor(pauseBtn, chartCanvas, heatmapCanvas, passingmapCanvas) {
        this.chart = null;
        this.interval = null;
        this.paused = false;
        this.active = false;
        this.firstRender = true;

        this.pauseBtn = pauseBtn;
        this.chartCanvas = chartCanvas;
        this.heatmapCanvas = heatmapCanvas;
        this.passingmapCanvas = passingmapCanvas;
        this.mapToggle = 0;
        this.counter = 1;
    }

    render() {
        this.active = true;
        if (this.firstRender) {
            this.pauseBtn.onclick = this.pause.bind(this);
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
        console.log("reset mirror")
        this.derStep = 1;

        //this.dummyV = matrix128.map((v, _) => v > 10 ** -6 ? v : 10 ** -6);
        this.dummyV = Array(64**2).fill(1);
        this.setSize = Math.sqrt(this.dummyV.length);
        let lp1 = this.setSize + 1;

        this.matrixW = Array.from({ length: lp1 ** 2 }, (_, i) => i >= this.setSize * lp1 ? 0 : 1);
        this.matrixE = Array.from({ length: lp1 ** 2 }, () => 0);
        this.matrixV = Array.from({ length: this.setSize ** 2 }, () => 1);
        this.bestW0 = []

        this.setupChart();
        if (this.interval) clearInterval(this.interval);
        this.interval = setInterval(() => {
            try {
                if (this.paused) return;
                if (!this.active) return;
                console.log("start iter")
                const now = Date.now();
                this.computeSolution();

                this.chart.data.labels = this.bestW0.map((_, i) => `Gen ${i + 1}`).slice(-1000);
                let data = this.bestW0.map((r) => (r) * 100).slice(-1000);
                this.chart.data.datasets[0].data = data;
                this.chart.update();

                const heatmapData = [];
                for (let y = 0; y < this.setSize; y++) {
                    for (let x = 0; x < this.setSize; x++) {
                        heatmapData.push({
                            x: x,
                            y: y,
                            v: this.matrixV[y * this.setSize + x]
                        });
                    }
                }
                this.heatmap.data.datasets[0].data = heatmapData;
                this.heatmap.update();


                const passingmapData = [];
                let filteredPassing = this.passing.filter((v) => !isNaN(v) && v != 0);

                this.passingMapMin =  Math.min(...filteredPassing);
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

                this.dummyV = this.matrixV.map((v, i) => v);

                const optimizeDuration = Date.now() - now;
                console.log('Mirror duration:', optimizeDuration, 'ms');

            } catch (e) {
                clearInterval(this.interval);
                alert('Mirror error: ' + e.message);
                throw e;
            }
        }, 1000);
    }



    computeSolution() {
        const l = this.setSize;
        let vdm = this.dummyV
        const vdn = vdm[vdm.length - 1];
        let vm = Array(this.matrixV.length);
        let dem = Array(this.matrixV.length);
        let wm = Array(this.matrixV.length);

        let vnmin = 0;
        let vnmax = Infinity;
        let vn = 1;
        for (let s = 0; s < 50; s++) {
            for (let i = l - 1; i >= 0; i--) {
                for (let j = l - 1; j >= 0; j--) {
                    let wr = 1
                    let der = 0
                    let wb = 0
                    let deb = 0
                    if (i < l - 1) {
                        deb = dem[(i + 1) * l + j];
                        wb = wm[(i + 1) * l + j];
                    }
                    if (j < l - 1) {
                        der = dem[i * l + j + 1];
                        wr = wm[i * l + j + 1];
                    }
                    const vd = vdm[i * l + j];
                    const vAux = (vd / vdn * (wr - wb) * (vdn + vn) ** 2) + vd * (deb - der)
                    let v = vn;
                    if (vAux >= 0 && (i < l - 1 || j < l - 1)) {
                        v = -vd + vAux ** 0.5;
                    }
                    if (v < 10**-6 || vAux < 0) {
                        v = 10**-6;
                    }

                    let p = 0.5;
                    let pm1 = 0.5;
                    if (vd + v > 0) {
                        p = v / (vd + v)
                        pm1 = vd / (vd + v)
                    }
                    let de = pm1 * deb + p * der + v - vd;
                    let w = pm1 * wb + p * wr;
                    vm[i * l + j] = v;
                    dem[i * l + j] = de;
                    wm[i * l + j] = w;
                }
            }

            if (dem[0] > 0) {
                vnmax = vn;
            }
            if (dem[0] < 0) {
                vnmin = vn;
            }
            if (vnmax == Infinity) {
                vn = 2 * vn
            } else {
                vn = (vnmin + vnmax) / 2;
            }
        }

        let pm = Array(vm.length);
        let etotal = 0;
        pm[0] = 1;
        for (let i = 1; i < l; i++) {
            const ei = vm[(i - 1) * l];
            const edi = vdm[(i - 1) * l];
            const pi = (ei + edi) > 0 ? edi / (ei + edi) : 0.5;
            pm[i * l] = pi * pm[(i - 1) * l];
            const ej = vm[i - 1];
            const edj = vdm[i - 1];
            const pj = (ej + edj) > 0 ? ej / (ej + edj) : 0.5;
            pm[i] = pj * pm[i - 1];
        }
        for (let i = 1; i < l; i++) {
            for (let j = 1; j < l; j++) {
                const ei = vm[(i - 1) * l + j];
                const edi = vdm[(i - 1) * l + j];
                let pi =(ei+edi)>0 ? edi / (ei + edi) : 0.5;
                const ej = vm[i * l + j - 1];
                const edj = vdm[i * l + j - 1];
                const pj = (ej+edj)>0 ? ej / (ej + edj) : 0.5;
                pm[i * l + j] = pi * pm[(i - 1) * l + j] + pj * pm[i * l + j - 1];
            }
        }
        for (let i = 0; i < pm.length; i++) {
            etotal = etotal + (vm[i] - 1) * pm[i]
            //console.log(i, v[i], pm[i], etotal)
        }


        console.log("vn", vn, "de0", dem[0], "W", wm[0], "energy", etotal);

        this.bestW0.push(wm[0]);
        this.matrixV = vm.map((v, _) => v > 10 ** -50 ? v : 10**-50);
        this.passing = pm.map((v, _) => v > 10 ** -200 ? 10 + Math.log10(v) : 0);
        if (wm[0] < 0.5) {
            this.pause();
        }
    }

    derParam() {
        const l = this.setSize;
        let v = this.matrixV
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
                    dedv =  (1 + (er - eb) / ((1 + vv) ** 2))
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

        this.bestW0.push(o2.w);
        let pm2 = pm.map((v, i) => v > 10 ** -8 ? (Math.log10(v) + 4) : 0);
        this.passing = pm2;
        if (this.mapToggle == 1) {
            this.passing = this.derStable;
        } else if (this.mapToggle == 2) {
            this.passing = dv;
        } else if (this.mapToggle == 3) {
            this.passing = v2.map((v, i) => (v - matrix128[i]))
        } else if (this.mapToggle == 4) {
            this.passing = dem
        } else if (this.mapToggle == 5) {
            this.passing = dwm
        }

        this.matrixV = v2;
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

                let vx = this.matrixW[s * lp1 + k + 1] * p0
                let vy = this.matrixW[(s + 1) * lp1 + k] * (1 - p0)
                this.matrixW[s * lp1 + k] = vx + vy;

                let ex = this.matrixE[s * lp1 + k + 1] * p0
                let ey = this.matrixE[(s + 1) * lp1 + k] * (1 - p0)
                this.matrixE[s * lp1 + k] = e0 - 1 + ex + ey;
            }
        }

        let obj = {
            e: this.matrixE[0],
            w: this.matrixW[0],
        };
        return obj
    }

    normalizeEnergy(x0, dem) {
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
}