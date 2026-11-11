# Handover: iAngels

Continue this app. Do not rebuild it, and do not start from the older copy in `zendata/homelab`.

The live site is https://zendata.github.io/BMF/. The repository is the public repo https://github.com/zendata/BMF, branch `main`, with `index.html` at the repository root. GitHub Pages deploys that root. A push to `main` is the deploy. Pages can take about ten minutes to show the new files.

Graham uses an iPad and cannot run Node there. Show him the GitHub Pages site. Do not ask him to install Node, run a local server, or open a pull request in order to see a change. When a change is agreed, commit it on `main` and push it.

## What it does now

A visitor enters a name, birth date, birth time, and birthplace. Open-Meteo turns the place into latitude, longitude, and an IANA timezone. The page then calculates a Placidus natal chart in the browser and draws the wheel, the big three, the element and mode tally, the houses, the bodies, and the aspects. Western timing, the default, uses the tropical zodiac. Eastern timing uses the Lahiri sidereal zodiac.

The name is a heading only. It is not sent anywhere. With the default switch, the birth date, time, and coordinates stay in the browser. The place name is the only thing sent out, and it goes to Open-Meteo.

There is no angel content yet. The person the app is for is interested in angels and which ones look after people. Graham asked for the look to feel calm and angelic so that later work can add that. He does not want that material invented unless he asks for it. The chart itself is the current product.

## The parameter file

`params.js` holds two switches:

```javascript
var owncalculation = 1;
var timing = "western";
```

`owncalculation` `1` calculates in the browser. `0` sends the birth date, time, and coordinates to FreeAstroAPI, which needs the local server and a key. Leave the default at `1`. If `params.js` is missing or the value is anything other than `0`, both the page and `server.example.cjs` calculate the chart themselves.

`timing` is `"western"` or `"eastern"`. Western is the tropical zodiac, measured from the March equinox. Eastern is the sidereal zodiac. `lahiriAyanamsa` in `chart.js` is 23°51'11" at J2000 and moves at 50.27 arcseconds a year, about 24.2 degrees in 2026. `castOwn` subtracts that angle from every longitude and from the house cusps. Do not move the birth date. Three weeks of calendar would swing the Moon almost a full circle. The same subtraction leaves house numbers unchanged and can change a sign when the degree inside the sign is smaller than the offset.

`eastern-and-western-timing.pdf` is a 500-word account of the two timings. It does not say which one the parameter file uses. Leave that choice to the reader. `/admin` links to it.

`/admin` (`admin/index.html`) lets Graham set `0` or `1` and western or eastern. Save writes `localStorage` key `iangels-settings`. `settings.js` prefers that over `params.js` in the browser that saved it. On the local server, Save also `POST`s `/api/params`, and `server.example.cjs` rewrites `params.js`. GitHub Pages cannot rewrite the file, so another device keeps the file defaults. “Use the parameter file” clears the browser override.

## Files

All of these sit at the repository root. Do not put them in a `BMF/` folder.

| File | Role |
| --- | --- |
| `index.html` | The form, the reading mount point, and the script order. |
| `styles.css` | Folded-wings theme. |
| `wings.jpg` | Background photograph. |
| `app.js` | Form, place search, and the reading DOM. |
| `chart.js` | Chart math, wheel SVG, and the FreeAstroAPI adapter. No network calls. |
| `params.js` | `owncalculation` and `timing`. |
| `settings.js` | Browser override saved from `/admin`. |
| `admin/index.html`, `admin/admin.js` | Settings page at `/admin`. |
| `eastern-and-western-timing.pdf` | 500-word comparison. It names no chosen timing. |
| `astronomy.browser.min.js` | Don Cross’s astronomy-engine, MIT, https://github.com/cosinekitty/astronomy. Keep the copyright notice. |
| `chart.test.cjs` | `node --test`. No network. |
| `server.example.cjs` | Optional local server. Empty key. |
| `README.md` | Short visitor-facing description. |
| `favicon.svg`, `.nojekyll`, `.gitignore` | Icon, Pages config, and ignore rules. |

