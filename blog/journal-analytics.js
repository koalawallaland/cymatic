/* Journal-only counts. No tracking on the desk or rest of the site.
   Counters track page-load sessions, NOT individual people or confirmed reads.
   This is a best-effort public CountAPI integration, not durable analytics. */
(() => {
  "use strict";
  const script = document.currentScript;
  const slug = script?.dataset?.journalTrack;
  const keys = {
    index: "koalawallaland_cymatic_journal_index_20261108_v1",
    aluminum: "koalawallaland_cymatic_aluminum_ghosts_visits_20261108_a71c"
  };
  const key = keys[slug];
  if (!key || location.hostname !== "koalawallaland.github.io") return;
  const status = document.querySelector("[data-poem-counter-status]");
  const output = document.querySelector("[data-poem-count]");
  const sessionKey = "kwl-journal-session-20261108:" + slug;
  const endpoint = "https://countapi.mileshilliard.com/api/v1/";
  let seen = false;
  try { seen = sessionStorage.getItem(sessionKey) === "recorded"; } catch (_) {}
  async function request(method) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(endpoint + method + "/" + key, {
        credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error("Count service status " + response.status);
      const data = await response.json();
      if (!Number.isSafeInteger(data.value) || data.value < 0) throw new Error("Invalid count");
      return data.value;
    } finally { clearTimeout(timer); }
  }
  function display(value) {
    if (output) {
      output.textContent = String(value).padStart(5,"0");
      output.setAttribute("aria-label", value + " page sessions");
    }
    if (status) status.textContent = "sessions, not unique readers";
  }
  async function run() {
    if (seen) {
      try { display(await request("get")); }
      catch (_) { if (status) status.textContent = "readout unavailable"; }
      return;
    }
    // Mark the session first to avoid duplicate hits when the response is lost.
    // This can undercount a failed request. Public counters cannot guarantee exactly-once delivery.
    try { sessionStorage.setItem(sessionKey, "recorded"); } catch (_) {}
    try { display(await request("hit")); }
    catch (_) {
      if (status) status.textContent = "counting service unavailable";
      if (output) output.textContent = "—";
    }
  }
  run();
})();
