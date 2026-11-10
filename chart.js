"use strict";

// Pure chart math and the natal-wheel drawing. The browser page and the
// node tests both load this file. Nothing here talks to the network.
const BMFChart = (() => {
  const SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];

  const SIGN_GLYPH = {
    Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋", Leo: "♌", Virgo: "♍",
    Libra: "♎", Scorpio: "♏", Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
  };

  const ELEMENT = {
    Aries: "fire", Taurus: "earth", Gemini: "air", Cancer: "water",
    Leo: "fire", Virgo: "earth", Libra: "air", Scorpio: "water",
    Sagittarius: "fire", Capricorn: "earth", Aquarius: "air", Pisces: "water",
  };

  const MODE = {
    Aries: "cardinal", Taurus: "fixed", Gemini: "mutable",
    Cancer: "cardinal", Leo: "fixed", Virgo: "mutable",
    Libra: "cardinal", Scorpio: "fixed", Sagittarius: "mutable",
    Capricorn: "cardinal", Aquarius: "fixed", Pisces: "mutable",
  };

  // Traditional rulers only. Scorpio is Mars, Aquarius is Saturn, Pisces is Jupiter.
  const TRADITIONAL_RULER = {
    Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
    Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
    Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
  };

  const HOUSE_TOPIC = [
    "Self and appearance",
    "Money and belongings",
    "Speech, siblings, and near travel",
    "Home and parents",
    "Play, romance, and children",
    "Work, illness, and daily service",
    "Partnership",
    "Shared resources and loss",
    "Belief, study, and far travel",
    "Vocation and reputation",
    "Friends and shared aims",
    "Solitude, endings, and the hidden",
  ];

  const SIGN_TONE = {
    Aries: "Aries is direct, quick to begin, and restless until it moves.",
    Taurus: "Taurus stays with what it values: steadiness, the senses, and a pace of its own.",
    Gemini: "Gemini learns by talking, collecting, and holding two explanations at once.",
    Cancer: "Cancer keeps its center in memory, shelter, and the people it claims.",
    Leo: "Leo warms a room by being seen, and it wants a life that feels generous.",
    Virgo: "Virgo attends to the useful detail and improves what it is willing to care for.",
    Libra: "Libra looks for the fair arrangement between people, and it thinks in pairs.",
    Scorpio: "Scorpio does not skim. It wants the truth under the polite version.",
    Sagittarius: "Sagittarius aims past the near horizon, toward meaning and a wider map.",
    Capricorn: "Capricorn builds slowly, takes the duty, and measures itself by what holds.",
    Aquarius: "Aquarius stands a little apart so it can see the pattern, and it cares about the group.",
    Pisces: "Pisces takes in atmosphere, imagination, and other people's weather.",
  };

  const ROLES = {
    Sun: "The Sun is how you recognize yourself when you act from the center.",
    Moon: "The Moon is private weather: need, memory, and what steadies you.",
    Rising: "The rising sign is the door you walk through. People meet it first.",
  };

  const BODIES = [
    ["Sun", "Sun", "☉"],
    ["Moon", "Moon", "☽"],
    ["Mercury", "Mercury", "☿"],
    ["Venus", "Venus", "♀"],
    ["Mars", "Mars", "♂"],
    ["Jupiter", "Jupiter", "♃"],
    ["Saturn", "Saturn", "♄"],
    ["Uranus", "Uranus", "♅"],
    ["Neptune", "Neptune", "♆"],
    ["Pluto", "Pluto", "♇"],
    ["NorthNode", "North Node", "☊"],
    ["SouthNode", "South Node", "☋"],
    ["Chiron", "Chiron", "⚷"],
    ["Lilith", "Lilith", "⚸"],
  ];

  const DIGNITY = {
    domicile: "Rulership",
    exaltation: "Exaltation",
    detriment: "Detriment",
    fall: "Fall",
  };

  const ASPECT_LABEL = {
    conjunction: "Conjunction",
    opposition: "Opposition",
    trine: "Trine",
    square: "Square",
    sextile: "Sextile",
    quincunx: "Quincunx",
    semisextile: "Semisextile",
    semisquare: "Semisquare",
    sesquiquadrate: "Sesquiquadrate",
  };

  const MAJOR_ASPECTS = new Set(["conjunction", "opposition", "trine", "square", "sextile"]);

  const WHEEL = {
    size: 680,
    center: 340,
    signOuter: 292,
    signInner: 236,
    planet: 214,
    aspect: 146,
    houseNumber: 118,
    houseInner: 92,
    label: 322,
  };

  function normLon(lon) {
    return ((Number(lon) % 360) + 360) % 360;
  }

  function signIndex(lon) {
    return Math.floor(normLon(lon) / 30) % 12;
  }

  function signOf(lon) {
    return SIGNS[signIndex(lon)];
  }

  function formatArc(value) {
    const abs = Math.abs(Number(value));
    if (!Number.isFinite(abs)) return "";
    let degrees = Math.floor(abs);
    let minutes = Math.round((abs - degrees) * 60);
    if (minutes === 60) {
      degrees += 1;
      minutes = 0;
    }
    return `${degrees}°${String(minutes).padStart(2, "0")}′`;
  }

  function placement(lon) {
    let norm = normLon(lon);
    let index = Math.floor(norm / 30);
    let within = norm - index * 30;
    let degrees = Math.floor(within);
    let minutes = Math.round((within - degrees) * 60);
    if (minutes === 60) {
      degrees += 1;
      minutes = 0;
    }
    if (degrees >= 30) {
      degrees = 0;
      index = (index + 1) % 12;
    }
    return {
      sign: SIGNS[index],
      signIndex: index,
      degree: `${degrees}°${String(minutes).padStart(2, "0")}′`,
      lon: norm,
    };
  }

  function polar(cx, cy, radius, lon, ascendant) {
    const theta = ((180 + (lon - ascendant)) * Math.PI) / 180;
    return [cx + radius * Math.cos(theta), cy - radius * Math.sin(theta)];
  }

  function separation(a, b) {
    const gap = Math.abs(normLon(a) - normLon(b)) % 360;
    return gap > 180 ? 360 - gap : gap;
  }

  function forwardMid(start, end) {
    const span = (end - start + 360) % 360;
    return normLon(start + span / 2);
  }

  function minForwardGap(cusps) {
    if (!Array.isArray(cusps) || cusps.length < 2) return null;
    let smallest = 360;
    for (let i = 0; i < cusps.length; i += 1) {
      const span = (cusps[(i + 1) % cusps.length] - cusps[i] + 360) % 360;
      if (span < smallest) smallest = span;
    }
    return smallest;
  }

  function clusterBodies(bodies) {
    if (!bodies.length) return [];
    const sorted = [...bodies].sort((a, b) => a.lon - b.lon);
    let cut = 0;
    let widest = -1;
    for (let i = 0; i < sorted.length; i += 1) {
      const next = sorted[(i + 1) % sorted.length];
      const gap = (next.lon - sorted[i].lon + 360) % 360;
      if (gap > widest) {
        widest = gap;
        cut = (i + 1) % sorted.length;
      }
    }
    const ordered = sorted.slice(cut).concat(sorted.slice(0, cut));
    const groups = [];
    for (const body of ordered) {
      const current = groups[groups.length - 1];
      if (current && separation(body.lon, current[current.length - 1].lon) <= 8) {
        current.push(body);
      } else {
        groups.push([body]);
      }
    }
    return groups;
  }

  function initials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
    if (!parts.length) return "•";
    if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join("").toUpperCase();
    return parts.map((part) => Array.from(part)[0]).join("").toUpperCase();
  }

  function portrait(kind, sign, uncertain) {
    const tone = SIGN_TONE[sign] || "";
    if (kind === "Rising" && uncertain) {
      return `This rising sign is cast for noon, so treat it as a stand-in. ${tone}`.trim();
    }
    return `${ROLES[kind] || ""} ${tone}`.trim();
  }

  function ordinal(n) {
    const suffixes = ["th", "st", "nd", "rd"];
    const century = n % 100;
    const suffix = suffixes[(century - 20) % 10] || suffixes[century] || suffixes[0];
    return `${n}${suffix}`;
  }

  function leaders(scores) {
    const top = Math.max(...Object.values(scores));
    if (!Number.isFinite(top) || top <= 0) return [];
    return Object.entries(scores).filter(([, value]) => value === top).map(([key]) => key);
  }

  // Sun, Moon, and the Ascendant count double. Mercury through Saturn count once.
  // The outer planets are left out of this classical tally.
  function balance(chart, includeAscendant) {
    const weights = { Sun: 2, Moon: 2, Mercury: 1, Venus: 1, Mars: 1, Jupiter: 1, Saturn: 1 };
    const elements = { fire: 0, earth: 0, air: 0, water: 0 };
    const modes = { cardinal: 0, fixed: 0, mutable: 0 };
    for (const [name, weight] of Object.entries(weights)) {
      const sign = chart.planets?.[name]?.sign;
      if (!ELEMENT[sign]) continue;
      elements[ELEMENT[sign]] += weight;
      modes[MODE[sign]] += weight;
    }
    if (includeAscendant && Number.isFinite(chart.ascendant)) {
      const sign = signOf(chart.ascendant);
      elements[ELEMENT[sign]] += 2;
      modes[MODE[sign]] += 2;
    }
    return {
      elements,
      modes,
      elementLeaders: leaders(elements),
      modeLeaders: leaders(modes),
      includeAscendant: Boolean(includeAscendant),
    };
  }

  function chartRuler(chart) {
    if (!Number.isFinite(chart.ascendant)) return null;
    const rising = signOf(chart.ascendant);
    const ruler = TRADITIONAL_RULER[rising];
    return { rising, ruler, body: chart.planets?.[ruler] || null };
  }

  function aspectLabel(type) {
    if (ASPECT_LABEL[type]) return ASPECT_LABEL[type];
    if (!type) return "Aspect";
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  function sortAspects(aspects) {
    const rank = { conjunction: 0, opposition: 1, trine: 2, square: 3, sextile: 4 };
    return [...(aspects || [])].sort((a, b) => {
      const aMajor = MAJOR_ASPECTS.has(a.type) ? 0 : 1;
      const bMajor = MAJOR_ASPECTS.has(b.type) ? 0 : 1;
      if (aMajor !== bMajor) return aMajor - bMajor;
      const aOrb = Number(a.delta);
      const bOrb = Number(b.delta);
      if (aOrb !== bOrb) return aOrb - bOrb;
      return (rank[a.type] ?? 9) - (rank[b.type] ?? 9);
    });
  }

  function wheelLabel(chart, name, timeKnown) {
    const sun = chart.planets?.Sun;
    const moon = chart.planets?.Moon;
    const rising = placement(chart.ascendant);
    const risingWord = timeKnown ? "rising" : "noon rising";
    return `${name}: Sun in ${sun?.sign || "an unknown sign"}, Moon in ${moon?.sign || "an unknown sign"}, ${risingWord} ${rising.sign}. Tropical zodiac, Placidus houses.`;
  }

  function svgEl(name, attrs, parent) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", name);
    for (const [key, value] of Object.entries(attrs || {})) {
      if (value != null) node.setAttribute(key, String(value));
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function sectorPath(lon0, lon1, ascendant) {
    const { center: c, signOuter: outer, signInner: inner } = WHEEL;
    const [x0, y0] = polar(c, c, outer, lon0, ascendant);
    const [x1, y1] = polar(c, c, outer, lon1, ascendant);
    const [x2, y2] = polar(c, c, inner, lon1, ascendant);
    const [x3, y3] = polar(c, c, inner, lon0, ascendant);
    // Sweep 0 is counterclockwise on screen, which is increasing longitude
    // once the Ascendant has been placed on the left.
    return [
      `M ${x0} ${y0}`,
      `A ${outer} ${outer} 0 0 0 ${x1} ${y1}`,
      `L ${x2} ${y2}`,
      `A ${inner} ${inner} 0 0 1 ${x3} ${y3}`,
      "Z",
    ].join(" ");
  }

  function radialLine(parent, lon, r0, r1, ascendant, className) {
    const { center: c } = WHEEL;
    const [x1, y1] = polar(c, c, r0, lon, ascendant);
    const [x2, y2] = polar(c, c, r1, lon, ascendant);
    return svgEl("line", { x1, y1, x2, y2, class: className }, parent);
  }

  function uprightText(parent, lon, radius, ascendant, text, className, fontSize) {
    const { center: c } = WHEEL;
    const [x, y] = polar(c, c, radius, lon, ascendant);
    const node = svgEl("text", {
      x, y, class: className, "text-anchor": "middle", "dominant-baseline": "central",
    }, parent);
    if (fontSize) node.setAttribute("font-size", fontSize);
    node.textContent = text;
    return node;
  }

  function buildWheel(svg, chart, options) {
    const name = options?.name || "";
    const timeKnown = options?.timeKnown !== false;
    const ascendant = chart.ascendant;
    const { size, center: c } = WHEEL;
    svg.replaceChildren();
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", wheelLabel(chart, name, timeKnown));

    svgEl("circle", { cx: c, cy: c, r: WHEEL.signOuter + 14, class: "wheel-paper" }, svg);

    for (let index = 0; index < 12; index += 1) {
      const sign = SIGNS[index];
      const path = svgEl("path", {
        d: sectorPath(index * 30, (index + 1) * 30, ascendant),
        class: `sign-sector sign-${ELEMENT[sign]}`,
      }, svg);
      const title = svgEl("title", {}, path);
      title.textContent = sign;
    }

    for (const radius of [WHEEL.signOuter, WHEEL.signInner, WHEEL.houseInner]) {
      svgEl("circle", { cx: c, cy: c, r: radius, class: "wheel-line", fill: "none" }, svg);
    }

    for (let lon = 0; lon < 360; lon += 10) {
      const major = lon % 30 === 0;
      radialLine(
        svg,
        lon,
        WHEEL.signOuter,
        WHEEL.signOuter + (major ? 10 : 5),
        ascendant,
        major ? "tick tick-major" : "tick",
      );
    }

    const cuspsOk = Array.isArray(chart.cusps)
      && chart.cusps.length === 12
      && chart.cusps.every((value) => Number.isFinite(value));

    if (cuspsOk) {
      chart.cusps.forEach((cusp) => {
        radialLine(svg, cusp, WHEEL.houseInner, WHEEL.signInner, ascendant, "house-line");
      });
    }

    const byName = chart.planets || {};
    for (const aspect of chart.aspects || []) {
      if (!MAJOR_ASPECTS.has(aspect.type) || aspect.type === "conjunction") continue;
      const first = byName[aspect.a];
      const second = byName[aspect.b];
      if (!first || !second || !Number.isFinite(first.lon) || !Number.isFinite(second.lon)) continue;
      const [x1, y1] = polar(c, c, WHEEL.aspect, first.lon, ascendant);
      const [x2, y2] = polar(c, c, WHEEL.aspect, second.lon, ascendant);
      const line = svgEl("line", {
        x1, y1, x2, y2, class: `aspect aspect-${aspect.type}`,
      }, svg);
      const title = svgEl("title", {}, line);
      title.textContent = `${aspectLabel(aspect.type)} ${bodyLabel(aspect.a)} and ${bodyLabel(aspect.b)}, orb ${formatArc(aspect.delta)}`;
    }

    if (cuspsOk) {
      for (let house = 0; house < 12; house += 1) {
        const mid = forwardMid(chart.cusps[house], chart.cusps[(house + 1) % 12]);
        uprightText(svg, mid, WHEEL.houseNumber, ascendant, String(house + 1), "house-num");
      }
    }

    const bodies = BODIES
      .map(([key, label, glyph]) => {
        const body = byName[key];
        if (!body || !Number.isFinite(body.lon)) return null;
        return { key, label, glyph, lon: normLon(body.lon), retrograde: Boolean(body.retrograde) };
      })
      .filter(Boolean);

    for (const group of clusterBodies(bodies)) {
      group.forEach((body, index) => {
        const radius = WHEEL.planet - index * 16;
        const [x, y] = polar(c, c, radius, body.lon, ascendant);
        const groupNode = svgEl("g", {}, svg);
        const text = svgEl("text", {
          x, y,
          class: body.retrograde ? "planet-glyph planet-rx" : "planet-glyph",
          "text-anchor": "middle",
          "dominant-baseline": "central",
        }, groupNode);
        text.textContent = body.glyph;
        const title = svgEl("title", {}, groupNode);
        const where = placement(body.lon);
        title.textContent = `${body.label} ${where.sign} ${where.degree}${body.retrograde ? ", retrograde" : ""}`;
      });
    }

    const glyphRadius = (WHEEL.signOuter + WHEEL.signInner) / 2;
    SIGNS.forEach((sign, index) => {
      uprightText(svg, index * 30 + 15, glyphRadius, ascendant, SIGN_GLYPH[sign], "sign-glyph");
    });

    const angles = [
      ["ASC", ascendant],
      ["MC", chart.midheaven],
      ["DSC", Number.isFinite(ascendant) ? normLon(ascendant + 180) : null],
      ["IC", Number.isFinite(chart.midheaven) ? normLon(chart.midheaven + 180) : null],
    ];
    for (const [label, lon] of angles) {
      if (!Number.isFinite(lon)) continue;
      uprightText(svg, lon, WHEEL.label, ascendant, label, "angle-label");
    }

    svgEl("circle", { cx: c, cy: c, r: 34, class: "hub", fill: "#f7f1e6" }, svg);
    const letters = initials(name);
    uprightText(svg, ascendant, 0, ascendant, letters, "hub-initials", letters.length >= 3 ? 16 : 22);
  }

  function bodyLabel(key) {
    const found = BODIES.find(([id]) => id === key);
    return found ? found[1] : key;
  }

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  // The browser date control locks its day segment once a month and day are
  // filled. The form collects the three parts separately and checks them here.
  function parseBirthDate(monthRaw, dayRaw, yearRaw, now = new Date()) {
    const monthText = String(monthRaw ?? "").trim();
    const dayText = String(dayRaw ?? "").trim();
    const yearText = String(yearRaw ?? "").trim();
    if (!monthText || !dayText || !yearText) {
      return { error: "Enter a month, a day, and a year." };
    }
    if (!/^\d{1,2}$/.test(monthText) || !/^\d{1,2}$/.test(dayText) || !/^\d{4}$/.test(yearText)) {
      return { error: "Enter the day and the year as numbers." };
    }
    const month = Number(monthText);
    const day = Number(dayText);
    const year = Number(yearText);
    if (month < 1 || month > 12) return { error: "Choose a month." };
    if (year < 1800) return { error: "Enter a year from 1800 onward." };
    const days = new Date(year, month, 0).getDate();
    if (day < 1 || day > days) {
      return { error: `${MONTHS[month - 1]} doesn’t have ${day} days.` };
    }
    const limit = new Date(now);
    limit.setUTCDate(limit.getUTCDate() + 1);
    const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (dateKey > limit.toISOString().slice(0, 10)) {
      return { error: "Enter a birth date that has already happened." };
    }
    return { year, month, day };
  }

  function condition(body) {
    if (!body) return "";
    const parts = [];
    if (body.dignity && body.dignity !== "neutral" && DIGNITY[body.dignity]) {
      parts.push(DIGNITY[body.dignity]);
    } else if (body.dignity && body.dignity !== "neutral") {
      parts.push(body.dignity);
    }
    parts.push(body.retrograde ? "Retrograde" : "Direct");
    return parts.join(" · ");
  }

  const BODY_KEYS = {
    sun: "Sun",
    moon: "Moon",
    mercury: "Mercury",
    venus: "Venus",
    mars: "Mars",
    jupiter: "Jupiter",
    saturn: "Saturn",
    uranus: "Uranus",
    neptune: "Neptune",
    pluto: "Pluto",
    northnode: "NorthNode",
    truenode: "NorthNode",
    meannode: "NorthNode",
    southnode: "SouthNode",
    chiron: "Chiron",
    lilith: "Lilith",
    meanlilith: "Lilith",
    blackmoonlilith: "Lilith",
  };

  const ASPECT_KEYS = {
    conjunction: "conjunction",
    opposition: "opposition",
    trine: "trine",
    square: "square",
    sextile: "sextile",
    quincunx: "quincunx",
    inconjunct: "quincunx",
    semisextile: "semisextile",
    semisquare: "semisquare",
    sesquiquadrate: "sesquiquadrate",
    sesquisquare: "sesquiquadrate",
  };

  const READING_SECTIONS = [
    ["core_self", "Core"],
    ["mind", "Mind"],
    ["love_relating", "Love and relating"],
    ["work_path", "Work"],
    ["social_collective", "Others"],
    ["karmic_healing", "Healing"],
  ];

  function compactName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z]/g, "");
  }

  function bodyKey(item) {
    return BODY_KEYS[compactName(item?.id)] || BODY_KEYS[compactName(item?.name)] || null;
  }

  function dignityOf(item) {
    const raw = item?.dignity ?? item?.essential_dignity ?? item?.essentialDignity;
    if (typeof raw !== "string") return undefined;
    const text = raw.toLowerCase();
    if (text === "neutral" || text === "peregrine") return "neutral";
    if (text === "rulership" || text === "domicile") return "domicile";
    if (text === "exaltation" || text === "detriment" || text === "fall") return text;
    return undefined;
  }

  function aspectKey(value) {
    return ASPECT_KEYS[compactName(value)] || null;
  }

  function applyingOf(item) {
    if (typeof item?.applying === "boolean") return item.applying;
    const motion = compactName(item?.movement || item?.motion);
    if (motion === "applying") return true;
    if (motion === "separating") return false;
    return null;
  }

  function prefersExisting(existingId, nextId) {
    const next = String(nextId || "").toLowerCase();
    const existing = String(existingId || "").toLowerCase();
    if (!existing) return false;
    if (existing.includes("true") && next.includes("mean")) return true;
    return false;
  }

  // FreeAstroAPI returns a different chart shape. Fold it into the one the
  // wheel, the tables, and the tests already understand.
  function fromFreeAstro(payload) {
    if (!payload || !Array.isArray(payload.planets)) {
      return { error: "The chart service returned an unexpected response." };
    }
    const planets = {};
    const sourceIds = {};
    for (const item of payload.planets) {
      const key = bodyKey(item);
      const lon = Number(item?.abs_pos);
      if (!key || !Number.isFinite(lon)) continue;
      if (prefersExisting(sourceIds[key], item.id)) continue;
      const place = placement(lon);
      const house = Number(item.house);
      const body = {
        lon: place.lon,
        sign: place.sign,
        degInSign: Number.isFinite(Number(item.pos)) ? Number(item.pos) : place.lon % 30,
        retrograde: Boolean(item.retrograde),
      };
      if (Number.isInteger(house) && house >= 1 && house <= 12) body.house = house;
      const dignity = dignityOf(item);
      if (dignity) body.dignity = dignity;
      planets[key] = body;
      sourceIds[key] = item.id || item.name;
    }
    if (planets.NorthNode && !planets.SouthNode) {
      const opposite = placement(planets.NorthNode.lon + 180);
      planets.SouthNode = {
        lon: opposite.lon,
        sign: opposite.sign,
        degInSign: opposite.lon % 30,
        retrograde: planets.NorthNode.retrograde,
      };
    }
    const houses = Array.isArray(payload.houses) ? payload.houses : [];
    const cusps = houses
      .map((house) => ({ house: Number(house.house), lon: Number(house.abs_pos) }))
      .filter((house) => house.house >= 1 && house.house <= 12 && Number.isFinite(house.lon))
      .sort((a, b) => a.house - b.house);
    const cuspLons = cusps.length === 12 && cusps.every((house, index) => house.house === index + 1)
      ? cusps.map((house) => normLon(house.lon))
      : [];
    const angles = payload.angles || {};
    const ascendant = Number(angles.asc);
    const midheaven = Number(angles.mc);
    const aspects = [];
    for (const item of payload.aspects || []) {
      const type = aspectKey(item.type);
      const a = bodyKey({ name: item.p1, id: item.p1 });
      const b = bodyKey({ name: item.p2, id: item.p2 });
      const delta = Number(item.orb);
      if (!type || !a || !b || !Number.isFinite(delta)) continue;
      aspects.push({ type, a, b, delta, applying: applyingOf(item) });
    }
    if (!planets.Sun || !planets.Moon || !Number.isFinite(ascendant)) {
      return { error: "The chart service returned an unexpected response." };
    }
    return {
      planets,
      ascendant: normLon(ascendant),
      midheaven: Number.isFinite(midheaven) ? normLon(midheaven) : null,
      cusps: cuspLons,
      aspects,
      readings: readingsFrom(payload),
    };
  }

  function readingsFrom(payload) {
    const sections = payload?.interpretation?.sections;
    if (!sections || typeof sections !== "object") return [];
    const readings = [];
    for (const [id, heading] of READING_SECTIONS) {
      const items = Array.isArray(sections[id]) ? sections[id] : [];
      const notes = [];
      for (const item of items) {
        const title = String(item?.title || "").trim();
        const body = String(item?.body || item?.content || "").trim();
        if (!title && !body) continue;
        notes.push({ title, body });
      }
      if (notes.length) readings.push({ heading, notes });
    }
    return readings;
  }

  function natalRequest(person) {
    const place = person?.place || {};
    const city = String(place.name || person?.placeLabel || "Birthplace").replace(/\s+/g, " ").trim().slice(0, 120);
    const zone = typeof place.timezone === "string" && /^[A-Za-z_+-][A-Za-z0-9_+-/]{0,63}$/.test(place.timezone)
      ? place.timezone
      : "AUTO";
    return {
      year: person.year,
      month: person.month,
      day: person.day,
      hour: person.hour,
      minute: person.minute,
      city: city || "Birthplace",
      lat: place.latitude,
      lng: place.longitude,
      tz_str: zone,
    };
  }

  function acceptNatalBody(body) {
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return { error: "The chart request was incomplete." };
    }
    const birth = parseBirthDate(body.month, body.day, body.year);
    if (birth.error) return { error: birth.error };
    const hour = Number(body.hour);
    const minute = Number(body.minute);
    if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
      return { error: "Enter a birth time, or mark the time as unknown." };
    }
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      return { error: "Choose a birthplace from the list." };
    }
    const city = String(body.city || "Birthplace").replace(/\s+/g, " ").trim().slice(0, 120) || "Birthplace";
    const zone = typeof body.tz_str === "string" && /^[A-Za-z_+-][A-Za-z0-9_+-/]{0,63}$/.test(body.tz_str)
      ? body.tz_str
      : "AUTO";
    return {
      request: {
        year: birth.year,
        month: birth.month,
        day: birth.day,
        time_known: true,
        hour,
        minute,
        city,
        lat,
        lng,
        tz_str: zone,
        house_system: "placidus",
        zodiac_type: "tropical",
        include_speed: true,
        include_dignity: true,
        include_minor_aspects: true,
        include_features: ["chiron", "lilith", "true_node"],
        interpretation: { enable: true, style: "improved" },
      },
    };
  }

  return {
    SIGNS,
    SIGN_GLYPH,
    ELEMENT,
    MODE,
    TRADITIONAL_RULER,
    HOUSE_TOPIC,
    BODIES,
    MAJOR_ASPECTS,
    DIGNITY,
    normLon,
    signOf,
    placement,
    formatArc,
    polar,
    separation,
    forwardMid,
    minForwardGap,
    clusterBodies,
    initials,
    portrait,
    ordinal,
    balance,
    chartRuler,
    aspectLabel,
    sortAspects,
    MONTHS,
    parseBirthDate,
    bodyLabel,
    condition,
    fromFreeAstro,
    natalRequest,
    acceptNatalBody,
    wheelLabel,
    buildWheel,
  };
})();

if (typeof window !== "undefined") window.BMFChart = BMFChart;

if (typeof module !== "undefined" && module.exports) {
  module.exports = { BMFChart };
}
