# iAngels

A natal chart in the browser. Enter a name, birth date, birth time, and birthplace. iAngels looks up the place, asks FreeAstroAPI for the chart, and shows the wheel, the positions, and the reading that comes back with that chart.

The name is only used as a heading. It is not sent with the chart request.

## Run it

From this directory, with a FreeAstroAPI key in the environment:

```bash
FREE_ASTRO_API_KEY=your-key node server.cjs
```

Open `http://127.0.0.1:8765`. The page is still HTML, CSS, and JavaScript with no build step. `server.cjs` serves those files and forwards one chart request to FreeAstroAPI. The key stays in that process. It is not written into the page.

GitHub Pages can publish the files, and it cannot keep that key. A chart cast on the Pages copy needs this server, or another host that runs it, in front of the same files.

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
