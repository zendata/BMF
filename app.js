"use strict";

const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

const form = document.querySelector("#chart-form");
const nameInput = document.querySelector("#name");
const monthInput = document.querySelector("#month");
const dayInput = document.querySelector("#day");
const yearInput = document.querySelector("#year");
const timeInput = document.querySelector("#time");
const unknownInput = document.querySelector("#time-unknown");
const placeInput = document.querySelector("#place");
const placeList = document.querySelector("#place-list");
const placePicked = document.querySelector("#place-picked");
const castButton = document.querySelector("#cast");
const statusLine = document.querySelector("#status");
const reading = document.querySelector("#reading");

keepDigits(dayInput, 2);
keepDigits(yearInput, 4);

if (!usesOwnCalculation()) {
  const credit = document.querySelector("#credit");
  const privacy = document.querySelector("#privacy");
  if (credit) {
    credit.replaceChildren(
      document.createTextNode("Planetary positions are calculated by FreeAstroAPI. iAngels draws the wheel. Place search uses "),
    );
    const link = document.createElement("a");
    link.href = "https://open-meteo.com/";
    link.textContent = "Open-Meteo";
    credit.append(link, document.createTextNode("."));
  }
  if (privacy) {
    privacy.textContent = "The name stays in this browser. The birth date, time, and coordinates are sent to FreeAstroAPI to cast the chart, and the place name is sent to Open-Meteo. iAngels does not keep a copy.";
  }
}

let selectedPlace = null;
let placeQuery = 0;
let placeController = null;
let chartController = null;
let requestSeq = 0;
let highlighted = -1;

unknownInput.addEventListener("change", () => {
  const unknown = unknownInput.checked;
  timeInput.disabled = unknown;
  timeInput.required = !unknown;
  if (unknown) timeInput.value = "";
});

placeInput.addEventListener("input", () => {
  selectedPlace = null;
  placePicked.textContent = "Choose a place from the list so the chart has coordinates.";
  const query = placeInput.value.trim();
  if (query.length < 2) {
    closePlaces();
    return;
  }
  const ticket = ++placeQuery;
  window.setTimeout(() => {
    if (ticket === placeQuery) searchPlaces(query, ticket);
  }, 250);
});

placeInput.addEventListener("keydown", (event) => {
  const options = [...placeList.querySelectorAll("button")];
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    if (placeList.hidden || !options.length) return;
    event.preventDefault();
    const direction = event.key === "ArrowDown" ? 1 : -1;
    highlighted = (highlighted + direction + options.length) % options.length;
    markHighlighted(options);
  } else if (event.key === "Enter" && !placeList.hidden && options[highlighted]) {
    event.preventDefault();
    options[highlighted].click();
  } else if (event.key === "Escape") {
    closePlaces();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".combo")) closePlaces();
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  castChart();
});

async function searchPlaces(query, ticket) {
  placeController?.abort();
  placeController = new AbortController();
  try {
    const url = new URL(GEO_URL);
    url.searchParams.set("name", query);
    url.searchParams.set("count", "6");
    url.searchParams.set("language", "en");
    url.searchParams.set("format", "json");
    const response = await fetch(url, { signal: placeController.signal });
    if (!response.ok) throw new Error("geocode failed");
    const data = await response.json();
    if (ticket !== placeQuery) return;
    renderPlaces(data.results || []);
  } catch (error) {
    if (error.name === "AbortError" || ticket !== placeQuery) return;
    placeList.replaceChildren();
    const item = document.createElement("li");
    item.className = "place-note";
    item.textContent = "Place search is unavailable right now.";
    placeList.append(item);
    openPlaces();
  }
}

function renderPlaces(results) {
  placeList.replaceChildren();
  highlighted = -1;
  if (!results.length) {
    const item = document.createElement("li");
    item.className = "place-note";
    item.textContent = "No matching place. Try a city and a country.";
    placeList.append(item);
    openPlaces();
    return;
  }
  results.forEach((place, index) => {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "option");
    button.id = `place-option-${index}`;
    button.setAttribute("aria-selected", "false");
    const name = document.createElement("span");
    name.textContent = place.name;
    const detail = document.createElement("small");
    detail.textContent = placeDetail(place);
    button.append(name, detail);
    button.addEventListener("click", () => choosePlace(place));
    item.append(button);
    placeList.append(item);
  });
  openPlaces();
}

