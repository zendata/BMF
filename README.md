# iAngels

A natal chart in the browser. Enter a name, birth date, birth time, and birthplace. iAngels looks up the place, calculates the chart itself, and shows the wheel.

The name is only used as a heading. It is not sent with the chart request.

## Who calculates the chart

`params.js` holds two switches. The defaults are our own calculation and western timing:

```javascript
var owncalculation = 1;
var timing = "western";
```

`1` calculates the planets, Placidus houses, and aspects in the browser. GitHub Pages can cast a chart with that setting, and no API key is required. `0` sends the birth date, time, and coordinates to FreeAstroAPI instead.

`western` measures the signs from the March equinox. `eastern` measures them from the stars, using the Lahiri offset, about 24 degrees earlier. The birth date stays the same. https://zendata.github.io/BMF/admin sets either switch for the browser that saves it.

## Run it

Open https://zendata.github.io/BMF/ . The calculation happens in the browser.

To run the same files on a computer:

```bash
node server.example.cjs
```

Open `http://127.0.0.1:8765`.

FreeAstroAPI is used only when `owncalculation` is `0`. That path needs a key. Copy `server.example.cjs` to `server.cjs`, paste the key between the quotes on `PASTED_KEY`, and run `node server.cjs`. `server.cjs` is gitignored, so the key is not pushed.

## Where the data comes from

- **Chart.** With `owncalculation` at `1`, the page calculates Placidus houses. Western timing is the tropical zodiac. Eastern timing subtracts the Lahiri ayanamsa from those positions. An unknown birth time is cast for noon, and the page marks the Ascendant and houses as uncertain. With `owncalculation` at `0`, the server calls [`POST https://api.freeastroapi.com/api/v1/natal/calculate`](https://www.freeastroapi.com/docs/western/natal). Eastern timing asks that service for a sidereal chart.
- **Place.** The [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api) turns a city name into latitude, longitude, and an IANA timezone. No API key. Those coordinates are what the chart uses, so the birthplace is the one the visitor chose.

Birth details are not stored by this app. With the default switch, the date, time, and coordinates stay in the browser. The place name goes to Open-Meteo. The name stays in the browser.

## Unknown birth time

If the time is missing, the chart is cast for noon and the Ascendant, houses, and chart ruler are marked uncertain. The Sun is usually safe. The Moon can change sign during the birth day.

## Tests

```bash
node --test chart.test.cjs
```

The tests cover sign math, degree formatting, wheel geometry, planet clustering, and the element tally. They do not call the network.
