import QtQuick
import "StealthRules.js" as Stealth
import "MissionRules.js" as Mission

Item {
    id: root
    anchors.fill: parent
    focus: opened

    property var shell: null
    property var manifest: null
    property string omarchyPath: ""
    property bool opened: false

    property string screen: "title"
    property var campaign: null
    property var flight: null
    property var theater: null
    property string loadoutId: "realistic"
    property string difficultyId: "ghost"
    property int theaterIndex: 0
    property bool keyBoom: false

    property bool keyUp: false
    property bool keyDown: false
    property bool keyLeft: false
    property bool keyRight: false
    property bool keyRadio: false
    property string statusLine: ""

    function open(payloadJson) {
        root.opened = true
        root.visible = true
        root.forceActiveFocus()
        if (!root.campaign) bootTitle()
        return "ok"
    }

    function close() {
        tick.running = false
        root.opened = false
        root.visible = false
        return "ok"
    }

    function bootTitle() {
        Mission.attachStealth(Stealth)
        root.screen = "title"
        root.theaterIndex = 0
        root.theater = Mission.theaters()[0]
        root.campaign = Mission.newCampaign({ theaterId: root.theater.id, loadoutId: root.loadoutId, difficultyId: root.difficultyId })
        root.statusLine = "PRESS ENTER"
    }

    function startBriefing() {
        root.theater = Mission.theaters()[root.theaterIndex]
        root.campaign = Mission.newCampaign({ theaterId: root.theater.id, loadoutId: root.loadoutId, difficultyId: root.difficultyId })
        root.screen = "briefing"
        root.statusLine = "ENTER ARM  ·  A/D THEATER  ·  L LOADOUT  ·  M DIFFICULTY"
    }

    function startFlight() {
        Mission.attachStealth(Stealth)
        var diff = Mission.difficultyById(root.difficultyId)
        root.flight = Mission.newFlight(root.theater, Stealth, diff)
        root.screen = "flight"
        root.statusLine = ""
        tick.running = true
    }

    function finishFlight() {
        tick.running = false
        if (root.campaign && root.flight) {
            if (root.flight.target && !root.flight.target.alive) root.campaign.hits += 1
            else root.campaign.misses += 1
            root.campaign.rank = Mission.rankFor(root.campaign, root.flight)
        }
        root.screen = "debrief"
    }

    visible: opened
    width: 1280
    height: 720

    Rectangle {
        anchors.fill: parent
        color: "#07090d"
    }

    Timer {
        id: tick
        interval: 16
        repeat: true
        running: false
        onTriggered: {
            if (!root.flight || root.screen !== "flight") return
            Mission.stepFlight(root.flight, {
                up: root.keyUp,
                down: root.keyDown,
                left: root.keyLeft,
                right: root.keyRight,
                radioTx: root.keyRadio,
                receptacle: root.keyBoom ? true : root.flight.jet.receptacleOpen
            }, 0.016, Stealth)
            hud.requestPaint()
            if (root.flight.dead) finishFlight()
            if (root.flight.dropped && root.flight.dropped.done) finishFlight()
            if (root.flight.jet.phase === "egress" && root.flight.jet.xNm > root.flight.target.xNm + 6)
                finishFlight()
        }
    }

    Column {
        visible: root.screen === "title"
        anchors.centerIn: parent
        spacing: 14
        Text {
            text: "OMATARI"
            color: "#4a5a4a"
            font.pixelSize: 14
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
        }
        Text {
            text: "OMASTEALTH"
            color: "#7cffb2"
            font.pixelSize: 42
            font.bold: true
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
        }
        Text {
            text: "AN OMARCHY NIGHT SORTIE"
            color: "#c8d6c8"
            font.pixelSize: 14
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
        }
        Text {
            text: "F-117A  ·  IRADS  ·  STOW THE MASTS"
            color: "#8aa08a"
            font.pixelSize: 12
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
        }
        Text {
            text: "PRESS ENTER"
            color: "#7cffb2"
            font.pixelSize: 16
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
            topPadding: 20
        }
    }

    Rectangle {
        visible: root.screen === "briefing"
        anchors.fill: parent
        color: "#07090d"
        Column {
            anchors.left: parent.left
            anchors.leftMargin: 48
            anchors.top: parent.top
            anchors.topMargin: 40
            spacing: 10
            width: parent.width - 96
            Text {
                text: root.theater ? (root.theater.code + " / " + root.theater.name) : ""
                color: "#7cffb2"
                font.pixelSize: 22
                font.family: "monospace"
            }
            Text {
                text: root.theater ? ("TARGET  " + root.theater.target.name) : ""
                color: "#e8ffe8"
                font.pixelSize: 16
                font.family: "monospace"
            }
            Text {
                text: "LOADOUT  " + (root.loadoutId === "fun" ? "FOUR-BAY FUN JET" : "TWO-BAY F-117A")
                color: "#c8d6c8"
                font.pixelSize: 14
                font.family: "monospace"
            }
            Text {
                text: {
                    var d = Mission.difficultyById(root.difficultyId)
                    var moon = Stealth.moonlightName(d.moon)
                    var gas = d.tankerRequired ? ("TANKER REQUIRED  ·  START FUEL " + Math.round(d.fuelStart * 100) + "%") : "UNREFUELED HOP"
                    return "DIFFICULTY  " + d.name + "  ·  " + moon + "  ·  +" + d.extraRangeNm + " nm  ·  " + gas
                }
                color: "#e8ffe8"
                font.pixelSize: 14
                font.family: "monospace"
            }
            Text {
                width: parent.width
                wrapMode: Text.WordWrap
                color: "#9aaa9a"
                font.pixelSize: 14
                font.family: "monospace"
                lineHeight: 1.35
                text: "FLIR looks a long way out the nose. When the target slides under, DLIR takes the picture.\nRandom cloud cells blank IRADS. No picture, no laser energy on the target.\nUHF and VHF masts bloom the jet. Radio transmit is worse. At IP the jet stows the antennas for the final.\nAfter pickle the laser runs 8 seconds, goes dark about a minute, then comes back for the last 8 seconds of corrections.\nMoonlight is optical, not magic. Full moon lets AAA and searchlights see the facets. New moon hides you.\nLonger routes start you short on gas. Fly the boom: F opens the receptacle, hold station on SHELL 41. Talking to the tanker widens the basket and lights you up."
            }
            Text {
                topPadding: 18
                text: "ENTER start   A/D theater   L loadout   M difficulty   ESC abort"
                color: "#7cffb2"
                font.pixelSize: 13
                font.family: "monospace"
            }
        }
    }

    Item {
        id: flightView
        visible: root.screen === "flight"
        anchors.fill: parent

        Canvas {
            id: hud
            anchors.fill: parent
            onPaint: {
                var ctx = getContext("2d")
                var w = width
                var h = height
                ctx.fillStyle = "#07090d"
                ctx.fillRect(0, 0, w, h)

                var f = root.flight
                if (!f) return
                var jet = f.jet
                var moon = jet.moonlight || 0
                var span = Math.max(24, f.target.xNm - Math.min(0, jet.xNm) + 8)
                var origin = Math.min(0, jet.xNm) - 2
                var scaleX = w / span
                var cx = function(nm) { return (nm - origin) * scaleX }
                var cy = function(yNm) { return h * 0.55 + yNm * 42 }

                var skyG = Math.floor(7 + moon * 28)
                ctx.fillStyle = "rgb(" + skyG + "," + (skyG + 2) + "," + (skyG + 8) + ")"
                ctx.fillRect(0, 0, w, h)
                if (moon > 0.08) {
                    ctx.fillStyle = "rgba(230,230,210," + (0.25 + moon * 0.55) + ")"
                    ctx.beginPath()
                    ctx.arc(w * 0.82, h * 0.16, 10 + moon * 8, 0, Math.PI * 2)
                    ctx.fill()
                }

                ctx.fillStyle = "rgba(90,110,130," + (0.18 + moon * 0.16) + ")"
                for (var i = 0; i < f.clouds.length; i++) {
                    var c = f.clouds[i]
                    ctx.beginPath()
                    ctx.arc(cx(c.xNm), cy(c.yNm) - 80, c.radiusNm * scaleX, 0, Math.PI * 2)
                    ctx.fill()
                }

                ctx.strokeStyle = "#1c2a22"
                ctx.beginPath()
                ctx.moveTo(0, h * 0.72)
                ctx.lineTo(w, h * 0.72)
                ctx.stroke()

                if (f.tanker) {
                    var tx = cx(f.tanker.xNm)
                    var ty = cy(f.tanker.yNm) - (f.tanker.altFt / 400)
                    ctx.fillStyle = f.boomLatched ? "#7cffb2" : "#c8d0ff"
                    ctx.fillRect(tx - 18, ty - 5, 36, 8)
                    ctx.fillStyle = "#9aa4c8"
                    ctx.fillRect(tx + 8, ty - 2, 22, 4)
                }

                for (var e = 0; e < f.emitters.length; e++) {
                    var em = f.emitters[e]
                    ctx.fillStyle = em.band === "tracking" ? "#ff5a5a" : em.band === "aaa" ? "#d4a017" : "#4a7cff"
                    ctx.fillRect(cx(em.xNm) - 3, h * 0.72 - 10, 6, 10)
                }

                ctx.fillStyle = f.target.alive ? "#e8ffe8" : "#444"
                ctx.fillRect(cx(f.target.xNm) - 6, h * 0.72 - 16, 12, 16)

                var jx = cx(jet.xNm)
                var jy = cy(jet.yNm) - (jet.altFt / 400)
                ctx.fillStyle = jet.bayDoorsOpen ? "#6a4030" : "#9aa4a0"
                ctx.beginPath()
                ctx.moveTo(jx + 16, jy)
                ctx.lineTo(jx - 10, jy - 7)
                ctx.lineTo(jx - 6, jy)
                ctx.lineTo(jx - 10, jy + 7)
                ctx.closePath()
                ctx.fill()

                if (jet.antennaExtended) {
                    ctx.strokeStyle = "#7cffb2"
                    ctx.beginPath()
                    ctx.moveTo(jx - 2, jy)
                    ctx.lineTo(jx - 2, jy - 14)
                    ctx.stroke()
                }

                if (f.dropped && !f.dropped.done) {
                    var frac = f.dropped.ageS / f.dropped.tofS
                    var bx = jx + (cx(f.target.xNm) - jx) * frac
                    var by = jy + (h * 0.72 - 16 - jy) * frac * frac
                    ctx.fillStyle = "#fff4c2"
                    ctx.fillRect(bx, by, 3, 5)
                    if (jet.laserOn && f.irads && f.irads.trackValid) {
                        ctx.strokeStyle = "rgba(124,255,178,0.55)"
                        ctx.beginPath()
                        ctx.moveTo(jx, jy + 6)
                        ctx.lineTo(cx(f.target.xNm), h * 0.72 - 16)
                        ctx.stroke()
                    }
                }
            }
        }

        Column {
            anchors.left: parent.left
            anchors.top: parent.top
            anchors.margins: 16
            spacing: 3
            Text { color: "#7cffb2"; font.family: "monospace"; font.pixelSize: 12; text: root.theater ? (root.theater.code + " / " + root.theater.name) : "" }
            Text { color: "#c8d6c8"; font.family: "monospace"; font.pixelSize: 12; text: root.flight ? ("PHASE " + root.flight.jet.phase.toUpperCase()) : "" }
            Text { color: "#c8d6c8"; font.family: "monospace"; font.pixelSize: 12; text: root.flight ? ("ALT " + Math.round(root.flight.jet.altFt) + "   TAS " + root.flight.jet.airspeedKt + "   " + Stealth.moonlightName(root.flight.jet.moonlight)) : "" }
            Text {
                color: (root.flight && root.flight.jet.fuel < 0.18) ? "#ff5a5a" : "#c8d6c8"
                font.family: "monospace"; font.pixelSize: 12
                text: {
                    if (!root.flight) return ""
                    var fuel = Math.round(root.flight.jet.fuel * 100)
                    if (root.flight.flameout) return "FLAMEOUT"
                    if (root.flight.boomLatched) return "FUEL " + fuel + "%  ·  BOOM LATCHED"
                    if (root.flight.tanker && !root.flight.aarDone) return "FUEL " + fuel + "%  ·  SHELL 41 AHEAD"
                    return "FUEL " + fuel + "%"
                }
            }
            Text {
                color: (root.flight && root.flight.jet.antennaExtended) ? "#ffb347" : "#7cffb2"
                font.family: "monospace"; font.pixelSize: 12
                text: root.flight ? (root.flight.jet.antennaExtended ? "ANTENNA UP  UHF/VHF" : "ANTENNA STOWED") : ""
            }
            Text {
                color: root.keyRadio ? "#ff5a5a" : "#8aa08a"
                font.family: "monospace"; font.pixelSize: 12
                text: root.keyRadio ? "RADIO TX  —  YOU ARE LOUD" : "RADIO QUIET"
            }
            Text {
                color: "#c8d6c8"; font.family: "monospace"; font.pixelSize: 12
                text: {
                    if (!root.flight || !root.flight.irads) return "IRADS —"
                    var ir = root.flight.irads
                    if (ir.obscured) return "IRADS OBSCURED  CLOUD"
                    if (ir.active === "FLIR") return "IRADS FLIR  " + ir.flir.rangeNm.toFixed(1) + " nm" + (ir.flir.nfov ? "  NFOV LOCK" : "  WFOV")
                    if (ir.active === "DLIR") return "IRADS DLIR  DOWN  " + ir.dlir.rangeNm.toFixed(1) + " nm"
                    return "IRADS NO TRACK"
                }
            }
            Text {
                color: "#c8d6c8"; font.family: "monospace"; font.pixelSize: 12
                text: {
                    if (!root.flight || !root.flight.dropped) return "LASER SAFE"
                    var L = root.flight.dropped.laser
                    if (!L) return "LASER —"
                    if (L.phase === "initial") return "LASER INITIAL  " + (8 - L.tS).toFixed(1) + "s"
                    if (L.phase === "dark") return "LASER DARK  " + (L.windows.darkEndS - L.tS).toFixed(1) + "s"
                    if (L.phase === "terminal") return "LASER TERMINAL  CORRECTIONS"
                    return "IMPACT"
                }
            }
        }

        Rectangle {
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.margins: 16
            width: 160
            height: 12
            color: "#1a1f18"
            border.color: "#3a4a3a"
            Rectangle {
                width: parent.width * (root.flight ? root.flight.paint : 0)
                height: parent.height
                color: (root.flight && root.flight.paint > 0.7) ? "#ff5a5a" : "#7cffb2"
            }
        }
        Text {
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.rightMargin: 16
            anchors.topMargin: 32
            color: "#8aa08a"
            font.family: "monospace"
            font.pixelSize: 11
            text: "PAINT"
        }
        Rectangle {
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.rightMargin: 16
            anchors.topMargin: 52
            width: 160
            height: 12
            color: "#1a1f18"
            border.color: "#3a4a3a"
            Rectangle {
                width: parent.width * (root.flight ? root.flight.jet.fuel : 0)
                height: parent.height
                color: (root.flight && root.flight.jet.fuel < 0.18) ? "#ff5a5a" : "#c8d0ff"
            }
        }
        Text {
            anchors.right: parent.right
            anchors.top: parent.top
            anchors.rightMargin: 16
            anchors.topMargin: 68
            color: "#8aa08a"
            font.family: "monospace"
            font.pixelSize: 11
            text: "FUEL"
        }

        Text {
            anchors.left: parent.left
            anchors.bottom: parent.bottom
            anchors.margins: 16
            color: "#6a7a6a"
            font.family: "monospace"
            font.pixelSize: 11
            text: "WASD fly   SPACE pickle   F boom door   T mast   R radio   ESC abort"
        }
    }

    Column {
        visible: root.screen === "debrief"
        anchors.centerIn: parent
        spacing: 10
        Text {
            text: root.campaign && root.campaign.rank ? root.campaign.rank : "DEBRIEF"
            color: "#7cffb2"
            font.pixelSize: 28
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
        }
        Text {
            text: root.flight && root.flight.target && !root.flight.target.alive ? "TARGET DESTROYED" : (root.flight && root.flight.dead ? "PAINTED AND LOST" : "NO HIT")
            color: "#e8ffe8"
            font.pixelSize: 16
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
        }
        Text {
            text: {
                if (!root.flight) return ""
                var bits = []
                if (root.flight.dropped)
                    bits.push("TOF " + root.flight.dropped.tofS.toFixed(1) + "s   LASER ENERGY " + root.flight.dropped.energyS.toFixed(1) + "s")
                bits.push(Stealth.moonlightName(root.flight.jet.moonlight))
                bits.push("FUEL " + Math.round(root.flight.jet.fuel * 100) + "%")
                if (root.flight.aarDone) bits.push("AAR COMPLETE")
                if (root.flight.flameout) bits.push("FLAMEOUT")
                return bits.join("   ")
            }
            color: "#9aaa9a"
            font.pixelSize: 13
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
        }
        Text {
            topPadding: 12
            text: "ENTER next   ESC title"
            color: "#7cffb2"
            font.pixelSize: 13
            font.family: "monospace"
            anchors.horizontalCenter: parent.horizontalCenter
        }
    }

    Keys.onPressed: function(event) {
        if (event.key === Qt.Key_Escape) {
            if (root.screen === "flight" || root.screen === "briefing" || root.screen === "debrief")
                bootTitle()
            else
                root.close()
            event.accepted = true
            return
        }
        if (root.screen === "title" && (event.key === Qt.Key_Return || event.key === Qt.Key_Enter || event.key === Qt.Key_Space)) {
            startBriefing(); event.accepted = true; return
        }
        if (root.screen === "briefing") {
            if (event.key === Qt.Key_Return || event.key === Qt.Key_Enter) { startFlight(); event.accepted = true; return }
            if (event.key === Qt.Key_A || event.key === Qt.Key_Left) {
                root.theaterIndex = (root.theaterIndex + Mission.theaters().length - 1) % Mission.theaters().length
                root.theater = Mission.theaters()[root.theaterIndex]
                event.accepted = true; return
            }
            if (event.key === Qt.Key_D || event.key === Qt.Key_Right) {
                root.theaterIndex = (root.theaterIndex + 1) % Mission.theaters().length
                root.theater = Mission.theaters()[root.theaterIndex]
                event.accepted = true; return
            }
            if (event.key === Qt.Key_L) {
                root.loadoutId = root.loadoutId === "fun" ? "realistic" : "fun"
                event.accepted = true; return
            }
            if (event.key === Qt.Key_M) {
                root.difficultyId = Mission.nextDifficulty(root.difficultyId).id
                event.accepted = true; return
            }
        }
        if (root.screen === "debrief" && (event.key === Qt.Key_Return || event.key === Qt.Key_Enter)) {
            root.theaterIndex = Math.min(Mission.theaters().length - 1, root.theaterIndex + 1)
            startBriefing(); event.accepted = true; return
        }
        if (root.screen === "flight") {
            if (event.key === Qt.Key_W || event.key === Qt.Key_Up) root.keyUp = true
            if (event.key === Qt.Key_S || event.key === Qt.Key_Down) root.keyDown = true
            if (event.key === Qt.Key_A || event.key === Qt.Key_Left) root.keyLeft = true
            if (event.key === Qt.Key_D || event.key === Qt.Key_Right) root.keyRight = true
            if (event.key === Qt.Key_R) root.keyRadio = true
            if (event.key === Qt.Key_F) {
                root.keyBoom = true
                if (root.flight) root.flight.jet.receptacleOpen = true
            }
            if (event.key === Qt.Key_T && root.flight) {
                root.flight.jet.antennaRetracted = !root.flight.jet.antennaRetracted
                root.flight.jet.antennaExtended = !root.flight.jet.antennaRetracted
            }
            if (event.key === Qt.Key_Space) {
                Mission.pickle(root.flight, Stealth)
                hud.requestPaint()
            }
            event.accepted = true
        }
    }

    Keys.onReleased: function(event) {
        if (event.key === Qt.Key_W || event.key === Qt.Key_Up) root.keyUp = false
        if (event.key === Qt.Key_S || event.key === Qt.Key_Down) root.keyDown = false
        if (event.key === Qt.Key_A || event.key === Qt.Key_Left) root.keyLeft = false
        if (event.key === Qt.Key_D || event.key === Qt.Key_Right) root.keyRight = false
        if (event.key === Qt.Key_R) root.keyRadio = false
        if (event.key === Qt.Key_F) {
            root.keyBoom = false
            if (root.flight && !root.flight.boomLatched) root.flight.jet.receptacleOpen = false
        }
    }
}