function placeDetail(place) {
  const bits = [];
  if (place.admin1 && place.admin1 !== place.name) bits.push(place.admin1);
  if (place.country) bits.push(place.country);
  if (place.timezone) bits.push(place.timezone);
  return bits.join(" · ");
}

function placeLabel(place) {
  const bits = [place.name];
  if (place.admin1 && place.admin1 !== place.name) bits.push(place.admin1);
  if (place.country && place.country !== place.name) bits.push(place.country);
  return bits.join(", ");
}

function formatCoord(lat, lon) {
  const north = lat >= 0 ? "N" : "S";
  const east = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(2)}°${north}, ${Math.abs(lon).toFixed(2)}°${east}`;
}

function choosePlace(place) {
  placeQuery += 1;
  placeController?.abort();
  selectedPlace = place;
  placeInput.value = placeLabel(place);
  placePicked.textContent = `${placeLabel(place)} · ${formatCoord(place.latitude, place.longitude)} · ${place.timezone || "timezone unknown"}`;
  closePlaces();
}

function openPlaces() {
  placeList.hidden = false;
  placeInput.setAttribute("aria-expanded", "true");
  const box = placeList.getBoundingClientRect();
  if (box.bottom > window.innerHeight - 12 || box.top < 0) {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    placeInput.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }
}

function closePlaces() {
  placeList.hidden = true;
  placeInput.setAttribute("aria-expanded", "false");
  placeInput.removeAttribute("aria-activedescendant");
  highlighted = -1;
}

function markHighlighted(options) {
  options.forEach((option, index) => {
    const on = index === highlighted;
    option.setAttribute("aria-selected", on ? "true" : "false");
    if (on) {
      placeInput.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }
  });
}

function setStatus(message, kind) {
  statusLine.textContent = message;
  statusLine.className = kind ? `status ${kind}` : "status";
}

async function castChart() {
  const person = readPerson();
  if (person.error) {
    setStatus(person.error, "error");
    return;
  }

  chartController?.abort();
  chartController = new AbortController();
  const seq = ++requestSeq;
  castButton.disabled = true;
  setStatus(person.timeKnown ? "Casting the chart…" : "Casting the chart for noon…");

  try {
    const chart = await requestChart(person, chartController.signal);
    if (seq !== requestSeq) return;
    if (!chart?.planets?.Sun || !chart.planets.Moon || !Number.isFinite(chart.ascendant)) {
      setStatus("The chart service returned an unexpected response.", "error");
      return;
    }
    renderReading(chart, person);
    setStatus("");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    reading.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  } catch (error) {
    if (error.name === "AbortError" || seq !== requestSeq) return;
    if (error.status === 400 || error.status === 422) {
      setStatus(error.detail || "The chart service rejected that birth time or place.", "error");
    } else if (error.status === 404) {
      setStatus("This copy of the page has no chart server. The birth details were not sent.", "error");
    } else if (error.status === 429) {
      setStatus("The chart service is at its limit for now. Try again later.", "error");
    } else if (error.status === 503) {
      setStatus("The chart key is not on the server yet.", "error");
    } else if (error.status >= 500) {
      setStatus("The chart service had a problem. Try again in a moment.", "error");
    } else {
      setStatus("The chart service could not be reached. Check the connection and try again.", "error");
    }
    console.error(error);
  } finally {
    if (seq === requestSeq) castButton.disabled = false;
  }
}

function readPerson() {
  const name = nameInput.value.trim().replace(/\s+/g, " ");
  if (!name) return { error: "Enter a name." };
  const birth = BMFChart.parseBirthDate(monthInput.value, dayInput.value, yearInput.value);
  if (birth.error) return { error: birth.error };
  const { year, month, day } = birth;
  const timeKnown = !unknownInput.checked;
  let hour = 12;
  let minute = 0;
  if (timeKnown) {
    const match = /^(\d{2}):(\d{2})$/.exec(timeInput.value);
    if (!match) return { error: "Enter a birth time, or mark the time as unknown." };
    hour = Number(match[1]);
    minute = Number(match[2]);
  }
  if (!selectedPlace || !Number.isFinite(selectedPlace.latitude) || !Number.isFinite(selectedPlace.longitude)) {
    return { error: "Choose a birthplace from the list." };
  }
  const when = new Date(year, month - 1, day);
  const dateLabel = when.toLocaleDateString(undefined, { dateStyle: "long" });
  const timeLabel = timeKnown
    ? formatClock(hour, minute)
    : "time unknown, chart cast for noon";
  return {
    name,
    year,
    month,
    day,
    hour,
    minute,
    timeKnown,
    place: selectedPlace,
    dateLabel,
    timeLabel,
    placeLabel: placeLabel(selectedPlace),
    coordLabel: formatCoord(selectedPlace.latitude, selectedPlace.longitude),
    timezone: selectedPlace.timezone || "",
    timing: effectiveTiming(),
  };
}

function keepDigits(input, maxLength) {
  input.addEventListener("beforeinput", (event) => {
    if (event.inputType !== "insertText" || !/^\d$/.test(event.data || "")) return;
    const entire = input.selectionStart === 0 && input.selectionEnd === input.value.length && input.value.length > 0;
    if (entire) return;
    // A full day or year has no room for another digit. Start the number again
    // so the field can be corrected after the month has already been chosen.
    if (input.value.length >= maxLength) {
      event.preventDefault();
      input.value = event.data;
      input.setSelectionRange(1, 1);
    }
  });
  input.addEventListener("input", () => {
    const digits = input.value.replace(/\D/g, "").slice(0, maxLength);
    if (digits !== input.value) input.value = digits;
  });
}

function formatClock(hour, minute) {
  const stamp = new Date(2000, 0, 1, hour, minute);
  return stamp.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function usesOwnCalculation() {
  return effectiveOwnCalculation();
}

function chartSource(chart) {
  return chart?.source === "iAngels" || usesOwnCalculation() ? "iAngels" : "FreeAstroAPI";
}

async function requestChart(person, signal) {
  if (usesOwnCalculation()) {
    const chart = BMFChart.castOwn(person);
    if (chart.error) {
      const error = new Error(chart.error);
      error.status = 500;
      error.detail = chart.error;
      throw error;
    }
    return chart;
  }
  const response = await fetch("api/natal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(BMFChart.natalRequest(person)),
    signal,
  });
  const text = await response.text();
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    const error = new Error(`Natal chart failed (${response.status})`);
    error.status = response.status === 200 ? 502 : response.status;
    throw error;
  }
  if (!response.ok) {
    const error = new Error(`Natal chart failed (${response.status})`);
    error.status = response.status;
    if (typeof payload?.error === "string") error.detail = payload.error;
    throw error;
  }
  const chart = BMFChart.fromFreeAstro(payload);
  if (chart.error) {
    const error = new Error(chart.error);
    error.status = 502;
    error.detail = chart.error;
    throw error;
  }
  chart.timing = person.timing;
  return chart;
}

function renderReading(chart, person) {
  reading.replaceChildren(
    renderHeader(chart, person),
    renderBigThree(chart, person),
    renderWheelSection(chart, person),
    renderBalance(chart, person),
    renderHouses(chart, person),
    renderPlanets(chart, person),
    renderAspects(chart),
    renderReadings(chart),
    editButton(),
  );
  reading.hidden = false;
  document.title = `${person.name} · iAngels`;
}

function renderHeader(chart, person) {
  const header = el("header", {});
  header.append(el("p", { class: "eyebrow", text: "Natal chart" }));
  header.append(el("h2", { text: `${person.name}’s natal chart` }));
  const meta = el("p", { class: "reading-meta" });
  meta.textContent = `${person.dateLabel} · ${person.timeLabel} · ${person.placeLabel} · ${person.coordLabel}`;
  if (person.timezone) meta.textContent += ` · ${person.timezone}`;
  header.append(meta);
  if (!person.timeKnown) {
    header.append(el("p", {
      class: "warning",
      text: "The birth time is missing, so this chart is cast for noon at the birthplace. The Sun is usually reliable. The Moon can shift sign on the day of birth. The Ascendant, houses, and chart ruler need a clock time.",
    }));
  } else if (nearSignEdge(chart.planets.Sun)) {
    header.append(el("p", {
      class: "warning",
      text: "The Sun is within a degree of a sign boundary. A small error in the recorded time can change the Sun sign.",
    }));
  }
  const gap = BMFChart.minForwardGap(chart.cusps);
  if (gap != null && gap < 8) {
    header.append(el("p", {
      class: "warning",
      text: "The house cusps are tightly bunched. That can happen at high latitudes in the Placidus system.",
    }));
  }
  return header;
}

function zodiacSentence(chart, timeKnown) {
  const eastern = chart.timing === "eastern";
  const offset = eastern && Number.isFinite(chart.ayanamsa) ? `, ${BMFChart.formatArc(chart.ayanamsa)} behind the seasonal zodiac` : "";
  const zodiac = eastern
    ? `Eastern sidereal zodiac${offset}. Placidus houses.`
    : "Western tropical zodiac, measured from the equinox. Placidus houses.";
  const turn = timeKnown
    ? " The wheel is turned so the Ascendant is on the left."
    : " The wheel is turned so the noon Ascendant is on the left. Treat the angles and houses as uncertain.";
  return `${zodiac}${turn} Positions calculated by ${chartSource(chart)}.`;
}

function nearSignEdge(body) {
  return body && (body.degInSign < 1 || body.degInSign > 29);
}

function renderBigThree(chart, person) {
  const wrap = el("div", { class: "big-three" });
  wrap.append(signCard("Sun", chart.planets.Sun, person.timeKnown, false));
  wrap.append(signCard("Moon", chart.planets.Moon, person.timeKnown, false));
  const rising = BMFChart.placement(chart.ascendant);
  wrap.append(signCard("Rising", {
    sign: rising.sign,
    lon: chart.ascendant,
    degInSign: null,
  }, person.timeKnown, true));
  return wrap;
}

function signCard(kind, body, timeKnown, isAngle) {
  const card = el("article", { class: "sign-card" });
  const place = BMFChart.placement(body.lon);
  card.append(el("span", { class: "glyph", text: BMFChart.SIGN_GLYPH[place.sign] || "" }));
  const title = kind === "Rising" ? "Rising" : kind;
  card.append(el("h3", { text: `${title} in ${place.sign}` }));
  let where = place.degree;
  if (!isAngle && Number.isFinite(body.house)) {
    where += timeKnown
      ? ` · ${BMFChart.ordinal(body.house)} house`
      : " · house needs a birth time";
  }
  if (isAngle && !timeKnown) where += " · noon";
  card.append(el("p", { class: "where", text: where }));
  card.append(el("p", { text: BMFChart.portrait(kind, place.sign, isAngle && !timeKnown) }));
  return card;
}

function renderWheelSection(chart, person) {
  const section = el("section", { class: "section" });
  section.append(el("h3", { text: "Chart wheel" }));
  const figure = document.createElement("figure");
  const wrap = el("div", { class: "wheel-wrap" });
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  BMFChart.buildWheel(svg, chart, { name: person.name, timeKnown: person.timeKnown });
  wrap.append(svg);
  figure.append(wrap);
  const caption = document.createElement("figcaption");
  caption.textContent = zodiacSentence(chart, person.timeKnown);
  figure.append(caption);
  section.append(figure);
  const legend = document.createElement("ul");
  legend.className = "legend";
  for (const [name, key] of [["Trine", "trine"], ["Sextile", "sextile"], ["Square", "square"], ["Opposition", "opposition"]]) {
    const item = document.createElement("li");
    const swatch = document.createElement("span");
    swatch.className = `swatch ${key}`;
    swatch.setAttribute("aria-hidden", "true");
    item.append(swatch, document.createTextNode(name));
    legend.append(item);
  }
  section.append(legend);
  section.append(el("p", {
    class: "note",
    text: "Conjunctions sit together on the wheel and are listed with the aspects. Minor aspects are in the table only.",
  }));
  return section;
}

function renderBalance(chart, person) {
  const tally = BMFChart.balance(chart, person.timeKnown);
  const section = el("section", { class: "section" });
  section.append(el("h3", { text: "Element and mode" }));
  const summary = el("p", { class: "summary", text: balanceSentence(tally) });
  section.append(summary);
  const grid = el("div", { class: "balance" });
  grid.append(meter("Element", tally.elements, [
    ["fire", "Fire"], ["earth", "Earth"], ["air", "Air"], ["water", "Water"],
  ]));
  grid.append(meter("Mode", tally.modes, [
    ["cardinal", "Cardinal"], ["fixed", "Fixed"], ["mutable", "Mutable"],
  ]));
  section.append(grid);
  section.append(el("p", {
    class: "note",
    text: person.timeKnown
      ? "Sun, Moon, and the Ascendant each count twice. Mercury through Saturn count once. Uranus, Neptune, Pluto, and the nodes are left out of this tally."
      : "Sun and Moon each count twice. Mercury through Saturn count once. The Ascendant is left out because the birth time is unknown.",
  }));
  return section;
}

function balanceSentence(tally) {
  const elementText = joinLeaders(tally.elementLeaders);
  const modeText = joinLeaders(tally.modeLeaders);
  const elementVerb = tally.elementLeaders.length > 1 ? "are even at the top" : "leads";
  const modeVerb = tally.modeLeaders.length > 1 ? "are even" : "leads";
  return `${capitalize(elementText)} ${elementVerb} this element count. ${capitalize(modeText)} ${modeVerb} the modes.`;
}

function joinLeaders(names) {
  if (!names.length) return "nothing";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function meter(title, scores, rows) {
  const block = document.createElement("div");
  block.append(el("h4", { text: title }));
  const total = Object.values(scores).reduce((sum, value) => sum + value, 0) || 1;
  for (const [key, label] of rows) {
    const row = el("div", { class: "meter-row" });
    row.append(el("span", { text: label }));
    const track = el("span", { class: "track" });
    const fill = document.createElement("span");
    fill.className = `fill ${key}`;
    fill.style.width = `${(scores[key] / total) * 100}%`;
    track.append(fill);
    row.append(track);
    row.append(el("span", { text: String(scores[key]) }));
    block.append(row);
  }
  return block;
}

function renderHouses(chart, person) {
  const section = el("section", { class: "section" });
  section.append(el("h3", { text: "Angles and houses" }));
  const angles = el("div", { class: "angles" });
  const pairs = [
    ["Ascendant", chart.ascendant],
    ["Midheaven", chart.midheaven],
    ["Descendant", Number.isFinite(chart.ascendant) ? BMFChart.normLon(chart.ascendant + 180) : null],
    ["Imum coeli", Number.isFinite(chart.midheaven) ? BMFChart.normLon(chart.midheaven + 180) : null],
  ];
  for (const [label, lon] of pairs) {
    const cell = document.createElement("div");
    cell.append(el("h4", { text: label }));
    const place = Number.isFinite(lon) ? BMFChart.placement(lon) : null;
    cell.append(el("p", {
      text: place ? `${BMFChart.SIGN_GLYPH[place.sign]} ${place.sign} ${place.degree}` : "—",
    }));
    angles.append(cell);
  }
  section.append(angles);
  section.append(el("p", { class: "ruler", text: rulerSentence(chart, person.timeKnown) }));

  if (Array.isArray(chart.cusps) && chart.cusps.length === 12) {
    const list = el("dl", { class: "houses" });
    chart.cusps.forEach((cusp, index) => {
      const place = BMFChart.placement(cusp);
      const term = el("dt", { text: BMFChart.ordinal(index + 1) });
      const detail = el("dd", {
        text: `${place.sign} ${place.degree} · ${BMFChart.HOUSE_TOPIC[index]}`,
      });
      const row = document.createElement("div");
      row.append(term, detail);
      list.append(row);
    });
    section.append(list);
  }
  return section;
}

function rulerSentence(chart, timeKnown) {
  const ruler = BMFChart.chartRuler(chart);
  if (!ruler) return "";
  if (!timeKnown) {
    return `A traditional chart ruler depends on the rising sign. At noon that would be ${ruler.ruler}, ruler of ${ruler.rising}, but it will change once a birth time is known.`;
  }
  const body = ruler.body;
  if (!body) return `${ruler.ruler} traditionally rules the rising sign, ${ruler.rising}.`;
  const place = BMFChart.placement(body.lon);
  const house = Number.isFinite(body.house) ? ` in the ${BMFChart.ordinal(body.house)} house` : "";
  const dignity = body.dignity && body.dignity !== "neutral" && BMFChart.DIGNITY[body.dignity]
    ? `, ${BMFChart.DIGNITY[body.dignity].toLowerCase()}`
    : "";
  return `Traditional chart ruler: ${ruler.ruler}, because ${ruler.rising} is rising. ${ruler.ruler} is in ${place.sign} at ${place.degree}${house}${dignity}.`;
}

function renderPlanets(chart, person) {
  const section = el("section", { class: "section" });
  section.append(el("h3", { text: "Bodies" }));
  const wrap = el("div", { class: "table-wrap" });
  const table = document.createElement("table");
  const head = document.createElement("thead");
  head.append(row(["Body", "Placement", "House", "Condition"], "th"));
  table.append(head);
  const body = document.createElement("tbody");
  for (const [key, label, glyph] of BMFChart.BODIES) {
    const planet = chart.planets[key];
    if (!planet || !Number.isFinite(planet.lon)) continue;
    const place = BMFChart.placement(planet.lon);
    const house = Number.isFinite(planet.house)
      ? (person.timeKnown ? BMFChart.ordinal(planet.house) : "Uncertain")
      : "—";
    body.append(row([
      `${glyph} ${label}`,
      `${place.sign} ${place.degree}`,
      house,
      BMFChart.condition(planet),
    ], "td"));
  }
  table.append(body);
  wrap.append(table);
  section.append(wrap);
  return section;
}

function renderAspects(chart) {
  const section = el("section", { class: "section" });
  const tools = el("div", { class: "aspect-tools" });
  tools.append(el("h3", { text: "Aspects" }));
  const toggle = document.createElement("label");
  toggle.className = "check";
  const box = document.createElement("input");
  box.type = "checkbox";
  const toggleText = document.createElement("span");
  toggleText.textContent = "Show minor aspects";
  toggle.append(box, toggleText);
  tools.append(toggle);
  section.append(tools);

  const aspects = BMFChart.sortAspects(chart.aspects);
  if (!aspects.length) {
    section.append(el("p", { text: "No aspects were returned for this chart." }));
    return section;
  }
  const wrap = el("div", { class: "table-wrap" });
  const table = document.createElement("table");
  const head = document.createElement("thead");
  head.append(row(["Aspect", "Between", "Orb", "Motion"], "th"));
  table.append(head);
  const body = document.createElement("tbody");
  for (const aspect of aspects) {
    const major = BMFChart.MAJOR_ASPECTS.has(aspect.type);
    const tr = document.createElement("tr");
    if (!major) tr.className = "minor";
    for (const value of [
      BMFChart.aspectLabel(aspect.type),
      `${BMFChart.bodyLabel(aspect.a)} and ${BMFChart.bodyLabel(aspect.b)}`,
      BMFChart.formatArc(aspect.delta),
      aspect.applying == null ? "—" : (aspect.applying ? "Applying" : "Separating"),
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      tr.append(cell);
    }
    body.append(tr);
  }
  table.append(body);
  box.addEventListener("change", () => {
    for (const minor of table.querySelectorAll(".minor")) minor.hidden = !box.checked;
  });
  for (const minor of body.querySelectorAll(".minor")) minor.hidden = true;
  wrap.append(table);
  section.append(wrap);
  return section;
}

function renderReadings(chart) {
  const section = el("section", { class: "section" });
  section.append(el("h3", { text: "Reading" }));
  const readings = Array.isArray(chart.readings) ? chart.readings : [];
  if (!readings.length) {
    section.append(el("p", { text: "The positions are above. A written reading was not included with this chart." }));
    return section;
  }
  section.append(el("p", {
    class: "note",
    text: "These notes describe the chart that was just cast. They are not a forecast of the next week or month.",
  }));
  for (const group of readings) {
    section.append(el("h4", { text: group.heading }));
    for (const note of group.notes) {
      if (note.title) section.append(el("h4", { text: note.title }));
      if (note.body) section.append(prose(note.body));
    }
  }
  return section;
}

function prose(text) {
  const wrap = el("div", { class: "prose" });
  if (!text) return wrap;
  for (const block of String(text).split(/\n{2,}/)) {
    const paragraph = document.createElement("p");
    paragraph.textContent = block;
    wrap.append(paragraph);
  }
  return wrap;
}

function editButton() {
  const wrap = el("p", { class: "no-print" });
  const button = document.createElement("button");
  button.type = "button";
  button.className = "text-button";
  button.textContent = "Edit birth details";
  button.addEventListener("click", () => {
    nameInput.focus();
    form.scrollIntoView({ block: "start" });
  });
  wrap.append(button);
  return wrap;
}

function row(values, cellName) {
  const tr = document.createElement("tr");
  for (const value of values) {
    const cell = document.createElement(cellName === "th" ? "th" : "td");
    cell.textContent = value;
    tr.append(cell);
  }
  return tr;
}

function el(tag, attrs) {
  const node = document.createElement(tag);
  if (attrs.class) node.className = attrs.class;
  if (attrs.text != null) node.textContent = attrs.text;
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class" || key === "text") continue;
    node.setAttribute(key, String(value));
  }
  return node;
}
