"use strict";

// The parameter file is the default. A choice saved from /admin overrides it
// in this browser, which is how the public site can be switched from an iPad.
var IANGELS_SETTINGS_KEY = "iangels-settings";

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

function fileOwnCalculation() {
  return typeof owncalculation === "undefined" || Number(owncalculation) !== 0;
}

function fileTiming() {
  const value = typeof timing === "undefined" ? "western" : String(timing).toLowerCase();
  return value === "eastern" ? "eastern" : "western";
}

function effectiveOwnCalculation() {
  const saved = iangelsSaved();
  if (saved && saved.owncalculation != null && saved.owncalculation !== "") {
    return Number(saved.owncalculation) !== 0;
  }
  return fileOwnCalculation();
}

function effectiveTiming() {
  const saved = iangelsSaved();
  if (saved && saved.timing != null && saved.timing !== "") {
    return String(saved.timing).toLowerCase() === "eastern" ? "eastern" : "western";
  }
  return fileTiming();
}

function rememberSettings(settings) {
  const next = {
    owncalculation: Number(settings.owncalculation) === 0 ? 0 : 1,
    timing: String(settings.timing).toLowerCase() === "eastern" ? "eastern" : "western",
  };
  localStorage.setItem(IANGELS_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

function forgetSettings() {
  localStorage.removeItem(IANGELS_SETTINGS_KEY);
}
