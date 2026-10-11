const $ = id => document.getElementById(id);
const SEGS = 30;

// build RPM segments
const segWrap = $("rpm-segs");
for (let i = 0; i < SEGS; i++) {
    const s = document.createElement("div");
    s.className = "seg";
    segWrap.appendChild(s);
}
const segs = segWrap.children;

const beltBadge = $("seatbelt-badge");
const rpmWrap = $("rpm-wrap");
const rpmScale = $("rpm-scale");

let lastMaxRpm = 0;

function updateScale(maxRpm) {
    if (maxRpm === lastMaxRpm) return;
    lastMaxRpm = maxRpm;

    const exactK = maxRpm / 1000;
    const maxK = Math.floor(exactK);
    const step = maxK <= 6 ? 1 : (maxK <= 10 ? 2 : 3);
    let html = "<span>0</span>";
    for (let k = step; k < maxK; k += step) {
        html += `<span>${k}</span>`;
    }
    const redLabel = (exactK % 1 === 0) ? `${maxK}K` : `${exactK.toFixed(1)}K`;
    html += `<span class="red">${redLabel}</span>`;
    rpmScale.innerHTML = html;
}

function setSpeed(v) {
    const s = String(Math.min(999, Math.max(0, Math.round(v))));
    let html = "";
    for (let i = 0; i < s.length; i++) {
        html += `<span class="lit">${s[i]}</span>`;
    }
    $("speed").innerHTML = html;
}

function setBar(barId, valId, pct, invertLow) {
    pct = Math.min(Math.max(Math.round(pct) || 0, 0), 100);
    const bar = $(barId);
    bar.style.width = pct + "%";
    bar.classList.toggle("low", pct < 20);
    $(valId).textContent = pct + "%";
}

window.addEventListener("message", e => {
    const d = e.data;
    const box = $("speedo-container");

    if (d.action === "hide") return box.classList.add("hidden");
    if (d.action === "show") return box.classList.remove("hidden");
    if (d.action !== "update") return;

    box.classList.remove("hidden");

    // Dynamic Max RPM & Scale
    const maxRpm = Number(d.maxRpm) || 8000;
    updateScale(maxRpm);

    // Calculate effective RPM ratio (From physical simulation if available, else raw engine RPM)
    let curRpmVal = 0;
    if (d.displayRpm !== null && d.displayRpm !== undefined && !isNaN(d.displayRpm)) {
        curRpmVal = Number(d.displayRpm);
    } else {
        curRpmVal = (Number(d.rpm) || 0) * maxRpm;
    }

    const effectiveRpm = Math.min(Math.max(curRpmVal / maxRpm, 0), 1);

    // Shift Light Alert (Flash when reaching shift RPM > 0.88)
    const isShiftPoint = (effectiveRpm >= 0.88 && d.gear !== "R" && d.gear !== 0 && d.gear !== "N");
    rpmWrap.classList.toggle("shift-flash", isShiftPoint);

    // RPM segments
    const lit = Math.round(effectiveRpm * SEGS);
    for (let i = 0; i < SEGS; i++) {
        segs[i].className = "seg" + (i < lit ? " on" : "") +
            (i >= SEGS - 5 ? " red" : i >= SEGS - 9 ? " warn" : "");
    }
    $("rpm-text").textContent = Math.round(curRpmVal);

    // Speed
    setSpeed(Math.round(d.speed || 0));

    // Gear
    const g = $("gear-val");
    let gd = d.gear;
    g.className = "gear";
    if (gd === 0 || gd === "0" || gd === "R") {
        gd = "R";
        g.classList.add("reverse");
    } else if (gd === "N" || gd === undefined || gd === null) {
        gd = "N";
        g.classList.add("neutral");
    }
    g.textContent = gd;

    // Transmission Mode (AUTO / MANUAL)
    const tm = $("trans-mode");
    if (tm) {
        tm.textContent = d.isManual ? "MANUAL" : "AUTO";
        tm.classList.toggle("manual", !!d.isManual);
    }

    // Seatbelt
    if (beltBadge) {
        if (d.seatbeltRequired) {
            beltBadge.classList.remove("hidden");
            beltBadge.classList.toggle("unbuckled", !d.seatbelt);
            beltBadge.classList.toggle("buckled", !!d.seatbelt);
        } else {
            beltBadge.classList.add("hidden");
        }
    }

    // Bars: Gas (Throttle) / Fuel / Engine
    setBar("gas-bar", "gas-val", d.throttle);
    setBar("fuel-bar", "fuel-val", d.fuel);
    
    // Engine HP Display (Virtual HP based on fMass e.g. 1380 / 1380 HP)
    const engHp = Math.round(d.engineHealth || 0);
    const maxEngHp = Math.round(d.maxEngineHealth || 1000);
    const engPct = Math.min(Math.max((engHp / maxEngHp) * 100, 0), 100);
    const engBar = $("eng-bar");
    if (engBar) {
        engBar.style.width = engPct + "%";
        engBar.classList.toggle("low", engPct < 30);
    }
    const engVal = $("eng-val");
    if (engVal) {
        engVal.textContent = `${engHp} / ${maxEngHp} HP`;
    }

    // Steering
    const ang = Math.round(d.steerAngle || 0);
    $("wheel").style.transform = `rotate(${ang * 2}deg)`;
    $("steer-val").textContent = ang + "°";
});