let simState = null;

function manualRender() {
    const simStepBtn = document.getElementById('simStepBtn');
    const simResetBtn = document.getElementById('simResetBtn');
    simStepBtn.onclick = stepSim;
    simResetBtn.onclick = resetSim;
    if (!simState) {
        resetSim();
    }
}

function resetSim() {
    simState = {
        points: [0, 0],
        sets: [0, 0],
        round: 1,
        energy: 1,
        useEnergy: 1,
        lastRand: null,
    };
    updateSimDisplay();
}

function stepSim() {

    const usedPlayer = simState.useEnergy;
    const usedDummy = 1;
    simState.energy = simState.energy - usedPlayer +1;
    const total = usedPlayer + usedDummy;
    simState.lastRand = Math.random()*total;
    if (simState.lastRand < usedPlayer) {
        simState.points[1]++;
    } else {
        simState.points[0]++;
    }
    if (simState.points[0] > 2) {
        simState.sets[0]++;
        simState.points[0] = 0;
        simState.points[1] = 0;
    }
    if (simState.points[1] > 2) {
        simState.sets[1]++;
        simState.points[0] = 0;
        simState.points[1] = 0;
    }
    if (simState.useEnergy > simState.energy) {
        simState.useEnergy = simState.energy
    }
    simState.round++;
    updateSimDisplay();
}

function updateSimDisplay() {
    // Calculate total energy for normalization
    const totalBarWidth = 300; // px

    const playerWidth = Math.round((simState.useEnergy / (simState.useEnergy+1)) * totalBarWidth);
    const dummyWidth = Math.round((1 / (simState.useEnergy + 1)) * totalBarWidth);
    let arrowHTML = '';
    if (typeof simState.lastRand === 'number') {
        const arrowLeft = Math.max(0, Math.min(totalBarWidth - 10, (simState.lastRand / (simState.useEnergy+1)) * totalBarWidth - 5));
        arrowHTML = `
        <div style="position: absolute; left: ${arrowLeft}px; top: 0; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #220;"></div>
        `;
    }

    let energyStr = String(simState.energy.toFixed(1));
    if (energyStr.endsWith('1.0')) {
        energyStr = '1';
    }

    interactiveSimArea.innerHTML = `
        <b>Round ${simState.round}</b><br>

        <div style="margin:16px 0 8px 0;">
            <div style="display:flex; justify-content:space-between; width:${totalBarWidth}px; font-size:1.2em;">
                <span style="color:#1a73e8;">Player</span>
                <span style="color:#e8711a;">Dummy</span>
            </div>
            <div style="width:${totalBarWidth}px; height:24px; background:#eee; border-radius:6px; overflow:hidden; display:flex;">
                <div style="width:${playerWidth}px; background:#1a73e8; height:100%;"></div>
                <div style="width:${dummyWidth}px; background:#e8711a; height:100%;"></div>
            </div>
            <div style="position: relative; height: 16px; width: ${totalBarWidth}px;">
            ${arrowHTML}
            </div>
            <div style="display:flex; justify-content:space-between; width:${totalBarWidth}px; font-size:0.95em;">
                <span style="color:#1a73e8;">${simState.sets[1]}</span>
                <span style="">Set</span>
                <span style="color:#e8711a;">${simState.sets[0]}</span>
            </div>
            <div style="display:flex; justify-content:space-between; width:${totalBarWidth}px; font-size:0.95em;">
                <span style="color:#1a73e8;">${simState.points[1]}</span>
                <span style="">Points</span>
                <span style="color:#e8711a;">${simState.points[0]}</span>
            </div>
            <div style="display:flex; justify-content:space-between; width:${totalBarWidth}px; font-size:0.95em;">
                <span style="color:#1a73e8;">${energyStr}</span>
                <span style="">Energy</span>
                <span style="color:#e8711a;">1</span>
            </div>

            <label>
Energy to use:
<input type="range" id="playerEnergyInput" min="0" max="${simState.energy}" step="0.01" value="${simState.useEnergy}" style="width:120px;">
<span id="playerEnergyValue">${(simState.useEnergy).toFixed(1)} / ${(simState.energy).toFixed(1)} </span>
</label>
        </div>
    `;
    const slider = document.getElementById('playerEnergyInput');
    const valueLabel = document.getElementById('playerEnergyValue');
    if (slider) {
        slider.oninput = function () {
            simState.useEnergy = parseFloat(slider.value);
            valueLabel.textContent = simState.useEnergy;
            updateSimDisplay();
        };
    }
}