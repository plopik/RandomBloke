let autoState = null;
let autoPaused = false;
let autoInterval = null;
let stepPerTick = 1000;

function automationRender() {
    const applyStrategyBtn = document.getElementById('applyStrategy');
    const pauseBtn = document.getElementById('pauseBtn');
    applyStrategyBtn.onclick = automationReset;
    pauseBtn.onclick = automationPause;
    if (!autoState) {
        automationReset();
    }
}

function automationPause() {
    autoPaused = !autoPaused;
    const pauseBtn = document.getElementById('pauseBtn');
    if (autoPaused) {
        pauseBtn.innerHTML = 'Resume';
    } else {
        pauseBtn.innerHTML = 'Pause';
    }
}

function automationReset() {
    autoState = {
        dummySet: 0,
        dummyPoint: 0,
        botSet: 0,
        botPoint: 0,
        round: 0,
        energy: 1,
        lastRand: null,
    };
    const code = document.getElementById('strategyBox').value;
    autoStrategy = eval('(function botStrategy(energy, botPoint, botSet, dummyPoint, dummySet){' + code + '})');

    clearInterval(autoInterval);
    autoInterval = setInterval(() => {
        if (autoPaused) return;
        try {
            autoStepSim();
            autoUpdateSimDisplay();
        }
        catch (e) {
            clearInterval(autoInterval);
            alert('Simulation error: ' + e);
            return;
        }
    }, 200);

    autoUpdateSimDisplay();
}

function autoStrategy(energy, botPoint, botSet, dummyPoint, dummySet) {
    return 1;
}

function autoStepSim() {
    const usedDummy = 1;
    const steps = stepPerTick;
    for (let i = 0; i < steps; i++) {
        const usedPlayer = Math.min(autoState.energy, autoStrategy(autoState.energy, autoState.botPoint, autoState.botSet, autoState.dummyPoint, autoState.dummySet));
        autoState.energy = autoState.energy - usedPlayer + 1;
        const total = usedPlayer + usedDummy;
        autoState.lastRand = Math.random() * total;
        if (autoState.lastRand < usedPlayer) {
            autoState.botPoint++;
        } else {
            autoState.dummyPoint++;
        }
        if (autoState.dummyPoint > 2) {
            autoState.dummySet++;
            autoState.dummyPoint = 0;
            autoState.botPoint = 0;
        }
        if (autoState.botPoint > 2) {
            autoState.botSet++;
            autoState.dummyPoint = 0;
            autoState.botPoint = 0;
        }
    }
    autoState.round = autoState.round + steps;
}

function autoUpdateSimDisplay() {
    // Calculate total energy for normalization
    const totalBarWidth = 300; // px

    let energyStr = String(autoState.energy.toFixed(1));


    const n = autoState.botSet + autoState.dummySet;
    const ratio = autoState.botSet / n;
    const z = 1.645;
    const se = Math.sqrt(ratio * (1 - ratio) / n);
    const ciLow =  Math.max(0, ratio - z * se) ;
    const ciHigh =  Math.min(1, ratio + z * se) ;

    autoSimArea.innerHTML = `
        <b>Round ${autoState.round}</b><br>
        <p style="margin-top:1em;">
            <b>Set Win Ratio:</b> ${(ratio * 100).toFixed(2) + '%'}
            <br>
            <b>90% CI:</b> ${n > 10 ? (ciLow * 100).toFixed(1) + '% - ' + (ciHigh * 100).toFixed(1) + '%' : "TBD"}
        </p>

        <div style="margin:16px 0 8px 0;">
            <div style="display:flex; justify-content:space-between; width:${totalBarWidth}px; font-size:1.2em;">
                <span style="color:#1a73e8;">Bot</span>
                <span style="color:#e8711a;">Dummy</span>
            </div>
            <div style="display:flex; justify-content:space-between; width:${totalBarWidth}px; font-size:0.95em;">
                <span style="color:#1a73e8;">${autoState.botSet}</span>
                <span style="">Set</span>
                <span style="color:#e8711a;">${autoState.dummySet}</span>
            </div>
            <div style="display:flex; justify-content:space-between; width:${totalBarWidth}px; font-size:0.95em;">
                <span style="color:#1a73e8;">${autoState.botPoint}</span>
                <span style="">Points</span>
                <span style="color:#e8711a;">${autoState.dummyPoint}</span>
            </div>
            <div style="display:flex; justify-content:space-between; width:${totalBarWidth}px; font-size:0.95em;">
                <span style="color:#1a73e8;">${energyStr}</span>
                <span style="">Energy</span>
                <span style="color:#e8711a;">1</span>
            </div>
        </div>
    `;
}