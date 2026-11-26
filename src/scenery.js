import * as T from 'three';
import { art } from './media.js';
import { cast, targets } from './story.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const palette = {
  timber: 0x50372b, darkWood: 0x302520, wall: 0xa17957, roof: 0x25403e, rim: 0x344540,
  stone: 0x6b7063, rock: 0x465855, floor: 0x788075, bank: 0x354740, coal: 0x182b29,
  red: 0x9b4936, amber: 0xffa743, gold: 0xb58d59, leaves: 0xca7735, leavesLight: 0xdb9c44,
  leavesDark: 0x74523a, cedar: 0x2e5a4c, cedarDark: 0x2b433d, cream: 0xffe6ad,
};

function makeTexture(isFloor) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const rng = makeRandom(987);
  ctx.fillStyle = '#c0bcb1';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const value = 80 + Math.floor(rng() * 170);
    ctx.fillStyle = 'rgba(' + [value, value, value, 0.34].join(',') + ')';
    ctx.fillRect(rng() * 256, rng() * 256, 1 + rng() * 5, 1 + rng() * 3);
  }
  if (isFloor) {
    ctx.strokeStyle = '#777d73';
    ctx.lineWidth = 3;
    for (let row = 0; row < 8; row++) {
      const shift = row % 2 ? 16 : 0;
      for (let col = -1; col < 8; col++) ctx.strokeRect(shift + col * 32, row * 32, 32, 32);
    }
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(isFloor ? 2 : 1, isFloor ? 17 : 1);
  texture.anisotropy = 4;
  return texture;
}

function makeRandom(seed) {
  return () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, '#fff');
  gradient.addColorStop(0.19, '#fff9');
  gradient.addColorStop(1, '#fff0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new T.CanvasTexture(canvas);
}

