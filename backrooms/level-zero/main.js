// main.js — scene setup, renderer, lights, fog, game loop, UI state.
import * as THREE from "three";
import { World, EYE } from "./world.js";
import { Player } from "./player.js";
import { Hum } from "./audio.js";

// World seed: ?seed=N, else a fixed default.
const seedParam = new URLSearchParams(location.search).get("seed");
const SEED =
  seedParam !== null && seedParam !== "" ? parseInt(seedParam, 10) || 0 : 1337;

// --- renderer ---------------------------------------------------------------
const container = document.getElementById("app");
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

// --- scene / camera -----------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.Fog(0x000000, 20, 72); // distance fades into the void

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  300
);

// --- world --------------------------------------------------------------------
const world = new World(scene, SEED, renderer.capabilities.getMaxAnisotropy());

// --- lights -------------------------------------------------------------------
// Base warmth from ambient + hemisphere; a point light follows the player for
// local light pooling. Panels themselves are unlit (MeshBasicMaterial).
scene.add(new THREE.HemisphereLight(0xfff0c0, 0x6b5f38, 0.5));
scene.add(new THREE.AmbientLight(0xffd9a0, 0.3));
const playerLight = new THREE.PointLight(0xffe6b0, 35, 40, 1.8);
scene.add(playerLight);

// --- player -------------------------------------------------------------------
const player = new Player(camera, renderer.domElement, world);
player.attach();

// --- audio --------------------------------------------------------------------
const hum = new Hum();

// --- UI -----------------------------------------------------------------------
const overlay = document.getElementById("overlay");
const overlayPrompt = document.getElementById("overlay-prompt");
const crosshair = document.getElementById("crosshair");

overlay.addEventListener("click", () => {
  player.lock();
  hum.start(); // user gesture — safe to start AudioContext
});

document.addEventListener("pointerlockchange", () => {
  const locked = document.pointerLockElement === renderer.domElement;
  overlay.classList.toggle("hidden", locked);
  crosshair.style.display = locked ? "block" : "none";
  overlayPrompt.textContent = locked ? "CLICK TO ENTER" : "CLICK TO RESUME";
});

document.addEventListener("keydown", (e) => {
  if (e.code === "KeyM") hum.toggle();
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Debug handle (harmless; used for console testing / inspection).
window.__backrooms = {
  get player() { return player; },
  get camera() { return camera; },
  get world() { return world; },
  get renderer() { return renderer; },
};

// --- game loop ------------------------------------------------------------------
const clock = new THREE.Clock();
let loggedInfo = false;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;

  player.update(dt);
  world.update(player.pos.x, player.pos.z);
  world.updateFlicker(t);

  playerLight.position.set(player.pos.x, EYE + 0.4, player.pos.z);

  renderer.render(scene, camera);

  if (!loggedInfo) {
    loggedInfo = true;
    console.log(
      `[backrooms] seed=${SEED} draw calls=${renderer.info.render.calls}`
    );
  }
}
animate();
