// MissionRules.js
// Campaign + flight + bomb logic. Pure JS.
// Pass the StealthRules module into functions as `stealth`.

var Stealth = null;

function attachStealth(mod) {
    Stealth = mod;
    return mod;
}

function theaters() {
    return [
        {
            id: "tonopah",
            code: "01",
            name: "TONOPAH WORKUP",
            night: "local",
            target: { name: "Mock C3 bunker", xNm: 16.4, yNm: 0.2, altFt: 3100 },
            emitters: [
                { id: "search-1", band: "search", rangeNm: 14, power: 0.6, xNm: 10, yNm: 3 },
                { id: "aaa-1", band: "aaa", rangeNm: 6, power: 0.4, xNm: 15, yNm: -1 }
            ],
            cloudSeed: 117,
            cloudCount: 3
        },
        {
            id: "panama",
            code: "02",
            name: "RIO HATO",
            night: "890219",
            target: { name: "Command barracks", xNm: 18.1, yNm: -0.4, altFt: 80 },
            emitters: [
                { id: "search-1", band: "search", rangeNm: 12, power: 0.8, xNm: 9, yNm: 2 },
                { id: "track-1", band: "tracking", rangeNm: 8, power: 1.1, xNm: 16, yNm: 1.5 }
            ],
            cloudSeed: 89,
            cloudCount: 4
        },
        {
            id: "baghdad",
            code: "03",
            name: "BAGHDAD OPENING NIGHT",
            night: "910117",
            target: { name: "ATOC / air-defense node", xNm: 20.5, yNm: 0.1, altFt: 140 },
            emitters: [
                { id: "search-1", band: "search", rangeNm: 11, power: 1.2, xNm: 8, yNm: -2 },
                { id: "search-2", band: "search", rangeNm: 13, power: 1.0, xNm: 14, yNm: 3 },
                { id: "track-1", band: "tracking", rangeNm: 7, power: 1.6, xNm: 19, yNm: 0.8 },
                { id: "aaa-1", band: "aaa", rangeNm: 5, power: 0.7, xNm: 20, yNm: -0.6 }
            ],
            cloudSeed: 1991,
            cloudCount: 6
        },
        {
            id: "kosovo",
            code: "04",
            name: "BELGRADE APPROACH",
            night: "990327",
            target: { name: "Radio-relay mast", xNm: 19.2, yNm: 0.0, altFt: 720 },
            emitters: [
                { id: "search-1", band: "search", rangeNm: 10, power: 1.4, xNm: 7, yNm: 1 },
                { id: "track-1", band: "tracking", rangeNm: 6, power: 2.0, xNm: 17, yNm: -1.2 },
                { id: "track-2", band: "tracking", rangeNm: 6, power: 1.8, xNm: 18.5, yNm: 2.2 }
            ],
            cloudSeed: 31,
            cloudCount: 7
        },
        {
            id: "boss",
            code: "05",
            name: "THE ENCLOSURE",
            night: "classified",
            target: { name: "Integrated IADS heart", xNm: 22.0, yNm: 0.0, altFt: 200 },
            emitters: [
                { id: "search-1", band: "search", rangeNm: 9, power: 1.6, xNm: 6, yNm: 0 },
                { id: "track-1", band: "tracking", rangeNm: 5, power: 2.2, xNm: 12, yNm: 2 },
                { id: "track-2", band: "tracking", rangeNm: 5, power: 2.2, xNm: 16, yNm: -2 },
                { id: "track-3", band: "tracking", rangeNm: 4, power: 2.4, xNm: 21, yNm: 0.4 }
            ],
            cloudSeed: 666,
            cloudCount: 8
        }
    ];
}

function theaterById(id) {
    var all = theaters();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return all[0];
}

function loadouts() {
    return {
        realistic: { bays: 2, name: "F-117A two-bay", stores: ["GBU-27", "GBU-27"] },
        fun: { bays: 4, name: "MicroProse four-bay", stores: ["GBU-27", "GBU-27", "GBU-10", "GBU-12"] }
    };
}

