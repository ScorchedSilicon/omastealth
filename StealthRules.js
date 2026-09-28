// StealthRules.js
// Pure functions. No QML types. Runnable under node and inside Quickshell.
//
// Encodes F-117A employment the player asked for:
//   - UHF/VHF antennas bloom RCS while extended or transmitting
//   - antennas stow on the final run
//   - IRADS = FLIR (forward, long range) + DLIR (down)
//   - random cloud cells can blank IRADS
//   - after pickle: laser ON ~8s, OFF ~60s, ON last ~8s for terminal tweaks
//
// Public writeups usually summarize the terminal lase as "7–10 s before impact."
// The mid-course dark window is the interesting part of the run.

var RCS = {
    CLEAN: 0.025,
    BAY_OPEN: 2.4,
    GEAR_DOWN: 1.8,
    ANTENNA_UHF: 0.55,
    ANTENNA_VHF: 0.70,
    RADIO_TX_EXTRA: 0.85,
    LASER_ON: 0.08
};

var IRADS = {
    FLIR_MAX_NM: 18,
    FLIR_NFOV_NM: 8,
    DLIR_MAX_NM: 4.5,
    DLIR_HANDOFF_NM: 2.2,
    CLOUD_IR_BLOCK: true
};

var LASER = {
    INITIAL_S: 8,
    DARK_S: 60,
    TERMINAL_S: 8
};

var PHASE = {
    INGRESS: "ingress",
    AAR: "aar",
    IP: "ip",
    FINAL: "final",
    EGRESS: "egress"
};

var MOON = {
    NEW: 0.05,
    CRESCENT: 0.22,
    QUARTER: 0.45,
    GIBBOUS: 0.72,
    FULL: 1.0
};

var FUEL = {
    BURN_PER_NM: 0.011,
    RECEPTACLE_RCS: 0.18,
    BASKET_NM: 0.38,
    BASKET_ALT_FT: 500,
    TRANSFER_PER_S: 0.10,
    RADIO_BASKET_MUL: 2.2
};

function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
}

function expectedTofS() {
    return LASER.INITIAL_S + LASER.DARK_S + LASER.TERMINAL_S;
}

function bombTimeOfFlightS(altFt, airspeedKt) {
    var alt = clamp(altFt || 20000, 2000, 35000);
    var tas = clamp(airspeedKt || 480, 300, 560);
    var drop = Math.sqrt((2 * alt) / 32.174);
    var slant = (alt / 6076.12) / Math.max(0.25, Math.sin(12 * Math.PI / 180));
    var kinematic = drop + (slant * 3600) / tas;
    return clamp(kinematic, 22, 90);
}

function laserWindows(tofS) {
    var tof = Math.max(tofS || expectedTofS(), LASER.INITIAL_S + LASER.TERMINAL_S + 1);
    var initial = LASER.INITIAL_S;
    var terminal = LASER.TERMINAL_S;
    var dark = Math.max(1, tof - initial - terminal);
    return {
        tofS: tof,
        initialEndS: initial,
        darkEndS: initial + dark,
        terminalEndS: tof,
        darkS: dark
    };
}

// timeSincePickleS: seconds after release
// returns { on, phase, energyOnTarget, reason }
function laserState(timeSincePickleS, tofS, trackValid) {
    var t = Math.max(0, timeSincePickleS || 0);
    var w = laserWindows(tofS);
    var phase;
    var on;
    if (t < w.initialEndS) {
        phase = "initial";
        on = true;
    } else if (t < w.darkEndS) {
        phase = "dark";
        on = false;
    } else if (t < w.terminalEndS) {
        phase = "terminal";
        on = true;
    } else {
        phase = "impact";
        on = false;
    }
    var energy = on && trackValid;
    var reason = !trackValid && on ? "no-irads" : (on ? "lasing" : "off");
    return {
        on: on,
        energyOnTarget: !!energy,
        phase: phase,
        reason: reason,
        tS: t,
        windows: w
    };
}

