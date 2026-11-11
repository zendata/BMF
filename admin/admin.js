"use strict";

const form = document.querySelector("#settings-form");
const statusLine = document.querySelector("#status");
const fileNote = document.querySelector("#file-note");
const useFile = document.querySelector("#use-file");

showFileNote();
selectCurrent();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  save();
});

useFile.addEventListener("click", () => {
  forgetSettings();
  selectCurrent();
  statusLine.className = "status";
  statusLine.textContent = "This browser is using the parameter file again.";
});

function showFileNote() {
  const own = fileOwnCalculation() ? "1, our own calculation" : "0, FreeAstroAPI";
  const when = fileTiming() === "eastern" ? "eastern" : "western";
  fileNote.textContent = `The parameter file says ${own}, and ${when} timing. On the public site, Save changes this browser. Another device keeps the parameter file until that file is edited.`;
}

function selectCurrent() {
  const own = effectiveOwnCalculation() ? "1" : "0";
  const when = effectiveTiming();
  form.elements.owncalculation.value = own;
  form.elements.timing.value = when;
}

async function save() {
  const settings = rememberSettings({
    owncalculation: form.elements.owncalculation.value,
    timing: form.elements.timing.value,
  });
  statusLine.className = "status";
  statusLine.textContent = "Saved on this browser.";
  try {
    const response = await fetch("../api/params", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) return;
    const own = settings.owncalculation === 0 ? "0, FreeAstroAPI" : "1, our own calculation";
    const when = settings.timing === "eastern" ? "eastern" : "western";
    statusLine.textContent = "Saved on this browser and in the parameter file on this server.";
    fileNote.textContent = `The parameter file on this server now says ${own}, and ${when} timing.`;
  } catch {
    // GitHub Pages has no server to rewrite params.js. The browser copy is enough here.
  }
}