function difficulties() {
    return [
        {
            id: "ghost",
            name: "GHOST",
            moon: 0.05,
            extraRangeNm: 0,
            tankerRequired: false,
            fuelStart: 1.0,
            burnPerNm: 0.008,
            note: "New moon. Short hop. No tanker. The jet is a hole in the sky."
        },
        {
            id: "nighthawk",
            name: "NIGHTHAWK",
            moon: 0.45,
            extraRangeNm: 14,
            tankerRequired: true,
            fuelStart: 0.58,
            burnPerNm: 0.011,
            note: "Quarter moon. Legs that need one splash of gas. Boom before IP or you flame out."
        },
        {
            id: "exposed",
            name: "EXPOSED",
            moon: 1.0,
            extraRangeNm: 28,
            tankerRequired: true,
            fuelStart: 0.44,
            burnPerNm: 0.013,
            note: "Full moon. Long route. Gunners can see the facets. Tanker is not optional."
        }
    ];
}

function difficultyById(id) {
    var all = difficulties();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return all[0];
}

function nextDifficulty(id) {
    var all = difficulties();
    for (var i = 0; i < all.length; i++) {
        if (all[i].id === id) return all[(i + 1) % all.length];
    }
    return all[0];
}

function applyDifficulty(theater, difficulty) {
    var d = difficulty || difficultyById("ghost");
    var copy = {
        id: theater.id,
        code: theater.code,
        name: theater.name,
        night: theater.night,
        target: {
            name: theater.target.name,
            xNm: theater.target.xNm + (d.extraRangeNm || 0),
            yNm: theater.target.yNm,
            altFt: theater.target.altFt
        },
        emitters: [],
        cloudSeed: theater.cloudSeed,
        cloudCount: theater.cloudCount + (d.moon >= 0.7 ? 1 : 0),
        difficulty: d
    };
    var shift = d.extraRangeNm || 0;
    for (var i = 0; i < theater.emitters.length; i++) {
        var e = theater.emitters[i];
        copy.emitters.push({
            id: e.id,
            band: e.band,
            rangeNm: e.rangeNm,
            power: e.power,
            xNm: e.xNm + shift,
            yNm: e.yNm
        });
    }
    if (d.moon >= 0.7) {
        copy.emitters.push({
            id: "searchlight-1",
            band: "searchlight",
            rangeNm: 5,
            power: 1.1,
            xNm: copy.target.xNm - 2.2,
            yNm: 0.6
        });
    }
    return copy;
}

function newCampaign(opts) {
    opts = opts || {};
    return {
        theaterId: opts.theaterId || "tonopah",
        loadoutId: opts.loadoutId || "realistic",
        difficultyId: opts.difficultyId || "ghost",
        seed: opts.seed || 117,
        bombsLeft: opts.loadoutId === "fun" ? 4 : 2,
        hits: 0,
        misses: 0,
        paintedS: 0,
        radioS: 0,
        rank: null
    };
}

function newFlight(theater, stealth, difficulty) {
    var S = stealth || Stealth;
    var d = difficulty || theater.difficulty || difficultyById("ghost");
    var routed = applyDifficulty(theater, d);
    var jet = S.defaultJetState();
    var startX = d.tankerRequired ? -(d.extraRangeNm || 8) * 0.55 : 0;
    jet.xNm = startX;
    jet.yNm = 0;
    jet.hdgDeg = 90;
    jet.moonlight = d.moon;
    jet.fuel = d.fuelStart;
    jet.receptacleOpen = false;
    var span = routed.target.xNm - startX + 4;
    var clouds = S.generateClouds(routed.cloudSeed, routed.cloudCount, span);
    var tanker = null;
    if (d.tankerRequired) {
        tanker = {
            name: "SHELL 41",
            xNm: startX + Math.max(4, (d.extraRangeNm || 8) * 0.35),
            yNm: 0,
            altFt: 22000
        };
    }
    return {
        theater: routed,
        difficulty: d,
        jet: jet,
        target: {
            name: routed.target.name,
            xNm: routed.target.xNm,
            yNm: routed.target.yNm,
            altFt: routed.target.altFt,
            alive: true
        },
        tanker: tanker,
        aarDone: false,
        boomLatched: false,
        emitters: routed.emitters.slice(),
        clouds: clouds,
        paint: 0,
        dead: false,
        flameout: false,
        dropped: null,
        tS: 0,
        radioS: 0
    };
}

