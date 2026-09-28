# OmaStealth

Night sorties in the F-117A. An Omarchy arcade campaign.

OmaContra is to Contra what this is to MicroProse *F-117A Nighthawk Stealth Fighter 2.0*: same loop shape — briefing, arming, night pass, debrief — original rules and art. The 1991 DOS original lives at [archive.org/details/f-117](https://archive.org/details/f-117) for reference. Play that one via GOG or DOSBox. Do not copy its binaries, cockpit art, or manuals into this plugin.

Not a DCS study sim. Short overlay: briefing, one run, debrief, next theater.

## What the jet actually does in this build

- **UHF/VHF masts bloom RCS** while they are up. Transmit is worse. Radio is a choice, not free.
- **Final run stows the antennas.** Crossing IP retracts UHF/VHF and kills TX. `T` can raise them again if you like dying.
- **IRADS is two sensors.** FLIR looks a long way out the nose (WFOV then NFOV). When the target slides under, **DLIR** takes the picture.
- **Random cloud cells** sit on the route. Cloud in the line of sight blanks IRADS. No picture, no laser energy on the target.
- **Laser cycle after pickle:** on for **8 seconds**, off for about **60 seconds**, on for the **last 8 seconds** so you can walk the spot. If time-of-fall is shorter than 76 s the dark window shrinks; the two 8-second windows stay.
- **Difficulty changes the night and the legs.** `M` cycles GHOST / NIGHTHAWK / EXPOSED.
  - GHOST — new moon, short hop, full tanks, no tanker.
  - NIGHTHAWK — quarter moon, extra range, start at 58% fuel, **one AAR required**.
  - EXPOSED — full moon, long route, start at 44% fuel, searchlights, tanker required.
- **Moonlight is optical.** Full moon lets AAA and searchlights see the facets. Cloud shadow hides you. IRADS contrast also washes a little under a bright moon.
- **Tanker is SHELL 41.** Hold `F` to open the receptacle, fly the basket. Radio to the tanker widens the basket and raises the UHF/VHF farm. Receptacle open is a small RCS bump. Flameout before the target is a dead jet.

Public writeups usually compress the terminal lase to “7–10 seconds before impact.” The mid-course dark period is the part that makes the run feel like an F-117 pass.

## Install

Omarchy treats a plugin as a public git repo with `manifest.json` at the root. This one lives at [github.com/ScorchedSilicon/omastealth](https://github.com/ScorchedSilicon/omastealth).

On Omarchy 4 / Quattro:

```bash
omarchy plugin add ScorchedSilicon/omastealth --enable
omarchy plugin validate ~/.config/omarchy/plugins/muchmore.omastealth
omarchy restart shell
```

Full URL also works:

```bash
omarchy plugin add https://github.com/ScorchedSilicon/omastealth.git --enable
```

If you already installed `muchmore.omanighthawk`, remove it first:

```bash
omarchy plugin remove muchmore.omanighthawk
```

Summon:

```bash
omarchy-shell shell toggle muchmore.omastealth '{}'
```

Bind in `~/.config/hypr/bindings.lua`:

```lua
o.bind("SUPER + SHIFT + N", "OmaStealth", "omarchy-shell shell toggle muchmore.omastealth '{}'")
```

## Keys

| Key | Action |
|---|---|
| Enter | Start / arm / next |
| Esc | Back / close |
| A D | Prev / next theater (briefing) |
| L | Two-bay realistic / four-bay fun jet |
| M | Cycle difficulty (moon + range + tanker) |
| WASD or arrows | Fly |
| Space | Pickle |
| F | Open receptacle / fly the boom |
| T | Stow or raise comm masts |
| R | Hold to transmit (antenna comes up; wider tanker basket) |

## Files

- `StealthRules.js` — RCS, antenna bloom, clouds, IRADS, 8-60-8 laser, moonlight, tanker
- `MissionRules.js` — five theaters, difficulty, flight step, pickle, rank
- `Overlay.qml` — title, briefing, flight HUD, debrief
- `BarWidget.qml` — bar chip
- `manifest.json` — `muchmore.omastealth`

Saves are not wired yet. When they are, they will live under `$XDG_STATE_HOME/omarchy/omastealth/`.

## Provenance

Original rules and writing. Geometry is the real F-117A as a public fact. MicroProse *F-117A Stealth Fighter 2.0* (1991) is the structural ancestor — briefing card, loadout choice, night theaters — not a source of code or assets. Desert Storm / Allied Force names are historical flavor for arcade stages.

## Tests

```bash
node tests/stealth.test.js
```
