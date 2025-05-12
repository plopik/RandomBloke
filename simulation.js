// simulation.js

let N = 10;
let Emin = 0;
let Emax = 0.3;
let STEPS_PER_TICK = 2000;

let score;

function init(n, emin, emax, stepsPerTick) {
    N = n;
    Emin = emin;
    Emax = emax;
    STEPS_PER_TICK = stepsPerTick;
    score = {
        bots: Array(N + 1).fill(0),
        bot0: Array(N + 1).fill(0),
        sets: Array(N + 1).fill(0),
        sets0: Array(N + 1).fill(0),
        energy: Array(N + 1).fill(2),
        energy0: Array(N + 1).fill(2),
        lastUsed: Array(N + 1).fill(0),
        lastUsed0: Array(N + 1).fill(0),
        totalPoints: Array(N + 1).fill(0),
        totalPoints0: Array(N + 1).fill(0),
        setWinRatios: [],
        totalPointsPlayed: 0
    };
    window.simulation.score = score
}

function botStrategy(botIdx, currentEnergy, bot0Score, botScore) {
    if (botIdx === 0) return 1;
    if (botScore >= 2 && bot0Score >= 2) {
        if (currentEnergy >= 10) return 1 + currentEnergy / 100;
        return 1;
    }
    const E = Emin + (Emax - Emin) * (botIdx - 1) / (N - 1);
    return 1 - E;
}

function resetSet(i) {
    score.bots[i] = 0;
    score.bot0[i] = 0;
}

function simulateStep() {
    for (let step = 0; step < STEPS_PER_TICK; step++) {
        for (let i = 1; i <= N; i++) {
            score.energy[i] = Math.min(score.energy[i] + 1, 1000);
            score.energy0[i] = Math.min(score.energy0[i] + 1, 1000);

            const usedBot = botStrategy(i, score.energy[i], score.bot0[i], score.bots[i]);
            const used0 = botStrategy(0, score.energy0[i], score.bot0[i], score.bots[i]);

            score.energy[i] -= usedBot;
            score.energy0[i] -= used0;

            score.lastUsed[i] = usedBot;
            score.lastUsed0[i] = used0;

            const total = usedBot + used0;
            if (total > 0) {
                const rand = Math.random() * total;
                if (rand < usedBot) {
                    score.bots[i]++;
                    score.totalPoints[i]++;
                } else {
                    score.bot0[i]++;
                    score.totalPoints0[i]++;
                }
                score.totalPointsPlayed++;
            }

            const bBot = score.bots[i];
            const b0 = score.bot0[i];
            if (bBot >= 3 || b0 >= 3) {
                if (bBot > b0) {
                    score.sets[i]++;
                } else {
                    score.sets0[i]++;
                }
                resetSet(i);
            }
        }
    }

    // Calculate win ratios and 90% CI for each bot1..N
    score.setWinRatios = [];
    for (let i = 1; i <= N; i++) {
        const setsBot = score.sets[i];
        const sets0 = score.sets0[i];
        const n = setsBot + sets0;
        let ratio = 0, ciLow = 0, ciHigh = 0;
        if (n > 0) {
            ratio = setsBot / n;
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
}

// Expose score, simulateStep, and init globally
window.simulation = {
    score,
    simulateStep,
    init
};
