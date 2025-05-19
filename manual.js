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
        roundLog: [],
    };
    updateSimDisplay();
}

function stepSim() {

    const usedPlayer = simState.useEnergy;
    const usedDummy = 1;
    simState.energy = simState.energy - usedPlayer +1;
    const total = usedPlayer + usedDummy;
    simState.lastRand = Math.random() * total;
    let setWinner = false;
    let pointWinner = null;
    if (simState.lastRand < usedPlayer) {
        simState.points[1]++;
        pointWinner = 1;
    } else {
        simState.points[0]++;
        pointWinner = 0;
    }
    if (simState.points[0] > 2) {
        setwinner = true;
        simState.sets[0]++;
        simState.points[0] = 0;
        simState.points[1] = 0;
    }
    if (simState.points[1] > 2) {
        setwinner = true;
        simState.sets[1]++;
        simState.points[0] = 0;
        simState.points[1] = 0;
    }
    if (simState.useEnergy > simState.energy) {
        simState.useEnergy = simState.energy
    }
    simState.round++;
    simState.roundLog.unshift([simState.lastRand.toFixed(2), pointWinner, setWinner]);
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
        <div id="arrow" style="position: absolute; left: ${arrowLeft}px; top: 0; width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-bottom: 12px solid #220;"></div>
        `;
    }

    let energyStr = String(simState.energy.toFixed(1));
    if (energyStr.endsWith('1.0')) {
        energyStr = '1';
    }

    logStr = '';
    for (let i = 0; i < Math.min(simState.roundLog.length,10); i++) {
        let winner = simState.roundLog[i][1];
        let won = simState.roundLog[i][2] ? 'Set' : 'Point'
        if (winner == 1) {
            logStr += `R : ${simState.roundLog[i][0]} - <span style="color:#1a73e8;">Player win the ${won}</span><br>`;
        } else {
            logStr += `R : ${simState.roundLog[i][0]} - <span style="color:#e8711a;">Dummy win the ${won}</span><br>`;
        }
    }

    interactiveSimArea.innerHTML = `
        <b>Round ${simState.round}</b><br>
<label>
        Energy to use:
<input type="range" id="playerEnergyInput" min="0" max="${simState.energy}" step="0.01" value="${simState.useEnergy}" style="width:120px;">
<span id="playerEnergyValue">${(simState.useEnergy).toFixed(1)} / ${(simState.energy).toFixed(1)} </span>
</label>

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
                <span style="">Sets</span>
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
            ${logStr}
        </div>
    `;
    const slider = document.getElementById('playerEnergyInput');
    slider.oninput = function () {
        updateSimDisplayValues(slider);
    }
}

function updateSimDisplayValues(slider) {
    const valueLabel = document.getElementById('playerEnergyValue');
    //const arrow = document.getElementById('arrow');
    simState.useEnergy = parseFloat(slider.value);
    valueLabel.textContent = `${(simState.useEnergy).toFixed(1)} / ${(simState.energy).toFixed(1)}`;
    //if (arrow) {
        //arrow.remove();
    //}
}