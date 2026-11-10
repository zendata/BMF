# BMF

A natal chart in the browser. Enter a name, birth date, birth time, and birthplace. BMF looks up the place, asks CosmyDay for the chart, and shows the wheel, the positions, and the Sun-sign writing CosmyDay publishes.

The name is only used as a heading. It is not sent with the chart request.

## Run it

From this directory:

```bash
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765`. A static file server is the reliable way to run it. GitHub Pages works the same way, because the page is HTML, CSS, and JavaScript with no build step.

## Where the data comes from

- **Chart.** [`POST https://api.cosmyday.com/natal`](https://cosmyday.com/api-docs) returns planets, house cusps, angles, and aspects. CosmyDay computes them with the Swiss Ephemeris. No API key. The zodiac is tropical and the houses are Placidus. The birth time is read as local civil time at the coordinates, and CosmyDay resolves the timezone.
- **Place.** The [Open-Meteo geocoding API](https://open-meteo.com/en/docs/geocoding-api) turns a city name into latitude, longitude, and an IANA timezone. No API key.
- **Other writing.** After the chart loads, BMF also requests CosmyDay’s daily, weekly, and monthly text for the Sun sign, the current Moon article, and upcoming sky events. Those pieces describe the Sun sign or the sky now. They are not a reading of the whole natal chart, and the page says so.

CosmyDay asks for a visible credit. The footer links to [cosmyday.com](https://cosmyday.com/).

Birth details are not stored by this app. The date, time, and coordinates go to CosmyDay. The place name goes to Open-Meteo.

## Unknown birth time

If the time is missing, the chart is cast for noon and the Ascendant, houses, and chart ruler are marked uncertain. The Sun is usually safe. The Moon can change sign during the birth day.

## Tests

```bash
node --test chart.test.cjs
```

The tests cover sign math, degree formatting, wheel geometry, planet clustering, and the element tally. They do not call the network.