function antennaExtended(state) {
    if (!state) return false;
    if (state.radioTx) return true;
    if (state.forceAntennaUp) return true;
    if (state.phase === PHASE.FINAL && state.antennaRetracted !== false) return false;
    return !!state.antennaExtended;
}

function radioBloom(state) {
    var ext = antennaExtended(state);
    var uhf = ext && (state.radioBand === "uhf" || state.radioBand === "both" || !state.radioBand);
    var vhf = ext && (state.radioBand === "vhf" || state.radioBand === "both");
    var rcs = 0;
    if (uhf) rcs += RCS.ANTENNA_UHF;
    if (vhf) rcs += RCS.ANTENNA_VHF;
    if (ext && state.radioTx) rcs += RCS.RADIO_TX_EXTRA;
    return {
        extended: ext,
        uhf: !!uhf,
        vhf: !!vhf,
        transmitting: !!(ext && state.radioTx),
        rcs: rcs
    };
}

function moonlightName(level) {
    var m = clamp(level == null ? 0.05 : level, 0, 1);
    if (m < 0.12) return "NEW MOON";
    if (m < 0.34) return "CRESCENT";
    if (m < 0.58) return "QUARTER MOON";
    if (m < 0.86) return "GIBBOUS";
    return "FULL MOON";
}

function opticalDetectMul(moonlight, inCloudShadow) {
    if (inCloudShadow) return 0.08;
    return 0.12 + clamp(moonlight || 0, 0, 1) * 1.25;
}

function irContrast(moonlight) {
    return clamp(1 - clamp(moonlight || 0, 0, 1) * 0.14, 0.72, 1);
}

function geometricRcs(state) {
    var r = RCS.CLEAN;
    if (state.bayDoorsOpen) r += RCS.BAY_OPEN;
    if (state.gearDown) r += RCS.GEAR_DOWN;
    if (state.receptacleOpen) r += FUEL.RECEPTACLE_RCS;
    r += radioBloom(state).rcs;
    if (state.laserOn) r += RCS.LASER_ON;
    var aspect = clamp(state.aspectDeg || 0, 0, 180);
    var sideOn = 1 + 0.35 * Math.sin((aspect * Math.PI) / 180);
    var altFt = clamp(state.altFt || 20000, 200, 35000);
    var altFactor = altFt < 8000 ? 1.35 : altFt > 28000 ? 0.82 : 1;
    return r * sideOn * altFactor;
}

function paintRatePerSecond(state, emitters) {
    var rcs = geometricRcs(state);
    var list = emitters || [];
    var rate = 0;
    var moon = clamp(state.moonlight == null ? 0.05 : state.moonlight, 0, 1);
    var opt = opticalDetectMul(moon, !!state.inCloudShadow);
    for (var i = 0; i < list.length; i++) {
        var e = list[i];
        var rangeNm = Math.max(0.2, e.rangeNm || 10);
        var power = e.power || 1;
        var band = e.band || "search";
        var bandMul = band === "aaa" ? 0.35 : band === "tracking" ? 1.6 : band === "searchlight" ? 0.2 : 1;
        rate += (power * bandMul * rcs) / (rangeNm * rangeNm);
        if (band === "aaa" || band === "searchlight") {
            rate += (power * opt * moon) / (rangeNm * rangeNm * 3.2);
        }
    }
    return rate;
}

function cloudAt(clouds, xNm, yNm) {
    if (!clouds || !clouds.length) return null;
    for (var i = 0; i < clouds.length; i++) {
        var c = clouds[i];
        var dx = (c.xNm || 0) - xNm;
        var dy = (c.yNm || 0) - yNm;
        var r = c.radiusNm || 1.5;
        if (dx * dx + dy * dy <= r * r) return c;
    }
    return null;
}

function losBlockedByCloud(clouds, from, to) {
    var steps = 12;
    for (var i = 0; i <= steps; i++) {
        var t = i / steps;
        var x = from.xNm + (to.xNm - from.xNm) * t;
        var y = from.yNm + (to.yNm - from.yNm) * t;
        var hit = cloudAt(clouds, x, y);
        if (hit) return hit;
    }
    return null;
}

