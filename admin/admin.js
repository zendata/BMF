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
  const when = fileTiming() === "eastern" ? "eastern" : "western";
  fileNote.textContent = `The parameter file says ${when} timing. On the public site, Save stores a cookie in this browser. Another device keeps the parameter file until that file is edited.`;
}

function selectCurrent() {
  form.elements.timing.value = effectiveTiming();
}

async function save() {
  const settings = rememberSettings({
    timing: form.elements.timing.value,
  });
  statusLine.className = "status";
  statusLine.textContent = "Saved in a cookie on this browser.";
  try {
    const response = await fetch("../api/params", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    if (!response.ok) return;
    const when = settings.timing === "eastern" ? "eastern" : "western";
    statusLine.textContent = "Saved in a cookie on this browser and in the parameter file on this server.";
    fileNote.textContent = `The parameter file on this server now says ${when} timing.`;
  } catch {
    // GitHub Pages has no server to rewrite params.js. The browser copy is enough here.
  }
}
