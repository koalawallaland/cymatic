// player.js — pointer lock, WASD+SHIFT movement, collision, head bob / FOV kick.
import * as THREE from "three";
import { CELL, EYE } from "./world.js";

const WALK_SPEED = 4; // m/s
const RUN_SPEED = 8; // m/s
const PLAYER_RADIUS = 0.4; // m
const MOUSE_SENS = 0.0022;
const ACCEL = 12; // velocity smoothing (per second)
const PITCH_LIMIT = Math.PI / 2 - 0.01;

export class Player {
  constructor(camera, domElement, world) {
    this.camera = camera;
    this.dom = domElement;
    this.world = world;

    // Spawn at the center of chunk (0,0), which is kept clear of walls.
    this.pos = new THREE.Vector3(0, EYE, 16);
    this.yaw = 0;
    this.pitch = 0;
    this.vel = new THREE.Vector3();
    this.keys = new Set();
    this.locked = false;
    this.bobPhase = 0;
    this.bobOffset = 0;
    this.fov = 70;

    camera.rotation.order = "YXZ";

    this.onKeyDown = (e) => {
      if (
        e.code.startsWith("Arrow") ||
        e.code === "KeyW" ||
        e.code === "KeyA" ||
        e.code === "KeyS" ||
        e.code === "KeyD"
      ) {
        e.preventDefault();
      }
      this.keys.add(e.code);
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onMouseMove = (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * MOUSE_SENS;
      this.pitch -= e.movementY * MOUSE_SENS;
      this.pitch = Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, this.pitch));
    };
    this.onLockChange = () => {
      this.locked = document.pointerLockElement === this.dom;
      if (!this.locked) this.keys.clear();
    };
    this.onBlur = () => this.keys.clear();
  }

  attach() {
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
    document.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerlockchange", this.onLockChange);
    window.addEventListener("blur", this.onBlur);
  }

  detach() {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onLockChange);
    window.removeEventListener("blur", this.onBlur);
  }

  lock() {
    try {
      const p = this.dom.requestPointerLock();
      if (p && p.catch) p.catch(() => {}); // some browsers reject without gesture
    } catch {
      /* pointer lock unavailable — overlay stays up */
    }
  }

  get isRunning() {
    return this.keys.has("ShiftLeft") || this.keys.has("ShiftRight");
  }

  update(dt) {
    // --- input direction (relative to yaw); ignored while unlocked ---
    const k = this.keys;
    const active = this.locked;
    const f = active
      ? (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) -
          (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0)
      : 0;
    const s = active
      ? (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) -
          (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0)
      : 0;
    const speed = active && this.isRunning ? RUN_SPEED : WALK_SPEED;

    const fx = -Math.sin(this.yaw);
    const fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw);
    const rz = -Math.sin(this.yaw);
    let dx = fx * f + rx * s;
    let dz = fz * f + rz * s;
    const len = Math.hypot(dx, dz);
    if (len > 0) {
      dx /= len;
      dz /= len;
    }

    // --- velocity smoothing (frame-rate independent) ---
    const kSm = 1 - Math.exp(-ACCEL * dt);
    this.vel.x += (dx * speed - this.vel.x) * kSm;
    this.vel.z += (dz * speed - this.vel.z) * kSm;

    // --- move with per-axis collision ---
    this.moveAxis("x", this.vel.x * dt);
    this.moveAxis("z", this.vel.z * dt);

    // --- head bob + FOV kick ---
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    if (hSpeed > 0.5) this.bobPhase += dt * hSpeed * 1.8;
    const bobTarget =
      Math.sin(this.bobPhase) * 0.05 * Math.min(1, hSpeed / WALK_SPEED);
    this.bobOffset += (bobTarget - this.bobOffset) * (1 - Math.exp(-10 * dt));

    const targetFov = active && this.isRunning && hSpeed > 1 ? 74 : 70;
    this.fov += (targetFov - this.fov) * (1 - Math.exp(-8 * dt));
    if (Math.abs(this.fov - this.camera.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }

    // --- camera ---
    this.camera.position.set(this.pos.x, EYE + this.bobOffset, this.pos.z);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  // Move along one axis, resolving circle (player) vs AABB (wall cell)
  // overlaps by pushing back to the cell boundary.
  moveAxis(axis, delta) {
    if (delta === 0) return;
    const p = this.pos;
    if (axis === "x") p.x += delta;
    else p.z += delta;

    const r=PLAYER_RADIUS;
    for(const b of this.world.colliders){
      const nx=Math.max(b.minX,Math.min(p.x,b.maxX)),nz=Math.max(b.minZ,Math.min(p.z,b.maxZ));
      if((p.x-nx)**2+(p.z-nz)**2<r*r){
        if(axis==="x")p.x=delta>0?b.minX-r:b.maxX+r;
        else p.z=delta>0?b.minZ-r:b.maxZ+r;
      }
    }
  }
}