function liveEmitterRanges(flight) {
    var jet = flight.jet;
    var out = [];
    for (var i = 0; i < flight.emitters.length; i++) {
        var e = flight.emitters[i];
        var dx = e.xNm - jet.xNm;
        var dy = e.yNm - jet.yNm;
        var rangeNm = Math.sqrt(dx * dx + dy * dy);
        out.push({
            id: e.id,
            band: e.band,
            power: e.power,
            rangeNm: rangeNm,
            xNm: e.xNm,
            yNm: e.yNm
        });
    }
    return out;
}

function stepFlight(flight, input, dt, stealth) {
    var S = stealth || Stealth;
    var jet = flight.jet;
    var dtS = dt || 0.016;
    input = input || {};

    if (input.toggleAntenna) {
        jet.antennaRetracted = !jet.antennaRetracted;
        jet.antennaExtended = !jet.antennaRetracted;
    }
    if (input.radioTx != null) jet.radioTx = !!input.radioTx;
    if (input.radioBand) jet.radioBand = input.radioBand;
    if (input.toggleReceptacle) jet.receptacleOpen = !jet.receptacleOpen;
    if (input.receptacle != null) jet.receptacleOpen = !!input.receptacle;

    var tasNmS = (jet.airspeedKt / 3600);
    if (input.up) jet.altFt = Math.min(32000, jet.altFt + 42);
    if (input.down) jet.altFt = Math.max(400, jet.altFt - 42);
    if (input.left) jet.yNm -= 0.012;
    if (input.right) jet.yNm += 0.012;
    var dxNm = tasNmS * dtS * 60 * 0.35;
    if (jet.fuel <= 0) dxNm *= 0.15;
    jet.xNm += dxNm;

    var burn = (flight.difficulty && flight.difficulty.burnPerNm) || S.FUEL.BURN_PER_NM;
    jet.fuel = S.burnFuel(jet.fuel, dxNm, burn);

    if (flight.tanker) {
        var boom = S.tankerContact(jet, flight.tanker);
        flight.boom = boom;
        var wantLatch = !!(jet.receptacleOpen && boom.inBasket);
        flight.boomLatched = wantLatch;
        if (wantLatch) {
            jet.phase = S.PHASE.AAR;
            jet.fuel = S.transferFuel(jet.fuel, dtS, true);
            if (jet.fuel >= 0.92) flight.aarDone = true;
        } else if (jet.phase === S.PHASE.AAR && jet.xNm < flight.target.xNm - 6) {
            jet.phase = S.PHASE.INGRESS;
            jet.receptacleOpen = false;
        }
    }

    if (jet.fuel <= 0) {
        flight.flameout = true;
        if (S.groundRangeNm(jet, flight.target) > 4) flight.dead = true;
    }

    var distToTgt = S.groundRangeNm(jet, flight.target);
    if (distToTgt < 6 && (jet.phase === S.PHASE.INGRESS || jet.phase === S.PHASE.AAR)) jet.phase = S.PHASE.IP;
    if (distToTgt < 3.2 && jet.phase === S.PHASE.IP) {
        jet.phase = S.PHASE.FINAL;
        var disc = S.applyFinalRunDiscipline(jet);
        jet.antennaExtended = disc.antennaExtended;
        jet.antennaRetracted = disc.antennaRetracted;
        jet.radioTx = disc.radioTx;
        jet.forceAntennaUp = disc.forceAntennaUp;
        jet.phase = disc.phase;
    }
    if (jet.xNm > flight.target.xNm + 3) jet.phase = S.PHASE.EGRESS;

    if (input.radioTx) flight.radioS = (flight.radioS || 0) + dtS;

    jet.inCloudShadow = !!S.cloudAt(flight.clouds, jet.xNm, jet.yNm);
    var irads = S.iradsPicture(jet, flight.target, flight.clouds);
    var emitters = liveEmitterRanges(flight);

    if (flight.dropped) {
        flight.dropped.ageS += dtS;
        var las = S.laserState(flight.dropped.ageS, flight.dropped.tofS, irads.trackValid);
        jet.laserOn = las.on;
        flight.dropped.laser = las;
        if (las.energyOnTarget) flight.dropped.energyS += dtS;
        if (flight.dropped.ageS >= flight.dropped.tofS) {
            var enough = flight.dropped.energyS >= 6.2 && las.phase === "impact";
            var terminalOk = flight.dropped.laser && flight.dropped.hadTerminal;
            if (las.phase === "terminal" || flight.dropped.ageS >= flight.dropped.tofS) {
                terminalOk = flight.dropped.energyS >= 5.5;
            }
            flight.dropped.hit = !!(enough || terminalOk) && irads.trackValid !== false && flight.dropped.energyS >= 5;
            if (!flight.target.alive) flight.dropped.hit = true;
            if (flight.dropped.hit) flight.target.alive = false;
            flight.dropped.done = true;
        }
        if (las.phase === "terminal") flight.dropped.hadTerminal = true;
    } else {
        jet.laserOn = false;
    }

    jet.bayDoorsOpen = !!(flight.dropped && !flight.dropped.done && flight.dropped.ageS < 2.4);

    var vis = S.visibilitySummary(jet, emitters, irads);
    flight.paint = Math.max(0, Math.min(1, flight.paint + vis.paint * dtS * 0.35 - dtS * 0.04));
    if (vis.radio.transmitting) flight.paint = Math.min(1, flight.paint + dtS * 0.22);
    if (flight.paint >= 1) flight.dead = true;

    flight.tS += dtS;
    flight.irads = irads;
    flight.vis = vis;
    flight.emittersLive = emitters;
    return flight;
}

