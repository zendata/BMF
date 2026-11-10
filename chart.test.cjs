"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { BMFChart } = require("./chart.js");

test("signs wrap at Aries and across negative longitude", () => {
  assert.equal(BMFChart.signOf(0), "Aries");
  assert.equal(BMFChart.signOf(30), "Taurus");
  assert.equal(BMFChart.signOf(359.9), "Pisces");
  assert.equal(BMFChart.signOf(-0.1), "Pisces");
});

test("placement rolls a rounded 30 degrees into the next sign", () => {
  assert.deepEqual(
    { sign: BMFChart.placement(29.999).sign, degree: BMFChart.placement(29.999).degree },
    { sign: "Taurus", degree: "0°00′" },
  );
  assert.equal(BMFChart.placement(209.2675).sign, "Libra");
  assert.equal(BMFChart.placement(209.2675).degree, "29°16′");
});

test("small orbs format as degrees and minutes", () => {
  assert.equal(BMFChart.formatArc(0.1769), "0°11′");
  assert.equal(BMFChart.formatArc(6.5), "6°30′");
});

test("the ascendant sits on the left and longitude increases downward", () => {
  const ascendant = 10;
  const [x, y] = BMFChart.polar(100, 100, 50, ascendant, ascendant);
  assert.ok(Math.abs(x - 50) < 0.001);
  assert.ok(Math.abs(y - 100) < 0.001);

  const [x2, y2] = BMFChart.polar(0, 0, 10, ascendant + 10, ascendant);
  const [x1, y1] = BMFChart.polar(0, 0, 10, ascendant, ascendant);
  assert.ok(y2 > y1);
  assert.ok(x2 > x1);
});

test("planets clustered across 0° Aries stay in one group", () => {
  const groups = BMFChart.clusterBodies([
    { lon: 1, key: "a" },
    { lon: 3, key: "b" },
    { lon: 359, key: "c" },
    { lon: 40, key: "d" },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].map((body) => body.key), ["c", "a", "b"]);
  assert.deepEqual(groups[1].map((body) => body.key), ["d"]);
});

test("weighted balance and the traditional Libra ruler", () => {
  const chart = {
    ascendant: 209.2675,
    planets: {
      Sun: { sign: "Gemini" },
      Moon: { sign: "Pisces" },
      Mercury: { sign: "Gemini" },
      Venus: { sign: "Taurus" },
      Mars: { sign: "Aries" },
      Jupiter: { sign: "Cancer" },
      Saturn: { sign: "Capricorn" },
    },
  };
  const tally = BMFChart.balance(chart, true);
  assert.deepEqual(tally.elements, { fire: 1, earth: 2, air: 5, water: 3 });
  assert.deepEqual(tally.elementLeaders, ["air"]);
  assert.deepEqual(tally.modeLeaders, ["cardinal", "mutable"]);
  assert.equal(BMFChart.chartRuler(chart).ruler, "Venus");
  assert.equal(BMFChart.chartRuler(chart).rising, "Libra");
});

test("a birth date can change its day after the month is chosen", () => {
  const june = BMFChart.parseBirthDate("6", "15", "1990", new Date("2026-11-10T00:00:00Z"));
  assert.deepEqual({ year: june.year, month: june.month, day: june.day }, { year: 1990, month: 6, day: 15 });
  const changed = BMFChart.parseBirthDate("6", "16", "1990", new Date("2026-11-10T00:00:00Z"));
  assert.equal(changed.day, 16);
  assert.equal(changed.month, 6);
});

test("an impossible day stays a date error instead of another month", () => {
  const leap = BMFChart.parseBirthDate("2", "29", "1992", new Date("2026-11-10T00:00:00Z"));
  assert.equal(leap.day, 29);
  const ordinary = BMFChart.parseBirthDate("2", "29", "1990", new Date("2026-11-10T00:00:00Z"));
  assert.match(ordinary.error, /February doesn’t have 29 days/);
  const missing = BMFChart.parseBirthDate("6", "", "1990", new Date("2026-11-10T00:00:00Z"));
  assert.match(missing.error, /month, a day, and a year/);
  const future = BMFChart.parseBirthDate("12", "31", "2026", new Date("2026-11-10T00:00:00Z"));
  assert.match(future.error, /already happened/);
});

test("initials use the first letters of up to three names", () => {
  assert.equal(BMFChart.initials("Ada Lovelace"), "AL");
  assert.equal(BMFChart.initials("Ada"), "AD");
  assert.equal(BMFChart.initials("  Maya  Angelou  "), "MA");
});
