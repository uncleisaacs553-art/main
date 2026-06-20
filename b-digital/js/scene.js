// Persistent 3D backdrop: a small constellation of floating devices — a phone,
// two browser windows, a logo chip and a notification card — each with a live
// gradient "screen" drawn on a canvas texture. The camera orbits the cluster as
// the page scrolls and drifts gently with the pointer. Built from primitives.
//
// If WebGL is unavailable the canvas simply stays empty and the CSS background
// shows through — the rest of the site is unaffected.

import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const COL = { coral: "#ff7a59", violet: "#b06cff", azure: "#5b8cff", ink: "#0a0a0f" };

export default function initScene() {
  const canvas = document.getElementById("scene");
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    document.body.classList.add("no-webgl");
    return null;
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0a0a0f, 15, 40);

  // Soft studio reflections for the glossy bezels + screens.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(5, 1.5, 11);

  // ---- Lighting --------------------------------------------------------
  scene.add(new THREE.HemisphereLight(0x6f6f93, 0x070709, 0.55));

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(-6, 9, 7);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xb06cff, 1.5);
  rim.position.set(7, 3, -8);
  scene.add(rim);

  const fillCoral = new THREE.PointLight(0xff7a59, 16, 24, 2);
  fillCoral.position.set(-5, 1, 5);
  scene.add(fillCoral);

  const fillAzure = new THREE.PointLight(0x5b8cff, 14, 24, 2);
  fillAzure.position.set(5.5, -1.5, 4);
  scene.add(fillAzure);

  // ---- Shared materials ------------------------------------------------
  const bezelMat = new THREE.MeshPhysicalMaterial({
    color: 0x14141c, roughness: 0.3, metalness: 0.55,
    clearcoat: 1, clearcoatRoughness: 0.25, envMapIntensity: 1.35,
  });

  // ---- Geometry helpers ------------------------------------------------
  function roundedRectShape(w, h, r) {
    const s = new THREE.Shape();
    const x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r);
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h);
    s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r);
    s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }

  function roundedBox(w, h, d, r) {
    const geo = new THREE.ExtrudeGeometry(roundedRectShape(w, h, r), {
      depth: d, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04,
      bevelSegments: 3, steps: 1, curveSegments: 14,
    });
    geo.translate(0, 0, -d / 2);
    geo.computeVertexNormals();
    return geo;
  }

  // ---- Canvas "screen" textures ---------------------------------------
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function makeTexture(kind, cw, ch, c1, c2) {
    const cv = document.createElement("canvas");
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext("2d");

    const g = ctx.createLinearGradient(0, 0, cw, ch);
    g.addColorStop(0, c1); g.addColorStop(1, c2);

    if (kind === "chip") {
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.beginPath(); ctx.arc(cw * 0.72, ch * 0.26, cw * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COL.ink;
      ctx.font = `700 ${cw * 0.6}px "Space Grotesk", Arial, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("B", cw / 2, ch / 2 + cw * 0.02);
    } else if (kind === "card") {
      // notification / stat card on a light surface
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);
      const pad = cw * 0.08;
      ctx.fillStyle = g; rr(ctx, pad, pad, ch * 0.34, ch * 0.34, ch * 0.1); ctx.fill();
      ctx.fillStyle = "#1a1a27";
      ctx.font = `700 ${ch * 0.26}px "Space Grotesk", Arial, sans-serif`;
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillText("+38%", pad + ch * 0.46, pad + ch * 0.26);
      ctx.fillStyle = "#9a9aac";
      ctx.font = `500 ${ch * 0.14}px Arial, sans-serif`;
      ctx.fillText("more enquiries", pad + ch * 0.46, pad + ch * 0.5);
      ctx.fillStyle = "#ececf2";
      rr(ctx, pad, ch * 0.62, cw - pad * 2, ch * 0.1, ch * 0.05); ctx.fill();
      rr(ctx, pad, ch * 0.78, (cw - pad * 2) * 0.7, ch * 0.1, ch * 0.05); ctx.fill();
    } else if (kind === "phone") {
      // app-like: gradient hero on top, light content below
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = g; ctx.fillRect(0, 0, cw, ch * 0.52);
      // status row
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = `600 ${cw * 0.05}px Arial, sans-serif`;
      ctx.textAlign = "left"; ctx.fillText("9:41", cw * 0.1, ch * 0.07);
      // headline placeholder bars
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      rr(ctx, cw * 0.1, ch * 0.2, cw * 0.66, ch * 0.05, ch * 0.02); ctx.fill();
      rr(ctx, cw * 0.1, ch * 0.28, cw * 0.5, ch * 0.05, ch * 0.02); ctx.fill();
      // white CTA pill
      ctx.fillStyle = "#ffffff";
      rr(ctx, cw * 0.1, ch * 0.4, cw * 0.45, ch * 0.06, ch * 0.03); ctx.fill();
      ctx.fillStyle = c2;
      ctx.font = `700 ${cw * 0.045}px Arial, sans-serif`;
      ctx.fillText("Get a quote", cw * 0.15, ch * 0.445);
      // content cards
      ctx.fillStyle = "#eeeef4";
      rr(ctx, cw * 0.1, ch * 0.6, cw * 0.8, ch * 0.11, ch * 0.03); ctx.fill();
      rr(ctx, cw * 0.1, ch * 0.74, cw * 0.8, ch * 0.11, ch * 0.03); ctx.fill();
    } else {
      // website: nav + hero + 3 cards (kind === "site")
      ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, cw, ch);
      // nav bar
      ctx.fillStyle = "#13131c";
      ctx.fillRect(0, 0, cw, ch * 0.12);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cw * 0.07, ch * 0.06, ch * 0.028, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < 3; i++) { rr(ctx, cw * (0.7 + i * 0.08), ch * 0.05, cw * 0.05, ch * 0.02, ch * 0.01); ctx.fill(); }
      // hero band
      const hy = ch * 0.12, hh = ch * 0.5;
      const hg = ctx.createLinearGradient(0, hy, cw, hy + hh);
      hg.addColorStop(0, c1); hg.addColorStop(1, c2);
      ctx.fillStyle = hg; ctx.fillRect(0, hy, cw, hh);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      rr(ctx, cw * 0.08, hy + hh * 0.28, cw * 0.55, hh * 0.12, ch * 0.02); ctx.fill();
      rr(ctx, cw * 0.08, hy + hh * 0.46, cw * 0.4, hh * 0.12, ch * 0.02); ctx.fill();
      ctx.fillStyle = "#ffffff";
      rr(ctx, cw * 0.08, hy + hh * 0.66, cw * 0.26, hh * 0.16, ch * 0.03); ctx.fill();
      // 3 content cards
      const cy = hy + hh + ch * 0.05, cwid = cw * 0.26, gap = cw * 0.04;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = "#f0f0f6";
        rr(ctx, cw * 0.08 + i * (cwid + gap), cy, cwid, ch * 0.22, ch * 0.03); ctx.fill();
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cw * 0.08 + i * (cwid + gap) + cwid * 0.2, cy + ch * 0.06, ch * 0.025, 0, Math.PI * 2); ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }

  // ---- Device builder --------------------------------------------------
  const screens = [];
  function buildDevice({ w, h, d, r, kind, c1, c2, inset = 0.12, aspect }) {
    const group = new THREE.Group();

    const body = new THREE.Mesh(roundedBox(w, h, d, r), bezelMat);
    group.add(body);

    const sw = w - inset * 2, sh = h - inset * 2;
    const cw = 512, ch = Math.round(512 / aspect);
    const tex = makeTexture(kind, cw, ch, c1, c2);
    const screenMat = new THREE.MeshStandardMaterial({
      map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.95,
      roughness: 0.3, metalness: 0,
    });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), screenMat);
    screen.position.z = d / 2 + 0.02;
    group.add(screen);

    return group;
  }

  // ---- Assemble the cluster -------------------------------------------
  const cluster = new THREE.Group();
  scene.add(cluster);

  const devices = [];
  const addDevice = (cfg, pos, rot, float) => {
    const dev = buildDevice(cfg);
    dev.position.set(pos[0], pos[1], pos[2]);
    dev.rotation.set(rot[0], rot[1], rot[2]);
    dev.userData = { baseY: pos[1], phase: float.phase, amp: float.amp, rotAmp: float.rotAmp };
    cluster.add(dev);
    devices.push(dev);
    return dev;
  };

  // Central phone
  addDevice(
    { w: 1.75, h: 3.55, d: 0.22, r: 0.34, kind: "phone", c1: COL.coral, c2: COL.violet, inset: 0.1, aspect: 1.75 / 3.55 },
    [0, 0.1, 0.2], [0.05, -0.18, 0.02], { phase: 0.0, amp: 0.16, rotAmp: 0.03 }
  );
  // Browser window — back left
  addDevice(
    { w: 4.5, h: 3.05, d: 0.18, r: 0.16, kind: "site", c1: COL.violet, c2: COL.azure, inset: 0.13, aspect: 4.5 / 3.05 },
    [-3.5, 0.8, -1.8], [0.02, 0.5, -0.02], { phase: 1.1, amp: 0.2, rotAmp: 0.025 }
  );
  // Browser window — front right
  addDevice(
    { w: 3.7, h: 2.55, d: 0.18, r: 0.15, kind: "site", c1: COL.coral, c2: COL.azure, inset: 0.12, aspect: 3.7 / 2.55 },
    [3.2, -0.8, 0.4], [-0.04, -0.5, 0.03], { phase: 2.3, amp: 0.18, rotAmp: 0.03 }
  );
  // Logo chip — upper right
  addDevice(
    { w: 1.1, h: 1.1, d: 0.2, r: 0.3, kind: "chip", c1: COL.coral, c2: COL.violet, inset: 0.06, aspect: 1 },
    [2.7, 1.9, -0.4], [0.1, -0.4, 0.08], { phase: 3.0, amp: 0.24, rotAmp: 0.05 }
  );
  // Stat card — lower left
  addDevice(
    { w: 2.1, h: 1.35, d: 0.16, r: 0.14, kind: "card", c1: COL.azure, c2: COL.violet, inset: 0.1, aspect: 2.1 / 1.35 },
    [-2.5, -1.9, 0.9], [0.05, 0.35, -0.05], { phase: 4.2, amp: 0.22, rotAmp: 0.04 }
  );

  // ---- Atmospheric particles ------------------------------------------
  const COUNT = reduceMotion ? 70 : 260;
  const pgeo = new THREE.BufferGeometry();
  const pos = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 28;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 22 - 4;
  }
  pgeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(
    pgeo,
    new THREE.PointsMaterial({ color: 0x8f7bff, size: 0.05, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  scene.add(particles);

  // ---- Interaction state ----------------------------------------------
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", (e) => {
    pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  let scrollEnd = window.innerHeight * 4;
  const showcase = document.getElementById("process");
  const computeEnd = () => {
    scrollEnd = showcase ? Math.max(showcase.offsetTop, window.innerHeight) : window.innerHeight * 4;
  };
  computeEnd();

  const target = new THREE.Vector3(0, 0.3, 0);
  const lerp = (a, b, t) => a + (b - a) * t;

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    computeEnd();
  }
  window.addEventListener("resize", resize, { passive: true });

  // ---- Render loop -----------------------------------------------------
  const clock = new THREE.Clock();
  function tick() {
    const t = clock.getElapsedTime();
    const p = Math.min(Math.max(window.scrollY / scrollEnd, 0), 1);
    const ease = p * p * (3 - 2 * p); // smoothstep

    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    // Orbit: hero angle -> process angle, with a slow idle drift.
    const idle = reduceMotion ? 0 : Math.sin(t * 0.1) * 0.05;
    const theta = lerp(0.5, -0.5, ease) + idle + pointer.x * 0.28;
    const portrait = camera.aspect < 1 ? 1.4 : 1;
    const radius = lerp(11, 9, ease) * portrait;
    const height = lerp(1.4, 0.2, ease) - pointer.y * 0.7;

    camera.position.x = Math.sin(theta) * radius;
    camera.position.z = Math.cos(theta) * radius;
    camera.position.y = height;
    target.y = lerp(0.4, 0.1, ease);
    camera.lookAt(target);

    // Per-device idle float.
    if (!reduceMotion) {
      for (const dev of devices) {
        const u = dev.userData;
        dev.position.y = u.baseY + Math.sin(t * 0.5 + u.phase) * u.amp;
        dev.rotation.z = Math.sin(t * 0.4 + u.phase) * u.rotAmp;
      }
      cluster.rotation.y = Math.sin(t * 0.08) * 0.05;

      particles.rotation.y = t * 0.015;
      const arr = pgeo.attributes.position.array;
      for (let i = 0; i < COUNT; i++) {
        arr[i * 3 + 1] += 0.005;
        if (arr[i * 3 + 1] > 9) arr[i * 3 + 1] = -9;
      }
      pgeo.attributes.position.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    tick();
  });

  return { renderer, scene, camera };
}
