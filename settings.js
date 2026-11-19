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

renewTimingCookie();
