"use strict";

// Looks up the three angel sheets. angels.json is the spreadsheet, kept in the
// app so a page can answer from the current date and time, or from an angel
// number, without opening the workbook.
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function createAngelIndex(catalog) {
  const angelsByNumber = new Map(catalog.angels.map((angel) => [angel.number, angel]));

  function angel(number) {
    return angelsByNumber.get(number) || null;
  }

  function intellectAt(date) {
    const minute = date.getHours() * 60 + date.getMinutes();
    const slot = catalog.intellect.find((item) => minute >= item.start && minute < item.end);
    if (!slot) return null;
    return { angel: angel(slot.number), label: formatWindow(slot.start, slot.end) };
  }

  function guardianAt(date) {
    const key = date.getMonth() + 1;
    const day = date.getDate();
    const slot = catalog.guardian.find((item) => includesDate(item, key, day));
    if (!slot) return null;
    return { angel: angel(slot.number), label: formatGuardian(slot) };
  }

  function heartAt(date) {
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const part = date.getHours() < 12 ? "am" : "pm";
    const slots = catalog.heart.filter((item) => (
      item.month === month && item.day === day && (item.part === "all" || item.part === part)
    ));
    return slots.map((slot) => ({ angel: angel(slot.number), label: slot.label }));
  }

  function at(date) {
    return {
      intellect: intellectAt(date),
      guardian: guardianAt(date),
      heart: heartAt(date),
    };
  }

  function byNumber(number) {
    const found = angel(Number(number));
    if (!found) return null;
    return {
      angel: found,
      intellect: catalog.intellect.filter((item) => item.number === found.number),
      guardian: catalog.guardian.filter((item) => item.number === found.number),
      heart: catalog.heart.filter((item) => item.number === found.number),
    };
  }

  return { at, byNumber, angel };
}

function includesDate(item, month, day) {
  const key = month * 40 + day;
  const start = item.startMonth * 40 + item.startDay;
  const end = item.endMonth * 40 + item.endDay;
  if (start <= end) return key >= start && key <= end;
  return key >= start || key <= end;
}

function clockLabel(minute) {
  const bounded = minute === 1440 ? 0 : minute;
  const hour24 = Math.floor(bounded / 60);
  const mins = bounded % 60;
  const suffix = hour24 < 12 ? "am" : "pm";
  const hour = hour24 % 12 || 12;
  return `${hour}:${String(mins).padStart(2, "0")} ${suffix}`;
}

function formatWindow(start, end) {
  return `${clockLabel(start)} – ${clockLabel(end)}`;
}

function formatGuardian(item) {
  const startMonth = MONTHS[item.startMonth - 1];
  const endMonth = MONTHS[item.endMonth - 1];
  if (item.startMonth === item.endMonth) {
    return `${item.startDay}–${item.endDay} ${startMonth}`;
  }
  return `${item.startDay} ${startMonth} – ${item.endDay} ${endMonth}`;
}

function formatWhen(date) {
  const hour24 = date.getHours();
  const suffix = hour24 < 12 ? "am" : "pm";
  const hour = hour24 % 12 || 12;
  const mins = String(date.getMinutes()).padStart(2, "0");
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}, ${hour}:${mins} ${suffix}`;
}

if (typeof window !== "undefined") {
  window.createAngelIndex = createAngelIndex;
  window.formatAngelWhen = formatWhen;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { createAngelIndex, formatWhen };
}
