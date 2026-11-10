# iAngels

A natal chart in the browser. Enter a name, birth date, birth time, and birthplace. iAngels looks up the place, asks FreeAstroAPI for the chart, and shows the wheel, the positions, and the reading that comes back with that chart.

The name is only used as a heading. It is not sent with the chart request.

## Run it

`server.example.cjs` is the chart server. It is in the repo with an empty key. Your own copy is not.

```bash
cp server.example.cjs server.cjs
```

Open `server.cjs` and paste the FreeAstroAPI key between the quotes on `PASTED_KEY`. Then:

```bash
node server.cjs
```

Open `http://127.0.0.1:8765`. That local page is where the key is used. The key stays in `server.cjs`, which git ignores, and it is not written into the browser page.

GitHub Pages publishes the HTML, CSS, and JavaScript. It does not run `server.cjs`, so https://zendata.github.io/BMF/ can show the form and still cannot cast until this server is what the browser is talking to.

## Who calculates the chart

`params.js` holds one switch:

```javascript
var owncalculation = 1;
```

`1` calculates the chart in the browser. That is the setting that works on GitHub Pages, because the page never needs the API key. `0` sends the birth date, time, and coordinates to FreeAstroAPI, which needs `server.cjs` and the key.

## Where the data comes from

- **Chart.** `POST /api/natal` on this server calls [`POST https://api.freeastroapi.com/api/v1/natal/calculate`](https://www.freeastroapi.com/docs/western/natal). The zodiac is tropical and the houses are Placidus. An unknown birth time is sent as noon, and the page marks the Ascendant and houses as uncertain. The free plan allows 80 requests a day. This server keeps a successful chart for a day and stops at 70 upstream requests a day, so a repeated cast does not spend another request.
- **Place.** The [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api) turns a city name into latitude, longitude, and an IANA timezone. No API key. Those coordinates are what the chart request sends, so the birthplace is the one the visitor chose.
- **Reading.** The same chart response can include short notes about that chart. The page shows those notes. It does not request a separate daily, weekly, or monthly forecast.

Birth details are not stored by this app. The date, time, and coordinates go to FreeAstroAPI. The place name goes to Open-Meteo. The name stays in the browser.

## Unknown birth time

If the time is missing, the chart is cast for noon and the Ascendant, houses, and chart ruler are marked uncertain. The Sun is usually safe. The Moon can change sign during the birth day.

## Tests

```bash
node --test chart.test.cjs
```

The tests cover sign math, degree formatting, wheel geometry, planet clustering, and the element tally. They do not call the network.
