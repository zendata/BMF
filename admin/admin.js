"use strict";

const form = document.querySelector("#settings-form");
const statusLine = document.querySelector("#status");

selectCurrent();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  save();
});

function selectCurrent() {
  form.elements.timing.value = effectiveTiming();
}

function save() {
  rememberSettings({
    timing: form.elements.timing.value,
  });
  statusLine.className = "status";
  statusLine.textContent = "Saved in a cookie on this browser.";
}
