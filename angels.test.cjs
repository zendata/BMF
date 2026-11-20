"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const catalog = require("./angels.json");
const { createAngelIndex } = require("./angels.js");

const index = createAngelIndex(catalog);

function at(year, month, day, hour, minute = 0) {
  return index.at(new Date(year, month - 1, day, hour, minute));
}

test("an angel number finds the shared record", () => {
  const found = index.byNumber(1);
  assert.equal(found.angel.name, "Vehuiah");
  assert.equal(found.angel.pronunciation, "vay-HOO-eh-YAH");
  assert.equal(found.intellect.length, 1);
  assert.equal(found.guardian.length, 1);
  assert.ok(found.heart.length >= 1);
});

test("intellect follows the clock, including the repaired midday slot and midnight", () => {
  assert.equal(at(2026, 11, 20, 0, 0).intellect.angel.name, "Vehuiah");
  assert.equal(at(2026, 11, 20, 0, 19).intellect.angel.number, 1);
  assert.equal(at(2026, 11, 20, 0, 20).intellect.angel.name, "Jeliel");
  assert.equal(at(2026, 11, 20, 11, 40).intellect.angel.name, "Menadel");
  assert.equal(at(2026, 11, 20, 12, 0).intellect.angel.name, "Aniel");
  assert.equal(at(2026, 11, 20, 12, 20).intellect.angel.name, "Haamiah");
  assert.equal(at(2026, 11, 20, 12, 20).intellect.label, "12:20 pm – 12:40 pm");
  assert.equal(at(2026, 11, 20, 12, 40).intellect.angel.name, "Rehael");
  assert.equal(at(2026, 11, 20, 23, 40).intellect.angel.name, "Mumiah");
  assert.equal(at(2026, 11, 20, 23, 59).intellect.label, "11:40 pm – 12:00 am");
});

test("guardian dates run from 21 March and cover the year boundary", () => {
  assert.equal(at(2026, 3, 21, 12).guardian.angel.name, "Vehuiah");
  assert.equal(at(2026, 3, 25, 12).guardian.angel.number, 1);
  assert.equal(at(2026, 3, 26, 12).guardian.angel.number, 2);
  assert.equal(at(2026, 3, 20, 12).guardian.angel.name, "Mumiah");
  assert.equal(at(2026, 1, 1, 8).guardian.angel.number, 57);
  assert.equal(at(2026, 12, 31, 8).guardian.angel.number, 56);
  assert.equal(at(2025, 2, 28, 8).guardian.angel.number, 68);
  assert.equal(at(2024, 2, 29, 8).guardian.angel.number, 68);
});

test("a heart day split across morning and afternoon uses noon as the change", () => {
  const morning = at(2026, 8, 19, 11, 59);
  const afternoon = at(2026, 8, 19, 12, 0);
  assert.equal(morning.heart.length, 1);
  assert.equal(morning.heart[0].angel.name, "Jeliel");
  assert.match(morning.heart[0].label, /morning of 19 August/);
  assert.equal(afternoon.heart[0].angel.name, "Sitael");
  assert.match(afternoon.heart[0].label, /afternoon of 19 August/);
  assert.equal(at(2026, 8, 18, 23).heart[0].angel.name, "Jeliel");
  assert.equal(at(2026, 8, 20, 0).heart[0].angel.name, "Sitael");
});

test("27 December is morning for one heart angel and afternoon for the next", () => {
  assert.equal(at(2026, 12, 27, 9).heart[0].angel.name, "Harahel");
  assert.equal(at(2026, 12, 27, 15).heart[0].angel.name, "Mitzrael");
});

test("28 February and the leap day share one heart angel", () => {
  assert.equal(at(2025, 2, 28, 10).heart[0].angel.name, "Imamiah");
  assert.equal(at(2024, 2, 29, 16).heart[0].angel.name, "Imamiah");
  assert.match(at(2024, 2, 29, 16).heart[0].label, /28 and 29 February/);
});

test("24 January is listed for two heart angels", () => {
  const names = at(2026, 1, 24, 10).heart.map((item) => item.angel.name);
  assert.deepEqual(names, ["Hakamiah", "Laviah"]);
});
