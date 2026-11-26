import * as T from 'three';
import { availableTargets, chapters, targets } from './story.js';
import { buildScenery } from './scenery.js';

const clamp = T.MathUtils.clamp;
const axes = new T.Vector3();
const next = new T.Vector3();
const pointer = new T.Vector2();
const targetHeight = 1.35;
const playerHeight = 1.67;

export class World {
  constructor(canvas, { settings, onFrame, onStep, onContextLost }) {
    this.canvas = canvas;
    this.renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.19;
    this.renderer.shadowMap.type = T.PCFShadowMap;
    this.scene = new T.Scene();
    this.camera = new T.PerspectiveCamera(67, 1, 0.035, 155);
    this.camera.rotation.order = 'YXZ';
    this.scenery = buildScenery(this.scene);
    this.keys = new Set();
    this.position = new T.Vector3();
    this.view = new T.Vector2();
    this.walkTime = 0;
    this.dir = new T.Vector2();
    this.velocity = new T.Vector2();
    this.inputEnabled = false;
    this.active = false;
    this.onFrame = onFrame;
    this.onStep = onStep;
    this.applySettings(settings);
    this.resize = () => {
      const width = Math.max(1, this.canvas.clientWidth);
      const height = Math.max(1, this.canvas.clientHeight);
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', this.resize);
    canvas.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.active = false;
      onContextLost();
    });
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false;
    });
    this.frame = now => {
      const dt = Math.min((now - (this.lastFrame ?? now)) / 1000, 0.04);
      this.lastFrame = now;
      if (this.active && this.state && !this.renderer.getContext().isContextLost()) this.render(now / 1000, dt);
      requestAnimationFrame(this.frame);
    };
    requestAnimationFrame(this.frame);
  }

  applySettings(settings) {
    this.settings = settings;
    const high = settings.quality === 'high';
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 1.6 : 1));
    this.renderer.shadowMap.enabled = high;
  }

  load(state, reposition) {
    this.state = state;
    this.targets = availableTargets(state);
    this.activeIds = new Set(this.targets.map(target => target.id));
    if (reposition) {
      const { lower, upper } = chapters[state.act];
      this.position.set(clamp(state.position[0], -3.96, 3.96), 0, clamp(state.position[1], lower, upper));
      this.view.set(state.view[0] % (Math.PI * 2), clamp(state.view[1], -1.11, 1.11));
      this.velocity.set(0, 0);
    }
  }

  resetInput() {
    this.keys.clear();
    this.dir.set(0, 0);
    this.velocity.set(0, 0);
  }

  look(dx, dy) {
    if (!this.inputEnabled) return;
    const sensitivity = this.settings.sensitivity * 0.0021;
    this.view.x = (this.view.x - dx * sensitivity) % (Math.PI * 2);
    this.view.y = clamp(this.view.y - dy * sensitivity, -1.11, 1.11);
  }

  transform() {
    return {
      position: [this.position.x, this.position.z],
      view: [this.view.x, this.view.y],
    };
  }

  nearest() {
    const ordered = this.targets.map(target => ({
      ...target,
      distance: Math.hypot(target.x - this.position.x, target.z - this.position.z),
    })).sort((a, b) => a.distance - b.distance);
    return ordered[0] ?? null;
  }

  projected(target) {
    axes.set(target.x, targetHeight + 0.94, target.z);
    this.camera.getWorldDirection(next);
    if (axes.clone().sub(this.camera.position).dot(next) < 0.05) return null;
    axes.project(this.camera);
    pointer.set((axes.x + 1) / 2, (1 - axes.y) / 2);
    return pointer.x > 0.04 && pointer.x < 0.96 && pointer.y > 0.1 && pointer.y < 0.84 ? [pointer.x, pointer.y] : null;
  }

  move(dt) {
    const held = code => Number(this.keys.has(code));
    const forward = Number(this.keys.has('KeyW') || this.keys.has('ArrowUp')) -
      Number(this.keys.has('KeyS') || this.keys.has('ArrowDown')) - this.dir.y;
    const strafe = held('KeyD') - held('KeyA') + this.dir.x;
    const turn = held('ArrowLeft') - held('ArrowRight');
    this.view.x += turn * dt * 1.67 * this.settings.sensitivity;
    this.view.y = clamp(this.view.y + (held('PageUp') - held('PageDown')) * dt * 1.2, -1.11, 1.11);
    const length = Math.max(1, Math.hypot(forward, strafe));
    const speed = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') ? 5.36 : 3.42;
    const smooth = Math.min(1, dt * 15);
    const sin = Math.sin(this.view.x);
    const cos = Math.cos(this.view.x);
    this.velocity.x += (((strafe * cos - forward * sin) / length) * speed - this.velocity.x) * smooth;
    this.velocity.y += (((-forward * cos - strafe * sin) / length) * speed - this.velocity.y) * smooth;
    const { lower, upper } = chapters[this.state.act];
    next.set(clamp(this.position.x + this.velocity.x * dt, -3.96, 3.96), 0,
      clamp(this.position.z + this.velocity.y * dt, lower, upper));
    for (const target of targets) {
      if (target.act !== this.state.act) continue;
      const radius = target.actor === 'bao' || target.prop === 'transmitter' ? 0.88 : 0.56;
      const dx = next.x - target.x;
      const dz = next.z - target.z;
      const distance = Math.hypot(dx, dz);
      if (distance >= radius || distance < 0.0001) continue;
      next.x = target.x + dx * radius / distance;
      next.z = target.z + dz * radius / distance;
    }
    const travel = this.position.distanceTo(next);
    this.position.copy(next);
    const steps = Math.floor(this.walkTime / 1.6);
    this.walkTime += travel * 3.15;
    if (Math.floor(this.walkTime / 1.6) > steps) this.onStep();
    return travel > 0.002;
  }

  render(now, dt) {
    const moving = this.inputEnabled && this.move(dt);
    const bob = moving && this.settings.motion ? Math.sin(this.walkTime * 1.96) * 0.022 : 0;
    this.camera.position.set(this.position.x, playerHeight + bob, this.position.z);
    this.camera.rotation.set(this.view.y, this.view.x, 0);
    this.camera.updateMatrixWorld();
    this.scenery.update(now, this.position.z, this.state.act, this.activeIds, this.settings.motion, this.settings.quality === 'high');
    this.renderer.render(this.scene, this.camera);
    if (this.inputEnabled) {
      const target = this.nearest();
      this.onFrame(dt, target, target ? this.projected(target) : null);
    }
  }
}
