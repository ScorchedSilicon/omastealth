const assert = require("assert");
const S = require("../StealthRules.js");
const M = require("../MissionRules.js");

M.attachStealth(S);

function test(name, fn) {
    fn();
    console.log("ok  " + name);
}

test("8-60-8 windows on a 76s fall", () => {
    const w = S.laserWindows(76);
    assert.strictEqual(w.initialEndS, 8);
    assert.strictEqual(w.darkS, 60);
    assert.strictEqual(w.terminalEndS, 76);
});

test("short TOF keeps both 8s windows and shrinks dark", () => {
    const w = S.laserWindows(30);
    assert.strictEqual(w.initialEndS, 8);
    assert.ok(w.darkS < 60);
    assert.strictEqual(w.terminalEndS, 30);
});

test("laser phases follow pickle clock", () => {
    assert.strictEqual(S.laserState(2, 76, true).phase, "initial");
    assert.strictEqual(S.laserState(2, 76, true).on, true);
    assert.strictEqual(S.laserState(20, 76, true).phase, "dark");
    assert.strictEqual(S.laserState(20, 76, true).on, false);
    assert.strictEqual(S.laserState(70, 76, true).phase, "terminal");
    assert.strictEqual(S.laserState(70, 76, true).on, true);
    assert.strictEqual(S.laserState(80, 76, true).phase, "impact");
});

test("laser on with no IRADS track dumps no energy on target", () => {
    const las = S.laserState(2, 76, false);
    assert.strictEqual(las.on, true);
    assert.strictEqual(las.energyOnTarget, false);
    assert.strictEqual(las.reason, "no-irads");
});

test("UHF/VHF mast up blooms RCS, TX blooms more", () => {
    const quiet = S.geometricRcs(S.defaultJetState());
    const stowed = S.geometricRcs(
        Object.assign(S.defaultJetState(), { antennaExtended: false, antennaRetracted: true })
    );
    const tx = S.geometricRcs(Object.assign(S.defaultJetState(), { radioTx: true }));
    assert.ok(stowed < quiet, "stowed quieter than mast-up");
    assert.ok(tx > quiet, "transmit louder than receive");
    const bloom = S.radioBloom({ antennaExtended: true, radioBand: "both", radioTx: true });
    assert.strictEqual(bloom.uhf, true);
    assert.strictEqual(bloom.vhf, true);
    assert.strictEqual(bloom.transmitting, true);
});

test("final-run discipline stows masts and kills radio", () => {
    const next = S.applyFinalRunDiscipline(S.defaultJetState());
    assert.strictEqual(next.phase, "final");
    assert.strictEqual(next.antennaRetracted, true);
    assert.strictEqual(next.antennaExtended, false);
    assert.strictEqual(next.radioTx, false);
    assert.strictEqual(S.antennaExtended(next), false);
});

test("radio PTT forces the mast back up on the final", () => {
    const stowed = S.applyFinalRunDiscipline(S.defaultJetState());
    stowed.radioTx = true;
    assert.strictEqual(S.antennaExtended(stowed), true);
});

test("FLIR sees far ahead, DLIR takes the underpass", () => {
    const tgt = { xNm: 10, yNm: 0, altFt: 0 };
    const far = { xNm: 0, yNm: 0, altFt: 22000, hdgDeg: 90 };
    const near = { xNm: 9.2, yNm: 0, altFt: 22000, hdgDeg: 90 };
    const farPic = S.iradsPicture(far, tgt, []);
    const nearPic = S.iradsPicture(near, tgt, []);
    assert.strictEqual(farPic.active, "FLIR");
    assert.strictEqual(nearPic.active, "DLIR");
});

test("cloud on the LOS blanks IRADS", () => {
    const jet = { xNm: 0, yNm: 0, altFt: 22000, hdgDeg: 90 };
    const tgt = { xNm: 10, yNm: 0, altFt: 0 };
    const clouds = [{ xNm: 5, yNm: 0, radiusNm: 1.2 }];
    const pic = S.iradsPicture(jet, tgt, clouds);
    assert.strictEqual(pic.obscured, true);
    assert.strictEqual(pic.trackValid, false);
    assert.strictEqual(pic.active, null);
});

test("bay doors are a much louder RCS event than a mast", () => {
    const clean = S.geometricRcs(
        Object.assign(S.defaultJetState(), { antennaExtended: false, antennaRetracted: true })
    );
    const doors = S.geometricRcs(
        Object.assign(S.defaultJetState(), {
            antennaExtended: false,
            antennaRetracted: true,
            bayDoorsOpen: true
        })
    );
    assert.ok(doors > clean * 10);
});

test("mission pickle starts the 8-60-8 clock", () => {
    const theater = M.theaterById("tonopah");
    const flight = M.newFlight(theater, S, M.difficultyById("ghost"));
    const drop = M.pickle(flight, S);
    assert.strictEqual(drop.ok, true);
    assert.ok(drop.windows.initialEndS === 8);
    assert.ok(flight.dropped.tofS > 20);
});

test("difficulty sets moon, range, and tanker need", () => {
    const g = M.difficultyById("ghost");
    const n = M.difficultyById("nighthawk");
    const x = M.difficultyById("exposed");
    assert.ok(g.moon < n.moon && n.moon < x.moon);
    assert.strictEqual(g.tankerRequired, false);
    assert.strictEqual(n.tankerRequired, true);
    assert.strictEqual(x.tankerRequired, true);
    assert.ok(x.extraRangeNm > n.extraRangeNm);
    assert.strictEqual(S.moonlightName(x.moon), "FULL MOON");
    assert.strictEqual(S.moonlightName(g.moon), "NEW MOON");
});

test("full moon is optically louder than new moon", () => {
    const dark = S.opticalDetectMul(0.05, false);
    const full = S.opticalDetectMul(1, false);
    const shadow = S.opticalDetectMul(1, true);
    assert.ok(full > dark);
    assert.ok(shadow < dark);
});

test("nighthawk sorties spawn a tanker and start short on gas", () => {
    const theater = M.theaterById("baghdad");
    const flight = M.newFlight(theater, S, M.difficultyById("nighthawk"));
    assert.ok(flight.tanker);
    assert.ok(flight.jet.fuel < 0.7);
    assert.ok(flight.target.xNm > theater.target.xNm);
    assert.ok(flight.jet.xNm < 0);
});

test("ghost hop has no tanker and a full bag of gas", () => {
    const flight = M.newFlight(M.theaterById("tonopah"), S, M.difficultyById("ghost"));
    assert.strictEqual(flight.tanker, null);
    assert.strictEqual(flight.jet.fuel, 1);
});

test("boom latch transfers fuel; radio widens the basket", () => {
    const jet = S.defaultJetState();
    jet.xNm = 5;
    jet.yNm = 0;
    jet.altFt = 22000;
    const tanker = { xNm: 5.2, yNm: 0, altFt: 22000 };
    const quiet = S.tankerContact(jet, tanker);
    jet.radioTx = true;
    const talk = S.tankerContact(jet, tanker);
    assert.ok(talk.basketNm > quiet.basketNm);
    const after = S.transferFuel(0.4, 1, true);
    assert.ok(after > 0.4);
});

test("burning the route empties the tanks", () => {
    const left = S.burnFuel(0.5, 40, 0.013);
    assert.ok(left < 0.5);
    assert.strictEqual(S.burnFuel(0.1, 80, 0.013), 0);
});

console.log("\nall stealth/mission rules passed");