Script order in `index.html` matters: `params.js`, then `settings.js`, then `astronomy.browser.min.js`, then `chart.js`, then `app.js`.

`chart.js` is loaded by the browser and by Node. It exports `window.BMFChart` and `module.exports = { BMFChart }`. The astronomy bundle attaches `Astronomy` to `window` or `globalThis`. The tests set `global.Astronomy = require("./astronomy.browser.min.js")` before requiring `chart.js`. Keep that line.

`server.cjs` is gitignored on purpose. It is Graham’s private copy of `server.example.cjs`, where a FreeAstroAPI key would be pasted. Never commit `server.cjs`, a key, or a `.env`.

## How a chart is cast

`app.js` `requestChart()` calls `BMFChart.castOwn(person)` when the switch is on. The person object has `year`, `month`, `day`, `hour`, `minute`, `timing`, and `place: { latitude, longitude, timezone }`. `timing` comes from `effectiveTiming()` in `settings.js`.

`castOwn` in `chart.js`:

- Turns the clock time at the birthplace into UTC with `Intl.DateTimeFormat`. A missing or invalid timezone is treated as UTC.
- Gets geocentric ecliptic longitude of date for Sun through Pluto from `Astronomy.GeoVector` and `Astronomy.Ecliptic`. Aberration is off (`false`).
- Local RAMC is Greenwich sidereal time in hours, times 15, plus the longitude, modulo 360.
- Mean obliquity comes from the short polynomial in `meanObliquity`.
- Ascendant and Midheaven are the usual `atan2` formulas. Cusps 11, 12, 2, and 3 are the Placidus semi-arc iteration. Cusps 4, 5, 6, 7, 8, and 9 are the opposites. If the latitude is beyond 66 degrees, or a cusp does not converge, the houses fall back to equal houses from the Ascendant.
- North Node is the mean node. South Node is that plus 180. Lilith is the mean lunar apogee plus 180. These are not the true node and not an asteroid.
- Retrograde is a backward step in longitude over the next hour. The mean node is always retrograde under that test.
- Aspects use the orbs in `ASPECT_ORBS`: conjunction, opposition, and trine 8°; square 8°; sextile 6°; quincunx 3°; semisextile, semisquare, and sesquiquadrate 2°. Applying means the same pair is closer to exact one hour later.
- Classical dignities cover Sun through Saturn only: domicile, detriment, exaltation, fall, or neutral. Uranus, Neptune, Pluto, the nodes, and Lilith have no dignity.
- Rulers are traditional. Scorpio is Mars, Aquarius is Saturn, and Pisces is Jupiter.
- If `timing` is `"eastern"`, every longitude and every cusp then has the Lahiri ayanamsa subtracted. Aspects are unchanged because every point moves by the same angle. The returned chart includes `timing` and `ayanamsa`.
- The returned chart has `source: "iAngels"` and `readings: []`. The Reading section then says a written reading was not included.

Chiron is listed in `BODIES` so a FreeAstro chart can show it. `castOwn` does not calculate Chiron. The table skips a body with no longitude. Do not pretend a Chiron position exists.

The wheel puts the Ascendant on the left and longitude increases downward. Planets that sit close together, including across 0° Aries, are stacked by `clusterBodies`. Conjunctions are not drawn as aspect lines. Minor aspects are in the table, hidden until “Show minor aspects” is checked.

An unknown birth time is cast for noon. The page marks the Ascendant, houses, and chart ruler as uncertain. The Sun is usually safe. The Moon can change sign during the day. The element tally counts Sun and Moon twice, and Mercury through Saturn once. Uranus, Neptune, Pluto, and the nodes are left out. The Ascendant is included only when the time is known, and then it also counts twice.

## Checked example

Ada Lovelace, 15 June 1990, 14:30, Tokyo. Coordinates used in the test: latitude 35.6895, longitude 139.69171, timezone `Asia/Tokyo`.

