(() => {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tv = document.getElementById("furby-tv-video");
  const power = document.querySelector(".furby-tv-power");
  const updatePower = () => {
    const label = tv.paused ? "Play TV clip" : "Pause TV clip";
    power.setAttribute("aria-label", label);
    power.title = label;
    power.toggleAttribute("data-playing", !tv.paused);
  };
  tv.addEventListener("play", updatePower);
  tv.addEventListener("pause", updatePower);
  power.hidden = false;
  power.addEventListener("click", () => {
    if (tv.paused) tv.play().catch(updatePower);
    else tv.pause();
  });
  if (!motion.matches) tv.play().catch(updatePower);
  motion.addEventListener?.("change", event => { if (event.matches) tv.pause(); });
})();