export function buildScenery(scene) {
  const rng = makeRandom(190643);
  const sky = new T.Color(0x789e9a);
  scene.background = sky;
  scene.fog = new T.FogExp2(sky, 0.026);
  const skyGradient = new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false, fog: false,
    uniforms: { dawn: { value: 0.0 } },
    vertexShader: 'varying vec3 direction; void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `
      varying vec3 direction; uniform float dawn;
      void main() {
        vec3 ray=normalize(direction);
        float horizon=smoothstep(-.1,.72,ray.y);
        vec3 dusk=mix(vec3(.51,.63,.59),vec3(.14,.32,.38),horizon);
        vec3 morning=mix(vec3(.93,.63,.38),vec3(.34,.54,.61),horizon);
        float light=pow(max(dot(ray,normalize(vec3(-.4,.43,-.86))),0.),6.);
        gl_FragColor=vec4(mix(dusk,morning,dawn)+light*vec3(.20,.14,.04),1.);
        #include <colorspace_fragment>
      }`,
  });
  const skyDome = new T.Mesh(new T.SphereGeometry(130, 26, 16), skyGradient);
  scene.add(skyDome);
  const hemi = new T.HemisphereLight(0xc4eeee, 0x7c5140, 2.05);
  const sun = new T.DirectionalLight(0xffd4a0, 2.5);
  sun.position.set(-15, 27, -71);
  const sunAim = sun.target;
  sunAim.position.set(0, 0, -50);
  sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 24, bottom: -24, near: 0.2, far: 68 });
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.normalBias = 0.055;
  scene.add(hemi, sun, sunAim);

  const materials = Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, new T.MeshStandardMaterial({
    color, roughness: key === 'gold' ? 0.42 : 0.88,
    emissive: ['amber', 'cream'].includes(key) ? color : 0,
    emissiveIntensity: key === 'amber' ? 1.3 : 0.7,
  })]));
  materials.floor.map = makeTexture(true);
  materials.wall.map = makeTexture(false);

  const geometries = {
    box: new T.BoxGeometry(),
    sphere: new T.SphereGeometry(1, 18, 12),
    ico: new T.IcosahedronGeometry(1, 1),
    pillar: new T.CylinderGeometry(0.5, 0.5, 1, 12),
    taper: new T.CylinderGeometry(0.21, 0.5, 1, 6),
    cone: new T.ConeGeometry(0.5, 1, 8),
  };
  const batches = new Map();
  const glow = glowTexture();
  const lanternHalos = [];

  function shape(geometry, material, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const key = geometry + '|' + material;
    const group = batches.get(key) ?? [];
    const dummy = new T.Object3D();
    dummy.position.set(x, y, z);
    dummy.scale.set(sx, sy, sz);
    dummy.rotation.set(rx, ry, rz);
    dummy.updateMatrix();
    group.push(dummy.matrix);
    batches.set(key, group);
  }

  function halo(x, y, z, size, color, opacity) {
    const sprite = new T.Sprite(new T.SpriteMaterial({
      map: glow, color, transparent: true, blending: T.AdditiveBlending, depthWrite: false, opacity,
    }));
    sprite.position.set(x, y, z);
    sprite.scale.setScalar(size);
    scene.add(sprite);
    return sprite;
  }

  function lantern(x, y, z, size = 1) {
    shape('sphere', 'amber', x, y, z, 0.27 * size, 0.33 * size, 0.27 * size);
    shape('pillar', 'darkWood', x, y + 0.32 * size, z, 0.31 * size, 0.06, 0.31 * size);
    shape('pillar', 'red', x, y - 0.35 * size, z, 0.27 * size, 0.09, 0.27 * size);
    shape('pillar', 'gold', x, y - 0.48 * size, z, 0.045, 0.23 * size, 0.045);
    lanternHalos.push(halo(x, y, z, size * 1.9, 0xffad50, 0.37));
  }

  function roof(x, y, z, width, depth) {
    const slope = 0.43;
    for (const side of [-1, 1]) {
      for (let row = 0; row < 4; row++) {
        const widthAtRow = width + row * 0.13;
        const depthAtRow = depth / 7;
        shape('box', 'roof', x, y - row * 0.21, z + side * depthAtRow * (row + 0.43), widthAtRow, 0.13, depthAtRow + 0.18, side * (slope - row * 0.145));
        shape('box', row === 3 ? 'gold' : 'rim', x, y - row * 0.21 + 0.07, z + side * depthAtRow * (row + 0.85), widthAtRow + 0.12, 0.09, 0.14);
        for (let tile = 0; tile <= widthAtRow / 0.38; tile++) {
          const tx = x - widthAtRow / 2 + 0.19 + tile * 0.38;
          shape('pillar', 'rim', tx, y - row * 0.21 + 0.084, z + side * depthAtRow * (row + 0.47), 0.105, depthAtRow + 0.13, 0.105, Math.PI * 0.5 + side * (slope - row * 0.145));
        }
      }
      for (const end of [-1, 1]) {
        shape('box', 'rim', x + end * (width / 2 + 0.28), y - 0.47, z + side * depth * 0.55, 0.9, 0.15, 0.24, 0, 0, end * 0.38);
      }
    }
    shape('pillar', 'darkWood', x, y + 0.15, z, 0.23, width + 0.2, 0.23, 0, 0, Math.PI / 2);
  }

  function pavilion(x, z, width, depth, levels = 1, open = false) {
    shape('box', 'stone', x, 0.16, z, width + 0.65, 0.45, depth + 0.55);
    for (let floor = 0; floor < levels; floor++) {
      const y = 0.35 + floor * 2.44;
      const w = width - floor * 0.9;
      const d = depth - floor * 0.65;
      if (!open || floor > 0) {
        shape('box', 'wall', x, y + 1.13, z, w, 2.25, d);
        for (const side of [-1, 1]) {
          for (let offset = -Math.floor(d / 2) + 0.5; offset < d / 2; offset += 1.35) {
            shape('box', 'gold', x + side * (w / 2 + 0.008), y + 1.35, z + offset, 0.09, 1.09, 0.91);
            shape('box', 'amber', x + side * (w / 2 + 0.058), y + 1.35, z + offset, 0.04, 0.89, 0.72);
            for (const bar of [-0.23, 0, 0.23]) shape('box', 'timber', x + side * (w / 2 + 0.09), y + 1.35, z + offset + bar, 0.075, 1.09, 0.045);
            shape('box', 'timber', x + side * (w / 2 + 0.09), y + 1.35, z + offset, 0.075, 0.055, 0.94);
          }
        }
        for (const side of [-1, 1]) {
          for (let offset = -w / 2 + 0.8; offset < w / 2 - 0.2; offset += 1.37) {
            shape('box', 'gold', x + offset, y + 1.35, z + side * (d / 2), 0.91, 1.09, 0.085);
            shape('box', 'amber', x + offset, y + 1.35, z + side * (d / 2 + 0.055), 0.72, 0.85, 0.04);
            for (const bar of [-0.23, 0, 0.23]) shape('box', 'timber', x + offset + bar, y + 1.35, z + side * (d / 2 + 0.085), 0.045, 1.05, 0.065);
            shape('box', 'timber', x + offset, y + 1.35, z + side * (d / 2 + 0.085), 0.91, 0.05, 0.07);
          }
        }
      }
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          shape('box', 'timber', x + sx * (w / 2 + 0.05), y + 1.1, z + sz * (d / 2 + 0.04), 0.28, 2.38, 0.28);
          if (floor === 0) lantern(x + sx * (w / 2 + 0.19), y + 1.75, z + sz * (d / 2 + 0.35), 0.67);
        }
      }
      shape('box', 'darkWood', x, y + 2.2, z, w + 0.32, 0.23, d + 0.42);
      roof(x, y + 2.94, z, w + 0.7, d + 0.34);
    }
  }

  function gate(z, width, height = 4.5) {
    for (const side of [-1, 1]) {
      shape('pillar', 'stone', side * width / 2, 0.17, z, 0.7, 0.36, 0.72);
      shape('pillar', 'red', side * width / 2, height / 2, z, 0.28, height, 0.28);
      shape('box', 'darkWood', side * width / 2, height - 0.42, z, 0.55, 0.21, 0.63);
      lantern(side * (width / 2 - 0.89), height - 0.91, z, 0.9);
    }
    shape('box', 'red', 0, height - 0.39, z, width + 0.8, 0.28, 0.35);
    shape('box', 'darkWood', 0, height - 0.66, z, 1.34, 0.54, 0.22);
    shape('box', 'gold', 0, height - 0.66, z + 0.12, 1.00, 0.26, 0.02);
    roof(0, height + 0.44, z, width + 1.1, 1.62);
  }

  function tree(x, z, size = 1, evergreen = false) {
    const y = 2.1 * size;
    shape('taper', 'timber', x, y * 0.57, z, 0.43 * size, y * 1.2, 0.46 * size, 0, 0, rng() * 0.2 - 0.1);
    for (let branch = 0; branch < 7; branch++) {
      const angle = branch * 2.4;
      const distance = (0.36 + rng() * 0.74) * size;
      const bx = x + Math.cos(angle) * distance;
      const bz = z + Math.sin(angle) * distance;
      const by = y + (rng() * 1.45) * size;
      if (evergreen) {
        shape('cone', branch % 2 ? 'cedar' : 'cedarDark', x, by + branch * 0.2 * size, z, size * 2.8 / (1 + branch * 0.14), 1.7 * size, size * 2.8 / (1 + branch * 0.14), 0.03, angle);
      } else {
        shape('taper', 'timber', (x + bx) / 2, by * 0.82, (z + bz) / 2, 0.18 * size, 1.7 * size, 0.16 * size, Math.sin(angle) * 0.64, 0, -Math.cos(angle) * 0.72);
        for (let cluster = 0; cluster < 4; cluster++) {
          const color = ['leavesDark', 'leaves', 'leavesLight'][(branch + cluster) % 3];
          shape('ico', color, bx + (rng() - 0.5) * size, by + rng() * size, bz + (rng() - 0.5) * size, (0.56 + rng() * 0.69) * size, (0.24 + rng() * 0.38) * size, (0.49 + rng() * 0.56) * size, 0.2, angle, 0.15);
        }
      }
    }
  }

  shape('box', 'floor', 0, -0.34, -47.5, 9.2, 0.66, 118);
  shape('box', 'bank', -18.5, -0.61, -45, 9, 1.1, 132);
  shape('box', 'bank', 14.5, -0.73, -45, 11, 1.12, 135);
  shape('box', 'coal', 0, -2.2, -52, 220, 0.38, 275);

  for (const x of [-4.55, 4.55]) {
    shape('box', 'stone', x, 0.10, -47, 0.39, 0.35, 120);
    for (let z = 12; z >= -107; z -= 2.5) {
      shape('box', 'stone', x, 0.54, z, 0.39, 0.85, 0.38);
      shape('box', 'rim', x, 0.94, z, 0.48, 0.15, 0.47);
      shape('box', 'timber', x, 0.65, z - 1.25, 0.16, 0.16, 2.35);
      if (Math.round(z * 2) % 15 === 4) lantern(x, 1.29, z, 0.54);
    }
  }
  for (const z of [6, -10, -35, -60, -85, -104]) gate(z, 7.6, z === 6 ? 5 : 4.2);
  for (const [x, z, w, d, floors] of [
    [-7.9, 1, 5.9, 5.7, 2], [8, -3, 6.5, 7, 2], [-7.8, -16, 5.7, 7.2, 2], [7.1, -23, 4.5, 7.1, 2],
    [-7.7, -28, 5.4, 6.1, 1], [-9, -40, 7, 5.6, 1], [9.4, -57, 6, 6.4, 1],
    [-8.7, -69, 7.1, 10, 2], [8.1, -75, 6.6, 8.5, 2], [-9.7, -86, 6, 7.1, 1],
    [0, -106, 7.2, 3.2, 2], [16, -12, 5.1, 6.4, 1], [-18, -24, 7.8, 8.1, 2],
    [-20, -50, 7, 8, 2], [15, -49, 6, 6, 2], [20, -99, 10, 10, 3],
  ]) pavilion(x, z, w, d, floors, z === -106);

  for (const [x, z, size] of [[-7, 10, 1.4], [7, 7, 1.55], [-6, -8, 1.3], [6, -14, 1.1], [-6, -35, 1.5],
    [5.5, -39, 1.8], [-7.5, -47, 2], [6, -50, 1.3], [-5.8, -58, 1.3], [6, -64, 1.5], [6, -84, 1.2],
    [-6.5, -94, 2.1], [7.4, -98, 1.9], [-15, -13, 1.9], [15, -28, 1.6], [-15, -79, 2.5]]) tree(x, z, size);

  for (let i = 0; i < 56; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (20 + rng() * 69);
    const z = -118 + rng() * 165;
    const width = 2.5 + rng() * 16;
    const height = 7 + rng() * 34;
    shape('ico', i % 3 === 0 ? 'bank' : 'rock', x, height * 0.24 - 2, z, width, height * 0.74, width * 0.83, rng() * 0.27, rng() * 8, rng() * 0.3);
    if (i < 28) tree(side * (17 + rng() * 8), z, 0.8 + rng() * 1.7, true);
  }
  for (let i = 0; i < 90; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (4.8 + rng() * 13);
    const z = 10 - rng() * 120;
    const size = 0.12 + rng() * 1.03;
    shape('ico', i % 2 ? 'stone' : 'bank', x, -0.28, z, size, size * 0.48, size * 1.25, 0, rng() * 5);
  }

  for (let i = 0; i < 240; i++) {
    const x = (rng() - 0.5) * 8.4;
    const z = 10 - rng() * 114;
    if (Math.abs(x) < 0.9 && rng() < 0.62) continue;
    shape('ico', ['leavesDark', 'leaves', 'leavesLight'][i % 3], x, 0.013, z, 0.041 + rng() * 0.057, 0.009, 0.058 + rng() * 0.075, 0, rng() * 6.3);
  }
  for (const [x, z, scale] of [[-3.48, -13, .65], [3.42, -21, 1.1], [-3.58, -31, .85], [3.66, -61, .9], [-3.57, -82, .84]]) {
    for (let side = -1; side <= 1; side += 2) {
      shape('pillar', 'timber', x + side * .38 * scale, .45, z, .10, .89, .10);
      lantern(x + side * .27 * scale, .81, z, scale * .68);
    }
    shape('box', 'red', x, .61, z, 1.1 * scale, .13, .52 * scale);
    shape('box', 'timber', x, .27, z, 1.02 * scale, .08, .45 * scale);
  }
  for (const z of [-6, -12, -19, -26, -34, -41, -51, -63, -73, -91, -100]) {
    for (let i = -4; i <= 4; i++) {
      const x = i * 0.82;
      const y = 3.63 + x * x * 0.052;
      if (i % 2 === 0) {
        shape('pillar', 'darkWood', x, y - .10, z, .025, .28, .025);
        lantern(x, y - 0.45, z, 0.75 + 0.15 * rng());
      }
      if (i < 4) shape('box', 'darkWood', x + .41, y + .04 * x, z, .85, .027, .032, 0, 0, Math.atan(.104 * (x + .41)));
    }
  }

  const waterMaterial = new T.ShaderMaterial({
    uniforms: { time: { value: 0 }, dawn: { value: 0 } },
    vertexShader: 'varying vec3 point; void main(){point=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(point,1.);}',
    fragmentShader: `
      uniform float time; uniform float dawn; varying vec3 point;
      void main() {
        vec2 p=point.xz;
        float ripple=sin(p.y*4.0+sin(p.x*1.6+time*.63)+time*1.5)*sin(p.y*9.8+p.x*1.8-time*.44);
        float fire=pow(max(0., sin(p.y*.52)*.5+.5),8.)*pow(max(0.,sin(p.x*1.4)*.5+.5),4.);
        vec3 c=vec3(.055,.22,.21)+vec3(.08,.15,.13)*ripple*.5+fire*vec3(.35,.15,.015);
        c=mix(c,vec3(.56,.68,.65)+dawn*.15,smoothstep(16.,71.,distance(cameraPosition,point)));
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const water = new T.Mesh(new T.PlaneGeometry(220, 250), waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.87, -57);
  scene.add(water);

  const hangingSigns = [];
  function sign(title, x, y, z, width, height, swings) {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = swings ? 172 : 155;
    const ctx = canvas.getContext('2d');
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    const draw = () => {
      const base = ctx.createLinearGradient(0, 0, 320, canvas.height);
      base.addColorStop(0, '#281e16');
      base.addColorStop(1, '#483125');
      ctx.fillStyle = base;
      ctx.fillRect(0, 0, 320, canvas.height);
      ctx.strokeStyle = '#b28553';
      ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, 300, canvas.height - 20);
      ctx.strokeStyle = '#72543a';
      ctx.lineWidth = 1;
      ctx.strokeRect(17, 17, 286, canvas.height - 34);
      ctx.font = `600 ${title.length > 3 ? 52 : 61}px "Lantern Serif", "Songti SC", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffe0ac';
      ctx.fillText(title, 160, canvas.height / 2 + 5);
      texture.needsUpdate = true;
    };
    draw();
    document.fonts?.load('600 52px "Lantern Serif"', title).then(draw).catch(() => {});
    const face = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshBasicMaterial({ map: texture, side: T.DoubleSide }));
    face.position.set(x, y, z);
    scene.add(face);
    if (swings) hangingSigns.push(face);
  }

  for (const [z, label] of [[5.98, '归渡桥'], [-9.98, '灯市'], [-34.98, '银杏林'], [-59.98, '听声楼'], [-84.98, '晓灯亭']]) {
    const y = z > 0 ? 4.34 : 3.54;
    sign(label, 0, y, z + 0.18, 1.36, 0.53, false);
  }

  for (const [x, z, label] of [[-3.4, -16.9, '修音铺'], [3.45, -25.1, '纸灯铺'], [3.25, -42.1, '试音处'], [-3.4, -71.2, '留声档案']]) {
    const direction = Math.sign(x);
    shape('box', 'darkWood', x, 1.68, z, .16, 3.37, .15);
    shape('box', 'timber', x - direction * .32, 3.29, z, .8, .11, .15);
    for (const pin of [-.36, .36]) shape('pillar', 'gold', x - direction * .40 + pin, 3.08, z + .025, .025, .38, .025);
    sign(label, x - direction * .4, 2.83, z + .045, 1.07, .51, true);
    for (let i = 0; i < 3; i++) {
      const itemZ = z - .9 - i * .49;
      shape('box', 'timber', x + direction * .33, .18, itemZ, .56, .37, .46, 0, i * .07);
      shape('box', 'gold', x + direction * .33, .37, itemZ, .54, .038, .43, 0, i * .07);
    }
  }

  for (const [x, z] of [[-4, -41], [3.95, -47], [-4.04, -53], [4.05, -87], [-4, -96]]) {
    for (let stone = 0; stone < 6; stone++) {
      const angle = stone / 6 * Math.PI * 2;
      shape('ico', 'stone', x + Math.cos(angle) * .31, .11, z + Math.sin(angle) * .33, .16, .19, .15, .2, angle);
      shape('taper', 'cedar', x + Math.cos(angle) * .21, .32 + rng() * .16, z + Math.sin(angle) * .23, .14, .51, .10, .22, angle, .18);
    }
  }

  for (const target of targets) {
    const { x, z } = target;
    if (target.prop === 'plaque') {
      shape('box', 'stone', x, 0.09, z, 0.81, 0.21, 0.71);
      shape('box', 'timber', x, 0.58, z, 0.14, 1.08, 0.17);
      shape('box', 'darkWood', x, 1.04, z, 0.64, 0.39, 0.13);
      sign(target.title, x, 1.04, z + 0.073, 0.58, 0.33, false);
    }
    if (target.prop === 'paper') {
      shape('box', 'timber', x, 0.75, z, 0.09, 1.48, 0.1);
      shape('box', 'timber', x - 0.23, 1.45, z, 0.5, 0.075, 0.10);
      lantern(x - 0.36, 1.09, z, 0.85);
    }
    if (target.prop === 'cylinder') {
      shape('pillar', 'stone', x, 0.48, z, 0.71, 0.96, 0.67);
      shape('box', 'gold', x, 0.99, z, 0.88, 0.14, 0.64);
      shape('pillar', 'red', x, 1.16, z, 0.29, 0.68, 0.29, 0, 0, Math.PI / 2);
      shape('pillar', 'gold', x + 0.31, 1.16, z, 0.32, 0.07, 0.32, 0, 0, Math.PI / 2);
      const dome = new T.Mesh(new T.SphereGeometry(0.43, 24, 13, 0, Math.PI * 2, 0, Math.PI / 2),
        new T.MeshPhysicalMaterial({ color: 0xb5f4e8, transparent: true, opacity: 0.24, roughness: 0.15, depthWrite: false }));
      dome.position.set(x, 1.04, z);
      scene.add(dome);
    }
    if (target.prop === 'organ' || target.prop === 'transmitter') {
      const tower = target.prop === 'transmitter';
      shape('box', 'timber', x, 0.47, z, 1.75, 0.94, 1.22);
      shape('box', 'gold', x, 0.94, z + 0.13, 1.92, 0.14, 1.39);
      for (let n = -2; n <= 2; n++) {
        const height = 0.52 + (n + 2) * (tower ? 0.38 : 0.20);
        const px = x + n * 0.35;
        shape('pillar', tower ? 'gold' : 'timber', px, 1 + height / 2, z - 0.3, 0.23, height, 0.23);
        shape('pillar', 'rim', px, 1 + height, z - 0.3, 0.26, 0.11, 0.26);
        shape('sphere', 'amber', px, 1.065, z + 0.43, 0.068, 0.055, 0.068);
      }
      if (tower) {
        shape('pillar', 'gold', x, 2.6, z - 0.48, 0.16, 3.1, 0.16);
        shape('sphere', 'cream', x, 4.15, z - 0.48, 0.19, 0.19, 0.19);
        lanternHalos.push(halo(x, 4.15, z - 0.48, 2.2, 0xffa45f, 0.53));
      }
    }
  }

  const textureLoader = new T.TextureLoader();
  const portraits = new Map();

  function actor(name, x, z) {
    const group = new T.Group();
    group.position.set(x, 0, z);
    const height = { bao: 2.23, yun: 2.0, ren: 1.96 }[name];
    const sprite = new T.Sprite(new T.SpriteMaterial({ transparent: true, alphaTest: 0.11, depthWrite: false, toneMapped: false }));
    sprite.position.y = height * 0.5;
    group.add(sprite);
    const portrait = cast[name].portrait;
    if (!portraits.has(portrait)) {
      portraits.set(portrait, textureLoader.loadAsync(art(portrait + '.webp')).then(map => {
        map.colorSpace = T.SRGBColorSpace;
        return map;
      }));
    }
    portraits.get(portrait).then(map => {
      sprite.material.map = map;
      sprite.material.needsUpdate = true;
      sprite.scale.set(height * map.image.width / map.image.height, height, 1);
    }).catch(() => {});
    sprite.scale.set(0, 0, 1);

    const modelUrl = name === 'bao' && art('milk-dragon.glb');
    if (modelUrl) {
      new GLTFLoader().load(modelUrl, asset => {
        const model = asset.scene;
        const box = new T.Box3().setFromObject(model);
        const size = box.getSize(new T.Vector3());
        const center = box.getCenter(new T.Vector3());
        if (size.y <= 0) return;
        const scale = height / size.y;
        model.scale.setScalar(scale);
        model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
        model.traverse(object => { if (object.isMesh) object.castShadow = true; });
        group.remove(sprite);
        group.add(model);
      }, undefined, () => {});
    }

    const shadow = new T.Mesh(new T.PlaneGeometry(2.05, 1.22), new T.MeshBasicMaterial({
      color: 0x0d1e18, map: glow, opacity: 0.58, transparent: true, depthWrite: false, polygonOffset: true,
      polygonOffsetFactor: -1,
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, 0.011, z);
    scene.add(shadow, group);
    return group;
  }
  const markers = targets.map(target => {
    const lead = target.actor ? actor(target.actor, target.x, target.z) : null;
    if (target.companion) actor(target.companion, target.x + 1.25, target.z - 0.4);
    const marker = new T.Mesh(new T.OctahedronGeometry(target.optional ? 0.10 : 0.15), new T.MeshBasicMaterial({ color: target.optional ? 0x9be4c4 : 0xffd58c }));
    marker.position.set(target.x, lead ? 2.53 : target.optional ? 1.6 : 2.22, target.z);
    scene.add(marker);
    return { target, marker, lead, baseY: marker.position.y };
  });

  for (const [key, matrices] of batches) {
    const [geo, mat] = key.split('|');
    const batch = new T.InstancedMesh(geometries[geo], materials[mat], matrices.length);
    matrices.forEach((matrix, i) => batch.setMatrixAt(i, matrix));
    batch.computeBoundingSphere();
    batch.castShadow = !['floor', 'coal', 'bank', 'amber'].includes(mat);
    batch.receiveShadow = true;
    scene.add(batch);
  }

  const moteGeometry = new T.BufferGeometry();
  const count = 330;
  const motes = [];
  const xyz = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) motes.push([(rng() - 0.5) * 24, rng() * 7, 11 - rng() * 120, rng() * 6]);
  moteGeometry.setAttribute('position', new T.BufferAttribute(xyz, 3));
  const moteCloud = new T.Points(moteGeometry, new T.PointsMaterial({
    map: glow, size: 0.24, color: 0xffc069, transparent: true, opacity: 0.8,
    depthWrite: false, blending: T.AdditiveBlending,
  }));
  moteCloud.frustumCulled = false;
  scene.add(moteCloud);

  const localLights = Array.from({ length: 3 }, (_, index) => {
    const light = new T.PointLight(0xffa95a, 17, 12, 1.6);
    light.position.set(index % 2 ? 3.4 : -3.4, 2.4, 0);
    scene.add(light);
    return light;
  });

  return {
    update(time, playerZ, act, available, motion, highQuality) {
      const animate = motion ? time : 0;
      const dawn = act === 4;
      sky.setHex(dawn ? 0xb8ab90 : act === 2 ? 0x759894 : 0x789e9a);
      scene.fog.color.copy(sky);
      skyGradient.uniforms.dawn.value = dawn ? 1 : 0;
      skyDome.position.z = playerZ;
      scene.fog.density = act === 2 ? 0.031 : 0.026;
      waterMaterial.uniforms.time.value = animate;
      waterMaterial.uniforms.dawn.value = dawn ? 1 : 0;
      sunAim.position.z = playerZ - 3;
      sun.position.z = playerZ - 23;
      sun.target.updateMatrixWorld();
      for (const [i, light] of localLights.entries()) {
        light.visible = highQuality;
        light.position.z = Math.round(playerZ / 6) * 6 + (i - 1) * 5;
        light.intensity = 16 + Math.sin(animate * 2.2 + i) * 1.7;
      }
      for (const [i, haloSprite] of lanternHalos.entries()) {
        haloSprite.visible = Math.abs(haloSprite.position.z - playerZ) < 44;
        haloSprite.material.opacity = 0.35 + Math.sin(animate * 1.9 + i) * 0.07;
      }
      for (const [index, sign] of hangingSigns.entries()) {
        sign.rotation.y = Math.sin(animate * 0.52 + index) * 0.041;
        sign.rotation.z = Math.sin(animate * 0.76 + index) * 0.015;
      }
      for (const { target, marker, lead, baseY } of markers) {
        marker.visible = available.has(target.id);
        marker.position.y = baseY + Math.sin(animate * 2.2) * 0.13;
        marker.rotation.y = animate * 1.32;
        if (lead) lead.position.y = Math.sin(animate * 2 + target.z) * 0.025;
      }
      motes.forEach(([x, y, z, offset], i) => {
        xyz[i * 3] = x + Math.sin(animate * 0.22 + offset) * 1.6;
        xyz[i * 3 + 1] = y + Math.cos(animate * 0.34 + offset) * 0.56;
        xyz[i * 3 + 2] = z + Math.cos(animate * 0.23 + offset) * 1.45;
      });
      moteGeometry.attributes.position.needsUpdate = true;
    },
  };
}