- Sun in Gemini, about 83.876°
- Moon in Pisces, about 341.752°
- Ascendant in Libra, about 209.298°
- Sun in the 8th house
- Mars in domicile

`node --test chart.test.cjs` checks those values within 0.02°. If a calculation change moves them, say so and update the test. Do not loosen the test to hide a wrong chart.

## The form

The birth date is three controls: a month `<select>`, a day text field, and a year text field. Do not go back to `<input type="date">`. On an iPad that control fills the day and then will not let the visitor change it. `keepDigits` in `app.js` lets a full day or year be typed over. `parseBirthDate` rejects a missing part, a non-existent day such as 29 February 1990, a year before 1800, and a date that has not happened yet.

The place must be chosen from the Open-Meteo list. Typed text alone has no coordinates, and `castOwn` refuses it. Search waits 250 ms, asks for six English results, and can be moved with the arrow keys.

## Look

Graham chose this and rejected the earlier versions:

- The title is **iAngels**, in blue `#4d7eae` (`--halo`). The byline is “by Jikara and Graham”.
- The typeface is Outfit, with a sans-serif fallback. No serif fonts. The first theme used Fraunces. He asked for that to be removed.
- The background is `wings.jpg` under a white radial veil. That was mockup 3, the folded-wings photograph. Keep it faint. He wanted the page calm, not bright.
- A gear at the top right of the front page links to `/admin`. The footer also has a Settings link.
- The footer credits iAngels for the positions and Open-Meteo for place search. Do not add CosmyDay links. He removed that branding because the outside links pulled attention away from the app.
- The page says astrology is symbolic and is not medical, legal, or financial advice. Keep that.

## FreeAstroAPI, only if the switch is 0

This path is not the default and does not work on GitHub Pages, because Pages cannot run `server.cjs` and the key must not be in the page.

`app.js` then `POST`s `api/natal`. `server.example.cjs` proxies that to `POST https://api.freeastroapi.com/api/v1/natal/calculate` with the header `x-api-key`. The request asks for Placidus, speed, dignity, minor aspects, Chiron, Lilith, and the true node. Western sends `zodiac_type: "tropical"`. Eastern sends `zodiac_type: "sidereal"` and `sidereal_ayanamsa: "lahiri"`. `fromFreeAstro` folds that JSON into the same chart shape. If both a mean node and a true node come back, the true node is kept as `NorthNode`.

To try it on a computer: copy `server.example.cjs` to `server.cjs`, paste the key into `PASTED_KEY`, set `owncalculation` to `0`, and run `node server.cjs`. The example file refuses to use `PASTED_KEY` unless its own filename is `server.cjs`. The server allows 8 requests a minute per address, 70 upstream calls a day, and keeps a successful response for a day. The free plan is about 80 calls a day.

## Tests and a local look

```bash
node --test chart.test.cjs
node server.example.cjs
```

The server listens on `http://127.0.0.1:8765`. With the default switch it can also cast through `POST /api/natal`, but the browser does not call that route while `owncalculation` is `1`.

There is no build step and no package install. The tests use only Node’s built-in test runner.

## Do not

- Do not merge https://github.com/zendata/homelab/pull/1 or copy `homelab`’s `BMF/` directory over this repo. That copy still talks to CosmyDay and is not the app.
- Do not restore CosmyDay, serif type, or the name BMF on the page.
- Do not commit `server.cjs` or an API key.
- Do not change the default to `owncalculation = 0` or `timing = "eastern"`.
- Do not imitate eastern timing by subtracting three weeks from the birth date.
- Do not add a framework, a bundler, or a `BMF/` subdirectory. GitHub Pages serves this root.
- Do not send the visitor’s name to a chart service.
- Do not describe the mean node as the true node, or the equal-house polar fallback as Placidus.

## Where the older handover is

The first copy and its handover were removed from `zendata/homelab`. Do not copy that CosmyDay version back. This file is the one to follow.