function slantRangeNm(jet, target) {
    var dx = (target.xNm || 0) - (jet.xNm || 0);
    var dy = (target.yNm || 0) - (jet.yNm || 0);
    var dz = ((jet.altFt || 0) - (target.altFt || 0)) / 6076.12;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function groundRangeNm(jet, target) {
    var dx = (target.xNm || 0) - (jet.xNm || 0);
    var dy = (target.yNm || 0) - (jet.yNm || 0);
    return Math.sqrt(dx * dx + dy * dy);
}

function bearingDeg(jet, target) {
    var dx = (target.xNm || 0) - (jet.xNm || 0);
    var dy = (target.yNm || 0) - (jet.yNm || 0);
    var deg = (Math.atan2(dx, dy) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    return deg;
}

function headingErrorDeg(jetHdg, brg) {
    var d = Math.abs(((brg - jetHdg + 540) % 360) - 180);
    return d;
}

// IRADS picture: FLIR looks far ahead, DLIR looks down after the target slides under.
function iradsPicture(jet, target, clouds) {
    var slant = slantRangeNm(jet, target);
    var ground = groundRangeNm(jet, target);
    var brg = bearingDeg(jet, target);
    var hdgErr = headingErrorDeg(jet.hdgDeg || 0, brg);
    var blocked = losBlockedByCloud(clouds, jet, target);
    var ahead = hdgErr < 25 && ground > 0.4;
    var under = ground <= IRADS.DLIR_HANDOFF_NM;

    var contrast = irContrast(jet.moonlight);
    var flirMax = IRADS.FLIR_MAX_NM * contrast;
    var flirNfov = IRADS.FLIR_NFOV_NM * contrast;
    var dlirMax = IRADS.DLIR_MAX_NM * contrast;
    var flir = {
        sensor: "FLIR",
        inFov: ahead && slant <= flirMax && hdgErr < 18,
        nfov: ahead && slant <= flirNfov && hdgErr < 8,
        rangeNm: slant
    };
    var dlir = {
        sensor: "DLIR",
        inFov: under && slant <= dlirMax,
        rangeNm: slant
    };

    var active = null;
    if (dlir.inFov) active = "DLIR";
    else if (flir.inFov) active = "FLIR";

    var obscured = !!(blocked && IRADS.CLOUD_IR_BLOCK);
    var trackValid = !!active && !obscured;

    return {
        slantNm: slant,
        groundNm: ground,
        bearingDeg: brg,
        headingErrorDeg: hdgErr,
        flir: flir,
        dlir: dlir,
        active: obscured ? null : active,
        obscured: obscured,
        cloud: blocked,
        trackValid: trackValid,
        handoff: !!(flir.inFov && dlir.inFov)
    };
}

function generateClouds(seed, count, spanNm) {
    var n = count == null ? 5 : count;
    var span = spanNm || 24;
    var s = (seed || 117) >>> 0;
    function rnd() {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    }
    var out = [];
    for (var i = 0; i < n; i++) {
        out.push({
            id: "cu-" + i,
            xNm: rnd() * span,
            yNm: (rnd() - 0.35) * 8,
            radiusNm: 0.8 + rnd() * 1.8,
            topsFt: 8000 + rnd() * 14000
        });
    }
    return out;
}

function recommendFinalRun(state) {
    return {
        antennaRetracted: true,
        radioTx: false,
        radioBand: "none",
        gearDown: false,
        note: "Stow UHF/VHF. Stay off the radio. Bay doors stay shut until pickle."
    };
}

function applyFinalRunDiscipline(state) {
    var next = {};
    for (var k in state) next[k] = state[k];
    next.phase = PHASE.FINAL;
    next.antennaExtended = false;
    next.antennaRetracted = true;
    next.radioTx = false;
    next.forceAntennaUp = false;
    return next;
}

function visibilitySummary(state, emitters, irads) {
    var radio = radioBloom(state);
    var rcs = geometricRcs(state);
    var paint = paintRatePerSecond(state, emitters);
    var loud = [];
    if (radio.extended) loud.push(radio.transmitting ? "RADIO TX" : "ANTENNA UP");
    if (radio.uhf) loud.push("UHF");
    if (radio.vhf) loud.push("VHF");
    if (state.bayDoorsOpen) loud.push("BAY DOORS");
    if (state.gearDown) loud.push("GEAR");
    if (state.laserOn) loud.push("LASER");
    if (state.receptacleOpen) loud.push("BOOM DOOR");
    if (irads && irads.obscured) loud.push("IRADS CLOUD");
    if ((state.moonlight || 0) >= 0.72) loud.push("FULL MOON");
    return {
        rcs: rcs,
        paint: paint,
        radio: radio,
        loud: loud,
        moonlight: clamp(state.moonlight || 0, 0, 1),
        moonName: moonlightName(state.moonlight),
        ghost: paint < 0.08 && !radio.transmitting && !state.bayDoorsOpen
    };
}

function defaultJetState() {
    return {
        xNm: 0,
        yNm: 0,
        altFt: 22000,
        hdgDeg: 90,
        airspeedKt: 480,
        aspectDeg: 10,
        phase: PHASE.INGRESS,
        antennaExtended: true,
        antennaRetracted: false,
        radioBand: "uhf",
        radioTx: false,
        forceAntennaUp: false,
        bayDoorsOpen: false,
        gearDown: false,
        laserOn: false,
        receptacleOpen: false,
        fuel: 1,
        moonlight: MOON.NEW,
        inCloudShadow: false
    };
}

function tankerContact(jet, tanker) {
    if (!tanker) return { inBasket: false, rangeNm: 99, altErrFt: 9999 };
    var dx = (tanker.xNm || 0) - (jet.xNm || 0);
    var dy = (tanker.yNm || 0) - (jet.yNm || 0);
    var rangeNm = Math.sqrt(dx * dx + dy * dy);
    var altErrFt = Math.abs((jet.altFt || 0) - (tanker.altFt || 22000));
    var basket = FUEL.BASKET_NM;
    if (jet.radioTx) basket *= FUEL.RADIO_BASKET_MUL;
    return {
        inBasket: rangeNm <= basket && altErrFt <= FUEL.BASKET_ALT_FT,
        rangeNm: rangeNm,
        altErrFt: altErrFt,
        basketNm: basket
    };
}

function transferFuel(fuel, dtS, latched) {
    if (!latched) return clamp(fuel || 0, 0, 1);
    return clamp((fuel || 0) + FUEL.TRANSFER_PER_S * (dtS || 0), 0, 1);
}

function burnFuel(fuel, distanceNm, burnPerNm) {
    var rate = burnPerNm == null ? FUEL.BURN_PER_NM : burnPerNm;
    return clamp((fuel || 0) - Math.max(0, distanceNm || 0) * rate, 0, 1);
}

var StealthRules = {
    RCS: RCS,
    IRADS: IRADS,
    LASER: LASER,
    PHASE: PHASE,
    MOON: MOON,
    FUEL: FUEL,
    clamp: clamp,
    moonlightName: moonlightName,
    opticalDetectMul: opticalDetectMul,
    irContrast: irContrast,
    expectedTofS: expectedTofS,
    bombTimeOfFlightS: bombTimeOfFlightS,
    laserWindows: laserWindows,
    laserState: laserState,
    antennaExtended: antennaExtended,
    radioBloom: radioBloom,
    geometricRcs: geometricRcs,
    paintRatePerSecond: paintRatePerSecond,
    cloudAt: cloudAt,
    losBlockedByCloud: losBlockedByCloud,
    slantRangeNm: slantRangeNm,
    groundRangeNm: groundRangeNm,
    bearingDeg: bearingDeg,
    headingErrorDeg: headingErrorDeg,
    iradsPicture: iradsPicture,
    generateClouds: generateClouds,
    recommendFinalRun: recommendFinalRun,
    applyFinalRunDiscipline: applyFinalRunDiscipline,
    visibilitySummary: visibilitySummary,
    defaultJetState: defaultJetState,
    tankerContact: tankerContact,
    transferFuel: transferFuel,
    burnFuel: burnFuel
};

if (typeof module !== "undefined" && module.exports) module.exports = StealthRules;