function pickle(flight, stealth) {
    var S = stealth || Stealth;
    if (!flight || flight.dropped) return { ok: false, reason: "already-in-air" };
    if (flight.dead) return { ok: false, reason: "shot-down" };
    if (flight.flameout) return { ok: false, reason: "flameout" };
    if (flight.jet && flight.jet.receptacleOpen) return { ok: false, reason: "boom-door" };
    var tof = S.bombTimeOfFlightS(flight.jet.altFt, flight.jet.airspeedKt);
    flight.jet.bayDoorsOpen = true;
    flight.dropped = {
        ageS: 0,
        tofS: tof,
        energyS: 0,
        hit: false,
        done: false,
        hadTerminal: false,
        laser: S.laserState(0, tof, !!(flight.irads && flight.irads.trackValid))
    };
    return { ok: true, tofS: tof, windows: S.laserWindows(tof) };
}

function rankFor(campaign, flight) {
    if (flight.flameout && flight.dead) return "FLAMEOUT";
    if (flight.dead) return "EXPOSED";
    if (!flight.target.alive && campaign.paintedS < 4 && (flight.radioS || 0) < 2) return "GHOST";
    if (!flight.target.alive) return "NIGHTHAWK";
    return "NO DROP";
}

function briefingText(theater, difficulty) {
    var d = difficulty || theater.difficulty || difficultyById("ghost");
    var lines = [
        theater.code + " / " + theater.name,
        "Target: " + theater.target.name,
        "Difficulty: " + d.name + "  ·  " + (Stealth && Stealth.moonlightName ? Stealth.moonlightName(d.moon) : "MOON"),
        "Route extra: " + (d.extraRangeNm || 0) + " nm" + (d.tankerRequired ? "  ·  TANKER REQUIRED" : "  ·  NO TANKER"),
        d.note,
        "IRADS: FLIR long look-in, DLIR when the target slides under. Clouds blank the picture.",
        "UHF/VHF masts bloom you. Stow them at IP. Radio to the tanker also raises the farm.",
        "Pickle laser: 8s on, ~60s dark, last 8s on for corrections."
    ];
    return lines.join("\n");
}

var MissionRules = {
    attachStealth: attachStealth,
    theaters: theaters,
    theaterById: theaterById,
    loadouts: loadouts,
    difficulties: difficulties,
    difficultyById: difficultyById,
    nextDifficulty: nextDifficulty,
    applyDifficulty: applyDifficulty,
    newCampaign: newCampaign,
    newFlight: newFlight,
    liveEmitterRanges: liveEmitterRanges,
    stepFlight: stepFlight,
    pickle: pickle,
    rankFor: rankFor,
    briefingText: briefingText
};

if (typeof module !== "undefined" && module.exports) module.exports = MissionRules;
