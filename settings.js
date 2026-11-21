"use strict";

// The parameter file is the default. A timing choice saved from /admin is
// kept in a cookie, so each browser remembers eastern or western on its own.
var IANGELS_SETTINGS_KEY = "iangels-settings";
var IANGELS_TIMING_COOKIE = "iangels-timing";
// Browsers drop a cookie after 400 days. Each visit renews that window.
var IANGELS_TIMING_MAX_AGE = 60 * 60 * 24 * 400;

function iangelsSaved() {
  try {
    if (typeof localStorage === "undefined") return null;
    const parsed = JSON.parse(localStorage.getItem(IANGELS_SETTINGS_KEY) || "null");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function fileTiming() {
  const value = typeof timing === "undefined" ? "western" : String(timing).toLowerCase();
  return value === "eastern" ? "eastern" : "western";
}

function knownTiming(value) {
  if (value == null || value === "") return null;
  const timing = String(value).toLowerCase();
  if (timing === "eastern" || timing === "western") return timing;
  return null;
}

function siteCookiePath() {
  const path = (typeof location === "undefined" ? "/" : location.pathname) || "/";
  const root = path.replace(/\/admin(?:\/index\.html)?\/?$/, "/").replace(/[^/]*$/, "");
  return root || "/";
}

function readTimingCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + IANGELS_TIMING_COOKIE + "=([^;]*)"));
  if (!match) return null;
  try {
    return knownTiming(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

function writeTimingCookie(timing) {
  if (typeof document === "undefined") return;
  const value = knownTiming(timing);
  if (!value) return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = IANGELS_TIMING_COOKIE + "=" + value
    + "; Max-Age=" + IANGELS_TIMING_MAX_AGE
    + "; Path=" + siteCookiePath()
    + "; SameSite=Lax" + secure;
}

function chosenTiming() {
  const fromCookie = readTimingCookie();
  if (fromCookie) return fromCookie;
  const saved = iangelsSaved();
  if (saved) return knownTiming(saved.timing);
  return null;
}

function effectiveOwnCalculation() {
  return true;
}

function effectiveTiming() {
  return chosenTiming() || fileTiming();
}

function rememberSettings(settings) {
  const next = {
    owncalculation: 1,
    timing: knownTiming(settings.timing) || "western",
  };
  writeTimingCookie(next.timing);
  try {
    localStorage.setItem(IANGELS_SETTINGS_KEY, JSON.stringify(next));
  } catch {
    // The cookie is already stored. A blocked local store does not undo that.
  }
  return next;
}

function renewTimingCookie() {
  const chosen = chosenTiming();
  if (chosen) writeTimingCookie(chosen);
}

var IANGELS_NATAL_COOKIE = "iangels-natal";

function cleanNatalPlace(place) {
  if (!place || typeof place !== "object" || Array.isArray(place)) return null;
  const latitude = Number(place.latitude);
  const longitude = Number(place.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return {
    name: typeof place.name === "string" ? place.name.slice(0, 80) : "",
    admin1: typeof place.admin1 === "string" ? place.admin1.slice(0, 80) : "",
    country: typeof place.country === "string" ? place.country.slice(0, 80) : "",
    timezone: typeof place.timezone === "string" ? place.timezone.slice(0, 80) : "",
    latitude: latitude,
    longitude: longitude,
  };
}

function cleanNatal(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const month = String(value.month == null ? "" : value.month);
  const natal = {
    name: typeof value.name === "string" ? value.name.slice(0, 80) : "",
    month: /^(?:[1-9]|1[0-2])$/.test(month) ? month : "",
    day: typeof value.day === "string" ? value.day.replace(/\D/g, "").slice(0, 2) : "",
    year: typeof value.year === "string" ? value.year.replace(/\D/g, "").slice(0, 4) : "",
    time: typeof value.time === "string" && /^\d{2}:\d{2}$/.test(value.time) ? value.time : "",
    timeUnknown: Boolean(value.timeUnknown),
    placeText: typeof value.placeText === "string" ? value.placeText.slice(0, 160) : "",
    place: cleanNatalPlace(value.place),
  };
  const filled = natal.name || natal.month || natal.day || natal.year || natal.time || natal.timeUnknown || natal.placeText || natal.place;
  return filled ? natal : null;
}

function readNatalCookie() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|;\\s*)" + IANGELS_NATAL_COOKIE + "=([^;]*)"));
  if (!match) return null;
  try {
    return cleanNatal(JSON.parse(decodeURIComponent(match[1])));
  } catch {
    return null;
  }
}

function writeNatalCookie(natal) {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  const clean = cleanNatal(natal);
  if (!clean) {
    document.cookie = IANGELS_NATAL_COOKIE + "=; Max-Age=0; Path=" + siteCookiePath() + "; SameSite=Lax" + secure;
    return;
  }
  document.cookie = IANGELS_NATAL_COOKIE + "=" + encodeURIComponent(JSON.stringify(clean))
    + "; Max-Age=" + IANGELS_TIMING_MAX_AGE
    + "; Path=" + siteCookiePath()
    + "; SameSite=Lax" + secure;
}

function renewNatalCookie() {
  const saved = readNatalCookie();
  if (saved) writeNatalCookie(saved);
}

renewTimingCookie();
renewNatalCookie();
